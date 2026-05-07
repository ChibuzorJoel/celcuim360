import { Component, OnInit } from '@angular/core';
import { RegistrationService } from '../../core/services/registration.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-student-login',
  templateUrl: './student-login.component.html',
  styleUrls: ['./student-login.component.css']
})
export class StudentLoginComponent implements OnInit {

  form = {
    email: '',
    password: ''
  };

  error: string = '';
  loading: boolean = false;

  constructor(
    private service: RegistrationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Clear previous session
    localStorage.removeItem('token');
    localStorage.removeItem('studentId');
  }

  // ✅ Simple form validation
  isFormValid(): boolean {
    return !!this.form.email && !!this.form.password;
  }

  login(): void {
    if (!this.isFormValid()) {
      this.error = 'Please fill in all fields';
      return;
    }

    this.error = '';
    this.loading = true;

    this.service.login(this.form).subscribe({
      next: (res: any) => {
        // Save auth data safely
        localStorage.setItem('token', res.token);
        localStorage.setItem('studentId', res.user?.id || '');

        this.loading = false;

        // Redirect after success
        this.router.navigate(['/student-dashboard']);
      },

      error: (err: any) => {
        this.loading = false;

        // Better error handling
        if (err.status === 401) {
          this.error = 'Invalid email or password';
        } else if (err.status === 0) {
          this.error = 'Server not reachable';
        } else {
          this.error = err.error?.message || 'Login failed. Try again.';
        }
      }
    });
  }
}