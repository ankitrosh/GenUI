"""Service layer for session management (CRUD operations)."""
from uuid import uuid4
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    SessionModel,
    InputEventModel,
    SessionState,
    UIState,
    SessionSummary,
    ComponentNode,
    InputEvent,
)


def get_session(db: Session, session_id: str) -> SessionModel | None:
    """Get a session by ID."""
    return db.query(SessionModel).filter(SessionModel.session_id == session_id).first()


def ensure_session(db: Session, session_id: str) -> SessionModel:
    """Get or create a session in the database."""
    session = get_session(db, session_id)
    if session is None:
        session = SessionModel(session_id=session_id, seq_counter=0)
        db.add(session)
        db.commit()
        db.refresh(session)
    return session


def _extract_surface_updates(events: List[InputEvent]) -> Dict[str, Dict[str, Any]]:
    """
    Return latest surfaceUpdate and associated data per surface name, only after
    a beginRendering message confirms the surface is ready.
    """
    surfaces: Dict[str, Dict[str, Any]] = {}
    pending: Dict[str, Dict[str, Any]] = {}
    pending_data: Dict[str, Optional[Dict[str, Any]]] = {}
    rendered_surfaces: set[str] = set()
    current_data_model: Optional[Dict[str, Any]] = None

    for event in events:
        payload = event.payload or {}
        if payload.get("validation_status") != "passed":
            continue
        llm_response = payload.get("llm_response")
        if isinstance(llm_response, dict):
            messages = [llm_response]
        elif isinstance(llm_response, list):
            messages = [msg for msg in llm_response if isinstance(msg, dict)]
        else:
            continue

        event_data_model: Optional[Dict[str, Any]] = None
        event_begin_rendering: set[str] = set()
        for message in messages:
            message_type = message.get("type")
            if message_type == "dataModelUpdate":
                data = message.get("data")
                if isinstance(data, dict):
                    event_data_model = data
            elif message_type == "beginRendering":
                surface_name = message.get("surface")
                if surface_name:
                    event_begin_rendering.add(surface_name)

        if event_data_model is not None:
            current_data_model = event_data_model

        for message in messages:
            message_type = message.get("type")
            if message_type == "dataModelUpdate":
                continue

            if message_type == "surfaceUpdate":
                surface_name = message.get("surface")
                if not surface_name:
                    continue
                if surface_name in event_begin_rendering:
                    surfaces[surface_name] = {
                        "surface": message,
                        "data_model": event_data_model or current_data_model,
                    }
                    rendered_surfaces.add(surface_name)
                else:
                    pending[surface_name] = message
                    pending_data[surface_name] = event_data_model or current_data_model
                continue

            if message_type == "beginRendering":
                surface_name = message.get("surface")
                if not surface_name:
                    continue
                surface_update = pending.get(surface_name)
                if surface_update:
                    surfaces[surface_name] = {
                        "surface": surface_update,
                        "data_model": pending_data.get(surface_name) or event_data_model or current_data_model,
                    }
                    rendered_surfaces.add(surface_name)
                continue

    # Fallback: if no beginRendering was seen for a surface, render the latest pending update
    for surface_name, surface_update in pending.items():
        if surface_name in rendered_surfaces:
            continue
        surfaces[surface_name] = {
            "surface": surface_update,
            "data_model": pending_data.get(surface_name) or current_data_model,
        }

    return surfaces


def _unescape_json_pointer_token(token: str) -> str:
    return token.replace("~1", "/").replace("~0", "~")


def _resolve_json_pointer(data: Optional[Dict[str, Any]], pointer: str) -> Any:
    """Resolve a JSON pointer (RFC 6901) within a nested dict/list."""
    if not pointer or not isinstance(data, dict):
        return None
    if pointer == "/":
        return data
    if not pointer.startswith("/"):
        return None
    current: Any = data
    tokens = pointer.lstrip("/").split("/")
    for raw_token in tokens:
        token = _unescape_json_pointer_token(raw_token)
        if isinstance(current, dict):
            if token not in current:
                return None
            current = current[token]
        elif isinstance(current, list):
            try:
                index = int(token)
            except ValueError:
                return None
            if index < 0 or index >= len(current):
                return None
            current = current[index]
        else:
            return None
    return current


def _resolve_text_value(text_value: Any, data_model: Optional[Dict[str, Any]]) -> Any:
    if text_value is None:
        return None
    if not isinstance(text_value, dict):
        return {"literal": str(text_value)}
    if "literalString" in text_value:
        return {"literal": text_value.get("literalString")}
    if "literal" in text_value or "path" not in text_value:
        return text_value
    if not data_model:
        return text_value
    resolved = _resolve_json_pointer(data_model, text_value.get("path", ""))
    if resolved is None:
        return text_value
    return {"literal": str(resolved)}


def _resolve_source_value(source_value: Any, data_model: Optional[Dict[str, Any]]) -> Any:
    if source_value is None:
        return None
    if isinstance(source_value, str):
        return {"url": source_value}
    if not isinstance(source_value, dict):
        return source_value
    if "url" in source_value or "path" not in source_value:
        return source_value
    if not data_model:
        return source_value
    resolved = _resolve_json_pointer(data_model, source_value.get("path", ""))
    if resolved is None:
        return source_value
    return {"url": str(resolved)}


def _build_component_tree(surface_update: Dict[str, Any], data_model: Optional[Dict[str, Any]]) -> List[ComponentNode]:
    """Convert a GenUI surfaceUpdate into nested ComponentNodes."""
    components = surface_update.get("components", [])
    id_to_def: Dict[str, Dict[str, Any]] = {}
    referenced: set[str] = set()

    for comp in components:
        comp_id = comp.get("id")
        comp_def = comp.get("component")
        if not comp_id or not isinstance(comp_def, dict):
            continue
        id_to_def[comp_id] = comp_def

        if "Column" in comp_def:
            children = comp_def["Column"].get("children", {})
            referenced.update(children.get("explicitList", []))
        if "Row" in comp_def:
            children = comp_def["Row"].get("children", {})
            referenced.update(children.get("explicitList", []))
        if "Card" in comp_def:
            child = comp_def["Card"].get("child")
            if child:
                referenced.add(child)

    def build_node(node_id: str, seen: set[str]) -> ComponentNode | None:
        if node_id in seen:
            return None
        comp_def = id_to_def.get(node_id)
        if not comp_def:
            return None

        seen = seen | {node_id}
        if "Column" in comp_def:
            props = comp_def["Column"]
            child_ids = props.get("children", {}).get("explicitList", []) or []
            children = [child for cid in child_ids if (child := build_node(cid, seen))]
            return ComponentNode(id=node_id, type="Column", props={"gap": props.get("gap"), "alignment": props.get("alignment")}, children=children)
        if "Row" in comp_def:
            props = comp_def["Row"]
            child_ids = props.get("children", {}).get("explicitList", []) or []
            children = [child for cid in child_ids if (child := build_node(cid, seen))]
            return ComponentNode(id=node_id, type="Row", props={"gap": props.get("gap"), "alignment": props.get("alignment"), "distribution": props.get("distribution")}, children=children)
        if "Card" in comp_def:
            props = comp_def["Card"]
            child_id = props.get("child")
            child_node = build_node(child_id, seen) if child_id else None
            children = [child_node] if child_node else []
            return ComponentNode(id=node_id, type="Card", props={}, children=children)
        if "Divider" in comp_def:
            return ComponentNode(id=node_id, type="Divider", props={}, children=[])
        if "Text" in comp_def:
            props = comp_def["Text"]
            resolved_text = _resolve_text_value(props.get("text"), data_model)
            return ComponentNode(id=node_id, type="Text", props={"text": resolved_text, "usageHint": props.get("usageHint")}, children=[])
        if "Icon" in comp_def:
            props = comp_def["Icon"]
            resolved_source = _resolve_source_value(props.get("source") or props.get("url"), data_model)
            resolved_name = _resolve_text_value(props.get("name"), data_model)
            return ComponentNode(id=node_id, type="Icon", props={"source": resolved_source, "name": resolved_name}, children=[])
        if "Image" in comp_def:
            props = comp_def["Image"]
            resolved_source = _resolve_source_value(props.get("source") or props.get("url"), data_model)
            resolved_alt = _resolve_text_value(props.get("altText"), data_model)
            if resolved_source is None:
                return None
            if isinstance(resolved_source, dict):
                resolved_url = resolved_source.get("url")
                if not resolved_url:
                    return None
            return ComponentNode(
                id=node_id,
                type="Image",
                props={
                    "source": resolved_source,
                    "altText": resolved_alt,
                    "usageHint": props.get("usageHint"),
                    "fit": props.get("fit"),
                },
                children=[],
            )
        return None

    root_ids = [comp_id for comp_id in id_to_def.keys() if comp_id not in referenced]
    root_nodes = [node for rid in root_ids if (node := build_node(rid, set()))]
    return root_nodes


def _build_ui_from_events(events: List[InputEvent]) -> UIState:
    """Build UI state from latest validated surface updates."""
    surfaces_raw = _extract_surface_updates(events)
    surfaces_built: Dict[str, List[ComponentNode]] = {}
    for surface_name, context in surfaces_raw.items():
        surface_update = context.get("surface") if isinstance(context, dict) else None
        data_model = context.get("data_model") if isinstance(context, dict) else None
        if not isinstance(surface_update, dict):
            continue
        surfaces_built[surface_name] = _build_component_tree(surface_update, data_model)
    return UIState(surfaces=surfaces_built)


def create_session() -> str:
    """Create a new session and return its session_id."""
    session_id = str(uuid4())
    db = next(get_db())
    try:
        session = SessionModel(session_id=session_id, seq_counter=0)
        db.add(session)
        db.commit()
        return session_id
    finally:
        db.close()


def list_sessions() -> List[SessionSummary]:
    """List all sessions with their event counts."""
    db = next(get_db())
    try:
        results = (
            db.query(
                SessionModel.session_id,
                func.count(InputEventModel.event_id).label('event_count')
            )
            .outerjoin(InputEventModel, SessionModel.session_id == InputEventModel.session_id)
            .group_by(SessionModel.session_id)
            .order_by(SessionModel.session_id)
            .all()
        )
        
        return [
            SessionSummary(session_id=row.session_id, event_count=row.event_count or 0)
            for row in results
        ]
    finally:
        db.close()


def get_session_state(session_id: str) -> SessionState:
    """Get full session state including all events."""
    from app.services.event_service import get_session_events
    
    db = next(get_db())
    try:
        # Ensure session exists
        ensure_session(db, session_id)
        
        # Get all events for this session
        events = get_session_events(session_id)
        ui_state = _build_ui_from_events(events)

        return SessionState(
            session_id=session_id,
            events=events,
            ui=ui_state,
        )
    finally:
        db.close()


def delete_session(session_id: str) -> bool:
    """Delete a session and all its events."""
    db = next(get_db())
    try:
        session = get_session(db, session_id)
        if session is None:
            return False
        
        # Delete all events for this session
        db.query(InputEventModel).filter(InputEventModel.session_id == session_id).delete()
        
        # Delete the session
        db.delete(session)
        db.commit()
        return True
    finally:
        db.close()


__all__ = ["create_session", "list_sessions", "get_session_state", "delete_session", "ensure_session"]
