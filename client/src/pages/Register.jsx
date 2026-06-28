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
        <div className="brand" style={{ justifyContent: 'center', marginBottom: 24 }}>
          <div className="brand-logo">DC</div>
          DevCollab
        </div>

        <div className="card shadow" style={{ borderRadius: 'var(--radius-lg)', padding: 32 }}>
          <h1 style={{ fontSize: 22, textAlign: 'center', marginBottom: 4 }}>Create your account</h1>
          <p className="muted" style={{ textAlign: 'center', marginTop: 0, marginBottom: 24, fontSize: 13 }}>
            Join collaborative, real-time code reviews.
          </p>

          {err && <div className="auth-error">{err}</div>}

          <form onSubmit={submit} className="col" style={{ gap: 16 }}>
            <div className="col" style={{ gap: 6 }}>
              <label className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Full Name</label>
              <input
                placeholder="John Doe"
                value={form.name}
                onChange={set('name')}
                required
              />
            </div>
            <div className="col" style={{ gap: 6 }}>
              <label className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Email Address</label>
              <input
                type="email"
                placeholder="you@domain.com"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
                required
              />
            </div>
            <div className="col" style={{ gap: 6 }}>
              <label className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Password (min 8 characters)</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
                autoComplete="new-password"
                required
              />
            </div>

            <button className="primary" style={{ width: '100%', height: 38 }} disabled={busy}>
              {busy ? <span className="spinner" /> : 'Create account'}
            </button>
          </form>
        </div>

        <div className="muted" style={{ textAlign: 'center', marginTop: 18, fontSize: 13 }}>
          Already have an account? <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
