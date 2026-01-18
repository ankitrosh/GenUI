"""API schemas (Pydantic models for request/response validation)."""
from typing import Any, Dict, List, Literal

from pydantic import BaseModel, Field

ComponentType = Literal["Column", "Row", "Card", "Divider", "Text", "Icon", "Image"]


class InputEvent(BaseModel):
    event_id: str
    session_id: str
    seq: int
    payload: Dict[str, Any]


class ComponentNode(BaseModel):
    id: str
    type: ComponentType
    props: Dict[str, Any] = Field(default_factory=dict)
    children: List["ComponentNode"] = Field(default_factory=list)


# enable self-referencing ComponentNode
ComponentNode.model_rebuild()


class UIState(BaseModel):
    """UI surfaces rendered on the screen."""
    surfaces: Dict[str, List[ComponentNode]] = Field(default_factory=dict)


class SessionState(BaseModel):
    """Full session state with all events and UI."""
    session_id: str
    events: List[InputEvent]
    ui: UIState


class SessionSummary(BaseModel):
    """Lightweight session summary for listing (session_id + event_count)."""
    session_id: str
    event_count: int
