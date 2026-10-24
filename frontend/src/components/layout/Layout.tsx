import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PlayCircle,
  Compass,
  ListChecks,
  Bug,
  History,
  Settings as SettingsIcon,
  ShieldCheck,
  Cpu,
  RefreshCw,
  ExternalLink,
  Award
} from 'lucide-react';
import { fetchConfigStatus, ConfigStatus } from '../../api/client';

export const Layout: React.FC = () => {
  const location = useLocation();
  const [config, setConfig] = useState<ConfigStatus | null>(null);

  useEffect(() => {
    fetchConfigStatus().then(setConfig).catch(() => {});
  }, []);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'New Test Run', path: '/new-run', icon: PlayCircle },
    { label: 'Explore Application', path: '/explore', icon: Compass },
    { label: 'Test Runs', path: '/runs', icon: ListChecks },
    { label: 'Bug Reports', path: '/bugs', icon: Bug },
    { label: 'Regression Tests', path: '/regression', icon: History },
    { label: 'Benchmark Console', path: '/benchmark', icon: Award },
    { label: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const getPageTitle = () => {
    const current = navItems.find(item => item.path === location.pathname);
    if (current) return current.label;
    if (location.pathname.startsWith('/bugs/')) return 'Bug Finding Details';
    if (location.pathname.startsWith('/runs/')) return 'Test Run Details';
    return 'Autonomous AI QA';
  };

  return (
    <div className="flex h-screen bg-[#fcfdfc] text-[#0f172a] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#e2e8f0] bg-white flex flex-col shrink-0 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-[#e2e8f0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#064e3b] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-[#064e3b]">Autonomous AI</div>
              <div className="text-[11px] text-[#047857] font-semibold">QA Engineer</div>
            </div>
          </div>
        </div>

        {/* Navigation Routes */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-[#94a3b8] uppercase">
            Platform Workflow
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#ecfdf5] text-[#065f46] font-semibold border border-[#a7f3d0]'
                      : 'text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Operating Environment Status */}
        <div className="p-4 border-t border-[#e2e8f0] bg-[#f8fafc]">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[#64748b] font-medium flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-700" />
              Engine Mode
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                config?.demo_mode_active
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              {config?.demo_mode_active ? 'Deterministic Demo' : 'Real AI (Active)'}
            </span>
          </div>
          <div className="text-[11px] text-[#64748b] truncate">
            Target: <code className="bg-white px-1 py-0.5 rounded border border-[#e2e8f0]">127.0.0.1:5001</code>
          </div>
          <div className="mt-2 pt-2 border-t border-[#e2e8f0] flex items-center justify-between text-[11px]">
            <a
              href="http://127.0.0.1:5001"
              target="_blank"
              rel="noreferrer"
              className="text-[#047857] hover:underline flex items-center gap-1 font-medium"
            >
              <span>Sample DevStore</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={() => fetch('/api/v1/health').then(() => window.location.reload())}
              title="Refresh Engine Status"
              className="p-1 hover:bg-slate-200 rounded text-[#64748b]"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-[#e2e8f0] bg-white px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-lg text-[#0f172a]">{getPageTitle()}</h1>
            <span className="text-[#cbd5e1]">/</span>
            <span className="text-xs text-[#64748b] bg-[#f1f5f9] px-2 py-1 rounded font-mono">
              iMocha Problem Statement IM-02
            </span>
          </div>

          <div className="flex items-center gap-4">
            <NavLink
              to="/new-run"
              className="flex items-center gap-2 bg-[#065f46] hover:bg-[#047857] text-white px-3.5 py-1.5 rounded-lg text-sm font-medium transition shadow-sm"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Launch New Run</span>
            </NavLink>
          </div>
        </header>

        {/* Routed Page Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#fcfdfc]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
