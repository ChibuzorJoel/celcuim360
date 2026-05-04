import { Component, OnInit } from '@angular/core';
import { ContactService, RecordBase, ContactRecord, RegistrationRecord, ConsultationRecord } from '../services/contact.service';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

export interface DashboardRecord extends RecordBase {
  formType: 'contact' | 'registration' | 'consultation';
  name: string;
  email: string;
  phone: string;
  message?: string;
  fullName?: string;
  mobile?: string;
  isEmployed?: string | null;
  companyName?: string;
  role?: string;
  registrationType?: string;
  gains?: string;
  referral?: string;
  consent?: boolean;
  service?: string;
  dateBooked?: string;
  bookingRef?: string;
  company?: string;
  position?: string;
  serviceType?: string;
  budget?: string;
  projectDetails?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit {
  Math = Math;

  records: DashboardRecord[] = [];
  paginatedRecords: DashboardRecord[] = [];

  activeFilter: 'contact' | 'registration' | 'consultation' = 'contact';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  searchTerm = '';
  loading = true;

  showModal = false;
  modalTitle = '';
  modalMessage = '';
  modalAction: 'deleteSingle' | 'deletePage' | null = null;
  selectedRecordId: string | null = null;
  selectedRecordName: string | null = null;

  constructor(
    private contactService: ContactService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRecords();
  }

  /** 🔹 Load all records from Firebase */
  loadRecords(): void {
    this.loading = true;

    forkJoin({
      contacts: this.contactService.getContacts(),
      registrations: this.contactService.getRegistrations(),
      consultations: this.contactService.getConsultations(),
    }).subscribe({
      next: ({ contacts, registrations, consultations }) => {
        let combinedRecords: DashboardRecord[] = [];

        combinedRecords.push(
          ...contacts.map(r => ({
            ...r,
            formType: 'contact' as const,
            name: r.name,
            email: r.email,
            phone: r.phone,
            message: r.message,
          }))
        );

        combinedRecords.push(
          ...registrations.map(r => ({
            ...r,
            formType: 'registration' as const,
            name: r.fullName,
            email: r.email,
            phone: r.mobile,
            company: r.companyName,
          }))
        );

        combinedRecords.push(
          ...consultations.map(r => ({
            ...r,
            formType: 'consultation' as const,
            name: r.fullName || 'N/A',
            email: r.email,
            serviceType: r.registrationType || 'Consultation',
            bookingDate: r.bookingDate,
            bookingTime: r.bookingTime,
            referral: r.referral,
            phone: '', // Consultations don't include phone numbers
          }))
        );

        this.records = combinedRecords.sort(
          (a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime()
        );

        this.updatePagination();
        this.loading = false;
      },
      error: err => {
        console.error('Error loading records:', err);
        this.loading = false;
      },
    });
  }

  /** 🔹 Set active filter and refresh */
  setActiveFilter(filterType: 'contact' | 'registration' | 'consultation'): void {
    this.activeFilter = filterType;
    this.currentPage = 1;
    this.updatePagination();
  }

  /** 🔹 Navigate to admin registration page */
  navigateToRegistration(): void {
    this.router.navigate(['/admin/registration']);
  }

  /** 🔹 Filter label */
  getActiveFilterLabel(): string {
    switch (this.activeFilter) {
      case 'contact': return 'Contact Form';
      case 'registration': return 'Registration';
      case 'consultation': return 'Consultation';
      default: return 'Form';
    }
  }

  /** 🔹 Column count for colspan */
  getColumnCount(): number {
    switch (this.activeFilter) {
      case 'contact': return 6;
      case 'registration': return 7;
      case 'consultation': return 8;
      default: return 5;
    }
  }

  /** 🔹 Update pagination */
  updatePagination(): void {
    const filteredByType = this.records.filter(r => r.formType === this.activeFilter);

    const filtered = filteredByType.filter(r =>
      r.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      r.email?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      r.phone?.includes(this.searchTerm)
    );

    this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedRecords = filtered.slice(startIndex, startIndex + this.itemsPerPage);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.updatePagination();
  }

  /** 🔹 Delete modals */
  openDeleteSingleModal(id?: string, name?: string): void {
    if (!id) return;
    this.selectedRecordId = id;
    this.selectedRecordName = name || 'this record';
    this.modalTitle = 'Delete Record';
    this.modalMessage = `Are you sure you want to delete "${this.selectedRecordName}"?`;
    this.modalAction = 'deleteSingle';
    this.showModal = true;
  }

  openDeletePageModal(): void {
    if (this.paginatedRecords.length === 0) return;
    this.modalTitle = 'Delete Page Records';
    this.modalMessage = `Are you sure you want to delete all ${this.paginatedRecords.length} records on this page?`;
    this.modalAction = 'deletePage';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.modalAction = null;
    this.selectedRecordId = null;
    this.selectedRecordName = null;
  }

  confirmAction(): void {
    if (this.modalAction === 'deleteSingle') this.deleteSingleRecord();
    else if (this.modalAction === 'deletePage') this.deletePageRecords();
    this.closeModal();
  }

  /** 🔹 Delete single record */
  private deleteSingleRecord(): void {
    if (!this.selectedRecordId) return;
    const record = this.records.find(r => r.id === this.selectedRecordId);
    if (!record) return;

    const node = `${record.formType}s`; // ✅ no "celcium/" prefix

    this.contactService.deleteRecord(`celcium/${node}`, this.selectedRecordId).subscribe({
      next: () => {
        this.records = this.records.filter(r => r.id !== this.selectedRecordId);
        this.updatePagination();
      },
      error: err => console.error('Error deleting record:', err),
    });
  }

  /** 🔹 Delete all on page */
  private deletePageRecords(): void {
    const deletePromises = this.paginatedRecords
      .filter(r => r.id)
      .map(r => {
        const node = `${r.formType}s`; // ✅ no "celcium/" prefix
        return this.contactService.deleteRecord(`celcium/${node}`, r.id!).toPromise();
      });

    Promise.all(deletePromises)
      .then(() => {
        this.records = this.records.filter(
          r => !this.paginatedRecords.find(p => p.id === r.id)
        );
        this.updatePagination();
      })
      .catch(err => console.error('Error deleting page records:', err));
  }

  /** 🔹 PDF Download */
  downloadPDF(): void {
    const filtered = this.records.filter(r => r.formType === this.activeFilter);

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <html>
      <head>
        <title>${this.getActiveFilterLabel()} Records</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #444; padding: 8px; font-size: 12px; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h2>${this.getActiveFilterLabel()} Records</h2>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              ${this.activeFilter === 'contact' ? '<th>Message</th>' : ''}
              ${this.activeFilter === 'registration' ? '<th>Company</th><th>Role</th>' : ''}
              ${this.activeFilter === 'consultation' ? '<th>Service Type</th>' : ''}
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${filtered
              .map(
                (r, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${r.name}</td>
                  <td>${r.email}</td>
                  <td>${r.phone}</td>
                  ${this.activeFilter === 'contact' ? `<td>${r.message || ''}</td>` : ''}
                  ${this.activeFilter === 'registration' ? `<td>${r.company || ''}</td><td>${r.role || ''}</td>` : ''}
                  ${this.activeFilter === 'consultation' ? `<td>${r.serviceType || ''}</td>` : ''}
                  <td>${new Date(r.date!).toLocaleString()}</td>
                </tr>
              `
              )
              .join('')}
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

  onSearchChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
