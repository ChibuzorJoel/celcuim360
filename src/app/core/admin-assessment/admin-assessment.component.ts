// src/app/core/admin-assessment/admin-assessment.component.ts
// Admin can view, edit, replace questions per week and publish/unpublish

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface WeekData {
  weekNumber: number;
  weekTitle: string;
  instruction: string;
  questions: string[];
  isPublished: boolean;
  publishedAt: string | null;
  updatedAt: string | null;
}

// ── Assessment submission display ───────────────────────────────────────────
interface Submission {
  student: string;
  score: number;
  submittedAt: string;
  cohort: string;
  week: string;
}

interface PendingSub {
  student: string;
  assessment: string;
  overdue: boolean;
}

@Component({
  selector: 'app-admin-assessment',
  templateUrl: './admin-assessment.component.html',
  styleUrls: ['./admin-assessment.component.css'],
})
export class AdminAssessmentComponent implements OnInit {

  private api = environment.apiUrl;

  private headers = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  // ── Tabs ──────────────────────────────────────────────────────────────────
  activeTab: 'scores' | 'questions' = 'questions';

  // ── Week question management ──────────────────────────────────────────────
  allWeeks: WeekData[] = [];
  weeksLoading = true;

  activeWeekNum = 1;
  activeWeekData: WeekData | null = null;

  // ── Edit Mode ─────────────────────────────────────────────────────────────
  editMode = false;

  editTitle = '';
  editInstruction = '';
  editQuestions: string[] = new Array(10).fill('');

  saveLoading = false;
  saveError = '';
  saveSuccess = '';

  // ── Publish ───────────────────────────────────────────────────────────────
  publishLoading = false;
  publishError = '';

  // ── Score display ─────────────────────────────────────────────────────────
  cohortOptions = ['Cohort 7', 'Cohort 6', 'Cohort 5'];

  weekOptions = [
    'Wk 1',
    'Wk 2',
    'Wk 3',
    'Wk 4',
    'Wk 5',
    'Wk 6'
  ];

  activeCohort = 'Cohort 7';
  activeScoreWeek = 'Wk 1';

  searchTerm = '';

  allSubmissions: Submission[] = [
    {
      student: 'Ada Okonkwo',
      score: 92,
      submittedAt: 'Jun 3, 9:14am',
      cohort: 'Cohort 7',
      week: 'Wk 1'
    },
    {
      student: 'Emeka Nwosu',
      score: 74,
      submittedAt: 'Jun 3, 8:47am',
      cohort: 'Cohort 7',
      week: 'Wk 1'
    },
    {
      student: 'Tolu Adeyemi',
      score: 51,
      submittedAt: 'Jun 3, 8:03am',
      cohort: 'Cohort 7',
      week: 'Wk 1'
    },
    {
      student: 'Ngozi Eze',
      score: 88,
      submittedAt: 'Jun 3, 7:55am',
      cohort: 'Cohort 7',
      week: 'Wk 1'
    },
    {
      student: 'Chidi Obi',
      score: 67,
      submittedAt: 'Jun 3, 7:30am',
      cohort: 'Cohort 7',
      week: 'Wk 1'
    },
    {
      student: 'Bola Fashola',
      score: 55,
      submittedAt: 'Jun 3, 7:10am',
      cohort: 'Cohort 7',
      week: 'Wk 1'
    },
    {
      student: 'Kemi Adeyinka',
      score: 0,
      submittedAt: 'Not submitted',
      cohort: 'Cohort 7',
      week: 'Wk 1'
    },
    {
      student: 'James Okafor',
      score: 0,
      submittedAt: 'Not submitted',
      cohort: 'Cohort 7',
      week: 'Wk 1'
    }
  ];

  filteredSubmissions: Submission[] = [];

  performanceBreakdown = [
    { name: 'Ada Okonkwo', value: 94 },
    { name: 'Ngozi Eze', value: 88 },
    { name: 'Emeka Nwosu', value: 77 },
    { name: 'Chidi Obi', value: 67 },
    { name: 'Bola Fashola', value: 55 },
    { name: 'Tolu Adeyemi', value: 51 }
  ];

  pendingSubmissions: PendingSub[] = [
    {
      student: 'Kemi Adeyinka',
      assessment: 'Wk 1 Quiz',
      overdue: true
    },
    {
      student: 'James Okafor',
      assessment: 'Wk 1 Quiz',
      overdue: false
    }
  ];

  summaryStats = {
    avgScore: 0,
    submitted: 0,
    total: 0,
    atRisk: 0,
    pending: 0,
    topScore: 0,
    topStudent: ''
  };

  readonly weekTitles: Record<number, string> = {
    1: 'Foundation for Workplace',
    2: 'Communication & Professional Presence',
    3: 'Career Positioning & Job Readiness',
    4: 'Productivity & Workplace Performance',
    5: 'Workplace Excellence & Growth',
    6: 'Career Direction & Real-World Application'
  };

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAllWeeks();
    this.applyFilters();
  }

  // ── Load all week questions ───────────────────────────────────────────────
  loadAllWeeks(): void {
    this.weeksLoading = true;

    this.http.get<any>(`${this.api}/api/coursework-questions`)
      .subscribe({
        next: (res) => {
          this.allWeeks = res.weeks || [];

          this.weeksLoading = false;

          this.selectWeek(this.activeWeekNum);

          this.cdr.detectChanges();
        },

        error: () => {
          this.weeksLoading = false;

          // Show empty state
          this.selectWeek(this.activeWeekNum);
        }
      });
  }

  // ── Select week ───────────────────────────────────────────────────────────
  selectWeek(w: number): void {
    this.activeWeekNum = w;

    this.editMode = false;

    this.saveError = '';
    this.saveSuccess = '';

    const found = this.allWeeks.find(
      wk => wk.weekNumber === w
    );

    this.activeWeekData = found || null;
  }

  // ── Start edit ────────────────────────────────────────────────────────────
  startEdit(): void {

    if (this.activeWeekData) {

      this.editTitle = this.activeWeekData.weekTitle;

      this.editInstruction = this.activeWeekData.instruction;

      this.editQuestions = [...this.activeWeekData.questions];

      while (this.editQuestions.length < 10) {
        this.editQuestions.push('');
      }

    } else {

      this.editTitle = this.weekTitles[this.activeWeekNum];

      this.editInstruction =
        'Based on what you have learned this week, respond to each real-life workplace scenario clearly and practically.';

      this.editQuestions = new Array(10).fill('');
    }

    this.editMode = true;

    this.saveError = '';
    this.saveSuccess = '';
  }

  cancelEdit(): void {
    this.editMode = false;

    this.saveError = '';
    this.saveSuccess = '';
  }

  // ── Save questions ────────────────────────────────────────────────────────
  saveQuestions(): void {

    this.saveError = '';
    this.saveSuccess = '';

    // Validate
    const empty = this.editQuestions.findIndex(
      q => !q || !q.trim()
    );

    if (empty !== -1) {
      this.saveError =
        `Question ${empty + 1} is empty. All 10 questions are required.`;

      return;
    }

    if (!this.editTitle.trim()) {
      this.saveError = 'Week title is required.';
      return;
    }

    this.saveLoading = true;

    const payload = {
      weekTitle: this.editTitle.trim(),

      instruction: this.editInstruction.trim(),

      questions: this.editQuestions.map(
        q => q.trim()
      )
    };

    this.http.put<any>(
      `${this.api}/api/coursework-questions/${this.activeWeekNum}`,
      payload,
      {
        headers: this.headers
      }
    )
    .subscribe({

      next: (res) => {

        this.saveLoading = false;

        this.saveSuccess =
          `Week ${this.activeWeekNum} questions saved successfully.`;

        this.editMode = false;

        this.activeWeekData = res.week;

        const idx = this.allWeeks.findIndex(
          w => w.weekNumber === this.activeWeekNum
        );

        if (idx !== -1) {
          this.allWeeks[idx] = res.week;
        } else {
          this.allWeeks.push(res.week);
        }

        this.allWeeks.sort(
          (a, b) => a.weekNumber - b.weekNumber
        );

        this.cdr.detectChanges();
      },

      error: (err) => {

        this.saveLoading = false;

        this.saveError =
          err.error?.message || 'Failed to save questions.';
      }
    });
  }

  // ── Publish / unpublish ───────────────────────────────────────────────────
  togglePublish(): void {

    if (!this.activeWeekData) {
      return;
    }

    this.publishLoading = true;

    this.publishError = '';

    const newState = !this.activeWeekData.isPublished;

    this.http.patch<any>(
      `${this.api}/api/coursework-questions/${this.activeWeekNum}/publish`,
      {
        publish: newState
      },
      {
        headers: this.headers
      }
    )
    .subscribe({

      next: (res) => {

        this.publishLoading = false;

        this.activeWeekData!.isPublished = res.isPublished;

        this.activeWeekData!.publishedAt = res.publishedAt;

        const idx = this.allWeeks.findIndex(
          w => w.weekNumber === this.activeWeekNum
        );

        if (idx !== -1) {

          this.allWeeks[idx].isPublished = res.isPublished;

          this.allWeeks[idx].publishedAt = res.publishedAt;
        }

        this.saveSuccess =
          `Week ${this.activeWeekNum} ${
            newState ? 'published' : 'unpublished'
          }.`;

        this.cdr.detectChanges();
      },

      error: (err) => {

        this.publishLoading = false;

        this.publishError =
          err.error?.message ||
          'Failed to update publish status.';
      }
    });
  }

  // ── Score filters ─────────────────────────────────────────────────────────
  setCohort(c: string): void {
    this.activeCohort = c;
    this.applyFilters();
  }

  setScoreWeek(w: string): void {
    this.activeScoreWeek = w;
    this.applyFilters();
  }

  applyFilters(): void {

    let list = this.allSubmissions.filter(
      s =>
        s.cohort === this.activeCohort &&
        s.week === this.activeScoreWeek
    );

    if (this.searchTerm.trim()) {

      const q = this.searchTerm.toLowerCase();

      list = list.filter(
        s => s.student.toLowerCase().includes(q)
      );
    }

    this.filteredSubmissions = list;

    this.computeStats(list);
  }

  // ── Compute stats ─────────────────────────────────────────────────────────
  private computeStats(list: Submission[]): void {

    const scored = list.filter(
      s => s.score > 0
    );

    const avg = scored.length
      ? Math.round(
          scored.reduce(
            (a, s) => a + s.score,
            0
          ) / scored.length
        )
      : 0;

    const top = [...scored].sort(
      (a, b) => b.score - a.score
    )[0];

    this.summaryStats = {
      avgScore: avg,

      submitted: scored.length,

      total: list.length,

      atRisk: scored.filter(
        s => s.score < 60
      ).length,

      pending: list.filter(
        s => s.score === 0
      ).length,

      topScore: top?.score ?? 0,

      topStudent: top?.student ?? '—'
    };
  }

  // ── FIXED METHOD ──────────────────────────────────────────────────────────
  getFilledQuestionsCount(): number {
    return this.editQuestions.filter(
      q => q && q.trim()
    ).length;
  }

  // ── UI helpers ────────────────────────────────────────────────────────────
  scoreClass(score: number): string {

    if (score >= 75) {
      return 'score-high';
    }

    if (score >= 60) {
      return 'score-mid';
    }

    return 'score-low';
  }

  barClass(score: number): string {

    if (score >= 75) {
      return 'green';
    }

    if (score >= 60) {
      return 'amber';
    }

    return 'red';
  }

  getWeekStatus(w: number): string {

    const week = this.allWeeks.find(
      wk => wk.weekNumber === w
    );

    if (!week) {
      return 'empty';
    }

    if (week.isPublished) {
      return 'published';
    }

    return 'draft';
  }

  formatDate(iso: string | null): string {

    if (!iso) {
      return '—';
    }

    return new Date(iso).toLocaleDateString(
      'en-GB',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }

  trackByIndex(i: number): number {
    return i;
  }

  // ── Export PDF ────────────────────────────────────────────────────────────
  exportPDF(): void {

    const iframe = document.createElement('iframe');

    iframe.style.display = 'none';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;

    if (!doc) {
      return;
    }

    doc.open();

    doc.write(`
      <html>
      <head>
        <title>Assessment Scores</title>

        <style>
          body{
            font-family:Arial;
            padding:20px;
          }

          table{
            width:100%;
            border-collapse:collapse;
          }

          th,td{
            border:1px solid #ccc;
            padding:6px;
            font-size:11px;
          }

          th{
            background:#f2f2f2;
          }
        </style>

      </head>

      <body>

        <h2>
          ${this.activeCohort} — ${this.activeScoreWeek} Scores
        </h2>

        <p>
          Generated: ${new Date().toLocaleString()}
        </p>

        <table>

          <thead>
            <tr>
              <th>#</th>
              <th>Student</th>
              <th>Score</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>

          <tbody>

            ${this.filteredSubmissions.map((s, i) => `
              <tr>
                <td>${i + 1}</td>

                <td>${s.student}</td>

                <td>
                  ${s.score > 0 ? s.score + '%' : '—'}
                </td>

                <td>
                  ${s.score > 0 ? 'Graded' : 'Pending'}
                </td>

                <td>${s.submittedAt}</td>
              </tr>
            `).join('')}

          </tbody>

        </table>

      </body>
      </html>
    `);

    doc.close();

    setTimeout(() => {

      iframe.contentWindow?.print();

      document.body.removeChild(iframe);

    }, 400);
  }
}