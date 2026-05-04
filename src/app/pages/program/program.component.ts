// src/app/program/program.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';

interface ScheduleSession {
  day: string;
  nigeriaDayIndex: number; // 6 = Saturday, 0 = Sunday
  nigeriaHour: number;
  nigeriaMinute: number;
  localTimeDisplay: string;
  localDayDisplay: string;
  offsetLabel: string;
}

@Component({
  selector: 'app-program',
  templateUrl: './program.component.html',
  styleUrls: ['./program.component.css']
})
export class ProgramComponent implements OnInit, OnDestroy {

  // ── Visitor timezone info ──────────────────────────────────────────────────
  visitorTimezone    = '';
  visitorCity        = '';
  timezoneDetected   = false;

  // ── Schedule sessions (Nigeria WAT = UTC+1) ────────────────────────────────
  // Saturday 2:00 PM WAT  →  14:00 UTC+1
  // Sunday   4:00 PM WAT  →  16:00 UTC+1
  programSchedule: ScheduleSession[] = [];

  // ── Content data ───────────────────────────────────────────────────────────
  benefits = [
    {
      title: 'Practical Workplace Skills',
      desc:  'Real-world skills you can apply from your very first day on the job.',
      img:   'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=600&h=380&fit=crop&q=80',
      icon:  'fa-solid fa-briefcase'
    },
    {
      title: 'Confidence in Corporate Environments',
      desc:  'Walk into any boardroom knowing exactly how to carry yourself.',
      img:   'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=380&fit=crop&q=80',
      icon:  'fa-solid fa-shield-alt'
    },
    {
      title: 'Clarity on Employer Expectations',
      desc:  'Understand what employers want and consistently exceed it.',
      img:   'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=380&fit=crop&q=80',
      icon:  'fa-solid fa-lightbulb'
    },
    {
      title: 'Productivity Systems & Frameworks',
      desc:  'Proven frameworks to manage time, tasks, and output efficiently.',
      img:   'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&h=380&fit=crop&q=80',
      icon:  'fa-solid fa-cog'
    },
    {
      title: 'Tools to Improve Performance',
      desc:  'Digital and soft-skill tools that make you measurably better.',
      img:   'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=380&fit=crop&q=80',
      icon:  'fa-solid fa-chart-line'
    },
    {
      title: 'A Roadmap for Fast Career Growth',
      desc:  'A clear, actionable plan to accelerate your rise in any organisation.',
      img:   'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&h=380&fit=crop&q=80',
      icon:  'fa-solid fa-rocket'
    }
  ];

  coverage = [
    { topic: 'Job opportunities & interview mastery',      icon: 'fa-solid fa-search' },
    { topic: 'Workplace communication & etiquette',        icon: 'fa-solid fa-comments' },
    { topic: 'Task management & productivity',             icon: 'fa-solid fa-tasks' },
    { topic: 'Workplace relationships & dynamics',         icon: 'fa-solid fa-users' },
    { topic: 'Performance & burnout management',           icon: 'fa-solid fa-heartbeat' },
    { topic: 'Career growth & positioning',                icon: 'fa-solid fa-chart-line' },
    { topic: 'Workplace tools & AI productivity',          icon: 'fa-solid fa-robot' }
  ];

  targetAudience = {
    for: [
      'Final year students',
      'Recent graduates',
      'NYSC corps members',
      'Graduates awaiting NYSC posting',
      'Early-career professionals'
    ],
    notFor: [
      'Individuals not ready to take action',
      'Those looking for shortcuts without effort'
    ]
  };

  pricingOptions = [
    {
      title:       'Discounted Access',
      price:       '₦50,000',
      eligibility: 'NYSC Corps Members & Recent Graduates Awaiting NYSC',
      documents:   [
        'Statement of Result or Degree Certificate',
        'NYSC Call-Up Letter (for corps members)'
      ],
      note:  'All submissions will be verified.',
      badge: 'Special Offer',
      featured: true
    },
    {
      title:       'Standard Access',
      price:       '₦200,000',
      eligibility: 'Graduates who have completed NYSC & early-career professionals.',
      badge:       'Full Access',
      featured:    false
    }
  ];

  postPaymentBenefits = [
    { label: 'Full program curriculum',    icon: 'fa-solid fa-book-open' },
    { label: 'Class schedule',             icon: 'fa-solid fa-calendar-check' },
    { label: 'Access links',               icon: 'fa-solid fa-link' },
    { label: 'Tools and templates',        icon: 'fa-solid fa-toolbox' },
    { label: 'Program guidelines',         icon: 'fa-solid fa-clipboard-list' }
  ];

  constructor() {}

  ngOnInit(): void {
    this.detectTimezone();
    this.buildSchedule();
  }

  ngOnDestroy(): void {}

  // ── Timezone detection & conversion ───────────────────────────────────────

  detectTimezone(): void {
    try {
      this.visitorTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Extract a friendly city name from IANA zone (e.g. "America/New_York" → "New York")
      const parts = this.visitorTimezone.split('/');
      this.visitorCity = parts[parts.length - 1].replace(/_/g, ' ');
      this.timezoneDetected = true;
    } catch {
      this.visitorTimezone = 'UTC';
      this.visitorCity = 'your location';
      this.timezoneDetected = false;
    }
  }

  /**
   * Convert a Nigeria WAT time (UTC+1) to the visitor's local time.
   * Returns { timeStr, dayStr, offsetLabel }
   *
   * Strategy:
   *   1. Build a UTC Date for the *next upcoming* occurrence of that Nigeria day/time.
   *   2. Use Intl.DateTimeFormat to render it in the visitor's timezone.
   */
  private convertWATtoLocal(
    nigeriaDayOfWeek: number, // 0=Sun, 6=Sat
    nigeriaHour: number,
    nigeriaMinute: number
  ): { timeStr: string; dayStr: string; offsetLabel: string } {

    // WAT = UTC+1  →  utcHour = nigeriaHour - 1
    const utcHour   = nigeriaHour - 1;   // may be negative (handled below)
    const utcMinute = nigeriaMinute;

    // Find the next date that lands on the target Nigeria day-of-week
    const now = new Date();
    const todayUTC = now.getUTCDay(); // 0-6

    // How many days ahead until next nigeriaDayOfWeek?
    let daysAhead = nigeriaDayOfWeek - todayUTC;
    if (daysAhead <= 0) daysAhead += 7;

    const targetUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysAhead,
      utcHour < 0 ? utcHour + 24 : utcHour,
      utcMinute
    ));

    // If utcHour went negative, we crossed midnight backwards — day adjusts automatically
    // because Date.UTC handles carry-over

    const tz = this.visitorTimezone || 'UTC';

    const timeStr = new Intl.DateTimeFormat('en-US', {
      hour:     'numeric',
      minute:   '2-digit',
      hour12:   true,
      timeZone: tz
    }).format(targetUTC);

    const dayStr = new Intl.DateTimeFormat('en-US', {
      weekday:  'long',
      timeZone: tz
    }).format(targetUTC);

    // UTC offset label e.g. "GMT+3"
    const offsetStr = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'short',
      timeZone: tz
    }).format(targetUTC).split(', ').pop() ?? tz;

    return { timeStr, dayStr, offsetLabel: offsetStr };
  }

  buildSchedule(): void {
    // Saturday 2:00 PM WAT
    const sat = this.convertWATtoLocal(6, 14, 0);
    // Sunday   4:00 PM WAT
    const sun = this.convertWATtoLocal(0, 16, 0);

    this.programSchedule = [
      {
        day:              'Saturdays',
        nigeriaDayIndex:  6,
        nigeriaHour:      14,
        nigeriaMinute:    0,
        localTimeDisplay: sat.timeStr,
        localDayDisplay:  sat.dayStr,
        offsetLabel:      sat.offsetLabel
      },
      {
        day:              'Sundays',
        nigeriaDayIndex:  0,
        nigeriaHour:      16,
        nigeriaMinute:    0,
        localTimeDisplay: sun.timeStr,
        localDayDisplay:  sun.dayStr,
        offsetLabel:      sun.offsetLabel
      }
    ];
  }

  // ── Navigation helpers ────────────────────────────────────────────────────

  scrollToSection(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  applyNow():          void { this.scrollToSection('pricing'); }
  viewProgramDetails():void { this.scrollToSection('coverage'); }

  handleEnroll(tier: string): void {
    console.log(`Enrolling: ${tier}`);
    // TODO: integrate Flutterwave / Paystack
  }
}