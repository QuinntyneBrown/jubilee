#!/bin/bash
# Says whether a launch notification sign-up reached the production database, without showing the
# list: it prints the number of sign-ups and whether one address is among them, and nothing else
# (ADR 0047). The workflow "Check a launch sign-up" runs it; so can anyone with az signed in:
#
#   bash eng/azure/check-launch.sh someone@example.com
#
# It reads with `jubilee launch list`, so the reading is written to the audit log like any other
# (L2-218 AC4). It changes no data. Like deploy.sh it opens the SQL firewall to this machine for
# the reading and closes it again, also when the reading fails.
set -euo pipefail

address=${1:?Give the e-mail address to look for.}
GROUP=${GROUP:-rg-jubilee-prod}
APP_APP=${APP_APP:-jubilee-to-app}

root=$(cd "$(dirname "$0")/../.." && pwd)
server=$(az sql server list -g "$GROUP" --query '[0].name' -o tsv)
cleanup() {
  az sql server firewall-rule delete -g "$GROUP" -s "$server" -n launch-check -o none || true
}
trap cleanup EXIT

here=$(curl -s https://api.ipify.org)
az sql server firewall-rule create -g "$GROUP" -s "$server" -n launch-check \
  --start-ip-address "$here" --end-ip-address "$here" -o none
export ConnectionStrings__Jubilee
ConnectionStrings__Jubilee=$(az webapp config connection-string list -g "$GROUP" -n "$APP_APP" \
  --query "[?name=='Jubilee'].value | [0]" -o tsv)

dotnet build "$root/backend/src/Jubilee.Cli" -c Release --nologo -v q >/dev/null
# The list goes into a variable and is never printed. Its first column is the address.
list=$(dotnet run --project "$root/backend/src/Jubilee.Cli" -c Release --no-build -- launch list --kind notifications)
unset ConnectionStrings__Jubilee

rows=$(awk 'seen && NF { count++ } /^email,firstName,consentedAt,consentMethod/ { seen = 1 } END { print count + 0 }' <<<"$list")
present=$(awk -F, -v wanted="$(tr '[:upper:]' '[:lower:]' <<<"$address")" \
  'seen && tolower($1) == wanted { found = 1 } /^email,firstName,consentedAt,consentMethod/ { seen = 1 } END { print found ? "yes" : "no" }' <<<"$list")
unset list

echo "Launch notification sign-ups: $rows"
echo "$address is among them: $present"
[[ "$present" == "yes" ]]
