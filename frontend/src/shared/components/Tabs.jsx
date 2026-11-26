import './kit.css';

// tabs: [{ key, label, count? }]
export default function Tabs({ tabs, active, onChange }) {
  const onKey = (e, i) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    onChange(tabs[next].key);
    e.currentTarget.parentElement.children[next].focus();
  };
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t, i) => (
        <button key={t.key} type="button" role="tab" className="tab"
          aria-selected={active === t.key} tabIndex={active === t.key ? 0 : -1}
          onClick={() => onChange(t.key)} onKeyDown={(e) => onKey(e, i)}>
          {t.label}
          {typeof t.count === 'number' && <span className="tab__count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}