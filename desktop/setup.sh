#!/usr/bin/env bash
# Multi Plaza — one-time setup for macOS / Linux
set -e
cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js nahi mila. https://nodejs.org se LTS install karein, phir dobara chalayein."
  exit 1
fi

echo "[1/4] npm install…"
npm install

echo "[2/4] .env…"
if [ ! -f .env ]; then
  printf 'PGLITE_PATH=./data/multiplaza-data\nAUTH_SECRET=multiplaza-desktop-secret-2026\n' > .env
elif ! grep -q PGLITE_PATH .env; then
  echo 'PGLITE_PATH=./data/multiplaza-data' >> .env
fi

echo "[3/4] build…"
npm run build

echo "[4/4] demo data seed…"
npx tsx src/db/seed.ts || true

echo "SETUP COMPLETE — ab desktop/start.sh chalayein. Login admin / admin123"
