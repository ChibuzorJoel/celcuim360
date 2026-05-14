import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// ── Interceptors ───────────────────────────────────────────────────────────
import { NgrokInterceptor } from './core/interceptors/ngrok.interceptor';

// ── Shared ─────────────────────────────────────────────────────────────────
import { HeaderComponent } from './shared/header/header.component';
import { FooterComponent } from './shared/footer/footer.component';

// ── Public Pages ───────────────────────────────────────────────────────────
import { HomeComponent } from './pages/home/home.component';
import { AboutComponent } from './pages/about/about.component';
import { ServicesComponent } from './pages/services/services.component';
import { ProjectComponent } from './pages/project/project.component';
import { ContactComponent } from './pages/contact/contact.component';
import { TrainingComponent } from './pages/training/training.component';
import { RegistrationComponent } from './pages/registration/registration.component';
import { ConsultationComponent } from './pages/consultation/consultation.component';
import { BlogComponent } from './pages/blog/blog.component';
import { WorkSmartComponent } from './pages/worksmart/worksmart.component';
import { ProgramComponent } from './pages/program/program.component';

// ── Student Portal ─────────────────────────────────────────────────────────
import { StudentLoginComponent } from './pages/student-login/student-login.component';
import { StudentDashboardComponent } from './pages/student-dashboard/student-dashboard.component';

// ── Admin ──────────────────────────────────────────────────────────────────
import { LoginComponent } from './core/login/login.component';
import { AdminShellComponent } from './core/admin-shell/admin-shell.component';
import { AdminDashboardComponent } from './core/admin-dashboard/admin-dashboard.component';
import { AdminRegistrationComponent } from './core/admin-registration/admin-registration.component';
import { AdminAssessmentComponent } from './core/admin-assessment/admin-assessment.component';
import { AdminContactComponent } from './core/admin-contact/admin-contact.component';
import { AdminCohortsComponent } from './core/admin-cohorts/admin-cohorts.component';
import { AdminAnalyticsComponent } from './core/admin-analytics/admin-analytics.component';
import { AdminPaymentsComponent } from './core/admin-payments/admin-payments.component';

@NgModule({
  declarations: [
    AppComponent,

    // Shared
    HeaderComponent,
    FooterComponent,

    // Public pages
    HomeComponent,
    AboutComponent,
    ServicesComponent,
    ProjectComponent,
    ContactComponent,
    TrainingComponent,
    RegistrationComponent,
    ConsultationComponent,
    BlogComponent,
    WorkSmartComponent,
    ProgramComponent,

    // Student portal
    StudentLoginComponent,
    StudentDashboardComponent,

    // Admin
    LoginComponent,
    AdminShellComponent,
    AdminDashboardComponent,
    AdminRegistrationComponent,
    AdminAssessmentComponent,
    AdminContactComponent,
    AdminCohortsComponent,
    AdminAnalyticsComponent,
    AdminPaymentsComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,
    FormsModule,
  ],
  providers: [
    // ── NgrokInterceptor ─────────────────────────────────────────────────
    // Adds 'ngrok-skip-browser-warning: true' header to every HTTP request.
    // Required for ngrok free tier to pass requests through to the API.
    // Remove this provider when you switch to a permanent production domain.
    {
      provide:  HTTP_INTERCEPTORS,
      useClass: NgrokInterceptor,
      multi:    true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}