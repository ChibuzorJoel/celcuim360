import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AdminRegistrationService } from '../services/admin-registration.service';
import { AdminSearchService } from '../services/admin-search.service';
import { Subject, Subscription } from 'rxjs';
import { filter, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-shell',
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.css'],
})
export class AdminShellComponent implements OnInit, OnDestroy {
  sidebarCollapsed  = false;
  pageTitle         = 'Dashboard';
  globalSearch      = '';
  filterPanelOpen   = false;

  // filter state (mirrors the service — used for the topbar panel UI)
  filterStatus   = 'all';
  filterDateFrom = '';
  filterDateTo   = '';
  filterCohort   = 'all';
  availableCohorts: string[] = [];

  // badge counts
  pendingCount       = 0;
  unreadCount        = 0;
  unverifiedPayments = 0;
  approvedCount      = 0;
  rejectedCount      = 0;
  totalCount         = 0;

  hasActiveFilters   = false;

  private searchInput$ = new Subject<string>();
  private destroy$     = new Subject<void>();
  private routerSub!: Subscription;

  private readonly titleMap: Record<string, string> = {
    '/admin/dashboard':    'Dashboard',
    '/admin/registration': 'Registration',
    '/admin/contact':      'Contact Forms',
    '/admin/assessment':   'Assessment',
    '/admin/cohorts':      'Cohorts',
    '/admin/analytics':    'Analytics',
    '/admin/payments':     'Payments',
  };

  constructor(
    private router:        Router,
    private auth:          AuthService,
    private adminService:  AdminRegistrationService,
    public  searchService: AdminSearchService,
  ) {}

  ngOnInit(): void {
    this.updateTitle(this.router.url);

    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.updateTitle(e.urlAfterRedirects);
        this.filterPanelOpen = false; // close panel on navigation
      });

    // Debounce the search input so we don't spam on every keystroke
    this.searchInput$
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => this.searchService.setSearch(term));

    // Track whether any filter is active (for the badge on the filter button)
    this.searchService.hasActiveFilters$
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => this.hasActiveFilters = v);

    this.loadBadgeCounts();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateTitle(url: string): void {
    const base = url.split('?')[0];
    this.pageTitle = this.titleMap[base] ?? 'Admin';
  }

  private loadBadgeCounts(): void {
    this.adminService.getAll().subscribe({
      next: list => {
        this.totalCount        = list.length;
        this.pendingCount      = list.filter(r => r.status === 'pending').length;
        this.approvedCount     = list.filter(r => r.status === 'approved').length;
        this.rejectedCount     = list.filter(r => r.status === 'rejected').length;
        this.unverifiedPayments = list.filter(
          r => r.status === 'pending' && !!r.files?.paymentProof
        ).length;
        this.unreadCount = list.filter(
          r => r.status === 'pending' && !r.files?.paymentProof
        ).length;

        // collect unique cohort names for the filter dropdown
        const cohorts = new Set<string>();
        list.forEach(r => { if (r.category) cohorts.add(r.category); });
        this.availableCohorts = Array.from(cohorts).sort();
      },
      error: (err: Error) => console.warn('[AdminShell] Badge count load failed:', err.message),
    });
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  onSearchInput(): void {
    this.searchInput$.next(this.globalSearch);
  }

  clearSearch(): void {
    this.globalSearch = '';
    this.searchInput$.next('');
  }

  // ── Filter panel ─────────────────────────────────────────────────────────────

  toggleFilterPanel(): void {
    this.filterPanelOpen = !this.filterPanelOpen;
  }

  applyFilters(): void {
    this.searchService.setStatus(this.filterStatus);
    this.searchService.setDateRange(this.filterDateFrom, this.filterDateTo);
    this.searchService.setCohort(this.filterCohort);
    this.filterPanelOpen = false;
  }

  resetFilters(): void {
    this.filterStatus   = 'all';
    this.filterDateFrom = '';
    this.filterDateTo   = '';
    this.filterCohort   = 'all';
    this.globalSearch   = '';
    this.searchService.reset();
    this.filterPanelOpen = false;
  }

  // Close filter panel when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.filterPanelOpen && !target.closest('.filter-panel-wrap')) {
      this.filterPanelOpen = false;
    }
  }

  // ── Misc ────────────────────────────────────────────────────────────────────

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}