#!/usr/bin/env bash
# Verify that the workspace id used for runs is the platform's 'extension-dev' workspace (by NAME, from the platform).
# Prints only the workspace name and a boolean; never a token or id.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/_target.sh
WS="$(_envv EXTENSION_DEV_WORKSPACE_ID)"
NAME=$(curl -fsS -m 15 "${BASE_URL%/}/v1/aiservicedesk/admin/data/workspaces/$WS" -H "Authorization: Bearer $TOKEN" | jq -r '(.data // .) | .name')
echo "workspace_name_from_platform=$NAME"
[ "$NAME" = "extension-dev" ] && echo "EXTENSION_DEV_WORKSPACE=VERIFIED_BY_API" || echo "EXTENSION_DEV_WORKSPACE=MISMATCH"
