import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/auth.js';
import AppShell from './components/AppShell.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Orgs from './pages/Orgs.jsx';
import Repos from './pages/Repos.jsx';
import Repo from './pages/Repo.jsx';
import Sessions from './pages/Sessions.jsx';
import Session from './pages/Session.jsx';
import Threads from './pages/Threads.jsx';
import Thread from './pages/Thread.jsx';
import OAuthRedirect from './pages/OAuthRedirect.jsx';
import Toast from './components/Toast.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="center" style={{ height: '100vh' }}>
        <div className="row">
          <span className="spinner" /> <span className="muted">Loading…</span>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  const init = useAuth((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);

  return (
    <>
    <Toast />
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/oauth/redirect" element={<OAuthRedirect />} />

      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/orgs" element={<Protected><Orgs /></Protected>} />
      <Route path="/repos" element={<Protected><Repos /></Protected>} />
      <Route path="/repos/:repoId" element={<Protected><Repo /></Protected>} />
      <Route path="/sessions" element={<Protected><Sessions /></Protected>} />
      <Route path="/sessions/:sessionId" element={<Protected><Session /></Protected>} />
      <Route path="/threads" element={<Protected><Threads /></Protected>} />
      <Route path="/threads/:threadId" element={<Protected><Thread /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
