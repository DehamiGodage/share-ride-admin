import './kit.css';

function Sparkline({ data }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / span) * 24 - 2}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="#5b4bdb" strokeWidth="2" />
    </svg>
  );
}

// change = percent against the previous period (e.g. 4.2 or -1.5). invert = true when "down" is good (e.g. cancellation rate)
export default function KpiCard({ label, value, change, invert = false, spark, onClick }) {
  let delta = null;
  if (typeof change === 'number') {
    const up = change > 0;
    const flat = change === 0;
    const good = flat ? null : invert ? !up : up;
    const cls = flat ? 'flat' : good ? 'good' : 'bad';
    delta = (
      <span className={`kpi__delta kpi__delta--${cls}`}>
        {flat ? '– ' : up ? '▲ ' : '▼ '}{Math.abs(change)}% vs previous
      </span>
    );
  }
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className="kpi" onClick={onClick} style={onClick ? { textAlign: 'left', cursor: 'pointer' } : undefined}>
      <p className="kpi__label">{label}</p>
      <p className="kpi__value">{value}</p>
      <div className="kpi__row">{delta}<Sparkline data={spark} /></div>
    </Tag>
  );
}