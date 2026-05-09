import { Injectable }      from '@angular/core';
import { HttpClient }      from '@angular/common/http';
import { Router }          from '@angular/router';
import { Observable, throwError, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
 
export interface LoginResponse {
  token:   string;
  user: {
    id:    string;
    name:  string;
    email: string;
    role:  'admin' | 'student';
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthStudentService {

 
  // ── Replace with your real API base URL ────────────────────────────────────
  private readonly API = 'http://localhost:5000/api';
 
  // ── Token storage key ──────────────────────────────────────────────────────
  private readonly TOKEN_KEY = 'celcium_token';
  private readonly USER_KEY  = 'celcium_user';
 
  constructor(
    private http:   HttpClient,
    private router: Router,
  ) {}
 
  // ── Login ─────────────────────────────────────────────────────────────────
 
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API}/auth/login`, { email, password }).pipe(
      tap(res => {
        // Persist token and user info
        localStorage.setItem(this.TOKEN_KEY, res.token);
        localStorage.setItem(this.USER_KEY,  JSON.stringify(res.user));
      }),
      catchError(err => {
        const msg = err?.error?.message ?? 'Invalid email or password.';
        return throwError(() => new Error(msg));
      })
    );
  }
 
  // ── Logout ────────────────────────────────────────────────────────────────
 
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.router.navigate(['/student-login']);
  }
 
  // ── Session checks ────────────────────────────────────────────────────────
 
  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }
 
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
 
  getCurrentUser(): { id: string; name: string; email: string; role: string } | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
 
  isAdmin(): boolean {
    return this.getCurrentUser()?.role === 'admin';
  }
 
  // ── Password reset ────────────────────────────────────────────────────────
 
  sendPasswordReset(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API}/auth/forgot-password`, { email }).pipe(
      catchError(err => {
        const msg = err?.error?.message ?? 'Failed to send reset email. Please try again.';
        return throwError(() => new Error(msg));
      })
    );
  }
 
  // Confirm new password with the token from email link
  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API}/auth/reset-password`, {
      token, password: newPassword
    }).pipe(
      catchError(err => {
        const msg = err?.error?.message ?? 'Password reset failed. The link may have expired.';
        return throwError(() => new Error(msg));
      })
    );
  }
}
