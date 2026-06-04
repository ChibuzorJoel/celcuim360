import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

export interface AdminFilters {
  search:   string;
  status:   string;   // 'all' | 'pending' | 'approved' | 'rejected'
  dateFrom: string;   // ISO date string or ''
  dateTo:   string;
  cohort:   string;   // cohort name or 'all'
}

export const DEFAULT_FILTERS: AdminFilters = {
  search:   '',
  status:   'all',
  dateFrom: '',
  dateTo:   '',
  cohort:   'all',
};

@Injectable({ providedIn: 'root' })
export class AdminSearchService {

  private filtersSubject = new BehaviorSubject<AdminFilters>({ ...DEFAULT_FILTERS });

  /** Emits the current filter state. */
  readonly filters$: Observable<AdminFilters> = this.filtersSubject.asObservable();

  /** Convenience: emits true when any filter is active. */
  readonly hasActiveFilters$: Observable<boolean> = this.filters$.pipe(
    map(f =>
      f.search !== '' ||
      f.status !== 'all' ||
      f.dateFrom !== '' ||
      f.dateTo !== '' ||
      f.cohort !== 'all'
    ),
    distinctUntilChanged()
  );

  get snapshot(): AdminFilters {
    return this.filtersSubject.getValue();
  }

  setSearch(term: string): void {
    this.patch({ search: term });
  }

  setStatus(status: string): void {
    this.patch({ status });
  }

  setDateRange(from: string, to: string): void {
    this.patch({ dateFrom: from, dateTo: to });
  }

  setCohort(cohort: string): void {
    this.patch({ cohort });
  }

  reset(): void {
    this.filtersSubject.next({ ...DEFAULT_FILTERS });
  }

  private patch(partial: Partial<AdminFilters>): void {
    this.filtersSubject.next({ ...this.filtersSubject.getValue(), ...partial });
  }

  /**
   * Generic client-side filter helper.
   * Pass your full list and resolvers that extract each filterable field.
   */
  applyToList<T>(
    list: T[],
    filters: AdminFilters,
    textResolver: (item: T) => string,
    dateResolver?: (item: T) => string,
    statusResolver?: (item: T) => string,
    cohortResolver?: (item: T) => string,
  ): T[] {
    const term = filters.search.toLowerCase().trim();

    return list.filter(item => {
      if (term && !textResolver(item).toLowerCase().includes(term)) return false;

      if (filters.status !== 'all' && statusResolver) {
        if (statusResolver(item) !== filters.status) return false;
      }

      if ((filters.dateFrom || filters.dateTo) && dateResolver) {
        const d = dateResolver(item);
        if (filters.dateFrom && d < filters.dateFrom) return false;
        if (filters.dateTo   && d > filters.dateTo)   return false;
      }

      if (filters.cohort !== 'all' && cohortResolver) {
        if (cohortResolver(item) !== filters.cohort) return false;
      }

      return true;
    });
  }
}