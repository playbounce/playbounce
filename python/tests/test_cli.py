"""Tests for the playbounce command.

Failure paths first: a missing game, an exhausted port range, a machine with no
browser. The happy path is checked last, and against the files an install
ships rather than fixtures built to match the code's assumptions.
"""

from __future__ import annotations

import socket
from pathlib import Path

import pytest

import playbounce
from playbounce import cli

# Every module index.html loads. If the packaging drops one of these the game
# opens to a blank page, which no test of the CLI's return code would catch.
REQUIRED_SCRIPTS = (
    "trace.js",
    "bricks.js",
    "names.js",
    "taunts.js",
    "audio.js",
    "powerups.js",
    "beast.js",
    "game.js",
    "ui.js",
)


# ---- failures ------------------------------------------------------------


def test_game_root_raises_when_nothing_is_installed(monkeypatch, tmp_path):
    """A package with no web files reports it instead of opening nothing."""
    monkeypatch.setattr(cli, "__file__", str(tmp_path / "pkg" / "cli.py"))
    with pytest.raises(cli.GameNotFound) as caught:
        cli.game_root()
    assert "reinstall" in str(caught.value).lower()


def test_missing_game_exits_nonzero_and_says_so(monkeypatch, capsys):
    """The failure reaches the user on stderr, not as a traceback."""
    def absent() -> Path:
        raise cli.GameNotFound("the game's web files are missing from this install.")

    monkeypatch.setattr(cli, "game_root", absent)
    assert cli.main([]) == 1
    assert "missing" in capsys.readouterr().err


def test_find_port_raises_when_every_candidate_is_taken(monkeypatch):
    """An exhausted range names a port to try next rather than hanging."""
    monkeypatch.setattr(cli, "port_is_free", lambda port: False)
    with pytest.raises(cli.NoFreePort) as caught:
        cli.find_port(9000, attempts=3)
    assert "9003" in str(caught.value)


def test_exhausted_ports_exit_nonzero(monkeypatch, capsys):
    """--serve with nowhere to bind fails loudly."""
    monkeypatch.setattr(cli, "port_is_free", lambda port: False)
    assert cli.main(["--serve"]) == 1
    assert "in use" in capsys.readouterr().err


def test_no_browser_available_prints_the_address(monkeypatch, capsys):
    """A machine with no browser still tells the user where the game is."""
    monkeypatch.setattr(cli, "open_in_browser", lambda url: False)
    assert cli.main([]) == 1
    err = capsys.readouterr().err
    assert "index.html" in err


def test_open_in_browser_survives_a_browser_error(monkeypatch):
    """webbrowser raising is reported as False, not propagated."""
    import webbrowser

    def explode(url: str, new: int = 0) -> bool:
        raise webbrowser.Error("no runnable browser")

    monkeypatch.setattr(webbrowser, "open", explode)
    assert cli.open_in_browser("file:///nowhere") is False


def test_bad_port_value_is_rejected():
    """A non-numeric port is an argparse error, not a crash mid-serve."""
    with pytest.raises(SystemExit):
        cli.main(["--port", "not-a-number"])


# ---- port selection ------------------------------------------------------


def test_find_port_skips_an_occupied_port():
    """An occupied port is stepped over rather than returned."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as taken:
        taken.bind(("", 0))
        taken.listen(1)
        busy = taken.getsockname()[1]
        assert cli.find_port(busy, attempts=20) != busy


def test_port_is_free_reports_a_bound_port_as_busy():
    """The probe agrees with a socket that is listening."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as taken:
        taken.bind(("", 0))
        taken.listen(1)
        assert cli.port_is_free(taken.getsockname()[1]) is False


# ---- the game that ships -------------------------------------------------


def test_game_root_points_at_a_playable_game():
    """Whatever the install layout, game_root has a complete game in it."""
    root = cli.game_root()
    assert (root / "index.html").is_file()
    for script in REQUIRED_SCRIPTS:
        assert (root / script).is_file(), f"{script} missing from {root}"


def test_index_references_every_script_that_ships():
    """index.html and the shipped files agree, so no load 404s."""
    root = cli.game_root()
    markup = (root / "index.html").read_text(encoding="utf-8")
    for script in REQUIRED_SCRIPTS:
        assert script in markup, f"{script} ships but index.html never loads it"


def test_no_browser_prints_a_url_that_resolves_to_a_file(capsys):
    """The documented 'playbounce --no-browser' recipe prints a usable URL."""
    assert cli.main(["--no-browser"]) == 0
    url = capsys.readouterr().out.strip()
    assert url.startswith("file://")
    assert url.endswith("/index.html")
    assert Path(cli.game_root() / "index.html").as_uri() == url


def test_opening_the_game_reports_success(monkeypatch, capsys):
    """The default path opens the bundled index.html and says where it went."""
    opened: list[str] = []
    monkeypatch.setattr(cli, "open_in_browser", lambda url: opened.append(url) or True)
    assert cli.main([]) == 0
    assert len(opened) == 1
    assert opened[0].startswith("file://")
    assert "default browser" in capsys.readouterr().out


def test_port_implies_serve(monkeypatch):
    """--port on its own serves, without needing --serve alongside it."""
    served: list[int] = []
    monkeypatch.setattr(cli, "serve", lambda root, port, open_browser=True: served.append(port) or 0)
    assert cli.main(["--port", "8123", "--no-browser"]) == 0
    assert served == [8123]


def test_version_matches_the_package(capsys):
    """--version reports the same string as playbounce.__version__."""
    with pytest.raises(SystemExit) as caught:
        cli.main(["--version"])
    assert caught.value.code == 0
    assert capsys.readouterr().out.strip() == f"playbounce {playbounce.__version__}"


def test_version_is_exported():
    """__version__ is importable and listed in __all__."""
    assert playbounce.__version__
    assert "__version__" in playbounce.__all__
