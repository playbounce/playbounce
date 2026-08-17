"""Open the bundled playbounce game in a browser.

The game is a static page with no backend, so by default the command hands the
browser a ``file://`` URL and exits without leaving a process behind. ``--serve``
puts the same directory behind a localhost HTTP server instead, which is how to
reach it from a phone on the same network.
"""

from __future__ import annotations

import argparse
import functools
import http.server
import socket
import sys
import webbrowser
from pathlib import Path

from . import __version__

DEFAULT_PORT = 8000
PORT_ATTEMPTS = 20

# TEST-NET-1 (RFC 5737). Connecting a UDP socket to it sends no packets; it
# only asks the kernel which local address would be used to reach the outside.
ROUTE_PROBE_ADDRESS = ("192.0.2.1", 9)


class GameNotFound(RuntimeError):
    """The bundled web files could not be located."""


class NoFreePort(RuntimeError):
    """Every port in the scanned range was already in use."""


class GameServer(http.server.ThreadingHTTPServer):
    """Serves the game directory.

    Threaded because one page load fetches a dozen files, and set to reuse the
    address so a port left in TIME_WAIT by the previous run is available again.
    """

    allow_reuse_address = True
    daemon_threads = True


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    """Static file handler that keeps per-request lines off the terminal."""

    def log_message(self, format: str, *args: object) -> None:
        """Drop the default request logging."""


def game_root() -> Path:
    """Locate the directory holding ``index.html``.

    An installed wheel carries the game inside the package. A source checkout
    has it at the repository root instead, one level above ``python/``.

    Returns:
        The directory containing the game's ``index.html``.

    Raises:
        GameNotFound: If neither location has a game in it.
    """
    here = Path(__file__).resolve()

    bundled = here.parent / "web"
    if (bundled / "index.html").is_file():
        return bundled

    checkout = here.parents[3] / "web"
    if (checkout / "index.html").is_file():
        return checkout

    raise GameNotFound(
        "the game's web files are missing from this install. Reinstall with "
        "'python3 -m pip install --force-reinstall playbounce'."
    )


def port_is_free(port: int) -> bool:
    """Report whether a TCP port can be bound.

    Args:
        port: The port number to test.

    Returns:
        True if binding succeeded.
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        try:
            probe.bind(("", port))
        except OSError:
            return False
    return True


def find_port(start: int = DEFAULT_PORT, attempts: int = PORT_ATTEMPTS) -> int:
    """Return the first free port at or above ``start``.

    Args:
        start: The first port to try.
        attempts: How many consecutive ports to test.

    Returns:
        A port number nothing is currently listening on.

    Raises:
        NoFreePort: If every candidate was occupied.
    """
    for offset in range(attempts):
        candidate = start + offset
        if port_is_free(candidate):
            return candidate
    raise NoFreePort(
        f"ports {start} to {start + attempts - 1} are all in use. "
        f"Pick another with 'playbounce --serve --port {start + attempts}'."
    )


def lan_address() -> str | None:
    """Return this machine's address on the local network.

    Returns:
        The local IPv4 address, or None if the machine is offline.
    """
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
        try:
            probe.connect(ROUTE_PROBE_ADDRESS)
            address = probe.getsockname()[0]
        except OSError:
            return None
    return str(address) if address else None


def open_in_browser(url: str) -> bool:
    """Open a URL in the machine's default browser.

    Args:
        url: The address to open.

    Returns:
        True if a browser accepted it.
    """
    try:
        return webbrowser.open(url, new=2)
    except webbrowser.Error:
        return False


def serve(root: Path, port: int, open_browser: bool = True) -> int:
    """Serve the game over HTTP until interrupted.

    Args:
        root: The directory to serve.
        port: The port to bind.
        open_browser: Whether to open the address once the server is up.

    Returns:
        The process exit status.
    """
    handler = functools.partial(QuietHandler, directory=str(root))
    url = f"http://127.0.0.1:{port}"

    with GameServer(("", port), handler) as httpd:
        # Flushed because this runs before a blocking serve_forever: piped or
        # wrapped, a buffered address would not appear until the server stopped.
        print(f"playbounce serving on {url}", flush=True)
        address = lan_address()
        if address:
            print(f"  also reachable at http://{address}:{port}", flush=True)
        print("press ctrl-c to stop", flush=True)

        if open_browser:
            open_in_browser(url)

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")
    return 0


def build_parser() -> argparse.ArgumentParser:
    """Build the argument parser.

    Returns:
        The parser for the ``playbounce`` command.
    """
    parser = argparse.ArgumentParser(
        prog="playbounce",
        description=(
            "Open playbounce, a brick-breaker game where the wall is somebody's "
            "name and the name fights back."
        ),
    )
    parser.add_argument(
        "--serve",
        action="store_true",
        help="serve the game over localhost instead of opening the file directly",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=None,
        metavar="N",
        help=(
            f"serve on this port, or the next free one above it "
            f"(default {DEFAULT_PORT}); implies --serve"
        ),
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="print the address instead of opening a browser",
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"playbounce {__version__}",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    """Run the command-line interface.

    Args:
        argv: Arguments to parse. ``None`` reads ``sys.argv``.

    Returns:
        The process exit status: 0 on success, 1 on a failure the user can act on.
    """
    args = build_parser().parse_args(argv)

    try:
        root = game_root()
    except GameNotFound as error:
        print(f"playbounce: {error}", file=sys.stderr)
        return 1

    if args.serve or args.port is not None:
        try:
            port = find_port(DEFAULT_PORT if args.port is None else args.port)
        except NoFreePort as error:
            print(f"playbounce: {error}", file=sys.stderr)
            return 1
        return serve(root, port, open_browser=not args.no_browser)

    url = (root / "index.html").as_uri()

    if args.no_browser:
        print(url)
        return 0

    if not open_in_browser(url):
        print(
            "playbounce: no browser could be opened on this machine. "
            "Open this address yourself:",
            file=sys.stderr,
        )
        print(f"  {url}", file=sys.stderr)
        return 1

    print("opened playbounce in your default browser")
    print(f"  {url}")
    return 0
