#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Starts the API for the Playwright suite on http://localhost:5080.
.DESCRIPTION
  Runs in the foreground (Playwright's webServer launches and stops it). The API uses a fresh
  SQLite database file: the schema comes from the model and the demo data is seeded on startup.
  No SQL Server or LocalDB is needed. Readiness: GET http://localhost:5080/api/health.

  Staff sign-in uses the development identity (ADR 0040): the admin application on
  http://localhost:4202 signs in StaffSignIn:DevelopmentEmail with a second factor, and the staff
  endpoints allow the loopback addresses only. -StaffEmail grants that address the moderator and
  admin roles in the fresh database before the API starts.
.EXAMPLE
  pwsh eng/Start-E2eApi.ps1 -StaffEmail miriam@jubilee.to
#>
param(
    # The port to listen on. Playwright expects the default.
    [int]$Port = 5080,
    # A staff account to create with both roles, for working on the admin application locally.
    [string]$StaffEmail = ''
)

$ErrorActionPreference = 'Stop'

$project = Join-Path $PSScriptRoot '..' 'backend' 'src' 'Jubilee.Api'

$databaseDirectory = Join-Path ([System.IO.Path]::GetTempPath()) 'jubilee-e2e'
New-Item -ItemType Directory -Force -Path $databaseDirectory | Out-Null
$database = Join-Path $databaseDirectory "jubilee-e2e-$PID.db"
Get-ChildItem -Path $databaseDirectory -Filter 'jubilee-e2e-*.db*' -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

# Development: the only environment in which the API accepts the development staff identity.
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:ASPNETCORE_URLS = "http://localhost:$Port"
$env:Database__Provider = 'Sqlite'
$env:ConnectionStrings__Jubilee = "DataSource=$database"
$env:ConnectionStrings__Redis = ''
$env:Seed__OnStartup = 'true'
# No outside network in the recording: skip the breached-password lookup.
$env:Passwords__CheckBreaches = 'false'
$env:App__PublicBaseUrl = 'http://localhost:4200'
# Placeholders, not credentials: they make the API report Google sign-in as available, so the
# recorded session shows the Google buttons as the mocks do (L2-003 AC5). No spec follows them to
# Google. A developer who sets the real pair in the terminal first keeps it (see README.md).
if (-not $env:Google__ClientId) { $env:Google__ClientId = 'e2e-placeholder' }
if (-not $env:Google__ClientSecret) { $env:Google__ClientSecret = 'e2e-placeholder' }
# Staff sign-in without Entra ID, and the staff endpoints open to this machine only (L2-192).
$env:StaffSignIn__Provider = 'Development'
$env:StaffSignIn__PublicBaseUrl = 'http://localhost:4202'
$env:StaffSignIn__DevelopmentEmail = if ($StaffEmail) { $StaffEmail } else { 'miriam@jubilee.to' }
$env:StaffAccess__AllowedNetworks = '127.0.0.1,::1'
if ($StaffEmail) {
    $cli = Join-Path $PSScriptRoot '..' 'backend' 'src' 'Jubilee.Cli'
    dotnet run --project $cli -c Release -- migrate
    foreach ($role in 'moderator', 'admin') {
        dotnet run --project $cli -c Release -- staff grant --email $StaffEmail --role $role
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
}
# The whole suite calls from one address; the per-address limits are covered by the API tests.
$env:RateLimits__DirectoryReadsPerMinute = '100000'
$env:RateLimits__LaunchSignUpsPerHour = '100000'
$env:RateLimits__LaunchPreRegistrationsPerHour = '100000'

dotnet run --project $project -c Release --no-launch-profile
exit $LASTEXITCODE
