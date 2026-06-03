import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email    = '';
  password = '';
  error    = '';
  loading  = false;

  constructor(private auth: AuthService, private router: Router) {}

  submit(): void {
    this.error   = '';
    this.loading = true;

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err: any) => {
        this.loading = false;
        // auth.service throws `new Error(message)` so err.message is the string.
        // err?.error?.message is the raw HTTP shape — no longer reaches here
        // because catchError in AuthService normalises it to Error first.
        this.error = err?.message || err?.error?.message || 'Login failed';
      }
    });
  }
}