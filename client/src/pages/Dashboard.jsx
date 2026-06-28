import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orgApi, sessionApi, aiApi, githubApi } from '../api/index.js';

export default function Dashboard() {
  const [orgs, setOrgs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [provider, setProvider] = useState('mock');
  const [gh, setGh] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [o, s, p, g] = await Promise.all([
          orgApi.list(),
          sessionApi.list({ status: 'active' }),
          aiApi.provider().catch(() => ({ provider: 'mock' })),
          githubApi.status().catch(() => ({ configured: false })),
        ]);
        setOrgs(o.orgs);
        setSessions(s.sessions);
        setProvider(p.provider);
        setGh(g.configured);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeSessions = sessions.slice(0, 5);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <div className="muted" style={{ marginTop: 2 }}>Your collaborative code review workspace</div>
        </div>
        <div className="row">
          <span className={`badge ${provider === 'mock' ? 'amber' : 'purple'}`}>
            AI · {provider}
          </span>
          <span className={`badge ${gh ? 'green' : ''}`}>
            GitHub · {gh ? 'connected' : 'demo'}
          </span>
        </div>
      </div>

      {/* Stat cards — .tilt enables 3D hover (Animmaster) */}
      <div className="grid cols-3" style={{ marginBottom: 20 }}>
        <StatCard label="Organisations"  value={orgs.length}            icon="🏢" to="/orgs" />
        <StatCard label="Active sessions" value={sessions.length}       icon="●"  to="/sessions" accent="mint" />
        <StatCard label="Repositories"   value={orgs.length ? '—' : 0} icon="⌥"  to="/repos" accent="violet" />
      </div>

      <div className="grid cols-2">
        {/* Live sessions */}
        <div className="card">
          <div className="row between" style={{ marginBottom: 14 }}>
            <h2 style={{ margin: 0 }}>Live sessions</h2>
            <Link to="/sessions" style={{ fontSize: 13 }}>View all →</Link>
          </div>
          {loading ? (
            <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="spinner" /> Loading…
            </div>
          ) : activeSessions.length === 0 ? (
            <div className="muted" style={{ fontSize: 13 }}>No active review sessions. <Link to="/sessions">Start one →</Link></div>
          ) : (
            activeSessions.map((s) => (
              <Link
                key={s._id}
                to={`/sessions/${s._id}`}
                className="list-row clickable"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <span style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(45,212,191,0.12)',
                  border: '1px solid rgba(45,212,191,0.2)',
                  display: 'grid', placeItems: 'center', fontSize: 14,
                }}>⬤</span>
                <div className="grow">
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.title}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {s.repo?.fullName || s.repo?.name || 'repo'} · {s.participants?.length || 0} reviewers
                  </div>
                </div>
                <span className="badge mint">live</span>
              </Link>
            ))
          )}
        </div>

        {/* Organisations */}
        <div className="card">
          <div className="row between" style={{ marginBottom: 14 }}>
            <h2 style={{ margin: 0 }}>Organisations</h2>
            <Link to="/orgs" style={{ fontSize: 13 }}>Manage →</Link>
          </div>
          {loading ? (
            <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="spinner" /> Loading…
            </div>
          ) : orgs.length === 0 ? (
            <div className="muted" style={{ fontSize: 13 }}>
              Not in any org yet. <Link to="/orgs">Create one →</Link>
            </div>
          ) : (
            orgs.map((o) => (
              <Link
                key={o._id}
                to="/orgs"
                className="list-row"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <span style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(167,139,250,0.12)',
                  border: '1px solid rgba(167,139,250,0.2)',
                  display: 'grid', placeItems: 'center', fontSize: 14,
                }}>🏢</span>
                <div className="grow">
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{o.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>/{o.slug}</div>
                </div>
                <span className="badge">{o.members?.length || 0} members</span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Feature overview */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 16 }}>What DevCollab does</h2>
        <div className="grid cols-2" style={{ gap: 20 }}>
          <FeatureCard
            icon="⬤"
            color="rgba(45,212,191,0.15)"
            iconColor="#2dd4bf"
            title="Live review sessions"
            body="Multiple reviewers annotate diffs in real time. Cursors, presence, and typing indicators sync instantly over WebSockets."
          />
          <FeatureCard
            icon="⌥"
            color="rgba(56,189,248,0.12)"
            iconColor="#38bdf8"
            title="GitHub pull requests"
            body="Connect a repo via OAuth, open PRs as unified diffs, and comment inline. Webhooks refresh sessions on every push."
          />
          <FeatureCard
            icon="✦"
            color="rgba(167,139,250,0.12)"
            iconColor="#a78bfa"
            title="AI code review"
            body="Highlight any code block to get a streamed, Markdown-formatted review — bugs, complexity, and actionable suggestions."
          />
          <FeatureCard
            icon="💬"
            color="rgba(245,158,11,0.10)"
            iconColor="#f59e0b"
            title="Async threads"
            body="Long-form discussions that persist beyond the live session, anchored to any file or line for future reference."
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, to, accent }) {
  const gradients = {
    mint:   'radial-gradient(ellipse 80% 80% at 50% 0%, rgba(45,212,191,0.09), transparent)',
    violet: 'radial-gradient(ellipse 80% 80% at 50% 0%, rgba(167,139,250,0.09), transparent)',
  };
  return (
    <Link to={to} className="stat-card" style={{ color: 'inherit' }}>
      <div
        className="card tilt"
        style={accent ? { '--card-accent': gradients[accent] } : {}}
      >
        <div className="row between">
          <span className="stat-label">{label}</span>
          <span className="stat-icon">{icon}</span>
        </div>
        <div className="stat-value">{value}</div>
      </div>
    </Link>
  );
}

function FeatureCard({ icon, color, iconColor, title, body }) {
  return (
    <div className="feature-card row" style={{ alignItems: 'flex-start', gap: 14 }}>
      <span style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: color, display: 'grid', placeItems: 'center',
        fontSize: 16, color: iconColor,
      }}>
        {icon}
      </span>
      <div>
        <div className="feature-title">{title}</div>
        <div className="feature-body">{body}</div>
      </div>
    </div>
  );
}
