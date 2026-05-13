import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// ── Public pages ─────────────────────────────────────────────────────────────
import { HomeComponent }             from './pages/home/home.component';
import { AboutComponent }            from './pages/about/about.component';
import { ServicesComponent }         from './pages/services/services.component';
import { ProjectComponent }          from './pages/project/project.component';
import { ContactComponent }          from './pages/contact/contact.component';
import { TrainingComponent }         from './pages/training/training.component';
import { RegistrationComponent }     from './pages/registration/registration.component';
import { ConsultationComponent }     from './pages/consultation/consultation.component';
import { BlogComponent }             from './pages/blog/blog.component';
import { WorkSmartComponent }        from './pages/worksmart/worksmart.component';
import { ProgramComponent }          from './pages/program/program.component';
import { StudentDashboardComponent } from './pages/student-dashboard/student-dashboard.component';
import { StudentLoginComponent }     from './pages/student-login/student-login.component';

// ── Auth ──────────────────────────────────────────────────────────────────────
import { LoginComponent } from './core/login/login.component';
import { AuthGuard }      from './core/authguard/auth.guard';

// ── Admin shell + child pages ─────────────────────────────────────────────────
import { AdminShellComponent }        from './core/admin-shell/admin-shell.component';
import { AdminDashboardComponent }    from './core/admin-dashboard/admin-dashboard.component';
import { AdminRegistrationComponent } from './core/admin-registration/admin-registration.component';
import { AdminAssessmentComponent } from './core/admin-assessment/admin-assessment.component';
import { AdminContactComponent } from './core/admin-contact/admin-contact.component';
import { AdminCohortsComponent } from './core/admin-cohorts/admin-cohorts.component';
import { AdminAnalyticsComponent } from './core/admin-analytics/admin-analytics.component';
import { AdminPaymentsComponent } from './core/admin-payments/admin-payments.component';

// Uncomment as you add more admin pages:
// import { AdminContactComponent }    from './core/admin-contact/admin-contact.component';
// import { AdminAssessmentComponent } from './core/admin-assessment/admin-assessment.component';
// import { AdminCohortsComponent }    from './core/admin-cohorts/admin-cohorts.component';
// import { AdminAnalyticsComponent }  from './core/admin-analytics/admin-analytics.component';
// import { AdminPaymentsComponent }   from './core/admin-payments/admin-payments.component';

const routes: Routes = [

  // ── Public routes (public navbar visible) ────────────────────────────────
  { path: '',             component: HomeComponent             },
  { path: 'home',         component: HomeComponent             },
  { path: 'about',        component: AboutComponent            },
  { path: 'services',     component: ServicesComponent         },
  { path: 'project',      component: ProjectComponent          },
  { path: 'contact',      component: ContactComponent          },
  { path: 'training',     component: TrainingComponent         },
  { path: 'registration', component: RegistrationComponent     },
  { path: 'consultation', component: ConsultationComponent     },
  { path: 'blog',         component: BlogComponent             },
  { path: 'worksmart',    component: WorkSmartComponent        },
  { path: 'program',      component: ProgramComponent          },
  { path: 'portal',       component: StudentDashboardComponent },

  // ── Auth routes (no public navbar) ───────────────────────────────────────
  { path: 'login',         component: LoginComponent        },
  { path: 'student-login', component: StudentLoginComponent },

  // ── Admin (shell + sidebar, no public navbar, all protected) ─────────────
  //
  //  AdminShellComponent renders the sidebar and topbar.
  //  Its template has <router-outlet> which loads the active child.
  //
  //  URL: /admin/dashboard, /admin/registration, etc.
  //
  {
    path: 'admin',
    component: AdminShellComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '',             redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',    component: AdminDashboardComponent         },
      { path: 'registration', component: AdminRegistrationComponent      },
      { path: 'contact',    component: AdminContactComponent    },
      { path: 'assessment', component: AdminAssessmentComponent },
      { path: 'cohorts',    component: AdminCohortsComponent    },
      { path: 'analytics',  component: AdminAnalyticsComponent},
      { path: 'payments',   component: AdminPaymentsComponent   },
    ],
  },

  // ── Wildcard fallback ─────────────────────────────────────────────────────
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'top',
      anchorScrolling: 'enabled',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}