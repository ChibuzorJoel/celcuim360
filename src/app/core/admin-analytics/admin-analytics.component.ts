import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-admin-analytics',
  templateUrl: './admin-analytics.component.html',
  styleUrls: ['./admin-analytics.component.css'],
})
export class AdminAnalyticsComponent implements OnInit {
  Math = Math;

  cohortOptions = ['Cohort 7', 'Cohort 6', 'Cohort 5'];
  activeCohort = 'Cohort 7';

  stats = { avgScore: 0, passRate: 0, atRisk: 0, topScore: 0, topStudent: '', completionRate: 0 };

  studentPerformance = [
    { name: 'Ada Okonkwo',   score: 94 },
    { name: 'Ngozi Eze',     score: 88 },
    { name: 'Emeka Nwosu',   score: 77 },
    { name: 'Chidi Obi',     score: 67 },
    { name: 'Bola Fashola',  score: 55 },
    { name: 'Tolu Adeyemi',  score: 51 },
    { name: 'Kemi Adeyinka', score: 48 },
    { name: 'James Okafor',  score: 0  },
  ];

  weeklyStats = [
    { week: 'Week 1', avg: 72, submitted: 7, total: 8, trend: 0  },
    { week: 'Week 2', avg: 78, submitted: 7, total: 8, trend: 6  },
    { week: 'Week 3', avg: 74, submitted: 6, total: 8, trend: -4 },
    { week: 'Week 4', avg: 0,  submitted: 0, total: 8, trend: 0  },
    { week: 'Week 5', avg: 0,  submitted: 0, total: 8, trend: 0  },
    { week: 'Week 6', avg: 0,  submitted: 0, total: 8, trend: 0  },
  ];

  regBreakdown = [
    { type: 'NYSC',     count: 14, pct: 58, color: '#a78bfa' },
    { type: 'Graduate', count: 8,  pct: 33, color: '#60a5fa' },
    { type: 'Corporate',count: 2,  pct: 9,  color: '#B88D2A' },
  ];

  ngOnInit(): void { this.computeStats(); }

  setCohort(c: string): void {
    this.activeCohort = c;
    // In a real app: fetch data for cohort from service
    this.computeStats();
  }

  private computeStats(): void {
    const scored  = this.studentPerformance.filter(s => s.score > 0);
    const avg     = scored.length ? Math.round(scored.reduce((a, s) => a + s.score, 0) / scored.length) : 0;
    const top     = scored[0];

    this.stats = {
      avgScore:       avg,
      passRate:       scored.length ? Math.round((scored.filter(s => s.score >= 60).length / scored.length) * 100) : 0,
      atRisk:         scored.filter(s => s.score < 60).length,
      topScore:       top?.score ?? 0,
      topStudent:     top?.name ?? '—',
      completionRate: this.studentPerformance.length
        ? Math.round((scored.length / this.studentPerformance.length) * 100)
        : 0,
    };
  }

  scoreClass(score: number): string {
    if (score >= 75) return 'score-high';
    if (score >= 60) return 'score-mid';
    return score > 0 ? 'score-low' : '';
  }

  barClass(score: number): string {
    if (score >= 75) return 'green';
    if (score >= 60) return 'amber';
    return score > 0 ? 'red' : '';
  }
}