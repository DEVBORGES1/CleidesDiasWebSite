#!/usr/bin/env bash
# Deploy da API (backend + shared) para a VPS Hostinger.
# Uso: ./deploy.sh   (envia o que está commitado em HEAD; faça commit antes)
set -euo pipefail

HOST="root@72.60.243.98"
KEY="$HOME/.ssh/id_ed25519_cleides"
HEALTH_URL="https://srv1388438.hstgr.cloud/cleides/api/v1/health"

cd "$(dirname "$0")"

if [ -n "$(git status --porcelain backend shared package.json package-lock.json)" ]; then
  echo "Aviso: há mudanças não commitadas (não serão enviadas)."
fi

echo "==> Enviando repositório @ $(git rev-parse --short HEAD) (a VPS instala, builda e reinicia)"
git archive HEAD | ssh -i "$KEY" -o IdentitiesOnly=yes "$HOST"

echo "==> Health check público"
curl -fsS -m 15 "$HEALTH_URL"
echo
