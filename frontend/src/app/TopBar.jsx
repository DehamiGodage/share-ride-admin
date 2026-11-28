import { useEffect, useRef, useState } from 'react';
import { Link, matchPath, useLocation } from 'react-router-dom';
import { Bell, ChevronDown, HelpCircle, LogOut, Search, User } from 'lucide-react';
import { APP_ROUTES, ROLE_LABEL } from './routes';
import { useAuth } from './AuthContext';



// Breadcrumb trail built from routes.js: Group > (parent page) > current page
function useBreadcrumbs() {

  const { pathname } = useLocation();
  const route = APP_ROUTES.find((r) => matchPath({ path: r.path, end: true }, pathname));
  if (!route) return [{ label: 'Not found' }];
  
  const parent = route.parent ? APP_ROUTES.find((r) => r.id === route.parent) : null;
  const crumbs = [];
  if (route.group && route.path !== '/') crumbs.push({ label: route.group });
  if (parent) crumbs.push({ label: parent.title, to: parent.path });
  crumbs.push({ label: route.title });
  return crumbs;
}

export default function TopBar() {

  const crumbs = useBreadcrumbs();
  const {
    user,
    role,
    setDevRole,
    signOut,
    devBypass,
    can,
  } = useAuth();
  const [open, setOpen] = useState(false);
  const searchRef = useRef(null);

  // MOCK: replaced by GET /admin/sos/summary (polled) when the SOS module exists.
  const activeSos = 2;

  // Ctrl+K focuses the global search box.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="topbar">
      <nav className="crumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'inline-flex', gap: 8 }}>
            {i > 0 && <span aria-hidden="true">/</span>}
            {i === crumbs.length - 1 ? (
              <span className="crumbs__current">{c.label}</span>
            ) : c.to ? (
              <Link to={c.to}>{c.label}</Link>
            ) : (
              <span>{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="topbar__spacer" />

      <label className="search">
        <Search size={16} aria-hidden="true" />
        <input ref={searchRef} type="search" placeholder="Search users, rides, reports…" aria-label="Global search" />
        <kbd>Ctrl K</kbd>
      </label>

     {activeSos > 0 && can('sos_reports', 'full') && (
        <Link to="/safety" className="sos-badge" aria-label={`${activeSos} active SOS alerts`}>
          SOS {activeSos}
        </Link>
      )}
      {can('notifications') && (
         <button className="icon-btn" aria-label="Notifications">
            <Bell size={18} />
         </button>
      )}
        <button className="icon-btn" aria-label="Help"><HelpCircle size={18} /></button>

      <div className="menu">
        <button className="menu__btn" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu">
         <span className="avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </span>
          <ChevronDown size={16} />
        </button>
        {open && (
         <div className="menu__panel" role="menu">
              <div className="menu__label">
                {user?.name || 'Admin'} · {ROLE_LABEL[role] || role}
              </div>

              {devBypass && (
                <select
                  value={role}
                  onChange={(e) => setDevRole(e.target.value)}
                  aria-label="Test as role"
                >
                  {Object.entries(ROLE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            <hr />
            <Link to="/account" className="menu__item" role="menuitem" onClick={() => setOpen(false)}>
              <User size={16} /> My account
            </Link>
           {!devBypass && (
           <button className="menu__item" role="menuitem"
                 onClick={() => {
                    setOpen(false);
                    signOut();
            }}>
             <LogOut size={16} /> Sign out
          </button>
          )}
          </div>
        )}
      </div>
    </header>
  );
}
