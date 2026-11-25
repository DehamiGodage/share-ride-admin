import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileCheck, ShieldCheck, Car, Route, Ticket, Radio, AlertTriangle,
  Flag, Star, Bell, SlidersHorizontal, MapPin, BarChart3, ScrollText, Activity, UserCog,
  ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { APP_ROUTES, GROUP_ORDER } from './routes';
import { useAuth } from './AuthContext';

const ICONS = {
  LayoutDashboard, Users, FileCheck, ShieldCheck, Car, Route, Ticket, Radio, AlertTriangle,
  Flag, Star, Bell, SlidersHorizontal, MapPin, BarChart3, ScrollText, Activity, UserCog,
};

export default function Sidebar({ collapsed, onToggle }) {
  const { role } = useAuth();

  // Only pages this role may open, grouped. Empty groups are hidden.
  const groups = GROUP_ORDER.map((name) => ({
    name,
    items: APP_ROUTES.filter((r) => r.group === name && r.roles.includes(role)),
  })).filter((g) => g.items.length > 0);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`} aria-label="Main navigation">
      <div className="sidebar__brand">
        <span className="sidebar__logo">S</span>
        <span className="sidebar__brand-text">Share-Ride</span>
      </div>

      <nav className="sidebar__nav">
        {groups.map((g) => (
          <div key={g.name}>
            <div className="sidebar__group">{g.name}</div>
            {g.items.map((item) => {
              const Icon = ICONS[item.icon];
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `sidebar__link ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.title : undefined}
                >
                  {Icon && <Icon size={18} aria-hidden="true" />}
                  <span className="sidebar__label">{item.title}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <button className="sidebar__collapse" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        {collapsed ? <ChevronsRight size={18} /> : <><ChevronsLeft size={18} /> <span className="sidebar__label">Collapse sidebar</span></>}
      </button>
    </aside>
  );
}
