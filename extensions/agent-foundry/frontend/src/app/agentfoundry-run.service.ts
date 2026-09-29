import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Host-provided string DI tokens (no @common-lib import).
export const REMOTE_DuploHttpClient = 'REMOTE_DuploHttpClient';
export const REMOTE_UserSession = 'REMOTE_UserSession';

// TYPED resource: the extension ships its own controller, so we call its OWN REST segment (must equal manifest restSegment).
const ORIGIN_TYPE = 'AgentFoundryRun';
const SUB_TYPE = 'agent-foundry-run';
const REST_SEGMENT = 'extensions/agentfoundry-runs';

export interface AgentFoundryRunSpec { inputText?: string; model?: string }

// Summary of the CANONICAL comparison (computed by biobitworks/agent-foundry, not here).
export interface AgentFoundryRunResult {
  headline?: string; changedOutcome?: string; divergence?: string; firstDivergence?: string;
  controlIdentity?: string; variantIdentity?: string; runA?: string; runB?: string;
  explanation?: string; replay?: string; inspectorUrl?: string; canonicalInputContentId?: string;
  affectedClaims?: string[]; failuresAndAbstentions?: string[];
}

export interface AgentFoundryRun {
  id: string;
  name: string;
  status: string;
  subStatus?: string;
  blockedReason?: string;
  faults?: string[];
  createdAt?: string;
  updatedAt?: string;
  spec?: AgentFoundryRunSpec;
  result?: AgentFoundryRunResult;
}

@Injectable({ providedIn: 'root' })
export class AgentFoundryRunService {
  private readonly http = inject<any>(REMOTE_DuploHttpClient as any);
  private readonly session = inject<any>(REMOTE_UserSession as any);

  workspaceId(): string {
    return this.session?.tenant?.TenantId ?? '';
  }

  private base(): string {
    return `/v1/aiservicedesk/user/data/workspaces/${this.workspaceId()}/environment/${REST_SEGMENT}`;
  }

  private unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

  list(): Observable<AgentFoundryRun[]> {
    return this.http.get(this.base()).pipe(map((r: any) => {
      const d = this.unwrap(r);
      return (d?.items ?? d ?? []) as AgentFoundryRun[];
    }));
  }

  get(id: string): Observable<AgentFoundryRun> {
    return this.http.get(`${this.base()}/${id}`).pipe(map((r: any) => this.unwrap(r)));
  }

  create(name: string, spec: AgentFoundryRunSpec): Observable<AgentFoundryRun> {
    return this.http.post(this.base(), { name, spec }).pipe(map((r: any) => this.unwrap(r)));
  }

  // PATCH replaces `spec` wholesale: always send the FULL spec.
  update(id: string, spec: AgentFoundryRunSpec): Observable<AgentFoundryRun> {
    return this.http.patch(`${this.base()}/${id}`, { spec }).pipe(map((r: any) => this.unwrap(r)));
  }

  ticketName(id: string): Observable<string | null> {
    const url = `/v1/aiservicedesk/tickets/${this.workspaceId()}/origin-context`
      + `?type=${ORIGIN_TYPE}&id=${id}&subType=${SUB_TYPE}`;
    return this.http.get(url).pipe(map((r: any) => this.unwrap(r)?.name ?? null));
  }
}
