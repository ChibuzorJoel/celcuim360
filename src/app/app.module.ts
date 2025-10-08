import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './shared/header/header.component';
import { FooterComponent } from './shared/footer/footer.component';
import { HomeComponent } from './pages/home/home.component';
import { AboutComponent } from './pages/about/about.component';
import { ServicesComponent } from './pages/services/services.component';
import { ProjectComponent } from './pages/project/project.component';
import { ContactComponent } from './pages/contact/contact.component';
import { BlogComponent } from './pages/pages_section/blog/blog.component';
import { TeamComponent } from './pages/pages_section/team/team.component';
import { TestimonialComponent } from './pages/pages_section/testimonial/testimonial.component';
import { FaqsComponent } from './pages/pages_section/faqs/faqs.component';
import { Page404Component } from './pages/pages_section/page404/page404.component';

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
    BlogComponent,
    TeamComponent,
    TestimonialComponent,
    FaqsComponent,
    Page404Component
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
