import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AboutComponent } from './pages/about/about.component';
import { ServicesComponent } from './pages/services/services.component';
import { ProjectComponent } from './pages/project/project.component';
import { ContactComponent } from './pages/contact/contact.component';
import { AdminDashboardComponent } from './core/admin-dashboard/admin-dashboard.component';
import { AuthGuard } from './core/authguard/auth.guard';
import { LoginComponent } from './core/login/login.component';
import { TrainingComponent } from './pages/training/training.component';
import { RegistrationComponent } from './pages/registration/registration.component';
import { ConsultationComponent } from './pages/consultation/consultation.component';
import { BlogComponent } from './pages/blog/blog.component';
import { WorkSmartComponent } from './pages/worksmart/worksmart.component';

const routes: Routes = [
  // 🔐 Auth routes
  { path: 'login', component: LoginComponent },

  // 🧭 Public site routes
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  { path: 'services', component: ServicesComponent },
  { path: 'project', component: ProjectComponent },
  { path: 'contact', component: ContactComponent },
{path: 'training', component: TrainingComponent},
{path: 'registration', component: RegistrationComponent},
{path: 'consultation', component: ConsultationComponent},
{path: 'blog', component: BlogComponent},
{path: 'worksmart', component: WorkSmartComponent},
  // 🔒 Admin route (protected)
  { path: 'dashboard', component: AdminDashboardComponent, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    scrollPositionRestoration: 'top', // 👈 this does the magic
    anchorScrolling: 'enabled'        // optional, enables #anchor links
  })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
