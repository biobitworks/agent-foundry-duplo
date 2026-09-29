import { Component, DestroyRef, LOCALE_ID, OnInit, computed, inject, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { CommonLibComponentsModule } from '@duplocloud-internal/ng-common-lib';
import { AgentFoundryRun, AgentFoundryRunService } from '../agentfoundry-run.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';
import { LifecyclePhase, LifecycleRailComponent, RailFact } from '../shared/lifecycle-rail.component';

// Detail view (Template-G shell). The Result tab shows a SUMMARY of the canonical Agent Foundry comparison.
// It answers: same input, different execution path; first divergence; changed outcome; provider identity;
// failures/abstentions kept visible; and links to the full Agent Foundry inspector. Nothing is recomputed here.
@Component({
  selector: 'af-view',
  imports: [CommonLibComponentsModule, StatusBadgeComponent, LifecycleRailComponent],
  styleUrl: '../shared/detail-page.scss',
  template: `
    @if (item(); as it) {
      <div class="ext-detail-page">

        <header class="g-head">
          <span class="g-tile-ic"><i data-feather="git-branch" size="26"></i></span>
          <div class="g-head-main">
            <div class="g-head-t">
              <h1>{{ it.name }}</h1>
              <app-status-badge [status]="it.status"></app-status-badge>
              @if (working()) {
                <span class="dots-loader text-warning"><span></span><span></span><span></span></span>
              }
            </div>
            <div class="g-meta">
              @if (it.createdAt) {
                <span class="g-meta-item"><span class="k">Created:</span> {{ it.createdAt | date:'medium' }}</span>
                <span class="sep">·</span>
              }
              <span class="g-meta-item"><span class="k">Variant:</span> <span class="mono">{{ it.spec?.model || '—' }}</span></span>
            </div>
          </div>
          <div class="g-actions">
            <div class="seg" role="group" aria-label="View">
              <button type="button" [class.active]="view() === 'spec'" (click)="view.set('spec')">Spec</button>
              <button type="button" [class.active]="view() === 'result'" (click)="view.set('result')">Result</button>
            </div>
            <button type="button" class="btn btn-sm btn-primary" [disabled]="tracking()" (click)="track()">
              <i data-feather="terminal" class="mr-50"></i>Ask agent
            </button>
            <div ngbDropdown container="body" placement="bottom-right">
              <button type="button" class="btn btn-sm hide-arrow" aria-label="More actions" ngbDropdownToggle>
                <i data-feather="more-vertical"></i>
              </button>
              <div ngbDropdownMenu>
                <a ngbDropdownItem (click)="edit()"><i data-feather="edit" class="mr-50"></i> Edit</a>
              </div>
            </div>
          </div>
        </header>

        <div class="g-cols">
          <section class="g-card g-main">
            @if (view() === 'spec') {
              <div class="g-sec pt-1">
                <div class="g-sec-h"><h3>Requested spec</h3></div>
                <div class="g-tiles c3">
                  @for (t of specTiles(); track t.label) {
                    <div class="g-tile">
                      <div class="g-tl">{{ t.label }}</div>
                      <span class="g-tv">{{ t.value }}</span>
                    </div>
                  }
                </div>
              </div>
            } @else {
              <scrollable-nav-tab>
                <ul ngbNav #resultNav="ngbNav" class="nav nav-tabs flat-tabs g-tabs" [(activeId)]="activeTab">
                  <li [ngbNavItem]="'overview'">
                    <a ngbNavLink>Overview</a>
                    <ng-template ngbNavContent>
                      @if (it.faults?.length) {
                        <div class="alert alert-danger py-1 px-2 mb-1">
                          @for (f of it.faults; track f) { <div>{{ f }}</div> }
                        </div>
                      }
                      <div class="g-sec">
                        <div class="g-sec-h"><h3>Why did this agent behave differently?</h3></div>
                        <div class="g-tiles c3">
                          <div class="g-tile wide">
                            <div class="g-tl">Outcome</div>
                            <span class="g-tv">{{ it.result?.headline || '—' }}
                              @if (!it.result?.headline) { <small>Filled in once the run completes</small> }
                            </span>
                          </div>
                          <div class="g-tile">
                            <div class="g-tl">Changed outcome</div>
                            <span class="g-tv">{{ it.result?.changedOutcome || '—' }}</span>
                          </div>
                          <div class="g-tile">
                            <div class="g-tl">First divergence</div>
                            <span class="g-tv">{{ it.result?.firstDivergence || (it.result?.divergence === 'NULL' ? 'none (DIVERGENCE=NULL)' : '—') }}</span>
                          </div>
                          <div class="g-tile">
                            <div class="g-tl">Run A (control)</div>
                            <span class="g-tv">{{ it.result?.controlIdentity || '—' }}</span>
                          </div>
                          <div class="g-tile">
                            <div class="g-tl">Run B (variant)</div>
                            <span class="g-tv">{{ it.result?.variantIdentity || '—' }}</span>
                          </div>
                          <div class="g-tile">
                            <div class="g-tl">Replay / checkpoint</div>
                            <span class="g-tv">{{ it.result?.replay || '—' }}</span>
                          </div>
                          <div class="g-tile wide">
                            <div class="g-tl">Explanation</div>
                            <span class="g-tv">{{ it.result?.explanation || '—' }}</span>
                          </div>
                          <div class="g-tile wide">
                            <div class="g-tl">Affected downstream claims</div>
                            <span class="g-tv">
                              @for (c of it.result?.affectedClaims ?? []; track c) { <div>{{ c }}</div> }
                              @if (!(it.result?.affectedClaims?.length)) { — }
                            </span>
                          </div>
                          <div class="g-tile wide">
                            <div class="g-tl">Failures and abstentions (kept, never hidden)</div>
                            <span class="g-tv">
                              @for (c of it.result?.failuresAndAbstentions ?? []; track c) { <div>{{ c }}</div> }
                              @if (!(it.result?.failuresAndAbstentions?.length)) { none recorded }
                            </span>
                          </div>
                          <div class="g-tile wide">
                            <div class="g-tl">Full Agent Foundry inspector</div>
                            <span class="g-tv">
                              @if (it.result?.inspectorUrl) {
                                <a [href]="it.result?.inspectorUrl" target="_blank" rel="noopener">{{ it.result?.inspectorUrl }}</a>
                              } @else { — }
                              @if (it.result?.runA) { <small>Runs: {{ it.result?.runA }} vs {{ it.result?.runB }}</small> }
                            </span>
                          </div>
                        </div>
                      </div>
                    </ng-template>
                  </li>
                </ul>
              </scrollable-nav-tab>
              <div [ngbNavOutlet]="resultNav" class="mt-50"></div>
            }
          </section>

          <ext-lifecycle-rail
            [phases]="phases()"
            [attached]="attached()"
            [trackable]="true"
            [trackBusy]="tracking()"
            (track)="track()" />
        </div>
      </div>
    } @else {
      <div class="text-muted p-2">Loading…</div>
    }
  `,
})
export class ViewRunComponent implements OnInit {
  private static readonly WAITING = ['Blocked', 'WaitingForApproval'];
  private static readonly READY = ['Complete', 'Updated'];
  private static readonly TEARDOWN = ['DeProvisioning', 'DeprovisionInitiated', 'DeProvisioned', 'DeprovisionFailed'];

  private readonly svc = inject(AgentFoundryRunService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly locale = inject(LOCALE_ID);

  protected readonly item = signal<AgentFoundryRun | undefined>(undefined);
  protected readonly view = signal<'spec' | 'result'>('spec');
  protected readonly tracking = signal(false);
  protected activeTab = 'overview';

  private poll?: Subscription;

  protected readonly working = computed(() => {
    const s = this.item()?.status ?? '';
    return !!s && !ViewRunComponent.WAITING.includes(s) && !ViewRunComponent.READY.includes(s)
      && s !== 'Failed' && !ViewRunComponent.TEARDOWN.includes(s);
  });

  protected readonly phases = computed<LifecyclePhase[]>(() => {
    const it = this.item();
    if (!it) {
      return [];
    }
    const s = it.status;
    const waiting = ViewRunComponent.WAITING.includes(s);
    const ready = ViewRunComponent.READY.includes(s);
    const failed = s === 'Failed';
    const working = this.working();

    return [
      { label: 'Created', subtitle: this.fmt(it.createdAt), state: 'done' },
      {
        label: 'Running',
        subtitle: working ? (it.subStatus || 'Agent Foundry is running both runs')
          : failed ? (it.subStatus || it.faults?.[0] || 'Failed — see faults')
          : 'Antigence core and the local model run on the same canonical input',
        state: failed ? 'fail' : working ? 'now' : 'done',
      },
      {
        label: 'Needs your input',
        subtitle: waiting
          ? (s === 'WaitingForApproval' ? 'Approval pending' : (it.blockedReason || 'Question pending'))
          : 'The agent asked a question or needs an approval',
        state: waiting ? 'now' : (ready ? 'done' : 'todo'),
        action: waiting ? { label: 'Review', run: () => this.track() } : undefined,
      },
      {
        label: 'Ready',
        subtitle: ready ? `${it.result?.headline || 'Complete'} · ${this.fmt(it.updatedAt)}` : undefined,
        state: ready ? 'done' : 'todo',
      },
    ];
  });

  protected readonly specTiles = computed(() => {
    const it = this.item();
    return [
      { label: 'Input text', value: it?.spec?.inputText || '—' },
      { label: 'Variant model', value: it?.spec?.model || '—' },
      { label: 'Created', value: this.fmt(it?.createdAt) },
    ];
  });

  protected readonly attached = computed<RailFact[]>(() => {
    const it = this.item();
    return [
      { label: 'Created', value: this.fmt(it?.createdAt) },
      { label: 'Updated', value: this.fmt(it?.updatedAt) },
    ];
  });

  ngOnInit(): void {
    this.refresh();
    this.destroyRef.onDestroy(() => this.poll?.unsubscribe());
  }

  private refresh(): void {
    const id = this.route.snapshot.params['id'];
    this.svc.get(id).subscribe(i => {
      const first = !this.item();
      this.item.set(i);
      if (first) {
        this.view.set(i?.result?.headline ? 'result' : 'spec');
      }
      if (this.working() && !this.poll) {
        this.poll = interval(3000).subscribe(() => this.refresh());
      }
      if (!this.working() && this.poll) {
        this.poll.unsubscribe();
        this.poll = undefined;
      }
    });
  }

  protected fmt(v?: string): string {
    return v ? formatDate(v, 'medium', this.locale) : '—';
  }

  protected edit(): void {
    const it = this.item();
    if (it) {
      this.router.navigate(['../..', 'edit', it.id], { relativeTo: this.route });
    }
  }

  protected track(): void {
    const it = this.item();
    if (!it) {
      return;
    }
    this.tracking.set(true);
    this.svc.ticketName(it.id).subscribe({
      next: name => {
        this.tracking.set(false);
        if (!name) {
          return;
        }
        const url = `/ai/service-desk/${this.svc.workspaceId()}/tickets/chat/${name}`;
        this.router.navigateByUrl(url).then(ok => { if (!ok) window.location.assign(url); })
          .catch(() => window.location.assign(url));
      },
      error: () => this.tracking.set(false),
    });
  }
}
