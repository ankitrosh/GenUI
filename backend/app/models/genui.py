"""Pydantic models for GenUI Schema v1.0 validation."""
from typing import Literal, Union, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict, ValidationError, model_validator


# ============================================================================
# Base Model
# ============================================================================

class GenUIBaseModel(BaseModel):
    """Base model enforcing strict GenUI schema structure."""
    model_config = ConfigDict(extra="forbid")


# ============================================================================
# Enums
# ============================================================================

GapSize = Literal["none", "xsmall", "small", "medium", "large"]
Alignment = Literal["start", "center", "end", "stretch"]
Distribution = Literal["start", "center", "end", "spaceBetween", "spaceAround", "spaceEvenly"]
UsageHint = Literal["h1", "h2", "h3", "body", "caption", "label", "monospace"]
ImageUsageHint = Literal["icon", "avatar", "smallFeature", "mediumFeature", "largeFeature", "header"]
ObjectFit = Literal["contain", "cover", "fill", "none", "scale-down"]
SchemaVersion = Literal["genui-1.0"]
SurfaceName = str
JSONPointer = str


# ============================================================================
# Data Binding Types
# ============================================================================

class TextValueLiteral(GenUIBaseModel):
    """Literal text value."""
    literal: str


class TextValueLegacyLiteral(GenUIBaseModel):
    """Legacy literal text value using 'literalString'."""
    literalString: str


class TextValuePath(GenUIBaseModel):
    """Data-bound text value via JSON pointer."""
    path: JSONPointer


TextValue = Union[TextValueLiteral, TextValueLegacyLiteral, TextValuePath, str]


class SourceValueURL(GenUIBaseModel):
    """Literal URL source."""
    url: str


class SourceValuePath(GenUIBaseModel):
    """Data-bound source value via JSON pointer."""
    path: JSONPointer


SourceValue = Union[SourceValueURL, SourceValuePath, str]


# ============================================================================
# Component Types
# ============================================================================

class ColumnChildren(GenUIBaseModel):
    """Children list for Column component."""
    explicitList: List[str]


class ColumnProps(GenUIBaseModel):
    """Properties for Column component."""
    children: ColumnChildren | None = None
    gap: GapSize | None = None
    alignment: Alignment | None = None


class ColumnComponent(GenUIBaseModel):
    """Column layout: children stacked vertically."""
    Column: ColumnProps


class RowChildren(GenUIBaseModel):
    """Children list for Row component."""
    explicitList: List[str]


class RowProps(GenUIBaseModel):
    """Properties for Row component."""
    children: RowChildren | None = None
    gap: GapSize | None = None
    alignment: Alignment | None = None
    distribution: Distribution | None = None


class RowComponent(GenUIBaseModel):
    """Row layout: children arranged horizontally."""
    Row: RowProps


class CardProps(GenUIBaseModel):
    """Properties for Card component."""
    child: str | None = None


class CardComponent(GenUIBaseModel):
    """Card: visual container wrapping a single child."""
    Card: CardProps


class DividerComponent(GenUIBaseModel):
    """Divider: visual separator with no children."""
    Divider: Dict[str, Any] = Field(default_factory=dict)


class TextProps(GenUIBaseModel):
    """Properties for Text component."""
    text: TextValue
    usageHint: UsageHint | None = None


class TextComponent(GenUIBaseModel):
    """Text: displays text content."""
    Text: TextProps


class IconProps(GenUIBaseModel):
    """Properties for Icon component."""
    source: SourceValue | None = None
    name: TextValue | None = None


class IconComponent(GenUIBaseModel):
    """Icon: displays an icon."""
    Icon: IconProps


class ImageProps(GenUIBaseModel):
    """Properties for Image component."""
    source: SourceValue | None = None
    url: SourceValue | None = None
    altText: TextValue | None = None
    usageHint: ImageUsageHint | None = None
    fit: ObjectFit | None = None

    @model_validator(mode="after")
    def require_source(self):
        if self.source is None and self.url is None:
            raise ValueError("Image requires either 'source' or 'url'")
        return self


class ImageComponent(GenUIBaseModel):
    """Image: displays an image."""
    Image: ImageProps


# Union of all component types
ComponentDefinition = Union[
    ColumnComponent,
    RowComponent,
    CardComponent,
    DividerComponent,
    TextComponent,
    IconComponent,
    ImageComponent,
]


class Component(GenUIBaseModel):
    """Component entry in the flat component list."""
    id: str
    component: ComponentDefinition


# ============================================================================
# Message Types
# ============================================================================

class SurfaceUpdate(GenUIBaseModel):
    """Surface update: declares UI structure for a surface."""
    type: Literal["surfaceUpdate"]
    schemaVersion: SchemaVersion
    surface: SurfaceName
    components: List[Component]


class DataModelUpdate(GenUIBaseModel):
    """Data model update: provides nested JSON data for binding."""
    type: Literal["dataModelUpdate"]
    schemaVersion: SchemaVersion
    data: Dict[str, Any]


class BeginRendering(GenUIBaseModel):
    """Begin rendering: signals that a surface is ready to be rendered."""
    type: Literal["beginRendering"]
    schemaVersion: SchemaVersion
    surface: SurfaceName


# Union of all GenUI message types
GenUIMessage = Union[SurfaceUpdate, DataModelUpdate, BeginRendering]


def _validate_single_message(data: Dict[str, Any]) -> GenUIMessage:
    try:
        message_type = data.get("type")
        if isinstance(message_type, str):
            normalized = message_type.lower()
            if normalized == "surfaceupdate":
                data["type"] = "surfaceUpdate"
            elif normalized == "datamodelupdate":
                data["type"] = "dataModelUpdate"
            elif normalized == "beginrendering":
                data["type"] = "beginRendering"
            message_type = data.get("type")
        
        if message_type == "surfaceUpdate":
            return SurfaceUpdate.model_validate(data)
        elif message_type == "dataModelUpdate":
            return DataModelUpdate.model_validate(data)
        elif message_type == "beginRendering":
            return BeginRendering.model_validate(data)
        else:
            raise ValueError(
                f"Unknown message type: {message_type}. Expected 'surfaceUpdate', "
                "'dataModelUpdate', or 'beginRendering'"
            )
    except ValidationError as e:
        raise ValueError(f"GenUI schema validation failed: {e}") from e
    except Exception as e:
        raise ValueError(f"GenUI schema validation failed: {str(e)}") from e


# ============================================================================
# Validation Functions
# ============================================================================

def validate_genui_message(data: Dict[str, Any]) -> GenUIMessage:
    """
    Validate a single GenUI message dictionary and return its model.
    
    Args:
        data: Dictionary representing one GenUI message.
    """
    if not isinstance(data, dict):
        raise ValueError("Expected a GenUI message object for validation.")
    return _validate_single_message(data)


def validate_genui_message_list(data: Any) -> List[GenUIMessage]:
    """
    Validate a list of GenUI messages and ensure required message types exist.
    
    Args:
        data: Parsed JSON value expected to be a list of message dicts.
        
    Returns:
        List of validated GenUI message models.
    """
    if not isinstance(data, list):
        raise ValueError("Expected LLM response to be a JSON array of GenUI messages.")
    
    validated_messages: List[GenUIMessage] = []
    for index, item in enumerate(data):
        if not isinstance(item, dict):
            raise ValueError(f"Message at index {index} must be a JSON object.")
        validated_messages.append(_validate_single_message(item))
    
    message_types = {message.type for message in validated_messages}
    required_types = {"surfaceUpdate", "dataModelUpdate"}
    missing = sorted(required_types - message_types)
    if missing:
        raise ValueError(
            "GenUI response missing required message types: " + ", ".join(missing)
        )
    
    return validated_messages
