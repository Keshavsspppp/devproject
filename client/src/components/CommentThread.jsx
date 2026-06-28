import { useState } from 'react';
import { initials } from './PresenceStack.jsx';
import Markdown from './Markdown.jsx';

const SEVERITY = {
  info: { label: 'info', cls: '' },
  nit: { label: 'nit', cls: 'blue' },
  suggestion: { label: 'suggestion', cls: 'amber' },
  blocking: { label: 'blocking', cls: 'red' },
};

export default function CommentList({ comments = [], onReply, onResolve, onReact, me, canModerate = false }) {
  // build a tree: top-level + replies
  const roots = comments.filter((c) => !c.parent);
  const repliesOf = (id) => comments.filter((c) => String(c.parent) === String(id));

  if (comments.length === 0) {
    return <div className="muted" style={{ fontSize: 13 }}>No comments yet. Click ▸ on a diff line to add one.</div>;
  }

  return (
    <div className="col">
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
    <div className="card" style={{ padding: 12, opacity: comment.resolved ? 0.6 : 1 }}>
      <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
        <span className="avatar">{initials(comment.author?.name)}</span>
        <div className="grow">
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <strong>{comment.author?.name || 'Someone'}</strong>
            <span className={`badge ${sev.cls}`} style={{ textTransform: 'none' }}>{sev.label}</span>
            {comment.source === 'ai' && <span className="badge purple" style={{ textTransform: 'none' }}>ai</span>}
            {comment.resolved && <span className="badge green">resolved</span>}
            <span className="muted" style={{ fontSize: 11 }}>{timeAgo(comment.createdAt)}</span>
          </div>
          {comment.file && (
            <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
              {comment.file}
              {comment.lineFrom ? `:${comment.lineFrom}${comment.lineTo && comment.lineTo !== comment.lineFrom ? `-${comment.lineTo}` : ''}` : ''}
            </div>
          )}
          <div style={{ marginTop: 6 }}>
            <Markdown>{comment.body}</Markdown>
          </div>
        </div>
      </div>

      {replies?.length > 0 && (
        <div className="col" style={{ marginLeft: 38, marginTop: 8, gap: 8, paddingLeft: 12, borderLeft: '2px solid var(--border)' }}>
          {replies.map((r) => (
            <div key={r._id} className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
              <span className="avatar" style={{ width: 22, height: 22, fontSize: 10 }}>{initials(r.author?.name)}</span>
              <div>
                <div className="row">
                  <strong style={{ fontSize: 13 }}>{r.author?.name}</strong>
                  <span className="muted" style={{ fontSize: 11 }}>{timeAgo(r.createdAt)}</span>
                </div>
                <Markdown>{r.body}</Markdown>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Reactions */}
      <div className="row" style={{ marginTop: 8, gap: 6, flexWrap: 'wrap' }}>
        {['👍', '❤️', '🎉', '😄'].map((emoji) => {
          const userIds = comment.reactions?.[emoji] || [];
          const count = userIds.length;
          const hasReacted = userIds.includes(String(me));
          return (
            <button
              key={emoji}
              className={`badge ${hasReacted ? 'primary' : 'ghost'}`}
              style={{
                padding: '2px 8px',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                borderRadius: 12,
                textTransform: 'none',
                height: 24,
                border: hasReacted ? 'none' : '1px solid var(--border)',
                background: hasReacted ? 'var(--primary)' : 'transparent',
              }}
              onClick={() => onReact?.(comment._id, emoji)}
            >
              <span>{emoji}</span>
              {count > 0 && <span style={{ fontWeight: 600 }}>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="row" style={{ marginTop: 8, gap: 8 }}>
        <button className="ghost" style={{ padding: '4px 10px' }} onClick={() => setReplying((v) => !v)}>
          Reply
        </button>
        {canModerate && !comment.resolved && (
          <button className="ghost" style={{ padding: '4px 10px' }} onClick={() => onResolve?.(comment)}>
            Resolve
          </button>
        )}
      </div>

      {replying && (
        <div className="col" style={{ marginTop: 8, gap: 8 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a reply…"
            rows={2}
            style={{ fontSize: 13 }}
          />
          <div className="row">
            <button className="primary" style={{ padding: '5px 12px' }} onClick={submit}>Send</button>
            <button className="ghost" style={{ padding: '5px 12px' }} onClick={() => setReplying(false)}>Cancel</button>
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
