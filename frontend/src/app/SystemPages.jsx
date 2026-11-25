import { Link } from 'react-router-dom';
import { ROLE_LABEL } from './routes';

// Basic versions. P26 (System pages) replaces these with the full design later.

export function Forbidden({ needed = [] }) {
  return (
    <div className="card">
      <h1>No permission</h1>
      <p>You do not have access to this page.</p>
      {needed.length > 0 && <p>Needed role: {needed.map((r) => ROLE_LABEL[r]).join(', ')}</p>}
      <Link to="/" className="btn">Back to Dashboard</Link>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="card">
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/" className="btn">Back to Dashboard</Link>
    </div>
  );
}
