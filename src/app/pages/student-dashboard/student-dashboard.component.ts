// src/app/pages/student-dashboard/student-dashboard.component.ts
// ═══════════════════════════════════════════════════════════════════════════
//  Changes from original:
//  1. Welcome popup shown once on first login (localStorage flag)
//  2. ALL weeks start as 'locked' — unlocked only when admin publishes
//  3. loadStudentProgress() fetches real unlock status from backend
//  4. submitCoursework() posts to real API instead of setTimeout
//  5. submitFinalExam() posts to real API
//  6. loadProgressFromServer() syncs server grades back to student UI
// ═══════════════════════════════════════════════════════════════════════════

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient }                            from '@angular/common/http';
import { environment }                           from '../../../environments/environment';

export type WeekStatus = 'completed' | 'pending' | 'overdue' | 'locked';
export type ActiveTab  = 'dashboard' | 'coursework' | 'assignments' | 'grades';

export interface CourseWeek {
  id:           number;
  title:        string;
  description:  string;
  topics:       string[];
  status:       WeekStatus;
  cwSubmitted:  boolean;
  cwScore:      number | null;
  cwFeedback:   string | null;
  cwGraded:     boolean;
  dueDate:      string;
  cwQuestions:  string[];
  publishedByAdmin: boolean;   // ← NEW: only true when admin publishes this week
}

export interface FinalExamSection {
  title:     string;
  sub:       string;
  questions: string[];
}

export interface StudentProfile {
  registrationId:  string;
  fullName:        string;
  email:           string;
  phone:           string;
  category:        string;
  photo:           string | null;
  assessmentScore: number | null;
  assessmentLevel: string | null;
  enrolledAt:      string;
}

@Component({
  selector:    'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls:   ['./student-dashboard.component.css'],
})
export class StudentDashboardComponent implements OnInit {

  private api = environment.apiUrl;

  // ── UI state ──────────────────────────────────────────────────────────────
  loading   = true;
  activeTab: ActiveTab = 'dashboard';
  student:  StudentProfile | null = null;

  // ── Welcome popup ─────────────────────────────────────────────────────────
  showWelcomePopup = false;

  // ── Alerts ────────────────────────────────────────────────────────────────
  alerts: { type: 'warning' | 'danger' | 'info'; message: string }[] = [];

  // ── Coursework modal ──────────────────────────────────────────────────────
  showCwModal:    boolean       = false;
  activeCwWeek:   CourseWeek | null = null;
  cwModalAnswers: { [idx: number]: string } = {};
  cwSubmitting  = false;
  showCwResult  = false;
  lastSubmittedWeek: CourseWeek | null = null;

  // ── Final exam modal ──────────────────────────────────────────────────────
  showFinalExam:       boolean = false;
  finalAnswers:        { [idx: number]: string } = {};
  finalExamSubmitting: boolean = false;
  finalExamSubmitted:  boolean = false;
  finalExamScore:      number | null = null;
  finalExamFeedback:   string | null = null;
  finalExamGraded:     boolean = false;

  // ── Course weeks — ALL start LOCKED ──────────────────────────────────────
  // publishedByAdmin = false means the week is locked regardless of progress.
  // Admin sets this to true by publishing through admin panel.
  courseWeeks: CourseWeek[] = [
    {
      id: 1, title: 'Foundation for Workplace',
      description: 'Understanding professional identity, values, and work-ready mindset.',
      topics: ['Work identity', 'Professional values', 'Workplace boundaries', 'Work ethic'],
      status: 'locked', cwSubmitted: false, cwScore: null, cwFeedback: null,
      cwGraded: false, dueDate: '', publishedByAdmin: false,
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
      id: 2, title: 'Communication & Professional Presence',
      description: 'Mastering verbal, written, and non-verbal communication in professional environments.',
      topics: ['Email etiquette', 'LinkedIn presence', 'Professional introduction', 'Conflict communication'],
      status: 'locked', cwSubmitted: false, cwScore: null, cwFeedback: null,
      cwGraded: false, dueDate: '', publishedByAdmin: false,
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
      id: 3, title: 'Career Positioning & Job Readiness',
      description: 'Building systems to position yourself effectively for the job market.',
      topics: ['CV strategy', 'Interview skills', 'Career pitch', 'Job search tactics'],
      status: 'locked', cwSubmitted: false, cwScore: null, cwFeedback: null,
      cwGraded: false, dueDate: '', publishedByAdmin: false,
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
      id: 4, title: 'Productivity & Workplace Performance',
      description: 'Building systems that maximize output, reduce burnout, and deliver results consistently.',
      topics: ['Priority frameworks', 'Task management', 'Deadline management', 'Microsoft tools'],
      status: 'locked', cwSubmitted: false, cwScore: null, cwFeedback: null,
      cwGraded: false, dueDate: '', publishedByAdmin: false,
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
      id: 5, title: 'Workplace Excellence & Growth',
      description: 'Developing resilience, excellence, and growth acceleration strategies.',
      topics: ['Client handling', 'Resilience', 'Feedback reception', 'Taking initiative'],
      status: 'locked', cwSubmitted: false, cwScore: null, cwFeedback: null,
      cwGraded: false, dueDate: '', publishedByAdmin: false,
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
      id: 6, title: 'Career Direction & Real-World Application',
      description: 'Applying all learning to real workplace decisions and career acceleration.',
      topics: ['Career mapping', 'Decision making', 'Leadership readiness', 'Value articulation'],
      status: 'locked', cwSubmitted: false, cwScore: null, cwFeedback: null,
      cwGraded: false, dueDate: '', publishedByAdmin: false,
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
    },
  ];

  // ── Final exam sections ───────────────────────────────────────────────────
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
        'You come across a controversial topic online and feel strongly about it.',
      ]
    },
    {
      title: 'Section B: CV, Job Application & Positioning',
      sub: '7 Questions',
      questions: [
        'You are applying for a role. List 3 specific things you will adjust in your CV before submitting.',
        "You are tempted to include experience you don't fully have in your CV.",
        'You are applying for similar roles in different companies with slightly different job descriptions.',
        'Write a short professional email (2–3 lines) to submit your CV for a role.',
        'You submit your CV but receive no response after some time.',
        'You are applying for a role you are qualified for but lack confidence.',
        'You are asked to provide proof of your skills during a hiring process.',
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
        'You receive feedback that your communication is not clear.',
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
        'You feel your role is becoming repetitive and less challenging.',
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
        'You are in a workplace where boundaries are often blurred.',
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
        'You are balancing multiple priorities across different expectations.',
      ]
    },
  ];

  private sectionStarts: number[] = [];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  // ─────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.buildSectionStarts();
    this.setWeekDates();
    this.loadStudentData();
    this.checkWelcomePopup();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WELCOME POPUP
  // ─────────────────────────────────────────────────────────────────────────

  private checkWelcomePopup(): void {
    const seen = localStorage.getItem('c360_welcome_seen');
    if (!seen) {
      // Show after a short delay so the dashboard renders first
      setTimeout(() => {
        this.showWelcomePopup = true;
        this.cdr.detectChanges();
      }, 600);
    }
  }

  closeWelcomePopup(): void {
    this.showWelcomePopup = false;
    localStorage.setItem('c360_welcome_seen', 'true');
    document.body.style.overflow = '';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INIT HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private buildSectionStarts(): void {
    let count = 0;
    this.sectionStarts = this.finalExamSections.map(sec => {
      const start = count;
      count += sec.questions.length;
      return start;
    });
  }

  setWeekDates(): void {
    const base = new Date();
    this.courseWeeks.forEach((w, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + (i + 1) * 7);
      w.dueDate = d.toISOString();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOAD STUDENT DATA
  // ─────────────────────────────────────────────────────────────────────────

  loadStudentData(): void {
    const stored = localStorage.getItem('studentProfile');
    const regId  = localStorage.getItem('studentId');

    if (stored) {
      this.student = JSON.parse(stored);
      this.loadProgressFromServer(this.student!.registrationId);
    } else if (regId) {
      this.http.get<any>(`${this.api}/api/registrations/${regId}`).subscribe({
        next: data => {
          this.student = this.mapStudentData(data);
          localStorage.setItem('studentProfile', JSON.stringify(this.student));
          this.loadProgressFromServer(this.student.registrationId);
        },
        error: () => {
          this.setFallback();
          this.loadProgressFromServer('demo');
        },
      });
    } else {
      this.setFallback();
      this.loading = false;
      this.generateAlerts();
    }
  }

  // Fetch server-side progress: which weeks are published + student grades
  private loadProgressFromServer(registrationId: string): void {
    this.http.get<any>(`${this.api}/api/student/${registrationId}/progress`).subscribe({
      next: data => {
        // Apply published weeks from admin
        if (data.publishedWeeks && Array.isArray(data.publishedWeeks)) {
          data.publishedWeeks.forEach((pw: any) => {
            const week = this.courseWeeks.find(w => w.id === pw.weekId);
            if (week) {
              week.publishedByAdmin = true;
              week.dueDate         = pw.dueDate || week.dueDate;
              // Unlock first published week
              if (week.status === 'locked') week.status = 'pending';
            }
          });
        }

        // Apply student's submission + grading data
        if (data.weekProgress) {
          Object.keys(data.weekProgress).forEach(wid => {
            const progress = data.weekProgress[wid];
            const week     = this.courseWeeks.find(w => w.id === Number(wid));
            if (week) {
              week.cwSubmitted = progress.submitted  ?? week.cwSubmitted;
              week.cwScore     = progress.score      ?? week.cwScore;
              week.cwFeedback  = progress.feedback   ?? null;
              week.cwGraded    = progress.graded     ?? false;
              if (progress.submitted) {
                week.status = 'completed';
                // Unlock next week if admin has published it
                const next = this.courseWeeks.find(w => w.id === week.id + 1);
                if (next && next.publishedByAdmin && next.status === 'locked') {
                  next.status = 'pending';
                }
              }
            }
          });
        }

        // Apply final exam data
        if (data.finalExam) {
          this.finalExamSubmitted = data.finalExam.submitted ?? false;
          this.finalExamScore     = data.finalExam.score     ?? null;
          this.finalExamFeedback  = data.finalExam.feedback  ?? null;
          this.finalExamGraded    = data.finalExam.graded    ?? false;
        }

        this.loading = false;
        this.generateAlerts();
        this.cdr.detectChanges();
      },
      error: () => {
        // Fallback: restore from localStorage if server is unreachable
        const weeksSt = localStorage.getItem('c360_weeks');
        const finalSt = localStorage.getItem('c360_final');
        if (weeksSt) {
          const parsed = JSON.parse(weeksSt);
          parsed.forEach((s: any, i: number) => {
            if (i < this.courseWeeks.length) {
              this.courseWeeks[i].cwSubmitted = s.cwSubmitted;
              this.courseWeeks[i].cwScore     = s.cwScore;
              this.courseWeeks[i].status      = s.status;
            }
          });
        }
        if (finalSt) {
          const f = JSON.parse(finalSt);
          this.finalExamSubmitted = f.submitted;
          this.finalExamScore     = f.score;
        }
        this.loading = false;
        this.generateAlerts();
        this.cdr.detectChanges();
      },
    });
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
      assessmentScore: data.assessmentScore ?? null,
      assessmentLevel: data.assessmentLevel ?? null,
      enrolledAt:      data.submittedAt,
    };
  }

  private setFallback(): void {
    this.student = {
      registrationId: 'demo', fullName: 'Student', email: '',
      phone: '', category: 'nysc', photo: null,
      assessmentScore: null, assessmentLevel: null,
      enrolledAt: new Date().toISOString(),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPUTED GETTERS
  // ─────────────────────────────────────────────────────────────────────────

  get completionRate():  number  { return Math.round((this.completedCount / this.courseWeeks.length) * 100); }
  get completedCount():  number  { return this.courseWeeks.filter(w => w.status === 'completed').length; }
  get pendingCount():    number  { return this.courseWeeks.filter(w => w.status === 'pending').length; }
  get overdueCount():    number  { return this.courseWeeks.filter(w => w.status === 'overdue').length; }
  get enrolledWeeksLabel(): string { return `${this.completedCount} of 6 weeks complete`; }

  get canTakeFinalExam(): boolean {
    return this.courseWeeks.every(w => w.status === 'completed');
  }

  get averageScoreLabel(): string {
    const scored = this.courseWeeks.filter(w => w.cwScore !== null && w.cwGraded);
    if (!scored.length) return '—';
    const avg = scored.reduce((s, w) => s + w.cwScore!, 0) / scored.length;
    return Math.round(avg * 10) + '%';
  }

  get avatarInitials(): string {
    if (!this.student?.fullName) return 'S';
    return this.student.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  get cwAnsweredCount(): number {
    return Object.values(this.cwModalAnswers).filter(v => v.trim().length >= 10).length;
  }

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
    const allLocked = this.courseWeeks.every(w => !w.publishedByAdmin);

    if (allLocked) {
      this.alerts.push({
        type: 'info',
        message: 'Your coursework will be available no later than June 7th. Check your email for updates.',
      });
    }
    if (overdue.length) {
      this.alerts.push({ type: 'danger', message: `${overdue.length} week(s) are overdue. Please complete immediately.` });
    }
    if (pending.length && !allLocked) {
      this.alerts.push({ type: 'warning', message: `${pending.length} week(s) have pending coursework.` });
    }
    if (this.completionRate === 100 && !this.finalExamSubmitted) {
      this.alerts.push({ type: 'info', message: 'All 6 weeks complete — your Final Assessment is now unlocked!' });
    }
  }

  dismissAlert(i: number): void { this.alerts.splice(i, 1); }

  // ─────────────────────────────────────────────────────────────────────────
  // COURSEWORK MODAL
  // ─────────────────────────────────────────────────────────────────────────

  openCwModal(week: CourseWeek): void {
    if (week.status === 'locked' || !week.publishedByAdmin) return;
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
    this.cwModalAnswers[idx] = (event.target as HTMLTextAreaElement).value;
    this.cdr.detectChanges();
  }

  submitCoursework(): void {
    if (!this.activeCwWeek || this.cwAnsweredCount < 10) return;
    this.cwSubmitting = true;

    const week    = this.activeCwWeek;
    const answers = week.cwQuestions.map((q, i) => ({
      questionIndex: i,
      questionText:  q,
      answer:        this.cwModalAnswers[i] || '',
    }));

    const payload = {
      registrationId: this.student?.registrationId,
      studentName:    this.student?.fullName,
      studentEmail:   this.student?.email,
      weekId:         week.id,
      weekTitle:      week.title,
      answers,
    };

    this.http.post(`${this.api}/api/coursework`, payload).subscribe({
      next: () => {
        week.cwSubmitted = true;
        week.status      = 'completed';
        // Unlock next week if admin published it
        const next = this.courseWeeks.find(w => w.id === week.id + 1);
        if (next && next.publishedByAdmin && next.status === 'locked') next.status = 'pending';

        this.lastSubmittedWeek = week;
        this.saveLocalState();
        this.cwSubmitting  = false;
        this.showCwModal   = false;
        this.showCwResult  = true;
        this.generateAlerts();
        document.body.style.overflow = 'hidden';
        this.cdr.detectChanges();
      },
      error: () => {
        alert('Submission failed. Please check your connection and try again.');
        this.cwSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  closeCwResult(): void { this.showCwResult = false; document.body.style.overflow = ''; }

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

  closeFinalExam(): void { this.showFinalExam = false; document.body.style.overflow = ''; }

  onFinalAnswer(idx: number, event: Event): void {
    this.finalAnswers[idx] = (event.target as HTMLTextAreaElement).value;
    this.cdr.detectChanges();
  }

  submitFinalExam(): void {
    if (this.finalAnsweredCount < 40) return;
    this.finalExamSubmitting = true;

    // Build full answer list with section metadata
    const answers: any[] = [];
    let globalIdx = 0;
    this.finalExamSections.forEach(sec => {
      sec.questions.forEach(q => {
        answers.push({
          questionIndex: globalIdx,
          sectionTitle:  sec.title,
          questionText:  q,
          answer:        this.finalAnswers[globalIdx] || '',
        });
        globalIdx++;
      });
    });

    const payload = {
      registrationId: this.student?.registrationId,
      studentName:    this.student?.fullName,
      studentEmail:   this.student?.email,
      answers,
    };

    this.http.post(`${this.api}/api/final-exam`, payload).subscribe({
      next: () => {
        this.finalExamScore     = 40;
        this.finalExamSubmitted = true;
        this.finalExamSubmitting = false;
        localStorage.setItem('c360_final', JSON.stringify({ submitted: true, score: 40 }));
        this.generateAlerts();
        this.cdr.detectChanges();
      },
      error: () => {
        alert('Final exam submission failed. Please check your connection and try again.');
        this.finalExamSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PERSISTENCE
  // ─────────────────────────────────────────────────────────────────────────

  private saveLocalState(): void {
    localStorage.setItem('c360_weeks', JSON.stringify(
      this.courseWeeks.map(w => ({ cwSubmitted: w.cwSubmitted, cwScore: w.cwScore, status: w.status }))
    ));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  setTab(tab: ActiveTab): void { this.activeTab = tab; }

  statusLabel(s: WeekStatus): string {
    return { completed: 'Completed', pending: 'Pending', overdue: 'Overdue', locked: 'Locked' }[s] ?? s;
  }

  categoryLabel(c: string): string { return c === 'nysc' ? 'NYSC / Awaiting' : 'Graduate / Pro'; }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  getWordCount(val: string | undefined): number {
    if (!val?.trim()) return 0;
    return val.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  getFinalQNum(section: FinalExamSection, localIndex: number): number {
    const idx = this.finalExamSections.indexOf(section);
    return this.sectionStarts[idx] + localIndex + 1;
  }

  getGradeLabel(score: number | null): string {
    if (score === null) return '<span class="grade-na">Pending</span>';
    const pct = Math.round(score / 10 * 100);
    if (pct >= 80) return '<span class="grade-a">A</span>';
    if (pct >= 70) return '<span class="grade-b">B</span>';
    if (pct >= 60) return '<span class="grade-c">C</span>';
    return '<span class="grade-f">F</span>';
  }

  getFinalGradeLabel(): string {
    if (this.finalExamScore === null) return '<span class="grade-na">Pending</span>';
    const pct = Math.round(this.finalExamScore / 40 * 100);
    if (pct >= 80) return '<span class="grade-a">A</span>';
    if (pct >= 70) return '<span class="grade-b">B</span>';
    if (pct >= 60) return '<span class="grade-c">C</span>';
    return '<span class="grade-f">F</span>';
  }
}