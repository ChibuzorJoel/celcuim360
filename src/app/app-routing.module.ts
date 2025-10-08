import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
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

const routes: Routes = [
  {path: '', component: HomeComponent},
  {path: 'home', component: HomeComponent},
  {path: 'about', component: AboutComponent},
  {path: 'services', component: ServicesComponent},
  {path: 'project', component: ProjectComponent},
  {path: 'contact', component: ContactComponent},
  {path: 'blog', component: BlogComponent},
  {path: 'team', component: TeamComponent},
  {path: 'testimonial', component: TestimonialComponent},
  {path: 'faqs', component: FaqsComponent},
  {path: '**', component: Page404Component}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
