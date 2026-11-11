#!/bin/bash
# Startup command of the app's App Service (app.jubilee.to). One container runs three processes:
#   - the Jubilee API on 127.0.0.1:5080 (never reachable from outside);
#   - the Jubilee worker (background jobs);
#   - server.js on $PORT, which serves the Angular app and sends /api to the API.
# The API and the worker are restarted if they stop; if server.js stops, App Service restarts the
# container.
cd /home/site/wwwroot || exit 1

# The API trusts X-Forwarded-For and X-Forwarded-Proto from server.js (loopback), so it sees the
# caller's address (rate limits) and HTTPS (Secure cookies, HSTS).
export ASPNETCORE_FORWARDEDHEADERS_ENABLED=true

keep() {
  local dir=$1
  shift
  (
    cd "$dir" || exit 1
    while true; do
      "$@"
      echo "start.sh: '$*' stopped with $?; restarting in 5 s"
      sleep 5
    done
  ) &
}

ASPNETCORE_URLS=http://127.0.0.1:5080 keep api dotnet Jubilee.Api.dll
keep worker dotnet Jubilee.Worker.dll

chmod +x bin/node 2>/dev/null
export STATIC_ROOT=/home/site/wwwroot/public
export API_ORIGIN=http://127.0.0.1:5080
exec bin/node server.js
