import './kit.css';

export function LoadingSkeleton({ lines = 5 }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => <div className="skel" key={i} style={{ width: `${100 - i * 8}%` }} />)}
    </div>
  );
}

// action: { label, onClick }
export function EmptyState({ title = 'Nothing here yet', hint, action }) {
  return (
    <div className="state">
      <h3>{title}</h3>
      {hint && <p>{hint}</p>}
      {action && <button type="button" className="btn" onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="state" role="alert">
      <h3>Could not load this</h3>
      <p>{message}</p>
      {onRetry && <button type="button" className="btn btn--primary" onClick={onRetry}>Retry</button>}
    </div>
  );
}