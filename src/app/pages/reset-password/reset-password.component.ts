// src/app/pages/reset-password/reset-password.component.ts
//
// Landing page for the link sent by POST /api/auth/forgot-password.
// Expected URL shape: /reset-password?token=<raw-token>&email=<email>
//
// Both token and email must be present — the backend's resetPassword()
// controller requires all three of { email, token, newPassword }.

import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthStudentService } from 'src/app/core/auth-student.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {

  // ── Query params ─────────────────────────────────────────────────────────
  private email = '';
  private token = '';
  linkInvalid = false; // true if token/email missing from URL entirely

  // ── Form state ───────────────────────────────────────────────────────────
  newPassword     = '';
  confirmPassword = '';
  showPassword    = false;

  isSubmitting = false;
  errorMessage = '';
  resetSuccess = false;

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private auth:   AuthStudentService,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      this.email = params['email'] || '';

      if (!this.token || !this.email) {
        this.linkInvalid = true;
      }
    });
  }

  submit(): void {
    this.errorMessage = '';

    if (this.linkInvalid) {
      this.errorMessage = 'This reset link is invalid. Please request a new one.';
      return;
    }
    if (!this.newPassword || this.newPassword.length < 8) {
      this.errorMessage = 'Password must be at least 8 characters.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isSubmitting = true;

    this.auth.resetPassword(this.email, this.token, this.newPassword).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.resetSuccess = true;
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.errorMessage = err?.message ?? 'Password reset failed. The link may have expired.';
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/student-login']);
  }
}