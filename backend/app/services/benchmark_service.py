import datetime
from typing import Dict, Any, List, Optional
import httpx
from sqlalchemy.orm import Session
from backend.app.db.models import TestRun, TestCase, BugFinding, ExploredPage
from backend.app.services.run_controller import RunController

# Ground Truth Defect Registry (Isolated from agent's runtime decision loop)
SEEDED_GROUND_TRUTH: List[Dict[str, Any]] = [
    {
        "defect_id": "BUG-01",
        "category": "Form validation",
        "title": "Faulty Email Format Validation",
        "affected_path": "/register",
        "expected_behavior": "Reject malformed email missing @ or domain with clear validation error; block registration.",
        "actual_behavior": "Accepts invalid emails like 'invaliduser_without_at' and creates corrupt account.",
        "criticality": "Medium",
        "matching_keywords": ["email", "register", "format", "malformed"]
    },
    {
        "defect_id": "BUG-02",
        "category": "Business-rule testing",
        "title": "Cart Subtotal Calculation Failure on Quantity Update",
        "affected_path": "/cart",
        "expected_behavior": "Cart subtotal and grand total must dynamically recalculate (unit price * quantity + shipping + tax).",
        "actual_behavior": "Subtotal and order total remain frozen at 1-item price after quantity change.",
        "criticality": "High",
        "matching_keywords": ["subtotal", "cart", "quantity", "recomputation", "calculation"]
    },
    {
        "defect_id": "BUG-03",
        "category": "Form validation",
        "title": "Missing Validation on Required Postal/ZIP Code",
        "affected_path": "/checkout",
        "expected_behavior": "Checkout form must enforce required Postal Code and block order placement.",
        "actual_behavior": "Checkout succeeds with empty postal code, creating incomplete shipping orders.",
        "criticality": "High",
        "matching_keywords": ["postal", "zip", "checkout", "required"]
    },
    {
        "defect_id": "BUG-04",
        "category": "Business-rule testing",
        "title": "Non-Idempotent Duplicate Order Submission",
        "affected_path": "/checkout",
        "expected_behavior": "Submit button must disable immediately upon click and server must enforce idempotency.",
        "actual_behavior": "Button remains active and unthrottled, allowing rapid duplicate order submissions.",
        "criticality": "High",
        "matching_keywords": ["idempotency", "duplicate", "throttle", "place order", "disabled"]
    },
    {
        "defect_id": "BUG-05",
        "category": "Security & Access Control",
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

class BenchmarkService:
    """
    Quality Metrics and Ground-Truth Evaluation Engine.
    Computes Defect Recall, Precision, Reproducibility Rate, and Journey Coverage
    by comparing real execution findings against the isolated ground-truth registry.
    """

    @classmethod
    def evaluate_run(cls, db: Session, run_id: str) -> Dict[str, Any]:
        """
        Evaluates an existing TestRun against ground truth without hardcoded results.
        """
        run = db.query(TestRun).filter(TestRun.id == run_id).first()
        if not run:
            raise ValueError(f"Run {run_id} not found")

        findings = db.query(BugFinding).filter(BugFinding.run_id == run_id).all()
        tests = db.query(TestCase).filter(TestCase.run_id == run_id).all()
        pages = db.query(ExploredPage).filter(ExploredPage.run_id == run_id).all()

        total_planted = len(SEEDED_GROUND_TRUTH)
        matched_defects = []
        unmatched_findings = list(findings)

        defect_matrix = []
        for gt in SEEDED_GROUND_TRUTH:
            matched_finding = None
            for f in findings:
                # Check path match (including pre-redirect workflow path in description/title) and keyword match
                clean_path = gt["affected_path"].strip("/")
                path_match = (
                    gt["affected_path"] in f.affected_url
                    or clean_path in f.description.lower()
                    or clean_path in f.title.lower()
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
                for j in BENCHMARK_JOURNEYS:
                    if j["path"] in val:
                        tested_paths.add(j["journey_id"])
        for p in pages:
            for j in BENCHMARK_JOURNEYS:
                if j["path"] in p.url:
                    tested_paths.add(j["journey_id"])

        journey_coverage = round(len(tested_paths) / len(BENCHMARK_JOURNEYS), 4)

        return {
            "run_id": run.id,
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
                for bj in BENCHMARK_JOURNEYS
            ]
        }
