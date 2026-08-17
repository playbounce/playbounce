"""playbounce: a brick-breaker game where the wall is somebody's name.

The game itself is a static browser page bundled inside this package. Installing
it gives you a ``playbounce`` command that opens that page.
"""

from __future__ import annotations

__version__ = "1.0.0"

__all__ = ["__version__", "main"]


def main(argv: list[str] | None = None) -> int:
    """Run the command-line interface.

    Args:
        argv: Arguments to parse. ``None`` reads ``sys.argv``.

    Returns:
        The process exit status: 0 on success.
    """
    from .cli import main as _main

    return _main(argv)
