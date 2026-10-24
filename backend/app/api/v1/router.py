import os
import json
import uuid
import datetime
import asyncio
from typing import List, Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Response
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from backend.app.db.session import get_db, Base, engine, SessionLocal
from backend.app.db.models import (
    TestRun, ExploredPage, TestCase, TestExecution, BugFinding, Artifact, RunEvent,
    RegressionTest, RegressionExecution
)
from backend.app.schemas.qa_schemas import (
    RunCreateRequest, RunSummaryResponse, RunEventResponse, ExploredPageResponse,
    BugFindingResponse, TestExecutionResponse, RegressionTestResponse, RegressionRunResultResponse
)
from backend.app.core.config import settings
from backend.app.core.security import is_url_allowed
from backend.app.services.run_controller import RunController
from backend.app.services.report_builder import ReportBuilder
from backend.app.services.browser_manager import BrowserSession
from backend.app.services.browser_executor import BrowserExecutor

# Ensure DB tables are created
Base.metadata.create_all(bind=engine)

api_router = APIRouter()

# ----------------- Health & Config Status -----------------

@api_router.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        # Check database connectivity
        db.execute(Base.metadata.tables["test_runs"].select().limit(1))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": db_status,
        "environment": settings.APP_ENV,
        "artifacts_dir": settings.ARTIFACTS_DIR
    }

@api_router.get("/config/status")
def config_status():
    has_api_key = bool(settings.LLM_API_KEY and settings.LLM_API_KEY.strip())
    masked_key = (settings.LLM_API_KEY[:4] + "..." + settings.LLM_API_KEY[-4:]) if len(settings.LLM_API_KEY) > 8 else ("Configured" if has_api_key else "Not set")
    return {
        "llm_provider": settings.LLM_PROVIDER,
        "llm_model": settings.LLM_MODEL,
        "api_key_configured": has_api_key,
        "api_key_masked": masked_key,
        "demo_mode_active": (not has_api_key or settings.LLM_PROVIDER == "demo"),
        "allowed_hosts": settings.ALLOWED_HOSTS,
        "boundaries": {
            "max_pages": settings.MAX_PAGES_EXPLORE,
            "max_actions": settings.MAX_ACTIONS_PER_RUN,
            "max_duration_sec": settings.MAX_RUN_DURATION_SEC,
            "max_retries": settings.MAX_VERIFICATION_RETRIES
        }
    }

# ----------------- Test Runs -----------------

@api_router.post("/runs")
async def create_and_launch_run(
    req: RunCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # Validate target URL scheme and allowed hosts
    if not is_url_allowed(req.target_url):
        raise HTTPException(
            status_code=400,
            detail=f"Target URL '{req.target_url}' is not permitted by security boundary policy. Allowed hosts: {settings.ALLOWED_HOSTS}"
        )

    run_id = f"run-{uuid.uuid4().hex[:8]}"
    mode = "ai" if (settings.LLM_API_KEY and req.mode == "ai") else "demo"

    run = TestRun(
        id=run_id,
        target_url=req.target_url,
        description=req.description,
        status="created",
        mode=mode,
        objectives=req.objectives,
        boundaries=req.boundaries
    )
    db.add(run)
    db.commit()

    # Launch autonomous agent in background task
    background_tasks.add_task(RunController.execute_run_task, run_id)

    return {
        "run_id": run_id,
        "status": "created",
        "mode": mode,
        "message": f"Run {run_id} scheduled and launched in {mode.upper()} mode."
    }

@api_router.get("/runs", response_model=List[RunSummaryResponse])
def list_test_runs(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    runs = db.query(TestRun).order_by(TestRun.created_at.desc()).offset(skip).limit(limit).all()
    results = []
    for r in runs:
        results.append(RunSummaryResponse(
            id=r.id,
            target_url=r.target_url,
            description=r.description,
            status=r.status,
            mode=r.mode,
            start_time=r.start_time.isoformat() if r.start_time else "",
            end_time=r.end_time.isoformat() if r.end_time else None,
            duration_sec=r.duration_sec,
            total_tests=r.total_tests,
            passed_count=r.passed_count,
            failed_count=r.failed_count,
            blocked_count=r.blocked_count,
            findings_count=r.findings_count,
            error_summary=r.error_summary
        ))
    return results

@api_router.get("/runs/{run_id}", response_model=RunSummaryResponse)
def get_test_run(run_id: str, db: Session = Depends(get_db)):
    r = db.query(TestRun).filter(TestRun.id == run_id).first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    return RunSummaryResponse(
        id=r.id,
        target_url=r.target_url,
        description=r.description,
        status=r.status,
        mode=r.mode,
        start_time=r.start_time.isoformat() if r.start_time else "",
        end_time=r.end_time.isoformat() if r.end_time else None,
        duration_sec=r.duration_sec,
        total_tests=r.total_tests,
        passed_count=r.passed_count,
        failed_count=r.failed_count,
        blocked_count=r.blocked_count,
        findings_count=r.findings_count,
        error_summary=r.error_summary
    )

@api_router.get("/runs/{run_id}/events", response_model=List[RunEventResponse])
def get_run_events(run_id: str, db: Session = Depends(get_db)):
    events = db.query(RunEvent).filter(RunEvent.run_id == run_id).order_by(RunEvent.timestamp.asc()).all()
    return [
        RunEventResponse(
            id=e.id,
            run_id=e.run_id,
            timestamp=e.timestamp.isoformat(),
            stage=e.stage,
            agent_role=e.agent_role,
            event_type=e.event_type,
            message=e.message,
            details=e.details or {}
        )
        for e in events
    ]

@api_router.get("/runs/{run_id}/events/stream")
async def stream_run_events(run_id: str):
    """
    Real-time Server-Sent Events (SSE) stream yielding live execution events as they occur.
    Transports real backend events to the frontend in real time with reconnection support.
    """
    async def event_generator():
        seen_event_ids = set()
        retries_after_terminal = 0

        while True:
            db = SessionLocal()
            try:
                run = db.query(TestRun).filter(TestRun.id == run_id).first()
                if not run:
                    yield f"event: error\ndata: {json.dumps({'error': 'Run not found'})}\n\n"
                    break

                events = db.query(RunEvent).filter(
                    RunEvent.run_id == run_id
                ).order_by(RunEvent.timestamp.asc()).all()

                for e in events:
                    if e.id not in seen_event_ids:
                        seen_event_ids.add(e.id)
                        payload = {
                            "id": e.id,
                            "run_id": e.run_id,
                            "timestamp": e.timestamp.isoformat(),
                            "stage": e.stage,
                            "agent_role": e.agent_role,
                            "event_type": e.event_type,
                            "message": e.message,
                            "details": e.details or {},
                            "run_status": run.status
                        }
                        yield f"data: {json.dumps(payload)}\n\n"

                # Check if run reached a terminal state
                if run.status in ("completed", "failed", "cancelled"):
                    retries_after_terminal += 1
                    # Ensure all trailing events were flushed before closing
                    if retries_after_terminal >= 2:
                        terminal_payload = {
                            "stage": "terminal",
                            "event_type": "RUN_TERMINAL",
                            "message": f"Run execution finished with status: {run.status}",
                            "run_status": run.status
                        }
                        yield f"data: {json.dumps(terminal_payload)}\n\n"
                        break
            except Exception as ex:
                yield f"event: error\ndata: {json.dumps({'error': str(ex)})}\n\n"
                break
            finally:
                db.close()

            await asyncio.sleep(0.4)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@api_router.post("/runs/{run_id}/cancel")
def cancel_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(TestRun).filter(TestRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    RunController.request_cancellation(run_id)
    run.status = "cancelling"
    db.commit()
    return {"status": "cancelling", "message": f"Cancellation requested for run {run_id}"}

@api_router.get("/runs/{run_id}/tests")
def get_run_tests(run_id: str, db: Session = Depends(get_db)):
    tests = db.query(TestCase).filter(TestCase.run_id == run_id).all()
    executions = {e.test_case_id: e for e in db.query(TestExecution).filter(TestExecution.run_id == run_id).all()}
    findings = {f.test_execution_id: f for f in db.query(BugFinding).filter(BugFinding.run_id == run_id).all()}

    results = []
    for t in tests:
        exec_item = executions.get(t.id)
        finding_item = findings.get(exec_item.id) if exec_item else None
        
        screenshot_urls = []
        if exec_item and exec_item.screenshot_ids:
            screenshot_urls = [f"/api/v1/artifacts/{s_id}" for s_id in exec_item.screenshot_ids]

        results.append({
            "id": t.id,
            "test_case_id": t.id,
            "title": t.title,
            "category": t.category,
            "priority": t.priority,
            "priority_score": t.priority_score,
            "status": t.status,
            "duration_sec": exec_item.duration_sec if exec_item else 0.0,
            "retry_count": exec_item.retry_count if exec_item else 0,
            "preconditions": t.preconditions,
            "steps": t.steps,
            "assertions": t.assertions,
            "actual_observations": exec_item.actual_observations if exec_item else None,
            "assertion_results": exec_item.assertion_results if exec_item else [],
            "screenshot_urls": screenshot_urls,
            "console_logs": exec_item.console_logs if exec_item else [],
            "finding_id": finding_item.id if finding_item else None,
            "risk_reason": t.risk_reason,
            "curiosity_breakdown": t.curiosity_breakdown,
            "regression_eligible": t.regression_eligible
        })
    return results

# ----------------- Exploration & Site Map -----------------

@api_router.get("/runs/{run_id}/exploration", response_model=List[ExploredPageResponse])
def get_run_exploration(run_id: str, db: Session = Depends(get_db)):
    pages = db.query(ExploredPage).filter(ExploredPage.run_id == run_id).all()
    return [
        ExploredPageResponse(
            id=p.id,
            url=p.url,
            title=p.title,
            status=p.status,
            discovered_controls=p.discovered_controls or [],
            navigation_links=p.navigation_links or [],
            depth=p.depth
        )
        for p in pages
    ]

@api_router.get("/runs/{run_id}/site-map")
def get_run_site_map(run_id: str, db: Session = Depends(get_db)):
    pages = db.query(ExploredPage).filter(ExploredPage.run_id == run_id).all()
    tests = db.query(TestCase).filter(TestCase.run_id == run_id).all()

    nodes = []
    edges = []
    visited_urls = set()

    for idx, p in enumerate(pages):
        visited_urls.add(p.url)
        # Find tests targeting this page or category
        associated_tests = [t.title for t in tests if (t.category.lower() in p.url.lower()) or (p.title and t.category in p.title)]
        nodes.append({
            "id": p.id,
            "url": p.url,
            "label": p.title or p.url,
            "status": p.status,
            "controls_count": len(p.discovered_controls or []),
            "associated_tests": associated_tests
        })

        # Add edges
        for link in (p.navigation_links or []):
            edges.append({
                "source": p.id,
                "target": link,
                "label": "navigates_to"
            })

    return {
        "nodes": nodes,
        "edges": edges,
        "total_nodes": len(nodes),
        "total_edges": len(edges)
    }

# ----------------- Bug Findings -----------------

@api_router.get("/bugs", response_model=List[BugFindingResponse])
def list_bug_findings(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(BugFinding)
    if severity:
        query = query.filter(BugFinding.severity == severity)
    if status:
        query = query.filter(BugFinding.status == status)
    
    findings = query.order_by(BugFinding.created_at.desc()).all()
    return [
        BugFindingResponse(
            id=f.id,
            run_id=f.run_id,
            test_execution_id=f.test_execution_id,
            title=f.title,
            description=f.description,
            affected_url=f.affected_url,
            severity=f.severity,
            severity_reason=f.severity_reason,
            status=f.status,
            confidence_score=f.confidence_score,
            verification_notes=f.verification_notes,
            expected_behavior=f.expected_behavior,
            actual_behavior=f.actual_behavior,
            reproduction_steps=f.reproduction_steps or [],
            screenshot_url=f.screenshot_url,
            console_errors=f.console_errors or [],
            replay_attempts=f.replay_attempts,
            created_at=f.created_at.isoformat()
        )
        for f in findings
    ]

@api_router.get("/bugs/{bug_id}", response_model=BugFindingResponse)
def get_bug_finding(bug_id: str, db: Session = Depends(get_db)):
    f = db.query(BugFinding).filter(BugFinding.id == bug_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Bug finding not found")
    return BugFindingResponse(
        id=f.id,
        run_id=f.run_id,
        test_execution_id=f.test_execution_id,
        title=f.title,
        description=f.description,
        affected_url=f.affected_url,
        severity=f.severity,
        severity_reason=f.severity_reason,
        status=f.status,
        confidence_score=f.confidence_score,
        verification_notes=f.verification_notes,
        expected_behavior=f.expected_behavior,
        actual_behavior=f.actual_behavior,
        reproduction_steps=f.reproduction_steps or [],
        screenshot_url=f.screenshot_url,
        console_errors=f.console_errors or [],
        replay_attempts=f.replay_attempts,
        created_at=f.created_at.isoformat()
    )

@api_router.get("/runs/{run_id}/bugs", response_model=List[BugFindingResponse])
def get_run_bugs(run_id: str, db: Session = Depends(get_db)):
    findings = db.query(BugFinding).filter(BugFinding.run_id == run_id).all()
    return [
        BugFindingResponse(
            id=f.id,
            run_id=f.run_id,
            test_execution_id=f.test_execution_id,
            title=f.title,
            description=f.description,
            affected_url=f.affected_url,
            severity=f.severity,
            severity_reason=f.severity_reason,
            status=f.status,
            confidence_score=f.confidence_score,
            verification_notes=f.verification_notes,
            expected_behavior=f.expected_behavior,
            actual_behavior=f.actual_behavior,
            reproduction_steps=f.reproduction_steps or [],
            screenshot_url=f.screenshot_url,
            console_errors=f.console_errors or [],
            replay_attempts=f.replay_attempts,
            created_at=f.created_at.isoformat()
        )
        for f in findings
    ]

# ----------------- Artifact Evidence Serving -----------------

@api_router.get("/artifacts/{artifact_id}")
def get_artifact(artifact_id: str, db: Session = Depends(get_db)):
    art = db.query(Artifact).filter(Artifact.id == artifact_id).first()
    # If not in DB, search artifacts dir directly for safety
    if not art:
        for f in os.listdir(settings.ARTIFACTS_DIR):
            if artifact_id in f:
                full_path = os.path.join(settings.ARTIFACTS_DIR, f)
                return FileResponse(full_path, media_type="image/png")
        raise HTTPException(status_code=404, detail="Artifact not found")

    target_path = art.file_path if os.path.exists(art.file_path) else None
    if not target_path and os.path.exists(settings.ARTIFACTS_DIR):
        for f in os.listdir(settings.ARTIFACTS_DIR):
            if artifact_id in f:
                target_path = os.path.join(settings.ARTIFACTS_DIR, f)
                break

    if not target_path or not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail="Artifact file missing from storage")

    return FileResponse(target_path, media_type=art.content_type or "image/png", filename=art.file_name)

# ----------------- Regression Tests -----------------

@api_router.get("/regression-tests", response_model=List[RegressionTestResponse])
def list_regression_tests(db: Session = Depends(get_db)):
    tests = db.query(RegressionTest).order_by(RegressionTest.created_at.desc()).all()
    return [
        RegressionTestResponse(
            id=rt.id,
            name=rt.name,
            target_url=rt.target_url,
            original_run_id=rt.original_run_id,
            original_test_id=rt.original_test_id,
            steps_count=len(rt.structured_steps or []),
            assertions_count=len(rt.assertions or []),
            created_at=rt.created_at.isoformat(),
            last_run_at=rt.last_run_at.isoformat() if rt.last_run_at else None,
            last_status=rt.last_status,
            executions_count=rt.executions_count
        )
        for rt in tests
    ]

@api_router.post("/regression-tests")
def save_regression_test(
    test_id: str = Query(..., description="ID of passed test case to save"),
    run_id: str = Query(..., description="ID of run"),
    db: Session = Depends(get_db)
):
    tc = db.query(TestCase).filter(TestCase.id == test_id, TestCase.run_id == run_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    run = db.query(TestRun).filter(TestRun.id == run_id).first()

    reg_id = f"reg-{uuid.uuid4().hex[:8]}"
    reg_test = RegressionTest(
        id=reg_id,
        name=f"Regression: {tc.title}",
        target_url=run.target_url if run else "",
        original_run_id=run_id,
        original_test_id=tc.id,
        structured_steps=tc.steps,
        expected_outcomes=tc.expected_results,
        assertions=tc.assertions,
        last_status="Passed",
        executions_count=1
    )
    db.add(reg_test)
    db.commit()

    return {"id": reg_id, "message": f"Successfully saved '{tc.title}' as reusable regression test."}

@api_router.post("/regression-tests/run-all")
async def rerun_all_regression_tests(db: Session = Depends(get_db)):
    """Executes all saved regression tests sequentially and calculates regression diffs."""
    tests = db.query(RegressionTest).all()
    if not tests:
        return {
            "total_executed": 0,
            "passed": 0,
            "failed": 0,
            "regressions_detected": 0,
            "fixes_detected": 0,
            "details": [],
            "message": "No regression tests in suite to execute."
        }

    browser_session = BrowserSession(run_id="suite_regression_run")
    await browser_session.initialize(headless=settings.BROWSER_HEADLESS)

    results = []
    passed_cnt = 0
    failed_cnt = 0
    regressions_cnt = 0
    fixes_cnt = 0

    try:
        executor = BrowserExecutor(browser_session=browser_session)
        for rt in tests:
            t_start = datetime.datetime.now(datetime.timezone.utc)
            exec_res = await executor.execute_test({
                "steps": rt.structured_steps,
                "assertions": rt.assertions
            })
            t_end = datetime.datetime.now(datetime.timezone.utc)
            duration = (t_end - t_start).total_seconds()

            new_status = exec_res["status"]
            prev_status = rt.last_status

            if prev_status == "Passed" and new_status == "Failed":
                diff = f"REGRESSION DETECTED! Previously Passed, now Failed ({exec_res.get('execution_error') or 'Assertion failed'})."
                regressions_cnt += 1
                failed_cnt += 1
            elif prev_status == "Failed" and new_status == "Passed":
                diff = "FIX VERIFIED! Previously Failed, now Passed."
                fixes_cnt += 1
                passed_cnt += 1
            elif new_status == "Passed":
                diff = f"Stable: PASSED in {duration:.2f}s."
                passed_cnt += 1
            else:
                diff = f"Persistent Failure: {new_status}."
                failed_cnt += 1

            rt.last_status = new_status
            rt.last_run_at = datetime.datetime.now(datetime.timezone.utc)
            rt.executions_count += 1

            exec_id = f"reg-exec-{uuid.uuid4().hex[:8]}"
            reg_exec = RegressionExecution(
                id=exec_id,
                regression_test_id=rt.id,
                status=new_status,
                previous_status=prev_status,
                duration_sec=duration,
                diff_summary=diff
            )
            db.add(reg_exec)

            results.append({
                "test_id": rt.id,
                "name": rt.name,
                "status": new_status,
                "previous_status": prev_status,
                "duration_sec": duration,
                "diff_summary": diff
            })

        db.commit()

        return {
            "total_executed": len(tests),
            "passed": passed_cnt,
            "failed": failed_cnt,
            "regressions_detected": regressions_cnt,
            "fixes_detected": fixes_cnt,
            "details": results,
            "executed_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
    finally:
        await browser_session.close()

@api_router.post("/regression-tests/{test_id}/run", response_model=RegressionRunResultResponse)
async def rerun_regression_test(test_id: str, db: Session = Depends(get_db)):
    reg_test = db.query(RegressionTest).filter(RegressionTest.id == test_id).first()
    if not reg_test:
        raise HTTPException(status_code=404, detail="Regression test not found")

    browser_session = BrowserSession(run_id=f"reg_run_{reg_test.id}")
    await browser_session.initialize(headless=settings.BROWSER_HEADLESS)

    try:
        executor = BrowserExecutor(browser_session=browser_session)
        t_start = datetime.datetime.now(datetime.timezone.utc)
        result = await executor.execute_test({
            "steps": reg_test.structured_steps,
            "assertions": reg_test.assertions
        })
        t_end = datetime.datetime.now(datetime.timezone.utc)
        duration = (t_end - t_start).total_seconds()

        new_status = result["status"]
        prev_status = reg_test.last_status

        # Compare historical results
        if prev_status == "Passed" and new_status == "Failed":
            diff = f"REGRESSION DETECTED! Previously PASSED, now FAILED ({result.get('execution_error') or 'Assertion failed'})."
        elif prev_status == "Failed" and new_status == "Passed":
            diff = "Fixed: Previously FAILED, now PASSED."
        else:
            diff = f"Status unchanged: {new_status} (Ran in {duration:.2f}s)."

        reg_test.last_status = new_status
        reg_test.last_run_at = datetime.datetime.now(datetime.timezone.utc)
        reg_test.executions_count += 1

        exec_id = f"reg-exec-{uuid.uuid4().hex[:8]}"
        reg_exec = RegressionExecution(
            id=exec_id,
            regression_test_id=reg_test.id,
            status=new_status,
            previous_status=prev_status,
            duration_sec=duration,
            diff_summary=diff
        )
        db.add(reg_exec)
        db.commit()

        return RegressionRunResultResponse(
            execution_id=exec_id,
            test_id=reg_test.id,
            status=new_status,
            previous_status=prev_status,
            duration_sec=duration,
            diff_summary=diff,
            executed_at=datetime.datetime.now(datetime.timezone.utc).isoformat()
        )
    finally:
        await browser_session.close()

# ----------------- Planted-Bug Benchmark & Quality Metrics -----------------

@api_router.get("/benchmark/ground-truth")
def get_benchmark_ground_truth():
    from backend.app.services.benchmark_service import SEEDED_GROUND_TRUTH, BENCHMARK_JOURNEYS
    return {
        "planted_defects": SEEDED_GROUND_TRUTH,
        "benchmark_journeys": BENCHMARK_JOURNEYS,
        "total_planted": len(SEEDED_GROUND_TRUTH),
        "total_journeys": len(BENCHMARK_JOURNEYS)
    }

@api_router.get("/benchmark/results/{run_id}")
def get_run_benchmark_results(run_id: str, db: Session = Depends(get_db)):
    from backend.app.services.benchmark_service import BenchmarkService
    try:
        report = BenchmarkService.evaluate_run(db, run_id)
        return report
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@api_router.post("/benchmark/run")
async def execute_benchmark_suite(
    target_url: str = Query("http://127.0.0.1:5001", description="Benchmark target web application"),
    db: Session = Depends(get_db)
):
    """
    Executes a complete benchmark run against the target application,
    evaluates findings against the ground truth defect registry, and returns calculated quality metrics.
    """
    from backend.app.services.benchmark_service import BenchmarkService

    # 1. Reset demo state if target is local DevStore
    if "5001" in target_url or "devstore" in target_url:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post("http://127.0.0.1:5001/api/reset")
        except Exception:
            pass

    # 2. Launch autonomous QA run
    run_id = f"bench-{uuid.uuid4().hex[:8]}"
    run = TestRun(
        id=run_id,
        target_url=target_url,
        description="Autonomous Benchmark Evaluation: Verify e-commerce catalog, form validation, cart arithmetic, checkout idempotency, and access controls against planted ground truth.",
        status="created",
        mode="demo",
        objectives=["Functional testing", "Form validation", "Business-rule testing", "Negative testing"]
    )
    db.add(run)
    db.commit()

    # Execute synchronously to produce immediate verified benchmark result
    await RunController.execute_run_task(run_id)

    # 3. Evaluate results against ground-truth registry
    eval_report = BenchmarkService.evaluate_run(db, run_id)
    return eval_report

# ----------------- Report Exporting -----------------

@api_router.get("/bugs/{bug_id}/export")
def export_bug_report(
    bug_id: str,
    format: Literal["html", "json", "markdown"] = Query("html"),
    db: Session = Depends(get_db)
):
    finding = db.query(BugFinding).filter(BugFinding.id == bug_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    run = db.query(TestRun).filter(TestRun.id == finding.run_id).first()
    run_dict = {"id": run.id if run else "N/A", "target_url": run.target_url if run else "N/A"}

    finding_dict = {
        "id": finding.id,
        "title": finding.title,
        "severity": finding.severity,
        "status": finding.status,
        "affected_url": finding.affected_url,
        "expected_behavior": finding.expected_behavior,
        "actual_behavior": finding.actual_behavior,
        "reproduction_steps": finding.reproduction_steps or [],
        "screenshot_url": finding.screenshot_url,
        "verification_notes": finding.verification_notes,
        "replay_attempts": finding.replay_attempts,
        "confidence_score": finding.confidence_score,
        "created_at": finding.created_at.isoformat()
    }

    if format == "json":
        return JSONResponse(content=finding_dict)
    elif format == "markdown":
        md_content = ReportBuilder.generate_markdown_bug_report(finding_dict, run_dict)
        return Response(content=md_content, media_type="text/markdown", headers={"Content-Disposition": f"attachment; filename={bug_id}.md"})
    else:
        html_content = ReportBuilder.generate_html_bug_report(finding_dict, run_dict)
        return HTMLResponse(content=html_content)

@api_router.get("/runs/{run_id}/export")
def export_run_report(
    run_id: str,
    format: Literal["json", "junit"] = Query("json"),
    db: Session = Depends(get_db)
):
    run = db.query(TestRun).filter(TestRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    tests = db.query(TestCase).filter(TestCase.run_id == run_id).all()
    findings = db.query(BugFinding).filter(BugFinding.run_id == run_id).all()

    test_dicts = [
        {
            "id": t.id,
            "title": t.title,
            "category": t.category,
            "priority": t.priority,
            "priority_score": t.priority_score,
            "status": t.status,
            "risk_reason": t.risk_reason
        }
        for t in tests
    ]
    finding_dicts = [
        {
            "id": f.id,
            "title": f.title,
            "severity": f.severity,
            "status": f.status,
            "reproduction_steps": f.reproduction_steps,
            "expected": f.expected_behavior,
            "actual": f.actual_behavior
        }
        for f in findings
    ]

    if format == "junit":
        run_dict = {"id": run.id, "duration_sec": run.duration_sec}
        xml_content = ReportBuilder.generate_junit_xml_report(run_dict, test_dicts, finding_dicts)
        return Response(content=xml_content, media_type="application/xml", headers={"Content-Disposition": f"attachment; filename={run_id}_junit.xml"})

    export_data = {
        "run_id": run.id,
        "target_url": run.target_url,
        "description": run.description,
        "status": run.status,
        "mode": run.mode,
        "duration_sec": run.duration_sec,
        "total_tests": run.total_tests,
        "passed_count": run.passed_count,
        "failed_count": run.failed_count,
        "findings_count": run.findings_count,
        "tests": test_dicts,
        "findings": finding_dicts
    }
    return JSONResponse(content=export_data)
