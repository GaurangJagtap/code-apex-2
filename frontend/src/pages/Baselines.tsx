import React, { useEffect, useState } from 'react';
import {
  Scale,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Search,
  RefreshCw,
  SlidersHorizontal,
  Info,
  ChevronRight,
  Database,
  ArrowRight
} from 'lucide-react';
import {
  fetchBaselines,
  createBaseline,
  approveBaseline,
  BehavioralBaseline,
  BaselineCreatePayload
} from '../api/client';

export const Baselines: React.FC = () => {
  const [baselines, setBaselines] = useState<BehavioralBaseline[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDomain, setNewDomain] = useState('assessment');
  const [newCategory, setNewCategory] = useState('Transaction and workflow integrity');
  const [newRuleType, setNewRuleType] = useState('invariant');
  const [newExpectedBehavior, setNewExpectedBehavior] = useState('');
  const [newInvariantRule, setNewInvariantRule] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadBaselines = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (domainFilter !== 'all') params.domain = domainFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      const data = await fetchBaselines(params);
      const normalized: BehavioralBaseline[] = (Array.isArray(data) ? data : []).map((raw: any) => ({
        id: raw.id || '',
        title: raw.title || raw.name || 'Behavioral Invariant Rule',
        domain: raw.domain || raw.target_domain || 'general',
        category: raw.category || 'General Invariant',
        rule_type: raw.rule_type || raw.rule_definition?.rule_type || raw.source_type || 'invariant',
        version: raw.version || 'v1.0',
        source: raw.source || raw.source_type || 'deterministic_invariant',
        expected_behavior: raw.expected_behavior || (typeof raw.expected_state === 'object' ? JSON.stringify(raw.expected_state) : raw.expected_state) || 'Expected deterministic state contract.',
        invariant_rule: raw.invariant_rule || raw.rule_definition?.rule || undefined,
        is_approved: Boolean(raw.is_approved),
        created_at: raw.created_at || new Date().toISOString()
      }));
      setBaselines(normalized);
    } catch (err) {
      console.error('Failed to load baselines', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaselines();
  }, [domainFilter, categoryFilter]);

  const handleApprove = async (id: string) => {
    try {
      await approveBaseline(id);
      setActionNotice(`Baseline approved as trusted ground truth expectation.`);
      setTimeout(() => setActionNotice(null), 4000);
      loadBaselines();
    } catch (err) {
      console.error('Failed to approve baseline', err);
    }
  };

  const handleCreateBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newExpectedBehavior.trim()) return;

    setSubmitting(true);
    try {
      const payload: BaselineCreatePayload = {
        title: newTitle.trim(),
        domain: newDomain,
        category: newCategory,
        rule_type: newRuleType,
        expected_behavior: newExpectedBehavior.trim(),
        invariant_rule: newInvariantRule.trim() || undefined,
        source: 'user_requirement'
      };
      await createBaseline(payload);
      setShowCreateModal(false);
      setNewTitle('');
      setNewExpectedBehavior('');
      setNewInvariantRule('');
      setActionNotice('New behavioral rule created and saved to active registry.');
      setTimeout(() => setActionNotice(null), 4000);
      loadBaselines();
    } catch (err) {
      console.error('Failed to create baseline', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBaselines = baselines.filter(b => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.expected_behavior.toLowerCase().includes(q) ||
      b.domain.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-wider text-[hsl(var(--accent))] uppercase flex items-center gap-1">
              <Scale className="w-3.5 h-3.5" /> Behavioral Baselines & Expectations
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Ground Truth & Invariant Rules
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Distinguish trusted user requirements and deterministic invariants from provisional AI hypotheses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90 text-xs font-medium transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Define Behavioral Rule</span>
          </button>
          <button
            onClick={loadBaselines}
            className="p-1.5 rounded-lg border border-[hsl(var(--border))] bg-white hover:bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition"
            title="Refresh Baselines"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Philosophy banner */}
      <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-white shadow-xs flex items-start gap-3">
        <Info className="w-4 h-4 text-[hsl(var(--accent))] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-semibold text-[hsl(var(--foreground))]">
            Why Behavioral Baselines Matter (IM-02 Core Requirement):
          </span>
          <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
            LLMs must propose and explain tests, but <strong className="text-[hsl(var(--foreground))]">never rely on LLM opinion alone</strong> to establish pass/fail or prove a bug. Every test failure checks against a justified expectation: an explicit requirement, an arithmetic invariant (e.g., cart subtotal arithmetic), or an idempotency contract (e.g., duplicate order prevention).
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Search baseline rules, expected state..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-[hsl(var(--secondary))]/30"
          />
        </div>

        <div>
          <select
            value={domainFilter}
            onChange={e => setDomainFilter(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs bg-[hsl(var(--secondary))]/30 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
          >
            <option value="all">All Domains (Assessment, E-Commerce, General)</option>
            <option value="assessment">Assessment Platform</option>
            <option value="ecommerce">E-Commerce (DevStore)</option>
            <option value="universal">Universal Web Applications</option>
          </select>
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs bg-[hsl(var(--secondary))]/30 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
          >
            <option value="all">All 10 Bug Categories</option>
            <option value="Functional behavior and navigation">Functional behavior and navigation</option>
            <option value="Form validation and input boundaries">Form validation and input boundaries</option>
            <option value="Business logic and calculations">Business logic and calculations</option>
            <option value="Transaction and workflow integrity">Transaction and workflow integrity</option>
            <option value="Data persistence and state consistency">Data persistence and state consistency</option>
            <option value="Authentication and authorization">Authentication and authorization</option>
            <option value="Session, recovery, and interrupted workflows">Session, recovery, and interrupted workflows</option>
          </select>
        </div>
      </div>

      {/* Baselines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 p-12 text-center text-xs text-[hsl(var(--muted-foreground))] flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[hsl(var(--accent))]" />
            <span>Loading active behavioral baselines...</span>
          </div>
        ) : filteredBaselines.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-xs text-[hsl(var(--muted-foreground))] bg-white border border-[hsl(var(--border))] rounded-xl">
            <Scale className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="font-semibold text-sm text-[hsl(var(--foreground))]">No baseline rules found</div>
            <p className="mt-1">Define trusted business requirements or approve AI-generated expectation baselines.</p>
          </div>
        ) : (
          filteredBaselines.map(b => (
            <div
              key={b.id}
              className="bg-white border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs space-y-3 hover:border-[hsl(var(--accent))]/40 transition flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] uppercase">
                      {b.id} • v{b.version}
                    </span>
                    <h3 className="font-bold text-sm text-[hsl(var(--foreground))]">{b.title}</h3>
                  </div>
                  {b.is_approved ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Provisional
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px]">
                  <span className="bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] px-2 py-0.5 rounded font-medium border border-[hsl(var(--border))]">
                    {(b.domain || 'general').toUpperCase()}
                  </span>
                  <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium border border-indigo-200">
                    {b.rule_type || 'invariant'}
                  </span>
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Source: <strong className="text-slate-700">{b.source}</strong>
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[hsl(var(--secondary))]/40 border border-[hsl(var(--border))] text-xs text-[hsl(var(--foreground))] space-y-1">
                  <div className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">
                    Expected State & Behavioral Rule
                  </div>
                  <p className="leading-relaxed">{b.expected_behavior}</p>
                </div>

                {b.invariant_rule && (
                  <div className="text-[11px] font-mono text-purple-800 bg-purple-50/70 p-2 rounded border border-purple-200 truncate">
                    Invariant: {b.invariant_rule}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[hsl(var(--border))] flex items-center justify-between text-xs">
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{b.category}</span>
                {!b.is_approved && (
                  <button
                    onClick={() => handleApprove(b.id)}
                    className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold text-xs"
                  >
                    <span>Approve as Ground Truth</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[hsl(var(--border))] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
              <div>
                <h2 className="font-bold text-base text-[hsl(var(--foreground))]">Define Behavioral Baseline Rule</h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Establish a deterministic ground-truth expectation for test assertions.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBaseline} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[hsl(var(--foreground))] mb-1">Rule Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Assessment Timer & Answer Recovery on Browser Reload"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] focus:ring-1 focus:ring-[hsl(var(--ring))] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[hsl(var(--foreground))] mb-1">Target Domain</label>
                  <select
                    value={newDomain}
                    onChange={e => setNewDomain(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] focus:ring-1 focus:ring-[hsl(var(--ring))] outline-none"
                  >
                    <option value="assessment">Assessment Platform</option>
                    <option value="ecommerce">E-Commerce</option>
                    <option value="universal">Universal Web App</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[hsl(var(--foreground))] mb-1">Rule Type</label>
                  <select
                    value={newRuleType}
                    onChange={e => setNewRuleType(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] focus:ring-1 focus:ring-[hsl(var(--ring))] outline-none"
                  >
                    <option value="invariant">Deterministic Invariant</option>
                    <option value="requirement">Business Requirement</option>
                    <option value="workflow">Workflow Idempotency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[hsl(var(--foreground))] mb-1">Bug Taxonomy Category</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] focus:ring-1 focus:ring-[hsl(var(--ring))] outline-none"
                >
                  <option value="Functional behavior and navigation">Functional behavior and navigation</option>
                  <option value="Form validation and input boundaries">Form validation and input boundaries</option>
                  <option value="Business logic and calculations">Business logic and calculations</option>
                  <option value="Transaction and workflow integrity">Transaction and workflow integrity</option>
                  <option value="Data persistence and state consistency">Data persistence and state consistency</option>
                  <option value="Authentication and authorization">Authentication and authorization</option>
                  <option value="Session, recovery, and interrupted workflows">Session, recovery, and interrupted workflows</option>
                  <option value="UI, accessibility, and responsive behavior">UI, accessibility, and responsive behavior</option>
                  <option value="API integration, reliability, and performance">API integration, reliability, and performance</option>
                  <option value="Security findings">Security findings</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-[hsl(var(--foreground))] mb-1">Expected Behavior Specification</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the invariant expectation: what must be true under what condition..."
                  value={newExpectedBehavior}
                  onChange={e => setNewExpectedBehavior(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] focus:ring-1 focus:ring-[hsl(var(--ring))] outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[hsl(var(--foreground))] mb-1">
                  Optional Invariant Logic / Assertion Target
                </label>
                <input
                  type="text"
                  placeholder="e.g. cart_total == sum(price * qty) or session.answers.length == saved.length"
                  value={newInvariantRule}
                  onChange={e => setNewInvariantRule(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] focus:ring-1 focus:ring-[hsl(var(--ring))] outline-none font-mono text-xs"
                />
              </div>

              <div className="pt-3 border-t border-[hsl(var(--border))] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-xs font-medium text-[hsl(var(--foreground))]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-white text-xs font-medium hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Baseline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
