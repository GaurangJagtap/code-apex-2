import datetime
from typing import Dict, Any, List, Optional
import httpx
from sqlalchemy.orm import Session
from backend.app.db.models import TestRun, TestCase, BugFinding, ExploredPage
from backend.app.services.run_controller import RunController

# 1. DevStore E-Commerce Benchmark Ground Truth
SEEDED_GROUND_TRUTH: List[Dict[str, Any]] = [
    {
        "defect_id": "BUG-01",
        "category": "Form validation and input boundaries",
        "title": "Faulty Email Format Validation",
        "affected_path": "/register",
        "expected_behavior": "Reject malformed email missing @ or domain with clear validation error; block registration.",
        "actual_behavior": "Accepts invalid emails like 'invaliduser_without_at' and creates corrupt account.",
        "criticality": "Medium",
        "matching_keywords": ["email", "register", "format", "malformed"]
    },
    {
        "defect_id": "BUG-02",
        "category": "Business logic and calculations",
        "title": "Cart Subtotal Calculation Failure on Quantity Update",
        "affected_path": "/cart",
        "expected_behavior": "Cart subtotal and grand total must dynamically recalculate (unit price * quantity + shipping + tax).",
        "actual_behavior": "Subtotal and order total remain frozen at 1-item price after quantity change.",
        "criticality": "High",
        "matching_keywords": ["subtotal", "cart", "quantity", "recomputation", "calculation"]
    },
    {
        "defect_id": "BUG-03",
        "category": "Form validation and input boundaries",
        "title": "Missing Validation on Required Postal/ZIP Code",
        "affected_path": "/checkout",
        "expected_behavior": "Checkout form must enforce required Postal Code and block order placement.",
        "actual_behavior": "Checkout succeeds with empty postal code, creating incomplete shipping orders.",
        "criticality": "High",
        "matching_keywords": ["postal", "zip", "checkout", "required"]
    },
    {
        "defect_id": "BUG-04",
        "category": "Transaction and workflow integrity",
        "title": "Non-Idempotent Duplicate Order Submission",
        "affected_path": "/checkout",
        "expected_behavior": "Submit button must disable immediately upon click and server must enforce idempotency.",
        "actual_behavior": "Button remains active and unthrottled, allowing rapid duplicate order submissions.",
        "criticality": "High",
        "matching_keywords": ["idempotency", "duplicate", "throttle", "place order", "disabled"]
    },
    {
        "defect_id": "BUG-05",
        "category": "Security findings",
        "title": "Broken Access Control on Protected Account Route",
        "affected_path": "/account",
        "expected_behavior": "Unauthenticated access to /account must redirect to /login.",
        "actual_behavior": "Route serves sensitive customer profile and order history to anonymous visitors.",
        "criticality": "Critical",
        "matching_keywords": ["account", "unauthenticated", "access control", "login", "protected"]
    }
]

BENCHMARK_JOURNEYS: List[Dict[str, Any]] = [
    {"journey_id": "JRN-01", "name": "Homepage Navigation & Product Discovery", "path": "/products"},
    {"journey_id": "JRN-02", "name": "User Registration Input Validation", "path": "/register"},
    {"journey_id": "JRN-03", "name": "Shopping Cart Arithmetic & Quantity Recalculation", "path": "/cart"},
    {"journey_id": "JRN-04", "name": "Checkout Logistics & Field Boundary Validation", "path": "/checkout"},
    {"journey_id": "JRN-05", "name": "Checkout Order Submission Idempotency", "path": "/checkout"},
    {"journey_id": "JRN-06", "name": "Protected Account Route Access Control", "path": "/account"},
    {"journey_id": "JRN-07", "name": "User Authentication & Session Persistence", "path": "/login"}
]

# 2. iMocha-Style Hiring & Assessment Benchmark Ground Truth
ASSESSMENT_GROUND_TRUTH: List[Dict[str, Any]] = [
    {
        "defect_id": "ASSESS-01",
        "category": "Session, recovery, and interrupted workflows",
        "title": "Answer State Lost on Page Refresh During Assessment",
        "affected_path": "/assessment/test",
        "expected_behavior": "Candidate answers and selected options must be persisted across page reload or transient disconnection.",
        "actual_behavior": "Refreshing or reloading the examination page wipes answered options from session state.",
        "criticality": "High",
        "matching_keywords": ["refresh", "answer", "lost", "recovery", "interruption", "state"]
    },
    {
        "defect_id": "ASSESS-02",
        "category": "Transaction and workflow integrity",
        "title": "Non-Idempotent Duplicate Assessment Submission",
        "affected_path": "/assessment/submit",
        "expected_behavior": "Submit assessment button must disable immediately upon click and enforce single submission idempotency.",
        "actual_behavior": "Rapid secondary click creates multiple duplicate submission records with distinct IDs.",
        "criticality": "High",
        "matching_keywords": ["idempotency", "duplicate", "assessment", "submission", "double click"]
    },
    {
        "defect_id": "ASSESS-03",
        "category": "Business logic and calculations",
        "title": "Score Calculation Arithmetic Mismatch Against Answer Key",
        "affected_path": "/assessment/submit",
        "expected_behavior": "When candidate answers 3 out of 3 questions correctly according to answer key, evaluated score must report 100%.",
        "actual_behavior": "Score calculation logic inverts fraction or integer arithmetic, reporting 33% instead of 100%.",
        "criticality": "Critical",
        "matching_keywords": ["score", "calculation", "arithmetic", "answer key", "percentage", "33%"]
    },
    {
        "defect_id": "ASSESS-04",
        "category": "Security findings",
        "title": "Broken Access Control on Recruiter Results Dashboard",
        "affected_path": "/assessment/recruiter/results",
        "expected_behavior": "Unauthenticated or unauthorized visitors must be redirected to recruiter login.",
        "actual_behavior": "Recruiter results dashboard leaks all candidate names, emails, and assessment scores without authentication.",
        "criticality": "Critical",
        "matching_keywords": ["recruiter", "results", "access control", "unauthenticated", "leak"]
    },
    {
        "defect_id": "ASSESS-05",
        "category": "Form validation and input boundaries",
        "title": "Missing Format Validation on Candidate Access Code",
        "affected_path": "/assessment/start",
        "expected_behavior": "Access code form must require formatted 6-character invitation key (e.g. AIM-2026) and reject 1-character codes.",
        "actual_behavior": "Accepts invalid 1-character strings without format validation, initializing corrupt sessions.",
        "criticality": "Medium",
        "matching_keywords": ["access code", "invitation", "code", "1-character", "validation"]
    }
]

ASSESSMENT_JOURNEYS: List[Dict[str, Any]] = [
    {"journey_id": "JRN-A01", "name": "Candidate Assessment Portal & Access Verification", "path": "/assessment"},
    {"journey_id": "JRN-A02", "name": "Candidate Access Code Format Validation", "path": "/assessment/start"},
    {"journey_id": "JRN-A03", "name": "Candidate Examination & Question Answering", "path": "/assessment/test"},
    {"journey_id": "JRN-A04", "name": "Simulated Refresh & Session Recovery Invariant", "path": "/assessment/test"},
    {"journey_id": "JRN-A05", "name": "Assessment Submission & Idempotency Enforcement", "path": "/assessment/submit"},
    {"journey_id": "JRN-A06", "name": "Score Verification Against Ground Truth Answer Key", "path": "/assessment/submit"},
    {"journey_id": "JRN-A07", "name": "Recruiter Evaluation Dashboard Access Control", "path": "/assessment/recruiter/results"}
]

class BenchmarkService:
    """
    Quality Metrics and Ground-Truth Evaluation Engine.
    Computes Defect Recall, Precision, Reproducibility Rate, and Journey Coverage
    dynamically from stored database records for both DevStore and Assessment suites.
    """

    @classmethod
    def get_suite_registry(cls, suite: str = "devstore"):
        if str(suite).lower() in ("assessment", "assess", "imocha"):
            return {
                "suite": "assessment",
                "name": "iMocha-Style Hiring & Assessment Benchmark",
                "ground_truth": ASSESSMENT_GROUND_TRUTH,
                "benchmark_journeys": ASSESSMENT_JOURNEYS,
                "total_planted": len(ASSESSMENT_GROUND_TRUTH),
                "total_journeys": len(ASSESSMENT_JOURNEYS)
            }
        return {
            "suite": "devstore",
            "name": "DevStore E-Commerce Seeded Defect Benchmark",
            "ground_truth": SEEDED_GROUND_TRUTH,
            "benchmark_journeys": BENCHMARK_JOURNEYS,
            "total_planted": len(SEEDED_GROUND_TRUTH),
            "total_journeys": len(BENCHMARK_JOURNEYS)
        }

    @classmethod
    def evaluate_run(cls, db: Session, run_id: str, suite: Optional[str] = None) -> Dict[str, Any]:
        """
        Evaluates an existing TestRun against ground truth dynamically without hardcoded results.
        Auto-detects benchmark suite from target_url if not explicitly provided.
        """
        run = db.query(TestRun).filter(TestRun.id == run_id).first()
        if not run:
            raise ValueError(f"Run {run_id} not found")

        findings = db.query(BugFinding).filter(BugFinding.run_id == run_id).all()
        tests = db.query(TestCase).filter(TestCase.run_id == run_id).all()
        pages = db.query(ExploredPage).filter(ExploredPage.run_id == run_id).all()

        # Auto-detect suite
        if not suite:
            target_lower = (run.target_url or "").lower()
            desc_lower = (run.description or "").lower()
            if "/assessment" in target_lower or "assessment" in desc_lower or "imocha" in desc_lower:
                suite = "assessment"
            else:
                suite = "devstore"

        registry = cls.get_suite_registry(suite)
        ground_truth_list = registry["ground_truth"]
        benchmark_journeys_list = registry["benchmark_journeys"]

        total_planted = len(ground_truth_list)
        matched_defects = []
        unmatched_findings = list(findings)

        defect_matrix = []
        for gt in ground_truth_list:
            matched_finding = None
            for f in findings:
                clean_path = gt["affected_path"].strip("/")
                path_match = (
                    gt["affected_path"] in (f.affected_url or "")
                    or clean_path in (f.description or "").lower()
                    or clean_path in (f.title or "").lower()
                )
                content = f"{f.title} {f.description} {f.expected_behavior} {f.actual_behavior}".lower()
                keyword_match = any(kw.lower() in content for kw in gt["matching_keywords"])
                
                if path_match and keyword_match:
                    matched_finding = f
                    if f in unmatched_findings:
                        unmatched_findings.remove(f)
                    break

            if matched_finding:
                matched_defects.append(gt["defect_id"])
                defect_matrix.append({
                    "defect_id": gt["defect_id"],
                    "title": gt["title"],
                    "category": gt["category"],
                    "criticality": gt["criticality"],
                    "status": "Detected",
                    "verification_status": matched_finding.status,
                    "confidence": matched_finding.confidence_score,
                    "finding_id": matched_finding.id,
                    "replays": matched_finding.replay_attempts
                })
            else:
                defect_matrix.append({
                    "defect_id": gt["defect_id"],
                    "title": gt["title"],
                    "category": gt["category"],
                    "criticality": gt["criticality"],
                    "status": "Missed",
                    "verification_status": "N/A",
                    "confidence": 0.0,
                    "finding_id": None,
                    "replays": 0
                })

        true_positives = len(matched_defects)
        false_positives = len(unmatched_findings) # Reported findings not matching ground truth
        total_reported = len(findings)

        # 1. Defect Recall = TP / Total Planted
        recall = round(true_positives / total_planted, 4) if total_planted > 0 else 0.0

        # 2. Precision = TP / Total Reported
        precision = round(true_positives / total_reported, 4) if total_reported > 0 else (1.0 if true_positives == 0 else 0.0)

        # 3. Reproducibility Rate = Verified Reproduced / Total Verified Subjected to Verification
        verified_count = sum(1 for f in findings if f.status in ("Verified", "Confirmed"))
        reproduced_count = sum(1 for f in findings if f.status in ("Verified", "Confirmed") and f.replay_attempts >= 1)
        reproducibility_rate = round(reproduced_count / verified_count, 4) if verified_count > 0 else (1.0 if not findings else 0.0)

        # 4. Journey Coverage = Tested Journeys / Total Defined Benchmark Journeys
        tested_paths = set()
        for t in tests:
            for s in (t.steps or []):
                val = s.get("value", "") or s.get("selector", "")
                for j in benchmark_journeys_list:
                    if j["path"] in val:
                        tested_paths.add(j["journey_id"])
        for p in pages:
            for j in benchmark_journeys_list:
                if j["path"] in p.url:
                    tested_paths.add(j["journey_id"])

        journey_coverage = round(len(tested_paths) / len(benchmark_journeys_list), 4)

        return {
            "run_id": run.id,
            "suite": registry["suite"],
            "suite_name": registry["name"],
            "target_url": run.target_url,
            "evaluated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "metrics": {
                "defect_recall": recall,
                "defect_recall_percent": f"{recall * 100:.1f}%",
                "precision": precision,
                "precision_percent": f"{precision * 100:.1f}%",
                "reproducibility_rate": reproducibility_rate,
                "reproducibility_percent": f"{reproducibility_rate * 100:.1f}%",
                "journey_coverage": journey_coverage,
                "journey_coverage_percent": f"{journey_coverage * 100:.1f}%",
                "true_positives": true_positives,
                "false_positives": false_positives,
                "total_planted_defects": total_planted,
                "total_findings_reported": total_reported,
                "duration_sec": run.duration_sec,
                "total_tests_executed": run.total_tests
            },
            "defect_matrix": defect_matrix,
            "unmatched_findings": [
                {"id": uf.id, "title": uf.title, "affected_url": uf.affected_url, "status": uf.status}
                for uf in unmatched_findings
            ],
            "benchmark_journeys": [
                {
                    "journey_id": bj["journey_id"],
                    "name": bj["name"],
                    "path": bj["path"],
                    "covered": bj["journey_id"] in tested_paths
                }
                for bj in benchmark_journeys_list
            ]
        }
