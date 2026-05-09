import { Component, OnInit } from '@angular/core';
import { ContactService, ContactRecord, ConsultationRecord } from '../services/contact.service';
import { forkJoin } from 'rxjs';

// ✅ Reusable tab type (cleaner)
type TabType = 'all' | 'contact' | 'consultation';

export interface ContactItem {
  id?: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  formType: 'contact' | 'consultation';
  date: string;
  read: boolean;

  // Optional fields
  projectDetails?: string;
  registrationType?: string;
}

@Component({
  selector: 'app-admin-contact',
  templateUrl: './admin-contact.component.html',
  styleUrls: ['./admin-contact.component.css'],
})
export class AdminContactComponent implements OnInit {

  records: ContactItem[] = [];
  filteredRecords: ContactItem[] = [];

  activeTab: TabType = 'all';
  searchTerm = '';

  showReplyModal = false;
  selectedRecord: ContactItem | null = null;
  replyMessage = '';

  constructor(private contactService: ContactService) {}

  ngOnInit(): void {
    this.loadRecords();
  }

  // ─────────────────────────────────────────────
  // LOAD DATA
  // ─────────────────────────────────────────────
  loadRecords(): void {
    forkJoin({
      contacts: this.contactService.getContacts(),
      consultations: this.contactService.getConsultations(),
    }).subscribe(({ contacts, consultations }) => {

      const mapped: ContactItem[] = [

        // CONTACT FORMS
        ...contacts.map((r: ContactRecord) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          phone: r.phone,
          message: r.message || '',
          formType: 'contact' as const,
          date: r.date || new Date().toISOString(),
          read: false,
        })),

        // CONSULTATION FORMS
        ...consultations.map((r: ConsultationRecord) => ({
          id: r.id,
          name: r.fullName || 'Unknown',
          email: r.email,
          phone: '',
          // ✅ Safe fallback (no TS error now if interface is correct)
          message: r.projectDetails || r.registrationType || 'Consultation request',
          formType: 'consultation' as const,
          date: r.date || new Date().toISOString(),
          read: false,
        })),
      ];

      // Sort latest first
      this.records = mapped.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      this.applyFilters();
    });
  }

  // ─────────────────────────────────────────────
  // TAB SWITCH (FIXED HERE)
  // ─────────────────────────────────────────────
  setTab(t: TabType): void {
    this.activeTab = t;
    this.applyFilters();
  }

  // ─────────────────────────────────────────────
  // FILTERING
  // ─────────────────────────────────────────────
  applyFilters(): void {
    let list = this.records;

    if (this.activeTab !== 'all') {
      list = list.filter(r => r.formType === this.activeTab);
    }

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();

      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.message.toLowerCase().includes(q)
      );
    }

    this.filteredRecords = list;
  }

  // ─────────────────────────────────────────────
  // LABEL
  // ─────────────────────────────────────────────
  getTabLabel(): string {
    const map: Record<TabType, string> = {
      all: 'All Forms',
      contact: 'Contact',
      consultation: 'Consultation'
    };

    return map[this.activeTab];
  }

  // ─────────────────────────────────────────────
  // UTIL
  // ─────────────────────────────────────────────
  initials(name: string): string {
    return name
      ?.split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  }

  markRead(r: ContactItem): void {
    r.read = true;
  }

  // ─────────────────────────────────────────────
  // REPLY MODAL
  // ─────────────────────────────────────────────
  openReply(r: ContactItem): void {
    this.selectedRecord = r;
    this.replyMessage = '';
    this.showReplyModal = true;
    this.markRead(r);
  }

  sendReply(): void {
    console.log('Reply sent to', this.selectedRecord?.email, ':', this.replyMessage);
    this.closeModals();
  }

  closeModals(): void {
    this.showReplyModal = false;
    this.selectedRecord = null;
  }

  // ─────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────
  deleteRecord(r: ContactItem): void {
    const node = r.formType === 'contact' ? 'contacts' : 'consultations';

    if (!r.id) return;

    this.contactService.deleteRecord(`celcium/${node}`, r.id)
      .subscribe(() => {
        this.records = this.records.filter(x => x.id !== r.id);
        this.applyFilters();
      });
  }

  // ─────────────────────────────────────────────
  // EXPORT PDF
  // ─────────────────────────────────────────────
  exportPDF(): void {

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();

    doc.write(`
      <html>
      <head>
        <title>Contact Records</title>
        <style>
          body { font-family: Arial; padding: 20px }
          table { width: 100%; border-collapse: collapse }
          th, td { border: 1px solid #ccc; padding: 6px; font-size: 11px }
          th { background: #f2f2f2 }
        </style>
      </head>
      <body>
        <h2>${this.getTabLabel()} Records</h2>
        <p>Generated: ${new Date().toLocaleString()}</p>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Message</th>
              <th>Type</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${this.filteredRecords.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${r.name}</td>
                <td>${r.email}</td>
                <td>${r.message}</td>
                <td>${r.formType}</td>
                <td>${new Date(r.date).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `);

    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 400);
  }
}