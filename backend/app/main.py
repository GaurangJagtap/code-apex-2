import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.core.config import settings
from backend.app.api.v1.router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Autonomous AI QA Engineer API — Explore, Plan, Execute, Verify, Report, Learn",
    version="1.0.0"
)

# Enable CORS for frontend dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_ORIGIN,
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include version 1 API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount artifacts folder
if os.path.exists(settings.ARTIFACTS_DIR):
    app.mount("/artifacts", StaticFiles(directory=settings.ARTIFACTS_DIR), name="artifacts")

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
        "config": f"{settings.API_V1_STR}/config/status"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
