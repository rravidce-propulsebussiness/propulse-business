param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('staging','production')]
  [string]$Environment,

  [Parameter(Mandatory=$true)]
  [string]$BackendEnvFile,

  [int]$PublicPort = 0
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker is required.'
}

$dirty = git status --porcelain
if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect Git working tree.' }
if ($dirty) { throw 'Refusing a release from a dirty Git working tree. Commit or stash local changes first.' }

$sha = (git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $sha -notmatch '^[0-9a-f]{40}$') { throw 'Unable to resolve the exact Git commit.' }

$envPath = (Resolve-Path $BackendEnvFile).Path
if ($envPath -match '\.example$') { throw 'Copy the environment example to a secret deployment file before releasing.' }

if ($PublicPort -le 0) {
  $portLine = Get-Content $envPath | Where-Object { $_ -match '^PUBLIC_PORT=' } | Select-Object -Last 1
  if ($portLine) { $PublicPort = [int](($portLine -split '=',2)[1].Trim()) }
  if ($PublicPort -le 0) { $PublicPort = 8080 }
}

$env:DEPLOY_ENVIRONMENT = $Environment
$env:GIT_COMMIT_SHA = $sha
$env:RELEASE_ID = "$Environment-$((Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ'))"
$env:BACKEND_ENV_FILE = $envPath

$compose = @('compose','--env-file',$envPath,'-f','deploy/compose.yml')

Write-Host "Building exact release $($sha.Substring(0,12)) for $Environment..."
& docker @compose build backend frontend
if ($LASTEXITCODE -ne 0) { throw 'Container build failed.' }

Write-Host 'Running database migrations once...'
& docker @compose --profile release run --rm migrate
if ($LASTEXITCODE -ne 0) { throw 'Database migration failed; long-running services were not replaced.' }

Write-Host 'Starting web, worker and frontend...'
& docker @compose up -d backend worker frontend
if ($LASTEXITCODE -ne 0) { throw 'Container startup failed.' }

$base = "http://127.0.0.1:$PublicPort"
$deadline = (Get-Date).AddMinutes(3)
$lastError = 'not ready yet'
while ((Get-Date) -lt $deadline) {
  try {
    $version = Invoke-RestMethod -Uri "$base/health/version" -TimeoutSec 5
    $ready = Invoke-RestMethod -Uri "$base/health/ready" -TimeoutSec 5
    $commit = [string]$version.commit
    if (-not ($commit.StartsWith($sha) -or $sha.StartsWith($commit))) {
      throw "Container reports commit '$commit', expected '$sha'."
    }
    if ([string]$version.environment -ne $Environment) {
      throw "Container reports environment '$($version.environment)', expected '$Environment'."
    }
    if ([string]$ready.status -ne 'ok') { throw 'Readiness is not healthy yet.' }
    Write-Host "Release ready: $Environment $($sha.Substring(0,12))"
    Write-Host 'Run the external HTTPS Release Promotion smoke gate before sending production traffic.'
    exit 0
  } catch {
    $lastError = $_.Exception.Message
    Start-Sleep -Seconds 5
  }
}

throw "Release did not become ready within 3 minutes: $lastError"
