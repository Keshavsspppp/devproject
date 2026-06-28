import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { sessionApi } from '../api/index.js';
import { apiError } from '../api/http.js';
import { useAuth } from '../store/auth.js';
import { useSessionSocket } from '../hooks/useSessionSocket.js';
import { languageFromPath } from '../utils/diff.js';
import DiffViewer from '../components/DiffViewer.jsx';
import AIPanel from '../components/AIPanel.jsx';
import CommentList from '../components/CommentThread.jsx';
import PresenceStack, { initials } from '../components/PresenceStack.jsx';
import Empty from '../components/Empty.jsx';
import { toast } from '../components/Toast.jsx';

const SEVERITIES = ['info', 'nit', 'suggestion', 'blocking'];

const getStatusClass = (status) => {
  if (status === 'added') return 'added';
  if (status === 'removed' || status === 'deleted') return 'deleted';
  return 'modified';
};

export default function Session() {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const [draft, setDraft] = useState({ open: false, line: null, text: '', severity: 'info' });
  const [aiCode, setAiCode] = useState('');
  const draftAreaRef = useRef(null);

  // live socket
  const { connected, presence, typingUsers, send } = useSessionSocket(sessionId, {
    onComment: (c) => setComments((cs) => (cs.some((x) => x._id === c._id) ? cs : [...cs, c])),
    onCommentUpdate: (c) =>
      setComments((cs) => cs.map((x) => (x._id === c._id ? { ...x, ...c } : x))),
    onReaction: ({ commentId, reactions }) =>
      setComments((cs) => cs.map((x) => (x._id === commentId ? { ...x, reactions } : x))),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ session }, { comments }] = await Promise.all([
        sessionApi.get(sessionId),
        sessionApi.comments(sessionId),
      ]);
      setSession(session);
      setComments(comments);
    } catch (e) {
      toast(apiError(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const file = session?.files?.[activeFileIdx];

  const fileComments = useMemo(
    () => comments.filter((c) => !file || c.file === file.path || (!c.file && activeFileIdx === 0)),
    [comments, file, activeFileIdx]
  );

  const onLineClick = (line) => {
    setDraft({ open: true, line, text: '', severity: 'info' });
    setTimeout(() => draftAreaRef.current?.focus(), 30);
  };

  const submitComment = async () => {
    if (!draft.text.trim()) return;
    try {
      const payload = {
        body: draft.text,
        file: file?.path || '',
        lineFrom: draft.line,
        lineTo: draft.line,
        severity: draft.severity,
      };
      const { comment } = await sessionApi.addComment(sessionId, payload);
      setComments((cs) => (cs.some((x) => x._id === comment._id) ? cs : [...cs, comment]));
      send('comment:add', { commentId: comment._id });
      setDraft({ open: false, line: null, text: '', severity: 'info' });
    } catch (e) {
      toast(apiError(e), 'error');
    }
  };

  const onReply = async (parentId, text) => {
    try {
      const { comment } = await sessionApi.addComment(sessionId, {
        body: text,
        parent: parentId,
        file: file?.path || '',
      });
      setComments((cs) => (cs.some((x) => x._id === comment._id) ? cs : [...cs, comment]));
      send('comment:add', { commentId: comment._id });
    } catch (e) {
      toast(apiError(e), 'error');
    }
  };

  const onResolve = async (c) => {
    setComments((cs) => cs.map((x) => (x._id === c._id ? { ...x, resolved: true } : x)));
    try {
      await sessionApi.patchComment(sessionId, c._id, { resolved: true });
      toast('Comment resolved', 'success');
    } catch (e) {
      setComments((cs) => cs.map((x) => (x._id === c._id ? { ...x, resolved: false } : x)));
      toast(apiError(e), 'error');
    }
  };

  const onReact = (commentId, emoji) => {
    send('reaction:add', { commentId, emoji });
  };

  const reviewWholeFile = () => {
    if (!file) return;
    setAiCode(file.patch || '');
  };

  const finishSession = async () => {
    try {
      await sessionApi.patch(sessionId, { status: 'completed' });
      toast('Session marked complete', 'success');
      load();
    } catch (e) {
      toast(apiError(e), 'error');
    }
  };

  const typingList = Object.values(typingUsers);

  if (loading) return <div className="muted" style={{ padding: '24px 0' }}><span className="spinner" /> Loading session…</div>;
  if (!session) return <Empty icon="❓" title="Session not found" />;

  return (
    <div>
      <div className="page-header" style={{ alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="muted" style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
            <Link to="/sessions">Sessions</Link>
            <span>›</span>
            <span>{session.repo?.fullName || 'repo'}</span>
            {session.pullNumber && (
              <>
                <span>›</span>
                <span className="badge muted" style={{ height: 18, fontSize: 10 }}>PR #{session.pullNumber}</span>
              </>
            )}
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{session.title}</h1>
        </div>

        <div className="row wrap" style={{ gap: 8 }}>
          <span className="badge green" style={{ height: 28, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="pulse-dot" />
            Live
          </span>
          <div className="avatar-stack" style={{ marginRight: 8 }}>
            {presence.slice(0, 4).map((p) => (
              <span
                key={p.userId}
                className="avatar"
                style={{ background: p.color, width: 26, height: 26, fontSize: 9 }}
                title={p.name}
              >
                {initials(p.name)}
              </span>
            ))}
          </div>
          {session.status === 'active' && (
            <button className="primary" style={{ height: 32 }} onClick={finishSession}>✓ Mark complete</button>
          )}
          <Link to="/threads">
            <button className="ghost" style={{ height: 32 }}>💬 Async threads</button>
          </Link>
        </div>
      </div>

      <div className="row between" style={{ marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        <PresenceStack users={presence} />
        <div className="row">
          {typingList.length > 0 && (
            <span className="typing">
              {typingList.slice(0, 2).map((t) => t.name).join(', ')}
              {typingList.length > 2 ? ` +${typingList.length - 2}` : ''}
              {' typing'}
              <span className="dot" /><span className="dot" /><span className="dot" />
            </span>
          )}
          <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>{presence.length} online</span>
        </div>
      </div>

      <div className="session-layout">
        {/* LEFT COLUMN: files, tabs, diff, comments */}
        <div className="col" style={{ minWidth: 0 }}>
          {/* file tabs */}
          {session.files?.length > 0 && (
            <div className="file-tabs">
              {session.files.map((f, i) => (
                <button
                  key={f.path}
                  className={`file-tab ${i === activeFileIdx ? 'active' : ''}`}
                  onClick={() => {
                    setActiveFileIdx(i);
                    setDraft({ open: false, line: null, text: '', severity: 'info' });
                  }}
                >
                  <span className={`file-status-dot ${getStatusClass(f.status)}`} />
                  {f.path.split('/').pop()}
                </button>
              ))}
            </div>
          )}

          {file ? (
            <div className="col" style={{ gap: 16 }}>
              <DiffViewer
                file={file}
                comments={comments.filter((c) => c.file === file.path)}
                presence={presence}
                me={user?._id}
                onLineClick={onLineClick}
                onCodeSelect={(text) => setAiCode(text)}
              />
            </div>
          ) : (
            <div className="card">
              <Empty icon="📄" title="No files in this session" sub="Start from a GitHub PR to populate the diff." />
            </div>
          )}

          {/* inline draft box */}
          {draft.open && (
            <div className="card" style={{ marginTop: 12, borderColor: 'var(--accent)', borderWidth: 2, padding: 16 }}>
              <div className="row between" style={{ marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>
                  New comment {file ? `on ${file.path.split('/').pop()}` : ''}
                </span>
                {draft.line != null && <span className="badge accent" style={{ height: 18, fontSize: 10 }}>line {draft.line}</span>}
              </div>
              <textarea
                ref={draftAreaRef}
                rows={3}
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                placeholder="Write your review comment…"
                style={{ marginTop: 4, minHeight: 80 }}
              />
              <div className="row between" style={{ marginTop: 12 }}>
                <div className="row" style={{ gap: 8 }}>
                  <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Severity</span>
                  <select
                    value={draft.severity}
                    onChange={(e) => setDraft({ ...draft, severity: e.target.value })}
                    style={{ width: 'auto', height: 28, padding: '0 8px', fontSize: 12 }}
                  >
                    {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-ghost" style={{ height: 28, padding: '0 12px' }} onClick={() => setDraft({ open: false, line: null, text: '', severity: 'info' })}>Cancel</button>
                  <button className="btn btn-primary" style={{ height: 28, padding: '0 12px' }} onClick={submitComment} disabled={!draft.text.trim()}>Comment</button>
                </div>
              </div>
            </div>
          )}

          {/* comments list */}
          <div className="card" style={{ marginTop: 16, padding: 20 }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>💬 Comments ({fileComments.length})</h2>
              <button
                className="btn btn-ghost"
                style={{ height: 26, fontSize: 12, padding: '0 10px' }}
                onClick={() => setDraft({ open: true, line: null, text: '', severity: 'info' })}
              >
                + General comment
              </button>
            </div>
            <CommentList
              comments={fileComments}
              onReply={onReply}
              onResolve={onResolve}
              onReact={onReact}
              me={user?._id}
              canModerate
            />
          </div>
        </div>

        {/* RIGHT COLUMN: AI assistant, presence detailed list */}
        <div className="col">
          <AIPanel code={aiCode} language={file ? languageFromPath(file.path) : ''} />
          {!aiCode && file && (
            <button
              className="btn btn-ghost"
              style={{ width: '100%', height: 34, border: '1px dashed var(--border-strong)', color: 'var(--text-secondary)' }}
              onClick={reviewWholeFile}
            >
              ⚙️ Review this whole file with AI
            </button>
          )}

          <div className="card" style={{ padding: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>👥 In this session</h2>
            <div className="col" style={{ gap: 10 }}>
              {presence.length === 0 && <span className="muted" style={{ fontSize: 12 }}>No one else online.</span>}
              {presence.map((p) => (
                <div key={p.userId} className="row" style={{ gap: 10 }}>
                  <span className="avatar" style={{ background: p.color, width: 28, height: 28, fontSize: 10 }}>
                    {initials(p.name)}
                  </span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                      {p.userId === String(user?._id) && ' (you)'}
                    </div>
                    <div className="muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                      {p.cursor?.file ? `${p.cursor.file.split('/').pop()}:${p.cursor.line}` : 'browsing'}
                    </div>
                  </div>
                  {p.typing && (
                    <span className="typing">
                      <span className="dot" /><span className="dot" /><span className="dot" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
