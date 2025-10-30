// src/app/registration/registration.component.ts

import { Component } from '@angular/core';
import { ContactService, RegistrationRecord } from '../../core/services/contact.service'; // Import DataService and the RegistrationRecord interface
import { NgForm } from '@angular/forms'; // Used for optional form reset

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css']
})
export class RegistrationComponent {
  
  // Use the specific interface for type safety
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
  } as RegistrationRecord; // Cast to ensure all fields are present

  formSubmitted: boolean = false;

  // Inject the DataService
  constructor(private dataService: ContactService) { }

  onSubmit(form: NgForm) {
    if (this.formSubmitted) return; 

    // 🌟 1. Call the service method to save the data to the 'registrations' node
    this.dataService.saveRegistration(this.formData).subscribe({
      next: (response) => {
        console.log('Registration submitted successfully. Firebase key:', response.name);
        
        // 🌟 2. Set the success flag to display the thank you message
        this.formSubmitted = true;
        
        // Optional: Reset the form fields if you want to allow a new submission later
        // form.resetForm({ isEmployed: null, consent: false }); 
      },
      // 🌟 3. Handle errors (using 'any' for the error type is acceptable here)
      error: (err: any) => {
        console.error('Registration submission failed:', err);
        // Implement user-facing error feedback here
        alert('Submission failed. Please try again later.'); 
      }
    });
  }
}