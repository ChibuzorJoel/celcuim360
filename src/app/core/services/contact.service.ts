// src/app/services/contact.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ContactRecord {
  id?: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  date?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private baseUrl = 'https://celcium-e4ce3-default-rtdb.firebaseio.com/contacts.json';

  constructor(private http: HttpClient) {}

  // ✅ Save contact form data to Firebase
  saveContact(record: ContactRecord): Observable<any> {
    const data = { ...record, date: new Date().toISOString() };
    return this.http.post(this.baseUrl, data);
  }

  // ✅ Fetch all contacts from Firebase
  getContacts(): Observable<ContactRecord[]> {
    return this.http.get<{ [key: string]: ContactRecord }>(this.baseUrl).pipe(
      map(response => {
        const records: ContactRecord[] = [];
        for (const key in response) {
          if (response.hasOwnProperty(key)) {
            records.push({ id: key, ...response[key] });
          }
        }
        return records;
      })
    );
  }

  // ✅ Delete a record by Firebase key
  deleteContact(id: string): Observable<any> {
    const url = `https://celcium-e4ce3-default-rtdb.firebaseio.com/contacts/${id}.json`;
    return this.http.delete(url);
  }
}
