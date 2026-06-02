// src/app/core/auth/auth-student.service.ts
//
// Thin wrapper around AuthService — keeps backwards-compat for any component
// already injecting AuthStudentService.  Zero logic lives here; everything
// delegates to AuthService so there is exactly ONE source of truth.
//
// IMPORTANT: this file must NOT import anything from auth.service.ts that
// creates a circular reference.  It imports AuthService (a class value) which
// is fine — Angular's DI resolves it at runtime.

import { Injectable }           from '@angular/core';
import { Observable }           from 'rxjs';
import { AuthService } from './auth/auth.service';          
import type { LoginResponse }   from './auth/auth.service'; 

export type { LoginResponse };

@Injectable({ providedIn: 'root' })
export class AuthStudentService {

  // AuthService is injected by Angular DI — no circular import issue because
  // we are importing the CLASS (a value), not re-exporting it.
  constructor(private auth: AuthService) {}

  // ── Login ─────────────────────────────────────────────────────────────────
  login(email: string, password: string): Observable<LoginResponse> {
    return this.auth.loginStudent(email, password);
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  logout(): void {
    this.auth.logoutStudent(); // clears token + profile + navigates to /student-login
  }

  // ── Session ───────────────────────────────────────────────────────────────
  isLoggedIn(): boolean  { return this.auth.isStudentLoggedIn(); }
  getToken(): string | null { return this.auth.getStudentToken(); }
  getCurrentUser()       { return this.auth.getCurrentUser(); }
  isAdmin(): boolean     { return this.auth.isAdmin(); }

  // ── Password reset ────────────────────────────────────────────────────────
  sendPasswordReset(email: string): Observable<{ message: string }> {
    return this.auth.sendPasswordReset(email);
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.auth.resetPassword(token, newPassword);
  }
}