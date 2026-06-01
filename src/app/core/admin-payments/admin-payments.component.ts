// src/app/admin/admin-payments/admin-payments.component.ts
// Wired to real backend — fetches, verifies, rejects payments from MongoDB

import { Component, OnInit } from '@angular/core';
import { HttpClient }        from '@angular/common/http';
import { environment }       from '../../../environments/environment';

export interface Payment {
  paymentId:       string;
  registrationId:  string;
  studentName:     string;
  studentEmail:    string;
  amount:          number;
  reference:       string | null;
  proofFile:       string | null;
  method:          string;
  status:          'pending' | 'verified' | 'rejected' | 'refunded';
  notes:           string | null;
  submittedAt:     string;
  verifiedAt:      string | null;
  verifiedBy:      string | null;
  rejectionReason: string | null;
}

export interface PaymentStats {
  totalRevenue:  number;
  verifiedCount: number;
  pending:       number;
  verified:      number;
  rejected:      number;
  refunded:      number;
}

@Component({
  selector:    'app-admin-payments',
  templateUrl: './admin-payments.component.html',
  styleUrls:   ['./admin-payments.component.css'],
})
export class AdminPaymentsComponent implements OnInit {

  private api = environment.apiUrl;

  payments:         Payment[] = [];
  filteredPayments: Payment[] = [];
  activeFilter: 'all' | 'pending' | 'verified' | 'rejected' = 'all';
  searchTerm = '';

  stats: PaymentStats = {
    totalRevenue: 0, verifiedCount: 0,
    pending: 0, verified: 0, rejected: 0, refunded: 0,
  };

  loading      = false;
  toastMsg     = '';
  toastType: 'success' | 'error' | 'info' = 'success';
  showToast    = false;

  showRejectModal  = false;
  rejectTarget:    Payment | null = null;
  rejectionReason  = '';
  rejectLoading    = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.loadPayments(); }

  loadPayments(): void {
    this.loading = true;
    this.http.get<any>(`${this.api}/api/payments?limit=200`).subscribe({
      next: (res) => {
        this.payments = res.payments || [];
        this.stats    = res.stats    || this.stats;
        this.applyFilters();
        this.loading  = false;
      },
      error: () => {
        this.toast('Failed to load payments. Check backend connection.', 'error');
        this.loading = false;
      },
    });
  }

  setFilter(f: 'all' | 'pending' | 'verified' | 'rejected'): void {
    this.activeFilter = f; this.applyFilters();
  }

  applyFilters(): void {
    let list = [...this.payments];
    if (this.activeFilter !== 'all') list = list.filter(p => p.status === this.activeFilter);
    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      list = list.filter(p =>
        p.studentName.toLowerCase().includes(q)  ||
        p.studentEmail.toLowerCase().includes(q) ||
        (p.reference || '').toLowerCase().includes(q) ||
        p.paymentId.toLowerCase().includes(q)
      );
    }
    this.filteredPayments = list;
  }

  verify(p: Payment): void {
    if (p.status === 'verified') return;
    this.http.patch<any>(`${this.api}/api/payments/${p.paymentId}/verify`, { verifiedBy: 'Admin' }).subscribe({
      next: (res) => {
        const idx = this.payments.findIndex(x => x.paymentId === p.paymentId);
        if (idx !== -1) this.payments[idx] = res.payment;
        this.stats.pending = Math.max(0, this.stats.pending - 1);
        this.stats.verified += 1;
        this.stats.totalRevenue += p.amount;
        this.applyFilters();
        this.toast(`Payment verified. Email sent to ${p.studentEmail}.`, 'success');
      },
      error: (err) => this.toast(err?.error?.message || 'Verify failed.', 'error'),
    });
  }

  openRejectModal(p: Payment): void {
    this.rejectTarget    = p;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectTarget    = null;
    this.rejectionReason = '';
  }

  confirmReject(): void {
    if (!this.rejectTarget) return;
    if (!this.rejectionReason.trim()) { this.toast('Please provide a rejection reason.', 'error'); return; }

    this.rejectLoading = true;
    this.http.patch<any>(`${this.api}/api/payments/${this.rejectTarget.paymentId}/reject`, {
      rejectionReason: this.rejectionReason.trim(), rejectedBy: 'Admin',
    }).subscribe({
      next: (res) => {
        const idx = this.payments.findIndex(x => x.paymentId === this.rejectTarget!.paymentId);
        if (idx !== -1) this.payments[idx] = res.payment;
        this.stats.pending = Math.max(0, this.stats.pending - 1);
        this.stats.rejected += 1;
        this.applyFilters();
        this.rejectLoading = false;
        this.closeRejectModal();
        this.toast('Payment rejected. Student notified by email.', 'success');
      },
      error: (err) => {
        this.rejectLoading = false;
        this.toast(err?.error?.message || 'Rejection failed.', 'error');
      },
    });
  }

  requestReceipt(p: Payment): void {
    this.http.post<any>(`${this.api}/api/payments/${p.paymentId}/request-receipt`, {}).subscribe({
      next: () => this.toast(`Receipt request sent to ${p.studentEmail}.`, 'info'),
      error: (err) => this.toast(err?.error?.message || 'Request failed.', 'error'),
    });
  }

  syncPayments(): void {
    this.http.post<any>(`${this.api}/api/payments/sync`, {}).subscribe({
      next: (res) => { this.toast(res.message, 'success'); this.loadPayments(); },
      error: () => this.toast('Sync failed.', 'error'),
    });
  }

  get totalRevenue(): number { return this.stats.totalRevenue || 0; }
  countByStatus(s: string): number { return this.payments.filter(p => p.status === s).length; }
  getFilterLabel(): string {
    return { all: 'All Payments', pending: 'Unverified', verified: 'Verified', rejected: 'Rejected' }[this.activeFilter];
  }
  initials(name: string): string {
    return (name || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }
  methodLabel(m: string): string {
    return { bank_transfer: 'Bank Transfer', paystack: 'Paystack', flutterwave: 'Flutterwave', cash: 'Cash', other: 'Other' }[m] || m || 'N/A';
  }
  proofUrl(p: Payment): string | null {
    if (!p.proofFile) return null;
    return `${this.api}/api/registrations/${p.registrationId}/file/${p.proofFile}`;
  }

  toast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.toastMsg = message; this.toastType = type; this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 4000);
  }

  exportPDF(): void {
    const list = this.filteredPayments;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(`<html><head><title>Payments</title>
      <style>body{font-family:Arial;padding:20px;font-size:12px}h2{color:#B88D2A}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border:1px solid #ccc;padding:6px 10px}th{background:#f5f5f5}
      .verified{color:#10b981}.pending{color:#f59e0b}.rejected{color:#ef4444}</style></head>
      <body><h2>Celcium360 — ${this.getFilterLabel()}</h2>
      <p>Generated: ${new Date().toLocaleString()} | Total: ${list.length}</p>
      <table><thead><tr><th>#</th><th>Name</th><th>Email</th><th>Amount</th>
      <th>Reference</th><th>Method</th><th>Receipt</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>${list.map((p, i) => `<tr>
        <td>${i+1}</td><td>${p.studentName}</td><td>${p.studentEmail}</td>
        <td>₦${Number(p.amount).toLocaleString()}</td><td>${p.reference||'N/A'}</td>
        <td>${this.methodLabel(p.method)}</td><td>${p.proofFile ? '✓ Yes' : '✗ Missing'}</td>
        <td class="${p.status}">${p.status.toUpperCase()}</td>
        <td>${new Date(p.submittedAt).toLocaleDateString()}</td></tr>`).join('')}
      </tbody></table></body></html>`);
    doc.close();
    setTimeout(() => { iframe.contentWindow?.print(); document.body.removeChild(iframe); }, 400);
  }
}