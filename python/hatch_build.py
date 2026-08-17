"""Copy the game's web files into the package before a build.

The browser game lives at the repository root so it can be served as a plain
static site. The Python package has to carry its own copy, because a wheel
installed into site-packages has no repository around it. This hook copies
``../web`` into ``src/playbounce/web`` at build time, which keeps one editable
copy of the game in the repository instead of two that can drift apart.

Building from an unpacked sdist has no ``../web`` to copy, so the assets
already vendored into ``src/playbounce/web`` are left where they are.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

from hatchling.builders.hooks.plugin.interface import BuildHookInterface

# Every file type the game is made of. Anything else in web/ is not copied, so
# a stray note or editor backup can't ride along into a release.
ASSET_SUFFIXES = frozenset({".html", ".css", ".js", ".svg", ".png", ".ico", ".webmanifest"})


class CustomBuildHook(BuildHookInterface):
    """Vendors the browser game into the package directory."""

    PLUGIN_NAME = "custom"

    def initialize(self, version: str, build_data: dict[str, Any]) -> None:
        """Refresh ``src/playbounce/web`` from the repository's ``web/``."""
        project = Path(self.root)
        source = project.parent / "web"
        target = project / "src" / "playbounce" / "web"

        if not (source / "index.html").is_file():
            if (target / "index.html").is_file():
                return
            raise FileNotFoundError(
                f"No game to package: neither {source / 'index.html'} nor "
                f"{target / 'index.html'} exists."
            )

        if target.exists():
            shutil.rmtree(target)
        target.mkdir(parents=True)

        copied = 0
        for item in sorted(source.iterdir()):
            if item.is_file() and item.suffix.lower() in ASSET_SUFFIXES:
                shutil.copy2(item, target / item.name)
                copied += 1

        if not (target / "index.html").is_file():
            raise FileNotFoundError(f"Copied {copied} files but none was index.html.")
