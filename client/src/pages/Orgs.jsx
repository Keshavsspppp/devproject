import { useEffect, useState } from 'react';
import { orgApi } from '../api/index.js';
import { apiError } from '../api/http.js';
import { toast } from '../components/Toast.jsx';
import Empty from '../components/Empty.jsx';

export default function Orgs() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { orgs } = await orgApi.list();
      setOrgs(orgs);
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
      await orgApi.create({ ...form, slug: form.slug.toLowerCase().replace(/\s+/g, '-') });
      setForm({ name: '', slug: '' });
      setCreating(false);
      toast('Organisation created', 'success');
      load();
    } catch (e) {
      toast(apiError(e), 'error');
    }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Organisations</h1>
          <div className="muted">Teams and roles (admin · reviewer · author)</div>
        </div>
        <button className="primary" onClick={() => setCreating((v) => !v)}>
          {creating ? 'Cancel' : '+ New organisation'}
        </button>
      </div>

      {creating && (
        <form className="card" style={{ marginBottom: 20 }} onSubmit={submit}>
          <div className="grid cols-2">
            <div>
              <label className="muted">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="muted">Slug</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="my-team" required />
            </div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="primary" type="submit">Create</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="muted">Loading…</div>
      ) : orgs.length === 0 ? (
        <Empty icon="🏢" title="No organisations yet" sub="Create one to start adding repos and members." />
      ) : (
        orgs.map((o) => (
          <div key={o._id} className="card" style={{ marginBottom: 12 }}>
            <div className="row between">
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{o.name}</div>
                <div className="muted">/{o.slug}</div>
              </div>
              <span className="badge">{o.members?.length || 0} members</span>
            </div>
            {o.members?.length > 0 && (
              <div className="row wrap" style={{ marginTop: 14, gap: 8 }}>
                {o.members.map((m) => (
                  <span key={(m.user?._id || m.user)} className="badge" style={{ textTransform: 'none', letterSpacing: 0 }}>
                    {m.user?.name || 'user'} · <b style={{ marginLeft: 4 }}>{m.role}</b>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
