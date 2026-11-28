import { useAuth } from './AuthContext.jsx';

export default function RequirePermission({
  area,
  level = 'view',
  children,
}) {
  const { can, status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="dt__state" role="status">
        Loading...
      </div>
    );
  }

  if (!can(area, level)) {
    return (
      <div className="dt__state" role="alert">
        <h2>403 - Access Denied</h2>

        <p>
          Your role does not have permission
          to access this page.
        </p>
      </div>
    );
  }

  return children;
}