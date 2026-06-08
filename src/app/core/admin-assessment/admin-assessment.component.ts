// src/app/core/admin-assessment/admin-assessment.component.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface WeekData {
  weekNumber:  number;
  weekTitle:   string;
  instruction: string;
  questions:   string[];
  isPublished: boolean;
  publishedAt: string | null;
  updatedAt:   string | null;
}

// Real submission fetched from server
export interface Submission {
  registrationId: string;
  student:        string;
  email:          string;
  category:       string;
  type:           'weekly' | 'final';
  weekId:         number | null;
  weekLabel:      string;
  submitted:      boolean;
  score:          number | null;
  feedback:       string | null;
  graded:         boolean;
  submittedAt:    string | null;
  answers:        { questionIndex: number; questionText: string; answer: string }[];
}

@Component({
  selector:    'app-admin-assessment',
  templateUrl: './admin-assessment.component.html',
  styleUrls:   ['./admin-assessment.component.css'],
})
export class AdminAssessmentComponent implements OnInit {

  private api     = environment.apiUrl;
  private headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  // ── Tabs ──────────────────────────────────────────────────────────────────
  activeTab: 'scores' | 'questions' = 'questions';

  // ── Week question management ──────────────────────────────────────────────
  allWeeks:     WeekData[] = [];
  weeksLoading  = true;

  activeWeekNum  = 1;
  activeWeekData: WeekData | null = null;

  // ── Edit Mode ─────────────────────────────────────────────────────────────
  editMode        = false;
  editTitle       = '';
  editInstruction = '';
  editQuestions:  string[] = new Array(10).fill('');

  saveLoading  = false;
  saveError    = '';
  saveSuccess  = '';

  // ── Publish ───────────────────────────────────────────────────────────────
  publishLoading = false;
  publishError   = '';

  // ── Submissions (REAL data from server) ──────────────────────────────────
  submissionsLoading   = false;
  submissionsError     = '';
  allSubmissions:      Submission[] = [];
  filteredSubmissions: Submission[] = [];

  // Filters
  activeScoreWeek = 1;        // 1-6 or 0 = Final Exam
  searchTerm      = '';

  // Grading modal
  showGradeModal      = false;
  gradingSubmission:  Submission | null = null;
  gradeScoreInput     = '';
  gradeFeedbackInput  = '';
  gradeLoading        = false;
  gradeError          = '';
  gradeSuccess        = '';

  // Answers preview modal
  showAnswersModal    = false;
  viewingSubmission:  Submission | null = null;

  // Summary stats (computed from filteredSubmissions)
  summaryStats = {
    avgScore: 0, submitted: 0, total: 0,
    atRisk: 0, pending: 0, topScore: 0, topStudent: '',
  };

  // ── Default questions per week ────────────────────────────────────────────
  readonly defaultQuestions: Record<number, string[]> = {
    1: [
      'A colleague starts speaking negatively about your manager and tries to involve you in the conversation during work hours.',
      'You discover that a teammate presented your idea in a meeting without acknowledging you.',
      'Your manager corrects your work sharply in front of others during a meeting.',
      'You missed a deadline due to your own oversight.',
      'A team member is not contributing to a group task, and it is affecting delivery timelines.',
      'A colleague shares confidential information about another employee with you and expects you to keep the conversation going.',
      'During a virtual meeting, you strongly disagree with a point being made while someone else is speaking.',
      'A junior colleague makes a mistake that directly impacts your own work.',
      'Your manager asks for an update on a task that is not yet completed, but is close to completion.',
      'You are working with international colleagues whose communication style feels blunt or too direct.',
    ],
    2: [
      'You receive an email from your manager asking for an urgent update, but the tone feels harsh and demanding.',
      'You sent an important email to a client and noticed immediately after that it contains an error.',
      'A recruiter views your LinkedIn profile but does not reach out. You notice your profile is not getting engagement.',
      'You are asked to introduce yourself in a professional meeting with senior stakeholders.',
      'A colleague sends you a poorly written email that is unclear, and you are unsure what is required.',
      'You are applying for a role and your experience does not perfectly match the job description.',
      'You receive a message from a recruiter asking about your availability, but you are not fully interested in the role.',
      'You notice your LinkedIn profile does not clearly reflect what you do or the value you bring.',
      'During a meeting, you are asked a question you do not know the answer to.',
      'You are communicating with a senior colleague and they respond with very short, direct messages.',
    ],
    3: [
      'You are asked in an interview: Tell me about yourself.',
      'You see a job opportunity you like, but you only meet about 60% of the requirements.',
      'A recruiter asks about your previous experience, and you feel tempted to exaggerate to appear more qualified.',
      'You apply for multiple jobs but receive no response after weeks.',
      'You are given an opportunity to pitch yourself in less than 2 minutes.',
      'You are offered a role, but the salary is lower than expected.',
      'You want to transition into a new career path with little direct experience.',
      'You are asked to provide examples of your work, but you have limited formal experience.',
      'You find a remote job opportunity with global applicants competing for the same role.',
      "After an interview, you feel you didn't perform your best.",
    ],
    4: [
      'You have multiple deadlines due at the same time and limited time to complete them.',
      'You notice you are constantly busy but not making real progress on important tasks.',
      'Your manager gives you a task with unclear instructions.',
      'You are assigned a task using a Microsoft tool you are not familiar with.',
      'You keep getting distracted during work hours.',
      'You are working on a task and realize halfway that you misunderstood the requirement.',
      'Your workload suddenly increases beyond what you can realistically handle.',
      'You are working on repetitive tasks that take too much time daily.',
      'You are part of a team project where timelines are tight and coordination is required.',
      'You complete your tasks early while others are still behind.',
    ],
    5: [
      'A client is unhappy and expresses frustration about your service.',
      'You are feeling mentally drained and unmotivated at work.',
      'You are under pressure to deliver results within a very short timeframe.',
      'A colleague consistently delivers poor-quality work that affects your output.',
      'You need support from another team, but they are unresponsive.',
      'You receive constructive feedback that highlights your weaknesses.',
      'You are working with someone whose personality clashes with yours.',
      'You are given an opportunity to take on more responsibility.',
      'A client makes a request that goes beyond your role or company policy.',
      'You feel stuck in your current role with little growth.',
    ],
    6: [
      'You receive two job offers: one with higher pay but poor growth, and another with lower pay but strong growth potential.',
      'You are placed in a new work environment where expectations are unclear.',
      'You are asked to handle a situation you have never experienced before.',
      'You are working in a fast-paced environment where mistakes are not easily tolerated.',
      'You notice inefficiencies in a process within your team.',
      'You are required to collaborate with people from different cultural and professional backgrounds.',
      'You are given feedback that conflicts with how you see your performance.',
      'You are asked to step into a leadership role unexpectedly.',
      'You experience a major setback in your work or career.',
      'You are asked: What value do you bring to this organization?',
    ],
  };

  readonly weekTitles: Record<number, string> = {
    1: 'Foundation for Workplace',
    2: 'Communication & Professional Presence',
    3: 'Career Positioning & Job Readiness',
    4: 'Productivity & Workplace Performance',
    5: 'Workplace Excellence & Growth',
    6: 'Career Direction & Real-World Application',
  };

  // Week filter options shown above the table. 0 = Final Exam
  readonly scoreWeekOptions: { label: string; value: number }[] = [
    { label: 'Week 1', value: 1 },
    { label: 'Week 2', value: 2 },
    { label: 'Week 3', value: 3 },
    { label: 'Week 4', value: 4 },
    { label: 'Week 5', value: 5 },
    { label: 'Week 6', value: 6 },
    { label: 'Final Exam', value: 0 },
  ];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadAllWeeks();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // WEEK QUESTION MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  loadAllWeeks(): void {
    this.weeksLoading = true;
    this.http.get<any>(`${this.api}/api/coursework-questions`).subscribe({
      next: (res) => {
        this.allWeeks     = res.weeks || [];
        this.weeksLoading = false;
        this.selectWeek(this.activeWeekNum);
        this.cdr.detectChanges();
      },
      error: () => {
        this.weeksLoading = false;
        this.selectWeek(this.activeWeekNum);
      },
    });
  }

  selectWeek(w: number): void {
    this.activeWeekNum  = w;
    this.editMode       = false;
    this.saveError      = '';
    this.saveSuccess    = '';
    this.publishError   = '';
    this.activeWeekData = this.allWeeks.find(wk => wk.weekNumber === w) || null;
  }

  startEdit(): void {
    if (this.activeWeekData) {
      this.editTitle       = this.activeWeekData.weekTitle;
      this.editInstruction = this.activeWeekData.instruction;
      this.editQuestions   = [...this.activeWeekData.questions];
      while (this.editQuestions.length < 10) this.editQuestions.push('');
    } else {
      this.editTitle       = this.weekTitles[this.activeWeekNum];
      this.editInstruction = 'Based on what you have learned this week, respond to each real-life workplace scenario clearly and practically.';
      this.editQuestions   = [...(this.defaultQuestions[this.activeWeekNum] || new Array(10).fill(''))];
    }
    this.editMode    = true;
    this.saveError   = '';
    this.saveSuccess = '';
  }

  cancelEdit(): void {
    this.editMode    = false;
    this.saveError   = '';
    this.saveSuccess = '';
  }

  saveQuestions(): void {
    this.saveError   = '';
    this.saveSuccess = '';

    const empty = this.editQuestions.findIndex(q => !q || !q.trim());
    if (empty !== -1) {
      this.saveError = `Question ${empty + 1} is empty. All 10 questions are required.`;
      return;
    }
    if (!this.editTitle.trim()) {
      this.saveError = 'Week title is required.';
      return;
    }

    this.saveLoading = true;

    const payload = {
      weekTitle:   this.editTitle.trim(),
      instruction: this.editInstruction.trim(),
      questions:   this.editQuestions.map(q => q.trim()),
    };

    this.http.put<any>(
      `${this.api}/api/coursework-questions/${this.activeWeekNum}`,
      payload,
      { headers: this.headers }
    ).subscribe({
      next: (res) => {
        this.saveLoading    = false;
        this.saveSuccess    = `Week ${this.activeWeekNum} questions saved successfully.`;
        this.editMode       = false;
        this.activeWeekData = res.week;

        const idx = this.allWeeks.findIndex(w => w.weekNumber === this.activeWeekNum);
        if (idx !== -1) this.allWeeks[idx] = res.week;
        else            this.allWeeks.push(res.week);
        this.allWeeks.sort((a, b) => a.weekNumber - b.weekNumber);

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saveLoading = false;
        this.saveError   = err.error?.message || 'Failed to save questions.';
      },
    });
  }

  saveDefaultsAndPublish(): void {
    this.saveError      = '';
    this.saveSuccess    = '';
    this.publishError   = '';
    this.publishLoading = true;

    const payload = {
      weekTitle:   this.weekTitles[this.activeWeekNum],
      instruction: 'Based on what you have learned this week, respond to each real-life workplace scenario clearly and practically.',
      questions:   this.defaultQuestions[this.activeWeekNum],
    };

    this.http.put<any>(
      `${this.api}/api/coursework-questions/${this.activeWeekNum}`,
      payload,
      { headers: this.headers }
    ).subscribe({
      next: (res) => {
        this.activeWeekData = res.week;
        const idx = this.allWeeks.findIndex(w => w.weekNumber === this.activeWeekNum);
        if (idx !== -1) this.allWeeks[idx] = res.week;
        else            this.allWeeks.push(res.week);
        this.allWeeks.sort((a, b) => a.weekNumber - b.weekNumber);

        this.http.patch<any>(
          `${this.api}/api/coursework-questions/${this.activeWeekNum}/publish`,
          { publish: true },
          { headers: this.headers }
        ).subscribe({
          next: (pub) => {
            this.publishLoading = false;
            this.activeWeekData!.isPublished = pub.isPublished;
            this.activeWeekData!.publishedAt = pub.publishedAt;
            const i = this.allWeeks.findIndex(w => w.weekNumber === this.activeWeekNum);
            if (i !== -1) {
              this.allWeeks[i].isPublished = pub.isPublished;
              this.allWeeks[i].publishedAt = pub.publishedAt;
            }
            this.saveSuccess = `Week ${this.activeWeekNum} published! Students can now access it.`;
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.publishLoading = false;
            this.publishError   = err.error?.message || 'Questions saved but publish failed. Try the Publish button.';
            this.cdr.detectChanges();
          },
        });
      },
      error: (err) => {
        this.publishLoading = false;
        this.saveError      = err.error?.message || 'Failed to save default questions.';
        this.cdr.detectChanges();
      },
    });
  }

  togglePublish(): void {
    if (!this.activeWeekData) return;

    this.publishLoading = true;
    this.publishError   = '';
    this.saveSuccess    = '';

    const newState = !this.activeWeekData.isPublished;

    this.http.patch<any>(
      `${this.api}/api/coursework-questions/${this.activeWeekNum}/publish`,
      { publish: newState },
      { headers: this.headers }
    ).subscribe({
      next: (res) => {
        this.publishLoading = false;
        this.activeWeekData!.isPublished = res.isPublished;
        this.activeWeekData!.publishedAt = res.publishedAt;

        const idx = this.allWeeks.findIndex(w => w.weekNumber === this.activeWeekNum);
        if (idx !== -1) {
          this.allWeeks[idx].isPublished = res.isPublished;
          this.allWeeks[idx].publishedAt = res.publishedAt;
        }
        this.saveSuccess = `Week ${this.activeWeekNum} ${newState ? 'published — students can now access it' : 'unpublished — hidden from students'}.`;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.publishLoading = false;
        this.publishError   = err.error?.message || 'Failed to update publish status.';
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REAL SUBMISSION DATA
  // ──────────────────────────────────────────────────────────────────────────

  /** Called when switching to the Scores tab or changing week filter */
  loadSubmissions(): void {
    this.submissionsLoading = true;
    this.submissionsError   = '';

    const isFinal = this.activeScoreWeek === 0;
    const url     = isFinal
      ? `${this.api}/api/coursework-questions/submissions?type=final`
      : `${this.api}/api/coursework-questions/submissions?week=${this.activeScoreWeek}`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.allSubmissions     = res.submissions || [];
        this.submissionsLoading = false;
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.submissionsLoading = false;
        this.submissionsError   = err.error?.message || 'Failed to load submissions.';
        this.cdr.detectChanges();
      },
    });
  }

  setScoreWeek(value: number): void {
    this.activeScoreWeek = value;
    this.searchTerm      = '';
    this.loadSubmissions();
  }

  applyFilters(): void {
    let list = [...this.allSubmissions];

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      list = list.filter(s =>
        s.student.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    }

    this.filteredSubmissions = list;
    this.computeStats(list);
  }

  private computeStats(list: Submission[]): void {
    const submitted = list.filter(s => s.submitted);
    const graded    = submitted.filter(s => s.graded && s.score !== null);
    const avg       = graded.length
      ? Math.round(graded.reduce((a, s) => a + s.score!, 0) / graded.length) : 0;
    const top       = [...graded].sort((a, b) => b.score! - a.score!)[0];

    // Max score depends on week type
    const maxScore      = this.activeScoreWeek === 0 ? 40 : 10;
    const atRiskThresh  = maxScore * 0.6;

    this.summaryStats = {
      avgScore:   avg,
      submitted:  submitted.length,
      total:      list.length,
      atRisk:     graded.filter(s => s.score! < atRiskThresh).length,
      pending:    submitted.filter(s => !s.graded).length,
      topScore:   top?.score   ?? 0,
      topStudent: top?.student ?? '—',
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GRADING MODAL
  // ──────────────────────────────────────────────────────────────────────────

  openGradeModal(sub: Submission): void {
    if (!sub.submitted) return;
    this.gradingSubmission = sub;
    this.gradeScoreInput   = sub.score !== null ? String(sub.score) : '';
    this.gradeFeedbackInput = sub.feedback || '';
    this.gradeError        = '';
    this.gradeSuccess      = '';
    this.gradeLoading      = false;
    this.showGradeModal    = true;
    document.body.style.overflow = 'hidden';
  }

  closeGradeModal(): void {
    this.showGradeModal    = false;
    this.gradingSubmission = null;
    document.body.style.overflow = '';
  }

  get maxGradeScore(): number {
    return this.activeScoreWeek === 0 ? 40 : 10;
  }

  submitGrade(): void {
    if (!this.gradingSubmission) return;

    const score = parseFloat(this.gradeScoreInput);
    if (isNaN(score) || score < 0 || score > this.maxGradeScore) {
      this.gradeError = `Score must be between 0 and ${this.maxGradeScore}.`;
      return;
    }

    this.gradeLoading = true;
    this.gradeError   = '';

    const weekId = this.gradingSubmission.weekId !== null
      ? String(this.gradingSubmission.weekId)
      : 'final';

    this.http.patch<any>(
      `${this.api}/api/coursework-questions/submissions/grade`,
      {
        registrationId: this.gradingSubmission.registrationId,
        weekId,
        score,
        feedback: this.gradeFeedbackInput.trim(),
        gradedBy: 'admin',
      },
      { headers: this.headers }
    ).subscribe({
      next: () => {
        // Update local state so the table refreshes immediately
        const sub = this.allSubmissions.find(
          s => s.registrationId === this.gradingSubmission!.registrationId
        );
        if (sub) {
          sub.score    = score;
          sub.feedback = this.gradeFeedbackInput.trim();
          sub.graded   = true;
        }

        this.gradeLoading = false;
        this.gradeSuccess = 'Grade saved and student notified.';
        this.applyFilters();
        this.cdr.detectChanges();

        // Auto-close after 1.5s
        setTimeout(() => this.closeGradeModal(), 1500);
      },
      error: (err) => {
        this.gradeLoading = false;
        this.gradeError   = err.error?.message || 'Failed to save grade.';
        this.cdr.detectChanges();
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ANSWERS PREVIEW MODAL
  // ──────────────────────────────────────────────────────────────────────────

  openAnswersModal(sub: Submission): void {
    this.viewingSubmission = sub;
    this.showAnswersModal  = true;
    document.body.style.overflow = 'hidden';
  }

  closeAnswersModal(): void {
    this.showAnswersModal  = false;
    this.viewingSubmission = null;
    document.body.style.overflow = '';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  getFilledQuestionsCount(): number {
    return this.editQuestions.filter(q => q && q.trim()).length;
  }

  scoreClass(score: number | null, isFinal = false): string {
    if (score === null) return 'score-pending';
    const max  = isFinal ? 40 : 10;
    const pct  = (score / max) * 100;
    return pct >= 75 ? 'score-high' : pct >= 60 ? 'score-mid' : 'score-low';
  }

  scoreDisplay(score: number | null, isFinal = false): string {
    if (score === null) return '—';
    const max = isFinal ? 40 : 10;
    return `${score}/${max}`;
  }

  scorePct(score: number | null, isFinal = false): number {
    if (score === null) return 0;
    const max = isFinal ? 40 : 10;
    return Math.round((score / max) * 100);
  }

  getWeekStatus(w: number): string {
    const week = this.allWeeks.find(wk => wk.weekNumber === w);
    if (!week)            return 'empty';
    if (week.isPublished) return 'published';
    return 'draft';
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  trackByIndex(i: number): number { return i; }

  trackByRegId(_: number, sub: Submission): string { return sub.registrationId; }

  // ── Export PDF ────────────────────────────────────────────────────────────
  exportPDF(): void {
    const isFinal = this.activeScoreWeek === 0;
    const label   = isFinal ? 'Final Exam' : `Week ${this.activeScoreWeek}`;
    const maxScore = isFinal ? 40 : 10;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(`
      <html><head><title>Submission Scores — ${label}</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        h2 { font-size: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 11px; text-align: left; }
        th { background: #f2f2f2; }
        .hi { color: #16a34a; } .mid { color: #ca8a04; } .lo { color: #dc2626; }
      </style>
      </head><body>
      <h2>${label} — Submission Scores</h2>
      <p style="font-size:11px;color:#666;">Generated: ${new Date().toLocaleString()}</p>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Student</th><th>Email</th>
            <th>Score</th><th>%</th><th>Status</th><th>Submitted</th>
          </tr>
        </thead>
        <tbody>
          ${this.filteredSubmissions.map((s, i) => {
            const pct    = s.score !== null ? Math.round((s.score / maxScore) * 100) : null;
            const cls    = pct === null ? '' : pct >= 75 ? 'hi' : pct >= 60 ? 'mid' : 'lo';
            const status = !s.submitted ? 'Not Submitted' : s.graded ? 'Graded' : 'Pending Grade';
            return `<tr>
              <td>${i + 1}</td>
              <td>${s.student}</td>
              <td>${s.email}</td>
              <td class="${cls}">${s.score !== null ? `${s.score}/${maxScore}` : '—'}</td>
              <td class="${cls}">${pct !== null ? pct + '%' : '—'}</td>
              <td>${status}</td>
              <td>${s.submittedAt ? new Date(s.submittedAt).toLocaleString('en-GB') : '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <p style="font-size:10px;color:#999;margin-top:16px;">
        Total: ${this.filteredSubmissions.length} |
        Submitted: ${this.summaryStats.submitted} |
        Graded: ${this.filteredSubmissions.filter(s => s.graded).length} |
        Avg Score: ${this.summaryStats.avgScore}
      </p>
      </body></html>
    `);
    doc.close();
    setTimeout(() => { iframe.contentWindow?.print(); document.body.removeChild(iframe); }, 400);
  }
}