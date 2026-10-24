import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Play, ArrowRight, ShieldCheck, CheckCircle2, Sparkles, X, ChevronRight, Layers, Compass, Cpu, Bug } from 'lucide-react';
import { DashboardPreview } from '../components/landing/DashboardPreview';
import { Button } from '../components/ui/button';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const videoUrl =
    'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_015952_e1deeb12-8fb7-4071-a42a-60779fc64ab6.mp4';

  return (
    <div className="relative min-h-screen bg-[#fafafa] text-[#1e293b] font-body flex flex-col selection:bg-[#e0e7ff] selection:text-[#4338ca] overflow-x-hidden">
      {/* Background Video with Graceful Fallback and Soft Overlay */}
      <div className="absolute inset-0 w-full h-[125vh] overflow-hidden pointer-events-none z-0">
        {!videoError && !shouldReduceMotion ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            onError={() => setVideoError(true)}
            className="w-full h-full object-cover opacity-35 filter brightness-105 contrast-95"
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : (
          <div className="w-full h-full bg-radial from-[#e0e7ff]/20 via-[#f8fafc]/40 to-transparent" />
        )}
        {/* Subtle Frosted Radial Gradient to guarantee high contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#fafafa]/70 via-[#fafafa]/50 to-[#fafafa]" />
      </div>

      {/* Responsive Navbar */}
      <header className="relative z-20 w-full px-6 md:px-12 lg:px-20 py-5 flex items-center justify-between border-b border-[#e2e8f0]/40 backdrop-blur-xs">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 text-left group">
          <div className="w-8 h-8 rounded-lg bg-[#1e293b] text-white flex items-center justify-center font-bold text-sm shadow-xs transition-transform group-hover:scale-105">
            ✦
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-[#0f172a] block">
              Autonomous QA
            </span>
            <span className="text-[10px] text-[#64748b] -mt-0.5 block font-medium">
              Self-Governing Quality Assistant
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#64748b]">
          <a href="#how-it-works" onClick={(e) => { e.preventDefault(); setShowWalkthrough(true); }} className="hover:text-[#0f172a] transition-colors">
            How it works
          </a>
          <Link to="/explore" className="hover:text-[#0f172a] transition-colors">
            Exploration
          </Link>
          <Link to="/benchmark" className="hover:text-[#0f172a] transition-colors">
            Benchmarks
          </Link>
          <Link to="/dashboard" className="hover:text-[#0f172a] transition-colors">
            Dashboard
          </Link>
        </nav>

        {/* Right CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="rounded-full text-xs font-semibold px-4 h-9 border-[#cbd5e1] hover:bg-white"
          >
            Open workspace
          </Button>
          <Button
            onClick={() => navigate('/new-run')}
            className="rounded-full text-xs font-semibold px-5 h-9 bg-[#1e293b] text-white hover:bg-[#0f172a] shadow-xs flex items-center gap-1.5"
          >
            <span>Launch QA</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <Button
            onClick={() => navigate('/new-run')}
            size="sm"
            className="rounded-full text-xs px-3.5 h-8 bg-[#1e293b] text-white"
          >
            Launch QA
          </Button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-white/60 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className="w-full h-0.5 bg-current rounded-full" />
              <span className="w-full h-0.5 bg-current rounded-full" />
              <span className="w-full h-0.5 bg-current rounded-full" />
            </div>
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="relative z-30 md:hidden bg-white/95 backdrop-blur-md border-b border-[#e2e8f0] px-6 py-4 space-y-3">
          <Link to="/dashboard" className="block text-sm font-medium text-[#334155] py-1.5">
            Dashboard Overview
          </Link>
          <Link to="/new-run" className="block text-sm font-medium text-[#334155] py-1.5">
            Start New Run
          </Link>
          <Link to="/test-cases" className="block text-sm font-medium text-[#334155] py-1.5">
            Test Cases & Evidence
          </Link>
          <Link to="/bugs" className="block text-sm font-medium text-[#334155] py-1.5">
            Bug Reports
          </Link>
          <Link to="/benchmark" className="block text-sm font-medium text-[#334155] py-1.5">
            Benchmark Console
          </Link>
          <button
            onClick={() => { setMobileMenuOpen(false); setShowWalkthrough(true); }}
            className="block text-left text-sm font-medium text-[#4f46e5] py-1.5"
          >
            ✦ Watch Architecture Walkthrough
          </button>
        </div>
      )}

      {/* Hero Section Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start text-center pt-10 md:pt-16 pb-16 px-4 md:px-8 max-w-6xl mx-auto w-full">
        {/* 1. Badge */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#cbd5e1]/80 bg-white/80 shadow-2xs backdrop-blur-md mb-6"
        >
          <span className="w-2 h-2 rounded-full bg-[#4f46e5] animate-pulse" />
          <span className="text-xs font-medium text-[#334155]">
            Autonomous testing. Evidence-backed results.
          </span>
        </motion.div>

        {/* 2. Headline with Instrument Serif */}
        <motion.h1
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[5.25rem] font-normal tracking-tight text-[#0f172a] leading-[0.95] max-w-4xl"
        >
          Web QA, <span className="italic font-normal text-[#1e293b]">made autonomously.</span>
        </motion.h1>

        {/* 3. Subheadline */}
        <motion.p
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-5 text-base sm:text-lg text-[#64748b] max-w-[650px] leading-relaxed font-normal"
        >
          The system explores websites, creates and runs test cases, verifies potential bugs using evidence,
          and produces reusable regression tests.
        </motion.p>

        {/* 4. CTAs */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-7 flex flex-wrap items-center justify-center gap-3.5"
        >
          <Button
            onClick={() => navigate('/new-run')}
            className="rounded-full px-7 py-5 h-12 text-sm font-semibold bg-[#1e293b] text-white hover:bg-[#0f172a] shadow-sm transition-all hover:scale-[1.02]"
          >
            <span>Start testing</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <Button
            onClick={() => setShowWalkthrough(true)}
            variant="outline"
            className="rounded-full px-5 py-5 h-12 text-sm font-medium bg-white/90 text-[#334155] border-[#cbd5e1] hover:bg-white shadow-2xs flex items-center gap-2.5 transition-all hover:scale-[1.02]"
            aria-label="See how it works"
          >
            <div className="w-6 h-6 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#4f46e5]">
              <Play className="w-3 h-3 fill-current ml-0.5" />
            </div>
            <span>See how it works</span>
          </Button>
        </motion.div>

        {/* 5. Custom-Coded React QA Dashboard Preview */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-10 w-full max-w-5xl rounded-2xl overflow-hidden p-2 sm:p-3 md:p-4 text-left"
        >
          <DashboardPreview />
        </motion.div>

        {/* Feature Pillars Row */}
        <section className="mt-16 pt-12 border-t border-[#e2e8f0]/80 w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white/80 p-5 rounded-xl border border-[#e2e8f0] shadow-2xs">
            <div className="w-9 h-9 rounded-lg bg-[#e0e7ff] text-[#4338ca] flex items-center justify-center mb-3">
              <Compass className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-sm text-[#0f172a] mb-1">Autonomous Scout & Map</h4>
            <p className="text-xs text-[#64748b] leading-relaxed">
              Playwright agent crawls interactive controls, buttons, forms, and transitions without brittle manual selectors.
            </p>
          </div>

          <div className="bg-white/80 p-5 rounded-xl border border-[#e2e8f0] shadow-2xs">
            <div className="w-9 h-9 rounded-lg bg-[#ecfdf5] text-[#059669] flex items-center justify-center mb-3">
              <Cpu className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-sm text-[#0f172a] mb-1">Explainable Curiosity Engine</h4>
            <p className="text-xs text-[#64748b] leading-relaxed">
              Calculates priority using impact, uncertainty, novelty, and coverage gap. Every testing decision is mathematically logged.
            </p>
          </div>

          <div className="bg-white/80 p-5 rounded-xl border border-[#e2e8f0] shadow-2xs">
            <div className="w-9 h-9 rounded-lg bg-[#fef2f2] text-[#dc2626] flex items-center justify-center mb-3">
              <Bug className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-sm text-[#0f172a] mb-1">Clean-Session Replay Verification</h4>
            <p className="text-xs text-[#64748b] leading-relaxed">
              Failures are re-executed in isolated browser contexts. Eliminates false positives with proof-carrying screenshots and traces.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-6 px-6 border-t border-[#e2e8f0]/60 text-center text-xs text-[#94a3b8]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>✦ Autonomous AI QA Engineer • iMocha IM-02 Track</span>
          <div className="flex items-center gap-4 text-[#64748b]">
            <Link to="/dashboard" className="hover:text-[#0f172a]">Dashboard</Link>
            <Link to="/test-cases" className="hover:text-[#0f172a]">Test Cases</Link>
            <Link to="/bugs" className="hover:text-[#0f172a]">Bugs</Link>
            <Link to="/benchmark" className="hover:text-[#0f172a]">Benchmark</Link>
          </div>
        </div>
      </footer>

      {/* Interactive Walkthrough Modal */}
      {showWalkthrough && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#e2e8f0] text-left relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowWalkthrough(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#94a3b8] hover:text-[#0f172a] hover:bg-[#f1f5f9]"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#e0e7ff] text-[#4338ca]">
                System Architecture
              </span>
              <span className="text-xs text-[#64748b]">How Autonomous QA Works</span>
            </div>
            <h3 className="text-xl font-bold text-[#0f172a] mb-4">
              Explore &rarr; Understand &rarr; Plan &rarr; Execute &rarr; Verify &rarr; Report
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
                <div className="w-6 h-6 rounded-md bg-[#4f46e5] text-white flex items-center justify-center font-bold shrink-0">1</div>
                <div>
                  <div className="font-semibold text-[#0f172a]">Scout Agent (Autonomous Discovery)</div>
                  <div className="text-[#64748b] mt-0.5">Crawls target website, detects buttons, inputs, links, and builds an observable topology graph.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
                <div className="w-6 h-6 rounded-md bg-[#059669] text-white flex items-center justify-center font-bold shrink-0">2</div>
                <div>
                  <div className="font-semibold text-[#0f172a]">Curiosity Engine (Mathematical Prioritization)</div>
                  <div className="text-[#64748b] mt-0.5">Ranks candidate journeys using impact, uncertainty, novelty, and coverage gap formulas with clear human rationale.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
                <div className="w-6 h-6 rounded-md bg-[#d97706] text-white flex items-center justify-center font-bold shrink-0">3</div>
                <div>
                  <div className="font-semibold text-[#0f172a]">Tester Agent (Playwright Execution)</div>
                  <div className="text-[#64748b] mt-0.5">Dispatches resilient actions, verifies deterministic invariants, and tests state persistence across page refreshes.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
                <div className="w-6 h-6 rounded-md bg-[#dc2626] text-white flex items-center justify-center font-bold shrink-0">4</div>
                <div>
                  <div className="font-semibold text-[#0f172a]">Verifier Agent (Deterministic Clean Replay)</div>
                  <div className="text-[#64748b] mt-0.5">Isolates failures into minimal reproduction sequences and re-tests in clean incognito contexts to confirm real defects.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
                <div className="w-6 h-6 rounded-md bg-[#0284c7] text-white flex items-center justify-center font-bold shrink-0">5</div>
                <div>
                  <div className="font-semibold text-[#0f172a]">Regression & Ground-Truth Benchmarks</div>
                  <div className="text-[#64748b] mt-0.5">Converts passing journeys into 1-click regression suites and computes precision and recall against seeded defect benchmarks.</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                onClick={() => setShowWalkthrough(false)}
                variant="outline"
                className="text-xs"
              >
                Close
              </Button>
              <Button
                onClick={() => { setShowWalkthrough(false); navigate('/new-run'); }}
                className="text-xs bg-[#1e293b] text-white"
              >
                Start an Autonomous Run
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
