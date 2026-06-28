import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth.js';

export default function OAuthRedirect() {
  const navigate = useNavigate();
  const init = useAuth((s) => s.init);

  useEffect(() => {
    // After GitHub OAuth sets cookies, re-fetch /me then go home.
    (async () => {
      await init();
      navigate('/', { replace: true });
    })();
  }, [init, navigate]);

  return (
    <div className="auth-wrap">
      <div className="auth-card card shadow" style={{ textAlign: 'center' }}>
        <div className="row" style={{ justifyContent: 'center' }}>
          <span className="spinner" /> <span>Finishing GitHub sign-in…</span>
        </div>
      </div>
    </div>
  );
}
