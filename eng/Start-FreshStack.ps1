#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Rebuilds the local database and starts the whole stack for development.
.DESCRIPTION
  Runs `jubilee reset`, `migrate` and `seed` against the configured SQL Server
  (ConnectionStrings:Jubilee in appsettings.json, or the ConnectionStrings__Jubilee environment
  variable), then starts the API on http://localhost:5080 and the Angular dev server on
  http://localhost:4200, which proxies /api to the API. Ctrl+C stops both.
#>
$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$cli = Join-Path $root 'backend' 'src' 'Jubilee.Cli'
$api = Join-Path $root 'backend' 'src' 'Jubilee.Api'
$frontend = Join-Path $root 'frontend'

foreach ($command in 'reset', 'migrate', 'seed') {
    dotnet run --project $cli -- $command
    if ($LASTEXITCODE -ne 0) {
        throw "jubilee $command failed with exit code $LASTEXITCODE."
    }
}

$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:ASPNETCORE_URLS = 'http://localhost:5080'
$apiProcess = Start-Process -FilePath 'dotnet' -PassThru -NoNewWindow `
    -ArgumentList @('run', '--project', $api, '--no-launch-profile')

try {
    Push-Location $frontend
    npm start
}
finally {
    Pop-Location
    if (-not $apiProcess.HasExited) {
        Stop-Process -Id $apiProcess.Id -Force
    }
}
