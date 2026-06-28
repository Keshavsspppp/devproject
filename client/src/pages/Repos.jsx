import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orgApi, repoApi } from '../api/index.js';
import { apiError } from '../api/http.js';
import { toast } from '../components/Toast.jsx';
import Empty from '../components/Empty.jsx';

const SkeletonLoader = () => (
  <div className="col" style={{ gap: 8 }}>
    {[1, 2, 3].map((n) => (
      <div key={n} className="list-row skeleton" style={{ height: 60, border: 'none' }} />
    ))}
  </div>
);

export default function Repos() {
  const [repos, setRepos] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ orgId: '', name: '', fullName: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [r, o] = await Promise.all([repoApi.list(), orgApi.list()]);
      setRepos(r.repos);
      setOrgs(o.orgs);
      if (o.orgs[0] && !form.orgId) setForm((f) => ({ ...f, orgId: o.orgs[0]._id }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await repoApi.create(form);
      setForm({ orgId: orgs[0]?._id || '', name: '', fullName: '' });
      setCreating(false);
      toast('Repository added', 'success');
      load();
    } catch (e) {
      toast(apiError(e), 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Repositories</h1>
          <div className="page-subtitle">Connect repos and open them for review</div>
        </div>
        <button className={creating ? 'btn' : 'primary'} onClick={() => setCreating((v) => !v)}>
          {creating ? 'Cancel' : '+ Add repository'}
        </button>
      </div>

      {creating && (
        <form className="card col" style={{ marginBottom: 24, padding: 20, gap: 16 }} onSubmit={submit}>
          <h2 style={{ fontSize: 14, fontWeight: 600 }}>Add new repository</h2>
          <div className="grid cols-3" style={{ gap: 16 }}>
            <div className="col" style={{ gap: 6 }}>
              <label className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Organisation</label>
              <select value={form.orgId} onChange={(e) => setForm({ ...form, orgId: e.target.value })} required>
                <option value="">Select…</option>
                {orgs.map((o) => (
                  <option key={o._id} value={o._id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div className="col" style={{ gap: 6 }}>
              <label className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Repository Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="platform" required />
            </div>
            <div className="col" style={{ gap: 6 }}>
              <label className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Full Name (owner/name)</label>
              <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="devcollab/platform" />
            </div>
          </div>
          <button className="primary" type="submit" style={{ width: 'fit-content', height: 32 }}>Add Repository</button>
        </form>
      )}

      {loading ? (
        <SkeletonLoader />
      ) : repos.length === 0 ? (
        <Empty icon="📦" title="No repositories yet" sub="Add one to start reviewing pull requests." />
      ) : (
        <div className="col" style={{ gap: 8 }}>
          {repos.map((r) => (
            <Link key={r._id} to={`/repos/${r._id}`} className="list-row clickable" style={{ textDecoration: 'none', color: 'inherit', margin: 0, padding: '12px 16px' }}>
              <span style={{ fontSize: 16 }}>📦</span>
              <div className="grow" style={{ marginLeft: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{r.fullName || r.name}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {r.provider} · default branch {r.defaultBranch}
                </div>
              </div>
              <span className={`badge ${r.provider === 'github' ? 'green' : 'accent'}`} style={{ fontSize: 10 }}>{r.provider}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
