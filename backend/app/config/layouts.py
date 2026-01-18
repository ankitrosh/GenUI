from typing import Any, Dict, List

# Layout catalog for UI layouts. Each intent maps to ordered slots.
LAYOUT_CATALOG: Dict[str, Dict[str, Any]] = {
    "N1_FOCUS": {"topics": 1, "slots": [{"id": "A", "size": "L"}]},
    "N1_RELAXED": {"topics": 1, "slots": [{"id": "A", "size": "M"}]},
    "N2_SPLIT_EQUAL": {"topics": 2, "slots": [{"id": "A", "size": "M"}, {"id": "B", "size": "M"}]},
    "N2_PRIMARY_LEFT": {"topics": 2, "slots": [{"id": "A", "size": "L"}, {"id": "B", "size": "S"}]},
    "N3_PRIMARY_LEFT_STACKED_RIGHT": {
        "topics": 3,
        "slots": [{"id": "A", "size": "L"}, {"id": "B", "size": "S"}, {"id": "C", "size": "S"}],
    },
    "N3_BALANCED_ROW": {
        "topics": 3,
        "slots": [{"id": "A", "size": "M"}, {"id": "B", "size": "M"}, {"id": "C", "size": "M"}],
    },
    "N4_GRID": {
        "topics": 4,
        "slots": [{"id": "A", "size": "M"}, {"id": "B", "size": "M"}, {"id": "C", "size": "M"}, {"id": "D", "size": "M"}],
    },
    "N4_TOP_HEAVY": {
        "topics": 4,
        "slots": [{"id": "A", "size": "L"}, {"id": "B", "size": "L"}, {"id": "C", "size": "S"}, {"id": "D", "size": "S"}],
    },
}

DEFAULT_SESSION_ID = "demo-session"
MAX_FRAMES = 4
MAX_ITEMS_PER_FRAME = 6

__all__ = ["DEFAULT_SESSION_ID", "LAYOUT_CATALOG", "MAX_FRAMES", "MAX_ITEMS_PER_FRAME"]
