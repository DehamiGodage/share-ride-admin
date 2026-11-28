import { Route, Routes } from 'react-router-dom';

import AppLayout from './app/AppLayout.jsx';
import RequireAuth from './app/RequireAuth.jsx';
import RequirePermission from './app/RequirePermission.jsx';

import { NotFound } from './app/SystemPages';

import {
  APP_ROUTES,
  PUBLIC_ROUTES,
  ROUTE_PERMISSIONS,
} from './app/routes.js';

import { PAGES } from './app/pageRegistry';

import PlaceholderPage from './shared/components/PlaceholderPage';

// Resolve the registered page component.
function pageFor(route) {
  const Page = PAGES[route.id];

  return Page
    ? <Page />
    : <PlaceholderPage route={route} />;
}

// Apply the permission required by each route.
function protectedPage(route) {
  const permission = ROUTE_PERMISSIONS[route.id];

  // P25 only requires authentication.
  if (permission === null) {
    return pageFor(route);
  }

  // Deny access when a route has no permission mapping.
  if (!permission) {
    return (
      <div className="dt__state" role="alert">
        <h2>403 - Access Denied</h2>
        <p>No permission has been configured for this page.</p>
      </div>
    );
  }

  return (
    <RequirePermission
      area={permission.area}
      level={permission.level || 'view'}
    >
      {pageFor(route)}
    </RequirePermission>
  );
}

export default function App() {
  return (
    <Routes>

      {/* Public pages without sidebar or top bar */}
      {PUBLIC_ROUTES.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <div className="bare">
              <div className="card">
                {pageFor({
                  ...route,
                  roles: null,
                })}
              </div>
            </div>
          }
        />
      ))}

      {/* All admin pages require authentication */}
      <Route element={<RequireAuth />}>

        {/* Authenticated application layout */}
        <Route element={<AppLayout />}>

          {APP_ROUTES.map((route) => (
            <Route
              key={route.id}
              path={route.path}
              element={protectedPage(route)}
            />
          ))}

          <Route
            path="*"
            element={<NotFound />}
          />

        </Route>

      </Route>

    </Routes>
  );
}