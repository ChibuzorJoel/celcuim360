import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit {
  loading = false;

  stats = {
    totalRegistrations: 248,
    pendingApprovals: 4,
    activeCohorts: 3,
    contactRequests: 7,
    unverifiedPayments: 2,
  };

  recentRegistrations = [
    { name: 'Ada Okonkwo',   type: 'NYSC',     status: 'pending',  date: new Date('2025-06-02') },
    { name: 'Emeka Nwosu',   type: 'Graduate', status: 'approved', date: new Date('2025-06-01') },
    { name: 'Tolu Adeyemi',  type: 'NYSC',     status: 'pending',  date: new Date('2025-05-31') },
    { name: 'Ngozi Eze',     type: 'Graduate', status: 'rejected', date: new Date('2025-05-30') },
    { name: 'Chidi Obi',     type: 'NYSC',     status: 'approved', date: new Date('2025-05-29') },
  ];

  cohortWeeks = [
    { num: 1, date: 'Jun 2',  done: true,  current: false },
    { num: 2, date: 'Jun 9',  done: false, current: true  },
    { num: 3, date: 'Jun 16', done: false, current: false },
    { num: 4, date: 'Jun 23', done: false, current: false },
    { num: 5, date: 'Jun 30', done: false, current: false },
    { num: 6, date: 'Jul 7',  done: false, current: false },
  ];

  liveSubmissions = [
    { student: 'Ada Okonkwo',  assessment: 'Week 1 Quiz', score: 92, submitted: 'Today 9:14am',  status: 'approved' },
    { student: 'Emeka Nwosu',  assessment: 'Week 1 Quiz', score: 74, submitted: 'Today 8:47am',  status: 'approved' },
    { student: 'Tolu Adeyemi', assessment: 'Week 1 Quiz', score: 51, submitted: 'Today 8:03am',  status: 'pending'  },
    { student: 'Ngozi Eze',    assessment: 'Week 1 Quiz', score: 88, submitted: 'Today 7:55am',  status: 'approved' },
    { student: 'Bola Fashola', assessment: 'Week 1 Quiz', score: 0,  submitted: 'Not submitted', status: 'pending'  },
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {}

  navigate(route: string): void {
    this.router.navigate(['/admin/' + route]);
  }

  scoreClass(score: number): string {
    if (score >= 75) return 'score-high';
    if (score >= 60) return 'score-mid';
    return 'score-low';
  }
}