import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ListChecks,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Save,
  Sparkles,
  StopCircle
} from 'lucide-react';
import {
  fetchRuns,
  fetchRunTests,
  cancelRun,
  saveRegressionTest,
  createRunEventSource,
  RunSummary,
  TestCaseExecution
} from '../api/client';

export const TestRuns: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>(searchParams.get('selected') || '');
  const [tests, setTests] = useState<TestCaseExecution[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestCaseExecution | null>(null);
  const [savingRegression, setSavingRegression] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [activeScreenshotModal, setActiveScreenshotModal] = useState<string | null>(null);

  // Load runs list
  useEffect(() => {
    fetchRuns().then(data => {
      setRuns(data);
      if (!selectedRunId && data.length > 0) {
        setSelectedRunId(data[0].id);
      }
    });
  }, []);

  // Real-time tests loader with SSE subscription and polling fallback
  useEffect(() => {
    if (!selectedRunId) return;

    let isMounted = true;
    const loadTests = () => {
      fetchRunTests(selectedRunId)
        .then(data => {
          if (!isMounted) return;
          setTests(data);
          if (data.length > 0 && !selectedTest) {
            setSelectedTest(data[0]);
          } else if (selectedTest) {
            // refresh currently open test
            const updated = data.find(t => t.id === selectedTest.id);
            if (updated) setSelectedTest(updated);
          }
        })
        .catch(console.error);
    };

    // Initial load
    loadTests();

    // Subscribe to real-time events for instant update
    const unsubscribeSSE = createRunEventSource(
      selectedRunId,
      (_event) => {
        if (isMounted) loadTests();
      },
      (_status) => {
        if (isMounted) loadTests();
      }
    );

    // Light fallback interval
    const interval = setInterval(loadTests, 3000);

    return () => {
      isMounted = false;
      unsubscribeSSE();
      clearInterval(interval);
    };
  }, [selectedRunId]);

  const handleSelectRun = (id: string) => {
    setSelectedRunId(id);
    setSearchParams({ selected: id });
    setSelectedTest(null);
  };

  const handleCancelRun = async () => {
    if (!selectedRunId) return;
    setCancelling(true);
    try {
      await cancelRun(selectedRunId);
      // refresh runs
      const updated = await fetchRuns();
      setRuns(updated);
    } catch (e: any) {
      alert(e.message || 'Error cancelling run');
    } finally {
      setCancelling(false);
    }
  };

  const handleSaveRegression = async (testCaseId: string) => {
    setSavingRegression(true);
    try {
      const res = await saveRegressionTest(testCaseId, selectedRunId);
      alert(res.message);
    } catch (e: any) {
      alert(e?.response?.data?.detail || e.message || 'Failed to save regression test.');
    } finally {
      setSavingRegression(false);
    }
  };

  const selectedRun = runs.find(r => r.id === selectedRunId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Controller Bar */}
      <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0f172a] flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-[#047857]" />
            Test Execution Console & Plan Inspector
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            Inspect individual candidate journeys, assertion outcomes, curiosity scoring, and DOM logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="run-switcher-select" className="text-xs font-semibold text-[#64748b]">Active Run:</label>
          <select
            id="run-switcher-select"
            value={selectedRunId}
            onChange={e => handleSelectRun(e.target.value)}
            className="text-xs font-mono border border-[#cbd5e1] rounded-lg px-3 py-1.5 bg-white text-[#0f172a]"
          >
            {runs.map(r => (
              <option key={r.id} value={r.id}>
                {r.id} ({r.status}) — {r.target_url}
              </option>
            ))}
          </select>

          {selectedRun && ['initializing', 'exploring', 'planning', 'executing', 'verifying'].includes(selectedRun.status) && (
            <button
              onClick={handleCancelRun}
              disabled={cancelling}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center gap-1.5"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>Cancel Run</span>
            </button>
          )}
        </div>
      </div>

      {/* Execution Stages Status Pill */}
      {selectedRun && (
        <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-sm flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-[#064e3b]">Stage:</span>
            <div className="flex items-center gap-2">
              {['initializing', 'exploring', 'planning', 'executing', 'verifying', 'reporting', 'completed'].map((stage, idx) => {
                const isCurrent = selectedRun.status === stage;
                return (
                  <span
                    key={stage}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isCurrent
                        ? 'bg-[#047857] text-white'
                        : 'bg-[#f1f5f9] text-[#94a3b8]'
                    }`}
                  >
                    {idx + 1}. {stage}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="font-mono text-[#64748b]">
            Tests: <span className="font-bold text-[#0f172a]">{tests.length}</span> | Passed: <span className="text-emerald-700 font-bold">{selectedRun.passed_count}</span> | Failed: <span className="text-rose-700 font-bold">{selectedRun.failed_count}</span>
          </div>
        </div>
      )}

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tests Table (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between shrink-0 bg-[#f8fafc]">
            <h3 className="font-semibold text-sm text-[#0f172a]">Planned & Executed Tests</h3>
            <span className="text-xs text-[#64748b]">{tests.length} Total</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#e2e8f0]">
            {tests.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#94a3b8]">
                No tests loaded for this run yet.
              </div>
            ) : (
              tests.map(test => {
                const isSelected = selectedTest?.id === test.id;
                const isPassed = test.status === 'Passed';
                const isFailed = test.status === 'Failed';
                const isBlocked = test.status === 'Blocked';

                return (
                  <button
                    key={test.id}
                    type="button"
                    onClick={() => setSelectedTest(test)}
                    className={`w-full p-4 text-left transition-colors flex items-start justify-between ${
                      isSelected ? 'bg-[#ecfdf5] border-l-4 border-l-[#047857]' : 'hover:bg-[#f8fafc]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : isFailed ? (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : isBlocked ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold text-xs text-[#0f172a] line-clamp-1">{test.title}</div>
                        <div className="text-[11px] text-[#64748b] mt-0.5 flex items-center gap-2">
                          <span className="font-mono">{test.id}</span>
                          <span>&bull;</span>
                          <span>{test.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          isPassed
                            ? 'bg-emerald-100 text-emerald-800'
                            : isFailed
                            ? 'bg-rose-100 text-rose-800'
                            : isBlocked
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {test.status}
                      </span>
                      <div className="text-[10px] text-[#64748b] mt-1 font-mono">
                        Score: {test.priority_score.toFixed(2)}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Test Inspection Details (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col h-[700px] overflow-hidden">
          {selectedTest ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Detail Header */}
              <div className="p-5 border-b border-[#e2e8f0] shrink-0 bg-[#f8fafc] flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-[#e2e8f0] text-[#0f172a]">
                      {selectedTest.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        selectedTest.status === 'Passed'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : selectedTest.status === 'Failed'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {selectedTest.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-[#0f172a] mt-1">{selectedTest.title}</h3>
                </div>

                {selectedTest.status === 'Passed' && (
                  <button
                    onClick={() => handleSaveRegression(selectedTest.id)}
                    disabled={savingRegression}
                    className="text-xs font-semibold text-[#047857] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save as Regression Test</span>
                  </button>
                )}
              </div>

              {/* Scrollable Test Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-[#334155]">
                {/* Curiosity Engine Breakdown */}
                {selectedTest.curiosity_breakdown && (
                  <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl p-4">
                    <div className="font-bold text-xs text-[#065f46] flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#047857]" />
                      Curiosity Engine Prioritization Rationale
                    </div>
                    <p className="text-xs text-[#064e3b] italic">
                      "{selectedTest.curiosity_breakdown.reasoning}"
                    </p>
                    <div className="grid grid-cols-4 gap-2 mt-3 text-[11px] font-mono text-center">
                      <div className="bg-white p-2 rounded border border-[#a7f3d0]">
                        <span className="text-[#64748b] block text-[10px]">Impact</span>
                        <strong className="text-[#065f46]">{selectedTest.curiosity_breakdown.impact}</strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-[#a7f3d0]">
                        <span className="text-[#64748b] block text-[10px]">Uncertainty</span>
                        <strong className="text-[#065f46]">{selectedTest.curiosity_breakdown.uncertainty}</strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-[#a7f3d0]">
                        <span className="text-[#64748b] block text-[10px]">Novelty</span>
                        <strong className="text-[#065f46]">{selectedTest.curiosity_breakdown.novelty}</strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-[#a7f3d0]">
                        <span className="text-[#64748b] block text-[10px]">Coverage Gap</span>
                        <strong className="text-[#065f46]">{selectedTest.curiosity_breakdown.coverage_gap}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preconditions */}
                {selectedTest.preconditions && (
                  <div>
                    <h4 className="font-bold text-[#64748b] uppercase tracking-wider text-[10px] mb-1">Preconditions</h4>
                    <p className="bg-[#f8fafc] p-2.5 rounded border border-[#e2e8f0]">{selectedTest.preconditions}</p>
                  </div>
                )}

                {/* Numbered Steps */}
                <div>
                  <h4 className="font-bold text-[#64748b] uppercase tracking-wider text-[10px] mb-1.5">Executed Actions & Steps</h4>
                  <ol className="list-decimal pl-5 space-y-1 bg-[#f8fafc] p-3 rounded border border-[#e2e8f0] font-mono">
                    {selectedTest.steps.map((s, idx) => (
                      <li key={idx} className="text-[#1e293b]">
                        <strong className="text-[#047857]">{s.action.toUpperCase()}</strong>: {s.description}
                        {s.selector && <span className="text-[#64748b]"> (target: <code>{s.selector}</code>)</span>}
                        {s.value && <span className="text-[#0284c7]"> [value: "{s.value}"]</span>}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Deterministic Assertions */}
                <div>
                  <h4 className="font-bold text-[#64748b] uppercase tracking-wider text-[10px] mb-1.5">Deterministic Assertions</h4>
                  <div className="space-y-1.5">
                    {selectedTest.assertion_results?.length > 0 ? (
                      selectedTest.assertion_results.map((a, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded border flex items-start gap-2 ${
                            a.passed
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : 'bg-rose-50 border-rose-200 text-rose-900'
                          }`}
                        >
                          {a.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="font-semibold">{a.message}</div>
                            <div className="font-mono text-[11px] opacity-80 mt-0.5">{a.actual}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 italic">No assertions recorded yet.</div>
                    )}
                  </div>
                </div>

                {/* Screenshot Evidence */}
                {selectedTest.screenshot_urls?.length > 0 && (
                  <div>
                    <h4 className="font-bold text-[#64748b] uppercase tracking-wider text-[10px] mb-1.5">Evidence Screenshots</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedTest.screenshot_urls.map((url, idx) => (
                        <div
                          key={idx}
                          onClick={() => setActiveScreenshotModal(url)}
                          className="border border-[#e2e8f0] rounded-lg overflow-hidden cursor-pointer hover:border-[#047857] transition group"
                        >
                          <img src={url} alt="Test evidence" className="w-full h-32 object-cover object-top" />
                          <div className="p-1.5 bg-[#f8fafc] text-[10px] text-center text-[#64748b] group-hover:text-[#047857] font-semibold">
                            Click to Enlarge
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Execution Logs */}
                {selectedTest.actual_observations && (
                  <div>
                    <h4 className="font-bold text-[#64748b] uppercase tracking-wider text-[10px] mb-1">Execution Observations & DOM Logs</h4>
                    <pre className="bg-[#0f172a] text-emerald-400 p-3 rounded-lg font-mono text-[11px] whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {selectedTest.actual_observations}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-[#94a3b8] flex flex-col items-center justify-center h-full">
              <ListChecks className="w-10 h-10 text-slate-300 mb-2" />
              Select a test from the left panel to inspect execution details, assertions, and captured screenshots.
            </div>
          )}
        </div>
      </div>

      {/* Screenshot Enlarge Modal */}
      {activeScreenshotModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setActiveScreenshotModal(null)}
        >
          <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-hidden p-2 shadow-2xl">
            <img src={activeScreenshotModal} alt="Enlarged screenshot" className="max-w-full max-h-[80vh] object-contain mx-auto" />
            <div className="p-2 text-center text-xs text-[#64748b]">Click anywhere to dismiss</div>
          </div>
        </div>
      )}
    </div>
  );
};
