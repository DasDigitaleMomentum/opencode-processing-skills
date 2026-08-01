"""agent-checkpoint plugin — session-heartbeat checkpoints for Hermes.

Mirrors the shared checkpoint contract implemented by
``packages/checkpoint-core/src/index.js`` so Hermes sessions append
byte-compatible JSONL records without a Node dependency:

* ``checkpoint(done, next, step_failed=False, close_session=False)`` validates inputs, resolves
  the hook-bound native ``session_id`` and the agent process working
  directory (workspace root), evaluates the telemetry slot, and appends exact
  ``open`` → eight-field record (``agent``/``session_title`` always ``null``)
  → optional ``closed`` lines to
  ``<workspace>/.agent-checkpoints/<encoded-session-id>.jsonl``.
* ``checkpoint_path(session_id)`` returns the shared workspace-relative
  path without writing.
* A verified new-parent ``on_session_start`` appends one exact four-field
  ``session_status: open`` record to that parent-owned log. Every checkpoint
  lazily confirms open and may declare close; no host close hook is registered.

Identity and telemetry are process-local state captured via lifecycle hooks
(``on_session_start``, ``subagent_start``, ``pre_tool_call``,
``pre_api_request``); that state is never persisted into JSONL. Native child
session IDs resolve internally to their parent-owned log while invocation and
telemetry state remain isolated by native session.
"""

from __future__ import annotations

import json
import math
import os
import re
import threading
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

# ---------------------------------------------------------------------------
# Contract constants (mirror packages/checkpoint-core/src/index.js)
# ---------------------------------------------------------------------------

LEGACY_RECORD_FIELDS = [
    "timestamp",
    "session_id",
    "done",
    "next",
    "step_failed",
    "context_used",
]
METADATA_FIELDS = ["agent", "session_title"]
RECORD_FIELDS = LEGACY_RECORD_FIELDS + METADATA_FIELDS
STATUS_RECORD_FIELDS = ["timestamp", "session_id", "event", "status"]
_SESSION_STATUS_VALUES = frozenset({"open", "closed"})

_UTC_TIMESTAMP = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$")

_CHECKPOINT_DIR = ".agent-checkpoints"
_PLUGIN_TOOLS = frozenset({"checkpoint", "checkpoint_path"})

# Small, deliberate table of defensible model context limits (tokens). A miss
# degrades telemetry to an honest ``null`` instead of a fabricated estimate;
# AGENT_CHECKPOINT_CONTEXT_LIMIT_TOKENS overrides/extends for other models.
_MODEL_CONTEXT_LIMITS = {
    "claude-sonnet-4-6": 200000,
    "claude-opus-4-5": 200000,
    "claude-haiku-4-5": 200000,
    "gpt-4": 8192,
    "gpt-4-32k": 32768,
    "gpt-4-turbo": 128000,
    "gpt-4-turbo-preview": 128000,
    "gpt-4-1106-preview": 128000,
    "gpt-4-0125-preview": 128000,
    "gpt-4o": 128000,
    "gpt-4o-mini": 128000,
}
# Prefixes only where every variant sharing the prefix shares the limit;
# unlisted variants degrade to an honest null instead of a wrong estimate.
_MODEL_PREFIX_LIMITS = (
    ("claude-", 200000),
    ("gpt-4o", 128000),
    ("gpt-4-turbo", 128000),
    ("gpt-4-32k", 32768),
)
_CONTEXT_LIMIT_ENV = "AGENT_CHECKPOINT_CONTEXT_LIMIT_TOKENS"
_INSTRUCTION_PATH = Path(__file__).with_name("checkpoint-instruction.md")
_CHECKPOINT_INSTRUCTION = _INSTRUCTION_PATH.read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# Process-local hook state (never persisted into JSONL)
# ---------------------------------------------------------------------------

_LOCK = threading.Lock()
_SESSIONS = {}
_PENDING = set()
_TELEMETRY = {}


def _reset_state() -> None:
    """Clear all hook-captured state. Self-test helper; not used at runtime."""
    with _LOCK:
        _SESSIONS.clear()
        _PENDING.clear()
        _TELEMETRY.clear()


# ---------------------------------------------------------------------------
# Contract primitives (mirror checkpoint and session-status record APIs)
# ---------------------------------------------------------------------------

def _is_valid_utc_timestamp(value) -> bool:
    if not isinstance(value, str) or not _UTC_TIMESTAMP.match(value):
        return False
    fmt = "%Y-%m-%dT%H:%M:%S.%fZ" if "." in value else "%Y-%m-%dT%H:%M:%SZ"
    try:
        parsed = datetime.strptime(value, fmt)
    except ValueError:
        return False
    expected = value if "." in value else value[:-1] + ".000Z"
    roundtrip = parsed.strftime("%Y-%m-%dT%H:%M:%S.") + f"{parsed.microsecond // 1000:03d}Z"
    return roundtrip == expected


def _require_session_id(session_id) -> None:
    if not isinstance(session_id, str) or len(session_id) == 0:
        raise TypeError("sessionId must be a non-empty string")


def _encode_session_id(session_id) -> str:
    """encodeURIComponent equivalent (mirrors encodeSessionId)."""
    _require_session_id(session_id)
    try:
        return quote(session_id, safe="!*'()")
    except UnicodeEncodeError as error:
        raise TypeError(f"sessionId must be valid Unicode: {error}") from error


def _validate_record(record):
    """Mirror validateCheckpointRecord: exact 8-or-6 field set and types."""
    if not isinstance(record, dict):
        raise TypeError("checkpoint record must be an object")

    keys = sorted(record.keys())
    has_current_schema = keys == sorted(RECORD_FIELDS)
    has_legacy_schema = keys == sorted(LEGACY_RECORD_FIELDS)
    if not has_current_schema and not has_legacy_schema:
        raise TypeError(
            "checkpoint record must contain exactly the legacy fields "
            f"({', '.join(LEGACY_RECORD_FIELDS)}) or current fields "
            f"({', '.join(RECORD_FIELDS)})"
        )

    if not _is_valid_utc_timestamp(record.get("timestamp")):
        raise TypeError("timestamp must be a valid ISO UTC timestamp")
    if not isinstance(record.get("session_id"), str) or len(record["session_id"]) == 0:
        raise TypeError("session_id must be a non-empty string")
    if not isinstance(record.get("done"), str) or not isinstance(record.get("next"), str):
        raise TypeError("done and next must be strings")
    if not isinstance(record.get("step_failed"), bool):
        raise TypeError("step_failed must be a boolean")
    context_used = record.get("context_used")
    if context_used is not None and (
        isinstance(context_used, bool)
        or not isinstance(context_used, (int, float))
        or not math.isfinite(context_used)
        or context_used < 0
        or context_used > 1
    ):
        raise TypeError("context_used must be null or a finite number from 0 through 1")
    if has_current_schema:
        for field in METADATA_FIELDS:
            value = record.get(field)
            if value is not None and (not isinstance(value, str) or len(value.strip()) == 0):
                raise TypeError(f"{field} must be null or a non-empty string")
    return record


def _normalize_record(record):
    """Mirror normalizeCheckpointRecord: legacy reads gain null metadata."""
    _validate_record(record)
    normalized = dict(record)
    normalized["agent"] = record.get("agent") if record.get("agent") is not None else None
    normalized["session_title"] = (
        record.get("session_title") if record.get("session_title") is not None else None
    )
    return normalized


def _validate_status_record(record):
    """Mirror validateSessionStatusRecord: exact four-field event variant."""
    if not isinstance(record, dict):
        raise TypeError("session status record must be an object")
    if sorted(record.keys()) != sorted(STATUS_RECORD_FIELDS):
        raise TypeError(
            "session status record must contain exactly the fields "
            f"({', '.join(STATUS_RECORD_FIELDS)})"
        )
    if not _is_valid_utc_timestamp(record.get("timestamp")):
        raise TypeError("timestamp must be a valid ISO UTC timestamp")
    if not isinstance(record.get("session_id"), str) or len(record["session_id"]) == 0:
        raise TypeError("session_id must be a non-empty string")
    if record.get("event") != "session_status":
        raise TypeError('event must be exactly "session_status"')
    if record.get("status") not in _SESSION_STATUS_VALUES:
        raise TypeError('status must be exactly "open" or "closed"')
    return record


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _timestamp_from_clock(clock) -> str:
    if not callable(clock):
        raise TypeError("clock must be a function")
    value = clock()
    if isinstance(value, datetime):
        moment = value
    else:
        try:
            moment = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            raise TypeError("clock must return a valid date value") from None
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    moment = moment.astimezone(timezone.utc)
    return moment.strftime("%Y-%m-%dT%H:%M:%S.") + f"{moment.microsecond // 1000:03d}Z"


def _create_record(
    session_id,
    done,
    next_,
    step_failed=False,
    context_used=None,
    agent=None,
    session_title=None,
    clock=_utc_now,
):
    """Mirror createCheckpointRecord (eight-field, validated)."""
    record = {
        "timestamp": _timestamp_from_clock(clock),
        "session_id": session_id,
        "done": done,
        "next": next_,
        "step_failed": step_failed,
        "context_used": context_used,
        "agent": agent,
        "session_title": session_title,
    }
    _validate_record(record)
    return record


def _create_status_record(session_id, status, clock=_utc_now):
    """Mirror createSessionStatusRecord (four-field, validated)."""
    record = {
        "timestamp": _timestamp_from_clock(clock),
        "session_id": session_id,
        "event": "session_status",
        "status": status,
    }
    _validate_status_record(record)
    return record


def checkpoint_path_for(session_id) -> str:
    """Mirror checkpointPath: shared workspace-relative path, write-free."""
    return f"{_CHECKPOINT_DIR}/{_encode_session_id(session_id)}.jsonl"


def _resolve_checkpoint_file(workspace_root, session_id):
    """Mirror resolveCheckpointFile: containment-checked absolute paths."""
    if not isinstance(workspace_root, str) or len(workspace_root) == 0:
        raise TypeError("workspaceRoot must be a non-empty string")

    root = Path(workspace_root).resolve()
    checkpoint_root = (root / _CHECKPOINT_DIR).resolve()
    relative_path = checkpoint_path_for(session_id)
    file_path = root.joinpath(*relative_path.split("/")).resolve()
    containment = os.path.relpath(file_path, checkpoint_root)

    if containment == ".." or containment.startswith(f"..{os.sep}") or os.path.isabs(containment):
        raise ValueError("checkpoint path escaped the workspace checkpoint directory")

    return checkpoint_root, file_path, relative_path


def _append_record(workspace_root, session_id, record) -> str:
    checkpoint_root, file_path, relative_path = _resolve_checkpoint_file(workspace_root, session_id)
    checkpoint_root.mkdir(parents=True, exist_ok=True)
    line = json.dumps(record, ensure_ascii=False, separators=(",", ":"))
    with open(file_path, "a", encoding="utf-8") as handle:
        handle.write(line + "\n")
    return relative_path


# ---------------------------------------------------------------------------
# Telemetry (estimate with honest null fallback)
# ---------------------------------------------------------------------------

def _context_limit_for_model(model):
    if not isinstance(model, str) or not model.strip():
        return None
    leaf = model.strip().lower().rsplit("/", 1)[-1]
    if leaf in _MODEL_CONTEXT_LIMITS:
        return _MODEL_CONTEXT_LIMITS[leaf]
    for prefix, limit in _MODEL_PREFIX_LIMITS:
        if leaf.startswith(prefix):
            return limit
    return None


def _env_context_limit():
    raw = os.environ.get(_CONTEXT_LIMIT_ENV, "").strip()
    if not raw:
        return None
    try:
        value = int(raw)
    except ValueError:
        return None
    return value if value > 0 else None


def _telemetry(native_session_id=None):
    """Return ``(context_used, remaining_k_tokens)`` or ``(None, None)``.

    Estimate only: the latest valid ``pre_api_request`` token count divided
    by a known model context limit (table or AGENT_CHECKPOINT_CONTEXT_LIMIT_TOKENS).
    Absent/invalid data or an unknown limit degrades to honest unknowns.
    """
    with _LOCK:
        if native_session_id is None:
            if len(_TELEMETRY) != 1:
                return None, None
            native_session_id = next(iter(_TELEMETRY))
        slot = _TELEMETRY.get(native_session_id)
    if slot is None:
        return None, None
    limit = _env_context_limit() or _context_limit_for_model(slot.get("model"))
    if limit is None:
        return None, None
    approx = slot["approx_input_tokens"]
    context_used = min(max(approx / limit, 0.0), 1.0)
    remaining_k = max(0, round((limit - approx) / 1000))
    return context_used, remaining_k


# ---------------------------------------------------------------------------
# Lifecycle hooks
# ---------------------------------------------------------------------------

def _on_session_start(session_id: str = "", **_) -> None:
    """Initialize a parent mapping and persist the observed parent open."""
    _require_session_id(session_id)
    workspace_root = os.getcwd()
    with _LOCK:
        _SESSIONS[session_id] = {"root_session_id": session_id, "cwd": workspace_root}
    record = _create_status_record(session_id, "open")
    _append_record(workspace_root, session_id, record)


def _on_subagent_start(parent_session_id: str = "", child_session_id: str = "", **_) -> None:
    """Map a native child to its transitive parent-owned checkpoint log."""
    _require_session_id(parent_session_id)
    _require_session_id(child_session_id)
    with _LOCK:
        parent = _SESSIONS.get(parent_session_id)
        if parent is None:
            parent = {"root_session_id": parent_session_id, "cwd": os.getcwd()}
            _SESSIONS[parent_session_id] = parent
        _SESSIONS[child_session_id] = {
            "root_session_id": parent["root_session_id"],
            "cwd": parent["cwd"],
        }


def _on_pre_tool_call(tool_name: str = "", session_id: str = "", **_) -> None:
    """Bind this plugin invocation to its native Hermes session."""
    if tool_name not in _PLUGIN_TOOLS:
        return
    _require_session_id(session_id)
    with _LOCK:
        if session_id not in _SESSIONS:
            _SESSIONS[session_id] = {"root_session_id": session_id, "cwd": os.getcwd()}
        _PENDING.add(session_id)


def _on_pre_api_request(session_id: str = "", approx_input_tokens=None, model=None, **_) -> None:
    """Record one native session's latest valid token estimate and model."""
    _require_session_id(session_id)
    valid = (
        isinstance(approx_input_tokens, (int, float))
        and not isinstance(approx_input_tokens, bool)
        and math.isfinite(approx_input_tokens)
        and approx_input_tokens >= 0
    )
    with _LOCK:
        if not valid:
            _TELEMETRY.pop(session_id, None)
        else:
            _TELEMETRY[session_id] = {
                "approx_input_tokens": approx_input_tokens,
                "model": model if isinstance(model, str) and model else None,
            }


def _resolve_invocation(native_session_id=None):
    """Resolve ``(native_session_id, root_session_id, workspace_root)``.

    Never invents identity: invalid, unknown, or ambiguous sessions raise
    visible errors (surfaced to the model by the Hermes tool dispatcher).
    """
    if native_session_id is not None:
        _require_session_id(native_session_id)
    with _LOCK:
        if native_session_id is None:
            if len(_PENDING) == 1:
                native_session_id = next(iter(_PENDING))
            elif not _PENDING and len(_SESSIONS) == 1:
                native_session_id = next(iter(_SESSIONS))
            elif len(_PENDING) > 1:
                raise ValueError(
                    "checkpoint has multiple bound Hermes sessions; "
                    "the native invocation session_id is required"
                )
        session = _SESSIONS.get(native_session_id)
    if session is None:
        raise ValueError(
            "checkpoint has no bound Hermes session (on_session_start/pre_tool_call "
            "did not fire in this process); refusing to invent a session identity"
        )
    return native_session_id, session["root_session_id"], session["cwd"]


# ---------------------------------------------------------------------------
# Agent-callable tools
# ---------------------------------------------------------------------------

def checkpoint(
    done,
    next,
    step_failed=False,
    close_session=False,
    *,
    _clock=_utc_now,
    _native_session_id=None,
) -> str:
    """Append an eight-field checkpoint record for the hook-bound session."""
    if not isinstance(close_session, bool):
        raise TypeError("close_session must be a boolean")
    native_session_id, session_id, workspace_root = _resolve_invocation(_native_session_id)
    context_used, remaining_k = _telemetry(native_session_id)
    timestamp = _timestamp_from_clock(_clock)

    def record_clock():
        return timestamp

    record = _create_record(
        session_id,
        done,
        next,
        step_failed=step_failed,
        context_used=context_used,
        agent=None,
        session_title=None,
        clock=record_clock,
    )
    open_record = _create_status_record(session_id, "open", clock=record_clock)
    closed_record = (
        _create_status_record(session_id, "closed", clock=record_clock)
        if close_session
        else None
    )
    _resolve_checkpoint_file(workspace_root, session_id)
    _append_record(workspace_root, session_id, open_record)
    _append_record(workspace_root, session_id, record)
    if closed_record is not None:
        _append_record(workspace_root, session_id, closed_record)
    context = "unknown" if context_used is None else f"~{round(context_used * 100)}%"
    remaining = "unknown" if remaining_k is None else f"~{remaining_k}k"
    return (
        "Checkpoint saved.\n"
        f"Context (harness telemetry): {context}\n"
        f"Remaining K-tokens (context-window headroom): {remaining}"
    )


def checkpoint_path(session_id) -> str:
    """Return the shared workspace-relative checkpoint path without writing."""
    return checkpoint_path_for(session_id)


# ---------------------------------------------------------------------------
# Tool schemas and registration
# ---------------------------------------------------------------------------

_CHECKPOINT_SCHEMA = {
    "name": "checkpoint",
    "description": (
        "Append a session-heartbeat checkpoint to the shared "
        ".agent-checkpoints/ JSONL log: the subtask just completed (done), "
        "the next announced subtask (next), and whether the step failed "
        "(step_failed). close_session is true only on a subagent's final "
        "checkpoint or intentional whole-session end. Session identity, workspace, and telemetry come "
        "from Hermes lifecycle hooks, never from model-carried arguments."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "done": {"type": "string", "description": "Subtask just completed (three words)."},
            "next": {"type": "string", "description": "Next announced subtask (three words)."},
            "step_failed": {
                "type": "boolean",
                "description": "True when the completed step failed (default false).",
            },
            "close_session": {
                "type": "boolean",
                "default": False,
                "description": "True only for the final checkpoint that closes this persisted session.",
            },
        },
        "required": ["done", "next"],
    },
}

_CHECKPOINT_PATH_SCHEMA = {
    "name": "checkpoint_path",
    "description": (
        "Return the shared workspace-relative .agent-checkpoints/ JSONL path "
        "for a session id without writing anything."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "session_id": {"type": "string", "description": "Session id to resolve."},
        },
        "required": ["session_id"],
    },
}


def _handle_checkpoint(args, session_id="", **_) -> str:
    if not isinstance(args, dict):
        raise TypeError("checkpoint expects an arguments object")
    return checkpoint(
        args.get("done"),
        args.get("next"),
        step_failed=args.get("step_failed", False),
        close_session=args.get("close_session", False),
        _native_session_id=session_id,
    )


def _on_pre_llm_call(**_):
    """Inject the complete heartbeat instruction into parent and child turns."""
    return {"context": _CHECKPOINT_INSTRUCTION}


def _handle_checkpoint_path(args, **_) -> str:
    if not isinstance(args, dict):
        raise TypeError("checkpoint_path expects an arguments object")
    session_id = args.get("session_id")
    if not isinstance(session_id, str) or not session_id:
        raise TypeError("session_id must be a non-empty string")
    return checkpoint_path(session_id)


def register(ctx) -> None:
    """Plugin entry point called once by the Hermes plugin loader."""
    ctx.register_tool(
        name="checkpoint",
        toolset="agent-checkpoint",
        schema=_CHECKPOINT_SCHEMA,
        handler=_handle_checkpoint,
    )
    ctx.register_tool(
        name="checkpoint_path",
        toolset="agent-checkpoint",
        schema=_CHECKPOINT_PATH_SCHEMA,
        handler=_handle_checkpoint_path,
    )
    ctx.register_hook("on_session_start", _on_session_start)
    ctx.register_hook("subagent_start", _on_subagent_start)
    ctx.register_hook("pre_tool_call", _on_pre_tool_call)
    ctx.register_hook("pre_api_request", _on_pre_api_request)
    ctx.register_hook("pre_llm_call", _on_pre_llm_call)
