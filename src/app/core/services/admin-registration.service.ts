// src/app/core/services/admin-registration.service.ts

import { Injectable }                                 from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError }                     from 'rxjs';
import { map, catchError, tap }                       from 'rxjs/operators';
import { environment }                                from '../../../environments/environment';

export interface RegistrationRecord {
  registrationId:        string;
  fullName:              string;
  email:                 string;
  phone:                 string;
  category:              string;
  status:                'pending' | 'approved' | 'rejected';
  submittedAt:           string;
  rejectionReason?:      string;
  assessmentScore?:      number;
  assessmentTotal?:      number;
  assessmentPercentage?: number;
  assessmentLevel?:      string;
  files?: {
    photo?:        string;
    statement?:    string;
    callUpLetter?: string;
    paymentProof?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AdminRegistrationService {

  private adminApi = `${environment.apiUrl}/api/admin/registrations`;

  constructor(private http: HttpClient) {}

  // ── Reads the admin token — checks every key your app might use ──────────
  private get adminToken(): string | null {
    // Your admin login (auth.routes.js) returns { token, admin }
    // Whatever key your admin login component passes to localStorage.setItem()
    // must appear in this list. 'celcium_admin_token' is the canonical key
    // we enforce in auth.service.ts below — keep that in sync.
    return (
      localStorage.getItem('celcium_admin_token') ||  // ← canonical (set by auth.service)
      localStorage.getItem('adminToken')           ||
      localStorage.getItem('admin_token')          ||
      localStorage.getItem('celcium_token')        ||
      localStorage.getItem('token')                ||
      null
    );
  }

  private get authHeaders(): HttpHeaders {
    const token = this.adminToken;

    if (!token) {
      console.warn(
        '[AdminService] ⚠️ No admin token found in localStorage.\n' +
        'Keys present:', Object.keys(localStorage)
      );
    }

    return new HttpHeaders({
      'Content-Type':               'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  // =========================================================
  //  GET ALL REGISTRATIONS
  // =========================================================
  getAll(): Observable<RegistrationRecord[]> {
    return this.http.get<any>(this.adminApi, { headers: this.authHeaders }).pipe(
      tap(res => console.log('[AdminService] RAW RESPONSE:', res)),
      map(res => {
        const data = Array.isArray(res) ? res : (res?.data ?? res?.registrations ?? []);
        return Array.isArray(data) ? data : [];
      }),
      catchError(this.handleError)
    );
  }

  // =========================================================
  //  UPDATE STATUS
  // =========================================================
  updateStatus(id: string, payload: any): Observable<any> {
    return this.http.patch(
      `${this.adminApi}/${id}/status`,
      payload,
      { headers: this.authHeaders }
    ).pipe(
      tap(res => console.log('[AdminService] Status updated:', res)),
      catchError(this.handleError)
    );
  }

  // =========================================================
  //  DELETE REGISTRATION
  // =========================================================
  delete(id: string): Observable<any> {
    return this.http.delete(
      `${this.adminApi}/${id}`,
      { headers: this.authHeaders }
    ).pipe(
      tap(res => console.log('[AdminService] Deleted:', res)),
      catchError(this.handleError)
    );
  }

  // =========================================================
  //  ERROR HANDLER
  // =========================================================
  private handleError(err: HttpErrorResponse): Observable<never> {
    console.error('[AdminService ERROR]:', {
      status:  err.status,
      message: err.message,
      error:   err.error,
      url:     err.url,
    });

    let message = 'Something went wrong.';
    if      (err.status === 0)   message = 'Cannot connect to server.';
    else if (err.status === 401) message = 'Not authenticated — please log in as admin.';
    else if (err.status === 403) message = 'Access denied — token lacks admin role.';
    else if (err.status === 404) message = 'API route not found.';
    else if (err.status === 500) message = err.error?.message || 'Internal server error.';
    else                         message = err.error?.message || message;

    return throwError(() => new Error(message));
  }
}