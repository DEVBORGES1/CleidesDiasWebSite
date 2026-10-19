#!/usr/bin/env bash
# Sobe a pilha completa para testes ponta a ponta, sem serviços externos:
# serviços simulados (Supabase Auth + Cloudinary), API em memória e frontend.
set -euo pipefail
cd "$(dirname "$0")/.."
MOCK_PORT=${MOCK_PORT:-54321}
API_PORT=${API_PORT:-4000}
WEB_PORT=${WEB_PORT:-5173}
ADMIN_ID=1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d

node e2e/mock-services.mjs &
MOCK_PID=$!

(
  cd backend
  NODE_ENV=development DATA_DRIVER=memory MEMORY_SEED=true LOG_LEVEL=warn PORT=$API_PORT \
  FRONTEND_URL=http://localhost:$WEB_PORT SITE_URL=http://localhost:$WEB_PORT \
  SUPABASE_URL=http://localhost:$MOCK_PORT SUPABASE_SERVICE_ROLE_KEY=e2e-service-role-key-000000 \
  MEMORY_ADMIN_USER_ID=$ADMIN_ID MEMORY_ADMIN_EMAIL=cleides@example.com \
  CLOUDINARY_CLOUD_NAME=e2e CLOUDINARY_API_KEY=e2e-key CLOUDINARY_API_SECRET=test-cloudinary-secret \
  CLOUDINARY_UPLOAD_PREFIX=http://localhost:$MOCK_PORT \
  CLOUDINARY_URL="cloudinary://e2e-key:test-cloudinary-secret@e2e?upload_prefix=http://localhost:$MOCK_PORT" \
  npx tsx --conditions=development src/server.ts
) &
API_PID=$!

(
  cd frontend
  VITE_API_URL=http://localhost:$API_PORT/api/v1 VITE_SITE_URL=http://localhost:$WEB_PORT \
  VITE_SUPABASE_URL=http://localhost:$MOCK_PORT VITE_SUPABASE_ANON_KEY=e2e-anon-key-000000000000 \
  npx vite --port $WEB_PORT --strictPort
) &
WEB_PID=$!

trap 'kill $MOCK_PID $API_PID $WEB_PID 2>/dev/null' EXIT INT TERM
wait
