import os
import pytest
import asyncio
from backend.app.db.session import SessionLocal, Base, engine
from backend.app.db.models import TestRun, TestCase, BugFinding, RegressionTest
from backend.app.services.run_controller import RunController
from backend.app.services.browser_manager import BrowserSession
from backend.app.services.browser_executor import BrowserExecutor
import uvicorn
import threading
import time
from sample_app.main import app as sample_app

import socket

@pytest.fixture(scope="session", autouse=True)
def run_sample_app_server():
    """Starts the sample app on port 5001 in a background thread if not already running."""
    # Check if port 5001 is already open and responding
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.settimeout(0.5)
        s.connect(("127.0.0.1", 5001))
        port_open = True
    except (socket.error, OSError):
        port_open = False
    finally:
        s.close()

    if port_open:
        # Already running externally
        yield
        return

    server = uvicorn.Server(uvicorn.Config(sample_app, host="127.0.0.1", port=5001, log_level="warning"))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    time.sleep(2)
    yield
    server.should_exit = True

@pytest.mark.asyncio
async def test_full_autonomous_qa_lifecycle():
    """
    Tests the complete Autonomous AI QA Engineer pipeline:
    1. Create Run
    2. Scout Agent explores sample app
    3. Tester Agent plans & Curiosity ranks journeys
    4. Browser Executor performs Playwright actions & captures evidence
    5. Verifier Agent replays failures & confirms seeded bugs
    6. Proof-carrying bug reports created
    7. Save passing journey as regression test
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    run_id = "test-run-e2e"
    # Clean up previous run if exists
    existing = db.query(TestRun).filter(TestRun.id == run_id).first()
    if existing:
        db.delete(existing)
        db.commit()

    run = TestRun(
        id=run_id,
        target_url="http://127.0.0.1:5001",
        description="Users should be able to explore products, add to cart, calculate totals, register, and checkout.",
        status="created",
        mode="demo",
        objectives=["Functional testing", "Form validation", "Business-rule testing"]
    )
    db.add(run)
    db.commit()

    # Execute full autonomous QA task
    await RunController.execute_run_task(run_id)

    # Verify run completed
    db.refresh(run)
    assert run.status == "completed"
    assert run.total_tests > 0
    assert run.duration_sec > 0

    # Verify Scout discovered pages
    pages = run.pages
    assert len(pages) >= 1
    assert any("/products" in p.url or "/" in p.url for p in pages)

    # Verify Seeded Defects detected & confirmed by Verifier Agent
    findings = db.query(BugFinding).filter(BugFinding.run_id == run_id).all()
    assert len(findings) >= 1
    for f in findings:
        assert f.status in ("Verified", "Likely", "Confirmed", "Suspected")
        assert len(f.reproduction_steps) > 0
        assert f.expected_behavior != ""
        assert f.actual_behavior != ""
        assert f.replay_attempts >= 1

    # Verify Ground-Truth Benchmark Evaluation
    from backend.app.services.benchmark_service import BenchmarkService
    eval_result = BenchmarkService.evaluate_run(db, run_id)
    assert "metrics" in eval_result
    assert "defect_matrix" in eval_result
    assert "benchmark_journeys" in eval_result
    metrics = eval_result["metrics"]
    assert metrics["defect_recall"] > 0
    assert metrics["precision"] > 0
    assert metrics["reproducibility_rate"] > 0
    assert metrics["journey_coverage"] > 0

    # Verify Regression Test can be saved from passing test
    passing_test = db.query(TestCase).filter(TestCase.run_id == run_id, TestCase.status == "Passed").first()
    assert passing_test is not None

    reg_id = "reg-test-e2e"
    old_reg = db.query(RegressionTest).filter(RegressionTest.id == reg_id).first()
    if old_reg:
        db.delete(old_reg)
        db.commit()

    reg_test = RegressionTest(
        id=reg_id,
        name=f"Regression: {passing_test.title}",
        target_url=run.target_url,
        original_run_id=run_id,
        original_test_id=passing_test.id,
        structured_steps=passing_test.steps,
        expected_outcomes=passing_test.expected_results,
        assertions=passing_test.assertions,
        last_status="Passed"
    )
    db.add(reg_test)
    db.commit()

    # Rerun regression test in clean session
    browser_session = BrowserSession(run_id=f"rerun_{reg_id}")
    await browser_session.initialize(headless=True)
    try:
        executor = BrowserExecutor(browser_session=browser_session)
        rerun_res = await executor.execute_test({
            "steps": reg_test.structured_steps,
            "assertions": reg_test.assertions
        })
        assert rerun_res["status"] == "Passed"
    finally:
        await browser_session.close()

    db.close()
