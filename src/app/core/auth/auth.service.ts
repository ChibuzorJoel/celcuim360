import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'app_token';

  /** 🔹 Dummy login method — simulates backend auth */
  login(email: string, password: string): Observable<{ token: string }> {
    const DUMMY_EMAIL = 'admin@example.com';
    const DUMMY_PASSWORD = 'Password123!';

    if (email === DUMMY_EMAIL && password === DUMMY_PASSWORD) {
      const fakeToken = 'fake-jwt-token-123456';
      return of({ token: fakeToken }).pipe(
        tap(() => this.setToken(fakeToken))
      );
    } else {
      return throwError(() => ({ error: { message: 'Invalid credentials' } }));
    }
  }

  /** 🔹 Save token */
  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /** 🔹 Get token */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /** 🔹 Check if logged in */
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  /** 🔹 Logout */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }
}
