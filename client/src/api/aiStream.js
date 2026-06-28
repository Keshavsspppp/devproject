/**
 * Stream a code review from POST /api/ai/review (text/event-stream).
 *
 *   for await (const evt of streamReview({ code, language, instruction })) { ... }
 *
 * evt = { type: 'meta'|'delta'|'error'|'done', ... }
 */
export async function* streamReview({ code, language, instruction, signal }) {
  const resp = await fetch('/api/ai/review', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ code, language, instruction }),
    signal,
  });

  if (!resp.ok || !resp.body) {
    const text = await resp.text().catch(() => '');
    yield { type: 'error', text: `Request failed (${resp.status}) ${text}` };
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const json = trimmed.slice(5).trim();
        if (!json) continue;
        try {
          yield JSON.parse(json);
        } catch {
          /* skip malformed */
        }
      }
    }
  }
}
