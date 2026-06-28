export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';

export default function PresenceStack({ users = [], max = 6 }) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className="presence-stack" title={users.map((u) => u.name).join(', ')}>
      {shown.map((u) => {
        const c = u.color || '#0ea5e9';
        return (
          <span
            key={u.userId || u._id}
            className="avatar"
            title={u.name}
            style={{ background: c, borderColor: 'var(--bg-elev)' }}
          >
            {initials(u.name)}
          </span>
        );
      })}
      {extra > 0 && (
        <span className="avatar" style={{ background: '#33405e' }}>+{extra}</span>
      )}
      {users.length === 0 && <span className="muted" style={{ fontSize: 12 }}>no one online</span>}
    </div>
  );
}
