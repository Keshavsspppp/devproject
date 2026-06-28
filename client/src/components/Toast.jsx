import { useEffect, useState } from 'react';

let push = () => {};
export function toast(msg, kind = 'info') {
  push({ msg, kind, id: Math.random() });
}

const ICONS = {
  error: (
    <svg width="14" height="14" fill="none" stroke="var(--red)" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  ),
  success: (
    <svg width="14" height="14" fill="none" stroke="var(--green)" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  ),
  info: (
    <svg width="14" height="14" fill="none" stroke="var(--accent)" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 16v-4M12 8h.01"/>
    </svg>
  ),
  warning: (
    <svg width="14" height="14" fill="none" stroke="var(--amber)" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 9v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
    </svg>
  )
};

export default function Toast() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    push = (t) => {
      setItems((s) => [...s, t]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== t.id)), 4000);
    };
    return () => { push = () => {}; };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="toast-container">
      {items.map((t) => (
        <div key={t.id} className="toast">
          <div className={`toast-bar ${t.kind}`} />
          <span className="toast-icon">{ICONS[t.kind] || ICONS.info}</span>
          <div className="toast-message">{t.msg}</div>
          <div className="toast-progress" />
        </div>
      ))}
    </div>
  );
}
