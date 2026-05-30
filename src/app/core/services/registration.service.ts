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
    email: string;
    status: string;
    submittedAt?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

  // Clean base URL - remove trailing slash if present
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');

  private readonly apiUrl = `${this.baseUrl}/api/registration`;
  private readonly authUrl = `${this.baseUrl}/api/auth`;

  private readonly baseHeaders = new HttpHeaders(
    environment.production 
      ? {} 
      : { 'ngrok-skip-browser-warning': 'true' }
  );

  constructor(private http: HttpClient) {
    console.log('[RegistrationService] Initialized with API URL:', this.apiUrl);
  }

  // ── Submit Registration ─────────────────────────────────────────────
  submitRegistration(payload: FormData): Observable<RegistrationResponse> {
    const url = `${this.apiUrl}/submit`;
    console.log('[RegistrationService] POST →', url);

    return this.http
      .post<RegistrationResponse>(url, payload, {
        headers: this.baseHeaders,
        withCredentials: true   // Important for CORS with credentials
      })
      .pipe(
        tap(res => {
          console.log('[RegistrationService] Registration Success:', res);
          if (res?.data?.registrationId) {
            localStorage.setItem('studentId', res.data.registrationId);
          }
        }),
        catchError(this.handleError)
      );
  }

  // ── Student Login ───────────────────────────────────────────────────
  login(data: { email: string; password: string }): Observable<any> {
    const url = `${this.authUrl}/login`;
    console.log('[RegistrationService] Login →', url);

    return this.http
      .post(url, data, {
        headers: this.baseHeaders.set('Content-Type', 'application/json'),
        withCredentials: true
      })
      .pipe(
        tap((res: any) => {
          console.log('[RegistrationService] Login Success:', res);
          if (res?.token) {
            localStorage.setItem('studentToken', res.token);
            localStorage.setItem('studentId', res.student?.registrationId ?? '');
            localStorage.setItem('studentProfile', JSON.stringify(res.student || {}));
          }
        }),
        catchError(this.handleError)
      );
  }

  // ── Get Student by ID ───────────────────────────────────────────────
  getStudent(id: string): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`, { 
        headers: this.baseHeaders,
        withCredentials: true 
      })
      .pipe(
        tap(res => console.log('[RegistrationService] Student data loaded:', res)),
        catchError(this.handleError)
      );
  }

  // ── Submit Assignment ───────────────────────────────────────────────
  submitAssignment(studentId: string, weekId: number): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/submit-assignment`, { studentId, weekId }, {
        headers: this.baseHeaders.set('Content-Type', 'application/json'),
        withCredentials: true
      })
      .pipe(catchError(this.handleError));
  }

  // ── Update Profile ──────────────────────────────────────────────────
  updateProfile(id: string, data: any): Observable<any> {
    return this.http
      .put(`${this.apiUrl}/update/${id}`, data, {
        headers: this.baseHeaders.set('Content-Type', 'application/json'),
        withCredentials: true
      })
      .pipe(catchError(this.handleError));
  }

  // ── Error Handler ───────────────────────────────────────────────────
  private handleError(err: HttpErrorResponse): Observable<never> {
    console.error('[RegistrationService] HTTP Error Details:', {
      status: err.status,
      url: err.url,
      error: err.error
    });

    let message = 'An unexpected error occurred. Please try again.';

    if (err.status === 0) {
      message = 'Cannot connect to server. Please check your internet connection.';
    } else if (err.error?.message) {
      message = err.error.message;
    } else {
      switch (err.status) {
        case 400: message = 'Invalid input. Please check your data.'; break;
        case 401: message = 'Unauthorized. Please check your credentials.'; break;
        case 403: message = 'Access denied. Your account may not be approved yet.'; break;
        case 409: message = 'This email is already registered.'; break;
        case 413: message = 'File is too large. Maximum size is 5MB.'; break;
        case 500: message = 'Server error. Please try again later.'; break;
      }
    }

    return throwError(() => new Error(message));
  }
}