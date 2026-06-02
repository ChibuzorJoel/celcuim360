// src/app/core/admin-dashboard/admin-dashboard.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router }                        from '@angular/router';
import { interval, Subscription }        from 'rxjs';
import { switchMap, startWith }          from 'rxjs/operators';
import {
  AdminRegistrationService,
  RegistrationRecord
} from '../services/admin-registration.service';

@Component({
  selector:    'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls:   ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

  loading = true;
  error   = '';

  // ── Stats derived from /api/admin/registrations ───────────────────────
  stats = {
    totalRegistrations: 0,
    pendingApprovals:   0,
    approvedCount:      0,
    rejectedCount:      0,
    nyscCount:          0,
    graduateCount:      0,
    assessmentCount:    0,
    avgScore:           0,
  };

  // ── Table data ────────────────────────────────────────────────────────
  recentRegistrations: RegistrationRecord[] = [];   // latest 5 by date
  liveSubmissions:     RegistrationRecord[] = [];   // latest 5 with a score
  topScorers:          RegistrationRecord[] = [];   // top 5 by percentage (perf bars)

  private pollSub?: Subscription;
  private readonly POLL_INTERVAL = 15_000;

  constructor(
    private adminService: AdminRegistrationService,
    private router:       Router,
  ) {}

  ngOnInit():    void { this.startPolling(); }
  ngOnDestroy(): void { this.pollSub?.unsubscribe(); }

  // ── Poll /api/admin/registrations every 15 s ──────────────────────────
  private startPolling(): void {
    this.pollSub = interval(this.POLL_INTERVAL)
      .pipe(
        startWith(0),
        switchMap(() => this.adminService.getAll())
      )
      .subscribe({
        next: data => {
          this.processData(data);
          this.loading = false;
          this.error   = '';
        },
        error: err => {
          console.error('[Dashboard]', err);
          this.error   = err.message || 'Could not load dashboard data.';
          this.loading = false;
        },
      });
  }

  // ── Derive everything from the registrations array ────────────────────
  private processData(records: RegistrationRecord[]): void {
    if (!Array.isArray(records)) return;

    // Stats
    const withScore  = records.filter(r => r.assessmentPercentage != null);
    const totalScore = withScore.reduce((s, r) => s + (r.assessmentPercentage ?? 0), 0);

    this.stats = {
      totalRegistrations: records.length,
      pendingApprovals:   records.filter(r => r.status === 'pending').length,
      approvedCount:      records.filter(r => r.status === 'approved').length,
      rejectedCount:      records.filter(r => r.status === 'rejected').length,
      nyscCount:          records.filter(r => r.category === 'nysc').length,
      graduateCount:      records.filter(r => r.category === 'graduate').length,
      assessmentCount:    withScore.length,
      avgScore:           withScore.length
                            ? Math.round(totalScore / withScore.length)
                            : 0,
    };

    // Sort newest first once — reuse for all slices
    const byDate = [...records].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    this.recentRegistrations = byDate.slice(0, 5);

    this.liveSubmissions = byDate
      .filter(r => r.assessmentPercentage != null)
      .slice(0, 5);

    this.topScorers = [...withScore]
      .sort((a, b) => (b.assessmentPercentage ?? 0) - (a.assessmentPercentage ?? 0))
      .slice(0, 5);
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  scoreClass(pct: number | undefined): string {
    if (pct == null) return '';
    if (pct >= 75)   return 'score-high';
    if (pct >= 60)   return 'score-mid';
    return 'score-low';
  }

  categoryLabel(c: string): string {
    return c === 'nysc' ? 'NYSC' : 'Graduate';
  }

  navigate(route: string): void {
    this.router.navigate(['/admin/' + route]);
  }
}