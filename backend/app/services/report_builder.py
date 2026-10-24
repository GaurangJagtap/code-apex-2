import os
import json
import datetime
from typing import Dict, Any, List

class ReportBuilder:
    """
    Builds proof-carrying bug reports and export artifacts (JSON and HTML)
    containing reproduction steps, expected vs actual observations, and verification evidence.
    """
    @staticmethod
    def generate_html_bug_report(finding: Dict[str, Any], run_info: Dict[str, Any]) -> str:
        fid = finding.get("id", "BUG-UNKNOWN")
        title = finding.get("title", "Untitled Defect")
        severity = finding.get("severity", "Medium")
        status = finding.get("status", "Confirmed")
        affected_url = finding.get("affected_url", "N/A")
        expected = finding.get("expected_behavior", "N/A")
        actual = finding.get("actual_behavior", "N/A")
        repro_steps = finding.get("reproduction_steps", [])
        screenshot_url = finding.get("screenshot_url")
        notes = finding.get("verification_notes", "")
        replays = finding.get("replay_attempts", 1)
        created_at = finding.get("created_at", datetime.datetime.utcnow().isoformat())

        severity_colors = {
            "Critical": "#dc2626",
            "High": "#ea580c",
            "Medium": "#d97706",
            "Low": "#2563eb"
        }
        sev_color = severity_colors.get(severity, "#475569")

        steps_html = "".join([f"<li style='margin-bottom: 6px;'>{s}</li>" for s in repro_steps])
        
        screenshot_html = ""
        if screenshot_url:
            screenshot_html = f"""
            <div style="margin-top: 20px;">
                <h3 style="color: #064e3b; font-size: 1.1rem; margin-bottom: 8px;">Failure Evidence (Screenshot)</h3>
                <img src="{screenshot_url}" alt="Bug Evidence Screenshot" style="max-width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" />
            </div>
            """

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Bug Report — {fid}: {title}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f8fafc;
            color: #0f172a;
            padding: 30px;
            line-height: 1.6;
        }}
        .report-card {{
            max-width: 860px;
            margin: 0 auto;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 32px;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
        }}
        .header {{
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }}
        .badge {{
            display: inline-block;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 0.8rem;
            font-weight: 700;
            color: white;
            margin-right: 8px;
        }}
        .field-group {{
            margin-bottom: 18px;
        }}
        .label {{
            font-size: 0.85rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
        }}
        .value-box {{
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px;
            font-size: 0.95rem;
        }}
    </style>
</head>
<body>
    <div class="report-card">
        <div class="header">
            <span class="badge" style="background: {sev_color};">{severity}</span>
            <span class="badge" style="background: #047857;">{status}</span>
            <span style="font-size: 0.85rem; color: #64748b; float: right;">Recorded: {created_at[:19]}</span>
            <h1 style="color: #064e3b; margin: 12px 0 4px; font-size: 1.6rem;">[{fid}] {title}</h1>
            <p style="color: #475569; font-size: 0.95rem;">Affected Target: <code>{affected_url}</code></p>
        </div>

        <div class="field-group">
            <div class="label">Reproducibility & Verification</div>
            <div class="value-box">
                <strong>Replay Status:</strong> {notes}<br>
                <strong>Verification Cycles:</strong> {replays} independent replay session(s) performed.
            </div>
        </div>

        <div class="field-group">
            <div class="label">Reproduction Steps</div>
            <div class="value-box">
                <ol style="margin: 0; padding-left: 20px;">
                    {steps_html}
                </ol>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px;">
            <div class="field-group">
                <div class="label">Expected Behavior</div>
                <div class="value-box" style="border-left: 4px solid #10b981;">
                    {expected}
                </div>
            </div>
            <div class="field-group">
                <div class="label">Actual Observed Behavior</div>
                <div class="value-box" style="border-left: 4px solid #ef4444;">
                    {actual}
                </div>
            </div>
        </div>

        {screenshot_html}

        <div style="margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 0.85rem; color: #94a3b8; text-align: center;">
            Autonomous AI QA Engineer Proof-Carrying Report &bull; Run ID: {run_info.get('id', 'N/A')}
        </div>
    </div>
</body>
</html>"""
        return html

    @staticmethod
    def generate_markdown_bug_report(finding: Dict[str, Any], run_info: Dict[str, Any]) -> str:
        fid = finding.get("id", "BUG-UNKNOWN")
        title = finding.get("title", "Untitled Defect")
        severity = finding.get("severity", "Medium")
        status = finding.get("status", "Verified")
        affected_url = finding.get("affected_url", "N/A")
        expected = finding.get("expected_behavior", "N/A")
        actual = finding.get("actual_behavior", "N/A")
        repro_steps = finding.get("reproduction_steps", [])
        screenshot_url = finding.get("screenshot_url")
        notes = finding.get("verification_notes", "")
        replays = finding.get("replay_attempts", 1)
        created_at = finding.get("created_at", datetime.datetime.now(datetime.timezone.utc).isoformat())

        steps_md = "\n".join([f"{i+1}. {s}" for i, s in enumerate(repro_steps)]) or "1. Direct navigation to target route."

        md = f"""# Proof-Carrying Defect Report: [{fid}] {title}

- **Finding Status:** `{status}`
- **Severity Level:** `{severity}`
- **Affected URL:** `{affected_url}`
- **Test Run ID:** `{run_info.get('id', 'N/A')}`
- **Timestamp:** `{created_at}`
- **Independent Replay Verification:** {replays} session(s) executed

---

## 1. Reproducibility & Verification Analysis
> **Verifier Finding Note:**
> {notes}

## 2. Step-by-Step Reproduction Instructions
{steps_md}

## 3. Discrepancy Matrix

| Dimension | Observation |
| :--- | :--- |
| **Expected Behavior** | {expected} |
| **Actual Defective Outcome** | {actual} |

## 4. Evidence References
- **Screenshot Evidence:** {screenshot_url or 'N/A'}
- **Verification Confidence:** {finding.get('confidence_score', 0.95) * 100:.0f}%

---
*Generated autonomously by Autonomous AI QA Engineer*
"""
        return md

    @staticmethod
    def generate_junit_xml_report(run: Dict[str, Any], tests: List[Dict[str, Any]], findings: List[Dict[str, Any]]) -> str:
        import html
        total = len(tests)
        failed = sum(1 for t in tests if t.get("status") in ("Failed", "Blocked"))
        duration = run.get("duration_sec", 0.0)
        run_id = run.get("id", "run-unknown")

        xml_lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            f'<testsuites name="Autonomous AI QA Engineer" tests="{total}" failures="{failed}" errors="0" time="{duration:.2f}">',
            f'  <testsuite name="{html.escape(run_id)}" tests="{total}" failures="{failed}" errors="0" time="{duration:.2f}">'
        ]

        for t in tests:
            t_id = html.escape(str(t.get("id", "TC")))
            t_title = html.escape(str(t.get("title", "Test")))
            t_cat = html.escape(str(t.get("category", "Functional")))
            t_dur = float(t.get("duration_sec", 0.1))
            t_status = t.get("status", "Passed")

            xml_lines.append(f'    <testcase classname="{t_cat}" name="[{t_id}] {t_title}" time="{t_dur:.2f}">')
            if t_status in ("Failed", "Blocked"):
                reason = html.escape(str(t.get("actual_observations") or t.get("risk_reason") or "Assertion failure"))
                xml_lines.append(f'      <failure message="Defect verified during browser execution" type="{t_status}">{reason}</failure>')
            xml_lines.append('    </testcase>')

        xml_lines.append('  </testsuite>')
        xml_lines.append('</testsuites>')
        return "\n".join(xml_lines)
