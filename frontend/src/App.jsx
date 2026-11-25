import { Route, Routes } from 'react-router-dom';
import AppLayout from './app/AppLayout';
import RequireRole from './app/RequireRole';
import { NotFound } from './app/SystemPages';
import { APP_ROUTES, PUBLIC_ROUTES } from './app/routes';
import { PAGES } from './app/pageRegistry';
import PlaceholderPage from './shared/components/PlaceholderPage';

function pageFor(route) {
  const Page = PAGES[route.id];
  return Page ? <Page /> : <PlaceholderPage route={route} />;
}

export default function App() {
  return (
    <Routes>
      {/* Public pages: no sidebar or top bar */}
      {PUBLIC_ROUTES.map((r) => (
        <Route
          key={r.path}
          path={r.path}
          element={
            <div className="bare">
              <div className="card">
                {pageFor({ ...r, roles: null })}
              </div>
            </div>
          }
        />
      ))}

      {/* Signed-in pages inside the shell */}
      <Route element={<AppLayout />}>
        {APP_ROUTES.map((r) => (
          <Route key={r.id} path={r.path} element={<RequireRole roles={r.roles}>{pageFor(r)}</RequireRole>} />
        ))}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
