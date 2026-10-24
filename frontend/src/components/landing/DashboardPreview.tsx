import React from 'react';
import {
  LayoutDashboard,
  PlayCircle,
  Compass,
  ListChecks,
  Bug,
  History,
  Award,
  Settings as SettingsIcon,
  Search,
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  ArrowUpRight,
  Database,
  RefreshCw,
  Layers,
  Activity
} from 'lucide-react';

export const DashboardPreview: React.FC = () => {
  return (
    <div
      className="w-full select-none text-left font-body text-[#1e293b]"
      style={{
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '1.25rem',
        border: '1px solid rgba(255, 255, 255, 0.85)',
        boxShadow: 'var(--shadow-dashboard)',
      }}
    >
      {/* Window Titlebar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0]/80 bg-white/70">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#f87171]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#34d399]" />
          </div>
          <div className="h-4 w-[1px] bg-[#e2e8f0] mx-1" />
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#1e293b] text-white flex items-center justify-center font-bold text-[10px]">
              ✦
            </div>
            <span className="font-semibold text-xs tracking-tight text-[#0f172a]">Autonomous QA Engineer</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#e0e7ff] text-[#4338ca] font-medium">v2.0 Active</span>
          </div>
        </div>

        {/* Search bar & Quick controls */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] text-xs text-[#64748b] w-48">
            <Search className="w-3.5 h-3.5 text-[#94a3b8]" />
            <span className="text-[11px]">Search tests, bugs...</span>
            <kbd className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-white border border-[#cbd5e1] text-[#64748b]">⌘K</kbd>
          </div>
          <div className="relative">
            <Bell className="w-4 h-4 text-[#64748b]" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#ef4444]" />
          </div>
          <div className="w-6 h-6 rounded-full bg-[#e2e8f0] border border-[#cbd5e1] flex items-center justify-center text-[10px] font-bold text-[#475569]">
            QA
          </div>
        </div>
      </div>

      {/* Preview App Body (Sidebar + Content) */}
      <div className="flex min-h-[460px] overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 border-r border-[#e2e8f0]/80 bg-[#f8fafc]/90 p-3 hidden md:flex flex-col justify-between shrink-0">
          <div className="space-y-1">
            <div className="px-2 py-1 text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider">
              Workspace
            </div>
            <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-white text-[#0f172a] shadow-xs border border-[#e2e8f0] font-medium text-xs">
              <LayoutDashboard className="w-3.5 h-3.5 text-[#4f46e5]" />
              <span>Overview</span>
            </div>
            <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[#64748b] hover:bg-white/60 font-medium text-xs">
              <PlayCircle className="w-3.5 h-3.5 text-[#94a3b8]" />
              <span>New Test Run</span>
            </div>
            <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[#64748b] hover:bg-white/60 font-medium text-xs">
              <Compass className="w-3.5 h-3.5 text-[#94a3b8]" />
              <span>Exploration Map</span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[#64748b] hover:bg-white/60 font-medium text-xs">
              <div className="flex items-center gap-2.5">
                <ListChecks className="w-3.5 h-3.5 text-[#94a3b8]" />
                <span>Test Cases</span>
              </div>
              <span className="text-[10px] font-semibold px-1 rounded bg-[#e2e8f0] text-[#475569]">48</span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[#64748b] hover:bg-white/60 font-medium text-xs">
              <div className="flex items-center gap-2.5">
                <Bug className="w-3.5 h-3.5 text-[#94a3b8]" />
                <span>Bug Reports</span>
              </div>
              <span className="text-[10px] font-semibold px-1 rounded bg-[#fee2e2] text-[#b91c1c]">4</span>
            </div>
            <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[#64748b] hover:bg-white/60 font-medium text-xs">
              <History className="w-3.5 h-3.5 text-[#94a3b8]" />
              <span>Regression Suite</span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[#64748b] hover:bg-white/60 font-medium text-xs">
              <div className="flex items-center gap-2.5">
                <Award className="w-3.5 h-3.5 text-[#94a3b8]" />
                <span>Benchmarks</span>
              </div>
              <span className="text-[10px] font-semibold px-1 rounded bg-[#ecfdf5] text-[#047857]">100%</span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#e2e8f0]/80 space-y-1">
            <div className="flex items-center gap-2 px-2 py-1 text-[11px] text-[#64748b]">
              <SettingsIcon className="w-3.5 h-3.5 text-[#94a3b8]" />
              <span>Settings</span>
            </div>
            <div className="p-2 rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] text-[10px]">
              <div className="font-semibold text-[#334155] flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-[#10b981]" />
                <span>Engine Protected</span>
              </div>
              <div className="text-[#64748b] truncate mt-0.5">Target: 127.0.0.1:5001</div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Canvas */}
        <div className="flex-1 bg-[#f8fafc]/50 p-4 space-y-4 overflow-hidden">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#e2e8f0]/70">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#0f172a]">Autonomous QA Run #RUN-8824</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                  Verified & Completed
                </span>
              </div>
              <p className="text-[11px] text-[#64748b] mt-0.5">
                Universal exploratory audit & deep verification of transactional state integrity
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] px-2 py-1 rounded-md bg-white border border-[#e2e8f0] text-[#475569] font-medium flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-[#64748b]" />
                Clean Replay Re-verified
              </span>
            </div>
          </div>

          {/* Metric Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-3 border border-[#e2e8f0] shadow-xs">
              <div className="flex items-center justify-between text-[#64748b] text-[11px] mb-1">
                <span>Total Executed</span>
                <ListChecks className="w-3.5 h-3.5 text-[#6366f1]" />
              </div>
              <div className="text-xl font-bold text-[#0f172a]">48</div>
              <div className="text-[10px] text-[#10b981] font-medium mt-0.5">100% of planned budget</div>
            </div>

            <div className="bg-white rounded-xl p-3 border border-[#e2e8f0] shadow-xs">
              <div className="flex items-center justify-between text-[#64748b] text-[11px] mb-1">
                <span>Passed Journeys</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
              </div>
              <div className="text-xl font-bold text-[#0f172a]">42</div>
              <div className="text-[10px] text-[#64748b] font-medium mt-0.5">87.5% pass rate</div>
            </div>

            <div className="bg-white rounded-xl p-3 border border-[#e2e8f0] shadow-xs">
              <div className="flex items-center justify-between text-[#64748b] text-[11px] mb-1">
                <span>Confirmed Defects</span>
                <Bug className="w-3.5 h-3.5 text-[#ef4444]" />
              </div>
              <div className="text-xl font-bold text-[#b91c1c]">4</div>
              <div className="text-[10px] text-[#ef4444] font-medium mt-0.5">Deterministic 2-cycle replay</div>
            </div>

            <div className="bg-white rounded-xl p-3 border border-[#e2e8f0] shadow-xs">
              <div className="flex items-center justify-between text-[#64748b] text-[11px] mb-1">
                <span>Regression Suite</span>
                <Layers className="w-3.5 h-3.5 text-[#0ea5e9]" />
              </div>
              <div className="text-xl font-bold text-[#0f172a]">12</div>
              <div className="text-[10px] text-[#0ea5e9] font-medium mt-0.5">Saved for continuous CI</div>
            </div>
          </div>

          {/* Execution Trends & Evidence Highlights Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Handcrafted SVG Area Chart Card */}
            <div className="lg:col-span-2 bg-white rounded-xl p-3.5 border border-[#e2e8f0] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold text-[#0f172a] flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#4f46e5]" />
                    <span>Curiosity Engine Action Trajectory</span>
                  </div>
                  <div className="text-[10px] text-[#64748b]">Priority-weighted path exploration vs. runtime novelty</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#475569] font-medium">
                  Explainable QA
                </span>
              </div>

              {/* Handcrafted SVG Bézier Path */}
              <div className="w-full h-28 relative my-1">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 400 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Subtle Grid Lines */}
                  <line x1="0" y1="25" x2="400" y2="25" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="50" x2="400" y2="50" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="75" x2="400" y2="75" stroke="#f1f5f9" strokeWidth="1" />

                  {/* Gradient Area */}
                  <path
                    d="M 0,85 C 50,75 80,40 130,45 C 180,50 210,20 260,25 C 310,30 350,10 400,12 L 400,100 L 0,100 Z"
                    fill="url(#areaGradient)"
                  />
                  {/* Stroke Line */}
                  <path
                    d="M 0,85 C 50,75 80,40 130,45 C 180,50 210,20 260,25 C 310,30 350,10 400,12"
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                  {/* Data Points */}
                  <circle cx="130" cy="45" r="3" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="260" cy="25" r="3" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="400" cy="12" r="3.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                </svg>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#64748b] pt-1 border-t border-[#f1f5f9]">
                <span>T=0s (Discovery)</span>
                <span>T=60s (Cart Arithmetic)</span>
                <span>T=140s (Session Recovery)</span>
                <span className="font-semibold text-[#4f46e5]">Score: 0.94 Prio</span>
              </div>
            </div>

            {/* Transaction & Recovery Invariant Card */}
            <div className="bg-white rounded-xl p-3.5 border border-[#e2e8f0] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#059669] bg-[#ecfdf5] px-1.5 py-0.5 rounded">
                    State Invariant
                  </span>
                  <span className="text-[10px] text-[#64748b]">Session Audit</span>
                </div>
                <div className="text-xs font-bold text-[#0f172a] mb-1">
                  Checkout Recovery & Double-Click Idempotency
                </div>
                <p className="text-[11px] text-[#475569] leading-relaxed">
                  Evaluated cart persistence across page reload and blocked non-idempotent duplicate submission.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[10px] space-y-1 mt-2">
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Invariant Checked:</span>
                  <span className="font-semibold text-[#0f172a]">Subtotal == Sum(P*Q)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Refresh Survival:</span>
                  <span className="font-semibold text-[#10b981]">Verified True</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Duplicate Submission:</span>
                  <span className="font-semibold text-[#ef4444]">Seeded Defect Caught</span>
                </div>
              </div>
            </div>
          </div>

          {/* Evidence Table Row */}
          <div className="bg-white rounded-xl p-3 border border-[#e2e8f0] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#0f172a]">Recent Proof-Carrying Findings</span>
              <span className="text-[10px] text-[#64748b]">4 Verified Findings • 0 Unverified Assumptions</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#f8fafc] border border-[#f1f5f9] text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#64748b] bg-white px-1.5 py-0.5 rounded border border-[#e2e8f0]">BUG-01</span>
                  <span className="font-medium text-[#0f172a] truncate max-w-[220px]">User Registration Accepts Malformed Email</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] font-semibold">
                    Confirmed
                  </span>
                  <span className="text-[10px] text-[#64748b]">2 Replays</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#f8fafc] border border-[#f1f5f9] text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#64748b] bg-white px-1.5 py-0.5 rounded border border-[#e2e8f0]">BUG-02</span>
                  <span className="font-medium text-[#0f172a] truncate max-w-[220px]">Cart Subtotal Fails Recomputation on Quantity Change</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] font-semibold">
                    Confirmed
                  </span>
                  <span className="text-[10px] text-[#64748b]">Arithmetic Invariant</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#f8fafc] border border-[#f1f5f9] text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#64748b] bg-white px-1.5 py-0.5 rounded border border-[#e2e8f0]">BUG-05</span>
                  <span className="font-medium text-[#0f172a] truncate max-w-[220px]">Broken Access Control on Protected Customer Route</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5] font-semibold">
                    Critical
                  </span>
                  <span className="text-[10px] text-[#64748b]">Incognito Proved</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPreview;
