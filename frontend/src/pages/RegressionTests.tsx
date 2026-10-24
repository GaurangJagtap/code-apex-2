import React, { useEffect, useState } from 'react';
import {
  History,
  Play,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Award,
  RefreshCw
} from 'lucide-react';
import {
  fetchRegressionTests,
  rerunRegressionTest,
  rerunAllRegressionTests,
  approveRegressionTest,
  RegressionTest,
  RegressionRunResult,
  RegressionSuiteResult
} from '../api/client';

export const RegressionTests: React.FC = () => {
  const [tests, setTests] = useState<RegressionTest[]>([]);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runningSuite, setRunningSuite] = useState(false);
  const [lastResult, setLastResult] = useState<RegressionRunResult | null>(null);
  const [suiteResult, setSuiteResult] = useState<RegressionSuiteResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    fetchRegressionTests()
      .then(setTests)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunTest = async (testId: string) => {
    setRunningId(testId);
    setLastResult(null);
    try {
      const res = await rerunRegressionTest(testId);
      setLastResult(res);
      const updated = await fetchRegressionTests();
      setTests(updated);
    } catch (e: any) {
      alert(e?.response?.data?.detail || e.message || 'Error executing regression test.');
    } finally {
      setRunningId(null);
    }
  };

  const handleRunAll = async () => {
    setRunningSuite(true);
    setSuiteResult(null);
    setLastResult(null);
    try {
      const res = await rerunAllRegressionTests();
      setSuiteResult(res);
      const updated = await fetchRegressionTests();
      setTests(updated);
    } catch (e: any) {
      alert(e?.response?.data?.detail || e.message || 'Error executing regression suite.');
    } finally {
      setRunningSuite(false);
    }
  };

  const handleApprove = async (testId: string) => {
    try {
      await approveRegressionTest(testId);
      setActionNotice('Test promoted and approved as verified regression benchmark.');
      setTimeout(() => setActionNotice(null), 4000);
      loadData();
    } catch (e: any) {
      alert(e?.response?.data?.detail || e.message || 'Error approving test.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-wider text-[hsl(var(--accent))] uppercase flex items-center gap-1">
              <History className="w-3.5 h-3.5" /> Reusable Regression Suites
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Automated Regression Memory
          </h1>
          <p className="text-xs md:text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            Verified exploratory journeys and bug reproduction steps promoted to persistent regression suites with diff tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] font-mono">
            {tests.length} Saved Regression Test(s)
          </div>
          {tests.length > 0 && (
            <button
              onClick={handleRunAll}
              disabled={runningSuite || runningId !== null}
              className="text-xs font-medium bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${runningSuite ? 'animate-spin' : ''}`} />
              <span>{runningSuite ? 'Running Full Suite...' : 'Run Entire Suite'}</span>
            </button>
          )}
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Regression Suite Batch Result Banner */}
      {suiteResult && (
        <div className="bg-white rounded-xl border border-[hsl(var(--border))] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm text-[hsl(var(--foreground))]">
                Regression Suite Execution Summary
              </h3>
            </div>
            <button
              onClick={() => setSuiteResult(null)}
              className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] underline"
            >
              Close Summary
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-[hsl(var(--secondary))]/40 p-3 rounded-lg border border-[hsl(var(--border))]">
              <div className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium">Total Tests</div>
              <div className="text-lg font-bold font-mono text-[hsl(var(--foreground))]">{suiteResult.total_executed}</div>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
              <div className="text-[11px] text-emerald-700 font-medium">Passed</div>
              <div className="text-lg font-bold font-mono text-emerald-800">{suiteResult.passed}</div>
            </div>
            <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
              <div className="text-[11px] text-rose-700 font-medium">Failed</div>
              <div className="text-lg font-bold font-mono text-rose-800">{suiteResult.failed}</div>
            </div>
            <div className={`p-3 rounded-lg border ${suiteResult.regressions_detected > 0 ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
              <div className="text-[11px] font-medium text-amber-800">Regressions</div>
              <div className="text-lg font-bold font-mono text-amber-900">{suiteResult.regressions_detected}</div>
            </div>
            <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
              <div className="text-[11px] text-teal-700 font-medium">Fixes Verified</div>
              <div className="text-lg font-bold font-mono text-teal-800">{suiteResult.fixes_detected}</div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[hsl(var(--border))]">
            <div className="text-xs font-semibold text-[hsl(var(--foreground))]">Journey Diffs:</div>
            {suiteResult.details.map((r) => (
              <div
                key={r.test_id}
                className="flex items-center justify-between text-xs p-2 bg-[hsl(var(--secondary))]/20 rounded border border-[hsl(var(--border))]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[11px] text-[hsl(var(--foreground))]">{r.test_id}</span>
                  <span className="text-[hsl(var(--foreground))]">{r.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className={r.status === 'Passed' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                    {r.status}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-[hsl(var(--muted-foreground))]">{r.diff_summary}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regression Run Result Diff Banner */}
      {lastResult && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between text-xs transition-all ${
            lastResult.status === 'Passed'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          <div className="space-y-1">
            <div className="font-bold text-sm flex items-center gap-2">
              {lastResult.status === 'Passed' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600" />
              )}
              Regression Execution Outcome: {lastResult.status.toUpperCase()}
            </div>
            <div className="font-mono text-xs">{lastResult.diff_summary}</div>
            <div className="text-[11px] opacity-80">
              Duration: {lastResult.duration_sec.toFixed(2)}s • Executed at: {lastResult.executed_at.substring(11, 19)}
            </div>
          </div>
          <button
            onClick={() => setLastResult(null)}
            className="text-xs underline opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Regression Tests List */}
      <div className="bg-white rounded-xl border border-[hsl(var(--border))] shadow-xs overflow-hidden">
        {tests.length === 0 ? (
          <div className="p-12 text-center text-xs text-[hsl(var(--muted-foreground))] space-y-2">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-1" />
            <p className="font-semibold text-sm text-[hsl(var(--foreground))]">No regression tests saved yet.</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Execute a test run in the Test Cases or Exploration console and click <strong>"Save as Regression Test"</strong> to populate your suite.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {tests.map(test => {
              const isRunning = runningId === test.id;
              const isPassed = test.last_status === 'Passed';
              const isFailed = test.last_status === 'Failed';

              return (
                <div key={test.id} className="p-5 hover:bg-[hsl(var(--secondary))]/20 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-[hsl(var(--foreground))]">
                        {test.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPassed
                            ? 'bg-emerald-100 text-emerald-800'
                            : isFailed
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {test.last_status}
                      </span>
                      {test.is_approved ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          Approved
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Provisional
                        </span>
                      )}
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">Executions: <strong>{test.executions_count}</strong></span>
                    </div>

                    <h3 className="font-bold text-sm text-[hsl(var(--foreground))]">{test.name}</h3>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] flex flex-wrap items-center gap-3">
                      <span>Target: <code className="text-[hsl(var(--foreground))] font-mono">{test.target_url}</code></span>
                      <span>•</span>
                      <span>Steps: {test.steps_count}</span>
                      <span>•</span>
                      <span>Assertions: {test.assertions_count}</span>
                      {test.last_run_at && (
                        <>
                          <span>•</span>
                          <span>Last run: {test.last_run_at.substring(0, 10)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!test.is_approved && (
                      <button
                        onClick={() => handleApprove(test.id)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-emerald-700 transition"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => handleRunTest(test.id)}
                      disabled={isRunning}
                      className="text-xs font-medium bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
                    >
                      <Play className={`w-3.5 h-3.5 text-[hsl(var(--accent))] ${isRunning ? 'animate-spin' : ''}`} />
                      <span>{isRunning ? 'Re-executing...' : 'Rerun Journey'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

