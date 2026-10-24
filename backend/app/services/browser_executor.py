import asyncio
from typing import Dict, Any, List, Optional
from playwright.async_api import Page, Locator
from backend.app.services.browser_manager import BrowserSession
from backend.app.services.assertions import AssertionEngine

class BrowserExecutor:
    """
    Executes validated test plan steps in the browser, performs resilient locator resolution,
    evaluates deterministic assertions, and captures evidence.
    """
    def __init__(self, browser_session: BrowserSession):
        self.session = browser_session

    async def _resolve_locator_with_fallback(self, page: Page, selector: str, action_desc: str) -> Optional[Locator]:
        """
        Attempts to resolve selector directly. If not found, evaluates resilient locators
        (by text, role, or partial ID/name match) safely.
        """
        loc = page.locator(selector).first
        if await loc.count() > 0:
            return loc

        # Resilient Locator Fallback
        # 1. Try by text if selector contains words
        if "btn" in selector or "button" in selector:
            text_cand = selector.replace("#", "").replace(".", "").replace("btn-", "").replace("-", " ")
            loc_text = page.get_by_role("button", name=text_cand).first
            if await loc_text.count() > 0:
                return loc_text

        # 2. Try by placeholder or name
        if selector.startswith("#"):
            plain_id = selector[1:]
            loc_name = page.locator(f'[name="{plain_id}"]').first
            if await loc_name.count() > 0:
                return loc_name
            loc_placeholder = page.locator(f'[placeholder*="{plain_id}"]').first
            if await loc_placeholder.count() > 0:
                return loc_placeholder

        # 3. Try visible button/input text fallback
        if "submit" in selector.lower() or "submit" in action_desc.lower():
            loc_sub = page.locator('button[type="submit"], input[type="submit"]').first
            if await loc_sub.count() > 0:
                return loc_sub

        return None

    async def execute_test(self, test_case: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a test case in a clean browser context and captures evidence.
        """
        page = await self.session.create_clean_context()
        steps = test_case.get("steps", [])
        assertions = test_case.get("assertions", [])
        
        step_logs: List[str] = []
        screenshot_ids: List[str] = []
        executed_successfully = True
        execution_error: Optional[str] = None
        failing_step_index: Optional[int] = None

        # 1. Execute Steps in exact ordered sequence
        for idx, step in enumerate(steps):
            action = step.get("action", "").lower()
            selector = step.get("selector")
            value = step.get("value")
            desc = step.get("description", f"Step {idx+1}: {action}")

            try:
                if action == "goto":
                    target_url = value or selector
                    await page.goto(target_url, wait_until="domcontentloaded", timeout=12000)
                    step_logs.append(f"Navigated to {target_url}")

                elif action == "click":
                    loc = await self._resolve_locator_with_fallback(page, selector, desc)
                    if loc and await loc.count() > 0:
                        await loc.click(timeout=5000)
                        step_logs.append(f"Clicked element '{selector}'")
                    else:
                        raise Exception(f"Element '{selector}' not found on page {page.url}")

                elif action in ("double_click", "rapid_click", "duplicate_submit"):
                    loc = await self._resolve_locator_with_fallback(page, selector, desc)
                    if loc and await loc.count() > 0:
                        # Rapid double submission to test idempotency
                        await loc.click(timeout=3000)
                        await asyncio.sleep(0.05)
                        try:
                            if await loc.count() > 0 and await loc.is_enabled():
                                await loc.click(timeout=2000)
                                step_logs.append(f"Dispatched rapid secondary click on '{selector}' (Idempotency test)")
                        except Exception:
                            pass
                    else:
                        raise Exception(f"Element '{selector}' not found on page {page.url}")

                elif action == "fill":
                    loc = await self._resolve_locator_with_fallback(page, selector, desc)
                    if loc and await loc.count() > 0:
                        await loc.fill(str(value or ""), timeout=5000)
                        step_logs.append(f"Filled '{selector}' with value '{value}'")
                    else:
                        raise Exception(f"Input element '{selector}' not found on page {page.url}")

                elif action == "select":
                    loc = await self._resolve_locator_with_fallback(page, selector, desc)
                    if loc and await loc.count() > 0:
                        await loc.select_option(str(value or ""), timeout=5000)
                        step_logs.append(f"Selected '{value}' in '{selector}'")
                    else:
                        raise Exception(f"Select element '{selector}' not found on page {page.url}")

                elif action == "check":
                    loc = await self._resolve_locator_with_fallback(page, selector, desc)
                    if loc and await loc.count() > 0:
                        await loc.check(timeout=5000)
                        step_logs.append(f"Checked radio/checkbox '{selector}'")
                    else:
                        raise Exception(f"Checkbox/radio element '{selector}' not found on page {page.url}")

                elif action in ("refresh", "reload"):
                    await page.reload(wait_until="domcontentloaded", timeout=10000)
                    step_logs.append(f"Reloaded page {page.url} to verify state recovery")

                elif action == "wait":
                    wait_ms = int(value or 1000)
                    await page.wait_for_timeout(wait_ms)
                    step_logs.append(f"Waited {wait_ms}ms")

                elif action == "screenshot":
                    art_id, fpath, fname = await self.session.capture_screenshot(f"step_{idx+1}")
                    if art_id:
                        screenshot_ids.append(art_id)
                    step_logs.append(f"Captured screenshot {fname}")

                # Micro wait to allow DOM updates
                await asyncio.sleep(0.15)

            except Exception as e:
                executed_successfully = False
                execution_error = str(e)
                failing_step_index = idx
                step_logs.append(f"FAILED step {idx+1} ({desc}): {str(e)}")
                # Capture screenshot at failure point
                art_id, _, _ = await self.session.capture_screenshot(f"fail_step_{idx+1}")
                if art_id:
                    screenshot_ids.append(art_id)
                break

        # 2. Evaluate Assertions
        assertion_results = []
        all_assertions_passed = True
        
        if executed_successfully:
            for a in assertions:
                res = await AssertionEngine.evaluate_assertion(page, a)
                assertion_results.append(res)
                if not res["passed"]:
                    all_assertions_passed = False

        # If any assertion failed, capture screenshot evidence
        if not all_assertions_passed:
            art_id, _, _ = await self.session.capture_screenshot("assertion_failure")
            if art_id:
                screenshot_ids.append(art_id)

        # Final Status Decision
        if not executed_successfully:
            test_status = "Blocked" if "not found" in (execution_error or "") else "Failed"
        elif not all_assertions_passed:
            test_status = "Failed"
        else:
            test_status = "Passed"

        return {
            "status": test_status,
            "all_assertions_passed": all_assertions_passed,
            "step_logs": step_logs,
            "assertion_results": assertion_results,
            "screenshot_ids": screenshot_ids,
            "console_logs": list(self.session.console_logs),
            "page_errors": list(self.session.page_errors),
            "execution_error": execution_error,
            "final_url": page.url
        }
