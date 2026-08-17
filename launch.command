#!/bin/sh
# Opens playbounce in the default browser. Works from wherever the folder lives.
cd "$(dirname "$0")" || exit 1

if [ ! -f "web/index.html" ]; then
  echo "Can't find web/index.html next to this launcher."
  echo "Keep launch.command in the playbounce folder, alongside the web/ directory."
  exit 1
fi

open "web/index.html"
