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

  // ✅ Base API URL
  private readonly apiUrl = `${environment.apiUrl}/api/registration`;

  constructor(private http: HttpClient) {}

  // =========================================================
  // ✅ 1. SUBMIT REGISTRATION (EXISTING)
  // =========================================================
  submitRegistration(payload: FormData): Observable<RegistrationResponse> {
    console.log('[RegistrationService] POST →', `${this.apiUrl}/submit`);

    return this.http
      .post<RegistrationResponse>(`${this.apiUrl}/submit`, payload)
      .pipe(
        tap(res => {
          console.log('[RegistrationService] Success:', res);

          // ✅ Save ID for dashboard usage
          if (res?.data?.registrationId) {
            localStorage.setItem('studentId', res.data.registrationId);
          }
        }),
        catchError(this.handleError)
      );
  }
  login(data: any) {
    return this.http.post(`${this.apiUrl}/login`, data);
  }
  // =========================================================
  // ✅ 2. GET STUDENT DATA (FOR DASHBOARD)
  // =========================================================
  getStudent(id: string): Observable<any> {
    console.log('[RegistrationService] GET →', `${this.apiUrl}/student/${id}`);

    return this.http
      .get(`${this.apiUrl}/student/${id}`)
      .pipe(
        tap(res => console.log('[RegistrationService] Student Loaded:', res)),
        catchError(this.handleError)
      );
  }

  // =========================================================
  // ✅ 3. SUBMIT ASSIGNMENT
  // =========================================================
  submitAssignment(studentId: string, weekId: number): Observable<any> {
    console.log('[RegistrationService] POST → submit-assignment');

    return this.http
      .post(`${this.apiUrl}/submit-assignment`, {
        studentId,
        weekId
      })
      .pipe(
        tap(res => console.log('[RegistrationService] Assignment Submitted:', res)),
        catchError(this.handleError)
      );
  }

  // =========================================================
  // ✅ 4. UPDATE PROFILE (OPTIONAL FUTURE FEATURE)
  // =========================================================
  updateProfile(id: string, data: any): Observable<any> {
    return this.http
      .put(`${this.apiUrl}/update/${id}`, data)
      .pipe(
        tap(res => console.log('[RegistrationService] Profile Updated:', res)),
        catchError(this.handleError)
      );
  }

  // =========================================================
  // ❌ ERROR HANDLER (UNCHANGED BUT IMPROVED)
  // =========================================================
  private handleError(err: HttpErrorResponse): Observable<never> {

    console.error('[RegistrationService] HTTP Error:', {
      status: err.status,
      statusText: err.statusText,
      url: err.url,
      error: err.error
    });

    let message: string;

    if (err.status === 0) {
      message = `Cannot connect to server at ${err.url}. Make sure your backend is running.`;
    } 
    else if (err.status === 400) {
      message = err.error?.message ?? 'Bad request. Please check your input.';
    } 
    else if (err.status === 401) {
      message = 'Unauthorized. Please login again.';
    }
    else if (err.status === 404) {
      message = 'Resource not found.';
    } 
    else if (err.status === 409) {
      message = err.error?.message ?? 'Email already exists.';
    } 
    else if (err.status === 413) {
      message = 'File too large (max 5MB).';
    } 
    else if (err.status === 422) {
      const errors = err.error?.errors;
      message = errors?.length
        ? errors[0]
        : (err.error?.message ?? 'Validation failed.');
    } 
    else if (err.status === 500) {
      message = err.error?.message ?? 'Internal server error.';
    } 
    else {
      message = err.error?.message ?? `Error ${err.status}: ${err.statusText}`;
    }

    return throwError(() => new Error(message));
  }
}