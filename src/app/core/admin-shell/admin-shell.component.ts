import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ContactService } from '../services/contact.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-admin-shell',
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.css'],
})
export class AdminShellComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  pageTitle = 'Dashboard';
  globalSearch = '';

  pendingCount = 4;
  unreadCount = 7;
  unverifiedPayments = 2;

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
    private router: Router,
    private auth: AuthService,
    private contactService: ContactService
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
    // Pull live counts from service — replace with real observables as needed
    this.contactService.getRegistrations().subscribe(list => {
      this.pendingCount = list.filter((r: any) => r.status === 'pending').length;
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