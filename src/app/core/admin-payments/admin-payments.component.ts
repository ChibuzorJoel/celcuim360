import { Component, OnInit } from '@angular/core';

interface Payment {
  id: string;
  name: string;
  email: string;
  amount: number;
  reference: string;
  receiptUploaded: boolean;
  method: string;
  status: 'pending' | 'verified' | 'rejected';
  date: Date;
}

@Component({
  selector: 'app-admin-payments',
  templateUrl: './admin-payments.component.html',
  styleUrls: ['./admin-payments.component.css'],
})
export class AdminPaymentsComponent implements OnInit {
  payments: Payment[] = [];
  filteredPayments: Payment[] = [];
  activeFilter: 'all' | 'pending' | 'verified' | 'rejected' = 'all';
  searchTerm = '';
  totalRevenue = 0;

  ngOnInit(): void {
    this.payments = [
      { id: 'p1', name: 'Ada Okonkwo',   email: 'ada@email.com',   amount: 45000, reference: 'REF-00291', receiptUploaded: true,  method: 'Bank Transfer', status: 'pending',  date: new Date('2025-06-01') },
      { id: 'p2', name: 'Emeka Nwosu',   email: 'emeka@email.com', amount: 45000, reference: 'REF-00287', receiptUploaded: true,  method: 'Bank Transfer', status: 'verified', date: new Date('2025-05-30') },
      { id: 'p3', name: 'Bola Fashola',  email: 'bola@email.com',  amount: 45000, reference: 'REF-00292', receiptUploaded: false, method: 'Card',          status: 'pending',  date: new Date('2025-06-02') },
      { id: 'p4', name: 'Tolu Adeyemi',  email: 'tolu@email.com',  amount: 45000, reference: 'REF-00289', receiptUploaded: true,  method: 'Bank Transfer', status: 'rejected', date: new Date('2025-05-28') },
      { id: 'p5', name: 'Ngozi Eze',     email: 'ngozi@email.com', amount: 45000, reference: 'REF-00293', receiptUploaded: true,  method: 'Bank Transfer', status: 'verified', date: new Date('2025-06-03') },
      { id: 'p6', name: 'Chidi Obi',     email: 'chidi@email.com', amount: 45000, reference: 'REF-00295', receiptUploaded: false, method: 'USSD',          status: 'pending',  date: new Date('2025-06-04') },
    ];
    this.applyFilters();
  }

  setFilter(f: 'all' | 'pending' | 'verified' | 'rejected' = 'all'): void {
    this.activeFilter = f;
  }

  applyFilters(): void {
    let list = this.payments;
    if (this.activeFilter !== 'all') list = list.filter(p => p.status === this.activeFilter);
    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q)
      );
    }
    this.filteredPayments = list;
    this.totalRevenue = this.payments.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);
  }

  countByStatus(s: string): number { return this.payments.filter(p => p.status === s).length; }

  getFilterLabel(): string {
    const map: Record<string, string> = { all: 'All Payments', pending: 'Unverified', verified: 'Verified', rejected: 'Rejected' };
    return map[this.activeFilter];
  }

  initials(name: string): string {
    return name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  }

  verify(p: Payment): void {
    p.status = 'verified';
    this.applyFilters();
    // this.paymentService.updateStatus(p.id, 'verified').subscribe();
  }

  reject(p: Payment): void {
    p.status = 'rejected';
    this.applyFilters();
    // this.paymentService.updateStatus(p.id, 'rejected').subscribe();
  }

  request(p: Payment): void {
    alert(`Receipt request sent to ${p.email}`);
  }

  exportPDF(): void {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(`<html><head><title>Payment Records</title>
      <style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ccc;padding:6px;font-size:11px}th{background:#f2f2f2}</style>
      </head><body><h2>${this.getFilterLabel()}</h2>
      <p>Generated: ${new Date().toLocaleString()}</p><table>
      <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Amount</th><th>Reference</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>${this.filteredPayments.map((p, i) => `
        <tr><td>${i+1}</td><td>${p.name}</td><td>${p.email}</td>
        <td>₦${p.amount.toLocaleString()}</td><td>${p.reference}</td>
        <td>${p.status}</td><td>${new Date(p.date).toLocaleDateString()}</td></tr>
      `).join('')}</tbody></table></body></html>`);
    doc.close();
    setTimeout(() => { iframe.contentWindow?.print(); document.body.removeChild(iframe); }, 400);
  }
}