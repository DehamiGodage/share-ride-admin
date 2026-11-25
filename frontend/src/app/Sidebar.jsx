
import { useState, useRef, useLayoutEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import {
  LayoutDashboard, Users, FileCheck, ShieldCheck,
  Car, Route, Ticket, Radio, AlertTriangle,
  Flag, Star, Bell, SlidersHorizontal, MapPin,
  BarChart3, ScrollText, Activity, UserCog,
  ChevronsLeft, ChevronsRight,
} from 'lucide-react';

import { APP_ROUTES, GROUP_ORDER } from './routes';
import { useAuth } from './AuthContext';

const ICONS = {
  LayoutDashboard, Users, FileCheck, ShieldCheck,
  Car, Route, Ticket, Radio, AlertTriangle,
  Flag, Star, Bell, SlidersHorizontal, MapPin,
  BarChart3, ScrollText, Activity, UserCog,
};

export default function Sidebar({ collapsed, onToggle }) {

  const { role } = useAuth();
  const location = useLocation();
  const navRef = useRef(null);

  // Floating active indicator
  const [indicator, setIndicator] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    visible: false,
  });

  // Filter pages according to user role
  const groups = GROUP_ORDER.map((name) => ({
    name,
    items: APP_ROUTES.filter(
      (r) => r.group === name && r.roles.includes(role)
    ),
  })).filter((g) => g.items.length > 0);

  // Update indicator when the selected page changes
  useLayoutEffect(() => {

    const nav = navRef.current;

    if (!nav) return;

    const updateIndicator = () => {

      const activeLink = nav.querySelector(
        '.sidebar__link.active'
      );

      if (!activeLink) {
        setIndicator((prev) => ({
          ...prev,
          visible: false,
        }));
        return;
      }

      const linkRect = activeLink.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();

      setIndicator({
        top:
          linkRect.top -
          navRect.top +
          nav.scrollTop -
          nav.clientTop,

        left:
          linkRect.left -
          navRect.left +
          nav.scrollLeft -
          nav.clientLeft,

        width: linkRect.width,
        height: linkRect.height,
        visible: true,
      });
    };

    updateIndicator();

    // Handle sidebar resizing and collapsing
    const observer = new ResizeObserver(updateIndicator);

    observer.observe(nav);

    const activeLink = nav.querySelector(
      '.sidebar__link.active'
    );

    if (activeLink) {
      observer.observe(activeLink);
    }

    return () => observer.disconnect();

  }, [location.pathname, collapsed, role]);

  return (
    <aside
      className={`sidebar ${
        collapsed ? 'sidebar--collapsed' : ''
      }`}
      aria-label="Main navigation"
    >

      {/* Brand */}
      <div className="sidebar__brand">

        <span className="sidebar__logo">
          S
        </span>

        <span className="sidebar__brand-text">
          Share-Ride
        </span>

      </div>

      {/* Navigation */}
      <nav
        className="sidebar__nav"
        ref={navRef}
      >

        {/* Floating active rectangle */}
        <div
          className="sidebar__indicator"
          aria-hidden="true"
          style={{
            transform: `translate(
              ${indicator.left}px,
              ${indicator.top}px
            )`,
            width: indicator.width,
            height: indicator.height,
            opacity: indicator.visible ? 1 : 0,
          }}
        />

        {/* Navigation groups */}
        {groups.map((g) => (

          <div key={g.name}>

            <div className="sidebar__group">
              {g.name}
            </div>

            {g.items.map((item) => {

              const Icon = ICONS[item.icon];

              return (

                <NavLink
                  key={item.id}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `sidebar__link ${
                      isActive ? 'active' : ''
                    }`
                  }
                  title={
                    collapsed ? item.title : undefined
                  }
                >

                  {Icon && (
                    <Icon
                      size={18}
                      aria-hidden="true"
                    />
                  )}

                  <span className="sidebar__label">
                    {item.title}
                  </span>

                </NavLink>

              );
            })}

          </div>

        ))}

      </nav>

      {/* Collapse button */}
      <button
        className="sidebar__collapse"
        onClick={onToggle}
        aria-label={
          collapsed
            ? 'Expand sidebar'
            : 'Collapse sidebar'
        }
      >

        {collapsed ? (

          <ChevronsRight size={18} />

        ) : (

          <>
            <ChevronsLeft size={18} />

            <span className="sidebar__label">
              Collapse sidebar
            </span>
          </>

        )}

      </button>

    </aside>
  );
}
