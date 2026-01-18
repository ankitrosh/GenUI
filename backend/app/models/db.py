"""Database models (SQLAlchemy ORM)."""
from sqlalchemy import Column, String, Integer, JSON
from app.database import Base


class SessionModel(Base):
    __tablename__ = "sessions"

    session_id = Column(String, primary_key=True, index=True)
    seq_counter = Column(Integer, default=0, nullable=False)


class InputEventModel(Base):
    __tablename__ = "input_events"

    event_id = Column(String, primary_key=True, index=True)
    session_id = Column(String, index=True, nullable=False)
    seq = Column(Integer, nullable=False)
    payload = Column(JSON, nullable=False)
