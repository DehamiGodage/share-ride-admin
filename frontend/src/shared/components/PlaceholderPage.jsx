import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { ROLE_LABEL } from '../../app/routes';

// Shown for every page that has not been built yet. A member's real page replaces it
// once registered in src/app/pageRegistry.js.
export default function PlaceholderPage({ route }) {
  const params = useParams();
  const [result, setResult] = useState('');

  async function checkBackend() {
    setResult('Checking…');
    try {
      const res = await api.get('/admin/me');
      setResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setResult(`${e.code}: ${e.message}`);
    }
  }

  return (
    <div className="card placeholder">
      <h1>{route.title}</h1>
      <p>Page {route.id} is not built yet. This placeholder will be replaced by its owner.</p>
      <div className="placeholder__meta">
        <span className="chip">Route: {route.path}</span>
        {Object.keys(params).length > 0 && <span className="chip">Params: {JSON.stringify(params)}</span>}
        {route.roles && <span className="chip">Roles: {route.roles.map((r) => ROLE_LABEL[r]).join(', ')}</span>}
      </div>
      <button className="btn btn--primary" onClick={checkBackend}>Check backend connection (GET /admin/me)</button>
      {result && <pre className="api-result">{result}</pre>}
    </div>
  );
}
