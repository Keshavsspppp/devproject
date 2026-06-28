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
      if (repoOrgId === selectedOrgId) {
        loadThreadsForOrg(selectedOrgId);
      } else {
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
      <div className="page-header">
        <div>
          <h1>Threads</h1>
          <div className="page-subtitle">Async discussions that persist beyond live sessions</div>
        </div>
        {repos.length > 0 && (
          <button className={creating ? 'btn' : 'primary'} onClick={() => setCreating((v) => !v)}>
            {creating ? 'Cancel' : '+ New thread'}
          </button>
        )}
      </div>

      {repos.length > 0 && uniqueOrgIds.length > 1 && (
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>Organisation:</span>
          <select
            value={selectedOrgId}
            onChange={(e) => handleOrgChange(e.target.value)}
            style={{ width: 'auto', height: 28, padding: '0 8px', fontSize: 12.5 }}
          >
            {uniqueOrgIds.map((id) => (
              <option key={id} value={id}>{getOrgName(id)}</option>
            ))}
          </select>
        </div>
      )}

      {creating && repos.length > 0 && (
        <div className="card col" style={{ marginBottom: 24, padding: 20, gap: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600 }}>Create a new thread</h2>
          <div className="col" style={{ gap: 6 }}>
            <label className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Select Repository</label>
            <select value={form.repoId} onChange={(e) => setForm({ ...form, repoId: e.target.value })} required>
              {repos.map((r) => <option key={r._id} value={r._id}>{r.fullName}</option>)}
            </select>
          </div>
          <div className="col" style={{ gap: 6 }}>
            <label className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Thread Title</label>
            <input
              placeholder="e.g. Discussing the DB schema updates"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="col" style={{ gap: 6 }}>
            <label className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Details / Body</label>
            <textarea
              placeholder="Provide details or paste code snippets..."
              rows={4}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <button className="primary" style={{ width: 'fit-content', height: 32 }} onClick={submit}>Create Thread</button>
        </div>
      )}

      {loading ? (
        <div className="muted row" style={{ padding: '24px 0' }}><span className="spinner" /> Loading…</div>
      ) : repos.length === 0 ? (
        <Empty icon="📦" title="No repositories yet" sub="Create a repo first to start threads." />
      ) : threads.length === 0 ? (
        <Empty icon="💬" title="No threads yet" sub="Start an async discussion attached to a repo." />
      ) : (
        <div className="col" style={{ gap: 8 }}>
          {threads.map((t) => (
            <Link
              key={t._id}
              to={`/threads/${t._id}`}
              className="list-row clickable"
              style={{ textDecoration: 'none', color: 'inherit', margin: 0, padding: '12px 16px' }}
            >
              <span style={{ fontSize: 16 }}>💬</span>
              <div className="grow" style={{ marginLeft: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{t.title}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  by {t.author?.name || 'someone'} · {t.replies?.length || 0} replies
                </div>
              </div>
              <span className={`badge ${t.status === 'open' ? 'green' : 'accent'}`} style={{ fontSize: 10 }}>
                {t.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
