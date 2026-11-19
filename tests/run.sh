#!/bin/bash
# Usage: tests/run.sh   (requires: python -m http.server 8000 running at repo root)
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
"$EDGE" --headless --disable-gpu --virtual-time-budget=5000 --dump-dom "http://localhost:8000/tests/index.html?$RANDOM" 2>/dev/null | sed -n '/<pre id="out">/,/<\/pre>/p' | sed 's/<[^>]*>//g'
