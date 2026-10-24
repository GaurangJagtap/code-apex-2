import json
import time
from typing import Optional, Dict, Any, Tuple
import httpx
from backend.app.core.config import settings

class LLMProvider:
    """
    Unified LLM provider interface. Supports Gemini, OpenAI, Anthropic, and Demo mode.
    Validates output structure, measures latency, captures diagnostics, and handles graceful fallback.
    """
    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.api_key = settings.LLM_API_KEY
        self.model = settings.LLM_MODEL
        self.last_status: str = "uninitialized"
        self.last_error: Optional[str] = None
        self.last_latency_sec: float = 0.0

    def is_configured(self) -> bool:
        return bool(self.api_key and self.provider != "demo")

    async def generate_structured_plan(self, prompt: str) -> Optional[Dict[str, Any]]:
        """
        Sends structured prompt to LLM and returns parsed JSON if configured.
        Captures latency and sanitized error status for transparent reporting.
        """
        if not self.is_configured():
            self.last_status = "demo_mode"
            return None

        t_start = time.perf_counter()
        try:
            if self.provider == "gemini":
                # Google Gemini API
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"responseMimeType": "application/json"}
                }
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, json=payload)
                    self.last_latency_sec = round(time.perf_counter() - t_start, 3)
                    if resp.status_code == 200:
                        data = resp.json()
                        text_content = data["candidates"][0]["content"]["parts"][0]["text"]
                        self.last_status = "success"
                        return json.loads(text_content)
                    else:
                        self.last_status = f"http_{resp.status_code}"
                        self.last_error = f"Gemini API returned status {resp.status_code}: {resp.text[:200]}"
                        return None

            elif self.provider == "openai":
                # OpenAI Chat Completions API
                url = "https://api.openai.com/v1/chat/completions"
                headers = {"Authorization": f"Bearer {self.api_key}"}
                payload = {
                    "model": self.model if self.model and not self.model.startswith("gemini") else "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": "You are an autonomous QA test planner. Return strict JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {"type": "json_object"}
                }
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                    self.last_latency_sec = round(time.perf_counter() - t_start, 3)
                    if resp.status_code == 200:
                        data = resp.json()
                        text_content = data["choices"][0]["message"]["content"]
                        self.last_status = "success"
                        return json.loads(text_content)
                    else:
                        self.last_status = f"http_{resp.status_code}"
                        self.last_error = f"OpenAI API returned status {resp.status_code}: {resp.text[:200]}"
                        return None

            elif self.provider == "anthropic":
                # Anthropic Claude Messages API
                url = "https://api.anthropic.com/v1/messages"
                headers = {
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                }
                payload = {
                    "model": self.model if self.model and "claude" in self.model else "claude-3-5-sonnet-20241022",
                    "max_tokens": 4096,
                    "system": "You are an autonomous QA test planner. Return strict, valid JSON only without markdown fences.",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                    self.last_latency_sec = round(time.perf_counter() - t_start, 3)
                    if resp.status_code == 200:
                        data = resp.json()
                        # Extract text from content blocks
                        text_content = ""
                        for block in data.get("content", []):
                            if block.get("type") == "text":
                                text_content += block.get("text", "")
                        # Strip any accidental ```json ... ``` wrapper
                        clean_text = text_content.strip()
                        if clean_text.startswith("```json"):
                            clean_text = clean_text[7:]
                        if clean_text.startswith("```"):
                            clean_text = clean_text[3:]
                        if clean_text.endswith("```"):
                            clean_text = clean_text[:-3]
                        self.last_status = "success"
                        return json.loads(clean_text.strip())
                    else:
                        self.last_status = f"http_{resp.status_code}"
                        self.last_error = f"Anthropic API returned status {resp.status_code}: {resp.text[:200]}"
                        return None

            else:
                self.last_status = "unknown_provider"
                self.last_error = f"Unsupported LLM provider '{self.provider}'"
                return None

        except Exception as e:
            self.last_latency_sec = round(time.perf_counter() - t_start, 3)
            self.last_status = "exception"
            # Redact any api key that might have appeared in exception message
            err_msg = str(e)
            if self.api_key:
                err_msg = err_msg.replace(self.api_key, "[REDACTED]")
            self.last_error = err_msg
            return None
