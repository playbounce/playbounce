#!/bin/sh
# Opens playbounce in the default browser. Works from wherever the folder lives.
cd "$(dirname "$0")" || exit 1

if [ ! -f "web/index.html" ]; then
  echo "Can't find web/index.html next to this launcher."
  echo "Keep launch.sh in the playbounce folder, alongside the web/ directory."
  exit 1
fi

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "web/index.html"
elif command -v open >/dev/null 2>&1; then
  open "web/index.html"
else
  echo "No browser opener found (xdg-open or open)."
  echo "Open this file in your browser: $(pwd)/web/index.html"
  exit 1
fi
