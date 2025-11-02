import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './shared/header/header.component';
import { FooterComponent } from './shared/footer/footer.component';
import { HomeComponent } from './pages/home/home.component';
import { AboutComponent } from './pages/about/about.component';
import { ServicesComponent } from './pages/services/services.component';
import { ProjectComponent } from './pages/project/project.component';
import { ContactComponent } from './pages/contact/contact.component';
import { AdminDashboardComponent } from './core/admin-dashboard/admin-dashboard.component';
import { LoginComponent } from './core/login/login.component';
import { TrainingComponent } from './pages/training/training.component';
import { RegistrationComponent } from './pages/registration/registration.component';
import { ConsultationComponent } from './pages/consultation/consultation.component';
import { BlogComponent } from './pages/blog/blog.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    HomeComponent,
    AboutComponent,
    ServicesComponent,
    ProjectComponent,
    ContactComponent,
    AdminDashboardComponent,
    LoginComponent,
    TrainingComponent,
    RegistrationComponent,
    ConsultationComponent,
    BlogComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
