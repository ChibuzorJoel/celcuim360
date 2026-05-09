// src/app/core/services/admin-registration.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface RegistrationRecord {
  registrationId: string;
  fullName: string;
  email: string;
  phone: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  rejectionReason?: string;
  assessmentScore?: number;
  assessmentTotal?: number;
  assessmentPercentage?: number;
  assessmentLevel?: string;
  files?: {
    photo?: string;
    statement?: string;
    callUpLetter?: string;
    paymentProof?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AdminRegistrationService {

  private api = `${environment.apiUrl}/api/registration`;

  constructor(private http: HttpClient) {}

  // =========================================================
  // ✅ GET ALL REGISTRATIONS (SAFE + NORMALIZED)
  // =========================================================
  getAll(): Observable<RegistrationRecord[]> {
    return this.http.get<any>(this.api).pipe(

      tap(res => {
        console.log('[AdminService] RAW RESPONSE:', res);
      }),

      map(res => {
        // 🔥 Handles ALL possible backend formats safely
        const data =
          res?.data ||
          res?.registrations ||
          res ||
          [];

        return Array.isArray(data) ? data : [];
      }),

      catchError(this.handleError)
    );
  }

  // =========================================================
  // ✅ UPDATE STATUS
  // =========================================================
  updateStatus(id: string, payload: any): Observable<any> {
    return this.http.patch(
      `${this.api}/${id}/status`,
      payload
    ).pipe(
      tap(res => console.log('[AdminService] Status Updated:', res)),
      catchError(this.handleError)
    );
  }

  // =========================================================
  // ✅ DELETE REGISTRATION
  // =========================================================
  delete(id: string): Observable<any> {
    return this.http.delete(
      `${this.api}/${id}`
    ).pipe(
      tap(res => console.log('[AdminService] Deleted:', res)),
      catchError(this.handleError)
    );
  }

  // =========================================================
  // ❌ GLOBAL ERROR HANDLER
  // =========================================================
  private handleError(err: HttpErrorResponse) {
    console.error('[AdminService ERROR]:', {
      status: err.status,
      message: err.message,
      error: err.error,
      url: err.url
    });

    let message = 'Something went wrong';

    if (err.status === 0) {
      message = 'Cannot connect to server. Check backend.';
    } 
    else if (err.status === 404) {
      message = 'API route not found.';
    } 
    else if (err.status === 500) {
      message = err.error?.message || 'Server error occurred.';
    } 
    else {
      message = err.error?.message || message;
    }

    return throwError(() => new Error(message));
  }
}