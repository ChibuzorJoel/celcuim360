// src/app/admin/admin-registration/admin-registration.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { AdminRegistrationService, RegistrationRecord as ServiceRecord } from '../../core/services/admin-registration.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AdminSearchService } from '../../core/services/admin-search.service';
import { interval, Subscription, Subject } from 'rxjs';
import { switchMap, catchError, takeUntil } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

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

  // ── Lightbox ──────────────────────────────────────────────────────────────
  lightboxSrc: string | null = null;
  lightboxTitle = '';

  // ── State ─────────────────────────────────────────────────────────────────
  activeTab: ActiveTab = 'registrations';

  registrations: RegistrationRecord[] = [];
  filteredRegistrations: RegistrationRecord[] = [];
  paginatedRegistrations: RegistrationRecord[] = [];
  contacts: ContactRecord[] = [];

  // ── Filters ───────────────────────────────────────────────────────────────
  searchTerm   = '';
  statusFilter: RegistrationStatus | 'all' = 'all';

  // ── Pagination ────────────────────────────────────────────────────────────
  currentPage  = 1;
  itemsPerPage = 10;
  totalPages   = 0;

  // ── UI ────────────────────────────────────────────────────────────────────
  loading      = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'success';
  showToast    = false;

  // ── Status modal ──────────────────────────────────────────────────────────
  showStatusModal    = false;
  statusModalRecord: RegistrationRecord | null = null;
  pendingStatus: RegistrationStatus | null = null;
  rejectionReason    = '';
  statusUpdating     = false;

  // ── Delete modal ──────────────────────────────────────────────────────────
  showDeleteModal = false;
  deleteTarget: { id: string; name: string } | null = null;
  deleteLoading   = false;

  // ── Polling ───────────────────────────────────────────────────────────────
  private pollSub?: Subscription;
  private destroy$ = new Subject<void>();
  private readonly POLL_INTERVAL = 15_000;
  private api = environment.apiUrl;

  constructor(
    private http:         HttpClient,
    private auth:         AuthService,
    private searchService: AdminSearchService, 
    private adminService: AdminRegistrationService,
    private router:       Router
  ) {}

  ngOnInit(): void {
    this.loadAll();
    this.startPolling();

    this.searchService.filters$
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.currentPage = 1;
      this.applyFilters();
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Assessment helpers ────────────────────────────────────────────────────

  assessmentLevelLabel(level?: 'below-expectation' | 'foundational' | 'strong'): string {
    switch (level) {
      case 'below-expectation': return 'Below Expectation';
      case 'foundational':      return 'Foundational';
      case 'strong':            return 'Strong';
      default:                  return 'Not Available';
    }
  }

  getAssessmentColor(level?: 'below-expectation' | 'foundational' | 'strong'): string {
    switch (level) {
      case 'below-expectation': return '#dc2626';
      case 'foundational':      return '#f59e0b';
      case 'strong':            return '#16a34a';
      default:                  return '#6b7280';
    }
  }

  getAssessmentPercentage(record: RegistrationRecord): number {
    if (record.assessmentPercentage !== undefined) return record.assessmentPercentage;
    if (record.assessmentScore !== undefined && record.assessmentTotal && record.assessmentTotal > 0) {
      return Math.round((record.assessmentScore / record.assessmentTotal) * 100);
    }
    return 0;
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  loadAll(): void {
    this.loading = true;
    this.adminService.getAll().subscribe({
      next: data => {
        this.registrations = (data as RegistrationRecord[]).sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        this.applyFilters();
        this.loading = false;
      },
      error: (err: Error) => {
        this.toast(err.message || 'Failed to load registrations', 'error');
        this.loading = false;
      }
    });
  }

  private startPolling(): void {
    this.pollSub = interval(this.POLL_INTERVAL)
      .pipe(switchMap(() => this.adminService.getAll().pipe(catchError(() => EMPTY))))
      .subscribe({
        next: data => {
          const updated = (data as RegistrationRecord[]).sort(
            (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
          );
          if (JSON.stringify(updated) !== JSON.stringify(this.registrations)) {
            this.registrations = updated;
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
    const global = this.searchService.snapshot;
  
    // Local search input takes priority; fall back to topbar search
    const term     = (this.searchTerm.trim() || global.search || '').toLowerCase();
    const status   = this.statusFilter !== 'all' ? this.statusFilter : global.status as RegistrationStatus | 'all';
    const category = global.cohort;   // 'all' | 'nysc' | 'graduate'
    const dateFrom = global.dateFrom;
    const dateTo   = global.dateTo;
  
    let list = [...this.registrations];
  
    if (status !== 'all') {
      list = list.filter(r => r.status === status);
    }
  
    if (category !== 'all') {
      list = list.filter(r => r.category === category);
    }
  
    if (dateFrom) {
      list = list.filter(r => r.submittedAt?.slice(0, 10) >= dateFrom);
    }
  
    if (dateTo) {
      list = list.filter(r => r.submittedAt?.slice(0, 10) <= dateTo);
    }
  
    if (term) {
      list = list.filter(r =>
        (r.fullName        ?? '').toLowerCase().includes(term) ||
        (r.email           ?? '').toLowerCase().includes(term) ||
        (r.phone           ?? '').includes(term)               ||
        (r.registrationId  ?? '').toLowerCase().includes(term)
      );
    }
  
    this.filteredRegistrations = list;
    this.totalPages  = Math.ceil(list.length / this.itemsPerPage);
    this.currentPage = Math.min(this.currentPage, Math.max(1, this.totalPages));
    this.paginate();
  }

  paginate(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedRegistrations = this.filteredRegistrations.slice(start, start + this.itemsPerPage);
  }

  onSearch(): void { this.currentPage = 1; this.applyFilters(); }

  setStatusFilter(f: RegistrationStatus | 'all'): void {
    this.statusFilter = f;
    this.currentPage  = 1;
    this.applyFilters();
  }

  nextPage(): void { if (this.currentPage < this.totalPages) { this.currentPage++; this.paginate(); } }
  prevPage(): void { if (this.currentPage > 1)               { this.currentPage--; this.paginate(); } }
  goToPage(p: number): void { this.currentPage = p; this.paginate(); }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  // ── Stats ─────────────────────────────────────────────────────────────────
  get totalCount():    number { return this.registrations.length; }
  get pendingCount():  number { return this.registrations.filter(r => r.status === 'pending').length; }
  get approvedCount(): number { return this.registrations.filter(r => r.status === 'approved').length; }
  get rejectedCount(): number { return this.registrations.filter(r => r.status === 'rejected').length; }

  // ── Detail view ───────────────────────────────────────────────────────────

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

  // ── Lightbox ──────────────────────────────────────────────────────────────

  openLightbox(src: string, title: string): void {
    this.lightboxSrc   = src;
    this.lightboxTitle = title;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.lightboxSrc   = null;
    this.lightboxTitle = '';
    document.body.style.overflow = '';
  }

  /**
   * Fetches file as Blob (with auth token) then opens in lightbox.
   */
  openLightboxForFile(registrationId: string, filename: string | null, title: string): void {
    if (!filename) return;
    this.fetchBlob(registrationId, filename).subscribe({
      next: blob => this.openLightbox(URL.createObjectURL(blob), title),
      error: () => this.toast('Could not load file preview.', 'error'),
    });
  }

  isImage(filename: string | null): boolean {
    if (!filename) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  }

  // ── File open / download ──────────────────────────────────────────────────

  /**
   * Fetches the file as a Blob (sending auth token), creates an object URL,
   * then opens it in a new tab. Fixes the "File wasn't available" error caused
   * by the browser not being able to send auth headers on a plain <a href>.
   */
  openFile(registrationId: string, filename: string | null): void {
    if (!filename) return;
    this.fetchBlob(registrationId, filename).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
      },
      error: () => this.toast('Could not open file.', 'error'),
    });
  }

  /**
   * Fetches file as Blob then triggers a browser download.
   */
  downloadFile(registrationId: string, filename: string | null): void {
    if (!filename) return;
    this.fetchBlob(registrationId, filename).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5_000);
      },
      error: () => this.toast('Could not download file.', 'error'),
    });
  }

  /** Internal — GET the protected file with auth header, return as Blob */
  private fetchBlob(registrationId: string, filename: string) {
    const token = localStorage.getItem('celcium_admin_token')
               ?? localStorage.getItem('adminToken')
               ?? localStorage.getItem('admin_token')
               ?? localStorage.getItem('token')
               ?? '';
    const headers = new HttpHeaders({
      'Authorization':              `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
    });
    return this.http.get(
      `${this.api}/api/registration/${registrationId}/file/${filename}`,
      { headers, responseType: 'blob' }
    );
  }

  // ── fileUrl (kept for backward compat if used elsewhere in template) ──────
  fileUrl(registrationId: string, filename: string | null): string | null {
    if (!filename) return null;
    return `${this.api}/api/registration/${registrationId}/file/${filename}`;
  }

  // ── Status update ─────────────────────────────────────────────────────────

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

    this.statusUpdating = true;
    const payload: any  = { status: this.pendingStatus };
    if (this.pendingStatus === 'rejected') payload.rejectionReason = this.rejectionReason.trim();

    this.adminService.updateStatus(this.statusModalRecord.registrationId, payload).subscribe({
      next: () => {
        const rec = this.registrations.find(r => r.registrationId === this.statusModalRecord!.registrationId);
        if (rec) {
          rec.status          = this.pendingStatus!;
          rec.rejectionReason = this.pendingStatus === 'rejected' ? this.rejectionReason : undefined;
        }
        if (this.detailRecord?.registrationId === this.statusModalRecord!.registrationId) {
          this.detailRecord!.status = this.pendingStatus!;
          if (this.pendingStatus === 'rejected') this.detailRecord!.rejectionReason = this.rejectionReason;
          else delete this.detailRecord!.rejectionReason;
        }
        this.applyFilters();
        this.toast(`Marked ${this.pendingStatus}. Email sent to applicant.`, 'success');
        this.statusUpdating = false;
        this.closeStatusModal();
      },
      error: (err: Error) => {
        this.toast(err.message || 'Status update failed.', 'error');
        this.statusUpdating = false;
      }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

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
    const targetId     = this.deleteTarget.id;

    this.adminService.delete(targetId).subscribe({
      next: () => {
        this.registrations = this.registrations.filter(r => r.registrationId !== targetId);
        this.applyFilters();
        this.toast('Record deleted.', 'success');
        this.deleteLoading = false;
        if (this.detailRecord?.registrationId === targetId) this.goBack();
        this.closeDeleteModal();
      },
      error: (err: Error) => {
        this.toast(err.message || 'Delete failed.', 'error');
        this.deleteLoading = false;
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

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
      <style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px;}h2{text-align:center;color:#B88D2A;}
      table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{border:1px solid #ccc;padding:7px 10px;}
      th{background:#f5f5f5;}.pending{color:#f59e0b;}.approved{color:#10b981;}.rejected{color:#ef4444;}</style></head>
      <body><h2>Work Readiness Registrations</h2><p>Generated: ${new Date().toLocaleString()}</p>
      <table><thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Category</th><th>Status</th><th>Submitted</th></tr></thead>
      <tbody>${list.map((r, i) => `<tr><td>${i + 1}</td><td>${r.fullName}</td><td>${r.email}</td><td>${r.phone}</td>
        <td>${r.category === 'nysc' ? 'NYSC/Awaiting' : 'Graduate/Pro'}</td>
        <td class="${r.status}">${r.status.toUpperCase()}</td>
        <td>${new Date(r.submittedAt).toLocaleString()}</td></tr>`).join('')}
      </tbody></table></body></html>`);
    doc.close();
    setTimeout(() => { iframe.contentWindow?.print(); document.body.removeChild(iframe); }, 400);
  }

  openTabUrl(url: string): void {
    window.open(url, '_blank');
  }

  downloadUrl(url: string, filename: string = 'download'): void {
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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