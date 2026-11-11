#!/bin/bash
# Builds Jubilee from this checkout and deploys it to the Azure resources described in README.md.
# Run it in Azure Cloud Shell (bash) or anywhere with az (signed in), git, node, npm, zip and curl:
#
#   git clone https://github.com/QuinntyneBrown/jubilee.git && cd jubilee && bash eng/azure/deploy.sh
#
# Add --migrate to apply the EF Core migrations first (the API never applies them itself), and
# --seed to add the demo directory as well.
set -euo pipefail

GROUP=${GROUP:-rg-jubilee-prod}
WWW_APP=${WWW_APP:-jubilee-to-www}   # www.jubilee.to and jubilee.to: frontend/projects/marketing
APP_APP=${APP_APP:-jubilee-to-app}   # app.jubilee.to: frontend/projects/jubilee, the API and the worker

root=$(cd "$(dirname "$0")/../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# The .NET SDK that backend/global.json asks for; Cloud Shell ships an older one.
dotnet=dotnet
if ! dotnet --list-sdks 2>/dev/null | grep -q '^10\.'; then
  curl -sSL https://dot.net/v1/dotnet-install.sh | bash -s -- --channel 10.0 --install-dir "$HOME/.dotnet10"
  dotnet="$HOME/.dotnet10/dotnet"
fi

echo "== Building the frontend"
(cd "$root/frontend" && npm ci --ignore-scripts && npm run build)

echo "== Publishing the backend"
for project in Api Worker; do
  "$dotnet" publish "$root/backend/src/Jubilee.$project" -c Release -r linux-x64 --self-contained false \
    -o "$work/app/${project,,}" --nologo -v q
done

if [[ " $* " == *" --migrate "* || " $* " == *" --seed "* ]]; then
  echo "== Preparing the database"
  server=$(az sql server list -g "$GROUP" --query '[0].name' -o tsv)
  address=$(curl -s https://api.ipify.org)
  az sql server firewall-rule create -g "$GROUP" -s "$server" -n deploy \
    --start-ip-address "$address" --end-ip-address "$address" -o none
  export ConnectionStrings__Jubilee
  ConnectionStrings__Jubilee=$(az webapp config connection-string list -g "$GROUP" -n "$APP_APP" \
    --query "[?name=='Jubilee'].value | [0]" -o tsv)
  if [[ " $* " == *" --migrate "* ]]; then
    "$dotnet" run --project "$root/backend/src/Jubilee.Cli" -c Release -- migrate
  fi
  if [[ " $* " == *" --seed "* ]]; then
    "$dotnet" run --project "$root/backend/src/Jubilee.Cli" -c Release -- seed
  fi
  unset ConnectionStrings__Jubilee
  az sql server firewall-rule delete -g "$GROUP" -s "$server" -n deploy
fi

echo "== Packaging"
# The marketing site: server.js and the built page.
mkdir -p "$work/www"
cp "$root/eng/azure/server.js" "$work/www/"
cp -r "$root/frontend/dist/marketing/browser" "$work/www/public"
(cd "$work/www" && zip -qr ../www.zip .)

# The app: server.js, start.sh, the built app, the API and the worker (published above), and a
# Node binary, because the .NET image of App Service has none.
mkdir -p "$work/app/bin"
cp "$root/eng/azure/server.js" "$root/eng/azure/start.sh" "$work/app/"
cp -r "$root/frontend/dist/jubilee/browser" "$work/app/public"
node_release=https://nodejs.org/dist/latest-v22.x
node_file=$(curl -sL "$node_release/SHASUMS256.txt" | grep -o 'node-v22[0-9.]*-linux-x64.tar.xz' | head -1)
(cd "$work" && curl -sLO "$node_release/$node_file" \
  && curl -sL "$node_release/SHASUMS256.txt" | grep " $node_file\$" | sha256sum -c - \
  && tar xJf "$node_file" --strip-components=2 -C app/bin "${node_file%.tar.xz}/bin/node")
(cd "$work/app" && zip -qr ../app.zip .)

echo "== Deploying"
az webapp deploy -g "$GROUP" -n "$WWW_APP" --src-path "$work/www.zip" --type zip -o none
# The app is restarted only after every file is in place: a container that starts while the
# package is still being copied does not find start.sh and stops.
az webapp deploy -g "$GROUP" -n "$APP_APP" --src-path "$work/app.zip" --type zip --restart false -o none
az webapp restart -g "$GROUP" -n "$APP_APP"

echo "== Waiting for the app"
health=${HEALTH_URL:-https://app.jubilee.to/api/health}
for attempt in $(seq 1 40); do
  if curl -fsS --max-time 10 "$health" >/dev/null 2>&1; then
    echo "Deployed. https://www.jubilee.to  $health"
    exit 0
  fi
  sleep 15
done
echo "The app did not answer $health within 10 minutes." >&2
exit 1
