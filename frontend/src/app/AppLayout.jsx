import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const ENV = import.meta.env.VITE_ENV || 'DEV';
const VERSION = '0.1.0';

export default function AppLayout() {
  // Below 1280 px the sidebar starts collapsed (design document, responsive behaviour).
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1280);

  return (
    <div className="shell">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="main">
        <TopBar />
        <main className="content">
          <Outlet />
        </main>
        <footer className="footer">
          <span>Share-Ride Admin v{VERSION}</span>
          <span className={`env-badge ${ENV === 'PROD' ? 'env-badge--prod' : ENV === 'STAGING' ? 'env-badge--staging' : ''}`}>{ENV}</span>
          <span>Time zone: Asia/Colombo</span>
        </footer>
      </div>
    </div>
  );
}
