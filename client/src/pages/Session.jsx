import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { sessionApi, threadApi } from '../api/index.js';
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

  // comments for the active file (plus general session comments)
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
    // optimistic local update
    setComments((cs) => cs.map((x) => (x._id === c._id ? { ...x, resolved: true } : x)));
    try {
      await sessionApi.patchComment(sessionId, c._id, { resolved: true });
      toast('Comment resolved', 'success');
    } catch (e) {
      // Revert optimistic update on failure
      setComments((cs) => cs.map((x) => (x._id === c._id ? { ...x, resolved: false } : x)));
      toast(apiError(e), 'error');
    }
  };

  const onReact = (commentId, emoji) => {
    send('reaction:add', { commentId, emoji });
  };

  const reviewWholeFile = () => {
    // build a pseudo-snippet from added/context lines for the AI
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

  if (loading) return <div className="muted">Loading session…</div>;
  if (!session) return <Empty icon="❓" title="Session not found" />;

  return (
    <div>
      <div className="topbar" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="muted" style={{ fontSize: 12 }}>
            <Link to="/sessions">Sessions</Link> › {session.repo?.fullName || 'repo'}
            {session.pullNumber ? ` · PR #${session.pullNumber}` : ''}
          </div>
          <h1 style={{ margin: 0 }}>{session.title}</h1>
        </div>
        <div className="row wrap">
          <span className={`badge ${connected ? 'green' : 'red'}`}>
            {connected ? '● live' : '○ reconnecting'}
          </span>
          {session.status === 'active' && (
            <button onClick={finishSession}>✓ Mark complete</button>
          )}
          <Link to="/threads">
            <button className="ghost">💬 Async threads</button>
          </Link>
        </div>
      </div>

      <div className="row between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <PresenceStack users={presence} />
        <div className="row wrap">
          {typingList.length > 0 && (
            <span className="typing">
              {typingList.slice(0, 2).map((t) => t.name).join(', ')}
              {typingList.length > 2 ? ` +${typingList.length - 2}` : ''}
              {' typing'}
              <span className="dot" /><span className="dot" /><span className="dot" />
            </span>
          )}
          <span className="muted" style={{ fontSize: 12 }}>{presence.length} online</span>
        </div>
      </div>

      <div className="session-layout">
        {/* LEFT: diff + files + comments */}
        <div className="col">
          {/* file tabs */}
          {session.files?.length > 0 && (
            <div className="row wrap" style={{ marginBottom: 8 }}>
              {session.files.map((f, i) => (
                <button
                  key={f.path}
                  className={i === activeFileIdx ? 'primary' : 'ghost'}
                  onClick={() => { setActiveFileIdx(i); setDraft({ open: false, line: null, text: '', severity: 'info' }); }}
                  style={{ padding: '6px 12px', fontFamily: 'var(--mono)', fontSize: 12 }}
                >
                  {f.path}
                </button>
              ))}
            </div>
          )}

          {file ? (
            <DiffViewer
              file={file}
              comments={comments.filter((c) => c.file === file.path)}
              presence={presence}
              me={user?._id}
              onLineClick={onLineClick}
              onCodeSelect={(text) => setAiCode(text)}
            />
          ) : (
            <div className="card">
              <Empty icon="📄" title="No files in this session" sub="Start from a GitHub PR to populate the diff." />
            </div>
          )}

          {/* inline draft box */}
          {draft.open && (
            <div className="card" style={{ marginTop: 12, borderColor: 'var(--primary)' }}>
              <div className="row between">
                <strong>New comment {file ? `on ${file.path}` : ''}</strong>
                {draft.line != null && <span className="badge blue" style={{ textTransform: 'none' }}>line {draft.line}</span>}
              </div>
              <textarea
                ref={draftAreaRef}
                rows={3}
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                placeholder="Write your review comment…"
                style={{ marginTop: 8 }}
              />
              <div className="row between" style={{ marginTop: 8 }}>
                <div className="row">
                  <label className="muted" style={{ fontSize: 12 }}>Severity</label>
                  <select
                    value={draft.severity}
                    onChange={(e) => setDraft({ ...draft, severity: e.target.value })}
                    style={{ width: 'auto' }}
                  >
                    {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="row">
                  <button className="ghost" onClick={() => setDraft({ open: false, line: null, text: '', severity: 'info' })}>Cancel</button>
                  <button className="primary" onClick={submitComment} disabled={!draft.text.trim()}>Comment</button>
                </div>
              </div>
            </div>
          )}

          {/* comments */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="row between" style={{ marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>💬 Comments ({fileComments.length})</h3>
              <button className="ghost" onClick={() => setDraft({ open: true, line: null, text: '', severity: 'info' })}>
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

        {/* RIGHT: AI panel + presence detail */}
        <div className="col">
          <AIPanel code={aiCode} language={file ? languageFromPath(file.path) : ''} />
          {!aiCode && file && (
            <button className="ghost" onClick={reviewWholeFile}>
              ⚙️ Review this whole file with AI
            </button>
          )}

          <div className="card">
            <h3 style={{ margin: 0 }}>👥 In this session</h3>
            <div className="col" style={{ marginTop: 8, gap: 8 }}>
              {presence.length === 0 && <span className="muted">No one else online.</span>}
              {presence.map((p) => (
                <div key={p.userId} className="row" style={{ gap: 10 }}>
                  <span className="avatar" style={{ background: p.color }}>{initials(p.name)}</span>
                  <div className="grow">
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}{p.userId === String(user?._id) && ' (you)'}</div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      {p.cursor?.file ? `${p.cursor.file}:${p.cursor.line}` : 'browsing'}
                    </div>
                  </div>
                  {p.typing && <span className="typing"><span className="dot" /><span className="dot" /><span className="dot" /></span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
