# Agent Foundry: Duplo thin-adapter extension

A DuploCloud extension (typed resource `AgentFoundryRun`) that is a THIN CLIENT over the canonical Agent Foundry runtime
(`biobitworks/agent-foundry`). It does not compute comparisons, run Antigence, or export lineage itself.

```
Duplo ticket / UI  ->  AgentFoundryRun (spec: inputText, model)
                   ->  skill provision-agentfoundry (provision.sh)
                   ->  canonical POST /api/antigence/live  (Antigence deterministic core vs local Liquid model)
                   ->  summary written back as the typed result (headline, changed outcome, first divergence,
                       identities, affected claims, failures/abstentions, link to the full inspector)
```

- Canonical API base: `AGENT_FOUNDRY_API` (default `http://host.docker.internal:8765`; the agent runs in a container).
- Inspector link: `AGENT_FOUNDRY_INSPECTOR_URL` (default `http://localhost:8765/`).
- No fallback: if the canonical API fails, the run is `Failed` with the message; no fabricated result.
- Build/deploy: `scripts/build-extension.sh extensions/agent-foundry` then `scripts/deploy-extension.sh` (see the Duplo kit docs).
- Mapping: Ticket->Run, Provider/Scope->ExecutionContext, skill->Capability, workspace->ExecutionEnvironment.
