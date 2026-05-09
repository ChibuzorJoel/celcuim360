import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

declare var bootstrap: any;

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {

  private bsCollapse: any;
  accountMenuOpen = false;

  private routerSub!: Subscription;

  constructor(
    private router: Router,
    private elRef:  ElementRef,
  ) {}

  ngOnInit(): void {
    // ── Bootstrap navbar collapse ──────────────────────────────────────────
    const navbarEl = document.getElementById('navbarCollapse');
    if (navbarEl) {
      this.bsCollapse = new bootstrap.Collapse(navbarEl, { toggle: false });
    }

    // ── Bootstrap dropdowns (any other .dropdown-toggle in the template) ───
    const dropdownElList = Array.from(
      document.querySelectorAll('.dropdown-toggle')
    );
    dropdownElList.forEach((el: any) => new bootstrap.Dropdown(el));

    // ── Close account menu on route change ─────────────────────────────────
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.accountMenuOpen = false;
        this.closeMobileMenu();
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  // ── Mobile hamburger ───────────────────────────────────────────────────────

  toggleMobileMenu(): void {
    if (this.bsCollapse) {
      this.bsCollapse.toggle();
    }
  }

  closeMobileMenu(): void {
    if (this.bsCollapse) {
      this.bsCollapse.hide();
    }
    this.accountMenuOpen = false;
  }

  // ── Account dropdown ───────────────────────────────────────────────────────

  toggleAccountMenu(event: Event): void {
    event.stopPropagation();          // prevent document:click from closing it instantly
    this.accountMenuOpen = !this.accountMenuOpen;
  }

  closeAccountMenu(): void {
    this.accountMenuOpen = false;
  }

  // Close when clicking outside the entire header component
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.accountMenuOpen = false;
    }
  }

  // Close on Escape key
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.accountMenuOpen = false;
  }
}