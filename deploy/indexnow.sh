#!/usr/bin/env bash
# Submit every sitemap URL to IndexNow (Bing, Yandex, Seznam, Naver). Google ignores IndexNow.
set -euo pipefail
SITE=${SITE:-https://cryptocheckout.duckdns.org}
HOST=${SITE#https://}
KEY=$(ls "$(dirname "$0")/../public" | grep -E '^[0-9a-f]{32}\.txt$' | head -1 | sed 's/\.txt$//')
[ -n "$KEY" ] || { echo "no IndexNow key file in public/"; exit 1; }

urls=$(curl -sf "$SITE/sitemap.xml" | grep -o '<loc>[^<]*</loc>' | sed 's#</*loc>##g')
list=$(printf '%s\n' "$urls" | sed 's/.*/"&"/' | paste -sd, -)
body="{\"host\":\"$HOST\",\"key\":\"$KEY\",\"keyLocation\":\"$SITE/$KEY.txt\",\"urlList\":[$list]}"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST https://api.indexnow.org/indexnow \
  -H 'Content-Type: application/json; charset=utf-8' --data "$body")
echo "submitted $(printf '%s\n' "$urls" | wc -l | tr -d ' ') urls, IndexNow responded $code (200/202 = accepted)"
