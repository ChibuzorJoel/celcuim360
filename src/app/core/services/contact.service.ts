import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// --- Data Interfaces ---
export interface RecordBase {
  id?: string;
  date?: string;
  // Add common fields across all forms here
}

export interface ContactRecord extends RecordBase {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export interface RegistrationRecord extends RecordBase {
  fullName: string;
  email: string;
  mobile: string;
  isEmployed: string | null;
  companyName?: string;
  role?: string;
  registrationType: string;
  gains?: string;
  referral: string;
  consent: boolean;
}

// Add the interface for Consultation Records (adjust fields as needed)
export interface ConsultationRecord extends RecordBase {
  name: string;
  email: string;
  service: string; // e.g., 'HR Consulting'
  dateBooked: string;
  bookingRef: string; // External booking ID
}

// --- Service Implementation ---
@Injectable({
  providedIn: 'root'
})
export class ContactService { // Renamed from ContactService
  private baseDbUrl = 'https://celcium-e4ce3-default-rtdb.firebaseio.com';

  constructor(private http: HttpClient) {}

  /**
   * Generates the specific Firebase URL for a given node.
   * @param node The top-level Firebase node name (e.g., 'contacts', 'registrations').
   * @param id Optional unique ID for a record (used for GET/DELETE specific record).
   */

private getUrl(node: string, id?: string): string {
  return id 
    ? `${this.baseDbUrl}/${node}/${id}.json`
    : `${this.baseDbUrl}/${node}.json`;
}


  // --- CORE GENERIC CRUD METHODS ---

  /**
   * Saves a new record to the specified node (Create).
   */
  saveRecord<T extends RecordBase>(node: string, record: T): Observable<any> {
    const data = { ...record, date: new Date().toISOString() };
    return this.http.post(this.getUrl(node), data);
  }

  /**
   * Fetches all records from the specified node (Read).
   */
  getRecords<T extends RecordBase>(node: string): Observable<T[]> {
    return this.http.get<{ [key: string]: T }>(this.getUrl(node)).pipe(
      map(response => {
        const records: T[] = [];
        for (const key in response) {
          if (response.hasOwnProperty(key)) {
            // Assign the Firebase key as the record's id
            records.push({ id: key, ...response[key] });
          }
        }
        return records;
      })
    );
  }

  /**
   * Deletes a record by its Firebase key (Delete).
   */
  deleteRecord(node: string, id: string): Observable<any> {
    return this.http.delete(this.getUrl(node, id));
  }


  // --- CONVENIENCE METHODS FOR SPECIFIC FORMS ---

// Contacts
saveContact(record: ContactRecord): Observable<any> {
  return this.saveRecord('celcium/contacts', record);
}
getContacts(): Observable<ContactRecord[]> {
  return this.getRecords<ContactRecord>('celcium/contacts');
}

// Registrations
saveRegistration(record: RegistrationRecord): Observable<any> {
  return this.saveRecord('celcium/registrations', record);
}
getRegistrations(): Observable<RegistrationRecord[]> {
  return this.getRecords<RegistrationRecord>('celcium/registrations');
}

// Consultations
saveConsultation(record: ConsultationRecord): Observable<any> {
  return this.saveRecord('celcium/consultations', record);
}
getConsultations(): Observable<ConsultationRecord[]> {
  return this.getRecords<ConsultationRecord>('celcium/consultations');
}

}