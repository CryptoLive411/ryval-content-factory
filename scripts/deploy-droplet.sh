#!/bin/bash
# Deploy the content forge to the droplet from this Mac.
#
#   bash scripts/deploy-droplet.sh            # build, back up the server's build, upload, restart
#   FORGE_HOST=user@host bash scripts/deploy-droplet.sh
#
# Needs SSH access to the droplet. It only replaces dist/, scripts/ and the new public assets
# (fonts, app/web screens). It never touches the server's .env, node_modules or public/stock.
# Roll back: ssh in, `cp -a <backup>/dist <backup>/scripts /opt/ryval-content-forge/`, restart ryval-forge.
set -euo pipefail
cd "$(dirname "$0")/.."

HOST="${FORGE_HOST:-root@68.183.112.176}"
APP=/opt/ryval-content-forge
STAMP="$(date +%Y%m%d-%H%M%S)"

echo "1/5 build"
bun run build:node >/dev/null

echo "2/5 back up the server's current build to $APP/backups/$STAMP"
ssh "$HOST" "mkdir -p $APP/backups/$STAMP && cp -a $APP/dist $APP/scripts $APP/backups/$STAMP/"

echo "3/5 upload dist/ (server bundle and client, without the stock library) and scripts/"
rsync -az --delete --exclude 'client/stock/' dist/ "$HOST:$APP/dist/"
rsync -az scripts/ "$HOST:$APP/scripts/"

echo "4/5 upload new public assets"
rsync -az public/fonts public/app-screens public/web-screens public/badges "$HOST:$APP/public/"

echo "5/5 restart"
ssh "$HOST" "systemctl restart ryval-forge && sleep 4 && systemctl is-active ryval-forge && systemctl is-active ryval-forge-cron.timer"
echo "Live. Backup: $APP/backups/$STAMP"
