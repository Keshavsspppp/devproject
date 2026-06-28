import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth.js';
import { apiError } from '../api/http.js';
import { toast } from '../components/Toast.jsx';

export default function Login() {
  const { login, demo } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@devcollab.dev');
  const [password, setPassword] = useState('demo1234');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const quickDemo = async () => {
    setBusy(true);
    setErr('');
    try {
      await demo();
      navigate('/', { replace: true });
    } catch (e) {
      setErr(apiError(e));
      toast('Demo login failed — is the server running?', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: 24 }}>
          <div className="brand-logo">DC</div>
          DevCollab
        </div>

        <div className="card shadow" style={{ borderRadius: 'var(--radius-lg)', padding: 32 }}>
          <h1 style={{ fontSize: 22, textAlign: 'center', marginBottom: 4 }}>Welcome back</h1>
          <p className="muted" style={{ textAlign: 'center', marginTop: 0, marginBottom: 24, fontSize: 13 }}>
            Sign in to your code review workspace.
          </p>

          {err && <div className="auth-error">{err}</div>}

          <form onSubmit={submit} className="col" style={{ gap: 16 }}>
            <div className="col" style={{ gap: 6 }}>
              <label className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Email Address</label>
              <input
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="col" style={{ gap: 6 }}>
              <label className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button className="primary" style={{ width: '100%', height: 38 }} disabled={busy}>
              {busy ? <span className="spinner" /> : 'Sign in'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
            <div style={{ flex: 1, borderTop: '1px solid var(--border)' }} />
            <span className="muted" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>or</span>
            <div style={{ flex: 1, borderTop: '1px solid var(--border)' }} />
          </div>

          <div className="col" style={{ gap: 8 }}>
            <button
              className="btn btn-ghost"
              style={{ width: '100%', height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={() => {
                toast('To log in with GitHub, please sign in with a password first, then connect your account from the dashboard.', 'info');
              }}
              disabled={busy}
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
              Sign in with GitHub
            </button>

            <button
              className="btn btn-primary"
              style={{ width: '100%', height: 36, background: 'var(--accent-subtle)', color: 'var(--accent)', border: 'none' }}
              onClick={quickDemo}
              disabled={busy}
            >
              ⚡ Quick-login (Recruiter Demo)
            </button>
          </div>
        </div>

        <div className="muted" style={{ textAlign: 'center', marginTop: 18, fontSize: 13 }}>
          Don't have an account? <Link to="/register" style={{ fontWeight: 600 }}>Create one</Link>
        </div>
      </div>
    </div>
  );
}
