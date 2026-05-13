import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthStudentService } from 'src/app/core/auth-student.service';  
 
type View = 'login' | 'forgot';

@Component({
  selector: 'app-student-login',
  templateUrl: './student-login.component.html',
  styleUrls: ['./student-login.component.css']
})
export class StudentLoginComponent implements OnInit, OnDestroy  {
  
 
    view: View = 'login';
    slidingOut = false;
   
    // ── Login form ────────────────────────────────────────────────────────────
    loginForm = { email: '', password: '', remember: false };
    showPassword   = false;
    isLoading      = false;
    errorMessage   = '';
    successMessage = '';
   
    // ── Forgot password ───────────────────────────────────────────────────────
    forgotEmail    = '';
    forgotError    = '';
    isSending      = false;
    resetEmailSent = false;
    resendCooldown = 0;
    private cooldownTimer?: ReturnType<typeof setInterval>;
   
    // ── Banner for just-registered users ─────────────────────────────────────
    showRegisteredBanner = false;
   
    currentYear = new Date().getFullYear();
   
    constructor(
      private router:  Router,
      private route:   ActivatedRoute,
      private auth:    AuthStudentService,
    ) {}
   
    ngOnInit(): void {
      // Show "already registered" banner when navigated here with ?registered=true
      this.route.queryParams.subscribe(params => {
        if (params['registered'] === 'true') {
          this.showRegisteredBanner = true;
        }
      });
    }
   
    ngOnDestroy(): void {
      clearInterval(this.cooldownTimer);
    }
   
    // ── View switching ────────────────────────────────────────────────────────
   
    switchView(target: View): void {
      this.slidingOut = true;
      setTimeout(() => {
        this.slidingOut    = false;
        this.view          = target;
        this.errorMessage  = '';
        this.successMessage = '';
        this.forgotError   = '';
      }, 220);
    }
   
    // ── Login ─────────────────────────────────────────────────────────────────
   
    login(): void {
      this.errorMessage = '';
      if (!this.loginForm.email.trim())    { this.errorMessage = 'Please enter your email address.'; return; }
      if (!this.isValidEmail(this.loginForm.email)) { this.errorMessage = 'Please enter a valid email address.'; return; }
      if (!this.loginForm.password.trim()) { this.errorMessage = 'Please enter your password.'; return; }
   
      this.isLoading = true;
   
      this.auth.login(this.loginForm.email, this.loginForm.password).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/portal']);
        },
        error: (err: any) => {
          this.isLoading = false;
          this.errorMessage = err?.message ?? 'Invalid email or password. Please try again.';
        },
      });
    }
   
    // ── Forgot password ───────────────────────────────────────────────────────
   
    sendReset(): void {
      this.forgotError = '';
      if (!this.forgotEmail.trim())          { this.forgotError = 'Please enter your email address.'; return; }
      if (!this.isValidEmail(this.forgotEmail)) { this.forgotError = 'Please enter a valid email address.'; return; }
   
      this.isSending = true;
   
      // Replace with real service call, e.g.:
      // this.auth.sendPasswordReset(this.forgotEmail).subscribe({ next: ..., error: ... });
      setTimeout(() => {
        this.isSending     = false;
        this.resetEmailSent = true;
        this.startCooldown();
      }, 1500);
    }
   
    private startCooldown(): void {
      this.resendCooldown = 60;
      this.cooldownTimer = setInterval(() => {
        this.resendCooldown--;
        if (this.resendCooldown <= 0) {
          clearInterval(this.cooldownTimer);
          this.resendCooldown = 0;
        }
      }, 1000);
    }
   
    // ── Helpers ───────────────────────────────────────────────────────────────
   
    private isValidEmail(email: string): boolean {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
  }
   