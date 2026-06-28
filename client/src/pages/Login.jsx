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
        <div className="card shadow">
          {/* Brand */}
          <div className="brand" style={{ marginBottom: 22, justifyContent: 'center', padding: 0 }}>
            <span className="logo">{'</>'}</span>
            DevCollab
          </div>

          <h1 style={{ fontSize: 22, textAlign: 'center', marginBottom: 4 }}>Welcome back</h1>
          <p className="muted" style={{ textAlign: 'center', marginTop: 0, marginBottom: 22, fontSize: 13 }}>
            Sign in to your code review workspace.
          </p>

          <form onSubmit={submit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            {err && (
              <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11 }}>✕</span> {err}
              </div>
            )}
            <button className="primary" style={{ width: '100%' }} disabled={busy}>
              {busy ? <span className="spinner" /> : 'Sign in'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
            <div style={{ flex: 1, borderTop: '1px solid var(--border)' }} />
            <span className="muted" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>or</span>
            <div style={{ flex: 1, borderTop: '1px solid var(--border)' }} />
          </div>

          <button
            style={{ width: '100%', background: 'rgba(56,189,248,0.08)', borderColor: 'rgba(56,189,248,0.2)', color: 'var(--primary)', fontWeight: 600 }}
            onClick={quickDemo}
            disabled={busy}
          >
            ⚡ One-click demo login
          </button>

          <div className="muted" style={{ textAlign: 'center', marginTop: 18, fontSize: 13 }}>
            No account? <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
