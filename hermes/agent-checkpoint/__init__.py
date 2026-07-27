"""agent-checkpoint plugin package (Hermes user plugin).

The Hermes plugin loader requires an ``__init__.py`` exposing
``register(ctx)``; tool and hook implementations live in
``agent_checkpoint.py``.
"""

from .agent_checkpoint import (
    checkpoint,
    checkpoint_path,
    register,
)

__all__ = ["checkpoint", "checkpoint_path", "register"]
