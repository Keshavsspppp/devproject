import { useMemo, useState } from 'react';
import { parsePatch, languageFromPath } from '../utils/diff.js';

export default function DiffViewer({
  file,
  comments = [],
  onLineClick,
  onCodeSelect,
}) {
  const lines = useMemo(() => parsePatch(file?.patch || ''), [file?.patch]);
  const lang = languageFromPath(file?.path);
  const [hoverLine, setHoverLine] = useState(null);
  const [sel, setSel] = useState({ text: '' });

  const commentsByLine = useMemo(() => {
    const m = {};
    for (const c of comments) {
      const key = c.lineFrom || c.lineTo;
      if (key == null) continue;
      (m[key] = m[key] || []).push(c);
    }
    return m;
  }, [comments]);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    const text = selection?.toString?.() || '';
    if (text.trim().length > 2) {
      setSel({ text });
      onCodeSelect?.(text);
    } else {
      setSel({ text: '' });
      onCodeSelect?.('');
    }
  };

  const additions = lines.filter((l) => l.type === 'add').length;
  const deletions = lines.filter((l) => l.type === 'del').length;

  return (
    <div className="diff-frame">
      <div className="diff-toolbar">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{file?.path}</span>
        <span className="badge muted" style={{ textTransform: 'none' }}>{file?.status}</span>
        <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>+{additions} −{deletions}</span>
        <div className="grow" />
        <span className="badge accent" style={{ textTransform: 'none' }}>{lang}</span>
        <span className="muted" style={{ fontSize: 12 }}>Click line number to review</span>
      </div>

      <div onMouseUp={handleMouseUp} style={{ position: 'relative' }}>
        <pre className="diff-pre">
          <code>
            {lines.map((l, i) => {
              if (l.type === 'hunk') {
                return (
                  <div key={i} className="diff-line hunk">
                    <span className="diff-line-no">@@</span>
                    <span className="diff-line-gutter" />
                    <span className="diff-line-content">
                      <span className="diff-line-text">{l.text}</span>
                    </span>
                  </div>
                );
              }

              const isAdd = l.type === 'add';
              const isDel = l.type === 'del';
              const lineNo = l.newLine ?? l.oldLine;
              const hasComments = commentsByLine[lineNo]?.length > 0;
              const sign = isAdd ? '+' : isDel ? '−' : ' ';
              const lineClass = isAdd ? 'add' : isDel ? 'del' : 'ctx';

              return (
                <div
                  key={i}
                  className={`diff-line ${lineClass}`}
                  onMouseEnter={() => setHoverLine(lineNo)}
                  onMouseLeave={() => setHoverLine(null)}
                >
                  <span
                    className="diff-line-no"
                    style={{ cursor: lineNo != null ? 'pointer' : 'default' }}
                    onClick={() => lineNo != null && onLineClick?.(lineNo)}
                  >
                    {lineNo ?? ''}
                  </span>
                  <span className="diff-line-gutter">
                    {hoverLine === lineNo ? (
                      <button
                        className="add-comment-btn"
                        onClick={() => lineNo != null && onLineClick?.(lineNo)}
                        title="Add a comment on this line"
                      >
                        +
                      </button>
                    ) : hasComments ? (
                      <span className="comment-count-badge">
                        {commentsByLine[lineNo].length}
                      </span>
                    ) : null}
                  </span>
                  <span className="diff-line-content">
                    <span className="diff-line-sign">{sign}</span>
                    <span className="diff-line-text">{l.text || ' '}</span>
                  </span>
                </div>
              );
            })}
          </code>
        </pre>
      </div>

      {sel.text && (
        <div className="card" style={{ margin: 0, borderTop: '1px solid var(--border)', borderRadius: 0, padding: '10px 16px' }}>
          <div className="row between">
            <div className="muted" style={{ fontSize: 12, fontWeight: 500 }}>
              Selected {sel.text.length} characters — Highlighted for AI Code Review
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
