import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { threadApi, repoApi, orgApi } from '../api/index.js';
import { apiError } from '../api/http.js';
import { toast } from '../components/Toast.jsx';
import Empty from '../components/Empty.jsx';

export default function Threads() {
  const [threads, setThreads] = useState([]);
  const [repos, setRepos] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ repoId: '', title: '', body: '' });

  const loadReposAndInitialThreads = async () => {
    setLoading(true);
    try {
      const [rRes, oRes] = await Promise.all([
        repoApi.list(),
        orgApi.list().catch(() => ({ orgs: [] }))
      ]);
      const fetchedRepos = rRes.repos || [];
      const fetchedOrgs = oRes.orgs || [];
      setRepos(fetchedRepos);
      setOrgs(fetchedOrgs);

      if (fetchedRepos.length === 0) {
        setThreads([]);
        setLoading(false);
        return;
      }

      // Extract unique org IDs from the repos
      const uniqueOrgIds = Array.from(
        new Set(
          fetchedRepos
            .map((r) => (typeof r.org === 'object' ? r.org._id : r.org))
            .filter(Boolean)
        )
      );

      let orgId = selectedOrgId;
      if (!orgId || !uniqueOrgIds.includes(orgId)) {
        orgId = uniqueOrgIds[0] || '';
        setSelectedOrgId(orgId);
      }

      if (orgId) {
        const tRes = await threadApi.list({ orgId });
        setThreads(tRes.threads || []);
      } else {
        setThreads([]);
      }

      if (fetchedRepos[0] && !form.repoId) {
        setForm((f) => ({ ...f, repoId: fetchedRepos[0]._id }));
      }
    } catch (e) {
      toast(apiError(e), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadThreadsForOrg = async (orgId) => {
    setLoading(true);
    try {
      const tRes = await threadApi.list({ orgId });
      setThreads(tRes.threads || []);
    } catch (e) {
      toast(apiError(e), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReposAndInitialThreads();
  }, []);

  const handleOrgChange = async (orgId) => {
    setSelectedOrgId(orgId);
    await loadThreadsForOrg(orgId);
  };

  const submit = async () => {
    if (!form.title.trim()) {
      toast('Title is required', 'error');
      return;
    }
    try {
      const repo = repos.find((x) => x._id === form.repoId);
      const repoOrgId = repo ? (typeof repo.org === 'object' ? repo.org._id : repo.org) : '';
      await threadApi.create({
        orgId: repoOrgId,
        repoId: form.repoId,
        title: form.title,
        body: form.body,
      });
      setForm({ repoId: repos[0]?._id || '', title: '', body: '' });
      setCreating(false);
      toast('Thread created', 'success');
      // Reload threads for the currently selected org
      if (repoOrgId === selectedOrgId) {
        loadThreadsForOrg(selectedOrgId);
      } else {
        // Switch to the org where the thread was created
        handleOrgChange(repoOrgId);
      }
    } catch (e) {
      toast(apiError(e), 'error');
    }
  };

  const getOrgName = (orgId) => {
    const o = orgs.find((x) => x._id === orgId);
    return o ? o.name : orgId;
  };

  const uniqueOrgIds = Array.from(
    new Set(
      repos
        .map((r) => (typeof r.org === 'object' ? r.org._id : r.org))
        .filter(Boolean)
    )
  );

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Threads</h1>
          <div className="muted">Async discussions that persist beyond live sessions</div>
        </div>
        {repos.length > 0 && (
          <button className="primary" onClick={() => setCreating((v) => !v)}>
            {creating ? 'Cancel' : '+ New thread'}
          </button>
        )}
      </div>

      {repos.length > 0 && uniqueOrgIds.length > 1 && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label className="muted" style={{ fontSize: 13 }}>Organisation:</label>
          <select
            value={selectedOrgId}
            onChange={(e) => handleOrgChange(e.target.value)}
            style={{ width: 'auto', padding: '4px 8px' }}
          >
            {uniqueOrgIds.map((id) => (
              <option key={id} value={id}>{getOrgName(id)}</option>
            ))}
          </select>
        </div>
      )}

      {creating && repos.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="col">
            <div>
              <label className="muted">Repository</label>
              <select value={form.repoId} onChange={(e) => setForm({ ...form, repoId: e.target.value })} required>
                {repos.map((r) => <option key={r._id} value={r._id}>{r.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="muted">Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label className="muted">Details</label>
              <textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            <button className="primary" style={{ width: 'fit-content' }} onClick={submit}>Create</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="muted">Loading…</div>
      ) : repos.length === 0 ? (
        <Empty icon="📦" title="No repositories yet" sub="Create a repo first to start threads." />
      ) : threads.length === 0 ? (
        <Empty icon="💬" title="No threads yet" sub="Start an async discussion attached to a repo." />
      ) : (
        threads.map((t) => (
          <Link
            key={t._id}
            to={`/threads/${t._id}`}
            className="list-row clickable"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <span style={{ fontSize: 18 }}>💬</span>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{t.title}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                by {t.author?.name || 'someone'} · {t.replies?.length || 0} replies
              </div>
            </div>
            <span className={`badge ${t.status === 'open' ? 'green' : t.status === 'resolved' ? 'blue' : ''}`}>
              {t.status}
            </span>
          </Link>
        ))
      )}
    </div>
  );
}
