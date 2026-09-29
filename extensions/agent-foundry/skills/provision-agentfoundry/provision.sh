#!/usr/bin/env bash
set -euo pipefail

# THIN ADAPTER: Duplo ticket -> canonical Agent Foundry API -> Duplo result.
# No comparison, Antigence, or lineage logic lives here. Canonical logic: biobitworks/agent-foundry.
#
# Reads the spec the platform wrote to shared/*.json (spec.inputText, spec.model), POSTs it to the canonical
# API's live Antigence-vs-Liquid endpoint, and writes a SUMMARY back as the typed result. Failures are written
# as Failed status + faults; there is NO fallback and NO fabricated result.
#
# Env: DUPLO_BASE|DUPLO_HOST, DUPLO_TOKEN (resource-scoped, provided by the platform)
#      AGENT_FOUNDRY_API   canonical API base (default http://host.docker.internal:8765; the agent runs in a
#                          container, where localhost is the container itself)
#      AGENT_FOUNDRY_INSPECTOR_URL  link shown to the user (default http://localhost:8765/)
# Credentials are never printed.

API="${AGENT_FOUNDRY_API:-http://host.docker.internal:8765}"
INSPECTOR="${AGENT_FOUNDRY_INSPECTOR_URL:-http://localhost:8765/}"  # a ?live=<run tag> permalink is appended per run
SPEC_FILE="$(ls shared/*.json 2>/dev/null | head -1 || true)"
[ -n "$SPEC_FILE" ] || { echo "no spec file under shared/" >&2; exit 1; }

WORKSPACE_ID=$(jq -r '.ownerWorkspaceId' "$SPEC_FILE")
ID=$(jq -r '.id' "$SPEC_FILE")
TEXT=$(jq -r '.spec.inputText // ""' "$SPEC_FILE")
MODEL=$(jq -r '.spec.model // "lfm1p2b"' "$SPEC_FILE")

BASE="${DUPLO_BASE:-$DUPLO_HOST}"
# NOTE: the segment below must match manifest.json restSegment after the resource is renamed by /duplo-extension.
RES="$BASE/v1/aiservicedesk/user/data/workspaces/$WORKSPACE_ID/environment/${AGENT_FOUNDRY_REST_SEGMENT:-extensions/agentfoundry-runs}/$ID"
auth=(-H "Authorization: Bearer $DUPLO_TOKEN" -H "Content-Type: application/json")

post() { curl -fsS -X POST "$1" "${auth[@]}" -d "$2" >/dev/null; }
fail() { post "$RES/status" "$(jq -nc --arg m "$1" '{status:"Failed",subStatus:"Agent Foundry call failed",faults:[$m]}')" || true; echo "FAILED: $1" >&2; exit 1; }

NOTE="${AF_EXECUTOR_NOTE:-}"   # e.g. "executed directly by harness script; Duplo agent LLM auth failed" (explicit, never silent)
sub() { jq -nc --arg s "$1" --arg st "$2" --arg n "$NOTE" '{status:$st,subStatus:($s + (if $n=="" then "" else " [" + $n + "]" end))}'; }
post "$RES/status" "$(sub 'Running Antigence core and local model via canonical Agent Foundry' Processing)"

[ -n "$TEXT" ] || fail "spec.inputText is empty"
RESP=$(curl -fsS -m 300 -X POST "$API/api/antigence/live" -H 'Content-Type: application/json' \
  -d "$(jq -nc --arg t "$TEXT" --arg m "$MODEL" '{text:$t,model:$m}')") || fail "canonical API unreachable or rejected the request at $API"

# Summarise ONLY what the canonical comparison object says; nothing is recomputed here.
RESULT=$(echo "$RESP" | jq -c --arg insp "$INSPECTOR" '
  .comparison as $c
  | { runA: ($c.CONTROL_RUN), runB: ($c.VARIANT_RUN),
      controlIdentity: (.control | map(select(.event_type=="model" or .event_type=="failure")) | .[0].actor | "\(.provider)/\(.model) [\(.provider_kind)]"),
      variantIdentity: (.variant | map(select(.event_type=="model" or .event_type=="failure")) | .[0].actor | "\(.provider)/\(.model) [\(.provider_kind)]"),
      divergence: $c.DIVERGENCE,
      firstDivergence: (if $c.FIRST_DIVERGENCE then "event \($c.FIRST_DIVERGENCE.index) (\($c.FIRST_DIVERGENCE.kind))" else null end),
      changedOutcome: (if ($c.AFFECTED_CLAIMS|length)==0 then "NO_CLAIM_AFFECTED" elif ($c.AFFECTED_CLAIMS|any(.changed)) then "YES" else "NO" end),
      headline: (if ($c.AFFECTED_CLAIMS|length)>0 and ($c.AFFECTED_CLAIMS|all(.changed|not)) and ($c.failures_and_abstentions|length)==0 then "Same answer, different responder" else "Answer or execution path changed" end),
      affectedClaims: [$c.AFFECTED_CLAIMS[] | "\(.claim_id): \(.control // "(no claim)") -> \(.variant // "(no claim)") [\(if .changed then "changed" else "unchanged" end)]"],
      failuresAndAbstentions: [$c.failures_and_abstentions[] | "\(.run) \(.event_type): \(.payload.message // .payload.reason)"],
      explanation: $c.explanation,
      replay: "NOT_APPLICABLE_FOR_THIS_LIVE_PATH",
      inspectorUrl: ($insp + "?live=" + (.tag | sub("^live:";""))),
      canonicalInputContentId: .canonical_input_content_id }') || fail "could not summarise the canonical response"

post "$RES/results" "$RESULT" || fail "could not write result to Duplo"
post "$RES/status" "$(sub 'Comparison complete; see result and Agent Foundry inspector' Complete)"
echo "Done: $(echo "$RESULT" | jq -r '.headline // "complete"')"
