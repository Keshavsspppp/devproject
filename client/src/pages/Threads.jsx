import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { threadApi, repoApi } from '../api/index.js';
import { apiError } from '../api/http.js';
import { toast } from '../components/Toast.jsx';
import Empty from '../components/Empty.jsx';

export default function Threads() {
  const [threads, setThreads] = useState([]);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ repoId: '', title: '', body: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([threadApi.list(), repoApi.list()]);
      setThreads(t.threads);
      setRepos(r.repos);
      if (r.repos[0] && !form.repoId) setForm((f) => ({ ...f, repoId: r.repos[0]._id }));
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
      const repo = repos.find((x) => x._id === form.repoId);
      await threadApi.create({
        orgId: repo?.org,
        repoId: form.repoId,
        title: form.title,
        body: form.body,
      });
      setForm({ repoId: repos[0]?._id || '', title: '', body: '' });
      setCreating(false);
      toast('Thread created', 'success');
      load();
    } catch (e) {
      toast(apiError(e), 'error');
    }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Threads</h1>
          <div className="muted">Async discussions that persist beyond live sessions</div>
        </div>
        <button className="primary" onClick={() => setCreating((v) => !v)}>
          {creating ? 'Cancel' : '+ New thread'}
        </button>
      </div>

      {creating && (
        <form className="card" style={{ marginBottom: 20 }} onSubmit={submit}>
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
            <button className="primary" type="submit" style={{ width: 'fit-content' }}>Create</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="muted">Loading…</div>
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
