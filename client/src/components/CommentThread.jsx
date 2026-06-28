import { useState } from 'react';
import Markdown from './Markdown.jsx';

const SEVERITY = {
  info: { label: 'info', cls: 'muted' },
  nit: { label: 'nit', cls: 'accent' },
  suggestion: { label: 'suggestion', cls: 'amber' },
  blocking: { label: 'blocking', cls: 'red' },
};

const initials = (name) => {
  return (name || '?')
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
};

export default function CommentList({ comments = [], onReply, onResolve, onReact, me, canModerate = false }) {
  const roots = comments.filter((c) => !c.parent);
  const repliesOf = (id) => comments.filter((c) => String(c.parent) === String(id));

  if (comments.length === 0) {
    return <div className="muted" style={{ fontSize: 13, padding: '8px 0' }}>No comments yet. Click a line number to start a discussion.</div>;
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      {roots.map((c) => (
        <CommentItem
          key={c._id}
          comment={c}
          replies={repliesOf(c._id)}
          onReply={onReply}
          onResolve={onResolve}
          onReact={onReact}
          me={me}
          canModerate={canModerate}
        />
      ))}
    </div>
  );
}

function CommentItem({ comment, replies, onReply, onResolve, onReact, me, canModerate }) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');
  const sev = SEVERITY[comment.severity] || SEVERITY.info;

  const submit = () => {
    if (!text.trim()) return;
    onReply?.(comment._id, text);
    setText('');
    setReplying(false);
  };

  return (
    <div className="card" style={{ padding: 16, opacity: comment.resolved ? 0.5 : 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
        <span className="avatar">{initials(comment.author?.name)}</span>
        <div className="grow">
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13.5 }}>
              {comment.author?.name || 'Someone'}
            </span>
            <span className={`badge ${sev.cls}`} style={{ textTransform: 'none', height: 18, fontSize: 10 }}>{sev.label}</span>
            {comment.source === 'ai' && <span className="badge accent" style={{ textTransform: 'none', height: 18, fontSize: 10 }}>AI</span>}
            {comment.resolved && <span className="badge green" style={{ height: 18, fontSize: 10 }}>Resolved</span>}
            <span className="muted" style={{ fontSize: 11, marginLeft: 'auto' }}>{timeAgo(comment.createdAt)}</span>
          </div>
          {comment.file && (
            <div className="muted" style={{ fontSize: 11, marginTop: 4, fontFamily: 'var(--font-mono)' }}>
              {comment.file}
              {comment.lineFrom ? `:${comment.lineFrom}` : ''}
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 13.5, color: 'var(--text-primary)' }}>
            <Markdown>{comment.body}</Markdown>
          </div>
        </div>
      </div>

      {replies?.length > 0 && (
        <div className="col" style={{ marginLeft: 40, gap: 12, paddingLeft: 14, borderLeft: '1px solid var(--border)' }}>
          {replies.map((r) => (
            <div key={r._id} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <span className="avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{initials(r.author?.name)}</span>
              <div className="grow">
                <div className="row" style={{ gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary)' }}>{r.author?.name}</span>
                  <span className="muted" style={{ fontSize: 10 }}>{timeAgo(r.createdAt)}</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--text-primary)' }}>
                  <Markdown>{r.body}</Markdown>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reactions Row */}
      <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
        {['👍', '❤️', '🎉', '😄'].map((emoji) => {
          const userIds = comment.reactions?.[emoji] || [];
          const count = userIds.length;
          const hasReacted = userIds.includes(String(me));
          return (
            <button
              key={emoji}
              className="btn btn-ghost"
              style={{
                height: 24,
                padding: '0 8px',
                borderRadius: '12px',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: hasReacted ? 'var(--accent-subtle)' : 'transparent',
                borderColor: hasReacted ? 'var(--accent)' : 'var(--border)',
                color: hasReacted ? 'var(--accent)' : 'var(--text-secondary)'
              }}
              onClick={() => onReact?.(comment._id, emoji)}
            >
              <span>{emoji}</span>
              {count > 0 && <span style={{ fontWeight: 600, fontSize: 10 }}>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="row" style={{ gap: 8, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <button
          className="btn btn-ghost"
          style={{ height: 28, fontSize: 12, padding: '0 10px' }}
          onClick={() => setReplying((v) => !v)}
        >
          Reply
        </button>
        {canModerate && !comment.resolved && (
          <button
            className="btn btn-ghost"
            style={{ height: 28, fontSize: 12, padding: '0 10px' }}
            onClick={() => onResolve?.(comment)}
          >
            Resolve
          </button>
        )}
        {canModerate && comment.resolved && (
          <button
            className="btn btn-ghost"
            style={{ height: 28, fontSize: 12, padding: '0 10px', textDecoration: 'line-through' }}
            disabled
          >
            Resolve
          </button>
        )}
      </div>

      {replying && (
        <div className="col" style={{ gap: 8, marginTop: 4 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a reply…"
            rows={2}
            style={{ fontSize: 13, minHeight: 60 }}
          />
          <div className="row" style={{ gap: 8 }}>
            <button className="primary" style={{ height: 28, padding: '0 12px' }} onClick={submit}>Send</button>
            <button className="ghost" style={{ height: 28, padding: '0 12px' }} onClick={() => setReplying(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
