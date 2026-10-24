import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  PlayCircle,
  Bug,
  History,
  Compass,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Layers,
  Activity,
  Award
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import {
  fetchRuns,
  fetchBugs,
  fetchRegressionTests,
  RunSummary,
  BugFinding,
  RegressionTest
} from '../api/client';

export const Dashboard: React.FC = () => {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [bugs, setBugs] = useState<BugFinding[]>([]);
  const [regressionTests, setRegressionTests] = useState<RegressionTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchRuns(),
      fetchBugs(),
      fetchRegressionTests()
    ])
      .then(([runsData, bugsData, regData]) => {
        setRuns(runsData);
        setBugs(bugsData);
        setRegressionTests(regData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalRuns = runs.length;
  const totalTestsExecuted = runs.reduce((acc, r) => acc + (r.total_tests || 0), 0);
  const totalPassed = runs.reduce((acc, r) => acc + (r.passed_count || 0), 0);
  const totalFailed = runs.reduce((acc, r) => acc + (r.failed_count || 0), 0);
  const totalBlocked = runs.reduce((acc, r) => acc + (r.blocked_count || 0), 0);
  const confirmedBugs = bugs.filter(b => b.status === 'Confirmed' || b.status === 'Verified').length;
  const suspectedBugs = bugs.filter(b => b.status === 'Suspected' || b.status === 'Likely').length;

  const testDistributionData = [
    { name: 'Passed', value: totalPassed || 0, color: '#10b981' },
    { name: 'Failed', value: totalFailed || 0, color: '#ef4444' },
    { name: 'Blocked', value: totalBlocked || 0, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const severityData = [
    { name: 'Critical', count: bugs.filter(b => b.severity === 'Critical').length },
    { name: 'High', count: bugs.filter(b => b.severity === 'High').length },
    { name: 'Medium', count: bugs.filter(b => b.severity === 'Medium').length },
    { name: 'Low', count: bugs.filter(b => b.severity === 'Low').length },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-[hsl(var(--primary))] text-white rounded-2xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <span className="bg-white/10 text-[hsl(var(--accent))] border border-white/15 text-[11px] px-3 py-1 rounded-full font-medium uppercase tracking-wider inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
            Autonomous QA Verification Engine
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-normal mt-3 tracking-tight text-white">
            Operational <span className="italic">Verification</span> Workspace
          </h2>
          <p className="text-white/70 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
            Autonomous exploration, curiosity-guided test planning, deterministic assertion execution, and evidence-backed defect verification with clean replay traces.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <NavLink
            to="/test-cases"
            className="bg-white/10 border border-white/20 text-white font-medium px-4 py-2 rounded-lg text-xs hover:bg-white/20 transition flex items-center gap-1.5"
          >
            <span>All Test Cases</span>
          </NavLink>
          <NavLink
            to="/benchmark"
            className="bg-white/10 border border-white/20 text-white font-medium px-4 py-2 rounded-lg text-xs hover:bg-white/20 transition flex items-center gap-1.5"
          >
            <Award className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
            <span>Benchmarks</span>
          </NavLink>
          <NavLink
            to="/new-run"
            className="bg-[hsl(var(--accent))] text-white font-medium px-4 py-2 rounded-lg text-xs hover:bg-[hsl(var(--accent))]/90 transition shadow-xs flex items-center gap-1.5"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Launch Run</span>
          </NavLink>
        </div>
      </div>

      {/* Metrics KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 md:p-5 rounded-xl border border-[hsl(var(--border))] shadow-xs">
          <div className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Total Runs</div>
          <div className="text-2xl md:text-3xl font-bold text-[hsl(var(--foreground))] mt-1.5 font-mono">{totalRuns}</div>
          <div className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium mt-1 flex items-center gap-1">
            <Activity className="w-3 h-3 text-[hsl(var(--accent))]" />
            <span>Recorded Sessions</span>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-[hsl(var(--border))] shadow-xs">
          <div className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Tests Executed</div>
          <div className="text-2xl md:text-3xl font-bold text-[hsl(var(--foreground))] mt-1.5 font-mono">{totalTestsExecuted}</div>
          <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">
            <NavLink to="/test-cases" className="text-[hsl(var(--accent))] hover:underline font-medium">
              View all cases →
            </NavLink>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-[hsl(var(--border))] shadow-xs">
          <div className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Confirmed Bugs</div>
          <div className="text-2xl md:text-3xl font-bold text-rose-600 mt-1.5 font-mono">{confirmedBugs}</div>
          <div className="text-[11px] text-rose-700 font-medium mt-1">Verified with replay</div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-[hsl(var(--border))] shadow-xs">
          <div className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Suspected Findings</div>
          <div className="text-2xl md:text-3xl font-bold text-amber-600 mt-1.5 font-mono">{suspectedBugs}</div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">Under investigation</div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-[hsl(var(--border))] shadow-xs col-span-2 md:col-span-1">
          <div className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Regression Tests</div>
          <div className="text-2xl md:text-3xl font-bold text-[hsl(var(--foreground))] mt-1.5 font-mono">{regressionTests.length}</div>
          <div className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium mt-1">
            <NavLink to="/regression" className="text-[hsl(var(--accent))] hover:underline font-medium">
              Saved suites →
            </NavLink>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Outcome Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-base text-[#0f172a]">Test Execution Distribution</h3>
              <p className="text-xs text-[#64748b]">Passed vs Failed vs Blocked assertions</p>
            </div>
            <TrendingUp className="w-4 h-4 text-[#047857]" />
          </div>
          {testDistributionData.length > 0 ? (
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={testDistributionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    label
                  >
                    {testDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 pl-4 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#10b981]" />
                  <span>Passed ({totalPassed})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
                  <span>Failed ({totalFailed})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                  <span>Blocked ({totalBlocked})</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-[#94a3b8]">
              No test executions recorded yet. Start a new test run to populate metrics.
            </div>
          )}
        </div>

        {/* Defects by Severity */}
        <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-base text-[#0f172a]">Finding Distribution by Severity</h3>
              <p className="text-xs text-[#64748b]">Impact policy classification</p>
            </div>
            <Layers className="w-4 h-4 text-[#047857]" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis allowDecimals={false} stroke="#64748b" fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#047857" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Runs Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#e2e8f0] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base text-[#0f172a]">Recent Autonomous Test Runs</h3>
            <p className="text-xs text-[#64748b]">History of targeted applications and browser sessions</p>
          </div>
          <NavLink
            to="/runs"
            className="text-xs text-[#047857] hover:underline font-semibold flex items-center gap-1"
          >
            <span>View All Runs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>

        {runs.length === 0 ? (
          <div className="p-8 text-center">
            <Compass className="w-8 h-8 text-[#94a3b8] mx-auto mb-2" />
            <p className="text-sm text-[#64748b]">No test runs recorded in database.</p>
            <NavLink
              to="/new-run"
              className="inline-block mt-3 text-xs font-semibold text-[#047857] bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"
            >
              Start First Autonomous Run
            </NavLink>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8fafc] text-[#64748b] text-xs font-semibold border-b border-[#e2e8f0]">
                <tr>
                  <th className="py-3 px-5">Run ID</th>
                  <th className="py-3 px-5">Target Application</th>
                  <th className="py-3 px-5">Mode</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Tests (P/F/B)</th>
                  <th className="py-3 px-5">Findings</th>
                  <th className="py-3 px-5">Duration</th>
                  <th className="py-3 px-5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {runs.slice(0, 5).map(run => (
                  <tr key={run.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="py-3.5 px-5 font-mono text-xs font-semibold text-[#0f172a]">{run.id}</td>
                    <td className="py-3.5 px-5 text-xs text-[#334155] max-w-xs truncate">{run.target_url}</td>
                    <td className="py-3.5 px-5">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                        {run.mode}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          run.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : run.status === 'failed'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-xs">
                      <span className="text-emerald-700 font-semibold">{run.passed_count}</span> /{' '}
                      <span className="text-rose-700 font-semibold">{run.failed_count}</span> /{' '}
                      <span className="text-amber-700 font-semibold">{run.blocked_count}</span>
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-xs text-[#dc2626]">{run.findings_count}</td>
                    <td className="py-3.5 px-5 text-xs text-[#64748b]">{run.duration_sec ? `${run.duration_sec.toFixed(1)}s` : '--'}</td>
                    <td className="py-3.5 px-5">
                      <NavLink
                        to={`/runs?selected=${run.id}`}
                        className="text-xs text-[#047857] hover:underline font-medium"
                      >
                        Inspect
                      </NavLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Verified Bug Findings */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#e2e8f0] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base text-[#0f172a]">Proof-Carrying Bug Findings</h3>
            <p className="text-xs text-[#64748b]">Verified defects backed by replay attempts and DOM evidence</p>
          </div>
          <NavLink
            to="/bugs"
            className="text-xs text-[#047857] hover:underline font-semibold flex items-center gap-1"
          >
            <span>View All Reports</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>

        {bugs.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748b]">
            No bug findings recorded. Run a test against the demo application to detect seeded defects.
          </div>
        ) : (
          <div className="divide-y divide-[#e2e8f0]">
            {bugs.slice(0, 4).map(bug => (
              <div key={bug.id} className="p-4 hover:bg-[#f8fafc] flex items-center justify-between transition-colors">
                <div className="flex items-start gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 mt-0.5 ${
                      bug.severity === 'Critical'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : bug.severity === 'High'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {bug.severity}
                  </span>
                  <div>
                    <NavLink
                      to={`/bugs/${bug.id}`}
                      className="font-semibold text-sm text-[#0f172a] hover:text-[#047857] transition"
                    >
                      [{bug.id}] {bug.title}
                    </NavLink>
                    <div className="text-xs text-[#64748b] mt-0.5 flex items-center gap-3">
                      <span>Target: <code className="text-[#334155]">{bug.affected_url}</code></span>
                      <span>&bull;</span>
                      <span className="text-[#047857] font-medium">{bug.status} ({bug.replay_attempts} replays)</span>
                    </div>
                  </div>
                </div>
                <NavLink
                  to={`/bugs/${bug.id}`}
                  className="text-xs font-semibold text-[#047857] bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200 hover:bg-emerald-100 transition"
                >
                  Inspect Evidence
                </NavLink>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
