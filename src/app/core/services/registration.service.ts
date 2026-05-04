// src/app/core/services/registration.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
    submittedAt: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

  // Matches server.js: app.use('/api/registration', ...)
  private readonly apiUrl = `${environment.apiUrl}/api/registration`;

  constructor(private http: HttpClient) {}

  submitRegistration(payload: FormData): Observable<RegistrationResponse> {
    console.log('[RegistrationService] POST →', `${this.apiUrl}/submit`);
    return this.http
      .post<RegistrationResponse>(`${this.apiUrl}/submit`, payload)
      .pipe(
        tap(res => console.log('[RegistrationService] Success:', res)),
        catchError(this.handleError)
      );
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    // Always log the raw error so you can see it in browser DevTools
    console.error('[RegistrationService] HTTP Error:', {
      status: err.status,
      statusText: err.statusText,
      url: err.url,
      error: err.error
    });

    let message: string;
    if (err.status === 0) {
      message = `Cannot connect to server at ${err.url}. Make sure your Node.js server is running on port ${environment.apiUrl.split(':').pop()}.`;
    } else if (err.status === 409) {
      message = err.error?.message ?? 'This email is already registered. Please use a different email.';
    } else if (err.status === 413) {
      message = 'File too large. Each file must be under 5MB.';
    } else if (err.status === 422) {
      const errors = err.error?.errors;
      message = errors?.length ? errors[0] : (err.error?.message ?? 'Validation failed. Please check your inputs.');
    } else if (err.status === 500) {
      message = err.error?.message ?? 'Server error. Please try again or contact support.';
    } else {
      message = err.error?.message ?? `Error ${err.status}: ${err.statusText}`;
    }

    return throwError(() => new Error(message));
  }
}