import { Component, OnInit } from '@angular/core';

interface Submission {
  student: string;
  score: number;
  submittedAt: string;
  cohort: string;
  week: string;
}

interface PendingSub {
  student: string;
  assessment: string;
  overdue: boolean;
}

@Component({
  selector: 'app-admin-assessment',
  templateUrl: './admin-assessment.component.html',
  styleUrls: ['./admin-assessment.component.css'],
})
export class AdminAssessmentComponent implements OnInit {
  cohortOptions = ['Cohort 7', 'Cohort 6', 'Cohort 5'];
  weekOptions   = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6'];

  activeCohort = 'Cohort 7';
  activeWeek   = 'Wk 1';
  searchTerm   = '';

  allSubmissions: Submission[] = [
    { student: 'Ada Okonkwo',   score: 92, submittedAt: 'Jun 3, 9:14am',  cohort: 'Cohort 7', week: 'Wk 1' },
    { student: 'Emeka Nwosu',   score: 74, submittedAt: 'Jun 3, 8:47am',  cohort: 'Cohort 7', week: 'Wk 1' },
    { student: 'Tolu Adeyemi',  score: 51, submittedAt: 'Jun 3, 8:03am',  cohort: 'Cohort 7', week: 'Wk 1' },
    { student: 'Ngozi Eze',     score: 88, submittedAt: 'Jun 3, 7:55am',  cohort: 'Cohort 7', week: 'Wk 1' },
    { student: 'Chidi Obi',     score: 67, submittedAt: 'Jun 3, 7:30am',  cohort: 'Cohort 7', week: 'Wk 1' },
    { student: 'Bola Fashola',  score: 55, submittedAt: 'Jun 3, 7:10am',  cohort: 'Cohort 7', week: 'Wk 1' },
    { student: 'Kemi Adeyinka', score: 0,  submittedAt: 'Not submitted',  cohort: 'Cohort 7', week: 'Wk 1' },
    { student: 'James Okafor',  score: 0,  submittedAt: 'Not submitted',  cohort: 'Cohort 7', week: 'Wk 1' },
    { student: 'Ada Okonkwo',   score: 96, submittedAt: 'Jun 10, 9:00am', cohort: 'Cohort 7', week: 'Wk 2' },
    { student: 'Emeka Nwosu',   score: 80, submittedAt: 'Jun 10, 8:30am', cohort: 'Cohort 7', week: 'Wk 2' },
  ];

  filteredSubmissions: Submission[] = [];

  performanceBreakdown = [
    { name: 'Ada Okonkwo',  value: 94 },
    { name: 'Ngozi Eze',    value: 88 },
    { name: 'Emeka Nwosu',  value: 77 },
    { name: 'Chidi Obi',    value: 67 },
    { name: 'Bola Fashola', value: 55 },
    { name: 'Tolu Adeyemi', value: 51 },
  ];

  pendingSubmissions: PendingSub[] = [
    { student: 'Kemi Adeyinka', assessment: 'Wk 1 Quiz', overdue: true  },
    { student: 'James Okafor',  assessment: 'Wk 1 Quiz', overdue: false },
  ];

  summaryStats = {
    avgScore: 0, submitted: 0, total: 0, atRisk: 0, pending: 0, topScore: 0, topStudent: '',
  };

  ngOnInit(): void {
    this.applyFilters();
  }

  setCohort(c: string): void { this.activeCohort = c; this.applyFilters(); }
  setWeek(w: string):   void { this.activeWeek = w;   this.applyFilters(); }

  applyFilters(): void {
    let list = this.allSubmissions.filter(s => s.cohort === this.activeCohort && s.week === this.activeWeek);

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      list = list.filter(s => s.student.toLowerCase().includes(q));
    }

    this.filteredSubmissions = list;
    this.computeStats(list);
  }

  private computeStats(list: Submission[]): void {
    const scored  = list.filter(s => s.score > 0);
    const avg     = scored.length ? Math.round(scored.reduce((a, s) => a + s.score, 0) / scored.length) : 0;
    const top     = scored.sort((a, b) => b.score - a.score)[0];

    this.summaryStats = {
      avgScore:    avg,
      submitted:   scored.length,
      total:       list.length,
      atRisk:      scored.filter(s => s.score < 60).length,
      pending:     list.filter(s => s.score === 0).length,
      topScore:    top?.score ?? 0,
      topStudent:  top?.student ?? '—',
    };
  }

  scoreClass(score: number): string {
    if (score >= 75) return 'score-high';
    if (score >= 60) return 'score-mid';
    return 'score-low';
  }

  barClass(score: number): string {
    if (score >= 75) return 'green';
    if (score >= 60) return 'amber';
    return 'red';
  }

  exportPDF(): void {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(`<html><head><title>Assessment Scores</title>
      <style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ccc;padding:6px;font-size:11px}th{background:#f2f2f2}</style>
      </head><body><h2>${this.activeCohort} — ${this.activeWeek} Scores</h2>
      <p>Generated: ${new Date().toLocaleString()}</p><table>
      <thead><tr><th>#</th><th>Student</th><th>Score</th><th>Status</th><th>Submitted</th></tr></thead>
      <tbody>${this.filteredSubmissions.map((s, i) => `
        <tr><td>${i+1}</td><td>${s.student}</td><td>${s.score > 0 ? s.score + '%' : '—'}</td>
        <td>${s.score > 0 ? 'Graded' : 'Pending'}</td><td>${s.submittedAt}</td></tr>
      `).join('')}</tbody></table></body></html>`);
    doc.close();
    setTimeout(() => { iframe.contentWindow?.print(); document.body.removeChild(iframe); }, 400);
  }
}