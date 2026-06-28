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
      <div className="page-header">
        <div>
          <h1>Organisations</h1>
          <div className="page-subtitle">Teams and roles (admin · reviewer · author)</div>
        </div>
        <button className={creating ? 'btn' : 'primary'} onClick={() => setCreating((v) => !v)}>
          {creating ? 'Cancel' : '+ New organisation'}
        </button>
      </div>

      {creating && (
        <form className="card col" style={{ marginBottom: 24, padding: 20, gap: 16 }} onSubmit={submit}>
          <h2 style={{ fontSize: 14, fontWeight: 600 }}>Create new organisation</h2>
          <div className="grid cols-2" style={{ gap: 16 }}>
            <div className="col" style={{ gap: 6 }}>
              <label className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Organisation Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Corp" required />
            </div>
            <div className="col" style={{ gap: 6 }}>
              <label className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Slug</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="acme" required />
            </div>
          </div>
          <button className="primary" type="submit" style={{ width: 'fit-content', height: 32 }}>Create Organisation</button>
        </form>
      )}

      {loading ? (
        <div className="muted row" style={{ padding: '24px 0' }}><span className="spinner" /> Loading…</div>
      ) : orgs.length === 0 ? (
        <Empty icon="🏢" title="No organisations yet" sub="Create one to start adding repos and members." />
      ) : (
        <div className="col" style={{ gap: 12 }}>
          {orgs.map((o) => (
            <div key={o._id} className="card col" style={{ gap: 14, padding: 20, margin: 0 }}>
              <div className="row between">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--text-primary)' }}>{o.name}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>/{o.slug}</div>
                </div>
                <span className="badge muted" style={{ fontSize: 10 }}>{o.members?.length || 0} members</span>
              </div>
              {o.members?.length > 0 && (
                <div className="row wrap" style={{ gap: 6, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  {o.members.map((m) => (
                    <span key={(m.user?._id || m.user)} className="badge muted" style={{ textTransform: 'none', letterSpacing: 0, height: 22, fontSize: 11 }}>
                      {m.user?.name || 'user'} · <b style={{ color: 'var(--accent)', marginLeft: 4 }}>{m.role}</b>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
