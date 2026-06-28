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
      <div className="topbar">
        <div>
          <h1>Live sessions</h1>
          <div className="muted">Real-time collaborative reviews</div>
        </div>
        <Link to="/repos"><button className="primary">+ Start from a PR</button></Link>
      </div>

      {loading ? (
        <div className="muted">Loading…</div>
      ) : sessions.length === 0 ? (
        <Empty icon="🎙️" title="No review sessions yet" sub="Open a repo and start a live review from a pull request." />
      ) : (
        sessions.map((s) => (
          <Link
            key={s._id}
            to={`/sessions/${s._id}`}
            className="list-row clickable"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <span style={{ fontSize: 20 }}>🎙️</span>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{s.title}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {s.repo?.fullName || s.repo?.name || 'repo'}
                {s.pullNumber ? ` · PR #${s.pullNumber}` : ''}
              </div>
            </div>
            <span className={`badge ${s.status === 'active' ? 'green' : ''}`}>{s.status}</span>
          </Link>
        ))
      )}
    </div>
  );
}
