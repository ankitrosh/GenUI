"""Service layer for event management."""
import os
import time
from uuid import uuid4
from typing import List
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    InputEvent,
    InputEventModel,
    validate_genui_message_list,
)
from app.services.session_service import ensure_session
from app.services.llm_service import generate_genui_message_candidates

_PROFILE_EVENTS = os.getenv("GENUI_PROFILE") == "1"
_MAX_ACCUMULATED_EVENTS = int(os.getenv("GENUI_MAX_ACCUMULATED_EVENTS", "8"))


def _log_profile(label: str, start: float) -> None:
    if _PROFILE_EVENTS:
        elapsed_ms = (time.perf_counter() - start) * 1000
        print(f"[profile] {label}: {elapsed_ms:.1f}ms")


def _sanitize_payload(payload: dict) -> dict:
    """Remove internal-only fields before returning to clients."""
    return {
        key: value
        for key, value in payload.items()
        if key != "delta_summary" and not key.startswith("_")
    }

def get_session_events(session_id: str) -> List[InputEvent]:
    """Get all events for a session, ordered by sequence."""
    db = next(get_db())
    try:
        event_models = (
            db.query(InputEventModel)
            .filter(InputEventModel.session_id == session_id)
            .order_by(InputEventModel.seq)
            .all()
        )
        
        return [
            InputEvent(
                event_id=event.event_id,
                session_id=event.session_id,
                seq=event.seq,
                payload=event.payload,
            )
            for event in event_models
        ]
    finally:
        db.close()


def _get_accumulated_text(session_id: str) -> str:
    """Get all text from previous events in the session."""
    events = get_session_events(session_id)
    text_parts = []
    for event in events:
        if "text" in event.payload:
            text_parts.append(event.payload["text"])
    if _MAX_ACCUMULATED_EVENTS > 0:
        text_parts = text_parts[-_MAX_ACCUMULATED_EVENTS:]
    return " ".join(text_parts)


def _get_accumulated_deltas_summary(session_id: str) -> str:
    """Get all prior delta summaries from previous events in the session."""
    events = get_session_events(session_id)
    summaries = []
    for event in events:
        summary = event.payload.get("_delta_summary")
        if isinstance(summary, str) and summary.strip():
            summaries.append(summary.strip())
    return "\n".join(summaries)


def _extract_messages_for_client(llm_response: object) -> object:
    """Return only the messages array for client-facing payloads."""
    if isinstance(llm_response, dict):
        messages = llm_response.get("messages")
        if isinstance(messages, list):
            return messages
        return llm_response
    if isinstance(llm_response, list):
        if llm_response and all(isinstance(item, dict) and "messages" in item for item in llm_response):
            first_messages = llm_response[0].get("messages")
            if isinstance(first_messages, list):
                return first_messages
        return llm_response
    return llm_response


def append_text_event(session_id: str, text: str) -> InputEvent:
    """
    Append a text event to the database and generate GenUI JSON via LLM.
    
    The LLM response is stored in the event payload under 'llm_response'.
    """
    overall_start = time.perf_counter()
    db = next(get_db())
    try:
        ensure_start = time.perf_counter()
        session = ensure_session(db, session_id)
        session.seq_counter += 1
        db.commit()
        db.refresh(session)
        _log_profile("event.ensure_session", ensure_start)
        
        # Get accumulated text and summaries from previous events
        accum_start = time.perf_counter()
        accumulated_text = _get_accumulated_text(session_id)
        deltas_summary = _get_accumulated_deltas_summary(session_id)
        _log_profile("event.accumulated_state", accum_start)
        
        # Generate GenUI JSON from LLM
        llm_response = None
        validation_error = None
        delta_summary = None
        try:
            llm_start = time.perf_counter()
            llm_response_candidates = generate_genui_message_candidates(
                accumulated_text=accumulated_text,
                current_text=text,
                deltas_summary=deltas_summary,
            )
            _log_profile("event.llm_generate", llm_start)
            
            # Validate against GenUI schema using Pydantic models
            validation_start = time.perf_counter()
            last_validation_error = None
            for idx, candidate in enumerate(llm_response_candidates):
                try:
                    messages = (
                        candidate.get("messages", [])
                        if isinstance(candidate, dict)
                        else candidate
                    )
                    print(f"LLM candidate {idx + 1}: {candidate}")
                    validated_messages = validate_genui_message_list(messages)
                    # Convert validated models back to dicts for storage
                    llm_response = [
                        message.model_dump() for message in validated_messages
                    ]
                    if isinstance(candidate, dict):
                        summary = candidate.get("summary")
                        if isinstance(summary, str) and summary.strip():
                            delta_summary = summary.strip()
                    print(
                        f"✓ GenUI validation passed for event seq {session.seq_counter} "
                        f"using candidate {idx + 1}"
                    )
                    last_validation_error = None
                    break
                except ValueError as ve:
                    last_validation_error = str(ve)
                    continue
            _log_profile("event.validation", validation_start)
            
            if llm_response is None:
                # Validation failed - store responses for debugging
                validation_error = last_validation_error or "No valid GenUI response candidates returned."
                llm_response = llm_response_candidates  # Store raw responses for debugging
                print(f"⚠ GenUI validation failed for event seq {session.seq_counter}: {validation_error}")
        except Exception as e:
            # If LLM call fails, log error but don't fail the event creation
            validation_error = f"LLM generation failed: {str(e)}"
            print(f"Warning: LLM generation failed: {e}")
        
        # Create event payload with text, LLM response, and validation status
        payload = {"text": text}
        if llm_response:
            payload["llm_response"] = _extract_messages_for_client(llm_response)
        if delta_summary:
            payload["_delta_summary"] = delta_summary
        if validation_error:
            payload["validation_error"] = validation_error
            payload["validation_status"] = "failed"
        else:
            payload["validation_status"] = "passed"
        
        event = InputEvent(
            event_id=str(uuid4()),
            session_id=session_id,
            seq=session.seq_counter,
            payload=_sanitize_payload(payload),
        )
        
        # Save to database
        save_start = time.perf_counter()
        event_model = InputEventModel(
            event_id=event.event_id,
            session_id=event.session_id,
            seq=event.seq,
            payload=payload,
        )
        db.add(event_model)
        db.commit()
        _log_profile("event.db_commit", save_start)
        
        return event
    finally:
        db.close()
        _log_profile("event.total", overall_start)


__all__ = ["append_text_event", "get_session_events"]
