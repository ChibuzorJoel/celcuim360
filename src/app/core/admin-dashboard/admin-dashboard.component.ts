import { Component, OnInit } from '@angular/core';
import { ContactService } from '../services/contact.service';
import { AuthService } from '../auth/auth.service'; // adjust path if needed
import { Router } from '@angular/router';
interface ContactRecord {
  id?: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  date: Date;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit {
  Math = Math;

  records: ContactRecord[] = [];
  paginatedRecords: ContactRecord[] = [];

  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  searchTerm = '';
  loading = true;

  // Modal properties
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

  /** 🔹 Fetch records from Firebase */
  loadRecords(): void {
    this.contactService.getContacts().subscribe((data) => {
      this.records = data
        .map((record) => ({
          ...record,
          date: record.date ? new Date(record.date) : new Date(),
        }))
        .sort(
          (a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime()
        );

      this.updatePagination();
    });
  }

  /** 🔹 Refresh pagination when records or search change */
  updatePagination(): void {
    const filteredRecords = this.records.filter(
      (record) =>
        record.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        record.email?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        record.phone?.includes(this.searchTerm)
    );

    this.totalPages = Math.ceil(filteredRecords.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedRecords = filteredRecords.slice(
      startIndex,
      startIndex + this.itemsPerPage
    );
  }

  /** 🔹 Pagination controls */
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

  /** 🔹 Open modal for single record deletion */
  openDeleteSingleModal(id?: string, name?: string): void {
    if (!id) return;

    this.selectedRecordId = id;
    this.selectedRecordName = name || 'this record';
    this.modalTitle = 'Delete Record';
    this.modalMessage = `Are you sure you want to delete the record for "${this.selectedRecordName}"? This action cannot be undone.`;
    this.modalAction = 'deleteSingle';
    this.showModal = true;
  }

  /** 🔹 Open modal for page deletion */
  openDeletePageModal(): void {
    if (this.paginatedRecords.length === 0) return;

    this.modalTitle = 'Delete Page Records';
    this.modalMessage = `Are you sure you want to delete all ${this.paginatedRecords.length} records on this page? This action cannot be undone.`;
    this.modalAction = 'deletePage';
    this.showModal = true;
  }

  /** 🔹 Close modal */
  closeModal(): void {
    this.showModal = false;
    this.modalAction = null;
    this.selectedRecordId = null;
    this.selectedRecordName = null;
  }

  /** 🔹 Confirm modal action */
  confirmAction(): void {
    if (this.modalAction === 'deleteSingle') {
      this.deleteSingleRecord();
    } else if (this.modalAction === 'deletePage') {
      this.deletePageRecords();
    }
    this.closeModal();
  }

  /** 🔹 Delete a single record */
  private deleteSingleRecord(): void {
    if (!this.selectedRecordId) return;

    this.contactService.deleteContact(this.selectedRecordId).subscribe({
      next: () => {
        this.records = this.records.filter(
          (record) => record.id !== this.selectedRecordId
        );
        this.updatePagination();
      },
      error: (err) => console.error('Error deleting record:', err),
    });
  }

  /** 🔹 Delete all records on the current page */
  private deletePageRecords(): void {
    const deletePromises = this.paginatedRecords
      .filter((record) => record.id)
      .map((record) =>
        this.contactService.deleteContact(record.id!).toPromise()
      );

    // Remove from local records immediately for better UX
    this.records = this.records.filter(
      (r) => !this.paginatedRecords.find((p) => p.id === r.id)
    );
    this.updatePagination();
  }

  /** 🔹 Download all records as PDF */
  downloadPDF(): void {
    const content = this.generatePDFContent();

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Contact Records</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h2 { text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #444; padding: 8px; font-size: 12px; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h2>Contact Form Records</h2>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Message</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${this.records
                  .map(
                    (r, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${r.name}</td>
                    <td>${r.email}</td>
                    <td>${r.phone}</td>
                    <td>${r.message}</td>
                    <td>${new Date(r.date).toLocaleString()}</td>
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
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 300);
    }
  }

  /** 🔹 Generate PDF content */
  private generatePDFContent(): string {
    let content = `Contact Form Records\nGenerated on: ${new Date().toLocaleString()}\n\n`;
    content += '='.repeat(80) + '\n\n';

    this.records.forEach((record, index) => {
      content += `Record ${index + 1}:\n`;
      content += `Name: ${record.name}\n`;
      content += `Email: ${record.email}\n`;
      content += `Phone: ${record.phone}\n`;
      content += `Message: ${record.message}\n`;
      content += `Date: ${new Date(record.date).toLocaleString()}\n`;
      content += '-'.repeat(60) + '\n\n';
    });

    return content;
  }

  /** 🔹 Trigger search */
  onSearchChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  /** 🔹 Return array of page numbers */
  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
