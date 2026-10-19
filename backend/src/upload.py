"""
Upload session manager for Inventory Compass.
Manages in-memory upload sessions backed by temporary files.
Each upload gets a UUID, a status, validation results, and a temp CSV path.

Storage policy:
  - Session metadata lives in an in-memory dict (process-scoped).
  - Raw CSV bytes are written to a NamedTemporaryFile (OS temp dir).
  - Sessions expire after SESSION_TTL_SECONDS (default: 2 hours).
  - Expired sessions are cleaned up lazily on the next write operation.

Security:
  - Upload IDs are UUID4 (not guessable).
  - Filenames from the client are never used on disk; a UUID-based name is used.
  - Temp files are deleted when the session expires or is explicitly deleted.
  - Internal temp paths are never returned to API callers.
"""

from __future__ import annotations

import os
import tempfile
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional

SESSION_TTL_SECONDS = 7200  # 2 hours

_sessions: Dict[str, Dict[str, Any]] = {}
_lock = Lock()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def create_session(
    file_bytes: bytes,
    original_filename: str,
) -> str:
    """
    Write raw CSV bytes to a temp file and register a new upload session.

    Returns:
        upload_id (UUID4 string)
    """
    _purge_expired()

    upload_id = str(uuid.uuid4())

    # Write to temp file with a safe name (never the client-supplied filename)
    suffix = ".csv"
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=suffix, prefix=f"ic_upload_{upload_id[:8]}_")
    os.close(tmp_fd)
    Path(tmp_path).write_bytes(file_bytes)

    safe_display_name = _sanitize_display_name(original_filename)

    session: Dict[str, Any] = {
        "upload_id": upload_id,
        "status": "pending",          # pending | valid | invalid
        "display_filename": safe_display_name,
        "file_size_bytes": len(file_bytes),
        "created_at": _now_utc(),
        "_temp_path": tmp_path,       # Internal only — not returned to clients
        # Populated after validation
        "row_count": 0,
        "detected_columns": [],
        "canonical_mapping": {},
        "unmapped_columns": [],
        "date_range": None,
        "preview_rows": [],
        "validation_errors": [],
        "validation_warnings": [],
    }

    with _lock:
        _sessions[upload_id] = session

    return upload_id


def get_session(upload_id: str) -> Optional[Dict[str, Any]]:
    """Return a public-safe copy of the session (temp path excluded)."""
    with _lock:
        session = _sessions.get(upload_id)
    if session is None:
        return None
    return _public_view(session)


def update_session_validation(upload_id: str, validation_result: Dict[str, Any]) -> bool:
    """Merge validation results into the session. Returns False if session not found."""
    with _lock:
        session = _sessions.get(upload_id)
        if session is None:
            return False
        session["status"] = validation_result.get("status", "invalid")
        session["row_count"] = validation_result.get("row_count", 0)
        session["detected_columns"] = validation_result.get("detected_columns", [])
        session["canonical_mapping"] = validation_result.get("canonical_mapping", {})
        session["unmapped_columns"] = validation_result.get("unmapped_columns", [])
        session["date_range"] = validation_result.get("date_range")
        session["preview_rows"] = validation_result.get("preview_rows", [])
        session["validation_errors"] = validation_result.get("errors", [])
        session["validation_warnings"] = validation_result.get("warnings", [])
    return True


def get_temp_path(upload_id: str) -> Optional[Path]:
    """Return the temp file path for an upload. Internal use only."""
    with _lock:
        session = _sessions.get(upload_id)
    if session is None:
        return None
    return Path(session["_temp_path"])


def delete_session(upload_id: str) -> bool:
    """Remove session and delete its temp file. Returns False if not found."""
    with _lock:
        session = _sessions.pop(upload_id, None)
    if session is None:
        return False
    _delete_temp_file(session["_temp_path"])
    return True


def list_sessions() -> List[Dict[str, Any]]:
    """Return public views of all active (non-expired) sessions."""
    _purge_expired()
    with _lock:
        return [_public_view(s) for s in _sessions.values()]


def store_session_forecast(upload_id: str, forecast_data: Dict[str, Any]) -> bool:
    """Store the latest forecast output on the upload session for rapid retrieval."""
    with _lock:
        session = _sessions.get(upload_id)
        if session is None:
            return False
        session["forecast_result"] = forecast_data
    return True


def get_session_forecast(upload_id: str) -> Optional[Dict[str, Any]]:
    """Get the cached forecast output for an upload session, if one has been generated."""
    with _lock:
        session = _sessions.get(upload_id)
    if session is None:
        return None
    return session.get("forecast_result")


def store_session_replenishment(upload_id: str, replenishment_data: Dict[str, Any]) -> bool:
    """Store the latest replenishment recommendations on the upload session."""
    with _lock:
        session = _sessions.get(upload_id)
        if session is None:
            return False
        session["replenishment_result"] = replenishment_data
    return True


def get_session_replenishment(upload_id: str) -> Optional[Dict[str, Any]]:
    """Get cached replenishment recommendations for an upload session."""
    with _lock:
        session = _sessions.get(upload_id)
    if session is None:
        return None
    return session.get("replenishment_result")


# ---------------------------------------------------------------------------
# Internals
# ---------------------------------------------------------------------------

def _now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def _is_expired(session: Dict[str, Any]) -> bool:
    created = datetime.fromisoformat(session["created_at"])
    return (datetime.now(timezone.utc) - created) > timedelta(seconds=SESSION_TTL_SECONDS)


def _purge_expired() -> None:
    with _lock:
        expired_ids = [uid for uid, s in _sessions.items() if _is_expired(s)]
        for uid in expired_ids:
            s = _sessions.pop(uid)
            _delete_temp_file(s["_temp_path"])


def _delete_temp_file(path: str) -> None:
    try:
        p = Path(path)
        if p.exists():
            p.unlink()
    except Exception:
        pass  # Best-effort cleanup


def _sanitize_display_name(filename: str) -> str:
    """Produce a display-safe filename without path traversal characters."""
    safe = Path(filename).name  # Strip any directory components
    # Keep only safe characters
    safe = "".join(c for c in safe if c.isalnum() or c in ("_", "-", ".", " "))
    return safe[:128] or "upload.csv"


def _public_view(session: Dict[str, Any]) -> Dict[str, Any]:
    """Return session dict with internal fields removed."""
    return {k: v for k, v in session.items() if not k.startswith("_")}
