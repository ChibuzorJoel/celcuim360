import { Component } from '@angular/core';

@Component({
  selector: 'app-consultation',
  templateUrl: './consultation.component.html',
  styleUrls: ['./consultation.component.css']
})
export class ConsultationComponent {
  services = [
    {
      title: 'HR Consulting',
      description: 'Practical support for policies, people processes, and organisational design.'
    },
    {
      title: 'Brand and Management Consulting',
      description: 'Aligning leadership, brand promise, and customer experience.'
    },
    {
      title: 'Customer Experience Strategy',
      description: 'Designing systems and processes that improve service delivery.'
    },
    {
      title: 'Culture and Engagement Advisory',
      description: 'Building programs that increase employee satisfaction and productivity.'
    },
    {
      title: 'Bespoke Advisory Services',
      description: 'Tailored solutions for unique organisational challenges.'
    }
  ];

  selectedDate: Date | null = null;
  availableDates: Date[] = [];
  showCalendar = false;

  constructor() {
    this.generateAvailableDates();
  }

  generateAvailableDates() {
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Only include Mondays and Fridays
      if (date.getDay() === 1 || date.getDay() === 5) {
        this.availableDates.push(new Date(date));
      }
    }
  }

  isDateAvailable(date: Date): boolean {
    return this.availableDates.some(availableDate => 
      availableDate.toDateString() === date.toDateString()
    );
  }

  selectDate(date: Date) {
    if (this.isDateAvailable(date)) {
      this.selectedDate = date;
    }
  }

  bookConsultation() {
    if (this.selectedDate) {
      // In a real application, this would connect to your calendaring system
      alert(`Consultation booked for ${this.selectedDate.toDateString()}`);
      // Reset selection
      this.selectedDate = null;
    } else {
      this.showCalendar = true;
    }
  }

  getDayName(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  getFormattedDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
}