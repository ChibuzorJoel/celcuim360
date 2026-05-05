// src/app/student/student-dashboard/student-dashboard.component.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type WeekStatus = 'completed' | 'pending' | 'overdue' | 'locked';
export type ActiveTab = 'dashboard' | 'coursework' | 'assignments' | 'grades';

export interface QuizQuestion {
  id: string;
  text: string;
  options: { key: string; label: string }[];
  correctKey: string;
}

export interface CourseWeek {
  id: number;
  title: string;
  description: string;
  topics: string[];
  status: WeekStatus;
  score: number | null;
  quizScore: number | null;
  courseworkSubmitted: boolean;
  quizCompleted: boolean;
  dueDate: string;
  quizQuestions: QuizQuestion[];
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

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit {

  private api = environment.apiUrl;

  // ── State ──────────────────────────────────────────────────────────────────
  activeTab: ActiveTab = 'dashboard';
  loading = true;
  student: StudentProfile | null = null;

  // ── Quiz modal ─────────────────────────────────────────────────────────────
  showQuizModal = false;
  activeQuiz: CourseWeek | null = null;
  quizAnswers: Map<string, string> = new Map();
  quizSubmitting = false;
  quizResult: { score: number; total: number; percentage: number } | null = null;
  quizSubmitted = false;

  // ── Coursework submission ──────────────────────────────────────────────────
  submittingWeek: number | null = null;
  uploadFile: File | null = null;

  // ── Alerts ─────────────────────────────────────────────────────────────────
  alerts: { type: 'warning' | 'danger' | 'info'; message: string }[] = [];

  // ── Course weeks ───────────────────────────────────────────────────────────
  courseWeeks: CourseWeek[] = [
    {
      id: 1,
      title: 'Work Identity & Professional Mindset',
      description: 'Understanding who you are as a professional and building a career-first mindset.',
      topics: ['Personal brand', 'Professional values', 'Growth mindset', 'Career vision'],
      status: 'pending',
      score: null,
      quizScore: null,
      courseworkSubmitted: false,
      quizCompleted: false,
      dueDate: '',
      quizQuestions: [
        { id: 'w1q1', text: 'What is the most important foundation for a professional identity?', options: [{key:'a',label:'Your job title'},{key:'b',label:'Your values, strengths and purpose'},{key:'c',label:'Your salary level'},{key:'d',label:'Your employer brand'}], correctKey: 'b' },
        { id: 'w1q2', text: 'A growth mindset is best described as:', options: [{key:'a',label:'Believing talent is fixed'},{key:'b',label:'Avoiding challenges to stay safe'},{key:'c',label:'Believing effort and learning drive improvement'},{key:'d',label:'Relying on past achievements'}], correctKey: 'c' },
        { id: 'w1q3', text: 'Professional branding means:', options: [{key:'a',label:'Creating a logo for yourself'},{key:'b',label:'How you present and differentiate yourself to employers'},{key:'c',label:'Your social media follower count'},{key:'d',label:'Having an expensive wardrobe'}], correctKey: 'b' },
        { id: 'w1q4', text: 'Which of these best supports long-term career growth?', options: [{key:'a',label:'Doing the minimum required'},{key:'b',label:'Focusing only on technical skills'},{key:'c',label:'Taking ownership beyond your job description'},{key:'d',label:'Waiting to be assigned opportunities'}], correctKey: 'c' },
        { id: 'w1q5', text: 'Career vision helps professionals by:', options: [{key:'a',label:'Limiting their options'},{key:'b',label:'Providing focus and direction for daily decisions'},{key:'c',label:'Making them rigid and inflexible'},{key:'d',label:'Replacing the need for skills'}], correctKey: 'b' }
      ]
    },
    {
      id: 2,
      title: 'Workplace Communication',
      description: 'Mastering verbal, written, and non-verbal communication in professional environments.',
      topics: ['Email etiquette', 'Active listening', 'Meeting skills', 'Conflict communication'],
      status: 'pending',
      score: null,
      quizScore: null,
      courseworkSubmitted: false,
      quizCompleted: false,
      dueDate: '',
      quizQuestions: [
        { id: 'w2q1', text: 'Effective workplace communication primarily requires:', options: [{key:'a',label:'Speaking loudly and confidently'},{key:'b',label:'Clarity, respect, and active listening'},{key:'c',label:'Using complex vocabulary'},{key:'d',label:'Agreeing with everyone'}], correctKey: 'b' },
        { id: 'w2q2', text: 'In a professional email, you should:', options: [{key:'a',label:'Use slang to seem friendly'},{key:'b',label:'Write long paragraphs with all your thoughts'},{key:'c',label:'State your purpose clearly in the first sentence'},{key:'d',label:'Skip greetings to save time'}], correctKey: 'c' },
        { id: 'w2q3', text: 'Active listening involves:', options: [{key:'a',label:'Waiting for your turn to talk'},{key:'b',label:'Checking your phone while listening'},{key:'c',label:'Fully focusing and reflecting back what you hear'},{key:'d',label:'Interrupting to add value'}], correctKey: 'c' },
        { id: 'w2q4', text: 'When disagreeing with a colleague professionally, you should:', options: [{key:'a',label:'Avoid the conversation entirely'},{key:'b',label:'Address it emotionally to show you care'},{key:'c',label:'Acknowledge their view then present yours calmly'},{key:'d',label:'Escalate to management immediately'}], correctKey: 'c' },
        { id: 'w2q5', text: 'Non-verbal communication accounts for approximately:', options: [{key:'a',label:'10% of communication impact'},{key:'b',label:'Over 50% of communication impact'},{key:'c',label:'Exactly 30% of communication impact'},{key:'d',label:'It has no measurable impact'}], correctKey: 'b' }
      ]
    },
    {
      id: 3,
      title: 'Productivity & Time Management',
      description: 'Building systems that maximize output, reduce burnout, and deliver results consistently.',
      topics: ['Priority frameworks', 'Deep work', 'Deadline management', 'Energy management'],
      status: 'pending',
      score: null,
      quizScore: null,
      courseworkSubmitted: false,
      quizCompleted: false,
      dueDate: '',
      quizQuestions: [
        { id: 'w3q1', text: 'The Eisenhower Matrix helps professionals:', options: [{key:'a',label:'Track time spent on tasks'},{key:'b',label:'Prioritize tasks by urgency and importance'},{key:'c',label:'Delegate all work'},{key:'d',label:'Eliminate all meetings'}], correctKey: 'b' },
        { id: 'w3q2', text: 'Deep work is most accurately described as:', options: [{key:'a',label:'Working late into the night'},{key:'b',label:'Focused, distraction-free cognitive effort on complex tasks'},{key:'c',label:'Doing multiple tasks simultaneously'},{key:'d',label:'Working on easy tasks first'}], correctKey: 'b' },
        { id: 'w3q3', text: 'When you have too many tasks, the best approach is:', options: [{key:'a',label:'Work faster on everything'},{key:'b',label:'Ignore low-priority tasks indefinitely'},{key:'c',label:'Prioritize, communicate, and renegotiate timelines'},{key:'d',label:'Refuse new work entirely'}], correctKey: 'c' },
        { id: 'w3q4', text: 'Energy management in productivity means:', options: [{key:'a',label:'Drinking more coffee'},{key:'b',label:'Aligning demanding tasks with peak energy periods'},{key:'c',label:'Working the same hours every day'},{key:'d',label:'Avoiding rest to maximise output'}], correctKey: 'b' },
        { id: 'w3q5', text: 'What is the most effective way to handle interruptions at work?', options: [{key:'a',label:'Never respond to colleagues'},{key:'b',label:'Always drop what you are doing'},{key:'c',label:'Set boundaries, batch responses, protect focused time'},{key:'d',label:'Work from home permanently'}], correctKey: 'c' }
      ]
    },
    {
      id: 4,
      title: 'Stakeholder & Relationship Management',
      description: 'Building professional networks, managing up, and creating visibility within organisations.',
      topics: ['Managing up', 'Building allies', 'Networking strategy', 'Visibility & recognition'],
      status: 'locked',
      score: null,
      quizScore: null,
      courseworkSubmitted: false,
      quizCompleted: false,
      dueDate: '',
      quizQuestions: [
        { id: 'w4q1', text: 'Managing up means:', options: [{key:'a',label:'Telling your manager what to do'},{key:'b',label:'Proactively communicating to make your manager\'s job easier'},{key:'c',label:'Avoiding your manager'},{key:'d',label:'Complaining to senior leadership'}], correctKey: 'b' },
        { id: 'w4q2', text: 'Professional networking is most valuable when:', options: [{key:'a',label:'You only contact people when you need something'},{key:'b',label:'You build genuine, mutually beneficial relationships over time'},{key:'c',label:'You collect as many contacts as possible'},{key:'d',label:'You focus only on senior people'}], correctKey: 'b' },
        { id: 'w4q3', text: 'Visibility in the workplace is best achieved by:', options: [{key:'a',label:'Self-promotion and bragging'},{key:'b',label:'Keeping quiet and hoping to be noticed'},{key:'c',label:'Delivering results and communicating your impact strategically'},{key:'d',label:'Working the longest hours'}], correctKey: 'c' },
        { id: 'w4q4', text: 'When a stakeholder has conflicting priorities from yours, you should:', options: [{key:'a',label:'Ignore their priorities'},{key:'b',label:'Escalate immediately'},{key:'c',label:'Align expectations and find common ground'},{key:'d',label:'Do both simultaneously'}], correctKey: 'c' },
        { id: 'w4q5', text: 'Building allies at work means:', options: [{key:'a',label:'Only connecting with people who can promote you'},{key:'b',label:'Having people across levels who know and support your work'},{key:'c',label:'Avoiding competition with peers'},{key:'d',label:'Socialising constantly'}], correctKey: 'b' }
      ]
    },
    {
      id: 5,
      title: 'Career Strategy & Growth Acceleration',
      description: 'Designing a deliberate career path and positioning yourself for rapid advancement.',
      topics: ['Career mapping', 'Skill gaps', 'Strategic positioning', 'Promotion readiness'],
      status: 'locked',
      score: null,
      quizScore: null,
      courseworkSubmitted: false,
      quizCompleted: false,
      dueDate: '',
      quizQuestions: [
        { id: 'w5q1', text: 'A strategic career plan includes:', options: [{key:'a',label:'A rigid 20-year roadmap'},{key:'b',label:'Short and long-term goals with quarterly reviews'},{key:'c',label:'Waiting for your company to plan for you'},{key:'d',label:'A list of jobs to apply for'}], correctKey: 'b' },
        { id: 'w5q2', text: 'Promotion readiness is best demonstrated by:', options: [{key:'a',label:'Asking for a promotion every 6 months'},{key:'b',label:'Operating at the level above your current role'},{key:'c',label:'Having the most years of experience'},{key:'d',label:'Being popular with colleagues'}], correctKey: 'b' },
        { id: 'w5q3', text: 'A skill gap analysis helps you:', options: [{key:'a',label:'Identify weaknesses to hide from employers'},{key:'b',label:'Understand what to develop to reach your career goals'},{key:'c',label:'Justify staying in your current role'},{key:'d',label:'Compare yourself to peers'}], correctKey: 'b' },
        { id: 'w5q4', text: 'Strategic positioning means:', options: [{key:'a',label:'Choosing your desk location carefully'},{key:'b',label:'Being known for specific, high-value contributions'},{key:'c',label:'Avoiding responsibility to stay safe'},{key:'d',label:'Knowing the right people only'}], correctKey: 'b' },
        { id: 'w5q5', text: 'What accelerates career growth the most?', options: [{key:'a',label:'Switching jobs every year'},{key:'b',label:'Waiting for formal training programs'},{key:'c',label:'Delivering impact, building skills, and managing visibility simultaneously'},{key:'d',label:'Having a postgraduate degree'}], correctKey: 'c' }
      ]
    },
    {
      id: 6,
      title: 'Leadership, Initiative & Impact',
      description: 'Developing leadership qualities and creating measurable impact at any level.',
      topics: ['Leadership presence', 'Problem-solving', 'Taking initiative', 'Impact measurement'],
      status: 'locked',
      score: null,
      quizScore: null,
      courseworkSubmitted: false,
      quizCompleted: false,
      dueDate: '',
      quizQuestions: [
        { id: 'w6q1', text: 'Leadership presence is best described as:', options: [{key:'a',label:'Having a loud personality'},{key:'b',label:'A senior job title'},{key:'c',label:'The ability to inspire confidence and influence without authority'},{key:'d',label:'Being the oldest in the room'}], correctKey: 'c' },
        { id: 'w6q2', text: 'Taking initiative at work means:', options: [{key:'a',label:'Doing whatever you want without asking'},{key:'b',label:'Identifying and solving problems before being told to'},{key:'c',label:'Working overtime regularly'},{key:'d',label:'Volunteering for low-impact tasks'}], correctKey: 'b' },
        { id: 'w6q3', text: 'Measuring your impact at work involves:', options: [{key:'a',label:'Counting hours worked'},{key:'b',label:'Getting positive feedback from everyone'},{key:'c',label:'Tracking outcomes, results, and value delivered'},{key:'d',label:'Completing all assigned tasks'}], correctKey: 'c' },
        { id: 'w6q4', text: 'Effective problem-solving requires:', options: [{key:'a',label:'Finding someone to blame'},{key:'b',label:'Implementing the first solution that comes to mind'},{key:'c',label:'Understanding root causes before acting'},{key:'d',label:'Escalating every issue'}], correctKey: 'c' },
        { id: 'w6q5', text: 'Leadership at any level means:', options: [{key:'a',label:'Only leading when you are in charge'},{key:'b',label:'Setting the example, taking ownership, and lifting others'},{key:'c',label:'Having direct reports'},{key:'d',label:'Making all the decisions'}], correctKey: 'b' }
      ]
    }
  ];

  // ── Final exam ─────────────────────────────────────────────────────────────
  showFinalExam = false;
  finalExamAnswers: Map<string, string> = new Map();
  finalExamSubmitted = false;
  finalExamScore: number | null = null;
  finalExamSubmitting = false;

  finalExamQuestions: QuizQuestion[] = [
    { id: 'fe1', text: 'What distinguishes high-performing professionals from average ones?', options: [{key:'a',label:'Natural talent alone'},{key:'b',label:'Ownership, adaptability, communication, and strategic thinking'},{key:'c',label:'Working the longest hours'},{key:'d',label:'Having the best education'}], correctKey: 'b' },
    { id: 'fe2', text: 'A professional who feels undervalued should first:', options: [{key:'a',label:'Resign immediately'},{key:'b',label:'Find structured ways to communicate progress and results'},{key:'c',label:'Reduce effort'},{key:'d',label:'Confront management emotionally'}], correctKey: 'b' },
    { id: 'fe3', text: 'Managing multiple stakeholders requires:', options: [{key:'a',label:'Satisfying everyone equally'},{key:'b',label:'Ignoring low-priority stakeholders'},{key:'c',label:'Aligning expectations and prioritising clearly'},{key:'d',label:'Escalating all conflicts'}], correctKey: 'c' },
    { id: 'fe4', text: 'Career acceleration is best driven by:', options: [{key:'a',label:'Seniority and time spent in role'},{key:'b',label:'Delivering results, building visibility, and continuous learning'},{key:'c',label:'Networking events only'},{key:'d',label:'Technical skills exclusively'}], correctKey: 'b' },
    { id: 'fe5', text: 'Initiative in the workplace is best demonstrated by:', options: [{key:'a',label:'Doing only what is assigned'},{key:'b',label:'Identifying gaps and solving problems proactively'},{key:'c',label:'Waiting for instructions'},{key:'d',label:'Working on weekends'}], correctKey: 'b' },
    { id: 'fe6', text: 'Effective communication in professional settings requires:', options: [{key:'a',label:'Complex vocabulary to sound credible'},{key:'b',label:'Clarity, brevity, and active listening'},{key:'c',label:'Always agreeing to avoid conflict'},{key:'d',label:'Only written communication'}], correctKey: 'b' },
    { id: 'fe7', text: 'The purpose of personal branding is to:', options: [{key:'a',label:'Become famous'},{key:'b',label:'Get more social media followers'},{key:'c',label:'Differentiate yourself and communicate your unique value'},{key:'d',label:'Impress friends and family'}], correctKey: 'c' },
    { id: 'fe8', text: 'Leadership presence can be developed by:', options: [{key:'a',label:'Only people born with charisma'},{key:'b',label:'Anyone who commits to consistent, intentional practice'},{key:'c',label:'Getting a senior title first'},{key:'d',label:'Having a formal leadership course only'}], correctKey: 'b' },
    { id: 'fe9', text: 'Productive professionals manage their time by:', options: [{key:'a',label:'Working harder for more hours'},{key:'b',label:'Responding to emails immediately always'},{key:'c',label:'Prioritising high-impact tasks and protecting focused time'},{key:'d',label:'Delegating everything'}], correctKey: 'c' },
    { id: 'fe10', text: 'Work readiness ultimately means:', options: [{key:'a',label:'Having a degree and work experience'},{key:'b',label:'Knowing workplace rules'},{key:'c',label:'The mindset, skills, and behaviours to add value from day one'},{key:'d',label:'Being qualified for the job description'}], correctKey: 'c' }
  ];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadStudentData();
    this.setWeekDates();
  }

  // ── Load student from localStorage / backend ───────────────────────────────

  loadStudentData(): void {
    const stored = localStorage.getItem('studentProfile');
    const regId  = localStorage.getItem('studentId');

    if (stored) {
      this.student = JSON.parse(stored);
      this.loading = false;
      this.generateAlerts();
      return;
    }

    if (regId) {
      this.http.get<any>(`${this.api}/api/registrations/${regId}`).subscribe({
        next: (data) => {
          this.student = {
            registrationId: data.registrationId || data._id,
            fullName:        data.fullName,
            email:           data.email,
            phone:           data.phone,
            category:        data.category,
            photo:           data.files?.photo
                               ? `${this.api}/api/registrations/${data.registrationId}/file/${data.files.photo}`
                               : null,
            assessmentScore:  data.assessmentScore  ?? null,
            assessmentLevel:  data.assessmentLevel  ?? null,
            enrolledAt:       data.submittedAt
          };
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

  // ── Week dates (set from enrolment date) ───────────────────────────────────

  setWeekDates(): void {
    const base = new Date();
    this.courseWeeks.forEach((w, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + (i + 1) * 7);
      w.dueDate = d.toISOString();
    });
  }

  // ── Progress ───────────────────────────────────────────────────────────────

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

  get averageScore(): number {
    const scored = this.courseWeeks.filter(w => w.quizScore !== null);
    if (!scored.length) return 0;
    return Math.round(scored.reduce((s, w) => s + w.quizScore!, 0) / scored.length);
  }

  get canTakeFinalExam(): boolean {
    return this.completionRate === 100;
  }

  // ── Alerts ─────────────────────────────────────────────────────────────────

  generateAlerts(): void {
    this.alerts = [];
    const overdue = this.courseWeeks.filter(w => w.status === 'overdue');
    const pending = this.courseWeeks.filter(w => w.status === 'pending' && !w.quizCompleted);

    if (overdue.length) {
      this.alerts.push({
        type: 'danger',
        message: `${overdue.length} week${overdue.length > 1 ? 's are' : ' is'} overdue. Please complete immediately.`
      });
    }
    if (pending.length) {
      this.alerts.push({
        type: 'warning',
        message: `${pending.length} week${pending.length > 1 ? 's have' : ' has'} pending coursework or assessments.`
      });
    }
    if (this.completionRate === 100 && !this.finalExamSubmitted) {
      this.alerts.push({
        type: 'info',
        message: 'Congratulations! All weeks complete. Your Final Exam is now unlocked.'
      });
    }
  }

  dismissAlert(i: number): void {
    this.alerts.splice(i, 1);
  }

  // ── Coursework submission ──────────────────────────────────────────────────

  onFileSelected(event: Event, week: CourseWeek): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.submittingWeek = week.id;

    // Simulate upload
    setTimeout(() => {
      week.courseworkSubmitted = true;
      this.submittingWeek = null;
      this.checkWeekCompletion(week);
      this.generateAlerts();
      this.cdr.detectChanges();
    }, 1200);
  }

  // ── Quiz ───────────────────────────────────────────────────────────────────

  openQuiz(week: CourseWeek): void {
    if (week.status === 'locked') return;
    this.activeQuiz   = week;
    this.quizAnswers  = new Map();
    this.quizResult   = null;
    this.quizSubmitted = false;
    this.showQuizModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeQuiz(): void {
    this.showQuizModal  = false;
    this.activeQuiz     = null;
    this.quizResult     = null;
    this.quizSubmitted  = false;
    document.body.style.overflow = '';
  }

  selectQuizAnswer(qid: string, key: string): void {
    this.quizAnswers.set(qid, key);
    this.cdr.detectChanges();
  }

  getQuizAnswer(qid: string): string | undefined {
    return this.quizAnswers.get(qid);
  }

  submitQuiz(): void {
    if (!this.activeQuiz) return;
    if (this.quizAnswers.size < this.activeQuiz.quizQuestions.length) return;

    this.quizSubmitting = true;
    let correct = 0;
    const total = this.activeQuiz.quizQuestions.length;

    this.activeQuiz.quizQuestions.forEach(q => {
      if (this.quizAnswers.get(q.id) === q.correctKey) correct++;
    });

    const pct = Math.round((correct / total) * 100);

    setTimeout(() => {
      this.quizResult    = { score: correct, total, percentage: pct };
      this.quizSubmitted = true;
      this.quizSubmitting = false;

      // Update week
      this.activeQuiz!.quizScore      = pct;
      this.activeQuiz!.quizCompleted  = true;
      this.checkWeekCompletion(this.activeQuiz!);
      this.generateAlerts();
      this.cdr.detectChanges();
    }, 800);
  }

  private checkWeekCompletion(week: CourseWeek): void {
    if (week.courseworkSubmitted && week.quizCompleted) {
      week.status = 'completed';
      week.score  = week.quizScore;
      // Unlock next week
      const next = this.courseWeeks.find(w => w.id === week.id + 1);
      if (next && next.status === 'locked') next.status = 'pending';
    }
  }

  // ── Final Exam ─────────────────────────────────────────────────────────────

  openFinalExam(): void {
    if (!this.canTakeFinalExam) return;
    this.showFinalExam      = true;
    this.finalExamAnswers   = new Map();
    this.finalExamSubmitted = false;
    this.finalExamScore     = null;
    document.body.style.overflow = 'hidden';
  }

  closeFinalExam(): void {
    this.showFinalExam = false;
    document.body.style.overflow = '';
  }

  selectFinalAnswer(qid: string, key: string): void {
    this.finalExamAnswers.set(qid, key);
    this.cdr.detectChanges();
  }

  getFinalAnswer(qid: string): string | undefined {
    return this.finalExamAnswers.get(qid);
  }

  submitFinalExam(): void {
    if (this.finalExamAnswers.size < this.finalExamQuestions.length) return;
    this.finalExamSubmitting = true;

    let correct = 0;
    this.finalExamQuestions.forEach(q => {
      if (this.finalExamAnswers.get(q.id) === q.correctKey) correct++;
    });

    const pct = Math.round((correct / this.finalExamQuestions.length) * 100);

    setTimeout(() => {
      this.finalExamScore     = pct;
      this.finalExamSubmitted = true;
      this.finalExamSubmitting = false;
      this.generateAlerts();
      this.cdr.detectChanges();
    }, 1000);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  setTab(tab: ActiveTab): void { this.activeTab = tab; }

  statusLabel(s: WeekStatus): string {
    return { completed: 'Completed', pending: 'Pending', overdue: 'Overdue', locked: 'Locked' }[s];
  }

  categoryLabel(c: string): string {
    return c === 'nysc' ? 'NYSC / Awaiting' : 'Graduate / Pro';
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  }

  get photoUrl(): string {
    return this.student?.photo || 'assets/avatar-placeholder.png';
  }

  get enrolledWeeksLabel(): string {
    return `${this.completedCount} of 6 weeks complete`;
  }

  get quizAnsweredCount(): number {
    return this.quizAnswers.size;
  }

  get finalAnsweredCount(): number {
    return this.finalExamAnswers.size;
  }
}