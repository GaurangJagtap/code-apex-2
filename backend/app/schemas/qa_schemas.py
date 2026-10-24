from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class RunCreateRequest(BaseModel):
    target_url: str = Field(..., description="Target web application URL")
    description: str = Field(..., description="Natural language specification of application behavior")
    objectives: List[str] = Field(default_factory=lambda: ["Functional testing", "Form validation", "Navigation testing"])
    boundaries: Dict[str, Any] = Field(default_factory=lambda: {
        "max_pages": 10,
        "max_actions": 30,
        "max_duration_sec": 300,
        "max_retries": 2
    })
    mode: str = Field(default="demo", description="'demo' or 'ai'")
    username: Optional[str] = None
    password: Optional[str] = None

class TestStepSchema(BaseModel):
    __test__ = False
    action: str = Field(..., description="goto, click, fill, select, check, wait, assert, screenshot")
    selector: Optional[str] = None
    value: Optional[str] = None
    description: str = Field(..., description="Human readable description of action")

class AssertionSchema(BaseModel):
    type: str = Field(..., description="element_visible, text_contains, value_matches, url_contains, not_visible")
    target: str = Field(..., description="CSS selector, element text, or URL property")
    expected: Optional[str] = None
    message: Optional[str] = None

class CuriosityBreakdown(BaseModel):
    impact: float = 0.8
    uncertainty: float = 0.5
    novelty: float = 0.7
    coverage_gap: float = 0.9
    priority_score: float = 0.85
    reasoning: str = ""

class TestCaseCreate(BaseModel):
    __test__ = False
    test_id: str
    title: str
    category: str = "Functional"
    priority: str = "High"
    preconditions: Optional[str] = None
    steps: List[TestStepSchema]
    assertions: List[AssertionSchema]
    risk_reason: str
    curiosity: Optional[CuriosityBreakdown] = None
    regression_candidate: bool = True

class TestPlanOutput(BaseModel):
    __test__ = False
    rationale: str
    test_cases: List[TestCaseCreate]

class RunEventResponse(BaseModel):
    id: str
    run_id: str
    timestamp: str
    stage: str
    agent_role: str
    event_type: str
    message: str
    details: Dict[str, Any]

class ExploredControl(BaseModel):
    tag: str
    type: Optional[str] = None
    id: Optional[str] = None
    name: Optional[str] = None
    text: Optional[str] = None
    selector: str
    role: Optional[str] = None

class ExploredPageResponse(BaseModel):
    id: str
    url: str
    title: Optional[str] = None
    status: str
    discovered_controls: List[Dict[str, Any]] = []
    navigation_links: List[str] = []
    depth: int = 0

class BugFindingResponse(BaseModel):
    id: str
    run_id: str
    test_execution_id: Optional[str] = None
    dedup_key: Optional[str] = None
    title: str
    description: str
    affected_url: str
    severity: str
    severity_reason: Optional[str] = None
    status: str # Verified, Likely, Inconclusive, Not reproduced (Confirmed, Suspected)
    confidence_score: float
    verification_notes: Optional[str] = None
    expected_behavior: str
    actual_behavior: str
    reproduction_steps: List[str]
    screenshot_url: Optional[str] = None
    console_errors: List[str] = []
    replay_attempts: int
    created_at: str

class TestExecutionResponse(BaseModel):
    __test__ = False
    id: str
    test_case_id: str
    title: str
    category: str
    priority: str
    priority_score: float
    status: str
    duration_sec: float
    retry_count: int
    preconditions: Optional[str] = None
    steps: List[Dict[str, Any]] = []
    assertions: List[Dict[str, Any]] = []
    actual_observations: Optional[str] = None
    assertion_results: List[Dict[str, Any]] = []
    screenshot_urls: List[str] = []
    console_logs: List[str] = []
    finding_id: Optional[str] = None
    risk_reason: Optional[str] = None

class RunSummaryResponse(BaseModel):
    id: str
    target_url: str
    description: str
    status: str
    mode: str
    start_time: str
    end_time: Optional[str] = None
    duration_sec: float
    total_tests: int
    passed_count: int
    failed_count: int
    blocked_count: int
    findings_count: int
    error_summary: Optional[str] = None

class RegressionTestResponse(BaseModel):
    id: str
    name: str
    target_url: str
    original_run_id: Optional[str] = None
    original_test_id: Optional[str] = None
    steps_count: int
    assertions_count: int
    created_at: str
    last_run_at: Optional[str] = None
    last_status: str
    executions_count: int

class RegressionRunResultResponse(BaseModel):
    execution_id: str
    test_id: str
    status: str
    previous_status: Optional[str] = None
    duration_sec: float
    diff_summary: str
    executed_at: str
