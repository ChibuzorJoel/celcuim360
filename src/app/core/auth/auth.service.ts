// src/app/core/auth/auth.service.ts

import { Injectable }              from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router }                  from '@angular/router';
import { Observable, throwError }  from 'rxjs';
import { tap, catchError }         from 'rxjs/operators';
import { environment }             from '../../../environments/environment';

/**
 * Centralised token key constants.
 * Every service in the app MUST use these — never hard-code the strings.
 */
export const TOKEN_KEYS = {
  admin:   'celcium_admin_token', // read by AdminRegistrationService
  student: 'celcium_token',       // read by RegistrationService & AuthStudentService
} as const;

export const USER_KEY = 'celcium_user';

export interface LoginResponse {
  token: string;
  user?: {
    id:        string;
    name?:     string;
    fullName?: string;
    email:     string;
    role:      'admin' | 'student';
  };
  student?: {
    id?:             string;
    registrationId?: string;
    fullName:        string;
    email:           string;
    status:          string;
    category:        string;
  };
  admin?: {
    email: string;
    role:  string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly baseUrl = (environment.apiUrl || '').replace(/\/$/, '');

  constructor(
    private http:   HttpClient,
    private router: Router,
  ) {}

  // ── Shared headers (no token — used for login calls) ─────────────────────

  private get baseHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type':               'application/json',
      'ngrok-skip-browser-warning': 'true',
    });
  }

  // =========================================================
  //  GENERIC login() ALIAS
  //  login.component.ts calls this.auth.login(email, password).
  //  For the admin login page this delegates to loginAdmin().
  //  If you use this same component for students, swap the call
  //  to loginStudent() or add role detection logic here.
  // =========================================================
  login(email: string, password: string): Observable<LoginResponse> {
    return this.loginAdmin(email, password);
  }

  // =========================================================
  //  ADMIN LOGIN  →  POST /api/auth/admin-login
  //  Token stored under TOKEN_KEYS.admin ('celcium_admin_token')
  // =========================================================
  loginAdmin(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.baseUrl}/api/auth/admin-login`,
      { email, password },
      { headers: this.baseHeaders }
    ).pipe(
      tap(res => {
        if (res?.token) {
          localStorage.setItem(TOKEN_KEYS.admin, res.token);
        }
      }),
      catchError(err => {
        const message: string = err?.error?.message || 'Admin login failed.';
        return throwError(() => new Error(message));
      })
    );
  }

  // =========================================================
  //  GENERIC login() ALIAS
  //  login.component.ts calls this.auth.login() — delegates to loginAdmin().
  //  Swap to loginStudent() if this component is used for students.
  // =========================================================
  
  // =========================================================
  //  STUDENT LOGIN  →  POST /api/auth/student-login
  //  Token stored under TOKEN_KEYS.student ('celcium_token')
  // =========================================================
  loginStudent(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.baseUrl}/api/auth/student-login`,
      { email, password },
      { headers: this.baseHeaders }
    ).pipe(
      tap(res => {
        if (res?.token) {
          localStorage.setItem(TOKEN_KEYS.student, res.token);
        }
        const profile = res?.student ?? res?.user;
        if (profile) {
          const id = (profile as any).registrationId ?? profile.id;
          if (id) localStorage.setItem('studentId', id);
          localStorage.setItem(USER_KEY, JSON.stringify({
            id,
            name:  (profile as any).fullName ?? (profile as any).name,
            email: profile.email,
            role:  'student',
          }));
          localStorage.setItem('studentProfile', JSON.stringify(profile));
        }
      }),
      catchError(err => {
        const message: string = err?.error?.message || 'Invalid email or password.';
        return throwError(() => new Error(message));
      })
    );
  }

  // ── Token accessors ───────────────────────────────────────────────────────

  getStudentToken(): string | null { return localStorage.getItem(TOKEN_KEYS.student); }
  getAdminToken(): string | null   { return localStorage.getItem(TOKEN_KEYS.admin); }

  /** Generic — kept for AuthGuard backwards-compat */
  getToken(): string | null {
    return this.getAdminToken() ?? this.getStudentToken();
  }

  // ── User profile ──────────────────────────────────────────────────────────

  getCurrentUser(): { id: string; name: string; email: string; role: string } | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  // ── Session checks ────────────────────────────────────────────────────────

  isLoggedIn(): boolean        { return !!this.getToken(); }
  isStudentLoggedIn(): boolean { return !!this.getStudentToken(); }
  isAdminLoggedIn(): boolean   { return !!this.getAdminToken(); }
  isAdmin(): boolean           { return this.getCurrentUser()?.role === 'admin'; }

  // ── Logout ────────────────────────────────────────────────────────────────

  logoutStudent(): void {
    localStorage.removeItem(TOKEN_KEYS.student);
    localStorage.removeItem('studentId');
    localStorage.removeItem('studentProfile');
    localStorage.removeItem(USER_KEY);
    this.router.navigate(['/student-login']);
  }

  logoutAdmin(): void {
    localStorage.removeItem(TOKEN_KEYS.admin);
  }

  /** Clears everything — used by admin panel logout */
  logout(): void {
    this.logoutAdmin();
    this.logoutStudent();
  }

  // ── Password reset ────────────────────────────────────────────────────────

  sendPasswordReset(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/api/auth/forgot-password`,
      { email },
      { headers: this.baseHeaders }
    ).pipe(
      catchError(err => throwError(() => new Error(
        err?.error?.message ?? 'Failed to send reset email.'
      )))
    );
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/api/auth/reset-password`,
      { token, password: newPassword },
      { headers: this.baseHeaders }
    ).pipe(
      catchError(err => throwError(() => new Error(
        err?.error?.message ?? 'Password reset failed. The link may have expired.'
      )))
    );
  }
}