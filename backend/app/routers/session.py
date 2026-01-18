from typing import Dict

from fastapi import APIRouter, HTTPException

from app.config.layouts import DEFAULT_SESSION_ID
from app.models import InputEvent, SessionState, SessionSummary
from app.services.session_service import create_session, list_sessions, get_session_state, delete_session
from app.services.event_service import append_text_event

router = APIRouter()


@router.get("/sessions", response_model=list[SessionSummary])
def get_sessions() -> list[SessionSummary]:
    """List all sessions."""
    return list_sessions()


@router.post("/sessions", response_model=dict)
def create_new_session() -> dict:
    """Create a new session and return its session_id."""
    session_id = create_session()
    return {"session_id": session_id}


@router.delete("/sessions/{session_id}")
def delete_session_endpoint(session_id: str) -> dict:
    """Delete a session and all its events."""
    deleted = delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted successfully"}


@router.get("/session/{session_id}", response_model=SessionState)
def get_session_by_id(session_id: str) -> SessionState:
    """Get a specific session by ID with all its events."""
    return get_session_state(session_id)


@router.get("/session", response_model=SessionState)
def get_session(session_id: str = DEFAULT_SESSION_ID) -> SessionState:
    """Get a session by query parameter (for backward compatibility)."""
    return get_session_state(session_id)


@router.post("/events/text", response_model=InputEvent)
def post_text_event(payload: Dict[str, str]) -> InputEvent:
    """Append a text event to a session."""
    session_id = payload.get("session_id", DEFAULT_SESSION_ID)
    text = payload.get("text", "")
    return append_text_event(session_id, text)
