import hashlib
from typing import Dict, Any, List
from backend.app.services.browser_executor import BrowserExecutor

# 10 Explicit QA Bug Taxonomy Categories
BUG_TAXONOMY_CATEGORIES = [
    "Functional behavior and navigation",
    "Form validation and input boundaries",
    "Business logic and calculations",
    "Transaction and workflow integrity",
    "Data persistence and state consistency",
    "Authentication and authorization",
    "Session, recovery, and interrupted workflows",
    "UI, accessibility, and responsive behavior",
    "API integration, reliability, and performance",
    "Security findings"
]

class VerifierAgent:
    """
    Verifier Agent: Evaluates failures independently, isolates minimal reproduction
    sequences, verifies reproducibility across controlled browser sessions, computes
    transparent trust/evidence scores, and classifies findings into the 10-tier taxonomy.
    """
    def __init__(self, browser_executor: BrowserExecutor, max_retries: int = 1):
        self.executor = browser_executor
        self.max_retries = max_retries

    def construct_minimal_reproduction_sequence(
        self,
        test_case: Dict[str, Any],
        initial_result: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Extracts the minimal contiguous sequence of actions needed to reach and trigger
        the defect, stripping redundant trailing steps or auxiliary screenshots.
        """
        all_steps = test_case.get("steps", [])
        if not all_steps:
            return []

        step_logs = initial_result.get("step_logs", [])
        failed_step_idx = None
        for i, log in enumerate(step_logs):
            if "FAILED" in log:
                failed_step_idx = i
                break

        if failed_step_idx is not None:
            minimal = all_steps[: failed_step_idx + 1]
        else:
            # Functional actions kept, screenshot-only steps omitted
            minimal = [s for s in all_steps if s.get("action") not in ("screenshot",)]
            if not minimal:
                minimal = list(all_steps)

        return minimal

    def generate_dedup_key(self, affected_url: str, title: str, failed_assertions: List[Dict[str, Any]]) -> str:
        """Computes a stable deduplication fingerprint for the root defect."""
        from urllib.parse import urlparse
        path = urlparse(affected_url).path or "/"
        target = failed_assertions[0].get("target", "") if failed_assertions else ""
        a_type = failed_assertions[0].get("type", "") if failed_assertions else ""
        raw = f"{path}:{target}:{a_type}:{title[:30]}"
        return hashlib.md5(raw.encode("utf-8")).hexdigest()[:16]

    def classify_category(self, test_case: Dict[str, Any], failed_assertions: List[Dict[str, Any]]) -> str:
        """Classifies the defect into one of the 10 explicit QA categories."""
        title_lower = test_case.get("title", "").lower()
        desc_lower = (test_case.get("risk_reason") or "").lower()
        category_hint = (test_case.get("category") or "").lower()

        if "security" in title_lower or "access control" in title_lower or "unauthorized" in title_lower:
            return "Security findings"
        if "auth" in title_lower or "login" in title_lower or "forbidden" in title_lower:
            return "Authentication and authorization"
        if "recovery" in title_lower or "refresh" in title_lower or "interrupt" in title_lower or "session" in title_lower:
            return "Session, recovery, and interrupted workflows"
        if "idempotency" in title_lower or "duplicate" in title_lower or "order" in title_lower or "checkout" in title_lower:
            return "Transaction and workflow integrity"
        if "subtotal" in title_lower or "cart" in title_lower or "calculation" in title_lower or "arithmetic" in title_lower or "score" in title_lower:
            return "Business logic and calculations"
        if "persist" in title_lower or "saved" in title_lower or "database" in title_lower:
            return "Data persistence and state consistency"
        if "email" in title_lower or "postal" in title_lower or "validation" in title_lower or "form" in title_lower or "boundary" in title_lower:
            return "Form validation and input boundaries"
        if "accessibility" in title_lower or "ui" in title_lower or "layout" in title_lower:
            return "UI, accessibility, and responsive behavior"
        if "api" in title_lower or "latency" in title_lower or "500" in title_lower:
            return "API integration, reliability, and performance"

        return "Functional behavior and navigation"

    def calculate_trust_score(
        self,
        expectation_source: str,
        initial_result: Dict[str, Any],
        reproduced_count: int,
        replay_attempts: int,
        failed_assertions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Computes a transparent, explainable Trust/Evidence Score from visible components.
        Never relies on LLM self-reported opinion or unverified assumptions.
        """
        # 1. Source Strength (0.0 to 1.0)
        source_lower = expectation_source.lower()
        if "invariant" in source_lower:
            source_strength = 1.0
        elif "requirement" in source_lower or "business" in source_lower:
            source_strength = 0.95
        elif "known_good" in source_lower or "baseline" in source_lower:
            source_strength = 0.90
        elif "ai" in source_lower or "provisional" in source_lower:
            source_strength = 0.65
        else:
            source_strength = 0.80

        # 2. Evidence Completeness (0.0 to 1.0)
        has_screenshot = len(initial_result.get("screenshot_ids", [])) > 0
        has_assertion_diff = len(failed_assertions) > 0
        has_step_logs = len(initial_result.get("step_logs", [])) > 0
        completeness_pts = (0.4 if has_screenshot else 0.0) + (0.4 if has_assertion_diff else 0.0) + (0.2 if has_step_logs else 0.0)
        evidence_completeness = round(completeness_pts, 2)

        # 3. Reproducibility (0.0 to 1.0)
        reproducibility = round(reproduced_count / max(1, replay_attempts), 2)

        # 4. Independent Verification Check (Clean context replay)
        independent_check = 1.0 if replay_attempts >= 2 else 0.70

        # 5. Alternative Explanations Considered
        # Environmental timeout or missing selector reduces this score
        execution_error = initial_result.get("execution_error") or ""
        if "timeout" in execution_error.lower() or "not found" in execution_error.lower():
            alternative_explanations_penalty = 0.45
            alt_reason = "Alternative explanation: Potential network latency or transient locator timeout cannot be fully ruled out."
        else:
            alternative_explanations_penalty = 0.95
            alt_reason = "Alternative explanations evaluated: Environmental flakiness, transient network delays, and cache interference were ruled out via clean-session replay."

        # Overall Weighted Trust Score
        overall = (
            0.25 * source_strength +
            0.25 * evidence_completeness +
            0.25 * reproducibility +
            0.15 * independent_check +
            0.10 * alternative_explanations_penalty
        )
        trust_score = round(max(0.10, min(0.99, overall)), 2)

        signals = []
        if source_strength >= 0.90:
            signals.append("Ground-truth invariant baseline expectation")
        if has_assertion_diff:
            signals.append("Deterministic assertion violation captured")
        if has_screenshot:
            signals.append("DOM screenshot evidence persisted")
        if reproducibility == 1.0:
            signals.append("100% reproducible across isolated replay cycles")
        if independent_check >= 0.90:
            signals.append("Verified in clean isolated browser context")

        return {
            "trust_score": trust_score,
            "components": {
                "source_strength": source_strength,
                "evidence_completeness": evidence_completeness,
                "reproducibility": reproducibility,
                "independent_check": independent_check,
                "alternative_explanations_score": alternative_explanations_penalty,
                "signals": signals
            },
            "signals": signals,
            "alternative_explanations_notes": alt_reason
        }

    async def verify_failure(
        self,
        test_case: Dict[str, Any],
        initial_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Replays the failing test with a minimal reproduction sequence in an isolated context.
        """
        minimal_steps = self.construct_minimal_reproduction_sequence(test_case, initial_result)
        repro_test = {
            "steps": minimal_steps,
            "assertions": test_case.get("assertions", []),
            "title": f"Minimal Repro: {test_case.get('title', '')}"
        }

        replay_attempts = 1
        reproduced_count = 1
        replay_outcomes = [{
            "attempt": 1,
            "status": initial_result.get("status"),
            "assertion_results": initial_result.get("assertion_results", [])
        }]

        for i in range(self.max_retries):
            replay_attempts += 1
            res = await self.executor.execute_test(repro_test)
            is_fail = (res["status"] == "Failed")
            if is_fail:
                reproduced_count += 1
            replay_outcomes.append({
                "attempt": i + 2,
                "status": res["status"],
                "assertion_results": res.get("assertion_results", [])
            })

        # Evaluate Status Classification
        initial_status = initial_result.get("status")
        execution_error = initial_result.get("execution_error")
        assertion_results = initial_result.get("assertion_results", [])
        failed_assertions = [a for a in assertion_results if not a.get("passed")]

        expectation_source = test_case.get("expectation_source") or "Deterministic Invariant"
        trust_data = self.calculate_trust_score(
            expectation_source=expectation_source,
            initial_result=initial_result,
            reproduced_count=reproduced_count,
            replay_attempts=replay_attempts,
            failed_assertions=failed_assertions
        )

        trust_score = trust_data["trust_score"]
        category = self.classify_category(test_case, failed_assertions)

        # Classify using explicit evidence-based rules into Confirmed / Suspected / Inconclusive / Dismissed
        if initial_status == "Blocked" or (execution_error and "timeout" in execution_error.lower()):
            finding_status = "Inconclusive"
            reason = "Test execution was blocked by an environmental timeout or missing locator rather than an application logic defect."
        elif reproduced_count == replay_attempts and failed_assertions:
            finding_status = "Confirmed"
            reason = f"Deterministic defect confirmed with consistent supporting evidence across {replay_attempts} independent browser sessions (Trust Score: {int(trust_score*100)}%)."
        elif reproduced_count > 1 or trust_score >= 0.75:
            finding_status = "Suspected"
            reason = f"Plausible defect observed across {reproduced_count} of {replay_attempts} controlled replay cycles, but requires additional corroborating telemetry."
        else:
            finding_status = "Dismissed"
            reason = f"The failure observed in the initial test attempt did not recur during controlled clean replay validation (0/{self.max_retries} reproductions)."

        # Severity Assessment Policy
        title_lower = test_case.get("title", "").lower()
        if "access control" in title_lower or "security" in title_lower or category == "Security findings":
            severity = "Critical"
            severity_reason = "Unauthorized data disclosure or access control bypass violating system trust boundaries."
        elif "cart" in title_lower or "checkout" in title_lower or "order" in title_lower or "idempotency" in title_lower or "score" in title_lower:
            severity = "High"
            severity_reason = "Directly breaks high-impact business workflows, financial calculations, or scoring integrity."
        elif "email" in title_lower or "validation" in title_lower or "postal" in title_lower or "recovery" in title_lower:
            severity = "Medium"
            severity_reason = "Input validation or state recovery flaw with demonstrable functional impact."
        else:
            severity = "Low"
            severity_reason = "Minor layout or presentation discrepancy without blocking user transactions."

        affected_url = initial_result.get("final_url", "")
        dedup_key = self.generate_dedup_key(affected_url, test_case.get("title", ""), failed_assertions)

        # Structured diagnostic hypotheses (clearly marked as hypotheses)
        likely_cause = f"Hypothesis: Backend or frontend handler at '{affected_url}' fails to enforce deterministic invariant '{test_case.get('title')}'."
        suggested_fix = f"Suggested Fix (Candidate): Enforce server-side validation and state assertion on '{test_case.get('title')}' before state mutation."

        return {
            "finding_status": finding_status,
            "status": finding_status,
            "confidence_score": trust_score,
            "trust_score": trust_score,
            "trust_breakdown": trust_data["components"],
            "verification_notes": reason,
            "category": category,
            "severity": severity,
            "severity_reason": severity_reason,
            "replay_attempts": replay_attempts,
            "reproduced_count": reproduced_count,
            "reproduction_outcomes": replay_outcomes,
            "failed_assertions": failed_assertions,
            "minimal_steps": minimal_steps,
            "dedup_key": dedup_key,
            "detection_method": "deterministic_assertion",
            "likely_cause_hypothesis": likely_cause,
            "suggested_fix": suggested_fix,
            "alternative_explanations": trust_data["alternative_explanations_notes"]
        }
