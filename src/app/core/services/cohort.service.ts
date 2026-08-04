import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment'; // adjust depth to match your project structure

export interface CalWeek {
  num: number;
  date: string;
  done: boolean;
  current: boolean;
}

export interface Cohort {
  cohortId: string;               // matches backend's `cohortId` field (NOT `id`)
  name: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'forming' | 'closed';
  enrolled: number;
  approved: number;
  pending: number;
  avgScore: number;
  maxStudents: number;
  weeks: CalWeek[];
}

export interface CreateCohortPayload {
  name: string;
  startDate: string;
  maxStudents?: number;
}

export interface UpdateCohortPayload {
  name?: string;
  startDate?: string;
  status?: 'active' | 'forming' | 'closed';
  maxStudents?: number;
}

@Injectable({ providedIn: 'root' })
export class CohortService {

  // Same pattern as RegistrationService: strip any trailing slash from
  // environment.apiUrl (environment.prod.ts has one, environment.ts doesn't)
  // then build the absolute API path. A bare '/api/cohorts' resolves against
  // localhost:4200 (Angular itself) and silently goes nowhere.
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');
  private readonly apiUrl  = `${this.baseUrl}/api/cohorts`;

  constructor(private http: HttpClient) {
    console.log('[CohortService] Initialized:', this.apiUrl);
  }

  private get baseHeaders(): HttpHeaders {
    const token = localStorage.getItem('celcium_token');
    const headers: Record<string, string> = {
      'ngrok-skip-browser-warning': 'true',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return new HttpHeaders(headers);
  }

  getAll(status?: string): Observable<{ cohorts: Cohort[] }> {
    const url = status && status !== 'all' ? `${this.apiUrl}?status=${status}` : this.apiUrl;
    return this.http.get<{ cohorts: Cohort[] }>(url, { headers: this.baseHeaders })
      .pipe(catchError(this.handleError));
  }

  getOne(cohortId: string): Observable<{ cohort: Cohort }> {
    return this.http.get<{ cohort: Cohort }>(`${this.apiUrl}/${cohortId}`, { headers: this.baseHeaders })
      .pipe(catchError(this.handleError));
  }

  create(payload: CreateCohortPayload): Observable<{ message: string; cohort: Cohort }> {
    return this.http.post<{ message: string; cohort: Cohort }>(
      this.apiUrl,
      payload,
      { headers: this.baseHeaders.set('Content-Type', 'application/json') }
    ).pipe(catchError(this.handleError));
  }

  update(cohortId: string, payload: UpdateCohortPayload): Observable<{ message: string; cohort: Cohort }> {
    return this.http.patch<{ message: string; cohort: Cohort }>(
      `${this.apiUrl}/${cohortId}`,
      payload,
      { headers: this.baseHeaders.set('Content-Type', 'application/json') }
    ).pipe(catchError(this.handleError));
  }

  archive(cohortId: string): Observable<{ message: string; cohort: Cohort }> {
    return this.http.patch<{ message: string; cohort: Cohort }>(
      `${this.apiUrl}/${cohortId}/archive`,
      {},
      { headers: this.baseHeaders.set('Content-Type', 'application/json') }
    ).pipe(catchError(this.handleError));
  }

  delete(cohortId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${cohortId}`, { headers: this.baseHeaders })
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    console.error('[CohortService] Error:', {
      status: err.status,
      url: err.url,
      error: err.error,
    });

    let message = 'An unexpected error occurred. Please try again.';

    if (err.status === 0) {
      message = 'Cannot connect to server. Check your internet connection.';
    } else if (err.error?.message) {
      message = err.error.message;
    } else {
      const map: Record<number, string> = {
        400: 'Invalid input.',
        401: 'Unauthorized.',
        403: 'Access denied.',
        404: 'Cohort not found.',
        409: 'A cohort with this ID already exists.',
        500: 'Server error.',
      };
      message = map[err.status] ?? message;
    }

    return throwError(() => new Error(message));
  }
}