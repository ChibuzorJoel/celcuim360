import { Component, OnInit, HostListener } from '@angular/core';
import { ContactService, RegistrationRecord ,ConsultationRecord} from '../../core/services/contact.service';

interface CalendarDay {
  date: number;
  fullDate: Date;
  isCurrentMonth: boolean;
  isWeekday: boolean;
  isPast: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-consultation',
  templateUrl: './consultation.component.html',
  styleUrls: ['./consultation.component.css']
})
export class ConsultationComponent implements OnInit {

  currentDate: Date = new Date();
  currentMonth: string = '';
  currentYear: number = 0;
  calendar: CalendarDay[][] = [];

  selectedDate: Date | null = null;
  selectedTime: string = '';
  userEmail: string = '';
  showThankYou: boolean = false;
  isSubmitting: boolean = false;
  errorMessage: string = '';
  userMessage: string = '';

  timeSlots: string[] = [
    '09:00 AM', '10:00 AM', '11:00 AM', 
    '12:00 PM', '01:00 PM', '02:00 PM', 
    '03:00 PM', '04:00 PM', '05:00 PM'
  ];

  constructor(private contactService: ContactService) {}

  ngOnInit(): void {
    this.initializeCalendar();
  }

  private initializeCalendar(): void {
    this.generateCalendar();
  }

  private generateCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    this.currentMonth = this.currentDate.toLocaleString('default', { month: 'long' });
    this.currentYear = year;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayIndex = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const calendar: CalendarDay[][] = [];
    let week: CalendarDay[] = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      week.push(this.createCalendarDay(date, false));
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      week.push(this.createCalendarDay(date, true));
      if (week.length === 7) {
        calendar.push(week);
        week = [];
      }
    }

    let nextMonthDay = 1;
    while (week.length < 7) {
      const date = new Date(year, month + 1, nextMonthDay);
      week.push(this.createCalendarDay(date, false));
      nextMonthDay++;
    }

    if (week.length > 0) calendar.push(week);
    this.calendar = calendar;
  }

  private createCalendarDay(date: Date, isCurrentMonth: boolean): CalendarDay {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(date);
    dayDate.setHours(0, 0, 0, 0);

    return {
      date: date.getDate(),
      fullDate: date,
      isCurrentMonth,
      isWeekday: this.isWeekday(date),
      isPast: dayDate < today,
      isToday: dayDate.getTime() === today.getTime()
    };
  }

  private isWeekday(date: Date): boolean {
    const day = date.getDay();
    return day >= 1 && day <= 5;
  }

  isDateSelectable(day: CalendarDay): boolean {
    return day.isCurrentMonth && day.isWeekday && !day.isPast;
  }

  isDateSelected(day: CalendarDay): boolean {
    return this.selectedDate !== null && 
           day.isCurrentMonth && 
           this.selectedDate.getTime() === day.fullDate.getTime();
  }

  getDayClass(day: CalendarDay): string {
    const classes: string[] = ['calendar-day'];
    if (!day.isCurrentMonth) classes.push('other-month');
    if (day.isToday) classes.push('today');
    if (day.isWeekday && day.isCurrentMonth) classes.push('weekday');
    if (this.isDateSelected(day)) classes.push('selected');
    if (!this.isDateSelectable(day)) classes.push('disabled');
    return classes.join(' ');
  }

  selectDate(day: CalendarDay): void {
    if (!this.isDateSelectable(day)) {
      if (day.isPast) this.errorMessage = 'Cannot select past dates';
      else if (!day.isWeekday) this.errorMessage = 'Available days are Monday to Friday';
      else if (!day.isCurrentMonth) this.errorMessage = 'Please select a date from the current month';
      return;
    }
    this.errorMessage = '';
    this.selectedDate = day.fullDate;
    this.selectedTime = '';
  }

  selectTime(time: string): void {
    this.selectedTime = time;
  }

  isValidEmail(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.userEmail);
  }

 async confirmBooking(): Promise<void> {
  if (!this.selectedDate || !this.selectedTime || !this.isValidEmail()) return;

  this.isSubmitting = true;
  this.errorMessage = '';

  const bookingData: ConsultationRecord = {
    fullName: 'Consultation Booking',
    email: this.userEmail,
    registrationType: 'Consultation',
    referral: 'Online Scheduler',
    consent: true,
    bookingDate: this.selectedDate.toDateString(),
    bookingTime: this.selectedTime
  };

  this.contactService.saveConsultation(bookingData).subscribe({
    next: (response) => {
      console.log('Booking submitted successfully:', response);
      this.isSubmitting = false;
      this.showThankYou = true; // display thank-you message
    },
    error: (err) => {
      console.error('Booking submission failed:', err);
      this.isSubmitting = false;
      this.errorMessage = 'Submission failed. Please try again later.';
    }
  });
}


  resetBooking(): void {
    this.selectedDate = null;
    this.selectedTime = '';
    this.userEmail = '';
    this.showThankYou = false;
    this.errorMessage = '';
    this.userMessage = '';
  }

  previousMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.generateCalendar();
    this.resetBooking();
  }

  nextMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.generateCalendar();
    this.resetBooking();
  }

  trackByWeek(index: number, week: CalendarDay[]): string {
    return `week-${index}-${week[0]?.date}`;
  }

  trackByDay(index: number, day: CalendarDay): string {
    return `day-${day?.date}-${day?.isCurrentMonth}`;
  }

  @HostListener('keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.showThankYou) {
      this.resetBooking();
    }
  }
}
