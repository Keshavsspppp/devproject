import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { repoApi, sessionApi } from '../api/index.js';
import { apiError } from '../api/http.js';
import { toast } from '../components/Toast.jsx';
import Empty from '../components/Empty.jsx';

export default function Repo() {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState(null);
  const [pulls, setPulls] = useState([]);
  const [github, setGithub] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [r, p] = await Promise.all([repoApi.get(repoId), repoApi.pulls(repoId)]);
        setRepo(r.repo);
        setPulls(p.pulls);
        setGithub(p.github);
      } catch (e) {
        toast(apiError(e), 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [repoId]);

  const startSession = async (pr) => {
    setStarting(pr.number);
    try {
      const files = (pr.files || []).map((f) => ({
        path: f.path,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch,
      }));
      const { session } = await sessionApi.create({
        orgId: repo.org,
        repoId: repo._id,
        title: `Review: ${pr.title}`,
        pullNumber: pr.number,
        pullTitle: pr.title,
        headSha: pr.headSha,
        baseSha: pr.baseSha,
        files,
      });
      toast('Live session started', 'success');
      navigate(`/sessions/${session._id}`);
    } catch (e) {
      toast(apiError(e), 'error');
    } finally {
      setStarting(null);
    }
  };

  if (loading) return <div className="muted">Loading…</div>;
  if (!repo) return <Empty icon="❓" title="Repository not found" />;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>{repo.fullName}</h1>
          <div className="muted">
            {repo.provider} · {github ? 'live GitHub data' : 'demo PR data (connect GitHub for live)'}
          </div>
        </div>
      </div>

      <h2>Open pull requests</h2>
      {pulls.length === 0 ? (
        <Empty icon="🔀" title="No open pull requests" />
      ) : (
        pulls.map((pr) => (
          <div key={pr.number} className="card" style={{ marginBottom: 12 }}>
            <div className="row between">
              <div className="grow">
                <div className="row">
                  <span className="badge green">#{pr.number}</span>
                  {pr.draft && <span className="badge amber">draft</span>}
                  <div style={{ fontWeight: 600 }}>{pr.title}</div>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  @{pr.author} · {pr.head} → {pr.base}
                  {' · '}+{pr.additions ?? 0} −{pr.deletions ?? 0}
                </div>
              </div>
              <button className="primary" onClick={() => startSession(pr)} disabled={starting === pr.number}>
                {starting === pr.number ? <span className="spinner" /> : '▶ Start live review'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
