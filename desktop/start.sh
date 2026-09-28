#!/usr/bin/env bash
# Multi Plaza — daily launcher for macOS / Linux
cd "$(dirname "$0")/.."
(sleep 6; (command -v xdg-open >/dev/null && xdg-open http://localhost:3000) || (command -v open >/dev/null && open http://localhost:3000)) &
exec npx next start -p 3000
