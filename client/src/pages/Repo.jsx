import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { repoApi, sessionApi } from '../api/index.js';
import { apiError } from '../api/http.js';
import { toast } from '../components/Toast.jsx';
import Empty from '../components/Empty.jsx';

const SkeletonLoader = () => (
  <div className="col" style={{ gap: 8 }}>
    {[1, 2].map((n) => (
      <div key={n} className="list-row skeleton" style={{ height: 70, border: 'none' }} />
    ))}
  </div>
);

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

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Loading repository…</div>
            <div className="skeleton" style={{ width: 240, height: 28 }} />
          </div>
        </div>
        <SkeletonLoader />
      </div>
    );
  }

  if (!repo) return <Empty icon="❓" title="Repository not found" />;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <div className="muted" style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
            <Link to="/repos">Repositories</Link>
            <span>›</span>
            <span>{repo.fullName.split('/')[0]}</span>
          </div>
          <h1>{repo.fullName}</h1>
          <div className="page-subtitle" style={{ marginTop: 6 }}>
            <span className={`badge ${github ? 'green' : 'muted'}`} style={{ height: 18, fontSize: 10, marginRight: 6 }}>
              {repo.provider}
            </span>
            {github ? 'live GitHub data synced' : 'demo PR data (connect GitHub for live)'}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Open pull requests</h2>

      {pulls.length === 0 ? (
        <Empty icon="🔀" title="No open pull requests" />
      ) : (
        <div className="col" style={{ gap: 8 }}>
          {pulls.map((pr) => (
            <div key={pr.number} className="list-row" style={{ margin: 0, padding: '12px 16px' }}>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge green" style={{ height: 18, fontSize: 10 }}>#{pr.number}</span>
                  {pr.draft && <span className="badge amber" style={{ height: 18, fontSize: 10 }}>draft</span>}
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pr.title}
                  </div>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  @{pr.author} · {pr.head} → {pr.base}
                  {' · '}+{pr.additions ?? 0} −{pr.deletions ?? 0}
                </div>
              </div>
              <button
                className="primary"
                style={{ height: 28, fontSize: 12, padding: '0 10px' }}
                onClick={() => startSession(pr)}
                disabled={starting === pr.number}
              >
                {starting === pr.number ? <span className="spinner" /> : '▶ Review'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
