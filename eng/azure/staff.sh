#!/bin/bash
# Grants, revokes or lists the roles of staff accounts in the production database with the
# Jubilee CLI (`jubilee staff`, L2-193): step 7 of the owner's checklist under "The admin
# application" in README.md. Run it in Azure Cloud Shell (bash) from a clone of this repository,
# or anywhere with az and the .NET SDK:
#
#   bash eng/azure/staff.sh grant --email {address} --role admin
#   bash eng/azure/staff.sh grant --email {address} --role moderator
#   bash eng/azure/staff.sh revoke --email {address} --role moderator
#   bash eng/azure/staff.sh list
#
# Each grant or revoke is written to the audit log as staff.role-granted or staff.role-revoked,
# with the account that ran it as the actor (L2-098 AC4). Like check-launch.sh it opens the SQL
# firewall to this machine for the command and closes it again, also when the command fails. It
# never prints the connection string.
set -euo pipefail

[[ "${1:-}" =~ ^(grant|revoke|list)$ ]] || { echo "Say grant, revoke or list." >&2; exit 64; }
GROUP=${GROUP:-rg-jubilee-prod}
APP_APP=${APP_APP:-jubilee-to-app}

root=$(cd "$(dirname "$0")/../.." && pwd)
server=$(az sql server list -g "$GROUP" --query '[0].name' -o tsv)
cleanup() {
  az sql server firewall-rule delete -g "$GROUP" -s "$server" -n staff-command -o none || true
}
trap cleanup EXIT

here=$(curl -s https://api.ipify.org)
az sql server firewall-rule create -g "$GROUP" -s "$server" -n staff-command \
  --start-ip-address "$here" --end-ip-address "$here" -o none
export ConnectionStrings__Jubilee
ConnectionStrings__Jubilee=$(az webapp config connection-string list -g "$GROUP" -n "$APP_APP" \
  --query "[?name=='Jubilee'].value | [0]" -o tsv)

dotnet build "$root/backend/src/Jubilee.Cli" -c Release --nologo -v q >/dev/null
dotnet run --project "$root/backend/src/Jubilee.Cli" -c Release --no-build -- staff "$@"
