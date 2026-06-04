import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminRegistrationService, RegistrationRecord } from '../../core/services/admin-registration.service';

interface StudentPerf {
  name:   string;
  score:  number;
  total:  number;
  pct:    number;
  status: 'pending' | 'approved' | 'rejected';
}

interface WeeklyStat {
  week:      string;
  avg:       number;
  submitted: number;
  total:     number;
  trend:     number;
}

interface RegBreakdown {
  type:  string;
  count: number;
  pct:   number;
  color: string;
}

@Component({
  selector: 'app-admin-analytics',
  templateUrl: './admin-analytics.component.html',
  styleUrls: ['./admin-analytics.component.css'],
})
export class AdminAnalyticsComponent implements OnInit, OnDestroy {
  Math = Math;

  loading = true;
  error   = '';

  // ── Cohort selector ───────────────────────────────────────────────────────
  cohortOptions: string[] = [];
  activeCohort  = 'All';

  // ── Stats ─────────────────────────────────────────────────────────────────
  stats = {
    avgScore: 0, passRate: 0, atRisk: 0,
    topScore: 0, topStudent: '', completionRate: 0,
    totalRegistrations: 0, approvedCount: 0, pendingCount: 0, rejectedCount: 0,
  };

  studentPerformance: StudentPerf[]  = [];
  weeklyStats:        WeeklyStat[]   = [];
  regBreakdown:       RegBreakdown[] = [];

  private allRecords: RegistrationRecord[] = [];
  private destroy$ = new Subject<void>();

  constructor(private adminService: AdminRegistrationService) {}

  ngOnInit(): void {
    this.adminService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: records => {
          this.allRecords = records;
          this.buildCohortOptions(records);
          this.computeAll(records);
          this.loading = false;
        },
        error: (err: Error) => {
          this.error   = err.message || 'Failed to load analytics data.';
          this.loading = false;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Cohort handling ───────────────────────────────────────────────────────

  private buildCohortOptions(records: RegistrationRecord[]): void {
    // Group by calendar month of submittedAt as a proxy for "cohort"
    const months = new Set<string>();
    records.forEach(r => {
      if (r.submittedAt) {
        const d = new Date(r.submittedAt);
        months.add(`${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`);
      }
    });
    this.cohortOptions = ['All', ...Array.from(months).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
    })];
    this.activeCohort = 'All';
  }

  setCohort(c: string): void {
    this.activeCohort = c;
    const filtered = c === 'All'
      ? this.allRecords
      : this.allRecords.filter(r => {
          if (!r.submittedAt) return false;
          const d = new Date(r.submittedAt);
          const label = `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
          return label === c;
        });
    this.computeAll(filtered);
  }

  // ── Core computation ──────────────────────────────────────────────────────

  private computeAll(records: RegistrationRecord[]): void {
    this.computeStats(records);
    this.buildStudentPerformance(records);
    this.buildWeeklyStats(records);
    this.buildRegBreakdown(records);
  }

  private computeStats(records: RegistrationRecord[]): void {
    const withScore = records.filter(r => r.assessmentScore !== undefined && r.assessmentScore !== null);
    const pcts      = withScore.map(r => this.calcPct(r));
    const avg       = pcts.length ? Math.round(pcts.reduce((a, v) => a + v, 0) / pcts.length) : 0;
    const passing   = pcts.filter(p => p >= 60);
    const topIdx    = pcts.indexOf(Math.max(...pcts));
    const topRec    = withScore[topIdx];

    this.stats = {
      avgScore:           avg,
      passRate:           pcts.length ? Math.round((passing.length / pcts.length) * 100) : 0,
      atRisk:             pcts.filter(p => p > 0 && p < 60).length,
      topScore:           topRec ? this.calcPct(topRec) : 0,
      topStudent:         topRec?.fullName ?? '—',
      completionRate:     records.length ? Math.round((withScore.length / records.length) * 100) : 0,
      totalRegistrations: records.length,
      approvedCount:      records.filter(r => r.status === 'approved').length,
      pendingCount:       records.filter(r => r.status === 'pending').length,
      rejectedCount:      records.filter(r => r.status === 'rejected').length,
    };
  }

  private buildStudentPerformance(records: RegistrationRecord[]): void {
    this.studentPerformance = records
      .map(r => ({
        name:   r.fullName,
        score:  r.assessmentScore  ?? 0,
        total:  r.assessmentTotal  ?? 0,
        pct:    this.calcPct(r),
        status: r.status,
      }))
      .sort((a, b) => b.pct - a.pct);
  }

  private buildWeeklyStats(records: RegistrationRecord[]): void {
    if (!records.length) { this.weeklyStats = []; return; }

    // Find date range and bucket by week
    const dates  = records.map(r => new Date(r.submittedAt).getTime()).filter(Boolean);
    const minMs  = Math.min(...dates);
    const maxMs  = Math.max(...dates);
    const weeks  = Math.max(1, Math.ceil((maxMs - minMs) / (7 * 24 * 60 * 60 * 1000)) + 1);
    const NUM_W  = Math.min(weeks, 8);
    const wStart = new Date(minMs);

    const buckets: RegistrationRecord[][] = Array.from({ length: NUM_W }, () => []);
    records.forEach(r => {
      const diff  = new Date(r.submittedAt).getTime() - minMs;
      const wIdx  = Math.min(Math.floor(diff / (7 * 24 * 60 * 60 * 1000)), NUM_W - 1);
      buckets[wIdx].push(r);
    });

    this.weeklyStats = buckets.map((bucket, i) => {
      const withScore = bucket.filter(r => r.assessmentScore !== undefined);
      const avg       = withScore.length
        ? Math.round(withScore.map(r => this.calcPct(r)).reduce((a, v) => a + v, 0) / withScore.length)
        : 0;
      const prevAvg   = i > 0
        ? (this.weeklyStats[i - 1]?.avg ?? 0)
        : 0;

      const weekDate = new Date(wStart.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      return {
        week:      `Week ${i + 1} (${weekDate.toLocaleDateString('default', { month: 'short', day: 'numeric' })})`,
        avg,
        submitted: withScore.length,
        total:     bucket.length,
        trend:     i === 0 ? 0 : avg - prevAvg,
      };
    });
  }

  private buildRegBreakdown(records: RegistrationRecord[]): void {
    const counts: Record<string, number> = {};
    records.forEach(r => {
      const label = r.category === 'nysc' ? 'NYSC' : 'Graduate';
      counts[label] = (counts[label] ?? 0) + 1;
    });
    const total  = records.length || 1;
    const colors: Record<string, string> = {
      'NYSC':      '#a78bfa',
      'Graduate':  '#60a5fa',
    };
    this.regBreakdown = Object.entries(counts).map(([type, count]) => ({
      type,
      count,
      pct:   Math.round((count / total) * 100),
      color: colors[type] ?? '#B88D2A',
    }));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private calcPct(r: RegistrationRecord): number {
    if (r.assessmentPercentage !== undefined) return Math.round(r.assessmentPercentage);
    if (r.assessmentScore !== undefined && r.assessmentTotal && r.assessmentTotal > 0) {
      return Math.round((r.assessmentScore / r.assessmentTotal) * 100);
    }
    return 0;
  }

  scoreClass(pct: number): string {
    if (pct >= 75) return 'score-high';
    if (pct >= 60) return 'score-mid';
    return pct > 0 ? 'score-low' : '';
  }

  barClass(pct: number): string {
    if (pct >= 75) return 'green';
    if (pct >= 60) return 'amber';
    return pct > 0 ? 'red' : '';
  }

  trendIcon(trend: number): string {
    if (trend > 0)  return '▲';
    if (trend < 0)  return '▼';
    return '—';
  }

  trendClass(trend: number): string {
    if (trend > 0)  return 'trend-up';
    if (trend < 0)  return 'trend-down';
    return 'trend-flat';
  }
}