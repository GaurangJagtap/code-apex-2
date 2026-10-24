import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Autonomous AI QA Engineer"
    API_V1_STR: str = "/api/v1"
    APP_ENV: str = "development"
    
    # LLM Settings
    LLM_PROVIDER: str = "demo" # "demo", "gemini", "openai", "anthropic"
    LLM_MODEL: str = "gemini-2.5-flash"
    LLM_API_KEY: str = ""
    
    # Database
    DATABASE_URL: str = "sqlite:///./apex_qa.db"
    
    # Frontend Origin for CORS
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    
    # Artifacts Storage
    ARTIFACTS_DIR: str = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "artifacts")
    )
    
    # Security: Allowed Target Hosts
    ALLOW_ALL_HOSTS: bool = False
    ALLOWED_HOSTS: List[str] = [
        "127.0.0.1",
        "localhost",
        "devstore.local",
        "saucedemo.com",
        "the-internet.herokuapp.com",
        "example.com",
        "demoqa.com",
        "practicetestautomation.com",
        "httpbin.org"
    ]
    
    # Safe Execution Boundaries
    MAX_PAGES_EXPLORE: int = 15
    MAX_ACTIONS_PER_RUN: int = 150
    MAX_RUN_DURATION_SEC: int = 300
    MAX_VERIFICATION_RETRIES: int = 2
    BROWSER_HEADLESS: bool = True

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()
os.makedirs(settings.ARTIFACTS_DIR, exist_ok=True)
