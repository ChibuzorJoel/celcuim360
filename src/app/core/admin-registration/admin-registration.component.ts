// src/app/admin/admin-registration/admin-registration.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';
export type ActiveTab = 'registrations' | 'contacts' | 'consultations';
export type ViewMode = 'table' | 'detail';

export interface RegistrationRecord {
  registrationId: string;
  fullName: string;
  email: string;
  phone: string;
  category: 'nysc' | 'graduate';
  status: RegistrationStatus;
  submittedAt: string;
  rejectionReason?: string;
  assessmentScore?: number;
  assessmentTotal?: number;
  assessmentPercentage?: number;
  assessmentLevel?: 'below-expectation' | 'foundational' | 'strong';
  files: {
    photo: string | null;
    statement: string | null;
    callUpLetter: string | null;
    paymentProof: string | null;
  };
}

export interface ContactRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  date: string;
}

@Component({
  selector: 'app-admin-registration',
  templateUrl: './admin-registration.component.html',
  styleUrls: ['./admin-registration.component.css']
})
export class AdminRegistrationComponent implements OnInit, OnDestroy {

  Math = Math;

  // ── View mode ─────────────────────────────────────────────────────────────
  viewMode: ViewMode = 'table';
  detailRecord: RegistrationRecord | null = null;

  // ── Lightbox ─────────────────────────────────────────────────────────────
  lightboxSrc: string | null = null;
  lightboxTitle = '';

  // ── State ─────────────────────────────────────────────────────────────────
  activeTab: ActiveTab = 'registrations';

  registrations: RegistrationRecord[] = [];
  filteredRegistrations: RegistrationRecord[] = [];
  paginatedRegistrations: RegistrationRecord[] = [];

  contacts: ContactRecord[] = [];

  // ── Filters ───────────────────────────────────────────────────────────────
  searchTerm = '';
  statusFilter: RegistrationStatus | 'all' = 'all';

  // ── Pagination ────────────────────────────────────────────────────────────
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  // ── UI ────────────────────────────────────────────────────────────────────
  loading = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'success';
  showToast = false;

  // ── Status modal ──────────────────────────────────────────────────────────
  showStatusModal = false;
  statusModalRecord: RegistrationRecord | null = null;
  pendingStatus: RegistrationStatus | null = null;
  rejectionReason = '';
  statusUpdating = false;

  // ── Delete modal ──────────────────────────────────────────────────────────
  showDeleteModal = false;
  deleteTarget: { id: string; name: string } | null = null;
  deleteLoading = false;

  // ── Polling ───────────────────────────────────────────────────────────────
  private pollSub?: Subscription;
  private readonly POLL_INTERVAL = 15_000;
  private api = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAll();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }


  assessmentLevelLabel(level?: string): string {
    const map: Record<string, string> = {
      'below-expectation': 'Below Expectation',
      'foundational':      'Foundational Awareness',
      'strong':            'Strong Awareness'
    };
    return level ? (map[level] ?? level) : 'N/A';
  }
  // ── Data ──────────────────────────────────────────────────────────────────

  loadAll(): void {
    this.loading = true;
    this.http.get<RegistrationRecord[]>(`${this.api}/api/registrations`).subscribe({
      next: data => {
        this.registrations = data.sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        // Add dummy records for demo purposes
        this.registrations.unshift(
          this.createDummyRecord('NYSC', 'strong'),
          this.createDummyRecord('graduate', 'foundational'),
          this.createDummyRecord('NYSC', 'below-expectation')
        );
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.toast('Failed to load registrations', 'error');
        // Load dummy data on error for demo
        this.registrations = [
          this.createDummyRecord('NYSC', 'strong'),
          this.createDummyRecord('graduate', 'foundational'),
          this.createDummyRecord('NYSC', 'below-expectation')
        ];
        this.applyFilters();
        this.loading = false;
      }
    });
  }

  private createDummyRecord(category: 'NYSC' | 'graduate', assessmentLevel: 'strong' | 'foundational' | 'below-expectation'): RegistrationRecord {
    const assessmentScores: Record<string, { score: number; percentage: number }> = {
      'strong': { score: 8, percentage: 80 },
      'foundational': { score: 6, percentage: 60 },
      'below-expectation': { score: 3, percentage: 30 }
    };

    const scores = assessmentScores[assessmentLevel];
    const names = ['Amaka Okafor', 'Chisom Adeyemi', 'Kelechi Umo', 'Zainab Hassan'];
    const emails = ['amaka@email.com', 'chisom@email.com', 'kelechi@email.com', 'zainab@email.com'];
    const phones = ['0801 234 5678', '0802 345 6789', '0803 456 7890', '0804 567 8901'];
    
    const randomIndex = Math.floor(Math.random() * names.length);

    return {
      registrationId: `REG-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      fullName: names[randomIndex],
      email: emails[randomIndex],
      phone: phones[randomIndex],
      category: category.toLowerCase() as 'nysc' | 'graduate',
      status: 'pending',
      submittedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      assessmentScore: scores.score,
      assessmentTotal: 10,
      assessmentPercentage: scores.percentage,
      assessmentLevel: assessmentLevel,
      files: {
        photo: 'https://via.placeholder.com/200x200?text=Headshot',
        statement: category === 'NYSC' ? 'statement.pdf' : null,
        callUpLetter: category === 'NYSC' ? 'callup.pdf' : null,
        paymentProof: 'payment-proof.jpg'
      }
    };
  }

  private startPolling(): void {
    this.pollSub = interval(this.POLL_INTERVAL)
      .pipe(switchMap(() => this.http.get<RegistrationRecord[]>(`${this.api}/api/registrations`)))
      .subscribe({
        next: data => {
          const updated = data.sort(
            (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
          );
          if (JSON.stringify(updated) !== JSON.stringify(this.registrations)) {
            this.registrations = updated;
            // Update detailRecord if open
            if (this.detailRecord) {
              const fresh = updated.find(r => r.registrationId === this.detailRecord!.registrationId);
              if (fresh) this.detailRecord = fresh;
            }
            this.applyFilters();
          }
        }
      });
  }

  // ── Filter & paginate ─────────────────────────────────────────────────────

  applyFilters(): void {
    let list = [...this.registrations];
    if (this.statusFilter !== 'all') list = list.filter(r => r.status === this.statusFilter);
    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      list = list.filter(r =>
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        r.registrationId.toLowerCase().includes(q)
      );
    }
    this.filteredRegistrations = list;
    this.totalPages = Math.ceil(list.length / this.itemsPerPage);
    this.currentPage = Math.min(this.currentPage, Math.max(1, this.totalPages));
    this.paginate();
  }

  paginate(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedRegistrations = this.filteredRegistrations.slice(start, start + this.itemsPerPage);
  }

  onSearch(): void { this.currentPage = 1; this.applyFilters(); }
  setStatusFilter(f: RegistrationStatus | 'all'): void { this.statusFilter = f; this.currentPage = 1; this.applyFilters(); }
  nextPage(): void { if (this.currentPage < this.totalPages) { this.currentPage++; this.paginate(); } }
  prevPage(): void { if (this.currentPage > 1) { this.currentPage--; this.paginate(); } }
  goToPage(p: number): void { this.currentPage = p; this.paginate(); }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  // ── Stats ─────────────────────────────────────────────────────────────────
  get totalCount(): number    { return this.registrations.length; }
  get pendingCount(): number  { return this.registrations.filter(r => r.status === 'pending').length; }
  get approvedCount(): number { return this.registrations.filter(r => r.status === 'approved').length; }
  get rejectedCount(): number { return this.registrations.filter(r => r.status === 'rejected').length; }

  // ── Detail view ───────────────────────────────────────────────────────────

  openDetail(record: RegistrationRecord): void {
    this.detailRecord = record;
    this.viewMode = 'detail';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goBack(): void {
    this.viewMode = 'table';
    this.detailRecord = null;
    this.closeLightbox();
  }

  // ── Lightbox ──────────────────────────────────────────────────────────────

  openLightbox(src: string, title: string): void {
    this.lightboxSrc = src;
    this.lightboxTitle = title;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.lightboxSrc = null;
    this.lightboxTitle = '';
    document.body.style.overflow = '';
  }

  isImage(filename: string | null): boolean {
    if (!filename) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  }

  // ── Status update ─────────────────────────────────────────────────────────

  promptStatusChange(record: RegistrationRecord, newStatus: RegistrationStatus): void {
    this.statusModalRecord = record;
    this.pendingStatus = newStatus;
    this.rejectionReason = '';
    this.showStatusModal = true;
  }

  closeStatusModal(): void {
    this.showStatusModal = false;
    this.statusModalRecord = null;
    this.pendingStatus = null;
    this.rejectionReason = '';
  }

  confirmStatusChange(): void {
    if (!this.statusModalRecord || !this.pendingStatus) return;
    if (this.pendingStatus === 'rejected' && !this.rejectionReason.trim()) {
      this.toast('Please provide a rejection reason.', 'error');
      return;
    }
    this.statusUpdating = true;
    const payload: any = { status: this.pendingStatus };
    if (this.pendingStatus === 'rejected') payload.rejectionReason = this.rejectionReason.trim();

    this.http
      .patch(`${this.api}/api/registrations/${this.statusModalRecord.registrationId}/status`, payload)
      .subscribe({
        next: () => {
          const rec = this.registrations.find(r => r.registrationId === this.statusModalRecord!.registrationId);
          if (rec) {
            rec.status = this.pendingStatus!;
            rec.rejectionReason = this.pendingStatus === 'rejected' ? this.rejectionReason : undefined;
          }
          if (this.detailRecord?.registrationId === this.statusModalRecord!.registrationId) {
            this.detailRecord!.status = this.pendingStatus!;
            if (this.pendingStatus === 'rejected') this.detailRecord!.rejectionReason = this.rejectionReason;
          }
          this.applyFilters();
          this.toast(`Marked ${this.pendingStatus}. Email sent to applicant.`, 'success');
          this.statusUpdating = false;
          this.closeStatusModal();
        },
        error: () => {
          this.toast('Status update failed.', 'error');
          this.statusUpdating = false;
        }
      });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  openDeleteModal(id: string, name: string): void {
    this.deleteTarget = { id, name };
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void { this.showDeleteModal = false; this.deleteTarget = null; }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.deleteLoading = true;
    this.http.delete(`${this.api}/api/registrations/${this.deleteTarget.id}`).subscribe({
      next: () => {
        this.registrations = this.registrations.filter(r => r.registrationId !== this.deleteTarget!.id);
        this.applyFilters();
        this.toast('Record deleted.', 'success');
        this.deleteLoading = false;
        this.closeDeleteModal();
        if (this.detailRecord?.registrationId === this.deleteTarget?.id) this.goBack();
      },
      error: () => {
        this.toast('Delete failed.', 'error');
        this.deleteLoading = false;
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  fileUrl(registrationId: string, filename: string | null): string | null {
    if (!filename) return null;
    return `${this.api}/api/registrations/${registrationId}/file/${filename}`;
  }

  statusLabel(s: RegistrationStatus): string {
    return { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }[s];
  }

  categoryLabel(c: string): string {
    return c === 'nysc' ? 'NYSC / Awaiting' : 'Graduate / Pro';
  }

  downloadPDF(): void {
    const list = this.filteredRegistrations;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(`<html><head><title>Registrations Export</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px;}h2{text-align:center;color:#B88D2A;}
      table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{border:1px solid #ccc;padding:7px 10px;}
      th{background:#f5f5f5;}.pending{color:#f59e0b;}.approved{color:#10b981;}.rejected{color:#ef4444;}</style></head>
      <body><h2>Work Readiness Registrations</h2><p>Generated: ${new Date().toLocaleString()}</p>
      <table><thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Category</th><th>Status</th><th>Submitted</th></tr></thead>
      <tbody>${list.map((r, i) => `<tr><td>${i+1}</td><td>${r.fullName}</td><td>${r.email}</td><td>${r.phone}</td>
        <td>${r.category === 'nysc' ? 'NYSC/Awaiting' : 'Graduate/Pro'}</td>
        <td class="${r.status}">${r.status.toUpperCase()}</td>
        <td>${new Date(r.submittedAt).toLocaleString()}</td></tr>`).join('')}
      </tbody></table></body></html>`);
    doc.close();
    setTimeout(() => { iframe.contentWindow?.print(); document.body.removeChild(iframe); }, 400);
  }

  toast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 4000);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
