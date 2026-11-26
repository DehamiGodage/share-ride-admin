import './kit.css';
import { formatDateTime } from '../utils/format';

// items: [{ id, title, by, at, note }]
export default function Timeline({ items = [] }) {
  if (items.length === 0) return <p>No activity yet.</p>;
  return (
    <ol className="tl">
      {items.map((it, i) => (
        <li className="tl__item" key={it.id || i}>
          <p className="tl__title">{it.title}</p>
          <p className="tl__meta">{[it.by, formatDateTime(it.at)].filter(Boolean).join(' · ')}</p>
          {it.note && <p className="tl__note">{it.note}</p>}
        </li>
      ))}
    </ol>
  );
}