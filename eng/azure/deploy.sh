#!/bin/bash
# Builds Jubilee from this checkout and deploys it to the Azure resources described in README.md.
# Run it in Azure Cloud Shell (bash) or anywhere with az (signed in), git, node, npm, zip and curl:
#
#   git clone https://github.com/QuinntyneBrown/jubilee.git && cd jubilee && bash eng/azure/deploy.sh
#
# Add --migrate to apply the EF Core migrations first (the API never applies them itself), and
# --seed to add the demo directory as well.
#
# Every deployment also applies the app settings the launching-soon forms need (ADR 0047) and
# fails unless the marketing host forwards /api/launch and nothing else. No setting is made by hand.
set -euo pipefail

GROUP=${GROUP:-rg-jubilee-prod}
WWW_APP=${WWW_APP:-jubilee-to-www}   # www.jubilee.to and jubilee.to: frontend/projects/marketing
APP_APP=${APP_APP:-jubilee-to-app}   # app.jubilee.to: frontend/projects/jubilee, the API and the worker
ADMIN_APP=${ADMIN_APP:-jubilee-to-admin} # admin.jubilee.to: frontend/projects/admin (ADR 0040)
API_URL=${API_URL:-https://app.jubilee.to}  # where the marketing host sends /api/launch
WWW_URL=${WWW_URL:-https://www.jubilee.to}
# Where each business pre-registration and each new launch sign-up is e-mailed (L2-216 AC10, L2-217 AC9).
LAUNCH_TEAM_EMAIL=${LAUNCH_TEAM_EMAIL:-quinntynebrown@gmail.com}

root=$(cd "$(dirname "$0")/../.." && pwd)
work=$(mktemp -d)
server=
# On any exit: remove the working folder and, if the database step opened the SQL firewall to
# this machine, close it again, also when a migration fails.
cleanup() {
  rm -rf "$work"
  if [[ -n "$server" ]]; then
    az sql server firewall-rule delete -g "$GROUP" -s "$server" -n deploy -o none || true
  fi
}
trap cleanup EXIT

# The value of the app setting $2 of the App Service $1; empty when it is not set. For reading
# into a variable only: a value is never printed.
setting() {
  az webapp config appsettings list -g "$GROUP" -n "$1" --query "[?name=='$2'].value | [0]" -o tsv
}

# Sets the app settings NAME=value ... of the App Service $1, but only those whose value differs:
# a changed setting restarts the site, so an unchanged deployment restarts nothing for them. It
# says which settings it set, by name; values are never printed.
ensure_settings() {
  local app=$1 pair
  local changed=() names=()
  shift
  for pair in "$@"; do
    if [[ "$(setting "$app" "${pair%%=*}")" != "${pair#*=}" ]]; then
      changed+=("$pair")
      names+=("${pair%%=*}")
    fi
  done
  if ((${#changed[@]} == 0)); then
    echo "   $app: nothing to change"
    return
  fi
  echo "   $app: setting ${names[*]}"
  az webapp config appsettings set -g "$GROUP" -n "$app" --settings "${changed[@]}" -o none
}

echo "== Checking Google sign-in"
# Without both settings the API reports googleSignIn false and the join and sign-in pages hide
# "Continue with Google" (L2-003 AC5, ADR 0037). Stop before anything ships rather than let the
# button vanish unnoticed. The values are read into variables only and never printed.
# SKIP_GOOGLE_CHECK=1 deploys without Google sign-in on purpose.
if [[ "${SKIP_GOOGLE_CHECK:-}" != "1" ]]; then
  missing=()
  for name in Google__ClientId Google__ClientSecret; do
    [[ -n "$(setting "$APP_APP" "$name")" ]] || missing+=("$name")
  done
  if ((${#missing[@]} > 0)); then
    echo "$APP_APP is missing ${missing[*]}, so Google sign-in would be off and its button hidden." >&2
    echo "Set them as \"Google sign-in\" in eng/azure/README.md says, or run with SKIP_GOOGLE_CHECK=1." >&2
    exit 1
  fi
  echo "   $APP_APP: Google__ClientId and Google__ClientSecret are set"
fi

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
  az sql server firewall-rule delete -g "$GROUP" -s "$server" -n deploy -o none
  server=
fi

echo "== Packaging"
# The marketing site: server.js and the built page.
mkdir -p "$work/www"
cp "$root/eng/azure/server.js" "$work/www/"
cp -r "$root/frontend/dist/marketing/browser" "$work/www/public"
(cd "$work/www" && zip -qr ../www.zip .)

# The admin application: server.js and the built application. Its /api goes to the app's host,
# with API_ORIGIN and PROXY_KEY set on the App Service (README.md), never in the package.
mkdir -p "$work/admin"
cp "$root/eng/azure/server.js" "$work/admin/"
cp -r "$root/frontend/dist/admin/browser" "$work/admin/public"
(cd "$work/admin" && zip -qr ../admin.zip .)

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
az webapp deploy -g "$GROUP" -n "$ADMIN_APP" --src-path "$work/admin.zip" --type zip -o none
# The app is restarted only after every file is in place: a container that starts while the
# package is still being copied does not find start.sh and stops. Without a restart there is no
# start-up to track, and az would wait ten minutes for one and fail: --track-status false.
az webapp deploy -g "$GROUP" -n "$APP_APP" --src-path "$work/app.zip" --type zip --restart false   --track-status false -o none

echo "== The settings of the launching-soon forms"
# After the packages are in place, so a restart that a changed setting causes starts the new code
# (ADR 0047). The marketing host proves itself to the API with the key the admin host uses; when
# there is none yet, one is made and set on the three App Services together.
key=$(setting "$APP_APP" StaffAccess__ProxyKey)
if [[ -z "$key" ]]; then
  key=$(openssl rand -base64 32)
  ensure_settings "$APP_APP" "StaffAccess__ProxyKey=$key"
  ensure_settings "$ADMIN_APP" "PROXY_KEY=$key"
fi
ensure_settings "$WWW_APP" "API_ORIGIN=$API_URL" "API_PATHS=/api/launch" "KEEP_DIR=/home/data/launch-kept" "PROXY_KEY=$key"
unset key
ensure_settings "$APP_APP" "Launch__TeamEmail=$LAUNCH_TEAM_EMAIL"
# The deletion ledger and the export store live on the app's persistent storage, outside the database and
# outside the deployed folder, so a restore of the database or a new deployment keeps them (L2-017 AC7, ADR 0069).
ensure_settings "$APP_APP" "Deletions__LedgerPath=/home/data/deletions/ledger.jsonl" "Exports__Root=/home/data/exports"

az webapp restart -g "$GROUP" -n "$APP_APP"

echo "== Waiting for the app"
health=${HEALTH_URL:-https://app.jubilee.to/api/health}
# Give the restart time to stop the previous container, so the answer comes from the new one.
sleep 30
healthy=
for attempt in $(seq 1 40); do
  if curl -fsS --max-time 10 "$health" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 15
done
if [[ -z "$healthy" ]]; then
  echo "The app did not answer $health within 10 minutes." >&2
  exit 1
fi

if [[ "${SKIP_GOOGLE_CHECK:-}" != "1" ]]; then
  echo "== Checking the Google button is offered"
  session=${SESSION_URL:-https://app.jubilee.to/api/session}
  if ! curl -fsS --max-time 10 "$session" | grep -Eq '"googleSignIn": ?true'; then
    echo "$session does not report \"googleSignIn\": true; the sign-in page shows no Google button." >&2
    exit 1
  fi
fi

echo "== Checking the marketing host"
# The forms of the launching-soon page reach the API, and no other /api path does (ADR 0044,
# ADR 0047). The marketing host may still be restarting with its settings, so it is asked again.
forms=
other=
for attempt in $(seq 1 40); do
  forms=$(curl -s -o /dev/null --max-time 10 -w '%{http_code}' "$WWW_URL/api/launch" || true)
  other=$(curl -s -o /dev/null --max-time 10 -w '%{http_code}' "$WWW_URL/api/session" || true)
  if [[ "$forms" == "200" && "$other" == "404" ]]; then
    echo "Deployed. $WWW_URL  https://admin.jubilee.to  $health"
    exit 0
  fi
  sleep 15
done
echo "The marketing host is not forwarding as it must: $WWW_URL/api/launch answered $forms (200" >&2
echo "expected) and $WWW_URL/api/session answered $other (404 expected)." >&2
exit 1
