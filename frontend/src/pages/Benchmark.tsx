import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Award,
  PlayCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Activity,
  Layers,
  ArrowRight,
  ExternalLink,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Target
} from 'lucide-react';
import {
  fetchBenchmarkGroundTruth,
  fetchRunBenchmarkResults,
  runBenchmarkSuite,
  fetchRuns,
  fetchSampleAppDefects,
  toggleSampleAppDefects,
  BenchmarkReport,
  GroundTruthRegistry,
  RunSummary
} from '../api/client';

export const Benchmark: React.FC = () => {
  const [groundTruth, setGroundTruth] = useState<GroundTruthRegistry | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReport | null>(null);
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [loading, setLoading] = useState(true);
  const [defectsState, setDefectsState] = useState<Record<string, boolean>>({});
  const [togglingDefect, setTogglingDefect] = useState(false);

  const loadRunBenchmark = (runId: string) => {
    if (!runId) return;
    fetchRunBenchmarkResults(runId)
      .then(setBenchmarkReport)
      .catch(() => setBenchmarkReport(null));
  };

  // Load ground truth registry and run list
  useEffect(() => {
    Promise.all([
      fetchBenchmarkGroundTruth(),
      fetchRuns(),
      fetchSampleAppDefects()
    ])
      .then(([gt, runsData, defData]) => {
        setGroundTruth(gt);
        setRuns(runsData);
        if (defData?.defects) {
          setDefectsState(defData.defects);
        }
        if (runsData.length > 0) {
          const firstRun = runsData[0].id;
          setSelectedRunId(firstRun);
          loadRunBenchmark(firstRun);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRunSelect = (runId: string) => {
    setSelectedRunId(runId);
    loadRunBenchmark(runId);
  };

  const handleExecuteBenchmark = async () => {
    setRunningBenchmark(true);
    try {
      const res = await runBenchmarkSuite('http://127.0.0.1:5001');
      setBenchmarkReport(res);
      // Refresh runs
      const updatedRuns = await fetchRuns();
      setRuns(updatedRuns);
      if (res?.run_id) {
        setSelectedRunId(res.run_id);
      }
    } catch (e: any) {
      alert(e?.response?.data?.detail || e.message || 'Error executing benchmark suite');
    } finally {
      setRunningBenchmark(false);
    }
  };

  const handleToggleDefect = async (defectId?: string) => {
    setTogglingDefect(true);
    try {
      const payload = defectId ? { defect_id: defectId } : {};
      const res = await toggleSampleAppDefects(payload);
      if (res?.defects) {
        setDefectsState(res.defects);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingDefect(false);
    }
  };

  const allDefectsEnabled = Object.values(defectsState).every(Boolean);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Benchmark Header */}
      <div className="bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#0f766e] text-white rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-900/80 text-emerald-200 border border-emerald-700/60 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-300" />
              Innovation 3 &bull; Ground-Truth Engine
            </span>
            <span className="bg-emerald-800/80 text-emerald-100 text-xs px-2.5 py-0.5 rounded-full font-medium">
              5 Planted Defects
            </span>
          </div>

          <h2 className="text-2xl font-bold mt-2.5">Planted-Bug Benchmark & Quality Metrics Console</h2>
          <p className="text-emerald-100 text-xs mt-1.5 max-w-2xl leading-relaxed">
            Evaluates the autonomous agent against an isolated ground-truth registry of planted defects in the controlled DevStore sample app.
            Calculates empirical <strong>Defect Recall</strong>, <strong>Precision</strong>, <strong>Reproducibility Rate</strong>, and <strong>Journey Coverage</strong>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <button
            onClick={handleExecuteBenchmark}
            disabled={runningBenchmark}
            className="bg-white text-[#064e3b] font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-emerald-50 transition shadow flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <PlayCircle className={`w-4 h-4 text-[#064e3b] ${runningBenchmark ? 'animate-spin' : ''}`} />
            <span>{runningBenchmark ? 'Executing Benchmark Run...' : 'Run Benchmark Suite'}</span>
          </button>
        </div>
      </div>

      {/* Live Sample App Defect Mode Switcher (Judge Interactive Feature) */}
      <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[#0f172a] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#047857]" />
            Target Build Configuration (Planted Defects Controller)
          </h3>
          <p className="text-xs text-[#64748b] mt-0.5">
            Switch between <strong>Defective Build (5 Seeded Bugs)</strong> and <strong>Fixed Build (0 Bugs)</strong> to test regression memory and benchmark precision live.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleToggleDefect()}
            disabled={togglingDefect}
            className={`text-xs font-semibold px-3.5 py-2 rounded-lg border transition flex items-center gap-2 ${
              allDefectsEnabled
                ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
            }`}
          >
            {allDefectsEnabled ? (
              <ToggleRight className="w-4 h-4 text-amber-600" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-emerald-600" />
            )}
            <span>
              Build State: <strong>{allDefectsEnabled ? 'Defective (5 Bugs Active)' : 'Fixed (Defects Resolved)'}</strong>
            </span>
          </button>
        </div>
      </div>

      {/* KPI Benchmark Cards */}
      {benchmarkReport ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Defect Recall */}
          <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm relative overflow-hidden">
            <div className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Defect Recall</div>
            <div className="text-3xl font-extrabold text-[#065f46] mt-2">
              {benchmarkReport.metrics.defect_recall_percent}
            </div>
            <div className="text-xs text-[#64748b] mt-1.5 flex items-center justify-between">
              <span>True Positives: <strong>{benchmarkReport.metrics.true_positives} / {benchmarkReport.metrics.total_planted_defects}</strong></span>
              <span className="text-[11px] text-[#047857] font-semibold">TP / Planted</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-[#047857] h-full rounded-full transition-all duration-500"
                style={{ width: `${benchmarkReport.metrics.defect_recall * 100}%` }}
              />
            </div>
          </div>

          {/* Precision */}
          <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm relative overflow-hidden">
            <div className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Precision</div>
            <div className="text-3xl font-extrabold text-[#0284c7] mt-2">
              {benchmarkReport.metrics.precision_percent}
            </div>
            <div className="text-xs text-[#64748b] mt-1.5 flex items-center justify-between">
              <span>Reported Findings: <strong>{benchmarkReport.metrics.total_findings_reported}</strong></span>
              <span className="text-[11px] text-[#0284c7] font-semibold">TP / (TP+FP)</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-[#0284c7] h-full rounded-full transition-all duration-500"
                style={{ width: `${benchmarkReport.metrics.precision * 100}%` }}
              />
            </div>
          </div>

          {/* Reproducibility Rate */}
          <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm relative overflow-hidden">
            <div className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Reproducibility Rate</div>
            <div className="text-3xl font-extrabold text-[#7c3aed] mt-2">
              {benchmarkReport.metrics.reproducibility_percent}
            </div>
            <div className="text-xs text-[#64748b] mt-1.5 flex items-center justify-between">
              <span>Independent Replays Verified</span>
              <span className="text-[11px] text-[#7c3aed] font-semibold">Evidence-backed</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-[#7c3aed] h-full rounded-full transition-all duration-500"
                style={{ width: `${benchmarkReport.metrics.reproducibility_rate * 100}%` }}
              />
            </div>
          </div>

          {/* Journey Coverage */}
          <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm relative overflow-hidden">
            <div className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Journey Coverage</div>
            <div className="text-3xl font-extrabold text-[#d97706] mt-2">
              {benchmarkReport.metrics.journey_coverage_percent}
            </div>
            <div className="text-xs text-[#64748b] mt-1.5 flex items-center justify-between">
              <span>Tested Benchmark Paths</span>
              <span className="text-[11px] text-[#d97706] font-semibold">{benchmarkReport.metrics.total_tests_executed} Tests</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-[#d97706] h-full rounded-full transition-all duration-500"
                style={{ width: `${benchmarkReport.metrics.journey_coverage * 100}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 text-center rounded-xl border border-[#e2e8f0] shadow-sm text-sm text-[#94a3b8]">
          Select an executed run or click "Run Benchmark Suite" to compute empirical metrics against the ground truth registry.
        </div>
      )}

      {/* Run Selector Filter */}
      <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs font-bold text-[#334155] uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#047857]" />
          Evaluating Benchmark Execution Run:
        </div>
        <select
          value={selectedRunId}
          onChange={e => handleRunSelect(e.target.value)}
          className="text-xs border border-[#cbd5e1] rounded-lg px-3 py-1.5 bg-white font-mono text-[#0f172a] focus:outline-none focus:border-[#047857]"
        >
          {runs.map(r => (
            <option key={r.id} value={r.id}>
              {r.id} &bull; {r.target_url} &bull; {r.status.toUpperCase()} ({r.findings_count} findings, {r.duration_sec.toFixed(1)}s)
            </option>
          ))}
        </select>
      </div>

      {/* Ground-Truth Defect Matrix */}
      {benchmarkReport && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0f172a] flex items-center gap-2">
                <Target className="w-4 h-4 text-[#dc2626]" />
                Planted-Bug Ground Truth Evaluation Matrix
              </h3>
              <p className="text-xs text-[#64748b] mt-0.5">
                Exact verification comparison of each documented defect in the registry versus findings produced by the autonomous QA agent.
              </p>
            </div>
            <div className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
              {benchmarkReport.defect_matrix.filter(d => d.status === 'Detected').length} / {benchmarkReport.defect_matrix.length} Detected
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] text-[#64748b] uppercase tracking-wider border-b border-[#e2e8f0]">
                <tr>
                  <th className="px-5 py-3">Defect ID</th>
                  <th className="px-5 py-3">Defect Description</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Criticality</th>
                  <th className="px-5 py-3">Detection Outcome</th>
                  <th className="px-5 py-3">Verification Status</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {benchmarkReport.defect_matrix.map(d => {
                  const isDetected = d.status === 'Detected';
                  return (
                    <tr key={d.defect_id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-[#0f172a]">
                        {d.defect_id}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-[#0f172a]">{d.title}</div>
                      </td>
                      <td className="px-5 py-4 text-[#64748b]">
                        {d.category}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            d.criticality === 'Critical'
                              ? 'bg-rose-100 text-rose-800'
                              : d.criticality === 'High'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {d.criticality}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit ${
                            isDetected
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {isDetected ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          <span>{d.status}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {isDetected ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {d.verification_status}
                            </span>
                            <div className="text-[10px] text-[#64748b] mt-1">
                              Replays: {d.replays} &bull; Conf: {(d.confidence * 100).toFixed(0)}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#94a3b8]">&mdash;</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {d.finding_id ? (
                          <NavLink
                            to={`/bugs/${d.finding_id}`}
                            className="text-[#047857] hover:underline font-semibold flex items-center gap-1"
                          >
                            <span>Inspect Proof</span>
                            <ArrowRight className="w-3 h-3" />
                          </NavLink>
                        ) : (
                          <span className="text-[#94a3b8]">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Benchmark User Journeys Checklist */}
      {benchmarkReport && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6">
          <h3 className="text-sm font-bold text-[#0f172a] mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#047857]" />
            Defined Benchmark User Journeys
          </h3>
          <p className="text-xs text-[#64748b] mb-4">
            Measures which critical user paths and transactional routes were thoroughly exercised during exploration and test execution.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {benchmarkReport.benchmark_journeys.map(j => (
              <div
                key={j.journey_id}
                className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
                  j.covered
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {j.covered ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold">{j.name}</div>
                    <div className="text-[11px] font-mono text-[#64748b]">{j.path}</div>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${j.covered ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-700'}`}>
                  {j.covered ? 'Covered' : 'Unvisited'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
