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

  // ✅ FIX: required by OnInit
  ngOnInit(): void {
    // optional: clear old session on login page
    localStorage.removeItem('token');
    localStorage.removeItem('studentId');
  }

  login(): void {
    this.error = '';
    this.loading = true;

    this.service.login(this.form).subscribe({
      next: (res: any) => {

        // ✅ Save token + user
        localStorage.setItem('token', res.token);
        localStorage.setItem('studentId', res.user?.id);

        this.loading = false;

        // ✅ Redirect
        this.router.navigate(['/student-dashboard']);
      },

      error: (err: any) => {
        this.loading = false;
        this.error = err.error?.message || 'Login failed';
      }
    });
  }
}