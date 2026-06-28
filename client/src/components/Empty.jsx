export default function Empty({ icon = '📭', title = 'Nothing here yet', sub = '' }) {
  return (
    <div className="empty">
      <div className="ico">{icon}</div>
      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{title}</div>
      {sub && <div className="muted" style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
