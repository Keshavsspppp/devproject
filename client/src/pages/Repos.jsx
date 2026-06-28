import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orgApi, repoApi } from '../api/index.js';
import { apiError } from '../api/http.js';
import { toast } from '../components/Toast.jsx';
import Empty from '../components/Empty.jsx';

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
      <div className="topbar">
        <div>
          <h1>Repositories</h1>
          <div className="muted">Connect repos and open them for review</div>
        </div>
        <button className="primary" onClick={() => setCreating((v) => !v)}>
          {creating ? 'Cancel' : '+ Add repository'}
        </button>
      </div>

      {creating && (
        <form className="card" style={{ marginBottom: 20 }} onSubmit={submit}>
          <div className="grid cols-3">
            <div>
              <label className="muted">Organisation</label>
              <select value={form.orgId} onChange={(e) => setForm({ ...form, orgId: e.target.value })} required>
                <option value="">Select…</option>
                {orgs.map((o) => (
                  <option key={o._id} value={o._id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="muted">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="platform" required />
            </div>
            <div>
              <label className="muted">Full name (owner/name)</label>
              <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="devcollab/platform" />
            </div>
          </div>
          <button className="primary" type="submit" style={{ marginTop: 12 }}>Add</button>
        </form>
      )}

      {loading ? (
        <div className="muted">Loading…</div>
      ) : repos.length === 0 ? (
        <Empty icon="📦" title="No repositories yet" sub="Add one to start reviewing pull requests." />
      ) : (
        repos.map((r) => (
          <Link key={r._id} to={`/repos/${r._id}`} className="list-row clickable" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: 20 }}>📦</span>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{r.fullName || r.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {r.provider} · default branch {r.defaultBranch}
              </div>
            </div>
            <span className={`badge ${r.provider === 'github' ? 'green' : 'blue'}`}>{r.provider}</span>
          </Link>
        ))
      )}
    </div>
  );
}
