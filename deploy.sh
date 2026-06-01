#!/usr/bin/env bash
set -euo pipefail

# Production deploy for the Human-vs-AI art game (ai-vs-human-game).
# Next.js 16 app, npm toolchain, Prisma + local PostgreSQL, served directly on port 4182.
# Mirrors Ethics-build-game/deploy.sh, adapted for the npm + Prisma toolchain.

APP_NAME="human-vs-ai-game"
APP_DIR="/home/vishva/Projects/human_vs_ai_game"
PORT=4182
ECOSYSTEM="$APP_DIR/ecosystem.config.cjs"

cd "$APP_DIR"

# Guard: the app cannot start without DATABASE_URL + Pusher/ElevenLabs keys.
if [ ! -f ".env.production" ]; then
  echo "==> ERROR: .env.production missing (DATABASE_URL + Pusher/ElevenLabs keys). Aborting."
  exit 1
fi

# Load env so the Prisma CLI (migrate) AND the Next build see DATABASE_URL and
# the NEXT_PUBLIC_* keys (which are inlined at build time).
set -a; . ./.env.production; set +a

# Only install deps when explicitly asked (e.g. first deploy or lockfile change).
if [[ "${1:-}" == "--install" ]]; then
  echo "==> Installing dependencies (npm ci)..."
  npm ci
fi

echo "==> Applying database migrations (prisma migrate deploy)..."
npx prisma migrate deploy

echo "==> Building..."
rm -rf .next && npm run build

# Guard: refuse to ship a broken/empty build.
if [ ! -f ".next/BUILD_ID" ]; then
  echo "==> ERROR: .next/BUILD_ID missing after build. Aborting."
  exit 1
fi

echo "==> (Re)starting PM2 process ($APP_NAME)..."
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start "$ECOSYSTEM"
fi

echo "==> Waiting for process to come online..."
sleep 3

STATUS=$(pm2 jlist 2>/dev/null | node -e "
  const procs = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  const p = procs.find(p => p.name === '$APP_NAME');
  console.log(p ? p.pm2_env.status : 'not_found');
")

if [ "$STATUS" = "online" ]; then
  echo "==> $APP_NAME is online on port $PORT"
  pm2 save
else
  echo "==> WARNING: process status is '$STATUS' — check logs with: pm2 logs $APP_NAME"
  exit 1
fi

echo "==> Done. Direct: http://localhost:$PORT"
