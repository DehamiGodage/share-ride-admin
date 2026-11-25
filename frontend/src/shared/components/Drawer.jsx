import { useEffect, useRef } from 'react';
import './kit.css';

// <Drawer open title="User USR-1042" onClose={...} footer={<button>...</button>}>content</Drawer>
export default function Drawer({ open, title, onClose, width = 480, footer, children }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="kit-drawer-backdrop" onClick={onClose} />
      <aside className="kit-drawer" role="dialog" aria-modal="true" aria-label={title} style={{ width }}>
        <header className="kit-drawer__head">
          <h2>{title}</h2>
          <button ref={closeRef} type="button" className="btn" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="kit-drawer__body">{children}</div>
        {footer && <footer className="kit-drawer__foot">{footer}</footer>}
      </aside>
    </>
  );
}