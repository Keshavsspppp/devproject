import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orgApi, repoApi, sessionApi, aiApi, githubApi } from '../api/index.js';

const initials = (name) => {
  return (name || '?')
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
};

export default function Dashboard() {
  const [orgs, setOrgs] = useState([]);
  const [repos, setRepos] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [provider, setProvider] = useState('mock');
  const [gh, setGh] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [o, r, s, p, g] = await Promise.all([
          orgApi.list(),
          repoApi.list().catch(() => ({ repos: [] })),
          sessionApi.list({ status: 'active' }),
          aiApi.provider().catch(() => ({ provider: 'mock' })),
          githubApi.status().catch(() => ({ configured: false })),
        ]);
        setOrgs(o.orgs || []);
        setRepos(r.repos || []);
        setSessions(s.sessions || []);
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
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <div className="page-subtitle">Your collaborative code review workspace</div>
        </div>
        <div className="row">
          <span className={`badge ${provider === 'mock' ? 'amber' : 'accent'}`}>
            AI · {provider}
          </span>
          <span className={`badge ${gh ? 'green' : 'muted'}`}>
            GitHub · {gh ? 'connected' : 'demo'}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid cols-3" style={{ marginBottom: 24 }}>
        <StatCard
          label="Organisations"
          value={orgs.length}
          icon={
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
              <path d="M9 22V16h6v6M9 16h6M8 6h2v2H8V6zm8-4h2v2h-2V6z"/>
            </svg>
          }
          to="/orgs"
          trend="Total organisations"
        />
        <StatCard
          label="Active sessions"
          value={sessions.length}
          icon={
            <svg width="18" height="18" fill="none" stroke="var(--green)" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          }
          to="/sessions"
          trend="Collaborators active right now"
        />
        <StatCard
          label="Repositories"
          value={repos.length}
          icon={
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
            </svg>
          }
          to="/repos"
          trend="Synced source repositories"
        />
      </div>

      <div className="grid cols-2" style={{ gap: 24 }}>
        {/* Live sessions */}
        <div className="card">
          <div className="row between" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 16 }}>Live review sessions</h2>
            <Link to="/sessions" style={{ fontSize: 13, fontWeight: 500 }}>View all →</Link>
          </div>
          {loading ? (
            <div className="muted row">
              <span className="spinner" /> Loading…
            </div>
          ) : activeSessions.length === 0 ? (
            <div className="muted" style={{ fontSize: 13, padding: '12px 0' }}>
              No active review sessions. <Link to="/sessions" style={{ fontWeight: 600 }}>Start one →</Link>
            </div>
          ) : (
            <div className="col" style={{ gap: 8 }}>
              {activeSessions.map((s) => (
                <Link
                  key={s._id}
                  to={`/sessions/${s._id}`}
                  className="list-row clickable"
                  style={{ textDecoration: 'none', color: 'inherit', margin: 0, padding: '10px 14px' }}
                >
                  <span className="pulse-dot" />
                  <div className="grow" style={{ marginLeft: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{s.title}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {s.repo?.fullName || s.repo?.name || 'repo'}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 12 }}>
                    {s.participants?.length > 0 && (
                      <div className="avatar-stack">
                        {s.participants.slice(0, 3).map((p) => (
                          <span
                            key={p.userId}
                            className="avatar"
                            style={{ background: p.color, width: 24, height: 24, fontSize: 9 }}
                            title={p.name}
                          >
                            {initials(p.name)}
                          </span>
                        ))}
                        {s.participants.length > 3 && (
                          <span
                            className="avatar"
                            style={{ width: 24, height: 24, fontSize: 9, background: 'var(--bg-elevated)' }}
                          >
                            +{s.participants.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    <span className="badge green" style={{ fontSize: 10 }}>live</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Organisations */}
        <div className="card">
          <div className="row between" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 16 }}>Organisations</h2>
            <Link to="/orgs" style={{ fontSize: 13, fontWeight: 500 }}>Manage →</Link>
          </div>
          {loading ? (
            <div className="muted row">
              <span className="spinner" /> Loading…
            </div>
          ) : orgs.length === 0 ? (
            <div className="muted" style={{ fontSize: 13, padding: '12px 0' }}>
              Not in any organization yet. <Link to="/orgs" style={{ fontWeight: 600 }}>Create one →</Link>
            </div>
          ) : (
            <div className="col" style={{ gap: 8 }}>
              {orgs.map((o) => (
                <Link
                  key={o._id}
                  to="/orgs"
                  className="list-row clickable"
                  style={{ textDecoration: 'none', color: 'inherit', margin: 0, padding: '10px 14px' }}
                >
                  <span style={{ fontSize: 16 }}>🏢</span>
                  <div className="grow" style={{ marginLeft: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{o.name}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>/{o.slug}</div>
                  </div>
                  <span className="badge muted">{o.members?.length || 0} members</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Feature overview */}
      <div className="card" style={{ marginTop: 24 }}>
        <h2 style={{ marginBottom: 16, fontSize: 16 }}>Feature Overview</h2>
        <div className="grid cols-2" style={{ gap: 20 }}>
          <FeatureCard
            icon="⬤"
            color="var(--green-subtle)"
            iconColor="var(--green)"
            title="Live review sessions"
            body="Multiple reviewers annotate diffs in real time. Cursors, presence, and typing indicators sync instantly over WebSockets."
          />
          <FeatureCard
            icon="⌥"
            color="var(--accent-subtle)"
            iconColor="var(--accent)"
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
            color="var(--amber-subtle)"
            iconColor="var(--amber)"
            title="Async threads"
            body="Long-form discussions that persist beyond the live session, anchored to any file or line for future reference."
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, to, trend }) {
  return (
    <Link to={to} className="stat-card" style={{ color: 'inherit', textDecoration: 'none' }}>
      <div className="card hoverable tilt col" style={{ padding: 20, gap: 4 }}>
        <div className="row between" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {label}
          </span>
          <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>
          {value}
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
          {trend}
        </div>
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
        <div className="feature-title" style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
          {title}
        </div>
        <div className="feature-body muted" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
          {body}
        </div>
      </div>
    </div>
  );
}
