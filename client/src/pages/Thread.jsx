import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { threadApi } from '../api/index.js';
import { apiError } from '../api/http.js';
import { toast } from '../components/Toast.jsx';
import Markdown from '../components/Markdown.jsx';
import { initials } from '../components/PresenceStack.jsx';
import Empty from '../components/Empty.jsx';

export default function Thread() {
  const { threadId } = useParams();
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { thread } = await threadApi.get(threadId);
      setThread(thread);
    } catch (e) {
      toast(apiError(e), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [threadId]);

  const submitReply = async () => {
    if (!reply.trim()) return;
    try {
      const { thread } = await threadApi.reply(threadId, { body: reply });
      setThread(thread);
      setReply('');
    } catch (e) {
      toast(apiError(e), 'error');
    }
  };

  const setStatus = async (status) => {
    try {
      const { thread } = await threadApi.setStatus(threadId, status);
      setThread(thread);
      toast(`Status updated to ${status}`, 'success');
    } catch (e) {
      toast(apiError(e), 'error');
    }
  };

  if (loading) return <div className="muted row" style={{ padding: '24px 0' }}><span className="spinner" /> Loading…</div>;
  if (!thread) return <Empty icon="❓" title="Thread not found" />;

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="muted" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <Link to="/threads">Threads</Link>
        <span>›</span>
        <span className="muted">{thread.repo?.fullName || 'repo'}</span>
      </div>

      <div className="card col" style={{ padding: 20, gap: 16 }}>
        <div className="row between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{thread.title}</h1>
          <span className={`badge ${thread.status === 'open' ? 'green' : thread.status === 'resolved' ? 'accent' : 'muted'}`}>
            {thread.status}
          </span>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <span className="avatar">{initials(thread.author?.name)}</span>
          <div className="col" style={{ gap: 2 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{thread.author?.name}</span>
            <span className="muted" style={{ fontSize: 11 }}>Original author</span>
          </div>
        </div>
        {thread.body && (
          <div style={{ fontSize: 13.5, color: 'var(--text-primary)', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <Markdown>{thread.body}</Markdown>
          </div>
        )}
        <div className="row" style={{ gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <button className="btn btn-ghost" style={{ height: 28, fontSize: 12 }} onClick={() => setStatus('resolved')} disabled={thread.status === 'resolved'}>
            ✓ Resolve
          </button>
          <button className="btn btn-ghost" style={{ height: 28, fontSize: 12 }} onClick={() => setStatus('open')} disabled={thread.status === 'open'}>
            ↻ Reopen
          </button>
          <button className="btn btn-ghost danger" style={{ height: 28, fontSize: 12 }} onClick={() => setStatus('wontfix')} disabled={thread.status === 'wontfix'}>
            Won't fix
          </button>
        </div>
      </div>

      <h2 style={{ marginTop: 28, marginBottom: 8, fontSize: 15, fontWeight: 600 }}>
        {thread.replies?.length || 0} {thread.replies?.length === 1 ? 'reply' : 'replies'}
      </h2>

      <div className="timeline-container">
        {thread.replies?.length === 0 && <div className="muted" style={{ paddingLeft: 12, fontSize: 13 }}>Be the first to reply.</div>}
        {thread.replies?.map((r) => (
          <div key={r._id} className="timeline-item">
            <div className="card" style={{ padding: 16, marginLeft: 0 }}>
              <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <span className="avatar" style={{ width: 28, height: 28, fontSize: 10 }}>{initials(r.author?.name)}</span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{r.author?.name}</span>
                    {r.source === 'ai' && <span className="badge accent" style={{ textTransform: 'none', height: 18, fontSize: 10 }}>AI</span>}
                    <span className="muted" style={{ fontSize: 10, marginLeft: 'auto' }}>{timeAgo(r.createdAt)}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-primary)' }}>
                    <Markdown>{r.body}</Markdown>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 20, padding: 16 }}>
        <textarea
          rows={3}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Write a reply… (Markdown supported)"
          style={{ minHeight: 80, fontSize: 13 }}
        />
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="primary" style={{ height: 32 }} onClick={submitReply} disabled={!reply.trim()}>Reply</button>
        </div>
      </div>
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
