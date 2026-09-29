#!/usr/bin/env bash
# EXPLICIT FALLBACK (never silent): run the provision-agentfoundry skill script directly for an existing resource when the
# Duplo agent lane cannot dispatch it (e.g. its LLM gateway returns 401). The result's subStatus records that it was
# executed directly, NOT by the Duplo agent. Uses the kit's target resolution; never prints a token.
# Usage: ./scripts/run-skill-direct.sh <resource-id> [note]
set -euo pipefail
cd "$(dirname "$0")/.."
ID="${1:?usage: run-skill-direct.sh <resource-id> [note]}"
NOTE="${2:-executed directly by harness script; Duplo agent LLM gateway returned 401}"

source scripts/_target.sh            # -> BASE_URL, TOKEN (never echoed), _envv()
BASE_URL="${BASE_URL%/}"
WS="$(_envv EXTENSION_DEV_WORKSPACE_ID)"
[ -n "$WS" ] && [ -n "$TOKEN" ] || { echo "workspace/token not resolved" >&2; exit 2; }

WORK="$(mktemp -d)"; mkdir -p "$WORK/shared"
curl -sS -m 30 "$BASE_URL/v1/aiservicedesk/user/data/workspaces/$WS/environment/extensions/agentfoundry-runs/$ID" \
  -H "Authorization: Bearer $TOKEN" | jq '(.data // .)' > "$WORK/shared/agent-foundry-run.json"
[ "$(jq -r .id "$WORK/shared/agent-foundry-run.json")" = "$ID" ] || { echo "resource $ID not found" >&2; exit 3; }

( cd "$WORK" && DUPLO_BASE="$BASE_URL" DUPLO_TOKEN="$TOKEN" AF_EXECUTOR_NOTE="$NOTE" \
    AGENT_FOUNDRY_API="${AGENT_FOUNDRY_API:-http://127.0.0.1:8765}" \
    bash "$OLDPWD/extensions/agent-foundry/skills/provision-agentfoundry/provision.sh" )
