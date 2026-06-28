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
    } catch (e) {
      toast(apiError(e), 'error');
    }
  };

  if (loading) return <div className="muted">Loading…</div>;
  if (!thread) return <Empty icon="❓" title="Thread not found" />;

  return (
    <div style={{ maxWidth: 820 }}>
      <div className="muted" style={{ marginBottom: 8 }}>
        <Link to="/threads">Threads</Link> ›
      </div>
      <div className="card">
        <div className="row between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>{thread.title}</h1>
          <span className={`badge ${thread.status === 'open' ? 'green' : thread.status === 'resolved' ? 'blue' : ''}`}>
            {thread.status}
          </span>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <span className="avatar">{initials(thread.author?.name)}</span>
          <span className="muted">{thread.author?.name}</span>
        </div>
        {thread.body && (
          <div style={{ marginTop: 12 }}>
            <Markdown>{thread.body}</Markdown>
          </div>
        )}
        <div className="row" style={{ marginTop: 16, gap: 8 }}>
          <button className="ghost" onClick={() => setStatus('resolved')} disabled={thread.status === 'resolved'}>
            ✓ Resolve
          </button>
          <button className="ghost" onClick={() => setStatus('open')} disabled={thread.status === 'open'}>
            ↻ Reopen
          </button>
          <button className="ghost danger" onClick={() => setStatus('wontfix')} disabled={thread.status === 'wontfix'}>
            Won't fix
          </button>
        </div>
      </div>

      <h2 style={{ marginTop: 24, fontSize: 18 }}>
        {thread.replies?.length || 0} {thread.replies?.length === 1 ? 'reply' : 'replies'}
      </h2>

      <div className="col" style={{ gap: 12 }}>
        {thread.replies?.length === 0 && <div className="muted">Be the first to reply.</div>}
        {thread.replies?.map((r) => (
          <div key={r._id} className="card" style={{ padding: 14 }}>
            <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <span className="avatar">{initials(r.author?.name)}</span>
              <div className="grow">
                <div className="row">
                  <strong>{r.author?.name}</strong>
                  {r.source === 'ai' && <span className="badge purple" style={{ textTransform: 'none' }}>ai</span>}
                </div>
                <Markdown>{r.body}</Markdown>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <textarea
          rows={3}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Write a reply… (Markdown supported)"
        />
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="primary" onClick={submitReply} disabled={!reply.trim()}>Reply</button>
        </div>
      </div>
    </div>
  );
}
