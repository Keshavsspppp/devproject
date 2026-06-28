import { useMemo, useState } from 'react';
import { parsePatch, languageFromPath } from '../utils/diff.js';
import PresenceStack from './PresenceStack.jsx';

/**
 * Custom lightweight diff renderer.
 * Props:
 *   file:        { path, status, additions, deletions, patch }
 *   comments:    [Comment] (filtered to this file)
 *   presence:    presence list (for the toolbar)
 *   cursors:     presence list (to overlay editor-like cursors)
 *   me:          current user id
 *   onLineClick: (newLine) => void
 *   onCodeSelect:(text) => void  // selected text → AI panel
 */
export default function DiffViewer({
  file,
  comments = [],
  presence = [],
  me,
  onLineClick,
  onCodeSelect,
}) {
  const lines = useMemo(() => parsePatch(file?.patch || ''), [file?.patch]);
  const lang = languageFromPath(file?.path);
  const [hoverLine, setHoverLine] = useState(null);
  const [sel, setSel] = useState({ start: null, end: null, text: '' });

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
    const sel = window.getSelection();
    const text = sel?.toString?.() || '';
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
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{file?.path}</span>
        <span className="badge" style={{ textTransform: 'none' }}>{file?.status}</span>
        <span className="muted" style={{ fontSize: 12 }}>+{additions} −{deletions}</span>
        <div className="spacer" />
        <span className="badge purple" style={{ textTransform: 'none' }}>{lang}</span>
        <span className="muted" style={{ fontSize: 12 }}>click ▸ on a line to comment</span>
      </div>

      <div onMouseUp={handleMouseUp} style={{ position: 'relative' }}>
        <pre style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 12.5, lineHeight: '20px' }}>
          <code className={`language-${lang}`}>
            {lines.map((l, i) => {
              if (l.type === 'hunk') {
                return (
                  <div key={i} style={{ background: '#0d1530', color: '#7c89aa', padding: '2px 12px' }}>
                    {l.text}
                  </div>
                );
              }
              const isAdd = l.type === 'add';
              const isDel = l.type === 'del';
              const lineNo = l.newLine ?? l.oldLine;
              const hasComments = commentsByLine[lineNo]?.length > 0;
              const bg = isAdd ? 'rgba(34,197,94,0.10)' : isDel ? 'rgba(239,68,68,0.10)' : 'transparent';
              const sign = isAdd ? '+' : isDel ? '−' : ' ';

              return (
                <div
                  key={i}
                  className="diff-line"
                  style={{ display: 'flex', background: bg, position: 'relative' }}
                  onMouseEnter={() => setHoverLine(lineNo)}
                  onMouseLeave={() => setHoverLine(null)}
                >
                  <span
                    className="line-gutter"
                    onClick={() => lineNo != null && onLineClick?.(lineNo)}
                    title="Add a comment on this line"
                  >
                    {hoverLine === lineNo ? '▸' : hasComments ? '💬' : ''}
                  </span>
                  <span className="line-no" style={lineNoStyle(l)}>
                    {l.oldLine ?? ''}
                  </span>
                  <span className="line-no" style={lineNoStyle(l)}>
                    {l.newLine ?? ''}
                  </span>
                  <span style={{ color: isAdd ? '#3fb950' : isDel ? '#f85149' : '#7c89aa', width: 14, userSelect: 'none' }}>
                    {sign}
                  </span>
                  <span style={{ whiteSpace: 'pre', color: '#c9d1d9', flex: 1 }}>{l.text || ' '}</span>
                </div>
              );
            })}
          </code>
        </pre>
      </div>

      {sel.text && (
        <div className="card" style={{ margin: 0, borderTop: '1px solid var(--border)', borderRadius: 0 }}>
          <div className="row between">
            <div className="muted" style={{ fontSize: 12 }}>
              Selected {sel.text.length} chars — send to AI assistant →
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lineNoStyle = (l) => ({
  width: 42,
  textAlign: 'right',
  paddingRight: 10,
  color: '#4a5677',
  userSelect: 'none',
  borderLeft: l.type === 'add' ? '1px solid rgba(34,197,94,0.25)' : 'none',
});
