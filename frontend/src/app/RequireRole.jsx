import { useAuth } from './AuthContext';
import { Forbidden } from './SystemPages';

// Shows the 403 page when the current role is not allowed to open a route.
// The backend still checks permissions too (requirePermission). This guard is only for the UI.
export default function RequireRole({ roles, children }) {
  const { role } = useAuth();
  return roles.includes(role) ? children : <Forbidden needed={roles} />;
}
