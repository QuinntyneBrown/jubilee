#!/bin/bash
# Creates the App Service of the admin application (admin.jubilee.to, frontend/projects/admin,
# ADR 0040), sets the proxy key, and binds its host name: step 3 of the owner's checklist under
# "The admin application" in README.md. Given STAFF_NETWORKS it also does step 5, the allowed
# networks. Run it in Azure Cloud Shell (bash) or anywhere with az signed in:
#
#   bash eng/azure/create-admin.sh
#   STAFF_NETWORKS='203.0.113.0/24, 2001:db8:5::/48' bash eng/azure/create-admin.sh
#
# It changes nothing that is already in place, so run it again once the DNS records it names are
# published. It never prints the proxy key. It does not deploy: the Deploy workflow (or deploy.sh)
# deploys the admin application once this App Service exists. The identity provider's
# registration and its second factor, and the staff sign-in settings (steps 1, 2 and 4), stay by
# hand; until the allowed networks are set the API refuses every staff request.
set -euo pipefail

GROUP=${GROUP:-rg-jubilee-prod}
PLAN=${PLAN:-jubilee-plan}
APP_APP=${APP_APP:-jubilee-to-app}
ADMIN_APP=${ADMIN_APP:-jubilee-to-admin}
ADMIN_HOST=${ADMIN_HOST:-admin.jubilee.to}
API_ORIGIN=${API_ORIGIN:-https://app.jubilee.to}

if az webapp show -g "$GROUP" -n "$ADMIN_APP" -o none 2>/dev/null; then
  echo "== App Service $ADMIN_APP exists"
else
  echo "== Creating App Service $ADMIN_APP on $PLAN"
  az webapp create -g "$GROUP" -p "$PLAN" -n "$ADMIN_APP" --runtime "NODE:22-lts" --https-only true -o none
fi
az webapp update -g "$GROUP" -n "$ADMIN_APP" --https-only true -o none
az webapp config set -g "$GROUP" -n "$ADMIN_APP" --startup-file "node server.js" --always-on true \
  --min-tls-version 1.2 --ftps-state Disabled -o none
az webapp config appsettings set -g "$GROUP" -n "$ADMIN_APP" \
  --settings "API_ORIGIN=$API_ORIGIN" SCM_DO_BUILD_DURING_DEPLOYMENT=false -o none

# The proxy key: made once, set on both App Services, never shown. To rotate it, delete the
# PROXY_KEY setting of the admin App Service and run this again.
has_key=$(az webapp config appsettings list -g "$GROUP" -n "$ADMIN_APP" --query "length([?name=='PROXY_KEY'])" -o tsv)
if [[ "$has_key" == "0" ]]; then
  echo "== Setting a new proxy key on $ADMIN_APP and $APP_APP (restarts both)"
  key=$(openssl rand -base64 32)
  az webapp config appsettings set -g "$GROUP" -n "$ADMIN_APP" --settings "PROXY_KEY=$key" -o none
  az webapp config appsettings set -g "$GROUP" -n "$APP_APP" \
    --settings "StaffAccess__ProxyKey=$key" "StaffSignIn__PublicBaseUrl=https://$ADMIN_HOST" -o none
  unset key
else
  echo "== The proxy key is already set"
fi

# The allowed networks (step 5 of the owner's checklist in README.md, L2-192): only when
# STAFF_NETWORKS names them, as addresses or CIDR ranges separated by commas. The admin App
# Service answers those networks and denies the rest (AC5), and the API's staff endpoints answer
# the same list (StaffAccess__AllowedNetworks, AC1). Rules already in place are kept.
if [[ -n "${STAFF_NETWORKS:-}" ]]; then
  echo "== Allowing the staff networks on $ADMIN_APP and on the staff endpoints of $APP_APP"
  IFS=',' read -ra networks <<<"$STAFF_NETWORKS"
  allowed=$(az webapp config access-restriction show -g "$GROUP" -n "$ADMIN_APP" \
    --query "ipSecurityRestrictions[?action=='Allow'].ipAddress" -o tsv)
  # New rules are numbered after the ones already there, so a name or priority is never reused.
  priority=$((100 + $(grep -c . <<<"$allowed" || true)))
  list=()
  for network in "${networks[@]}"; do
    network=$(xargs <<<"$network")
    [[ -z "$network" ]] && continue
    if [[ "$network" != */* && "$network" == *:* ]]; then
      network="$network/128"
    elif [[ "$network" != */* ]]; then
      network="$network/32"
    fi
    list+=("$network")
    priority=$((priority + 1))
    if grep -qxF "$network" <<<"$allowed"; then
      echo "   $network is already allowed"
    else
      az webapp config access-restriction add -g "$GROUP" -n "$ADMIN_APP" --rule-name "staff-$priority" \
        --action Allow --ip-address "$network" --priority "$priority" -o none
    fi
  done
  az webapp config access-restriction set -g "$GROUP" -n "$ADMIN_APP" --default-action Deny -o none
  joined=$(IFS=','; echo "${list[*]}")
  az webapp config appsettings set -g "$GROUP" -n "$APP_APP" --settings "StaffAccess__AllowedNetworks=$joined" -o none
else
  echo "== STAFF_NETWORKS is not given: the allowed networks are left as they are"
fi

# The host name: needs the CNAME and the asuid TXT record first.
default_host=$(az webapp show -g "$GROUP" -n "$ADMIN_APP" --query defaultHostName -o tsv)
verification=$(az webapp show -g "$GROUP" -n "$ADMIN_APP" --query customDomainVerificationId -o tsv)
label=${ADMIN_HOST%%.*}
bound=$(az webapp config hostname list -g "$GROUP" --webapp-name "$ADMIN_APP" --query "length([?name=='$ADMIN_HOST'])" -o tsv)
if [[ "$bound" == "0" ]]; then
  if ! az webapp config hostname add -g "$GROUP" --webapp-name "$ADMIN_APP" --hostname "$ADMIN_HOST" -o none; then
    cat <<RECORDS

The host name $ADMIN_HOST could not be added yet. Publish these two records at Namecheap
(Advanced DNS of ${ADMIN_HOST#*.}), wait a few minutes and run this script again:

  CNAME  $label         $default_host.
  TXT    asuid.$label   $verification
RECORDS
    exit 2
  fi
fi

thumbprint=$(az webapp config ssl show -g "$GROUP" --certificate-name "$ADMIN_HOST" --query thumbprint -o tsv 2>/dev/null || true)
if [[ -z "$thumbprint" ]]; then
  echo "== Creating the managed certificate of $ADMIN_HOST (a few minutes)"
  # az returns while the certificate is still being made; its warnings on the way are harmless.
  az webapp config ssl create -g "$GROUP" -n "$ADMIN_APP" --hostname "$ADMIN_HOST" -o none || true
  for attempt in $(seq 1 30); do
    thumbprint=$(az webapp config ssl show -g "$GROUP" --certificate-name "$ADMIN_HOST" --query thumbprint -o tsv 2>/dev/null || true)
    [[ -n "$thumbprint" ]] && break
    sleep 20
  done
fi
if [[ -z "$thumbprint" ]]; then
  echo "The certificate of $ADMIN_HOST is not ready yet; run this script again in a few minutes." >&2
  exit 3
fi
az webapp config ssl bind -g "$GROUP" -n "$ADMIN_APP" --certificate-thumbprint "$thumbprint" --ssl-type SNI -o none

echo "Done. $ADMIN_APP answers https://$ADMIN_HOST once the Deploy workflow has run."
