// src/app/core/admin-registration/admin-registration.component.ts
// KEY FIX: mapRecords() normalises MongoDB fields → what the template expects

import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService }                  from '../../core/auth/auth.service';
import { Router }                       from '@angular/router';
import { environment }                  from '../../../environments/environment';
import { interval, Subscription }       from 'rxjs';
import { switchMap }                    from 'rxjs/operators';
import { AdminRegistrationService } from '../services/admin-registration.service';


export type RegistrationStatus = 'pending' | 'approved' | 'rejected';
export type ViewMode            = 'table' | 'detail';

export interface RegistrationRecord {
  registrationId:        string;
  fullName:              string;
  email:                 string;
  phone:                 string;
  category:              'nysc' | 'graduate';
  status:                RegistrationStatus;
  submittedAt:           string;
  rejectionReason?:      string;
  assessmentScore?:      number;
  assessmentTotal?:      number;
  assessmentPercentage?: number;
  assessmentLevel?:      'below-expectation' | 'foundational' | 'strong';
  files: {
    photo:        string | null;
    statement:    string | null;
    callUpLetter: string | null;
    paymentProof: string | null;
  };
}

@Component({
  selector:    'app-admin-registration',
  templateUrl: './admin-registration.component.html',
  styleUrls:   ['./admin-registration.component.css'],
})
export class AdminRegistrationComponent implements OnInit, OnDestroy {

  Math = Math;

  viewMode:     ViewMode                  = 'table';
  detailRecord: RegistrationRecord | null = null;

  lightboxSrc   = '';
  lightboxTitle = '';

  registrations:          RegistrationRecord[] = [];
  filteredRegistrations:  RegistrationRecord[] = [];
  paginatedRegistrations: RegistrationRecord[] = [];

  searchTerm   = '';
  statusFilter: RegistrationStatus | 'all' = 'all';

  currentPage  = 1;
  itemsPerPage = 10;
  totalPages   = 0;

  loading      = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'success';
  showToast    = false;

  showStatusModal    = false;
  statusModalRecord: RegistrationRecord | null = null;
  pendingStatus:     RegistrationStatus | null = null;
  rejectionReason    = '';
  statusUpdating     = false;

  showDeleteModal = false;
  deleteTarget: { id: string; name: string } | null = null;
  deleteLoading   = false;

  private pollSub?: Subscription;
  private readonly POLL_INTERVAL = 15_000;
  private api = environment.apiUrl;

  constructor(
   
      private adminService: AdminRegistrationService,
      private auth: AuthService,
      private router: Router
    
  ) {}

  ngOnInit():    void { this.loadAll(); this.startPolling(); }
  ngOnDestroy(): void { this.pollSub?.unsubscribe(); }

  // ─────────────────────────────────────────────────────────────────────────
  //  loadAll: fetch from MongoDB via backend
  // ─────────────────────────────────────────────────────────────────────────

  loadAll(): void {
    this.loading = true;
  
    this.adminService.getAll().subscribe({
      next: (data: any[]) => {
        this.registrations = this.mapRecords(data);
        this.applyFilters();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('[AdminRegistration] loadAll failed:', err);
        this.toast('Could not load registrations. Is the backend running?', 'error');
        this.loading = false;
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  mapRecords: normalise MongoDB doc → RegistrationRecord
  //
  //  MongoDB stores: registrationId, fullName, email, phone, category,
  //  status, submittedAt, files{photo, statement, callUpLetter, paymentProof}
  //  assessment*, rejectionReason
  //
  //  This handles both the new schema (server.js above) AND older records
  //  that might have different field names.
  // ─────────────────────────────────────────────────────────────────────────

  private mapRecords(raw: any[]): RegistrationRecord[] {
    if (!Array.isArray(raw)) return [];

    return raw
      .map((r): RegistrationRecord => ({
        registrationId:        r.registrationId || r._id?.toString() || '',
        fullName:              r.fullName        || r.name            || 'Unknown',
        email:                 r.email           || '',
        phone:                 r.phone           || r.mobile          || '',
        category:              (r.category?.toLowerCase() === 'nysc' ? 'nysc' : 'graduate'),
        status:                (['pending', 'approved', 'rejected'].includes(r.status)
                                  ? r.status : 'pending') as RegistrationStatus,
        rejectionReason:       r.rejectionReason || undefined,
        submittedAt:           r.submittedAt
                                 ? new Date(r.submittedAt).toISOString()
                                 : r.createdAt
                                   ? new Date(r.createdAt).toISOString()
                                   : new Date().toISOString(),
        assessmentScore:       r.assessmentScore      != null ? Number(r.assessmentScore)      : undefined,
        assessmentTotal:       r.assessmentTotal      != null ? Number(r.assessmentTotal)      : undefined,
        assessmentPercentage:  r.assessmentPercentage != null ? Number(r.assessmentPercentage) : undefined,
        assessmentLevel:       r.assessmentLevel      || undefined,
        files: {
          photo:        r.files?.photo        || null,
          statement:    r.files?.statement    || null,
          callUpLetter: r.files?.callUpLetter || null,
          paymentProof: r.files?.paymentProof || null,
        },
      }))
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Polling: re-fetch every 15s, re-render only when data changed
  // ─────────────────────────────────────────────────────────────────────────

  private startPolling(): void {
    this.pollSub = interval(this.POLL_INTERVAL)
      .pipe(switchMap(() => this.adminService.getAll()))
      .subscribe({
        next: data => {
          const updated = this.mapRecords(data);
          if (JSON.stringify(updated) !== JSON.stringify(this.registrations)) {
            this.registrations = updated;
            if (this.detailRecord) {
              const fresh = updated.find(r => r.registrationId === this.detailRecord!.registrationId);
              if (fresh) this.detailRecord = fresh;
            }
            this.applyFilters();
          }
        },
      });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Filter & paginate
  // ─────────────────────────────────────────────────────────────────────────

  applyFilters(): void {
    let list = [...this.registrations];
    if (this.statusFilter !== 'all') list = list.filter(r => r.status === this.statusFilter);
    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      list = list.filter(r =>
        r.fullName.toLowerCase().includes(q)       ||
        r.email.toLowerCase().includes(q)          ||
        r.phone.includes(q)                        ||
        r.registrationId.toLowerCase().includes(q)
      );
    }
    this.filteredRegistrations = list;
    this.totalPages  = Math.ceil(list.length / this.itemsPerPage);
    this.currentPage = Math.min(this.currentPage, Math.max(1, this.totalPages));
    this.paginate();
  }

  paginate(): void {
    const s = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedRegistrations = this.filteredRegistrations.slice(s, s + this.itemsPerPage);
  }

  onSearch():                                     void { this.currentPage = 1; this.applyFilters(); }
  setStatusFilter(f: RegistrationStatus | 'all'): void { this.statusFilter = f; this.currentPage = 1; this.applyFilters(); }
  nextPage(): void { if (this.currentPage < this.totalPages) { this.currentPage++; this.paginate(); } }
  prevPage(): void { if (this.currentPage > 1)               { this.currentPage--; this.paginate(); } }
  goToPage(p: number): void { this.currentPage = p; this.paginate(); }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  // ─────────────────────────────────────────────────────────────────────────
  //  Stats
  // ─────────────────────────────────────────────────────────────────────────

  get totalCount():    number { return this.registrations.length; }
  get pendingCount():  number { return this.registrations.filter(r => r.status === 'pending').length;  }
  get approvedCount(): number { return this.registrations.filter(r => r.status === 'approved').length; }
  get rejectedCount(): number { return this.registrations.filter(r => r.status === 'rejected').length; }

  // ─────────────────────────────────────────────────────────────────────────
  //  Detail view
  // ─────────────────────────────────────────────────────────────────────────

  openDetail(record: RegistrationRecord): void {
    this.detailRecord = record;
    this.viewMode     = 'detail';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goBack(): void {
    this.viewMode     = 'table';
    this.detailRecord = null;
    this.closeLightbox();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Lightbox
  // ─────────────────────────────────────────────────────────────────────────

  openLightbox(src: string, title: string): void {
    this.lightboxSrc             = src;
    this.lightboxTitle           = title;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.lightboxSrc             = '';
    this.lightboxTitle           = '';
    document.body.style.overflow = '';
  }

  isImage(filename: string | null): boolean {
    if (!filename) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  File URL builder
  // ─────────────────────────────────────────────────────────────────────────

  fileUrl(registrationId: string, filename: string | null): string | null {
    if (!filename) return null;
    return `${this.api}/api/registration/${registrationId}/file/${filename}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Status change
  // ─────────────────────────────────────────────────────────────────────────

  promptStatusChange(record: RegistrationRecord, newStatus: RegistrationStatus): void {
    this.statusModalRecord = record;
    this.pendingStatus     = newStatus;
    this.rejectionReason   = '';
    this.showStatusModal   = true;
  }

  closeStatusModal(): void {
    this.showStatusModal   = false;
    this.statusModalRecord = null;
    this.pendingStatus     = null;
    this.rejectionReason   = '';
  }

  confirmStatusChange(): void {
    if (!this.statusModalRecord || !this.pendingStatus) return;
    if (this.pendingStatus === 'rejected' && !this.rejectionReason.trim()) {
      this.toast('Please provide a rejection reason.', 'error');
      return;
    }
    this.statusUpdating     = true;
    const payload: any      = { status: this.pendingStatus };
    if (this.pendingStatus === 'rejected') payload.rejectionReason = this.rejectionReason.trim();

    this.adminService.updateStatus(
      this.statusModalRecord.registrationId,
      payload
    ).subscribe({
      next: () => {
        const rec = this.registrations.find(
          r => r.registrationId === this.statusModalRecord!.registrationId
        );
    
        if (rec) {
          rec.status = this.pendingStatus!;
          rec.rejectionReason =
            this.pendingStatus === 'rejected' ? this.rejectionReason : undefined;
        }
    
        if (this.detailRecord?.registrationId === this.statusModalRecord!.registrationId) {
          this.detailRecord.status = this.pendingStatus!;
          this.detailRecord.rejectionReason =
            this.pendingStatus === 'rejected' ? this.rejectionReason : undefined;
        }
    
        this.applyFilters();
        this.toast(`Marked as ${this.pendingStatus}.`, 'success');
        this.statusUpdating = false;
        this.closeStatusModal();
      },
      error: () => {
        this.toast('Status update failed.', 'error');
        this.statusUpdating = false;
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Delete
  // ─────────────────────────────────────────────────────────────────────────

  openDeleteModal(id: string, name: string): void {
    this.deleteTarget    = { id, name };
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteTarget    = null;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.deleteLoading = true;
    this.adminService.delete(this.deleteTarget.id).subscribe({
      next: () => {
        this.registrations = this.registrations.filter(
          r => r.registrationId !== this.deleteTarget!.id
        );
    
        this.applyFilters();
        this.toast('Record deleted successfully.', 'success');
    
        if (this.detailRecord?.registrationId === this.deleteTarget?.id) {
          this.goBack();
        }
    
        this.closeDeleteModal();
        this.deleteLoading = false;
      },
      error: () => {
        this.toast('Delete failed. Please try again.', 'error');
        this.deleteLoading = false;
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Helpers
  // ─────────────────────────────────────────────────────────────────────────

  assessmentLevelLabel(level?: string): string {
    const map: Record<string, string> = {
      'below-expectation': 'Below Expectation',
      'foundational':      'Foundational Awareness',
      'strong':            'Strong Awareness',
    };
    return level ? (map[level] ?? level) : 'N/A';
  }

  statusLabel(s: RegistrationStatus): string {
    return { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }[s];
  }

  categoryLabel(c: string): string {
    return c === 'nysc' ? 'NYSC / Awaiting' : 'Graduate / Pro';
  }

  downloadPDF(): void {
    const list   = this.filteredRegistrations;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(`<html><head><title>Registrations Export</title>
      <style>
        body  { font-family: Arial; padding: 20px; font-size: 12px; }
        h2    { text-align: center; color: #B88D2A; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th,td { border: 1px solid #ccc; padding: 7px 10px; }
        th    { background: #f5f5f5; }
        .pending  { color: #f59e0b; }
        .approved { color: #10b981; }
        .rejected { color: #ef4444; }
      </style></head>
      <body>
        <h2>Work Readiness Registrations</h2>
        <p>Generated: ${new Date().toLocaleString()} | Total: ${list.length}</p>
        <table>
          <thead><tr>
            <th>#</th><th>Name</th><th>Email</th><th>Phone</th>
            <th>Category</th><th>Status</th><th>Assessment</th><th>Submitted</th>
          </tr></thead>
          <tbody>
            ${list.map((r, i) => `<tr>
              <td>${i + 1}</td><td>${r.fullName}</td><td>${r.email}</td><td>${r.phone}</td>
              <td>${r.category === 'nysc' ? 'NYSC/Awaiting' : 'Graduate/Pro'}</td>
              <td class="${r.status}">${r.status.toUpperCase()}</td>
              <td>${r.assessmentPercentage != null ? r.assessmentPercentage + '%' : 'N/A'}</td>
              <td>${new Date(r.submittedAt).toLocaleString()}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </body></html>`);
    doc.close();
    setTimeout(() => { iframe.contentWindow?.print(); document.body.removeChild(iframe); }, 400);
  }

  toast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.toastMessage = message;
    this.toastType    = type;
    this.showToast    = true;
    setTimeout(() => { this.showToast = false; }, 4000);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}