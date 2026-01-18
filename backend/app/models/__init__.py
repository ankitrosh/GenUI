"""Models package - organized by type."""

# Database models (SQLAlchemy)
from app.models.db import SessionModel, InputEventModel

# API schemas (Pydantic models for API requests/responses)
from app.models.schemas import (
    InputEvent,
    ComponentNode,
    UIState,
    SessionState,
    SessionSummary,
    ComponentType,
)

# GenUI schema models (Pydantic models for GenUI validation)
from app.models.genui import (
    validate_genui_message,
    validate_genui_message_list,
    GenUIMessage,
    SurfaceUpdate,
    DataModelUpdate,
    BeginRendering,
    Component,
    ComponentDefinition,
)

__all__ = [
    # Database models
    "SessionModel",
    "InputEventModel",
    # API schemas
    "InputEvent",
    "ComponentNode",
    "UIState",
    "SessionState",
    "SessionSummary",
    "ComponentType",
    # GenUI models
    "validate_genui_message",
    "validate_genui_message_list",
    "GenUIMessage",
    "SurfaceUpdate",
    "DataModelUpdate",
    "BeginRendering",
    "Component",
    "ComponentDefinition",
]
