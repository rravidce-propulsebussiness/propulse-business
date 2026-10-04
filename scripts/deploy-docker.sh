#!/usr/bin/env bash
set -euo pipefail

environment="${1:-}"
env_file="${2:-}"

if [[ "$environment" != "staging" && "$environment" != "production" ]]; then
  echo "Usage: $0 <staging|production> </secure/backend.env>" >&2
  exit 2
fi
if [[ -z "$env_file" || ! -f "$env_file" ]]; then
  echo "A real environment file is required." >&2
  exit 2
fi
if [[ "$env_file" == *.example ]]; then
  echo "Copy the example to a secret deployment file before releasing." >&2
  exit 2
fi
command -v docker >/dev/null || { echo "Docker is required." >&2; exit 2; }

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Refusing a release from a dirty Git working tree." >&2
  exit 1
fi

sha="$(git rev-parse HEAD)"
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || { echo "Unable to resolve exact Git commit." >&2; exit 1; }

export DEPLOY_ENVIRONMENT="$environment"
export GIT_COMMIT_SHA="$sha"
export RELEASE_ID="$environment-$(date -u +%Y%m%dT%H%M%SZ)"
export BACKEND_ENV_FILE="$(cd "$(dirname "$env_file")" && pwd)/$(basename "$env_file")"

compose=(docker compose --env-file "$BACKEND_ENV_FILE" -f deploy/compose.yml)

echo "Building exact release ${sha:0:12} for $environment..."
"${compose[@]}" build backend frontend

echo "Running database migrations once..."
"${compose[@]}" --profile release run --rm migrate

echo "Starting web, worker and frontend..."
"${compose[@]}" up -d backend worker frontend

public_port="$(grep -E '^PUBLIC_PORT=' "$BACKEND_ENV_FILE" | tail -1 | cut -d= -f2- || true)"
public_port="${public_port:-8080}"
base="http://127.0.0.1:$public_port"

deadline=$((SECONDS+180))
last="not ready yet"
while (( SECONDS < deadline )); do
  version="$(curl -fsS --max-time 5 "$base/health/version" 2>/dev/null || true)"
  ready="$(curl -fsS --max-time 5 "$base/health/ready" 2>/dev/null || true)"
  if node -e '
    const [versionRaw,readyRaw,expected,environment]=process.argv.slice(1);
    try{
      const v=JSON.parse(versionRaw),r=JSON.parse(readyRaw);
      const actual=String(v.commit||"");
      if(!(actual.startsWith(expected)||expected.startsWith(actual)))process.exit(1);
      if(String(v.environment)!==environment||r.status!=="ok")process.exit(1);
    }catch{process.exit(1)}
  ' "$version" "$ready" "$sha" "$environment"; then
    echo "Release ready: $environment ${sha:0:12}"
    echo "Run the external HTTPS Release Promotion smoke gate before sending production traffic."
    exit 0
  fi
  last="waiting for exact commit, worker heartbeat and readiness"
  sleep 5
done

echo "Release did not become ready within 3 minutes: $last" >&2
exit 1
