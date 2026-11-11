#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Starts the API for the Playwright suite on http://localhost:5080.
.DESCRIPTION
  Runs in the foreground (Playwright's webServer launches and stops it). The API uses a fresh
  SQLite database file: the schema comes from the model and the demo data is seeded on startup.
  No SQL Server or LocalDB is needed. Readiness: GET http://localhost:5080/api/health.
#>
param(
    # The port to listen on. Playwright expects the default.
    [int]$Port = 5080
)

$ErrorActionPreference = 'Stop'

$project = Join-Path $PSScriptRoot '..' 'backend' 'src' 'Jubilee.Api'

$databaseDirectory = Join-Path ([System.IO.Path]::GetTempPath()) 'jubilee-e2e'
New-Item -ItemType Directory -Force -Path $databaseDirectory | Out-Null
$database = Join-Path $databaseDirectory "jubilee-e2e-$PID.db"
Get-ChildItem -Path $databaseDirectory -Filter 'jubilee-e2e-*.db*' -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

$env:ASPNETCORE_ENVIRONMENT = 'E2e'
$env:ASPNETCORE_URLS = "http://localhost:$Port"
$env:Database__Provider = 'Sqlite'
$env:ConnectionStrings__Jubilee = "DataSource=$database"
$env:ConnectionStrings__Redis = ''
$env:Seed__OnStartup = 'true'
# No outside network in the recording: skip the breached-password lookup.
$env:Passwords__CheckBreaches = 'false'
$env:App__PublicBaseUrl = 'http://localhost:4200'
# The whole suite calls from one address; the per-address limit is covered by the API tests.
$env:RateLimits__DirectoryReadsPerMinute = '100000'

dotnet run --project $project -c Release --no-launch-profile
exit $LASTEXITCODE
