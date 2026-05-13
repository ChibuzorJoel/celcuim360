import { Component, OnInit } from '@angular/core';

interface CalWeek { num: number; date: string; done: boolean; current: boolean; }

interface Cohort {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'forming' | 'closed';
  enrolled: number;
  approved: number;
  pending: number;
  avgScore: number;
  weeks: CalWeek[];
}

@Component({
  selector: 'app-admin-cohorts',
  templateUrl: './admin-cohorts.component.html',
  styleUrls: ['./admin-cohorts.component.css'],
})
export class AdminCohortsComponent implements OnInit {
  cohorts: Cohort[] = [];
  filteredCohorts: Cohort[] = [];


  showCreateModal = false;
  showDeleteModal = false;
  selectedCohort: Cohort | null = null;

  newCohort = { name: '', startDate: '', maxStudents: 30 };
  calendarPreview: CalWeek[] = [];
  activeFilter: 'all' | 'active' | 'forming' | 'closed' = 'all';

  ngOnInit(): void {
    this.cohorts = [
      {
        id: 'c7', name: 'Cohort 7', startDate: 'Jun 2, 2025', endDate: 'Jul 11, 2025',
        status: 'active', enrolled: 24, approved: 20, pending: 4, avgScore: 76,
        weeks: this.generateWeeks('2025-06-02'),
      },
      {
        id: 'c8', name: 'Cohort 8', startDate: 'Jul 21, 2025', endDate: 'Aug 29, 2025',
        status: 'forming', enrolled: 8, approved: 6, pending: 2, avgScore: 0,
        weeks: this.generateWeeks('2025-07-21'),
      },
      {
        id: 'c6', name: 'Cohort 6', startDate: 'Apr 7, 2025', endDate: 'May 16, 2025',
        status: 'closed', enrolled: 22, approved: 22, pending: 0, avgScore: 81,
        weeks: this.generateWeeks('2025-04-07', true),
      },
    ];
    this.applyFilter();
  }

  /** Generate a 6-week calendar from a start date */
  generateWeeks(startIso: string, allDone = false): CalWeek[] {
    const start = new Date(startIso);
    const today = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i * 7);
      const nextWeek = new Date(d); nextWeek.setDate(nextWeek.getDate() + 7);
      const done    = allDone || nextWeek < today;
      const current = !done && d <= today && today < nextWeek;
      return {
        num: i + 1,
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        done, current,
      };
    });
  }

  
  

  setFilter(f: 'all' | 'active' | 'forming' | 'closed' = 'all'): void {
    this.activeFilter = f;
  }
  applyFilter(): void {
    this.filteredCohorts = this.activeFilter === 'all'
      ? this.cohorts
      : this.cohorts.filter(c => c.status === this.activeFilter);
  }

  previewCalendar(): void {
    if (!this.newCohort.startDate) return;
    this.calendarPreview = this.generateWeeks(this.newCohort.startDate);
  }

  openCreateModal(): void { this.showCreateModal = true; this.calendarPreview = []; }

  createCohort(): void {
    if (!this.newCohort.name || !this.newCohort.startDate) return;
    const start = new Date(this.newCohort.startDate);
    const end   = new Date(start); end.setDate(end.getDate() + 41);

    const cohort: Cohort = {
      id: 'c' + Date.now(),
      name: this.newCohort.name,
      startDate: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      endDate:   end.toLocaleDateString('en-US',   { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'forming',
      enrolled: 0, approved: 0, pending: 0, avgScore: 0,
      weeks: this.generateWeeks(this.newCohort.startDate),
    };

    this.cohorts.unshift(cohort);
    this.applyFilter();
    this.newCohort = { name: '', startDate: '', maxStudents: 30 };
    this.closeModals();
  }

  openDeleteModal(c: Cohort): void { this.selectedCohort = c; this.showDeleteModal = true; }

  archiveCohort(): void {
    if (!this.selectedCohort) return;
    this.selectedCohort.status = 'closed';
    this.applyFilter();
    this.closeModals();
  }

  viewStudents(c: Cohort): void { console.log('View students for', c.name); }
  manageCalendar(c: Cohort): void { console.log('Manage calendar for', c.name); }

  closeModals(): void {
    this.showCreateModal = false;
    this.showDeleteModal = false;
    this.selectedCohort  = null;
  }
}