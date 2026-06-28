import { useEffect, useRef, useState } from 'react';
import { streamReview } from '../api/aiStream.js';
import { aiApi } from '../api/index.js';
import Markdown from './Markdown.jsx';

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
    <div className="card col" style={{ padding: 20, gap: 14 }}>
      <div className="row between">
        <h2 style={{ fontSize: 14, fontWeight: 600 }}>🤖 AI Review Assistant</h2>
        <span className={`badge ${provider === 'mock' ? 'amber' : 'accent'}`} style={{ fontSize: 10 }}>{provider}</span>
      </div>

      <input
        placeholder="Focus review (e.g. ‘look for race conditions’)"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        style={{ fontSize: 13 }}
      />

      <div className="row" style={{ gap: 8 }}>
        <button
          className="btn btn-primary"
          style={{ height: 32, flex: 1 }}
          onClick={run}
          disabled={!code?.trim() || status === 'streaming'}
        >
          {status === 'streaming' ? <span className="spinner" /> : '✨ Review selected code'}
        </button>
        {status === 'streaming' && (
          <button className="btn btn-danger" style={{ height: 32 }} onClick={stop}>Stop</button>
        )}
      </div>

      <div className="row between" style={{ marginTop: -4 }}>
        {code?.trim() ? (
          <span className="muted" style={{ fontSize: 11, fontWeight: 500 }}>{code.length} characters selected</span>
        ) : (
          <span className="muted" style={{ fontSize: 11, fontWeight: 500 }}>
            Select code in the diff, or pick a file to review.
          </span>
        )}
      </div>

      <div className="ai-stream">
        {output ? (
          <div className={status === 'streaming' ? 'cursor-blink' : ''} style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            <Markdown>{output}</Markdown>
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
            Highlight any code block in the diff editor to get an instant, AI-streamed Markdown review detailing bugs, complexities, and improvement suggestions.
            {provider === 'mock' && (
              <div style={{ marginTop: 8, padding: 8, background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                Using mock provider. Set <span className="kbd">AI_PROVIDER=gemini</span> or <span className="kbd">groq</span> + API keys on the server env.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
