#!/bin/bash
# Sets up e-mail delivery for Jubilee on Azure (ADR 0038) and can be run again at any time: it
# creates what is missing, verifies the sending domain, and sets the App Service settings.
# Run it in Azure Cloud Shell (bash) or anywhere with az signed in:
#
#   bash eng/azure/configure-email.sh
#
# The connection string and the webhook secret go from Azure straight into the App Service
# settings. They are never printed, and nothing here belongs in the repository.
set -euo pipefail

GROUP=${GROUP:-rg-jubilee-prod}
APP_APP=${APP_APP:-jubilee-to-app}
EMAIL=${EMAIL:-jubilee-email}              # the Email Communication Service
ACS=${ACS:-jubilee-communication}          # the Communication Service that sends through it
DOMAIN=${DOMAIN:-notify.jubilee.to}        # the sending domain; its DNS records are in README.md
SENDER=${SENDER:-no-reply}
HOOK=${HOOK:-https://app.jubilee.to/api/webhooks/email-events}
DATA_LOCATION=${DATA_LOCATION:-Canada}

az config set extension.use_dynamic_install=yes_without_prompt --only-show-errors

domain() { az communication email domain "$@" --domain-name "$DOMAIN" --email-service-name "$EMAIL" -g "$GROUP" --only-show-errors; }

echo "== The e-mail service and its sending domain"
az communication email show -n "$EMAIL" -g "$GROUP" -o none --only-show-errors 2>/dev/null \
  || az communication email create -n "$EMAIL" -g "$GROUP" --location global --data-location "$DATA_LOCATION" -o none --only-show-errors
domain show -o none 2>/dev/null \
  || domain create --location global --domain-management CustomerManaged -o none

echo "== Verifying the DNS records of $DOMAIN"
pending=
for record in Domain SPF DKIM DKIM2; do
  state=$(domain show --query "verificationStates.$record.status" -o tsv)
  if [[ "$state" != "Verified" ]]; then
    domain initiate-verification --verification-type "$record" -o none || true
    sleep 20
    state=$(domain show --query "verificationStates.$record.status" -o tsv)
  fi
  echo "   $record: $state"
  [[ "$state" == "Verified" ]] || pending=1
done
if [[ -n "$pending" ]]; then
  echo "Some records are not verified yet. Publish the records of eng/azure/README.md, give DNS" >&2
  echo "time to spread, and run this script again. Nothing else was changed." >&2
  exit 1
fi

echo "== The sender address $SENDER@$DOMAIN"
domain sender-username show --sender-username "$SENDER" -o none 2>/dev/null \
  || domain sender-username create --sender-username "$SENDER" --username "$SENDER" --display-name Jubilee -o none

echo "== The Communication Service, linked to the domain"
domain_id=$(domain show --query id -o tsv)
if az communication show -n "$ACS" -g "$GROUP" -o none --only-show-errors 2>/dev/null; then
  az communication update -n "$ACS" -g "$GROUP" --linked-domains "$domain_id" -o none --only-show-errors
else
  az communication create -n "$ACS" -g "$GROUP" --location global --data-location "$DATA_LOCATION" \
    --linked-domains "$domain_id" -o none --only-show-errors
fi

echo "== The settings of $APP_APP"
# The webhook secret is kept if there is one, so the Event Grid subscription below stays valid.
secret=$(az webapp config appsettings list -g "$GROUP" -n "$APP_APP" --query "[?name=='Email__WebhookSecret'].value | [0]" -o tsv)
[[ -n "$secret" ]] || secret=$(openssl rand -hex 32)
connection=$(az communication list-key -n "$ACS" -g "$GROUP" --query primaryConnectionString -o tsv --only-show-errors)
az webapp config appsettings set -g "$GROUP" -n "$APP_APP" -o none --settings \
  "Email__ConnectionString=$connection" "Email__From=$SENDER@$DOMAIN" "Email__WebhookSecret=$secret"
unset connection

echo "== Waiting for the app to restart with the settings"
sleep 45
for attempt in $(seq 1 20); do
  curl -fsS --max-time 10 "${HOOK%/api/*}/api/health" >/dev/null 2>&1 && break
  sleep 15
done

echo "== Bounces and complaints: Event Grid to $HOOK"
acs_id=$(az communication show -n "$ACS" -g "$GROUP" --query id -o tsv --only-show-errors)
az eventgrid event-subscription create --name jubilee-email-delivery --source-resource-id "$acs_id" \
  --endpoint "$HOOK" --included-event-types Microsoft.Communication.EmailDeliveryReportReceived \
  --delivery-attribute-mapping X-Webhook-Secret static "$secret" true -o none --only-show-errors
unset secret

echo "Done. $APP_APP sends e-mail from $SENDER@$DOMAIN."
