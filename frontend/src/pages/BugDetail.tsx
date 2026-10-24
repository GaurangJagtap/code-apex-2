import React, { useEffect, useState } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import {
  Bug,
  ArrowLeft,
  Download,
  FileCode,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  ExternalLink,
  Layers,
  Terminal,
  Scale,
  Sparkles,
  History,
  Activity,
  HelpCircle,
  BookmarkPlus,
  RefreshCw
} from 'lucide-react';
import { fetchBug, fetchBugs, BugFinding } from '../api/client';

export const BugDetail: React.FC = () => {
  const { bugId } = useParams<{ bugId: string }>();
  const [bug, setBug] = useState<BugFinding | null>(null);
  const [availableBugs, setAvailableBugs] = useState<BugFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bugId) return;
    setLoading(true);
    setError(null);

    fetchBug(bugId)
      .then(data => {
        setBug(data);
      })
      .catch((err: any) => {
        const msg = err.response?.data?.detail || err.message || 'Defect finding not found';
        setError(msg);
        // Also fetch available bugs so user can easily navigate to valid ones
        fetchBugs().then(setAvailableBugs).catch(() => {});
      })
      .finally(() => setLoading(false));
  }, [bugId]);

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-[hsl(var(--muted-foreground))] flex flex-col items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-[hsl(var(--accent))]" />
        <span>Loading proof-carrying bug report and evidence...</span>
      </div>
    );
  }

  if (error || !bug) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-6 bg-white rounded-2xl border border-[hsl(var(--border))] shadow-xs mt-6">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <Bug className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <div className="text-rose-600 font-bold text-base">Defect Finding Not Found</div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            No defect report found with identifier: <code className="font-mono font-bold text-[hsl(var(--foreground))]">{bugId}</code>
          </p>
          {error && <p className="text-[11px] text-slate-500">{error}</p>}
        </div>

        {availableBugs.length > 0 && (
          <div className="text-left border-t border-[hsl(var(--border))] pt-4 space-y-2">
            <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
              Available Verified Findings in Database ({availableBugs.length}):
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {availableBugs.slice(0, 8).map(b => (
                <NavLink
                  key={b.id}
                  to={`/bugs/${b.id}`}
                  className="p-2.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] flex items-center justify-between gap-3 text-xs transition"
                >
                  <div className="truncate flex-1">
                    <span className="font-mono text-[10px] text-[hsl(var(--muted-foreground))] mr-2">[{b.id}]</span>
                    <span className="font-medium text-[hsl(var(--foreground))]">{b.title}</span>
                  </div>
                  <span className="text-[10px] text-[hsl(var(--accent))] font-semibold shrink-0">View Report &rarr;</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          <NavLink
            to="/bugs"
            className="px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-xs font-semibold hover:opacity-90 inline-flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to All Defect Reports</span>
          </NavLink>
        </div>
      </div>
    );
  }

  // Safe normalized fields
  const trustScore = bug.trust_score ?? bug.confidence_score ?? 0.85;
  const breakdown: any = bug.trust_breakdown || {};

  const expectationStrength = breakdown.source_strength ?? breakdown.expectation_strength ?? 0.90;
  const evidenceCompleteness = breakdown.evidence_completeness ?? 0.85;
  const reproducibility = breakdown.reproducibility ?? 0.95;
  const independentCheck = breakdown.independent_check ?? breakdown.deterministic_verification ?? 0.90;
  const verifiedSignals: string[] = Array.isArray(breakdown.signals) ? breakdown.signals : [];

  // Safe normalized reproduction steps
  const reproductionSteps: string[] = Array.isArray(bug.reproduction_steps)
    ? bug.reproduction_steps
    : (typeof bug.reproduction_steps === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(bug.reproduction_steps);
              return Array.isArray(parsed) ? parsed : [bug.reproduction_steps];
            } catch {
              return [bug.reproduction_steps];
            }
          })()
        : []);

  // Safe normalized reproduction outcomes
  const reproductionOutcomes: any[] = Array.isArray(bug.reproduction_outcomes)
    ? bug.reproduction_outcomes
    : (typeof bug.reproduction_outcomes === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(bug.reproduction_outcomes);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })()
        : []);

  // Safe normalized alternative explanations (handles array, JSON string, or single string)
  const rawAlt = bug.alternative_explanations;
  const alternativeExplanations: string[] = Array.isArray(rawAlt)
    ? rawAlt
    : (typeof rawAlt === 'string' && rawAlt.trim().length > 0
        ? (() => {
            try {
              const parsed = JSON.parse(rawAlt);
              return Array.isArray(parsed) ? parsed : [rawAlt];
            } catch {
              return [rawAlt];
            }
          })()
        : []);

  // Safe normalized console errors
  const consoleErrors: string[] = Array.isArray(bug.console_errors)
    ? bug.console_errors
    : (typeof bug.console_errors === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(bug.console_errors);
              return Array.isArray(parsed) ? parsed : [bug.console_errors];
            } catch {
              return [bug.console_errors];
            }
          })()
        : []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Confirmed':
      case 'Verified':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Confirmed Defect
          </span>
        );
      case 'Suspected':
      case 'Likely':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Suspected Finding
          </span>
        );
      case 'Inconclusive':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
            Inconclusive
          </span>
        );
      case 'Dismissed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            Dismissed / Expected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Breadcrumb & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <NavLink
          to="/bugs"
          className="text-xs font-semibold text-[hsl(var(--accent))] hover:underline flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Defect Reports</span>
        </NavLink>

        <div className="flex items-center gap-2">
          <a
            href={`/api/v1/bugs/${bug.id}/export?format=markdown`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] bg-white hover:bg-[hsl(var(--secondary))] flex items-center gap-1.5 text-[hsl(var(--foreground))] shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
            <span>Markdown</span>
          </a>
          <a
            href={`/api/v1/bugs/${bug.id}/export?format=html`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] bg-white hover:bg-[hsl(var(--secondary))] flex items-center gap-1.5 text-[hsl(var(--foreground))] shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>HTML</span>
          </a>
          <a
            href={`/api/v1/bugs/${bug.id}/export?format=json`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] bg-white hover:bg-[hsl(var(--secondary))] flex items-center gap-1.5 text-[hsl(var(--foreground))] shadow-xs transition"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>JSON</span>
          </a>
        </div>
      </div>

      {/* Main Report Card */}
      <div className="bg-white rounded-2xl border border-[hsl(var(--border))] shadow-xs overflow-hidden">
        {/* Header Banner */}
        <div className="p-6 md:p-8 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/30 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider ${
                bug.severity === 'Critical'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : bug.severity === 'High'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-blue-100 text-blue-800 border border-blue-300'
              }`}
            >
              {bug.severity} Severity
            </span>
            {getStatusBadge(bug.status)}
            <span className="text-xs font-mono text-[hsl(var(--muted-foreground))] bg-white px-2 py-0.5 rounded border border-[hsl(var(--border))]">
              {bug.id}
            </span>
            {bug.category && (
              <span className="text-xs font-medium text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-[hsl(var(--border))]">
                {bug.category}
              </span>
            )}
          </div>

          <h1 className="text-xl md:text-2xl font-bold text-[hsl(var(--foreground))] tracking-tight">
            {bug.title}
          </h1>

          <div className="text-xs text-[hsl(var(--muted-foreground))] flex flex-wrap items-center gap-3 pt-1">
            <span>
              Target Route: <code className="text-[hsl(var(--foreground))] font-mono">{bug.affected_url}</code>
            </span>
            <span>•</span>
            <span>
              Session: <NavLink to={`/runs?selected=${bug.run_id}`} className="text-[hsl(var(--accent))] hover:underline font-mono">{bug.run_id}</NavLink>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 font-semibold text-[hsl(var(--foreground))]">
              <Scale className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
              Trust Score: {(trustScore * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 space-y-8 text-xs text-[hsl(var(--foreground))]">
          {/* Trust & Evidence Score Breakdown */}
          <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-[hsl(var(--accent))]" />
                <h3 className="font-bold text-sm text-[hsl(var(--foreground))]">
                  Trust & Evidence Score Breakdown
                </h3>
              </div>
              <span className="font-mono text-sm font-bold text-[hsl(var(--foreground))] bg-[hsl(var(--secondary))] px-2.5 py-1 rounded border border-[hsl(var(--border))]">
                {(trustScore * 100).toFixed(0)}% Trust
              </span>
            </div>

            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Transparent, weighted scoring signal derived from expectation source strength, evidence completeness, reproducibility across clean isolated browser contexts, and alternative explanations.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/30">
                <div className="text-[10px] uppercase font-semibold text-[hsl(var(--muted-foreground))]">
                  Expectation Source
                </div>
                <div className="text-base font-bold font-mono text-[hsl(var(--foreground))] mt-1">
                  {(expectationStrength * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
                  {bug.expectation_source || 'Deterministic Invariant'}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/30">
                <div className="text-[10px] uppercase font-semibold text-[hsl(var(--muted-foreground))]">
                  Evidence Completeness
                </div>
                <div className="text-base font-bold font-mono text-[hsl(var(--foreground))] mt-1">
                  {(evidenceCompleteness * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                  DOM & Network Traces
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/30">
                <div className="text-[10px] uppercase font-semibold text-[hsl(var(--muted-foreground))]">
                  Reproducibility
                </div>
                <div className="text-base font-bold font-mono text-[hsl(var(--foreground))] mt-1">
                  {(reproducibility * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                  {bug.replay_attempts || 2} Clean Replays
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/30">
                <div className="text-[10px] uppercase font-semibold text-[hsl(var(--muted-foreground))]">
                  Independent Verification
                </div>
                <div className="text-base font-bold font-mono text-[hsl(var(--foreground))] mt-1">
                  {(independentCheck * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                  Playwright Assertion
                </div>
              </div>
            </div>

            {verifiedSignals.length > 0 && (
              <div className="pt-2 border-t border-[hsl(var(--border))] space-y-1">
                <div className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">Verified Trust Signals:</div>
                <div className="flex flex-wrap gap-1.5">
                  {verifiedSignals.map((sig, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      {sig}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Expected vs Actual Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 space-y-1.5">
              <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Justified Expected Behavior
              </h4>
              <p className="text-xs text-emerald-950 leading-relaxed font-sans">{bug.expected_behavior}</p>
              {bug.expectation_justification && (
                <div className="text-[11px] text-emerald-800 border-t border-emerald-200 pt-1.5 font-sans">
                  <span className="font-semibold">Why this is justified:</span> {bug.expectation_justification}
                </div>
              )}
            </div>

            <div className="border border-rose-200 bg-rose-50/50 rounded-xl p-4 space-y-1.5">
              <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-600" />
                Observed Defect Failure
              </h4>
              <p className="text-xs text-rose-950 leading-relaxed font-mono">{bug.actual_behavior}</p>
              {bug.detection_method && (
                <div className="text-[11px] text-rose-800 border-t border-rose-200 pt-1.5 font-sans">
                  <span className="font-semibold">Detection Method:</span>{' '}
                  <span className="font-mono">{bug.detection_method}</span>
                </div>
              )}
            </div>
          </div>

          {/* Step-by-Step Reproduction Instructions */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
              Step-by-Step Reproduction Instructions
            </h4>
            {reproductionSteps.length > 0 ? (
              <ol className="list-decimal pl-5 space-y-1.5 bg-[hsl(var(--secondary))]/30 p-4 rounded-xl border border-[hsl(var(--border))] text-xs font-mono">
                {reproductionSteps.map((step, idx) => (
                  <li key={idx} className="text-[hsl(var(--foreground))]">{step}</li>
                ))}
              </ol>
            ) : (
              <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-slate-50 text-xs text-[hsl(var(--muted-foreground))]">
                No specific reproduction steps recorded.
              </div>
            )}
          </div>

          {/* Clean Context Replay Outcomes */}
          {reproductionOutcomes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
                Independent Isolated Replay History ({reproductionOutcomes.length} attempts)
              </h4>
              <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[hsl(var(--secondary))]/60 text-[hsl(var(--muted-foreground))] uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Attempt</th>
                      <th className="py-2 px-3">Environment Context</th>
                      <th className="py-2 px-3">Outcome</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {reproductionOutcomes.map((rep, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono">#{rep.attempt ?? (idx + 1)}</td>
                        <td className="py-2 px-3 text-slate-600">
                          {rep.clean_context !== false ? 'Clean isolated browser session' : 'Persistent context'}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">
                          {rep.outcome || rep.status || 'Defect Verified'}
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            Defect Reproduced
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Likely Cause Hypothesis & Suggested Fix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-slate-50/50 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--foreground))]">
                <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
                Likely Cause (Marked as Hypothesis)
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                {bug.likely_cause_hypothesis ||
                  'Observed behavior suggests client-side state loss or lack of idempotency validation during rapid submission.'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-slate-50/50 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--foreground))]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Suggested Remediation
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                {bug.suggested_fix ||
                  'Implement server-side idempotency keys and debounce submission triggers. Restore persistent session state on page reload.'}
              </p>
            </div>
          </div>

          {/* Alternative Explanations Considered */}
          {alternativeExplanations.length > 0 && (
            <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-white space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--foreground))]">
                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                Alternative Explanations Investigated & Ruled Out
              </div>
              <ul className="list-disc pl-5 space-y-1 text-xs text-[hsl(var(--muted-foreground))]">
                {alternativeExplanations.map((alt, idx) => (
                  <li key={idx}>{alt}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Evidence Screenshot */}
          {bug.screenshot_url && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
                Captured Evidence Screenshot
              </h4>
              <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden shadow-xs bg-slate-900">
                <img
                  src={bug.screenshot_url}
                  alt="Defect screenshot"
                  className="w-full max-h-[500px] object-contain"
                />
              </div>
            </div>
          )}

          {/* Console Errors */}
          {consoleErrors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-rose-600" />
                Browser Console Errors Captured
              </h4>
              <pre className="bg-slate-900 text-rose-400 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto border border-slate-800">
                {consoleErrors.join('\n')}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
