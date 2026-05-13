// src/app/student/student-dashboard/student-dashboard.component.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type WeekStatus = 'completed' | 'pending' | 'overdue' | 'locked';
export type ActiveTab  = 'dashboard' | 'coursework' | 'assignments' | 'grades';

export interface CourseWeek {
  id: number;
  title: string;
  description: string;
  topics: string[];
  status: WeekStatus;
  cwSubmitted: boolean;
  cwScore: number | null;         // out of 10 (instructor-graded; we store answered count)
  dueDate: string;
  cwQuestions: string[];          // 10 open-ended scenario questions
}

export interface FinalExamSection {
  title: string;
  sub: string;
  questions: string[];
}

export interface StudentProfile {
  registrationId: string;
  fullName: string;
  email: string;
  phone: string;
  category: string;
  photo: string | null;
  assessmentScore: number | null;
  assessmentLevel: string | null;
  enrolledAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit {

  private api = environment.apiUrl;

  // ── UI State ──────────────────────────────────────────────────────────────
  loading   = true;
  activeTab: ActiveTab = 'dashboard';
  student: StudentProfile | null = null;

  // ── Alerts ────────────────────────────────────────────────────────────────
  alerts: { type: 'warning' | 'danger' | 'info'; message: string }[] = [];

  // ── Coursework modal ──────────────────────────────────────────────────────
  showCwModal    = false;
  activeCwWeek: CourseWeek | null = null;
  cwModalAnswers: { [idx: number]: string } = {};
  cwSubmitting   = false;
  showCwResult   = false;
  lastSubmittedWeek: CourseWeek | null = null;

  // ── Final exam modal ──────────────────────────────────────────────────────
  showFinalExam        = false;
  finalAnswers: { [idx: number]: string } = {};
  finalExamSubmitting  = false;
  finalExamSubmitted   = false;
  finalExamScore: number | null = null;

  // ── Course weeks (6 weeks — open-ended scenario questions from doc) ────────
  courseWeeks: CourseWeek[] = [
    {
      id: 1,
      title: 'Foundation for Workplace',
      description: 'Understanding professional identity, values, and work-ready mindset.',
      topics: ['Work identity', 'Professional values', 'Workplace boundaries', 'Work ethic'],
      status: 'pending', cwSubmitted: false, cwScore: null, dueDate: '',
      cwQuestions: [
        'A colleague starts speaking negatively about your manager and tries to involve you in the conversation during work hours.',
        'You discover that a teammate presented your idea in a meeting without acknowledging you.',
        'Your manager corrects your work sharply in front of others during a meeting.',
        'You missed a deadline due to your own oversight.',
        'A team member is not contributing to a group task, and it is affecting delivery timelines.',
        'A colleague shares confidential information about another employee with you and expects you to keep the conversation going.',
        'During a virtual meeting, you strongly disagree with a point being made while someone else is speaking.',
        'A junior colleague makes a mistake that directly impacts your own work.',
        'Your manager asks for an update on a task that is not yet completed, but is close to completion.',
        'You are working with international colleagues whose communication style feels blunt or too direct.'
      ]
    },
    {
      id: 2,
      title: 'Communication & Professional Presence',
      description: 'Mastering verbal, written, and non-verbal communication in professional environments.',
      topics: ['Email etiquette', 'LinkedIn presence', 'Professional introduction', 'Conflict communication'],
      status: 'pending', cwSubmitted: false, cwScore: null, dueDate: '',
      cwQuestions: [
        'You receive an email from your manager asking for an urgent update, but the tone feels harsh and demanding.',
        'You sent an important email to a client and noticed immediately after that it contains an error.',
        'A recruiter views your LinkedIn profile but does not reach out. You notice your profile is not getting engagement.',
        'You are asked to introduce yourself in a professional meeting with senior stakeholders.',
        'A colleague sends you a poorly written email that is unclear, and you are unsure what is required.',
        'You are applying for a role and your experience does not perfectly match the job description.',
        'You receive a message from a recruiter asking about your availability, but you are not fully interested in the role.',
        'You notice your LinkedIn profile does not clearly reflect what you do or the value you bring.',
        'During a meeting, you are asked a question you do not know the answer to.',
        'You are communicating with a senior colleague and they respond with very short, direct messages.'
      ]
    },
    {
      id: 3,
      title: 'Career Positioning & Job Readiness',
      description: 'Building systems to position yourself effectively for the job market.',
      topics: ['CV strategy', 'Interview skills', 'Career pitch', 'Job search tactics'],
      status: 'pending', cwSubmitted: false, cwScore: null, dueDate: '',
      cwQuestions: [
        'You are asked in an interview: Tell me about yourself.',
        'You see a job opportunity you like, but you only meet about 60% of the requirements.',
        'A recruiter asks about your previous experience, and you feel tempted to exaggerate to appear more qualified.',
        'You apply for multiple jobs but receive no response after weeks.',
        'You are given an opportunity to pitch yourself in less than 2 minutes.',
        'You are offered a role, but the salary is lower than expected.',
        'You want to transition into a new career path with little direct experience.',
        'You are asked to provide examples of your work, but you have limited formal experience.',
        'You find a remote job opportunity with global applicants competing for the same role.',
        'After an interview, you feel you didn\'t perform your best.'
      ]
    },
    {
      id: 4,
      title: 'Productivity & Workplace Performance',
      description: 'Building systems that maximize output, reduce burnout, and deliver results consistently.',
      topics: ['Priority frameworks', 'Task management', 'Deadline management', 'Microsoft tools'],
      status: 'locked', cwSubmitted: false, cwScore: null, dueDate: '',
      cwQuestions: [
        'You have multiple deadlines due at the same time and limited time to complete them.',
        'You notice you are constantly busy but not making real progress on important tasks.',
        'Your manager gives you a task with unclear instructions.',
        'You are assigned a task using a Microsoft tool you are not familiar with.',
        'You keep getting distracted during work hours.',
        'You are working on a task and realize halfway that you misunderstood the requirement.',
        'Your workload suddenly increases beyond what you can realistically handle.',
        'You are working on repetitive tasks that take too much time daily.',
        'You are part of a team project where timelines are tight and coordination is required.',
        'You complete your tasks early while others are still behind.'
      ]
    },
    {
      id: 5,
      title: 'Workplace Excellence & Growth',
      description: 'Developing resilience, excellence, and growth acceleration strategies.',
      topics: ['Client handling', 'Resilience', 'Feedback reception', 'Taking initiative'],
      status: 'locked', cwSubmitted: false, cwScore: null, dueDate: '',
      cwQuestions: [
        'A client is unhappy and expresses frustration about your service.',
        'You are feeling mentally drained and unmotivated at work.',
        'You are under pressure to deliver results within a very short timeframe.',
        'A colleague consistently delivers poor-quality work that affects your output.',
        'You need support from another team, but they are unresponsive.',
        'You receive constructive feedback that highlights your weaknesses.',
        'You are working with someone whose personality clashes with yours.',
        'You are given an opportunity to take on more responsibility.',
        'A client makes a request that goes beyond your role or company policy.',
        'You feel stuck in your current role with little growth.'
      ]
    },
    {
      id: 6,
      title: 'Career Direction & Real-World Application',
      description: 'Applying all learning to real workplace decisions and career acceleration.',
      topics: ['Career mapping', 'Decision making', 'Leadership readiness', 'Value articulation'],
      status: 'locked', cwSubmitted: false, cwScore: null, dueDate: '',
      cwQuestions: [
        'You receive two job offers: one with higher pay but poor growth, and another with lower pay but strong growth potential.',
        'You are placed in a new work environment where expectations are unclear.',
        'You are asked to handle a situation you have never experienced before.',
        'You are working in a fast-paced environment where mistakes are not easily tolerated.',
        'You notice inefficiencies in a process within your team.',
        'You are required to collaborate with people from different cultural and professional backgrounds.',
        'You are given feedback that conflicts with how you see your performance.',
        'You are asked to step into a leadership role unexpectedly.',
        'You experience a major setback in your work or career.',
        'You are asked: What value do you bring to this organization?'
      ]
    }
  ];

  // ── Final exam sections (from uploaded doc — 40 questions, 6 sections) ────
  finalExamSections: FinalExamSection[] = [
    {
      title: 'Section A: LinkedIn, Personal Brand & Professional Identity',
      sub: '8 Questions',
      questions: [
        'Your LinkedIn headline currently says: "Job Seeker | Open to Opportunities." Rewrite it to reflect a clear professional identity and value.',
        'Write a short LinkedIn "About" section (3–5 lines) that positions you professionally.',
        'You notice your LinkedIn posts are not aligned with your career goals.',
        'You see a trending post where people are criticizing their employers publicly.',
        'A recruiter visits your LinkedIn profile but does not reach out.',
        'List 3 types of posts you would consistently share on LinkedIn to build your personal brand.',
        'You want to position yourself as a professional in a specific field but have limited experience.',
        'You come across a controversial topic online and feel strongly about it.'
      ]
    },
    {
      title: 'Section B: CV, Job Application & Positioning',
      sub: '7 Questions',
      questions: [
        'You are applying for a role. List 3 specific things you will adjust in your CV before submitting.',
        'You are tempted to include experience you don\'t fully have in your CV.',
        'You are applying for similar roles in different companies with slightly different job descriptions.',
        'Write a short professional email (2–3 lines) to submit your CV for a role.',
        'You submit your CV but receive no response after some time.',
        'You are applying for a role you are qualified for but lack confidence.',
        'You are asked to provide proof of your skills during a hiring process.'
      ]
    },
    {
      title: 'Section C: Communication, Email & Workplace Presence',
      sub: '7 Questions',
      questions: [
        'You receive an email with instructions but do not fully understand what is required.',
        'Write a short email acknowledging receipt of a task from your manager.',
        'You complete a task but your manager has not followed up.',
        'You are in a meeting and realize you misunderstood a previous instruction.',
        'You are required to give an update on your work progress.',
        'You are communicating with a busy senior colleague who gives minimal responses.',
        'You receive feedback that your communication is not clear.'
      ]
    },
    {
      title: 'Section D: Workplace Mindset, Responsibility & Growth',
      sub: '6 Questions',
      questions: [
        'You are given additional responsibilities outside your job description without immediate salary increase.',
        'You feel your salary does not match your workload.',
        'You are offered a learning opportunity that requires extra effort outside work hours.',
        'You see others getting ahead faster than you in their careers.',
        'You are assigned a task that stretches your current ability.',
        'You feel your role is becoming repetitive and less challenging.'
      ]
    },
    {
      title: 'Section E: Workplace Behavior, Etiquette & Professionalism',
      sub: '6 Questions',
      questions: [
        'You observe colleagues engaging in unprofessional behavior in the workplace.',
        'You are in a workplace where people casually ignore structure and process.',
        'You are copied in an email where there is tension between two colleagues.',
        'You notice someone consistently fails to acknowledge emails or messages.',
        'You are asked to handle a situation involving a dissatisfied internal stakeholder.',
        'You are in a workplace where boundaries are often blurred.'
      ]
    },
    {
      title: 'Section F: Performance, Productivity & Burnout',
      sub: '6 Questions',
      questions: [
        'You feel overwhelmed with multiple responsibilities and tight deadlines.',
        'You notice your productivity dropping over time.',
        'You are working hard but not seeing visible results.',
        'You are required to deliver under pressure consistently.',
        'You realize you are close to burnout.',
        'You are balancing multiple priorities across different expectations.'
      ]
    }
  ];

  // ── Section start indices (for getFinalQNum helper) ───────────────────────
  private sectionStarts: number[] = [];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  // ─────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.buildSectionStarts();
    this.setWeekDates();
    this.loadStudentData();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INIT HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /** Pre-compute the global question start index for each final exam section */
  private buildSectionStarts(): void {
    let count = 0;
    this.sectionStarts = this.finalExamSections.map(sec => {
      const start = count;
      count += sec.questions.length;
      return start;
    });
  }

  /** Assign rolling due dates from today (+7 days per week) */
  setWeekDates(): void {
    const base = new Date();
    this.courseWeeks.forEach((w, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + (i + 1) * 7);
      w.dueDate = d.toISOString();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOAD STUDENT
  // ─────────────────────────────────────────────────────────────────────────

  loadStudentData(): void {
    const stored  = localStorage.getItem('studentProfile');
    const regId   = localStorage.getItem('studentId');
    const weeksSt = localStorage.getItem('c360_weeks');
    const finalSt = localStorage.getItem('c360_final');

    // Restore week progress
    if (weeksSt) {
      const parsed: Pick<CourseWeek, 'cwSubmitted' | 'cwScore' | 'status'>[] = JSON.parse(weeksSt);
      parsed.forEach((s, i) => {
        this.courseWeeks[i].cwSubmitted = s.cwSubmitted;
        this.courseWeeks[i].cwScore    = s.cwScore;
        this.courseWeeks[i].status     = s.status;
      });
    }

    // Restore final exam state
    if (finalSt) {
      const f = JSON.parse(finalSt);
      this.finalExamSubmitted = f.submitted;
      this.finalExamScore     = f.score;
    }

    if (stored) {
      this.student = JSON.parse(stored);
      this.loading = false;
      this.generateAlerts();
      return;
    }

    if (regId) {
      this.http.get<any>(`${this.api}/api/registrations/${regId}`).subscribe({
        next: (data) => {
          this.student = this.mapStudentData(data);
          localStorage.setItem('studentProfile', JSON.stringify(this.student));
          this.loading = false;
          this.generateAlerts();
        },
        error: () => {
          this.setFallback();
          this.loading = false;
          this.generateAlerts();
        }
      });
    } else {
      this.setFallback();
      this.loading = false;
      this.generateAlerts();
    }
  }

  private mapStudentData(data: any): StudentProfile {
    return {
      registrationId: data.registrationId || data._id,
      fullName:       data.fullName,
      email:          data.email,
      phone:          data.phone,
      category:       data.category,
      photo:          data.files?.photo
                        ? `${this.api}/api/registrations/${data.registrationId}/file/${data.files.photo}`
                        : null,
      assessmentScore:  data.assessmentScore  ?? null,
      assessmentLevel:  data.assessmentLevel  ?? null,
      enrolledAt:       data.submittedAt
    };
  }

  private setFallback(): void {
    this.student = {
      registrationId: 'demo',
      fullName:       'Student',
      email:          '',
      phone:          '',
      category:       'nysc',
      photo:          null,
      assessmentScore: null,
      assessmentLevel: null,
      enrolledAt:     new Date().toISOString()
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPUTED GETTERS
  // ─────────────────────────────────────────────────────────────────────────

  get completionRate(): number {
    const done = this.courseWeeks.filter(w => w.status === 'completed').length;
    return Math.round((done / this.courseWeeks.length) * 100);
  }

  get completedCount(): number {
    return this.courseWeeks.filter(w => w.status === 'completed').length;
  }

  get pendingCount(): number {
    return this.courseWeeks.filter(w => w.status === 'pending').length;
  }

  get overdueCount(): number {
    return this.courseWeeks.filter(w => w.status === 'overdue').length;
  }

  get averageScoreLabel(): string {
    const scored = this.courseWeeks.filter(w => w.cwScore !== null);
    if (!scored.length) return '—';
    const avg = scored.reduce((s, w) => s + w.cwScore!, 0) / scored.length;
    return Math.round(avg * 10) + '%';
  }

  get canTakeFinalExam(): boolean {
    return this.courseWeeks.every(w => w.status === 'completed');
  }

  get enrolledWeeksLabel(): string {
    return `${this.completedCount} of 6 weeks complete`;
  }

  get avatarInitials(): string {
    if (!this.student?.fullName) return 'S';
    return this.student.fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  /** Count coursework answers with ≥10 chars as "answered" */
  get cwAnsweredCount(): number {
    return Object.values(this.cwModalAnswers).filter(v => v.trim().length >= 10).length;
  }

  /** Count final exam answers with ≥10 chars as "answered" */
  get finalAnsweredCount(): number {
    return Object.values(this.finalAnswers).filter(v => v.trim().length >= 10).length;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ALERTS
  // ─────────────────────────────────────────────────────────────────────────

  generateAlerts(): void {
    this.alerts = [];
    const overdue = this.courseWeeks.filter(w => w.status === 'overdue');
    const pending = this.courseWeeks.filter(w => w.status === 'pending' && !w.cwSubmitted);

    if (overdue.length) {
      this.alerts.push({
        type: 'danger',
        message: `${overdue.length} week${overdue.length > 1 ? 's are' : ' is'} overdue. Please complete immediately.`
      });
    }
    if (pending.length) {
      this.alerts.push({
        type: 'warning',
        message: `${pending.length} week${pending.length > 1 ? 's have' : ' has'} pending coursework.`
      });
    }
    if (this.completionRate === 100 && !this.finalExamSubmitted) {
      this.alerts.push({
        type: 'info',
        message: 'All 6 weeks complete — your Final Assessment is now unlocked!'
      });
    }
  }

  dismissAlert(i: number): void {
    this.alerts.splice(i, 1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COURSEWORK MODAL
  // ─────────────────────────────────────────────────────────────────────────

  openCwModal(week: CourseWeek): void {
    if (week.status === 'locked') return;
    this.activeCwWeek   = week;
    this.cwModalAnswers = {};
    this.cwSubmitting   = false;
    this.showCwModal    = true;
    document.body.style.overflow = 'hidden';
  }

  closeCwModal(): void {
    this.showCwModal = false;
    document.body.style.overflow = '';
  }

  onCwAnswer(idx: number, event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    this.cwModalAnswers[idx] = val;
    this.cdr.detectChanges();
  }

  submitCoursework(): void {
    if (!this.activeCwWeek) return;
    if (this.cwAnsweredCount < 10) return;

    this.cwSubmitting = true;

    // Simulate async submit (replace with real API call)
    setTimeout(() => {
      const week = this.activeCwWeek!;
      week.cwSubmitted = true;
      week.cwScore     = this.cwAnsweredCount; // 10/10 — instructor will review text
      this.checkWeekCompletion(week);
      this.lastSubmittedWeek = week;
      this.saveState();
      this.cwSubmitting  = false;
      this.showCwModal   = false;
      this.showCwResult  = true;
      this.generateAlerts();
      document.body.style.overflow = 'hidden';
      this.cdr.detectChanges();
    }, 900);
  }

  closeCwResult(): void {
    this.showCwResult = false;
    document.body.style.overflow = '';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FINAL EXAM
  // ─────────────────────────────────────────────────────────────────────────

  openFinalExam(): void {
    if (!this.canTakeFinalExam) return;
    this.finalAnswers        = {};
    this.finalExamSubmitting = false;
    this.showFinalExam       = true;
    document.body.style.overflow = 'hidden';
  }

  closeFinalExam(): void {
    this.showFinalExam = false;
    document.body.style.overflow = '';
  }

  onFinalAnswer(idx: number, event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    this.finalAnswers[idx] = val;
    this.cdr.detectChanges();
  }

  submitFinalExam(): void {
    if (this.finalAnsweredCount < 40) return;
    this.finalExamSubmitting = true;

    setTimeout(() => {
      this.finalExamScore      = this.finalAnsweredCount; // 40/40 — instructor reviews
      this.finalExamSubmitted  = true;
      this.finalExamSubmitting = false;
      localStorage.setItem('c360_final', JSON.stringify({
        submitted: true,
        score:     this.finalExamScore
      }));
      this.generateAlerts();
      this.cdr.detectChanges();
    }, 1000);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WEEK COMPLETION LOGIC
  // ─────────────────────────────────────────────────────────────────────────

  private checkWeekCompletion(week: CourseWeek): void {
    if (week.cwSubmitted) {
      week.status = 'completed';
      // Unlock next week
      const next = this.courseWeeks.find(w => w.id === week.id + 1);
      if (next && next.status === 'locked') next.status = 'pending';
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PERSISTENCE
  // ─────────────────────────────────────────────────────────────────────────

  private saveState(): void {
    localStorage.setItem('c360_weeks', JSON.stringify(
      this.courseWeeks.map(w => ({
        cwSubmitted: w.cwSubmitted,
        cwScore:     w.cwScore,
        status:      w.status
      }))
    ));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  setTab(tab: ActiveTab): void {
    this.activeTab = tab;
  }

  statusLabel(s: WeekStatus): string {
    const map: Record<WeekStatus, string> = {
      completed: 'Completed',
      pending:   'Pending',
      overdue:   'Overdue',
      locked:    'Locked'
    };
    return map[s] ?? s;
  }

  categoryLabel(c: string): string {
    return c === 'nysc' ? 'NYSC / Awaiting' : 'Graduate / Pro';
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  getWordCount(val: string | undefined): number {
    if (!val || !val.trim()) return 0;
    return val.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Returns the 1-based global question number for a question inside a section.
   * Used in the final exam template to track answers by global index.
   */
  getFinalQNum(section: FinalExamSection, localIndex: number): number {
    const sectionIdx = this.finalExamSections.indexOf(section);
    return this.sectionStarts[sectionIdx] + localIndex + 1;
  }

  /** Returns an HTML string for the grade badge based on score out of 10 */
  getGradeLabel(score: number | null): string {
    if (score === null) return '<span class="grade-na">N/A</span>';
    const pct = Math.round(score / 10 * 100);
    if (pct >= 80) return '<span class="grade-a">A</span>';
    if (pct >= 70) return '<span class="grade-b">B</span>';
    if (pct >= 60) return '<span class="grade-c">C</span>';
    return '<span class="grade-f">F</span>';
  }

  /** Returns grade badge HTML for the final exam (out of 40) */
  getFinalGradeLabel(): string {
    if (this.finalExamScore === null) return '<span class="grade-na">N/A</span>';
    const pct = Math.round(this.finalExamScore / 40 * 100);
    if (pct >= 80) return '<span class="grade-a">A</span>';
    if (pct >= 70) return '<span class="grade-b">B</span>';
    if (pct >= 60) return '<span class="grade-c">C</span>';
    return '<span class="grade-f">F</span>';
  }
}