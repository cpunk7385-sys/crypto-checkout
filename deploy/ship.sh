#!/usr/bin/env bash
# Deploy the latest image built by GitHub Actions (ghcr.io/cpunk7385-sys/crypto-checkout) to the droplet.
# Usage: deploy/ship.sh            # waits for the Actions run of HEAD to finish, then pulls on the box
#        deploy/ship.sh --no-wait  # just pull whatever :latest is
set -euo pipefail
cd "$(dirname "$0")/.."
HOST=${HOST:-myDO}
DIR=${DIR:-/var/www/crypto-checkout}

IMAGE=cpunk7385-sys/crypto-checkout

if [ "${1:-}" != "--no-wait" ]; then
  sha=$(git rev-parse HEAD)
  echo "waiting for ghcr.io/$IMAGE:${sha}..."
  found=0
  for _ in $(seq 1 80); do
    tok=$(curl -s "https://ghcr.io/token?scope=repository:$IMAGE:pull" | sed -E 's/.*"token":"([^"]+)".*/\1/')
    code=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $tok" \
      -H 'Accept: application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json' \
      "https://ghcr.io/v2/$IMAGE/manifests/$sha")
    if [ "$code" = "200" ]; then found=1; break; fi
    sleep 15
  done
  [ "$found" = 1 ] || { echo "image for $sha not published after 20 min (build failed?)"; exit 1; }
fi

scp -q deploy/docker-compose.yml "$HOST:$DIR/docker-compose.yml"
ssh "$HOST" "cd $DIR && docker compose pull -q && docker compose up -d --force-recreate && docker image prune -f >/dev/null && docker compose ps --format '{{.Name}} {{.Status}}'"
