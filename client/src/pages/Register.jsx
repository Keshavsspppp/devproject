import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth.js';
import { apiError } from '../api/http.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await register(form.name, form.email, form.password);
      navigate('/', { replace: true });
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="card shadow">
          <div className="brand" style={{ marginBottom: 22, justifyContent: 'center', padding: 0 }}>
            <span className="logo">{'</>'}</span>
            DevCollab
          </div>

          <h1 style={{ fontSize: 22, textAlign: 'center', marginBottom: 4 }}>Create your account</h1>
          <p className="muted" style={{ textAlign: 'center', marginTop: 0, marginBottom: 22, fontSize: 13 }}>
            Join collaborative, real-time code reviews.
          </p>

          <form onSubmit={submit}>
            <input
              placeholder="Full name"
              value={form.name}
              onChange={set('name')}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
              required
            />
            <input
              type="password"
              placeholder="Password (min 8 chars)"
              value={form.password}
              onChange={set('password')}
              autoComplete="new-password"
              required
            />
            {err && (
              <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11 }}>✕</span> {err}
              </div>
            )}
            <button className="primary" style={{ width: '100%' }} disabled={busy}>
              {busy ? <span className="spinner" /> : 'Create account'}
            </button>
          </form>

          <div className="muted" style={{ textAlign: 'center', marginTop: 18, fontSize: 13 }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
