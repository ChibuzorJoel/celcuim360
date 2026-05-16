// src/app/core/services/registration.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface RegistrationResponse {
  success: boolean;
  message: string;
  data?: {
    registrationId: string;
    email:          string;
    status:         string;
    submittedAt:    string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

  private readonly apiUrl  = `${environment.apiUrl}/api/registration`;
  private readonly authUrl = `${environment.apiUrl}/api/auth`;

  // Only send ngrok header in development (ngrok tunnel is not used in production)
  private readonly baseHeaders = new HttpHeaders(
    environment.production ? {} : { 'ngrok-skip-browser-warning': 'true' }
  );

  constructor(private http: HttpClient) {}

  // ── 1. Submit registration ─────────────────────────────────────────────
  submitRegistration(payload: FormData): Observable<RegistrationResponse> {
    const url = `${this.apiUrl}/submit`;
    console.log('[RegistrationService] POST →', url);

    // Do NOT set Content-Type for FormData — browser sets it with boundary.
    return this.http
      .post<RegistrationResponse>(url, payload, {
        headers: this.baseHeaders
      })
      .pipe(
        tap(res => {
          console.log('[RegistrationService] Success:', res);
          if (res?.data?.registrationId) {
            localStorage.setItem('studentId', res.data.registrationId);
          }
        }),
        catchError(this.handleError)
      );
  }

  // ── 2. Student login ───────────────────────────────────────────────────
  login(data: { email: string; password: string }): Observable<any> {
    const url = `${this.authUrl}/login`;
    console.log('[RegistrationService] POST →', url);

    return this.http
      .post(url, data, {
        headers: this.baseHeaders.set('Content-Type', 'application/json')
      })
      .pipe(
        tap((res: any) => {
          if (res?.token) {
            localStorage.setItem('studentToken',   res.token);
            localStorage.setItem('studentId',      res.student?.registrationId ?? '');
            localStorage.setItem('studentProfile', JSON.stringify(res.student));
          }
        }),
        catchError(this.handleError)
      );
  }

  // ── 3. Get student data ────────────────────────────────────────────────
  getStudent(id: string): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`, { headers: this.baseHeaders })
      .pipe(
        tap(res => console.log('[RegistrationService] Student loaded:', res)),
        catchError(this.handleError)
      );
  }

  // ── 4. Submit assignment ───────────────────────────────────────────────
  submitAssignment(studentId: string, weekId: number): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/submit-assignment`, { studentId, weekId }, {
        headers: this.baseHeaders.set('Content-Type', 'application/json')
      })
      .pipe(
        tap(res => console.log('[RegistrationService] Assignment submitted:', res)),
        catchError(this.handleError)
      );
  }

  // ── 5. Update profile ──────────────────────────────────────────────────
  updateProfile(id: string, data: any): Observable<any> {
    return this.http
      .put(`${this.apiUrl}/update/${id}`, data, {
        headers: this.baseHeaders.set('Content-Type', 'application/json')
      })
      .pipe(
        tap(res => console.log('[RegistrationService] Profile updated:', res)),
        catchError(this.handleError)
      );
  }

  // ── Error handler ──────────────────────────────────────────────────────
  private handleError(err: HttpErrorResponse): Observable<never> {
    console.error('[RegistrationService] HTTP Error:', {
      status:     err.status,
      statusText: err.statusText,
      url:        err.url,
      error:      err.error
    });

    let message: string;
    switch (err.status) {
      case 0:
        message = 'Cannot connect to server. Please check your internet connection and try again.';
        break;
      case 400:
        message = err.error?.message ?? 'Bad request. Please check your input.';
        break;
      case 401:
        message = err.error?.message ?? 'Unauthorized. Please log in again.';
        break;
      case 403:
        message = err.error?.message ?? 'Access denied.';
        break;
      case 404:
        message = err.error?.message ?? 'Resource not found.';
        break;
      case 409:
        message = err.error?.message ?? 'This email is already registered.';
        break;
      case 413:
        message = 'File too large. Maximum size is 5MB.';
        break;
      case 422:
        const errors = err.error?.errors;
        message = errors?.length ? errors[0] : (err.error?.message ?? 'Validation failed.');
        break;
      case 500:
        message = err.error?.message ?? 'Server error. Please try again later.';
        break;
      default:
        message = err.error?.message ?? `Error ${err.status}: ${err.statusText}`;
    }
    return throwError(() => new Error(message));
  }
}