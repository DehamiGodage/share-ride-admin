import './kit.css';

const TONES = {
  user:        { active: 'green', suspended: 'red' },
  application: { draft: 'grey', submitted: 'blue', under_review: 'amber', approved: 'green', rejected: 'red', suspended: 'darkred' },
  vehicle:     { pending: 'amber', approved: 'green', rejected: 'red' },
  ride:        { draft: 'grey', published: 'indigo', in_progress: 'violet', completed: 'green', cancelled: 'red' },
  booking:     { requested: 'amber', accepted: 'green', rejected: 'red', expired: 'grey', picked_up: 'violet',
                 completed: 'green', cancelled: 'red', no_show: 'darkred' },
  report:      { open: 'red', in_review: 'amber', resolved: 'green', dismissed: 'grey' },
  sos:         { active: 'red', acknowledged: 'amber', escalated: 'darkred', resolved: 'green', false_alarm: 'grey' },
};
const ICONS = { green: '✓', red: '✕', darkred: '✕', amber: '!', blue: 'i', grey: '–', violet: '●', indigo: '●' };
const LABELS = { no_show: 'No-show' };

const pretty = (s) => LABELS[s] || (s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' '));

// <StatusChip entity="booking" status="picked_up" />
export default function StatusChip({ entity, status }) {
  const tone = TONES[entity]?.[status] || 'grey';
  const pulse = entity === 'sos' && status === 'active';
  return (
    <span className={`chip chip--${tone}${pulse ? ' chip--pulse' : ''}`}>
      <span aria-hidden="true">{ICONS[tone]}</span>
      {pretty(status)}
    </span>
  );
}