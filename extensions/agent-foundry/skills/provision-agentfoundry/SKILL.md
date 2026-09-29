---
name: provision-agentfoundry
description: Provisions an Agent Foundry run. THIN ADAPTER: sends the ticket's input text to the canonical Agent Foundry API (Antigence deterministic core vs a local Liquid model), then writes a summary of the resulting comparison back as the typed result. No comparison logic lives here.
---

# provision-agentfoundry: thin adapter over canonical Agent Foundry

You are the provisioning agent for an **Agent Foundry run**. Do NOT reimplement comparison, Antigence screening,
or lineage export. The canonical product (`biobitworks/agent-foundry`) owns those.

Run the deterministic helper from the ticket workdir (full path, not `skills/...`):

```bash
bash .claude/skills/provision-agentfoundry/provision.sh
```

It reads `shared/*.json` (`spec.inputText`, `spec.model`), calls `POST $AGENT_FOUNDRY_API/api/antigence/live`
(default `http://host.docker.internal:8765`), and writes `status` and `results` to the resource's own route.

Rules:
- If the canonical API is unreachable or rejects the request, the helper posts `Failed` with the message. **Do not
  fall back to another model or invent a result.** Report the failure.
- `spec.model` is `lfm1p2b` (default) or `lfm350m`. The 2.6B model is excluded: the tested configurations failed the
  strict JSON contract (evidence: `provenance/local_models/` and `demo/recorded/antigence_lfm/` in the canonical repo).
- If the result says `Same answer, different responder`, do NOT describe the answer as changed.
- Never print `DUPLO_TOKEN` or any credential.

Mapping: Ticket -> Run; Provider/Scope -> ExecutionContext; this skill -> Capability; workspace -> ExecutionEnvironment.
