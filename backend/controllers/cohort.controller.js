/**
 * controllers/cohort.controller.js
 * Full CRUD for cohorts — create, read, update, archive, delete
 * Also computes live stats from registrations + coursework submissions
 */

const Cohort       = require('../models/Cohort');
const Registration = require('../models/Registration');
const Coursework   = require('../models/Coursework');

// ══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════════════

/** Generate a cohort ID like "c1748900000000" */
function generateCohortId() {
  return `c${Date.now()}`;
}

/**
 * Build a 6-week calendar array from a start ISO date.
 * Marks each week as done/current based on today's date.
 */
function generateWeeks(startIso, allDone = false) {
  const start = new Date(startIso);
  const today = new Date();

  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);

    const nextWeek = new Date(d);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const done    = allDone || nextWeek < today;
    const current = !done && d <= today && today < nextWeek;

    return {
      num:     i + 1,
      date:    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      done,
      current,
    };
  });
}

/**
 * Format a Date as "Jun 2, 2025"
 */
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/**
 * Recompute done/current flags on all weeks of a stored cohort.
 * Call this when returning a cohort so the calendar stays accurate.
 */
function refreshWeeks(cohort) {
  if (!cohort.weeks || !cohort.weeks.length) return cohort;
  const today = new Date();
  cohort.weeks = cohort.weeks.map((w, i) => {
    const start    = new Date(cohort.startDate);
    start.setDate(start.getDate() + i * 7);
    const nextWeek = new Date(start);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const allDone = cohort.status === 'closed';
    const done    = allDone || nextWeek < today;
    const current = !done && start <= today && today < nextWeek;

    return { ...w, done, current };
  });
  return cohort;
}

/**
 * Compute live enrolled/approved/pending/avgScore for a cohort
 * by looking at registrations and coursework.
 */
async function computeStats(cohort) {
  try {
    // Count registrations per status (all registrations for now — 
    // in a real system you'd filter by cohort assignment)
    const [enrolled, approved, pending] = await Promise.all([
      Registration.countDocuments({}),
      Registration.countDocuments({ status: 'approved' }),
      Registration.countDocuments({ status: 'pending' }),
    ]);

    // Average graded coursework score across all weeks
    const scoreAgg = await Coursework.aggregate([
      { $match: { graded: true, score: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$score' } } },
    ]);

    const avgScore = scoreAgg.length
      ? Math.round((scoreAgg[0].avg / 10) * 100)   // convert 0-10 → percentage
      : 0;

    return { enrolled, approved, pending, avgScore };
  } catch {
    return { enrolled: 0, approved: 0, pending: 0, avgScore: 0 };
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  GET ALL COHORTS
// ══════════════════════════════════════════════════════════════════════════

exports.getAllCohorts = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    let cohorts = await Cohort.find(filter).sort({ createdAt: -1 }).lean();

    // Refresh week done/current flags
    cohorts = cohorts.map(c => refreshWeeks(c));

    // Format dates as strings for the frontend
    cohorts = cohorts.map(c => ({
      ...c,
      startDate: fmtDate(c.startDate),
      endDate:   fmtDate(c.endDate),
    }));

    res.json({ cohorts });
  } catch (err) {
    console.error('[getAllCohorts]', err.message);
    res.status(500).json({ message: 'Failed to fetch cohorts' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET SINGLE COHORT
// ══════════════════════════════════════════════════════════════════════════

exports.getCohort = async (req, res) => {
  try {
    let cohort = await Cohort.findOne({ cohortId: req.params.id }).lean();
    if (!cohort) return res.status(404).json({ message: 'Cohort not found' });

    cohort = refreshWeeks(cohort);

    // Attach live stats
    const stats = await computeStats(cohort);
    cohort = { ...cohort, ...stats, startDate: fmtDate(cohort.startDate), endDate: fmtDate(cohort.endDate) };

    res.json({ cohort });
  } catch (err) {
    console.error('[getCohort]', err.message);
    res.status(500).json({ message: 'Failed to fetch cohort' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  CREATE COHORT
// ══════════════════════════════════════════════════════════════════════════

exports.createCohort = async (req, res) => {
  try {
    const { name, startDate, maxStudents, createdBy } = req.body;

    if (!name?.trim())  return res.status(400).json({ message: 'Cohort name is required' });
    if (!startDate)     return res.status(400).json({ message: 'Start date is required' });

    const start = new Date(startDate);
    if (isNaN(start.getTime())) return res.status(400).json({ message: 'Invalid start date' });

    // End date = start + 41 days (6 weeks minus 1 day)
    const end = new Date(start);
    end.setDate(end.getDate() + 41);

    const cohortId = generateCohortId();
    const weeks    = generateWeeks(start.toISOString());

    const cohort = new Cohort({
      cohortId,
      name:        name.trim(),
      startDate:   start,
      endDate:     end,
      status:      'forming',
      maxStudents: maxStudents ? Number(maxStudents) : 30,
      enrolled:    0,
      approved:    0,
      pending:     0,
      avgScore:    0,
      weeks,
      createdBy:   createdBy || 'admin',
    });

    await cohort.save();

    console.log(`[Cohort] Created: ${name} (${cohortId})`);

    res.status(201).json({
      message: `Cohort "${name}" created successfully`,
      cohort: {
        ...cohort.toJSON(),
        startDate: fmtDate(cohort.startDate),
        endDate:   fmtDate(cohort.endDate),
      },
    });
  } catch (err) {
    console.error('[createCohort]', err.message);
    if (err.code === 11000) return res.status(409).json({ message: 'A cohort with this ID already exists' });
    res.status(500).json({ message: 'Failed to create cohort' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  UPDATE COHORT (name, dates, status, maxStudents)
// ══════════════════════════════════════════════════════════════════════════

exports.updateCohort = async (req, res) => {
  try {
    const { name, startDate, status, maxStudents } = req.body;
    const upd = {};

    if (name?.trim())  upd.name = name.trim();
    if (status)        upd.status = status;
    if (maxStudents)   upd.maxStudents = Number(maxStudents);

    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) return res.status(400).json({ message: 'Invalid start date' });

      const end = new Date(start);
      end.setDate(end.getDate() + 41);

      upd.startDate = start;
      upd.endDate   = end;
      upd.weeks     = generateWeeks(start.toISOString(), status === 'closed');
    }

    const cohort = await Cohort.findOneAndUpdate(
      { cohortId: req.params.id },
      { $set: upd },
      { new: true }
    );

    if (!cohort) return res.status(404).json({ message: 'Cohort not found' });

    console.log(`[Cohort] Updated: ${cohort.name}`);

    res.json({
      message: 'Cohort updated',
      cohort: {
        ...refreshWeeks(cohort.toJSON()),
        startDate: fmtDate(cohort.startDate),
        endDate:   fmtDate(cohort.endDate),
      },
    });
  } catch (err) {
    console.error('[updateCohort]', err.message);
    res.status(500).json({ message: 'Failed to update cohort' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  ARCHIVE COHORT (set status = 'closed')
// ══════════════════════════════════════════════════════════════════════════

exports.archiveCohort = async (req, res) => {
  try {
    const cohort = await Cohort.findOneAndUpdate(
      { cohortId: req.params.id },
      {
        $set: {
          status: 'closed',
          weeks:  generateWeeks(undefined, true),  // mark all weeks done
        }
      },
      { new: true }
    );

    if (!cohort) return res.status(404).json({ message: 'Cohort not found' });

    // Regenerate with actual start date
    const archivedWeeks = generateWeeks(cohort.startDate.toISOString(), true);
    cohort.weeks = archivedWeeks;
    await cohort.save();

    console.log(`[Cohort] Archived: ${cohort.name}`);

    res.json({
      message: `Cohort "${cohort.name}" archived`,
      cohort: {
        ...cohort.toJSON(),
        startDate: fmtDate(cohort.startDate),
        endDate:   fmtDate(cohort.endDate),
      },
    });
  } catch (err) {
    console.error('[archiveCohort]', err.message);
    res.status(500).json({ message: 'Failed to archive cohort' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  DELETE COHORT (hard delete — use with care)
// ══════════════════════════════════════════════════════════════════════════

exports.deleteCohort = async (req, res) => {
  try {
    const cohort = await Cohort.findOneAndDelete({ cohortId: req.params.id });
    if (!cohort) return res.status(404).json({ message: 'Cohort not found' });

    console.log(`[Cohort] Deleted: ${cohort.name}`);
    res.json({ message: `Cohort "${cohort.name}" deleted permanently` });
  } catch (err) {
    console.error('[deleteCohort]', err.message);
    res.status(500).json({ message: 'Failed to delete cohort' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  REFRESH STATS — sync live enrollment counts
// ══════════════════════════════════════════════════════════════════════════

exports.refreshStats = async (req, res) => {
  try {
    const cohort = await Cohort.findOne({ cohortId: req.params.id });
    if (!cohort) return res.status(404).json({ message: 'Cohort not found' });

    const stats = await computeStats(cohort);

    cohort.enrolled = stats.enrolled;
    cohort.approved = stats.approved;
    cohort.pending  = stats.pending;
    cohort.avgScore = stats.avgScore;
    await cohort.save();

    res.json({ message: 'Stats refreshed', stats });
  } catch (err) {
    console.error('[refreshStats]', err.message);
    res.status(500).json({ message: 'Failed to refresh stats' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET CALENDAR — return just the weeks array for a cohort
// ══════════════════════════════════════════════════════════════════════════

exports.getCalendar = async (req, res) => {
  try {
    const cohort = await Cohort.findOne({ cohortId: req.params.id }, 'weeks startDate status name').lean();
    if (!cohort) return res.status(404).json({ message: 'Cohort not found' });

    const refreshed = refreshWeeks(cohort);
    res.json({ weeks: refreshed.weeks, cohortName: cohort.name });
  } catch (err) {
    console.error('[getCalendar]', err.message);
    res.status(500).json({ message: 'Failed to fetch calendar' });
  }
};