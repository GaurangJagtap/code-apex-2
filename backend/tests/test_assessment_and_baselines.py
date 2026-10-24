import pytest
from backend.app.services.benchmark_service import (
    BenchmarkService,
    SEEDED_GROUND_TRUTH,
    ASSESSMENT_GROUND_TRUTH,
    ASSESSMENT_JOURNEYS
)
from backend.app.db.models import (
    TestRun,
    TestCase,
    TestExecution,
    BugFinding,
    BehavioralBaseline,
    RegressionTest
)
from backend.app.db.session import SessionLocal, init_db
from backend.app.agents.verifier_agent import VerifierAgent, BUG_TAXONOMY_CATEGORIES
from backend.app.services.assertions import AssertionEngine

@pytest.fixture(scope="module")
def db_session():
    init_db()
    session = SessionLocal()
    yield session
    session.close()

def test_assessment_ground_truth_registry():
    """Verify assessment benchmark registry contains 5 distinct seeded defects and 7 journeys."""
    assert len(ASSESSMENT_GROUND_TRUTH) == 5
    defect_ids = [d["defect_id"] for d in ASSESSMENT_GROUND_TRUTH]
    assert "ASSESS-01" in defect_ids  # Question reset on reload
    assert "ASSESS-02" in defect_ids  # Double submission duplicate
    assert "ASSESS-03" in defect_ids  # Score calculation arithmetic error
    assert "ASSESS-04" in defect_ids  # Candidate unauthorized score access
    assert "ASSESS-05" in defect_ids  # Invalid email boundary acceptance

    assert len(ASSESSMENT_JOURNEYS) == 7
    journey_ids = [j["journey_id"] for j in ASSESSMENT_JOURNEYS]
    assert "JRN-A01" in journey_ids
    assert "JRN-A04" in journey_ids

def test_assessment_benchmark_evaluation(db_session):
    """Test dynamic benchmark evaluation against the assessment ground truth."""
    import uuid
    run_id = f"test-assessment-run-{uuid.uuid4().hex[:6]}"
    
    # 1. Create run
    run = TestRun(
        id=run_id,
        target_url="http://127.0.0.1:5001/assessment",
        description="Assessment evaluation benchmark test",
        mode="deep_verification",
        status="completed"
    )
    db_session.merge(run)
    db_session.commit()

    # 2. Add matching bug finding for ASSESS-01 and ASSESS-02
    b1 = BugFinding(
        id=f"BUG-ASSESS-01-{uuid.uuid4().hex[:6]}",
        run_id=run_id,
        title="Candidate Question 3 State Reset on Page Reload",
        description="Candidate question 3 state was cleared upon refreshing the examination page.",
        affected_url="http://127.0.0.1:5001/assessment/test",
        category="Session, recovery, and interrupted workflows",
        severity="High",
        status="Confirmed",
        confidence_score=0.96,
        trust_score=0.94,
        expected_behavior="Candidate answers must persist across refresh",
        actual_behavior="Question 3 answer wiped on reload",
        reproduction_steps=["Open test", "Answer Q3", "Reload page"],
        replay_attempts=2
    )
    b2 = BugFinding(
        id=f"BUG-ASSESS-02-{uuid.uuid4().hex[:6]}",
        run_id=run_id,
        title="Double Submission Duplicate Order Creation",
        description="Rapid duplicate clicks on submit create multiple completed submissions.",
        affected_url="http://127.0.0.1:5001/assessment/submit",
        category="Transaction and workflow integrity",
        severity="High",
        status="Confirmed",
        confidence_score=0.95,
        trust_score=0.92,
        expected_behavior="Submission must be idempotent",
        actual_behavior="Duplicate records created",
        reproduction_steps=["Click submit twice rapidly"],
        replay_attempts=2
    )
    db_session.add_all([b1, b2])
    db_session.commit()

    # 3. Evaluate benchmark with suite='assessment'
    bench_service = BenchmarkService()
    report = bench_service.evaluate_run(run_id=run_id, db=db_session, suite="assessment")

    assert report["suite"] == "assessment"
    assert report["metrics"]["total_planted_defects"] == 5
    assert report["metrics"]["true_positives"] >= 2
    assert report["metrics"]["defect_recall"] >= 0.40
    assert report["metrics"]["precision"] > 0
    assert len(report["defect_matrix"]) == 5

def test_behavioral_baseline_persistence(db_session):
    """Test creating and retrieving behavioral baselines and rules."""
    import uuid
    base_id = f"RULE-ASSESS-{uuid.uuid4().hex[:6]}"
    baseline = BehavioralBaseline(
        id=base_id,
        name="Assessment Candidate Session Answer Recovery Invariant",
        target_domain="assessment",
        category="Session, recovery, and interrupted workflows",
        source_type="deterministic_invariant",
        version="v1.0",
        rule_definition={"rule_type": "invariant", "rule": "session.answers.length == saved.length"},
        expected_state={"answers_saved": True},
        is_approved=True
    )
    db_session.merge(baseline)
    db_session.commit()

    fetched = db_session.query(BehavioralBaseline).filter_by(id=base_id).first()
    assert fetched is not None
    assert fetched.is_approved is True
    assert fetched.target_domain == "assessment"
    assert fetched.source_type == "deterministic_invariant"

def test_verifier_agent_states_and_trust_engine():
    """Verify Verifier Agent verification states, trust score calculator, and 10 bug taxonomy categories."""
    verifier = VerifierAgent(browser_executor=None, max_retries=1)
    assert len(BUG_TAXONOMY_CATEGORIES) == 10
    assert "Transaction and workflow integrity" in BUG_TAXONOMY_CATEGORIES
    assert "Session, recovery, and interrupted workflows" in BUG_TAXONOMY_CATEGORIES

    # Trust score calculation with high expectation strength & reproduction
    trust_data = verifier.calculate_trust_score(
        expectation_source="deterministic_invariant",
        initial_result={"screenshot_ids": ["s1"], "step_logs": ["step1"]},
        reproduced_count=2,
        replay_attempts=2,
        failed_assertions=[{"type": "text_contains", "passed": False}]
    )
    assert trust_data["trust_score"] >= 0.85
    assert trust_data["components"]["reproducibility"] == 1.0
    assert trust_data["components"]["independent_check"] == 1.0
    assert len(trust_data["signals"]) > 0

    # Inconclusive scenario (no reproduction, weak source)
    weak_trust = verifier.calculate_trust_score(
        expectation_source="llm_hypothesis",
        initial_result={"screenshot_ids": [], "step_logs": [], "execution_error": "Timeout waiting for selector"},
        reproduced_count=0,
        replay_attempts=2,
        failed_assertions=[]
    )
    assert weak_trust["trust_score"] < 0.65
    assert weak_trust["components"]["reproducibility"] == 0.0

@pytest.mark.asyncio
async def test_assertion_engine_new_invariants():
    """Verify new deterministic assertions added to AssertionEngine."""
    from unittest.mock import AsyncMock, MagicMock
    engine = AssertionEngine()

    mock_page = MagicMock()
    mock_page.content = AsyncMock(return_value="<html><body><h1>Order Confirmed</h1><div id='cart-subtotal'>$99.00</div></body></html>")
    
    mock_locator = MagicMock()
    mock_locator.count = AsyncMock(return_value=1)
    mock_locator.inner_text = AsyncMock(return_value="$99.00")
    mock_locator.first = mock_locator
    mock_page.locator = MagicMock(return_value=mock_locator)

    # Test text_not_contains assertion
    res_not_contains = await engine.evaluate_assertion(mock_page, {
        "type": "text_not_contains",
        "target": "body",
        "expected": "Fatal 500 Error"
    })
    assert res_not_contains["passed"] is True

    # Test cart_total_matches assertion
    res_cart = await engine.evaluate_assertion(mock_page, {
        "type": "cart_total_matches",
        "target": "#cart-subtotal",
        "expected": "99.00"
    })
    assert res_cart["passed"] is True

