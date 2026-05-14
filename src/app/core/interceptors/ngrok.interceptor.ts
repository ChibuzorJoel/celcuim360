// src/app/core/interceptors/ngrok.interceptor.ts
// Adds ngrok-skip-browser-warning header to every outgoing HTTP request.
// Remove or disable this file when you switch to a real domain.

import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class NgrokInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Only add header for your ngrok/API domain — not for external calls
    const modified = req.clone({
      setHeaders: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
    return next.handle(modified);
  }
}


// ── ADD TO app.module.ts ──────────────────────────────────────────────────
// In the imports at the top:
// import { HTTP_INTERCEPTORS } from '@angular/common/http';
// import { NgrokInterceptor } from './core/interceptors/ngrok.interceptor';
//
// In @NgModule providers array:
// {
//   provide:  HTTP_INTERCEPTORS,
//   useClass: NgrokInterceptor,
//   multi:    true
// }