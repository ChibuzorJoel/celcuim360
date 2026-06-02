import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AdminRegistrationService } from '../services/admin-registration.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-admin-shell',
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.css'],
})
export class AdminShellComponent implements OnInit, OnDestroy {
  sidebarCollapsed  = false;
  pageTitle         = 'Dashboard';
  globalSearch      = '';

  // ── Live badge counts ─────────────────────────────────────────────────────
  pendingCount         = 0;
  unreadCount          = 0;
  unverifiedPayments   = 0;
  approvedCount        = 0;
  rejectedCount        = 0;
  totalCount           = 0;

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
  ) {}

  ngOnInit(): void {
    this.updateTitle(this.router.url);

    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.updateTitle(e.urlAfterRedirects));

    this.loadBadgeCounts();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
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

        // unverifiedPayments — registrations pending that have a paymentProof file
        this.unverifiedPayments = list.filter(
          r => r.status === 'pending' && !!r.files?.paymentProof
        ).length;

        // unreadCount — pending registrations with no paymentProof yet
        this.unreadCount = list.filter(
          r => r.status === 'pending' && !r.files?.paymentProof
        ).length;
      },
      error: (err: Error) => {
        console.warn('[AdminShell] Badge count load failed:', err.message);
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onGlobalSearch(): void {
    // Broadcast search term via a shared service if needed
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}