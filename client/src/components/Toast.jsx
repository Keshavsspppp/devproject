import { useEffect, useState } from 'react';

let push = () => {};
export function toast(msg, kind = 'info') {
  push({ msg, kind, id: Math.random() });
}

const ICONS = { error: '✕', success: '✓', info: 'ℹ' };
const COLORS = {
  error:   'rgba(248,113,113,0.9)',
  success: 'rgba(45,212,191,0.9)',
  info:    'rgba(56,189,248,0.9)',
};

export default function Toast() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    push = (t) => {
      setItems((s) => [...s, t]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== t.id)), 3800);
    };
    return () => { push = () => {}; };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="toast-container">
      {items.map((t) => (
        <div
          key={t.id}
          className="toast"
          style={{ borderColor: `${COLORS[t.kind] || COLORS.info}33` }}
        >
          <span
            style={{
              width: 18, height: 18,
              borderRadius: '50%',
              background: COLORS[t.kind] || COLORS.info,
              display: 'grid', placeItems: 'center',
              fontSize: 10, fontWeight: 800,
              color: '#fff', flexShrink: 0,
            }}
          >
            {ICONS[t.kind] || ICONS.info}
          </span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
