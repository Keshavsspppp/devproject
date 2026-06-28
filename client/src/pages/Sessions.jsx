import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sessionApi } from '../api/index.js';
import Empty from '../components/Empty.jsx';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { sessions } = await sessionApi.list();
        setSessions(sessions);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Live sessions</h1>
          <div className="page-subtitle">Real-time collaborative reviews</div>
        </div>
        <Link to="/repos" style={{ textDecoration: 'none' }}>
          <button className="primary">+ Start from a PR</button>
        </Link>
      </div>

      {loading ? (
        <div className="muted row" style={{ padding: '24px 0' }}><span className="spinner" /> Loading…</div>
      ) : sessions.length === 0 ? (
        <Empty icon="🎙️" title="No review sessions yet" sub="Open a repo and start a live review from a pull request." />
      ) : (
        <div className="col" style={{ gap: 8 }}>
          {sessions.map((s) => (
            <Link
              key={s._id}
              to={`/sessions/${s._id}`}
              className="list-row clickable"
              style={{ textDecoration: 'none', color: 'inherit', margin: 0 }}
            >
              {s.status === 'active' ? (
                <span className="pulse-dot" style={{ margin: '0 6px' }} />
              ) : (
                <span style={{ fontSize: 16, margin: '0 4px' }}>🎙️</span>
              )}
              <div className="grow" style={{ marginLeft: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{s.title}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {s.repo?.fullName || s.repo?.name || 'repo'}
                  {s.pullNumber ? ` · PR #${s.pullNumber}` : ''}
                </div>
              </div>
              <span className={`badge ${s.status === 'active' ? 'green' : 'muted'}`} style={{ fontSize: 10 }}>
                {s.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
