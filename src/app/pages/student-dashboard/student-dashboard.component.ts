// import { Component, OnInit } from '@angular/core';

// interface CourseWeek {
//   id: number;
//   title: string;
//   description: string;
//   status: 'completed' | 'pending' | 'overdue';
//   score: number | null;
//   coursework: string;
//   submitted: boolean;
// }

// @Component({
//   selector: 'app-student-dashboard',
//   templateUrl: './student-dashboard.component.html',
//   styleUrls: ['./student-dashboard.component.css']
// })
// export class StudentDashboardComponent implements OnInit {

//   // ✅ Student Profile
//   student = {
//     name: 'John Doe',
//     email: 'j.doe@example.com',
//     phone: '+234 800 000 0000',
//     photo: 'assets/avatar-placeholder.png'
//   };

//   // ✅ Course Structure (6 Weeks)
//   courseWeeks: CourseWeek[] = [
//     {
//       id: 1,
//       title: 'Introduction',
//       description: 'Overview of the program and expectations',
//       status: 'completed',
//       score: 95,
//       coursework: 'Done',
//       submitted: true
//     },
//     {
//       id: 2,
//       title: 'Foundations',
//       description: 'Core concepts and principles',
//       status: 'completed',
//       score: 88,
//       coursework: 'Done',
//       submitted: true
//     },
//     {
//       id: 3,
//       title: 'Implementation',
//       description: 'Applying concepts in real scenarios',
//       status: 'pending',
//       score: null,
//       coursework: 'In Progress',
//       submitted: false
//     },
//     {
//       id: 4,
//       title: 'Optimization',
//       description: 'Improving performance and efficiency',
//       status: 'overdue',
//       score: null,
//       coursework: 'Pending',
//       submitted: false
//     },
//     {
//       id: 5,
//       title: 'Advanced Strategy',
//       description: 'Advanced techniques and strategies',
//       status: 'pending',
//       score: null,
//       coursework: 'Locked',
//       submitted: false
//     },
//     {
//       id: 6,
//       title: 'Final Review',
//       description: 'Final assessment and wrap-up',
//       status: 'pending',
//       score: null,
//       coursework: 'Locked',
//       submitted: false
//     }
//   ];

//   // ✅ Progress Calculation
//   get completionRate(): number {
//     const completed = this.courseWeeks.filter(w => w.status === 'completed').length;
//     return Math.round((completed / this.courseWeeks.length) * 100);
//   }

//   // ✅ Status Color System (for UI)
//   getStatusColor(status: string): string {
//     switch (status) {
//       case 'completed':
//         return 'green';
//       case 'pending':
//         return 'orange';
//       case 'overdue':
//         return 'red';
//       default:
//         return 'gray';
//     }
//   }

//   // ✅ Submit Assignment (Frontend logic for now)
//   submitAssignment(week: CourseWeek) {
//     week.submitted = true;
//     week.status = 'completed';

//     // simulate auto grading
//     week.score = Math.floor(Math.random() * 40) + 60; // 60–100
//   }

//   ngOnInit() {}
// }





import { Component, OnInit } from '@angular/core';
import { RegistrationService } from '../../core/services/registration.service';

interface CourseWeek {
  id: number;
  title: string;
  description: string;
  status: 'completed' | 'pending' | 'overdue';
  score: number | null;
  coursework: string;
  submitted: boolean;
}

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit {

  constructor(private regService: RegistrationService) {}

  // ✅ Student Profile
  student = {
    name: '',
    email: '',
    phone: '',
    photo: 'assets/avatar-placeholder.png'
  };

  // ✅ Course Weeks (fallback default)
  courseWeeks: CourseWeek[] = [];

  loading = true;

  // ✅ Progress Calculation
  get completionRate(): number {
    if (!this.courseWeeks.length) return 0;

    const completed = this.courseWeeks.filter(w => w.status === 'completed').length;
    return Math.round((completed / this.courseWeeks.length) * 100);
  }

  // ✅ Status Color
  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'green';
      case 'pending': return 'orange';
      case 'overdue': return 'red';
      default: return 'gray';
    }
  }

  // ✅ Load Student Data from Backend
  loadStudent() {
    const id = localStorage.getItem('studentId');

    if (!id) {
      console.warn('No student ID found');
      this.setFallbackData();
      return;
    }

    this.regService.getStudent(id).subscribe({
      next: (data: any) => {

        // ✅ Profile
        this.student = {
          name: data.fullName,
          email: data.email,
          phone: data.phone,
          photo: data.photo || 'assets/avatar-placeholder.png'
        };

        // ✅ Weeks (map backend → frontend)
        this.courseWeeks = data.courseWeeks.map((w: any) => ({
          ...w,
          submitted: w.status === 'completed'
        }));

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading student:', err);
        this.setFallbackData();
        this.loading = false;
      }
    });
  }

  // ✅ Submit Assignment (Backend Connected)
  submitAssignment(week: CourseWeek) {
    const id = localStorage.getItem('studentId');

    if (!id) return;

    this.regService.submitAssignment(id, week.id).subscribe({
      next: (res: any) => {

        // update UI with response
        week.submitted = true;
        week.status = 'completed';
        week.score = res.score;

      },
      error: (err) => {
        console.error('Submission failed:', err);
      }
    });
  }

  // ✅ Fallback Data (if backend fails)
  setFallbackData() {
    this.student = {
      name: 'John Doe',
      email: 'j.doe@example.com',
      phone: '+234 800 000 0000',
      photo: 'assets/avatar-placeholder.png'
    };

    this.courseWeeks = [
      {
        id: 1,
        title: 'Introduction',
        description: 'Overview of the program',
        status: 'completed',
        score: 95,
        coursework: 'Done',
        submitted: true
      },
      {
        id: 2,
        title: 'Foundations',
        description: 'Core concepts',
        status: 'completed',
        score: 88,
        coursework: 'Done',
        submitted: true
      },
      {
        id: 3,
        title: 'Implementation',
        description: 'Apply skills',
        status: 'pending',
        score: null,
        coursework: 'In Progress',
        submitted: false
      },
      {
              id: 4,
              title: 'Optimization',
              description: 'Improving performance and efficiency',
              status: 'overdue',
              score: null,
              coursework: 'Pending',
              submitted: false
            },
            {
              id: 5,
              title: 'Advanced Strategy',
              description: 'Advanced techniques and strategies',
              status: 'pending',
              score: null,
              coursework: 'Locked',
              submitted: false
            },
            {
              id: 6,
              title: 'Final Review',
              description: 'Final assessment and wrap-up',
              status: 'pending',
              score: null,
              coursework: 'Locked',
              submitted: false
            }
    ];
  }

  ngOnInit() {
    this.loadStudent();
  }
}