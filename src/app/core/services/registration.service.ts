import { Injectable }                               from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError }                   from 'rxjs';
import { catchError, tap }                          from 'rxjs/operators';
import { environment }                              from '../../../environments/environment';

export interface RegistrationResponse {
  success:  boolean;
  message:  string;
  data?: {
    registrationId: string;
    email:          string;
    status:         string;
    submittedAt?:   string;
  };
}

@Injectable({ providedIn: 'root' })
export class RegistrationService {

  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');
  private readonly apiUrl  = `${this.baseUrl}/api/registration`;
  private readonly authUrl = `${this.baseUrl}/api/auth`;

  /**
   * Centralized headers (JWT only + ngrok bypass)
   */
  private get baseHeaders(): HttpHeaders {
    const token = localStorage.getItem('celcium_token')
               || localStorage.getItem('studentToken');

    const headers: Record<string, string> = {
      'ngrok-skip-browser-warning': 'true',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new HttpHeaders(headers);
  }

  constructor(private http: HttpClient) {
    console.log('[RegistrationService] Initialized:', this.apiUrl);
  }

  // ═══════════════════════════════════════════════════════════════
  //  REGISTER STUDENT (FormData)
  // ═══════════════════════════════════════════════════════════════
  submitRegistration(payload: FormData): Observable<RegistrationResponse> {
    const url = `${this.apiUrl}/submit`;

    return this.http.post<RegistrationResponse>(url, payload, {
      headers: this.baseHeaders
    }).pipe(
      tap(res => {
        if (res?.data?.registrationId) {
          localStorage.setItem('studentId', res.data.registrationId);
        }
      }),
      catchError(this.handleError)
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOGIN
  // ═══════════════════════════════════════════════════════════════
  login(data: { email: string; password: string }): Observable<any> {
    const url = `${this.authUrl}/student-login`;

    return this.http.post(url, data, {
      headers: this.baseHeaders.set('Content-Type', 'application/json')
    }).pipe(
      tap((res: any) => {
        if (res?.token) {
          localStorage.setItem('celcium_token', res.token);
        }

        if (res?.student?.registrationId) {
          localStorage.setItem('studentId', res.student.registrationId);
          localStorage.setItem('studentProfile', JSON.stringify(res.student));
        }

        if (res?.data?.registrationId) {
          localStorage.setItem('studentId', res.data.registrationId);
          localStorage.setItem('studentProfile', JSON.stringify(res.data));
        }
      }),
      catchError(this.handleError)
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  GET STUDENT
  // ═══════════════════════════════════════════════════════════════
  getStudent(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`, {
      headers: this.baseHeaders
    }).pipe(
      catchError(this.handleError)
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  SUBMIT ASSIGNMENT
  // ═══════════════════════════════════════════════════════════════
  submitAssignment(studentId: string, weekId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/submit-assignment`,
      { studentId, weekId },
      {
        headers: this.baseHeaders.set('Content-Type', 'application/json')
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  UPDATE PROFILE
  // ═══════════════════════════════════════════════════════════════
  updateProfile(id: string, data: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/update/${id}`,
      data,
      {
        headers: this.baseHeaders.set('Content-Type', 'application/json')
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  ERROR HANDLER
  // ═══════════════════════════════════════════════════════════════
  private handleError(err: HttpErrorResponse): Observable<never> {
    console.error('[RegistrationService] Error:', {
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
        409: 'Already exists.',
        413: 'File too large.',
        422: 'Validation error.',
        500: 'Server error.',
      };

      message = map[err.status] ?? message;
    }

    return throwError(() => new Error(message));
  }
}