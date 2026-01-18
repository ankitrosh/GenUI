import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers.session import router as session_router
from app.database import init_db

APP_TITLE = "Generative UI"
ALLOWED_ORIGINS = ["http://localhost:5173"]


def create_app() -> FastAPI:
    load_dotenv()
    app = FastAPI(title=APP_TITLE)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(session_router)

    @app.on_event("startup")
    def startup_event():
        """Initialize database on startup and validate OpenAI API key."""
        init_db()
        
        # Validate OpenAI API key on startup
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("WARNING: OPENAI_API_KEY not set. LLM features will not work.")
        else:
            print("✓ OpenAI API key configured")

    @app.get("/")
    def root() -> dict[str, str]:
        return {"message": "ASR feature has been removed."}

    return app


app = create_app()
