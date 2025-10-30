import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-training',
  templateUrl: './training.component.html',
  styleUrls: ['./training.component.css']
})
export class TrainingComponent {

  constructor(private router: Router) { }

  navigateToRegistration(programType: string): void {
    // Navigate to registration page with program type
    this.router.navigate(['/register'], { 
      queryParams: { program: programType } 
    });
  }

  navigateToContact(): void {
    this.router.navigate(['/contact']);
  }
}