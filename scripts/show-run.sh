#!/usr/bin/env bash
# Print a stored Agent Foundry run as Duplo holds it (non-secret fields only). Usage: ./scripts/show-run.sh <resource-id>
set -euo pipefail
cd "$(dirname "$0")/.."
ID="${1:?usage: show-run.sh <resource-id>}"
source scripts/_target.sh
WS="$(_envv EXTENSION_DEV_WORKSPACE_ID)"
curl -sS -m 30 "${BASE_URL%/}/v1/aiservicedesk/user/data/workspaces/$WS/environment/extensions/agentfoundry-runs/$ID" -H "Authorization: Bearer $TOKEN" \
 | jq '(.data // .) | {name,status,subStatus,faults,spec:{model:.spec.model},result:(.result|{headline,changedOutcome,firstDivergence,controlIdentity,variantIdentity,runA,runB,replay,inspectorUrl,affectedClaims,failuresAndAbstentions})}'
