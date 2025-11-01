// src/app/registration/registration.component.ts

import { Component } from '@angular/core';
import { ContactService, RegistrationRecord } from '../../core/services/contact.service';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css']
})
export class RegistrationComponent {
  
  formData: RegistrationRecord = {
    fullName: '',
    email: '',
    mobile: '',
    isEmployed: null, 
    companyName: '',
    role: '',
    registrationType: '',
    gains: '',
    referral: '',
    consent: false
  } as RegistrationRecord;

  formSubmitted: boolean = false;

  constructor(private dataService: ContactService) { }

  onSubmit(form: NgForm) {
    if (this.formSubmitted) return; 

    this.dataService.saveRegistration(this.formData).subscribe({
      next: (response) => {
        console.log('Registration submitted successfully. Firebase key:', response.name);
        
        this.formSubmitted = true;
        
        // Set timeout to reset the form after 6 seconds
        setTimeout(() => {
          this.resetForm(form);
        }, 6000);
      },
      error: (err: any) => {
        console.error('Registration submission failed:', err);
        alert('Submission failed. Please try again later.'); 
      }
    });
  }

  // Method to reset the form and show the form again
  resetForm(form: NgForm) {
    this.formSubmitted = false;
    
    // Reset the form data
    this.formData = {
      fullName: '',
      email: '',
      mobile: '',
      isEmployed: null, 
      companyName: '',
      role: '',
      registrationType: '',
      gains: '',
      referral: '',
      consent: false
    } as RegistrationRecord;
    
    // Reset the form validation state
    form.resetForm();
  }
}