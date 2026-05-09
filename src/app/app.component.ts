// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators'; 

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  title = 'Logistic';
  showPublicNav = true;

  // Routes that should hide the public header
  private readonly adminRoutes = ['/admin', '/login', '/student-login'];

  constructor(private router: Router) {
    // ── Run immediately on app load / page refresh ──────────────────────────
    // NavigationEnd hasn't fired yet when the app boots, so we check
    // window.location.pathname directly in the constructor.
    this.applyNavVisibility(window.location.pathname);
  }

  ngOnInit(): void {
    // ── React to every navigation after boot ────────────────────────────────
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.applyNavVisibility(e.urlAfterRedirects ?? '');
      });
  }

  private applyNavVisibility(url: string): void {
    const isAdmin = this.adminRoutes.some(r => url.startsWith(r));

    // Toggle public header
    this.showPublicNav = !isAdmin;

    // Add/remove body class so CSS can also react
    if (isAdmin) {
      document.body.classList.add('admin-mode');
    } else {
      document.body.classList.remove('admin-mode');
    }
  }
}