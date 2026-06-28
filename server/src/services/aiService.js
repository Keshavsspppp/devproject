import { env } from '../config/env.js';

/**
 * AI review service.
 *
 * Providers all expose the same shape:
 *   async *stream({ code, language, instruction }) → yields { type, text }
 * The route layer wraps these in SSE.
 *
 * Three providers:
 *   - mock    : deterministic local generator (no key needed)
 *   - gemini  : Google Gemini generateContent streaming API
 *   - groq    : Groq (OpenAI-compatible) chat completions streaming API
 *
 * We use fetch() (Node 18+).
 */

const SYSTEM_PROMPT = `You are a senior code reviewer embedded in a collaborative code review tool (DevCollab).
Review the provided code block. Be concrete and concise. Structure with short markdown sections:
- **Bugs / correctness** (only if real)
- **Complexity** (cyclomatic / readability hotspots)
- **Suggestions** (actionable improvements with small code snippets)
- **Verdict** (one line: approve / request changes / nit)
Do not invent APIs. If the code is fine, say so plainly.`;

export function activeProvider() {
  const p = env.ai.provider;
  if (p === 'gemini' && env.ai.geminiKey) return 'gemini';
  if (p === 'groq' && env.ai.groqKey) return 'groq';
  return 'mock';
}

export function streamReview({ code, language = '', instruction = '' }) {
  const provider = activeProvider();
  const input = buildPrompt({ code, language, instruction });
  if (provider === 'gemini') return geminiStream(input);
  if (provider === 'groq') return groqStream(input);
  return mockStream(input);
}

function buildPrompt({ code, language, instruction }) {
  return [
    instruction
      ? `Specific instruction from the reviewer: ${instruction}`
      : 'Provide a general code review.',
    language ? `Language: ${language}` : '',
    'Code to review:',
    '```' + (language || ''),
    code,
    '```',
  ]
    .filter(Boolean)
    .join('\n');
}

// ── Mock provider ──────────────────────────────────────────────────
async function* mockStream(input) {
  const review = composeMockReview(input);
  // stream word-by-word to simulate a real SSE flow
  const tokens = review.match(/\S+\s*/g) || [review];
  yield { type: 'meta', provider: 'mock', model: 'devcollab-mock' };
  for (const t of tokens) {
    yield { type: 'delta', text: t };
    await sleep(18 + Math.random() * 30);
  }
  yield { type: 'done' };
}

function composeMockReview(input) {
  const hasAwait = /await /.test(input);
  const hasTry = /try\s*{/.test(input);
  const lines = (input.match(/\n/g) || []).length;
  const parts = ['## Code review (mock provider)\n'];
  parts.push(
    '> This is the built-in mock reviewer. Set `AI_PROVIDER=gemini` or `groq` with the relevant API key to get real LLM reviews.\n'
  );
  if (hasAwait && !hasTry) {
    parts.push('### Bugs / correctness\n- `await` call is not wrapped in `try/catch` — an unhandled rejection will crash the request.\n');
  }
  if (input.includes('password') || input.includes('secret')) {
    parts.push('### 🔒 Security\n- A secret value (`password`/`secret`) appears in code — ensure it is never logged or serialised into responses.\n');
  }
  parts.push('### Complexity\n');
  if (lines > 25) {
    parts.push(`- Block is ~${lines} lines — consider extracting the inner logic into a named helper for readability and testability.\n`);
  } else {
    parts.push(`- Block is ${lines} lines — complexity looks reasonable.\n`);
  }
  parts.push('### Suggestions\n');
  parts.push('- Add a brief JSDoc / docstring describing the function contract and thrown errors.\n');
  parts.push('- Validate inputs early and fail with a clear `400` before doing work.\n');
  if (hasAwait && !hasTry) parts.push('```js\ntry {\n  const r = await op();\n} catch (e) { next(e); }\n```\n');
  parts.push('\n### Verdict\n**Request changes** — small, targeted edits.\n');
  return parts.join('');
}

// ── Google Gemini (streaming generateContent) ──────────────────────
async function* geminiStream(input) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.ai.geminiModel}:streamGenerateContent?alt=sse&key=${env.ai.geminiKey}`;
  yield { type: 'meta', provider: 'gemini', model: env.ai.geminiModel };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: input }] }],
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    }),
  });
  if (!resp.ok || !resp.body) {
    const detail = await safeText(resp);
    yield { type: 'error', text: `Gemini error ${resp.status}: ${detail}` };
    yield { type: 'done' };
    return;
  }
  for await (const chunk of sseLines(resp.body)) {
    const json = safeParse(chunk);
    const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    if (text) yield { type: 'delta', text };
  }
  yield { type: 'done' };
}

// ── Groq (OpenAI-compatible chat completions stream) ───────────────
async function* groqStream(input) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  yield { type: 'meta', provider: 'groq', model: env.ai.groqModel };
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.ai.groqKey}`,
    },
    body: JSON.stringify({
      model: env.ai.groqModel,
      temperature: 0.2,
      max_tokens: 1024,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: input },
      ],
    }),
  });
  if (!resp.ok || !resp.body) {
    const detail = await safeText(resp);
    yield { type: 'error', text: `Groq error ${resp.status}: ${detail}` };
    yield { type: 'done' };
    return;
  }
  for await (const chunk of sseLines(resp.body)) {
    if (chunk === '[DONE]') break;
    const json = safeParse(chunk);
    const text = json?.choices?.[0]?.delta?.content || '';
    if (text) yield { type: 'delta', text };
  }
  yield { type: 'done' };
}

// ── helpers ────────────────────────────────────────────────────────
async function* sseLines(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      let line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line.startsWith('data:')) line = line.slice(5).trim();
      if (line) yield line;
    }
  }
  if (buffer.trim().startsWith('data:')) buffer = buffer.trim().slice(5).trim();
  if (buffer.trim()) yield buffer.trim();
}

const safeParse = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};
const safeText = async (resp) => {
  try {
    return await resp.text();
  } catch {
    return '';
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
