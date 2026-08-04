import { Component, OnInit } from '@angular/core';
import { CohortService, Cohort, CalWeek } from '../../core/services/cohort.service'; // adjust path to match your project structure

@Component({
  selector: 'app-admin-cohorts',
  templateUrl: './admin-cohorts.component.html',
  styleUrls: ['./admin-cohorts.component.css'],
})
export class AdminCohortsComponent implements OnInit {
  cohorts: Cohort[] = [];
  filteredCohorts: Cohort[] = [];

  loading = false;
  errorMsg = '';

  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  selectedCohort: Cohort | null = null;

  newCohort = { name: '', startDate: '', maxStudents: 30 };

  editForm: { name: string; startDate: string; status: 'active' | 'forming' | 'closed'; maxStudents: number } = {
    name: '',
    startDate: '',
    status: 'forming',
    maxStudents: 30,
  };

  calendarPreview: CalWeek[] = [];
  activeFilter: 'all' | 'active' | 'forming' | 'closed' = 'all';

  constructor(private cohortService: CohortService) {}

  ngOnInit(): void {
    this.loadCohorts();
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  loadCohorts(): void {
    this.loading = true;
    this.errorMsg = '';
    this.cohortService.getAll().subscribe({
      next: (res) => {
        this.cohorts = res.cohorts;
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error('[AdminCohorts] load failed', err);
        this.errorMsg = 'Failed to load cohorts. Please refresh.';
        this.loading = false;
      },
    });
  }

  setFilter(f: 'all' | 'active' | 'forming' | 'closed' = 'all'): void {
    this.activeFilter = f;
    this.applyFilter();
  }

  applyFilter(): void {
    this.filteredCohorts = this.activeFilter === 'all'
      ? this.cohorts
      : this.cohorts.filter(c => c.status === this.activeFilter);
  }

  // ── Create ───────────────────────────────────────────────────────────────

  /** Client-side-only preview shown while typing a start date in the create modal.
   *  The real weeks array is generated server-side on save. */
  previewCalendar(): void {
    if (!this.newCohort.startDate) { this.calendarPreview = []; return; }
    const start = new Date(this.newCohort.startDate);
    this.calendarPreview = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i * 7);
      return {
        num: i + 1,
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        done: false,
        current: false,
      };
    });
  }

  openCreateModal(): void {
    this.errorMsg = '';
    this.newCohort = { name: '', startDate: '', maxStudents: 30 };
    this.calendarPreview = [];
    this.showCreateModal = true;
  }

  createCohort(): void {
    if (!this.newCohort.name || !this.newCohort.startDate) return;
    this.cohortService.create(this.newCohort).subscribe({
      next: () => {
        this.loadCohorts();
        this.closeModals();
      },
      error: (err) => {
        console.error('[AdminCohorts] create failed', err);
        this.errorMsg = err?.error?.message || 'Failed to create cohort';
      },
    });
  }

  // ── Edit (name / start date / status / max students) ───────────────────

  openEditModal(c: Cohort): void {
    this.errorMsg = '';
    this.selectedCohort = c;
    this.editForm = {
      name: c.name,
      startDate: this.toDateInputValue(c.startDate),
      status: c.status,
      maxStudents: c.maxStudents,
    };
    this.showEditModal = true;
  }

  /** Converts a display string like "Jun 2, 2026" into "yyyy-MM-dd" for <input type="date"> */
  private toDateInputValue(display: string): string {
    const d = new Date(display);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  saveEdit(): void {
    if (!this.selectedCohort) return;
    const cohortId = this.selectedCohort.cohortId;

    this.cohortService.update(cohortId, {
      name: this.editForm.name,
      startDate: this.editForm.startDate,
      status: this.editForm.status,
      maxStudents: this.editForm.maxStudents,
    }).subscribe({
      next: () => {
        this.loadCohorts();
        this.closeModals();
      },
      error: (err) => {
        console.error('[AdminCohorts] update failed', err);
        this.errorMsg = err?.error?.message || 'Failed to update cohort';
      },
    });
  }

  // ── Archive ──────────────────────────────────────────────────────────────

  openDeleteModal(c: Cohort): void {
    this.errorMsg = '';
    this.selectedCohort = c;
    this.showDeleteModal = true;
  }

  archiveCohort(): void {
    if (!this.selectedCohort) return;
    this.cohortService.archive(this.selectedCohort.cohortId).subscribe({
      next: () => {
        this.loadCohorts();
        this.closeModals();
      },
      error: (err) => {
        console.error('[AdminCohorts] archive failed', err);
        this.errorMsg = err?.error?.message || 'Failed to archive cohort';
      },
    });
  }

  // Left as-is intentionally — "View Students" / cohort-scoped calendar management
  // are out of scope for this fix (they need a cohortId field added to
  // Registration/Coursework first).
  manageCalendar(c: Cohort): void { console.log('Manage calendar for', c.name); }

  closeModals(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedCohort  = null;
  }
}