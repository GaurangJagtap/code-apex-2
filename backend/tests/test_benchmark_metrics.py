import pytest
from backend.app.services.benchmark_service import BenchmarkService, SEEDED_GROUND_TRUTH
from backend.app.db.models import TestRun, TestCase, BugFinding, ExploredPage
from backend.app.db.session import SessionLocal, Base, engine

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()

def test_zero_findings_metric_safety(db_session):
    """Verifies that runs with zero findings do not raise ZeroDivisionError and compute consistent baseline metrics."""
    run_id = "test-metric-zero-run"
    db_session.query(TestRun).filter(TestRun.id == run_id).delete()
    db_session.commit()

    run = TestRun(
        id=run_id,
        target_url="http://127.0.0.1:5001",
        description="Zero findings baseline test",
        status="completed",
        mode="demo"
    )
    db_session.add(run)
    db_session.commit()

    report = BenchmarkService.evaluate_run(db_session, run_id)
    metrics = report["metrics"]

    assert metrics["defect_recall"] == 0.0
    assert metrics["defect_recall_percent"] == "0.0%"
    assert metrics["precision"] == 1.0 # Standard mathematical convention: no false positives reported
    assert metrics["reproducibility_rate"] == 1.0
    assert metrics["true_positives"] == 0
    assert metrics["false_positives"] == 0
    assert metrics["total_planted_defects"] == 5

def test_seeded_defect_matching_and_metrics(db_session):
    """Verifies defect recall, precision, and defect matrix mapping with confirmed seeded bugs."""
    run_id = "test-metric-seeded-run"
    # Clean previous
    db_session.query(BugFinding).filter(BugFinding.run_id == run_id).delete()
    db_session.query(TestRun).filter(TestRun.id == run_id).delete()
    db_session.commit()

    run = TestRun(
        id=run_id,
        target_url="http://127.0.0.1:5001",
        description="Seeded benchmark test",
        status="completed",
        mode="demo"
    )
    db_session.add(run)

    # 1. Add matching finding for BUG-01 (/register email)
    f1 = BugFinding(
        id="BUG-MATCH-01",
        run_id=run_id,
        title="Defect in User Registration with Malformed Email Format",
        description="Form validation accepts malformed email missing @ domain.",
        affected_url="http://127.0.0.1:5001/register",
        severity="Medium",
        status="Verified",
        confidence_score=0.98,
        expected_behavior="Reject invalid email format",
        actual_behavior="Accepted invalid format without error",
        replay_attempts=2
    )

    # 2. Add matching finding for BUG-02 (/cart subtotal)
    f2 = BugFinding(
        id="BUG-MATCH-02",
        run_id=run_id,
        title="Defect in Cart Subtotal Recomputation on Quantity Change",
        description="Cart subtotal calculation arithmetic desync.",
        affected_url="http://127.0.0.1:5001/cart",
        severity="High",
        status="Verified",
        confidence_score=0.98,
        expected_behavior="Subtotal dynamically updates",
        actual_behavior="Subtotal remains frozen",
        replay_attempts=2
    )

    # 3. Add an arbitrary False Positive finding
    f_fp = BugFinding(
        id="BUG-FP-01",
        run_id=run_id,
        title="Unexpected Banner Color Discrepancy",
        description="Brand banner hex code differed from visual guide.",
        affected_url="http://127.0.0.1:5001/about-us",
        severity="Low",
        status="Likely",
        confidence_score=0.70,
        expected_behavior="Emerald green banner",
        actual_behavior="Teal banner",
        replay_attempts=1
    )

    db_session.add_all([f1, f2, f_fp])
    db_session.commit()

    report = BenchmarkService.evaluate_run(db_session, run_id)
    metrics = report["metrics"]

    # 2 TP out of 5 planted = 40% recall
    assert metrics["true_positives"] == 2
    assert metrics["defect_recall"] == 0.4
    assert metrics["defect_recall_percent"] == "40.0%"

    # 1 FP reported out of 3 total reported = 2/3 = ~66.7% precision
    assert metrics["false_positives"] == 1
    assert metrics["total_findings_reported"] == 3
    assert abs(metrics["precision"] - 0.6667) < 0.001

    # Check defect matrix
    detected_ids = [d["defect_id"] for d in report["defect_matrix"] if d["status"] == "Detected"]
    assert "BUG-01" in detected_ids
    assert "BUG-02" in detected_ids
    assert len(report["unmatched_findings"]) == 1
    assert report["unmatched_findings"][0]["id"] == "BUG-FP-01"
