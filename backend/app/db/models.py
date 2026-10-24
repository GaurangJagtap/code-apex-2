import datetime
from sqlalchemy import Column, String, Integer, Float, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.db.session import Base

def get_utc_now():
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

class Application(Base):
    __tablename__ = "applications"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    base_url = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)

class TestRun(Base):
    __test__ = False
    __tablename__ = "test_runs"

    id = Column(String(50), primary_key=True, index=True)
    target_url = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="created") # created, initializing, exploring, planning, executing, verifying, reporting, completed, failed, cancelling, cancelled
    mode = Column(String(20), default="demo") # demo or ai
    objectives = Column(JSON, default=list)
    boundaries = Column(JSON, default=dict)
    
    start_time = Column(DateTime, default=get_utc_now)
    end_time = Column(DateTime, nullable=True)
    duration_sec = Column(Float, default=0.0)
    
    total_tests = Column(Integer, default=0)
    passed_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    blocked_count = Column(Integer, default=0)
    findings_count = Column(Integer, default=0)
    
    error_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)

    # Relationships
    pages = relationship("ExploredPage", back_populates="run", cascade="all, delete-orphan")
    tests = relationship("TestCase", back_populates="run", cascade="all, delete-orphan")
    findings = relationship("BugFinding", back_populates="run", cascade="all, delete-orphan")
    events = relationship("RunEvent", back_populates="run", cascade="all, delete-orphan")
    artifacts = relationship("Artifact", back_populates="run", cascade="all, delete-orphan")

class ExploredPage(Base):
    __tablename__ = "explored_pages"

    id = Column(String(50), primary_key=True, index=True)
    run_id = Column(String(50), ForeignKey("test_runs.id"), nullable=False, index=True)
    url = Column(String(500), nullable=False)
    title = Column(String(300), nullable=True)
    status = Column(String(50), default="visited") # discovered, visited, failed
    discovered_controls = Column(JSON, default=list) # inputs, buttons, links
    navigation_links = Column(JSON, default=list)
    depth = Column(Integer, default=0)
    visited_at = Column(DateTime, default=get_utc_now)

    run = relationship("TestRun", back_populates="pages")

class TestCase(Base):
    __test__ = False
    __tablename__ = "test_cases"

    id = Column(String(50), primary_key=True, index=True)
    run_id = Column(String(50), ForeignKey("test_runs.id"), nullable=False, index=True)
    title = Column(String(300), nullable=False)
    category = Column(String(100), default="Functional")
    priority = Column(String(20), default="High") # High, Medium, Low
    priority_score = Column(Float, default=0.0)
    preconditions = Column(Text, nullable=True)
    steps = Column(JSON, default=list) # List of actions
    expected_results = Column(JSON, default=list)
    assertions = Column(JSON, default=list)
    status = Column(String(50), default="Planned") # Planned, Running, Passed, Failed, Blocked
    risk_reason = Column(Text, nullable=True)
    curiosity_breakdown = Column(JSON, default=dict) # impact, uncertainty, novelty, gap
    regression_eligible = Column(Boolean, default=False)
    created_at = Column(DateTime, default=get_utc_now)

    run = relationship("TestRun", back_populates="tests")
    executions = relationship("TestExecution", back_populates="test_case", cascade="all, delete-orphan")

class TestExecution(Base):
    __test__ = False
    __tablename__ = "test_executions"

    id = Column(String(50), primary_key=True, index=True)
    test_case_id = Column(String(50), ForeignKey("test_cases.id"), nullable=False, index=True)
    run_id = Column(String(50), ForeignKey("test_runs.id"), nullable=False, index=True)
    status = Column(String(50), default="Running") # Passed, Failed, Blocked, Inconclusive
    actual_observations = Column(Text, nullable=True)
    start_time = Column(DateTime, default=get_utc_now)
    end_time = Column(DateTime, nullable=True)
    duration_sec = Column(Float, default=0.0)
    retry_count = Column(Integer, default=0)
    assertion_results = Column(JSON, default=list)
    screenshot_ids = Column(JSON, default=list)
    console_logs = Column(JSON, default=list)

    test_case = relationship("TestCase", back_populates="executions")
    finding = relationship("BugFinding", back_populates="execution", uselist=False)

class BugFinding(Base):
    __tablename__ = "bug_findings"

    id = Column(String(50), primary_key=True, index=True)
    run_id = Column(String(50), ForeignKey("test_runs.id"), nullable=False, index=True)
    test_execution_id = Column(String(50), ForeignKey("test_executions.id"), nullable=True, index=True)
    dedup_key = Column(String(100), nullable=True, index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=False)
    affected_url = Column(String(500), nullable=False)
    severity = Column(String(20), default="Medium") # Critical, High, Medium, Low
    severity_reason = Column(Text, nullable=True)
    status = Column(String(50), default="Verified") # Verified, Likely, Inconclusive, Not reproduced
    confidence_score = Column(Float, default=0.95)
    verification_notes = Column(Text, nullable=True)
    expected_behavior = Column(Text, nullable=False)
    actual_behavior = Column(Text, nullable=False)
    reproduction_steps = Column(JSON, default=list)
    screenshot_url = Column(String(500), nullable=True)
    console_errors = Column(JSON, default=list)
    replay_attempts = Column(Integer, default=1)
    created_at = Column(DateTime, default=get_utc_now)

    run = relationship("TestRun", back_populates="findings")
    execution = relationship("TestExecution", back_populates="finding")

class Artifact(Base):
    __tablename__ = "artifacts"

    id = Column(String(50), primary_key=True, index=True)
    run_id = Column(String(50), ForeignKey("test_runs.id"), nullable=False, index=True)
    test_id = Column(String(50), nullable=True)
    bug_id = Column(String(50), nullable=True)
    type = Column(String(50), nullable=False) # screenshot, log, report_html, report_json
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(200), nullable=False)
    content_type = Column(String(100), default="image/png")
    created_at = Column(DateTime, default=get_utc_now)

    run = relationship("TestRun", back_populates="artifacts")

class RegressionTest(Base):
    __tablename__ = "regression_tests"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(300), nullable=False)
    target_url = Column(String(500), nullable=False)
    original_run_id = Column(String(50), nullable=True)
    original_test_id = Column(String(50), nullable=True)
    structured_steps = Column(JSON, default=list)
    expected_outcomes = Column(JSON, default=list)
    assertions = Column(JSON, default=list)
    created_at = Column(DateTime, default=get_utc_now)
    last_run_at = Column(DateTime, nullable=True)
    last_status = Column(String(50), default="Saved")
    executions_count = Column(Integer, default=0)

    executions = relationship("RegressionExecution", back_populates="regression_test", cascade="all, delete-orphan")

class RegressionExecution(Base):
    __tablename__ = "regression_executions"

    id = Column(String(50), primary_key=True, index=True)
    regression_test_id = Column(String(50), ForeignKey("regression_tests.id"), nullable=False, index=True)
    run_id = Column(String(50), nullable=True)
    status = Column(String(50), nullable=False) # Passed, Failed, Blocked
    previous_status = Column(String(50), nullable=True)
    execution_time = Column(DateTime, default=get_utc_now)
    duration_sec = Column(Float, default=0.0)
    diff_summary = Column(Text, nullable=True)

    regression_test = relationship("RegressionTest", back_populates="executions")

class RunEvent(Base):
    __tablename__ = "run_events"

    id = Column(String(50), primary_key=True, index=True)
    run_id = Column(String(50), ForeignKey("test_runs.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=get_utc_now)
    stage = Column(String(50), nullable=False) # initialize, explore, plan, execute, verify, report
    agent_role = Column(String(50), default="orchestrator") # scout, tester, verifier, orchestrator
    event_type = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    details = Column(JSON, default=dict)

    run = relationship("TestRun", back_populates="events")
