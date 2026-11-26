import './kit.css';

// fields: [{ key, label, type: 'text' | 'select' | 'date', options?: [{ value, label }] }]
// values: { status: 'active', city: '' }
export default function FilterBar({ fields, values, onChange }) {
  const set = (key, value) => onChange({ ...values, [key]: value });
  const clearAll = () => onChange(Object.fromEntries(fields.map((f) => [f.key, ''])));

  const active = fields.filter((f) => values[f.key]);
  const display = (f) => {
    const v = values[f.key];
    return f.type === 'select' ? f.options?.find((o) => o.value === v)?.label || v : v;
  };

  return (
    <>
      <div className="fb">
        {fields.map((f) => (
          <label key={f.key}>
            {f.label}
            {f.type === 'select' ? (
              <select value={values[f.key] || ''} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">All</option>
                {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input type={f.type === 'date' ? 'date' : 'text'} value={values[f.key] || ''}
                onChange={(e) => set(f.key, e.target.value)} />
            )}
          </label>
        ))}
      </div>
      {active.length > 0 && (
        <div className="fb-chips">
          {active.map((f) => (
            <span className="fb-chip" key={f.key}>
              {f.label}: {display(f)}
              <button type="button" aria-label={`Remove ${f.label} filter`} onClick={() => set(f.key, '')}>✕</button>
            </span>
          ))}
          <button type="button" className="btn" onClick={clearAll}>Clear all</button>
        </div>
      )}
    </>
  );
}