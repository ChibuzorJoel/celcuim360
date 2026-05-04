// src/app/registration/registration.component.ts

import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';
import { RegistrationService } from '../../core/services/registration.service';

export type UserCategory = 'nysc' | 'graduate' | null;

export interface RegistrationFormData {
  fullName: string;
  email: string;
  phone: string;
  category: UserCategory;
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  options: AssessmentOption[];
}

export interface AssessmentOption {
  key: string;
  label: string;
  isCorrect: boolean;
}

export interface AssessmentResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  level: 'below-expectation' | 'foundational' | 'strong';
  levelLabel: string;
  interpretation: string;
}

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css']
})
export class RegistrationComponent implements OnInit, OnDestroy {

  currentStep = 1;
  formSubmitted = false;
  isLoading = false;
  errorMessage = '';
  assessmentError: string = '';
  formData: RegistrationFormData = {
    fullName: '',
    email: '',
    phone: '',
    category: null
  };

  @ViewChild('videoEl',  { static: false }) videoEl!:  ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl', { static: false }) canvasEl!: ElementRef<HTMLCanvasElement>;

  cameraStream: MediaStream | null = null;
  capturedPhotoDataUrl: string | null = null;
  cameraError = '';
  cameraState: 'idle' | 'loading' | 'active' | 'captured' = 'idle';

  assessmentQuestions: AssessmentQuestion[] = [];
  assessmentAnswers: Map<string, string> = new Map();
  assessmentResult: AssessmentResult | null = null;

  statementFile: File | null = null;
  callUpFile: File | null = null;
  docError = '';

  paymentProofFile: File | null = null;
  paymentProofPreview = '';
  paymentError = '';

  // Terms
  termsAccepted = false;
  showTermsModal = false;

  readonly paymentDetails = {
    accountName:      'Celcium360 Solutions',
    bankName:         '[Bank Name]',
    accountNumber:    '[Account Number]',
    discountedAmount: '₦50,000',
    standardAmount:   '₦200,000'
  };

  private readonly assessmentSectionA: AssessmentQuestion[] = [
    { id:'nysc_1', question:"You're assigned a task late Friday with minimal guidance and a Monday deadline.", options:[{key:'a',label:'Wait till Monday to ask questions',isCorrect:false},{key:'b',label:'Attempt it based on assumptions and submit',isCorrect:false},{key:'c',label:'Send a quick clarification message, proceed with best judgment, and flag uncertainties',isCorrect:true},{key:'d',label:"Leave it since it's weekend",isCorrect:false}]},
    { id:'nysc_2', question:'During your first week, you notice colleagues cut corners to meet deadlines.', options:[{key:'a',label:'Ask your manager what standards are expected',isCorrect:true},{key:'b',label:'Follow them to fit in',isCorrect:false},{key:'c',label:'Report them immediately',isCorrect:false},{key:'d',label:'Ignore and do your work your way',isCorrect:false}]},
    { id:'nysc_3', question:"You're asked to present something you barely understand.", options:[{key:'a',label:'Ask someone else to do it',isCorrect:false},{key:'b',label:'Research deeply, simplify key points, and clarify grey areas',isCorrect:true},{key:'c',label:'Decline the task',isCorrect:false},{key:'d',label:'Read briefly and wing it',isCorrect:false}]},
    { id:'nysc_4', question:'A colleague corrects you publicly in a meeting.', options:[{key:'a',label:'Avoid the colleague',isCorrect:false},{key:'b',label:'Acknowledge and follow up privately if needed',isCorrect:true},{key:'c',label:'Defend yourself immediately',isCorrect:false},{key:'d',label:'Stay silent and withdraw',isCorrect:false}]},
    { id:'nysc_5', question:"You're juggling multiple tasks and a new urgent one comes in.", options:[{key:'a',label:'Focus only on the urgent task',isCorrect:false},{key:'b',label:'Say yes and struggle silently',isCorrect:false},{key:'c',label:'Drop another task without informing anyone',isCorrect:false},{key:'d',label:'Clarify priorities and renegotiate timelines',isCorrect:true}]},
    { id:'nysc_6', question:'Your work is rarely acknowledged.', options:[{key:'a',label:'Confront your manager emotionally',isCorrect:false},{key:'b',label:'Find structured ways to communicate your progress and results',isCorrect:true},{key:'c',label:'Reduce effort',isCorrect:false},{key:'d',label:"Assume they don't value you",isCorrect:false}]},
    { id:'nysc_7', question:"You're told your communication is unclear.", options:[{key:'a',label:'Feel offended',isCorrect:false},{key:'b',label:'Ask for examples and improve',isCorrect:true},{key:'c',label:'Ignore it',isCorrect:false},{key:'d',label:'Assume they misunderstood',isCorrect:false}]},
    { id:'nysc_8', question:"You're asked to use a tool you've never used before.", options:[{key:'a',label:'Wait for formal training',isCorrect:false},{key:'b',label:'Avoid the task',isCorrect:false},{key:'c',label:'Learn quickly and apply while asking questions',isCorrect:true},{key:'d',label:"Say you don't know it",isCorrect:false}]},
    { id:'nysc_9', question:'A teammate takes credit for your work.', options:[{key:'a',label:'Withdraw from teamwork',isCorrect:false},{key:'b',label:'Address it professionally and ensure visibility going forward',isCorrect:true},{key:'c',label:'Ignore completely',isCorrect:false},{key:'d',label:'Escalate aggressively',isCorrect:false}]},
    { id:'nysc_10', question:'What defines someone who grows quickly?', options:[{key:'a',label:'Confidence alone',isCorrect:false},{key:'b',label:'Being liked',isCorrect:false},{key:'c',label:'Hard work only',isCorrect:false},{key:'d',label:'Ability to learn, adapt, communicate, and take ownership',isCorrect:true}]}
  ];

  private readonly assessmentSectionB: AssessmentQuestion[] = [
    { id:'prof_1', question:"You deliver consistently but aren't given bigger opportunities.", options:[{key:'a',label:'Continue working quietly',isCorrect:false},{key:'b',label:'Seek feedback and express interest in more responsibility',isCorrect:true},{key:'c',label:'Disengage',isCorrect:false},{key:'d',label:'Blame the system',isCorrect:false}]},
    { id:'prof_2', question:'You\'re described as "reliable but not strategic."', options:[{key:'a',label:'Your manager is biased',isCorrect:false},{key:'b',label:"You're not visible",isCorrect:false},{key:'c',label:"You execute tasks but don't think beyond them",isCorrect:true},{key:'d',label:"You're underperforming",isCorrect:false}]},
    { id:'prof_3', question:'Someone less experienced is getting more recognition.', options:[{key:'a',label:'Withdraw effort',isCorrect:false},{key:'b',label:'Complain',isCorrect:false},{key:'c',label:'Confront your manager',isCorrect:false},{key:'d',label:'Study their approach and adapt',isCorrect:true}]},
    { id:'prof_4', question:"You're overwhelmed by multiple stakeholders.", options:[{key:'a',label:'Work overtime silently',isCorrect:false},{key:'b',label:'Ignore some requests',isCorrect:false},{key:'c',label:'Align expectations and prioritize clearly',isCorrect:true},{key:'d',label:'Try to satisfy everyone equally',isCorrect:false}]},
    { id:'prof_5', question:'You suspect bias is affecting your growth.', options:[{key:'a',label:'Quit immediately',isCorrect:false},{key:'b',label:'Strengthen visibility, build allies, and document impact',isCorrect:true},{key:'c',label:'Accept it silently',isCorrect:false},{key:'d',label:'Escalate emotionally',isCorrect:false}]},
    { id:'prof_6', question:"You complete tasks well but aren't progressing.", options:[{key:'a',label:'Promotions are random',isCorrect:false},{key:'b',label:"You're unlucky",isCorrect:false},{key:'c',label:'Your company is bad',isCorrect:false},{key:'d',label:"You're not positioning yourself as a problem-solver",isCorrect:true}]},
    { id:'prof_7', question:'Your manager gives vague instructions repeatedly.', options:[{key:'a',label:'Keep guessing',isCorrect:false},{key:'b',label:'Delay execution',isCorrect:false},{key:'c',label:'Complain',isCorrect:false},{key:'d',label:'Structure the task and confirm alignment',isCorrect:true}]},
    { id:'prof_8', question:'You want to grow into leadership.', options:[{key:'a',label:'Ask for a title',isCorrect:false},{key:'b',label:'Wait for promotion',isCorrect:false},{key:'c',label:'Take initiative and operate beyond your role',isCorrect:true},{key:'d',label:'Focus only on assigned tasks',isCorrect:false}]},
    { id:'prof_9', question:"You're working hard but feel invisible.", options:[{key:'a',label:'Bad luck',isCorrect:false},{key:'b',label:'Timing',isCorrect:false},{key:'c',label:'Lack of visibility and stakeholder management',isCorrect:true},{key:'d',label:'Bias',isCorrect:false}]},
    { id:'prof_10', question:'What separates fast-growing professionals?', options:[{key:'a',label:'Intelligence',isCorrect:false},{key:'b',label:'Years of experience',isCorrect:false},{key:'c',label:'Networking only',isCorrect:false},{key:'d',label:'Ownership, adaptability, visibility, and strategic thinking',isCorrect:true}]}
  ];

  constructor(
    private registrationService: RegistrationService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {}
  ngOnDestroy(): void { this.stopCamera(); }

  get isNysc(): boolean { return this.formData.category === 'nysc'; }
  get effectiveTotalSteps(): number { return 6; }

  get stepLabel(): string {
    const map: Record<number, string> = {
      1:'Basic Information', 2:'Live Photo', 3:'Self-Assessment',
      4:'Documents', 5:'Payment', 6:'Review & Submit'
    };
    return map[this.currentStep] ?? '';
  }

  get progressPercent(): number {
    return Math.round(((this.currentStep - 1) / (this.effectiveTotalSteps - 1)) * 100);
  }

  get paymentAmount(): string {
    return this.isNysc ? this.paymentDetails.discountedAmount : this.paymentDetails.standardAmount;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  nextStep(): void {
    if (!this.validateCurrentStep()) return;
    this.errorMessage = '';
    this.stopCamera();
    this.currentStep++;
  }

  prevStep(): void {
    this.errorMessage = '';
    this.stopCamera();
    this.currentStep--;
  }

  private validateCurrentStep(): boolean {
    this.errorMessage = '';

    if (this.currentStep === 1) {
      if (!this.formData.fullName.trim())          { this.errorMessage = 'Please enter your full name.'; return false; }
      if (!this.isValidEmail(this.formData.email)) { this.errorMessage = 'Please enter a valid email address.'; return false; }
      if (!this.formData.phone.trim())             { this.errorMessage = 'Please enter your phone number.'; return false; }
      if (!this.formData.category)                 { this.errorMessage = 'Please select your category.'; return false; }
      this.loadAssessmentQuestions();
    }

    if (this.currentStep === 2) {
      if (!this.capturedPhotoDataUrl) { this.errorMessage = 'A live photo is required. Please capture your headshot.'; return false; }
    }

    if (this.currentStep === 3) {
      if (this.assessmentAnswers.size === 0) { this.errorMessage = 'Please answer all assessment questions.'; return false; }
      if (this.assessmentAnswers.size !== this.assessmentQuestions.length) {
        this.errorMessage = `Please answer all ${this.assessmentQuestions.length} questions.`; return false;
      }
      this.calculateAssessmentScore();
    }

    if (this.currentStep === 4) {
      if (!this.statementFile) { this.errorMessage = 'Please upload your Statement of Result or Degree Certificate.'; return false; }
      if (!this.callUpFile)    { this.errorMessage = 'Please upload your NYSC Call-Up Letter.'; return false; }
    }

    if (this.currentStep === 5) {
      if (!this.paymentProofFile) { this.errorMessage = 'Please upload your payment receipt.'; return false; }
    }

    if (this.currentStep === 6) {
      if (!this.termsAccepted) { this.errorMessage = 'Please accept the Terms & Conditions before submitting.'; return false; }
    }

    return true;
  }

  // ── Assessment ─────────────────────────────────────────────────────────────

  private loadAssessmentQuestions(): void {
    this.assessmentQuestions = this.isNysc ? this.assessmentSectionA : this.assessmentSectionB;
    this.assessmentAnswers.clear();
    this.assessmentResult = null;
  }

  selectAssessmentAnswer(questionId: string, optionKey: string): void {
    this.assessmentAnswers.set(questionId, optionKey);
    this.cdr.detectChanges();
  }

  getSelectedAnswer(questionId: string): string | undefined {
    return this.assessmentAnswers.get(questionId);
  }

  private calculateAssessmentScore(): void {
    let correct = 0;
    const total = this.assessmentQuestions.length;
    this.assessmentAnswers.forEach((key, qid) => {
      const q = this.assessmentQuestions.find(q => q.id === qid);
      if (q?.options.find(o => o.key === key)?.isCorrect) correct++;
    });
    const pct = Math.round((correct / total) * 100);
    let level: 'below-expectation' | 'foundational' | 'strong';
    let levelLabel: string;
    let interpretation: string;
    if (pct <= 40) {
      level = 'below-expectation'; levelLabel = 'Below Expectation';
      interpretation = 'You are currently operating below workplace expectations. Significant gaps exist in decision-making and workplace awareness. This program will help bridge those gaps.';
    } else if (pct <= 70) {
      level = 'foundational'; levelLabel = 'Foundational Awareness';
      interpretation = 'You have foundational awareness, but execution is inconsistent. There are gaps in communication, prioritization, or visibility that this program will address.';
    } else {
      level = 'strong'; levelLabel = 'Strong Awareness';
      interpretation = 'You demonstrate strong awareness, but awareness alone is not enough. Execution, positioning, and strategy are required for accelerated growth — this program will sharpen those.';
    }
    this.assessmentResult = { score: correct, totalQuestions: total, percentage: pct, level, levelLabel, interpretation };
  }

  // ── Camera ─────────────────────────────────────────────────────────────────

  async startCamera(): Promise<void> {
    this.cameraError = '';
    this.cameraState = 'loading';
    this.cdr.detectChanges();

    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError = 'Camera not supported in this browser. Use Chrome, Firefox, or Safari.';
      this.cameraState = 'idle';
      this.cdr.detectChanges();
      return;
    }

    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'user' }, width: { ideal: 1280, min: 320 }, height: { ideal: 720, min: 240 } },
        audio: false
      });
      this.zone.run(() => {
        this.cameraState = 'active';
        this.capturedPhotoDataUrl = null;
        this.cdr.detectChanges();
        requestAnimationFrame(() => {
          if (this.videoEl?.nativeElement) {
            const v = this.videoEl.nativeElement;
            v.srcObject = this.cameraStream;
            v.setAttribute('autoplay', '');
            v.setAttribute('playsinline', '');
            v.setAttribute('muted', '');
            v.play().catch(e => console.warn('play():', e));
          }
          this.cdr.detectChanges();
        });
      });
    } catch (err: any) {
      this.zone.run(() => {
        this.cameraState = 'idle';
        if      (err.name === 'NotAllowedError')    this.cameraError = 'Camera access denied. Click the camera icon in the address bar and allow access, then try again.';
        else if (err.name === 'NotFoundError')       this.cameraError = 'No camera found on this device.';
        else if (err.name === 'NotReadableError')    this.cameraError = 'Camera is in use by another app. Close it and try again.';
        else if (err.name === 'OverconstrainedError') this.retryBasic();
        else this.cameraError = `Camera error: ${err.message}. Please refresh and try again.`;
        this.cdr.detectChanges();
      });
    }
  }

  private async retryBasic(): Promise<void> {
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      this.zone.run(() => {
        this.cameraState = 'active';
        this.cdr.detectChanges();
        requestAnimationFrame(() => {
          if (this.videoEl?.nativeElement) {
            this.videoEl.nativeElement.srcObject = this.cameraStream;
            this.videoEl.nativeElement.play().catch(() => {});
          }
          this.cdr.detectChanges();
        });
      });
    } catch {
      this.zone.run(() => {
        this.cameraState = 'idle';
        this.cameraError = 'Unable to start camera. Please allow permissions in browser settings.';
        this.cdr.detectChanges();
      });
    }
  }

  capturePhoto(): void {
    const video = this.videoEl?.nativeElement;
    const canvas = this.canvasEl?.nativeElement;
    if (!video || !canvas) { this.cameraError = 'Camera not ready.'; return; }
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save(); ctx.translate(w, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h); ctx.restore();
    this.capturedPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    this.cameraState = 'captured';
    this.stopCamera();
    this.cdr.detectChanges();
  }

  retakePhoto(): void {
    this.capturedPhotoDataUrl = null;
    this.cameraState = 'idle';
    this.cameraError = '';
    this.cdr.detectChanges();
    setTimeout(() => this.startCamera(), 100);
  }

  stopCamera(): void {
    this.cameraStream?.getTracks().forEach(t => t.stop());
    this.cameraStream = null;
    if (this.cameraState === 'active' || this.cameraState === 'loading') this.cameraState = 'idle';
  }

  // ── File uploads ────────────────────────────────────────────────────────────

  onStatementUpload(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!this.validDoc(file)) { this.docError = 'PDF, JPG or PNG only (max 5MB).'; return; }
    this.docError = ''; this.statementFile = file;
  }

  onCallUpUpload(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!this.validDoc(file)) { this.docError = 'PDF, JPG or PNG only (max 5MB).'; return; }
    this.docError = ''; this.callUpFile = file;
  }

  onPaymentProofUpload(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!this.validDoc(file)) { this.paymentError = 'PDF, JPG or PNG only (max 5MB).'; return; }
    this.paymentError = '';
    this.paymentProofFile = file;
    this.paymentProofPreview = '';
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => this.zone.run(() => {
        this.paymentProofPreview = ev.target?.result as string;
        this.cdr.detectChanges();
      });
      reader.readAsDataURL(file);
    }
  }

  private validDoc(file: File): boolean {
    return ['application/pdf','image/jpeg','image/png'].includes(file.type) && file.size <= 5 * 1024 * 1024;
  }

  // ── Terms ───────────────────────────────────────────────────────────────────

  openTermsModal():  void { this.showTermsModal = true;  document.body.style.overflow = 'hidden'; }
  closeTermsModal(): void { this.showTermsModal = false; document.body.style.overflow = ''; }
  acceptTermsFromModal(): void { this.termsAccepted = true; this.closeTermsModal(); }

  // ── Submit ──────────────────────────────────────────────────────────────────
  // KEY FIX: Use subscribe() instead of deprecated .toPromise()
  // Registration now succeeds for ALL assessment scores (including 0%)
  // .toPromise() in RxJS 7 swallows error details. subscribe() preserves them.

  submitRegistration(): void {
    if (!this.validateCurrentStep()) return;
    this.isLoading = true;
    this.errorMessage = '';

    const payload = new FormData();
    payload.append('fullName', this.formData.fullName);
    payload.append('email',    this.formData.email);
    payload.append('phone',    this.formData.phone);
    payload.append('category', this.formData.category ?? '');

    if (this.assessmentResult) {
      payload.append('assessmentScore',      this.assessmentResult.score.toString());
      payload.append('assessmentTotal',      this.assessmentResult.totalQuestions.toString());
      payload.append('assessmentPercentage', this.assessmentResult.percentage.toString());
      payload.append('assessmentLevel',      this.assessmentResult.level);
      payload.append('assessmentAnswers',    JSON.stringify(Array.from(this.assessmentAnswers.entries())));
    }

    if (this.capturedPhotoDataUrl) {
      payload.append('photo', this.dataUrlToBlob(this.capturedPhotoDataUrl), 'headshot.jpg');
    }
    if (this.statementFile)    payload.append('statement',    this.statementFile);
    if (this.callUpFile)       payload.append('callUpLetter', this.callUpFile);
    if (this.paymentProofFile) payload.append('paymentProof', this.paymentProofFile);

    this.registrationService.submitRegistration(payload).subscribe({
      next: (response) => {
        console.log('[Registration] Submitted successfully:', response);
        this.isLoading = false;
        this.formSubmitted = true;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err: Error) => {
        console.error('[Registration] Submit failed:', err);
        this.isLoading = false;
        // err.message is now the clean, user-friendly string set in handleError
        this.errorMessage = err.message ?? 'Submission failed. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const [header, data] = dataUrl.split(',');
    const mime   = header.match(/:(.*?);/)![1];
    const binary = atob(data);
    const arr    = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
