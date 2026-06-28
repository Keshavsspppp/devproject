import { useEffect, useRef, useState } from 'react';
import { streamReview } from '../api/aiStream.js';
import { aiApi } from '../api/index.js';
import Markdown from './Markdown.jsx';

/**
 * AI review assistant panel.
 * Streams a review of the currently selected code (or whole snippet).
 */
export default function AIPanel({ code, language }) {
  const [provider, setProvider] = useState('mock');
  const [instruction, setInstruction] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState('idle'); // idle | streaming | error | done
  const [meta, setMeta] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    aiApi.provider().then((r) => setProvider(r.provider)).catch(() => {});
  }, []);

  const run = async () => {
    if (!code?.trim() || status === 'streaming') return;
    setStatus('streaming');
    setOutput('');
    setMeta(null);
    const controller = new AbortController();
    abortRef.current = controller;
    let errored = false;

    try {
      for await (const evt of streamReview({ code, language, instruction, signal: controller.signal })) {
        if (evt.type === 'meta') {
          setMeta(evt);
          setProvider(evt.provider || provider);
        } else if (evt.type === 'delta') {
          setOutput((o) => o + evt.text);
        } else if (evt.type === 'error') {
          errored = true;
          setStatus('error');
          setOutput((o) => o + `\n\n⚠️ ${evt.text}`);
          break;
        } else if (evt.type === 'done') {
          setStatus('done');
        }
      }
      // Use a local flag, not `status` — the closure captures the render-time
      // value, which would clobber a just-set error state with 'done'.
      if (!errored) setStatus('done');
    } catch (e) {
      if (e.name !== 'AbortError') {
        setStatus('error');
        setOutput((o) => o + `\n\n⚠️ ${e.message}`);
      }
    } finally {
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setStatus('idle');
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="row between">
        <h3 style={{ margin: 0 }}>🤖 AI Review Assistant</h3>
        <span className={`badge ${provider === 'mock' ? 'amber' : 'purple'}`}>{provider}</span>
      </div>

      <input
        placeholder="Optional: focus the review (e.g. ‘look for race conditions’)"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
      />

      <div className="row">
        <button className="primary" onClick={run} disabled={!code?.trim() || status === 'streaming'}>
          {status === 'streaming' ? <span className="spinner" /> : '✨ Review selected code'}
        </button>
        {status === 'streaming' && (
          <button className="ghost danger" onClick={stop}>Stop</button>
        )}
        {code?.trim() ? (
          <span className="muted" style={{ fontSize: 12 }}>{code.length} chars ready</span>
        ) : (
          <span className="muted" style={{ fontSize: 12 }}>
            Select code in the diff, or pick a file to review.
          </span>
        )}
      </div>

      <div className="ai-stream">
        {output ? (
          <div className={status === 'streaming' ? 'cursor-blink' : ''}>
            <Markdown>{output}</Markdown>
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 13 }}>
            Highlight any code block to get a streamed, Markdown-formatted review — bug detection,
            complexity analysis and improvement tips.
            {provider === 'mock' && (
              <div style={{ marginTop: 8 }}>
                Running the mock provider. Set <span className="kbd">AI_PROVIDER=gemini</span> or
                <span className="kbd">groq</span> + an API key on the server for real LLM reviews.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
