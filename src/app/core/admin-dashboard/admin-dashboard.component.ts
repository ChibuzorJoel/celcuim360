// src/app/core/admin-dashboard/admin-dashboard.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router }                        from '@angular/router';
import { interval, Subscription, Subject } from 'rxjs';
import { switchMap, startWith, takeUntil } from 'rxjs/operators';
import {
  AdminRegistrationService,
  RegistrationRecord
} from '../services/admin-registration.service';
import { AdminSearchService } from '../services/admin-search.service';

@Component({
  selector:    'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls:   ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

  loading = true;
  error   = '';

  // ── Stats ─────────────────────────────────────────────────────────────
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

  // ── Raw slices (unfiltered) ───────────────────────────────────────────
  private _recentRegistrations: RegistrationRecord[] = [];
  private _liveSubmissions:     RegistrationRecord[] = [];
  private _topScorers:          RegistrationRecord[] = [];

  // ── Filtered slices (bound in template) ──────────────────────────────
  recentRegistrations: RegistrationRecord[] = [];
  liveSubmissions:     RegistrationRecord[] = [];
  topScorers:          RegistrationRecord[] = [];

  // ── Local filter state ────────────────────────────────────────────────
  localSearch      = '';
  localStatus      = 'all';
  localCategory    = 'all';
  localDateFrom    = '';
  localDateTo      = '';
  filterPanelOpen  = false;

  private allRecords:  RegistrationRecord[] = [];
  private pollSub?:    Subscription;
  private destroy$   = new Subject<void>();
  private readonly POLL_INTERVAL = 15_000;

  constructor(
    private adminService:  AdminRegistrationService,
    private searchService: AdminSearchService,
    private router:        Router,
  ) {}

  ngOnInit(): void {
    this.startPolling();

    // Also react to global topbar search/filters
    this.searchService.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Poll ──────────────────────────────────────────────────────────────
  private startPolling(): void {
    this.pollSub = interval(this.POLL_INTERVAL)
      .pipe(
        startWith(0),
        switchMap(() => this.adminService.getAll())
      )
      .subscribe({
        next: data => {
          this.allRecords = data;
          this.processData(data);
          this.applyFilters();
          this.loading = false;
          this.error   = '';
        },
        error: err => {
          this.error   = err.message || 'Could not load dashboard data.';
          this.loading = false;
        },
      });
  }

  // ── Compute stats + raw slices ────────────────────────────────────────
  private processData(records: RegistrationRecord[]): void {
    if (!Array.isArray(records)) return;

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
      avgScore:           withScore.length ? Math.round(totalScore / withScore.length) : 0,
    };

    const byDate = [...records].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    // Store raw (pre-filter) slices — show top 10 so filters have room to work
    this._recentRegistrations = byDate.slice(0, 10);
    this._liveSubmissions     = byDate.filter(r => r.assessmentPercentage != null).slice(0, 10);
    this._topScorers          = [...withScore]
      .sort((a, b) => (b.assessmentPercentage ?? 0) - (a.assessmentPercentage ?? 0))
      .slice(0, 10);
  }

  // ── Apply filters to all three tables ────────────────────────────────
  applyFilters(): void {
    // Merge global service filters with local dashboard filters
    const global = this.searchService.snapshot;

    // Combined search term: local takes priority if typed, else use global
    const term = (this.localSearch || global.search || '').toLowerCase().trim();
    const status   = this.localStatus   !== 'all' ? this.localStatus   : global.status;
    const category = this.localCategory !== 'all' ? this.localCategory : global.cohort;
    const dateFrom = this.localDateFrom || global.dateFrom;
    const dateTo   = this.localDateTo   || global.dateTo;

    const filter = (list: RegistrationRecord[]) =>
      list.filter(r => {
        if (term && ![r.fullName, r.email, r.phone, r.registrationId, r.category]
              .join(' ').toLowerCase().includes(term)) return false;
        if (status   !== 'all' && r.status   !== status)   return false;
        if (category !== 'all' && r.category !== category) return false;
        if (dateFrom && r.submittedAt?.slice(0, 10) < dateFrom) return false;
        if (dateTo   && r.submittedAt?.slice(0, 10) > dateTo)   return false;
        return true;
      }).slice(0, 5); // show top 5 after filtering

    this.recentRegistrations = filter(this._recentRegistrations);
    this.liveSubmissions     = filter(this._liveSubmissions);
    this.topScorers          = filter(this._topScorers);
  }

  // ── Local filter controls ─────────────────────────────────────────────
  onLocalSearch(): void {
    this.applyFilters();
  }

  toggleFilterPanel(): void {
    this.filterPanelOpen = !this.filterPanelOpen;
  }

  applyLocalFilters(): void {
    this.applyFilters();
    this.filterPanelOpen = false;
  }

  resetLocalFilters(): void {
    this.localSearch   = '';
    this.localStatus   = 'all';
    this.localCategory = 'all';
    this.localDateFrom = '';
    this.localDateTo   = '';
    this.applyFilters();
    this.filterPanelOpen = false;
  }

  get hasLocalFilters(): boolean {
    return this.localSearch !== '' || this.localStatus !== 'all' ||
           this.localCategory !== 'all' || this.localDateFrom !== '' || this.localDateTo !== '';
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