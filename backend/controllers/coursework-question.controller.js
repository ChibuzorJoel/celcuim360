/**
 * controllers/coursework-question.controller.js
 */

const CourseworkQuestion = require('../models/Courseworkquestion.model');
const Registration       = require('../models/Registration');
const StudentProgress    = require('../models/StudentProgress.model');
const nodemailer         = require('nodemailer');

// ── Email helper ──────────────────────────────────────────────────────────
const mailer = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendEmail(to, subject, html) {
  if (!process.env.SMTP_USER) {
    console.log(`[Email skipped] ${subject} → ${to}`);
    return;
  }
  try {
    await mailer.sendMail({ from: `"Celcium360" <${process.env.SMTP_USER}>`, to, subject, html });
    console.log(`[Email] ${subject} → ${to}`);
  } catch (e) {
    console.error(`[Email failed] ${e.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  KEY UTILITY — normalise weekProgress to a plain JS object
//  Handles: Mongoose Map, plain object, undefined
// ══════════════════════════════════════════════════════════════════════════
function normalisedWeekProgress(rawWP) {
  if (!rawWP) return {};

  // Mongoose Map instance — has a forEach that gives (value, key)
  if (typeof rawWP.forEach === 'function' && typeof rawWP.get === 'function') {
    const out = {};
    rawWP.forEach((val, key) => {
      // val may be a Mongoose subdocument — convert to plain object
      out[String(key)] = val && typeof val.toObject === 'function' ? val.toObject() : { ...val };
    });
    return out;
  }

  // Plain object (Mixed schema or after .lean())
  const out = {};
  for (const key of Object.keys(rawWP)) {
    const val = rawWP[key];
    out[String(key)] = val && typeof val.toObject === 'function' ? val.toObject() : { ...val };
  }
  return out;
}

// ══════════════════════════════════════════════════════════════════════════
//  Default questions
// ══════════════════════════════════════════════════════════════════════════
const DEFAULT_QUESTIONS = {
  1: {
    weekTitle: 'Foundation for Workplace',
    instruction: 'Based on what you have learned this week, respond to each real-life workplace scenario clearly and practically. Your responses should reflect how a work-ready professional is expected to think, behave, communicate, and act in a real workplace environment.',
    questions: [
      'A colleague starts speaking negatively about your manager and tries to involve you in the conversation during work hours.',
      'You discover that a teammate presented your idea in a meeting without acknowledging you.',
      'Your manager corrects your work sharply in front of others during a meeting.',
      'You missed a deadline due to your own oversight.',
      'A team member is not contributing to a group task, and it is affecting delivery timelines.',
      'A colleague shares confidential information about another employee with you and expects you to keep the conversation going.',
      'During a virtual meeting, you strongly disagree with a point being made while someone else is speaking.',
      'A junior colleague makes a mistake that directly impacts your own work.',
      'Your manager asks for an update on a task that is not yet completed, but is close to completion.',
      'You are working with international colleagues whose communication style feels blunt or too direct.',
    ],
  },
  2: {
    weekTitle: 'Communication & Professional Presence',
    instruction: 'Based on what you have learned this week, respond to each real-life workplace scenario clearly and practically.',
    questions: [
      'You receive an email from your manager asking for an urgent update, but the tone feels harsh and demanding.',
      'You sent an important email to a client and noticed immediately after that it contains an error.',
      'A recruiter views your LinkedIn profile but does not reach out. You notice your profile is not getting engagement.',
      'You are asked to introduce yourself in a professional meeting with senior stakeholders.',
      'A colleague sends you a poorly written email that is unclear, and you are unsure what is required.',
      'You are applying for a role and your experience does not perfectly match the job description.',
      'You receive a message from a recruiter asking about your availability, but you are not fully interested in the role.',
      'You notice your LinkedIn profile does not clearly reflect what you do or the value you bring.',
      'During a meeting, you are asked a question you do not know the answer to.',
      'You are communicating with a senior colleague and they respond with very short, direct messages.',
    ],
  },
  3: {
    weekTitle: 'Career Positioning & Job Readiness',
    instruction: 'Based on what you have learned this week, respond to each real-life workplace scenario clearly and practically.',
    questions: [
      'You are asked in an interview: Tell me about yourself.',
      'You see a job opportunity you like, but you only meet about 60% of the requirements.',
      'A recruiter asks about your previous experience, and you feel tempted to exaggerate to appear more qualified.',
      'You apply for multiple jobs but receive no response after weeks.',
      'You are given an opportunity to pitch yourself in less than 2 minutes.',
      'You are offered a role, but the salary is lower than expected.',
      'You want to transition into a new career path with little direct experience.',
      'You are asked to provide examples of your work, but you have limited formal experience.',
      'You find a remote job opportunity with global applicants competing for the same role.',
      "After an interview, you feel you didn't perform your best.",
    ],
  },
  4: {
    weekTitle: 'Productivity & Workplace Performance',
    instruction: 'Based on what you have learned this week, respond to each real-life workplace scenario clearly and practically.',
    questions: [
      'You have multiple deadlines due at the same time and limited time to complete them.',
      'You notice you are constantly busy but not making real progress on important tasks.',
      'Your manager gives you a task with unclear instructions.',
      'You are assigned a task using a Microsoft tool you are not familiar with.',
      'You keep getting distracted during work hours.',
      'You are working on a task and realize halfway that you misunderstood the requirement.',
      'Your workload suddenly increases beyond what you can realistically handle.',
      'You are working on repetitive tasks that take too much time daily.',
      'You are part of a team project where timelines are tight and coordination is required.',
      'You complete your tasks early while others are still behind.',
    ],
  },
  5: {
    weekTitle: 'Workplace Excellence & Growth',
    instruction: 'Based on what you have learned this week, respond to each real-life workplace scenario clearly and practically.',
    questions: [
      'A client is unhappy and expresses frustration about your service.',
      'You are feeling mentally drained and unmotivated at work.',
      'You are under pressure to deliver results within a very short timeframe.',
      'A colleague consistently delivers poor-quality work that affects your output.',
      'You need support from another team, but they are unresponsive.',
      'You receive constructive feedback that highlights your weaknesses.',
      'You are working with someone whose personality clashes with yours.',
      'You are given an opportunity to take on more responsibility.',
      'A client makes a request that goes beyond your role or company policy.',
      'You feel stuck in your current role with little growth.',
    ],
  },
  6: {
    weekTitle: 'Career Direction & Real-World Application',
    instruction: 'Based on what you have learned this week, respond to each real-life workplace scenario clearly and practically.',
    questions: [
      'You receive two job offers: one with higher pay but poor growth, and another with lower pay but strong growth potential.',
      'You are placed in a new work environment where expectations are unclear.',
      'You are asked to handle a situation you have never experienced before.',
      'You are working in a fast-paced environment where mistakes are not easily tolerated.',
      'You notice inefficiencies in a process within your team.',
      'You are required to collaborate with people from different cultural and professional backgrounds.',
      'You are given feedback that conflicts with how you see your performance.',
      'You are asked to step into a leadership role unexpectedly.',
      'You experience a major setback in your work or career.',
      'You are asked: What value do you bring to this organization?',
    ],
  },
};

function parseWeekParam(param) {
  const n = parseInt(param, 10);
  if (isNaN(n) || n < 1 || n > 6) return null;
  return n;
}

function validate10Questions(questions) {
  if (!Array.isArray(questions))  return 'questions must be an array';
  if (questions.length !== 10)    return 'Exactly 10 questions are required';
  const empty = questions.findIndex(q => !q || !String(q).trim());
  if (empty !== -1) return `Question ${empty + 1} is empty`;
  return null;
}

// ══════════════════════════════════════════════════════════════════════════
//  GET ALL WEEKS
// ══════════════════════════════════════════════════════════════════════════
exports.getAllWeeks = async (req, res) => {
  try {
    const dbWeeks = await CourseworkQuestion.find({}).sort({ weekNumber: 1 }).lean();
    const weeks = [];
    for (let w = 1; w <= 6; w++) {
      const found = dbWeeks.find(d => d.weekNumber === w);
      weeks.push(found || { weekNumber: w, ...DEFAULT_QUESTIONS[w], isPublished: false, publishedAt: null, updatedAt: null, _fromDefault: true });
    }
    res.json({ weeks });
  } catch (err) {
    console.error('[getAllWeeks]', err.message);
    res.status(500).json({ message: 'Failed to fetch weeks' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET SINGLE WEEK
// ══════════════════════════════════════════════════════════════════════════
exports.getWeek = async (req, res) => {
  try {
    const weekNumber = parseWeekParam(req.params.week);
    if (!weekNumber) return res.status(400).json({ message: 'Invalid week number (1–6)' });
    const week = await CourseworkQuestion.findOne({ weekNumber }).lean()
      || { weekNumber, ...DEFAULT_QUESTIONS[weekNumber], isPublished: false, publishedAt: null, updatedAt: null, _fromDefault: true };
    res.json({ week });
  } catch (err) {
    console.error('[getWeek]', err.message);
    res.status(500).json({ message: 'Failed to fetch week' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET WEEK FOR STUDENT
// ══════════════════════════════════════════════════════════════════════════
exports.getWeekForStudent = async (req, res) => {
  try {
    const weekNumber = parseWeekParam(req.params.week);
    if (!weekNumber) return res.status(400).json({ message: 'Invalid week number' });
    const week = await CourseworkQuestion.findOne({ weekNumber, isPublished: true }).lean();
    if (!week) return res.status(403).json({ message: 'This week has not been published yet' });
    const { weekNumber: wn, weekTitle, instruction, questions, publishedAt } = week;
    res.json({ week: { weekNumber: wn, weekTitle, instruction, questions, publishedAt } });
  } catch (err) {
    console.error('[getWeekForStudent]', err.message);
    res.status(500).json({ message: 'Failed to fetch week' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  PUT — upsert week questions
// ══════════════════════════════════════════════════════════════════════════
exports.upsertWeek = async (req, res) => {
  try {
    const weekNumber = parseWeekParam(req.params.week);
    if (!weekNumber) return res.status(400).json({ message: 'Invalid week number (1–6)' });
    const { weekTitle, instruction, questions, updatedBy } = req.body;
    if (!weekTitle?.trim()) return res.status(400).json({ message: 'weekTitle is required' });
    const qErr = validate10Questions(questions);
    if (qErr) return res.status(400).json({ message: qErr });
    const week = await CourseworkQuestion.findOneAndUpdate(
      { weekNumber },
      { $set: { weekNumber, weekTitle: weekTitle.trim(), instruction: instruction?.trim() || DEFAULT_QUESTIONS[weekNumber]?.instruction || '', questions: questions.map(q => String(q).trim()), updatedAt: new Date(), updatedBy: updatedBy || 'admin' } },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ message: `Week ${weekNumber} questions saved successfully`, week });
  } catch (err) {
    console.error('[upsertWeek]', err.message);
    res.status(500).json({ message: err.message || 'Failed to save week' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  PATCH — partial update
// ══════════════════════════════════════════════════════════════════════════
exports.patchWeek = async (req, res) => {
  try {
    const weekNumber = parseWeekParam(req.params.week);
    if (!weekNumber) return res.status(400).json({ message: 'Invalid week number (1–6)' });
    const { weekTitle, instruction, questionIndex, questionText, updatedBy } = req.body;
    const upd = { updatedAt: new Date(), updatedBy: updatedBy || 'admin' };
    if (weekTitle?.trim())   upd.weekTitle   = weekTitle.trim();
    if (instruction?.trim()) upd.instruction = instruction.trim();
    if (questionIndex !== undefined && questionText !== undefined) {
      const idx = parseInt(questionIndex, 10);
      if (isNaN(idx) || idx < 0 || idx > 9) return res.status(400).json({ message: 'questionIndex must be 0–9' });
      if (!String(questionText).trim()) return res.status(400).json({ message: 'questionText cannot be empty' });
      upd[`questions.${idx}`] = String(questionText).trim();
    }
    let week = await CourseworkQuestion.findOneAndUpdate({ weekNumber }, { $set: upd }, { new: true });
    if (!week) {
      const def = DEFAULT_QUESTIONS[weekNumber];
      const newWeek = new CourseworkQuestion({ weekNumber, weekTitle: weekTitle?.trim() || def.weekTitle, instruction: instruction?.trim() || def.instruction, questions: [...def.questions], isPublished: false, updatedAt: new Date(), updatedBy: updatedBy || 'admin' });
      if (questionIndex !== undefined) newWeek.questions[parseInt(questionIndex, 10)] = String(questionText).trim();
      await newWeek.save();
      week = newWeek;
    }
    res.json({ message: 'Week updated', week });
  } catch (err) {
    console.error('[patchWeek]', err.message);
    res.status(500).json({ message: err.message || 'Failed to update week' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  PATCH /publish
// ══════════════════════════════════════════════════════════════════════════
exports.setPublishStatus = async (req, res) => {
  try {
    const weekNumber = parseWeekParam(req.params.week);
    if (!weekNumber) return res.status(400).json({ message: 'Invalid week number (1–6)' });
    const { publish, dueDate, publishedBy } = req.body;
    if (typeof publish !== 'boolean') return res.status(400).json({ message: '"publish" must be true or false' });
    let week = await CourseworkQuestion.findOne({ weekNumber });
    if (!week) {
      if (!publish) return res.status(404).json({ message: `Week ${weekNumber} has no questions set yet` });
      const def = DEFAULT_QUESTIONS[weekNumber];
      week = new CourseworkQuestion({ weekNumber, weekTitle: def.weekTitle, instruction: def.instruction, questions: [...def.questions], isPublished: false, updatedAt: new Date(), updatedBy: publishedBy || 'admin' });
      await week.save();
    }
    if (publish) {
      const qErr = validate10Questions(week.questions);
      if (qErr) return res.status(400).json({ message: `Cannot publish: ${qErr}. Please save all 10 questions first.` });
    }
    week.isPublished = publish;
    week.publishedAt = publish ? new Date() : null;
    week.updatedAt   = new Date();
    week.updatedBy   = publishedBy || 'admin';
    await week.save();
    console.log(`[Publish] Week ${weekNumber} → ${publish ? 'PUBLISHED' : 'UNPUBLISHED'}`);
    if (publish) {
      try {
        const students   = await Registration.find({ status: 'approved' }, 'email fullName').lean();
        const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
        for (const s of students) {
          await sendEmail(s.email, `📚 Week ${weekNumber} is Now Available — Celcium360`,
            `<div style="font-family:Arial,sans-serif;max-width:580px;margin:auto;padding:28px;background:#111;color:#e0e0e0;border-radius:12px;border:1px solid #B88D2A;">
              <h2 style="color:#B88D2A;margin-top:0;">Week ${weekNumber} is Live! 📚</h2>
              <p>Hi <strong>${s.fullName}</strong>,</p>
              <p><strong>Week ${weekNumber}: ${week.weekTitle}</strong> is now available in your student portal.</p>
              ${dueDateStr ? `<div style="background:#1a1a1a;border:1px solid #2e2e2e;border-radius:8px;padding:12px 16px;margin:16px 0;display:inline-block;"><span style="font-size:11px;color:#888;">Due Date</span><br><strong style="color:#B88D2A;font-size:15px;">${dueDateStr}</strong></div>` : ''}
              <p style="margin-bottom:20px;">Log in to your student portal to view and submit your coursework.</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/portal" style="display:inline-block;padding:13px 26px;background:#B88D2A;color:#000;text-decoration:none;border-radius:8px;font-weight:700;">Open Student Portal →</a>
              <hr style="border-color:#2e2e2e;margin:24px 0;">
              <p style="color:#555;font-size:11px;margin:0;">Celcium360 Solutions Limited · <a href="mailto:training@celcium360solutions.com" style="color:#B88D2A;">training@celcium360solutions.com</a></p>
            </div>`
          );
        }
      } catch (emailErr) { console.error('[Publish email error]', emailErr.message); }
    }
    res.json({ message: `Week ${weekNumber} ${publish ? 'published' : 'unpublished'} successfully`, isPublished: week.isPublished, publishedAt: week.publishedAt, weekNumber });
  } catch (err) {
    console.error('[setPublishStatus]', err.message);
    res.status(500).json({ message: err.message || 'Failed to update publish status' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  DELETE
// ══════════════════════════════════════════════════════════════════════════
exports.deleteWeek = async (req, res) => {
  try {
    const weekNumber = parseWeekParam(req.params.week);
    if (!weekNumber) return res.status(400).json({ message: 'Invalid week number (1–6)' });
    const deleted = await CourseworkQuestion.findOneAndDelete({ weekNumber });
    if (!deleted) return res.status(404).json({ message: `Week ${weekNumber} not found in database` });
    res.json({ message: `Week ${weekNumber} questions reset.` });
  } catch (err) {
    console.error('[deleteWeek]', err.message);
    res.status(500).json({ message: 'Failed to reset week' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET STUDENT PROGRESS  ← FIXED: properly reads Map or plain object
// ══════════════════════════════════════════════════════════════════════════
exports.getStudentProgress = async (req, res) => {
  try {
    const { registrationId } = req.params;

    const publishedWeeks = await CourseworkQuestion
      .find({ isPublished: true })
      .select('weekNumber publishedAt')
      .lean();

    // Load WITHOUT .lean() so we can call normalisedWeekProgress on the doc
    const progressDoc = await StudentProgress.findOne({ registrationId });

    const weekProgress = {};
    if (progressDoc) {
      const normalised = normalisedWeekProgress(progressDoc.weekProgress);
      Object.assign(weekProgress, normalised);
    }

    // Normalise finalExam
    let finalExam = { submitted: false, score: null, feedback: null, graded: false };
    if (progressDoc?.finalExam) {
      const fe = typeof progressDoc.finalExam.toObject === 'function'
        ? progressDoc.finalExam.toObject()
        : { ...progressDoc.finalExam };
      finalExam = {
        submitted: fe.submitted ?? false,
        score:     fe.score     ?? null,
        feedback:  fe.feedback  ?? null,
        graded:    fe.graded    ?? false,
      };
    }

    res.json({
      publishedWeeks: publishedWeeks.map(w => ({ weekId: w.weekNumber, dueDate: w.publishedAt || null })),
      weekProgress,
      finalExam,
    });
  } catch (err) {
    console.error('[getStudentProgress]', err.message);
    res.status(500).json({ message: 'Failed to load progress.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  SUBMIT COURSEWORK  ← uses $set with dot notation — works for Map AND Mixed
// ══════════════════════════════════════════════════════════════════════════
exports.submitCoursework = async (req, res) => {
  const { registrationId, weekId, answers, studentName, studentEmail } = req.body;
  if (!registrationId || !weekId || !answers?.length) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }
  try {
    const key = String(weekId);
    await StudentProgress.findOneAndUpdate(
      { registrationId },
      {
        $set: {
          studentName:  studentName  || '',
          studentEmail: studentEmail || '',
          [`weekProgress.${key}`]: {
            submitted:   true,
            score:       null,
            feedback:    null,
            graded:      false,
            submittedAt: new Date(),
            answers:     answers,
          },
        },
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: `Week ${weekId} submitted.` });
  } catch (err) {
    console.error('[submitCoursework]', err.message);
    res.status(500).json({ message: 'Failed to submit coursework.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  SUBMIT FINAL EXAM
// ══════════════════════════════════════════════════════════════════════════
exports.submitFinalExam = async (req, res) => {
  const { registrationId, answers, studentName, studentEmail } = req.body;
  if (!registrationId || !answers?.length) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }
  try {
    await StudentProgress.findOneAndUpdate(
      { registrationId },
      {
        $set: {
          studentName:  studentName  || '',
          studentEmail: studentEmail || '',
          'finalExam.submitted':   true,
          'finalExam.score':       null,
          'finalExam.feedback':    null,
          'finalExam.graded':      false,
          'finalExam.submittedAt': new Date(),
          'finalExam.answers':     answers,
        },
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: 'Final exam submitted.' });
  } catch (err) {
    console.error('[submitFinalExam]', err.message);
    res.status(500).json({ message: 'Failed to submit final exam.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET ALL SUBMISSIONS  ← FIXED: uses normalisedWeekProgress
// ══════════════════════════════════════════════════════════════════════════
exports.getAllSubmissions = async (req, res) => {
  try {
    const { week, type } = req.query;

    // Load without .lean() so normalisedWeekProgress can handle Map instances
    const allProgress = await StudentProgress.find({});

    if (!allProgress.length) return res.json({ submissions: [] });

    const regIds   = allProgress.map(p => p.registrationId);
    const students = await Registration.find(
      { registrationId: { $in: regIds } },
      'registrationId fullName email category'
    ).lean();
    const studentMap = {};
    students.forEach(s => { studentMap[s.registrationId] = s; });

    const weekTitleFallback = {
      1: 'Foundation for Workplace',      2: 'Communication & Professional Presence',
      3: 'Career Positioning & Job Readiness', 4: 'Productivity & Workplace Performance',
      5: 'Workplace Excellence & Growth',  6: 'Career Direction & Real-World Application',
    };
    const cwWeeks = await CourseworkQuestion.find({}).select('weekNumber weekTitle').lean();
    const weekTitleMap = {};
    cwWeeks.forEach(w => { weekTitleMap[w.weekNumber] = w.weekTitle; });

    const submissions = [];

    // ── Final exam ──────────────────────────────────────────────────
    if (type === 'final') {
      allProgress.forEach(progress => {
        const student     = studentMap[progress.registrationId] || {};
        const studentName = student.fullName || progress.studentName || progress.registrationId;
        const fe = progress.finalExam && typeof progress.finalExam.toObject === 'function'
          ? progress.finalExam.toObject()
          : { ...(progress.finalExam || {}) };

        submissions.push({
          registrationId: progress.registrationId,
          student:  studentName,
          email:    student.email || progress.studentEmail || '',
          category: student.category || '',
          type:     'final',
          weekId:   null,
          weekLabel: 'Final Exam',
          submitted:   fe.submitted  ?? false,
          score:       fe.score      ?? null,
          feedback:    fe.feedback   ?? null,
          graded:      fe.graded     ?? false,
          submittedAt: fe.submittedAt ?? null,
          answers:     Array.isArray(fe.answers) ? fe.answers : [],
        });
      });
      return res.json({ submissions });
    }

    // ── Weekly ──────────────────────────────────────────────────────
    const weeksToReturn = week ? [parseInt(week, 10)] : [1, 2, 3, 4, 5, 6];

    allProgress.forEach(progress => {
      const student     = studentMap[progress.registrationId] || {};
      const studentName = student.fullName || progress.studentName || progress.registrationId;

      // ← THE KEY FIX: normalise once per student
      const wp = normalisedWeekProgress(progress.weekProgress);

      weeksToReturn.forEach(w => {
        const weekData = wp[String(w)] || null;

        console.log(`[Sub] ${progress.registrationId} wk=${w} found=${!!weekData} score=${weekData?.score ?? 'null'} graded=${weekData?.graded ?? false} answers=${weekData?.answers?.length ?? 0}`);

        submissions.push({
          registrationId: progress.registrationId,
          student:  studentName,
          email:    student.email || progress.studentEmail || '',
          category: student.category || '',
          type:     'weekly',
          weekId:   w,
          weekLabel: `Week ${w}: ${weekTitleMap[w] || weekTitleFallback[w] || ''}`,
          submitted:   weekData?.submitted  ?? false,
          score:       weekData?.score      ?? null,
          feedback:    weekData?.feedback   ?? null,
          graded:      weekData?.graded     ?? false,
          submittedAt: weekData?.submittedAt ?? null,
          answers:     Array.isArray(weekData?.answers) ? weekData.answers : [],
        });
      });
    });

    res.json({ submissions });
  } catch (err) {
    console.error('[getAllSubmissions]', err.message);
    res.status(500).json({ message: 'Failed to fetch submissions.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GRADE SUBMISSION  ← FIXED: uses $set dot-notation, never spreads Map data
// ══════════════════════════════════════════════════════════════════════════
exports.gradeSubmission = async (req, res) => {
  try {
    const { registrationId, weekId, score, feedback, gradedBy } = req.body;

    if (!registrationId)                      return res.status(400).json({ message: 'registrationId is required.' });
    if (score === undefined || score === null) return res.status(400).json({ message: 'score is required.' });

    // Verify the student actually submitted before grading
    const check = await StudentProgress.findOne({ registrationId });
    if (!check) return res.status(404).json({ message: 'Student progress record not found.' });

    if (weekId === 'final') {
      const fe = check.finalExam && typeof check.finalExam.toObject === 'function'
        ? check.finalExam.toObject() : { ...(check.finalExam || {}) };
      if (!fe.submitted) return res.status(400).json({ message: 'Student has not submitted the final exam.' });

      // Use $set with dot-notation — works regardless of schema type
      await StudentProgress.findOneAndUpdate(
        { registrationId },
        {
          $set: {
            'finalExam.score':    Number(score),
            'finalExam.feedback': feedback || '',
            'finalExam.graded':   true,
            'finalExam.gradedAt': new Date(),
            'finalExam.gradedBy': gradedBy || 'admin',
          },
        }
      );
    } else {
      const wid = parseInt(weekId, 10);
      if (isNaN(wid) || wid < 1 || wid > 6) return res.status(400).json({ message: 'Invalid weekId. Must be 1-6 or "final".' });

      const wp       = normalisedWeekProgress(check.weekProgress);
      const existing = wp[String(wid)];
      if (!existing || !existing.submitted) return res.status(400).json({ message: `Student has not submitted Week ${wid}.` });

      const key = String(wid);

      // Use $set with dot-notation — this is the critical fix.
      // Spreading a Mongoose subdoc was silently losing data on save.
      await StudentProgress.findOneAndUpdate(
        { registrationId },
        {
          $set: {
            [`weekProgress.${key}.score`]:    Number(score),
            [`weekProgress.${key}.feedback`]: feedback || '',
            [`weekProgress.${key}.graded`]:   true,
            [`weekProgress.${key}.gradedAt`]: new Date(),
            [`weekProgress.${key}.gradedBy`]: gradedBy || 'admin',
          },
        }
      );
    }

    console.log(`[Grade] ${registrationId} weekId=${weekId} score=${score} ✓`);

    // Email student
    try {
      const student = await Registration.findOne({ registrationId }, 'email fullName').lean();
      if (student?.email) {
        const label    = weekId === 'final' ? 'Final Exam' : `Week ${weekId}`;
        const scoreVal = weekId === 'final' ? `${score}/40` : `${score}/10`;
        await sendEmail(
          student.email,
          `📊 Your ${label} Has Been Graded — Celcium360`,
          `<div style="font-family:Arial,sans-serif;max-width:580px;margin:auto;padding:28px;background:#111;color:#e0e0e0;border-radius:12px;border:1px solid #B88D2A;">
            <h2 style="color:#B88D2A;margin-top:0;">Your ${label} Results 📊</h2>
            <p>Hi <strong>${student.fullName}</strong>,</p>
            <p>Your <strong>${label}</strong> submission has been reviewed and graded.</p>
            <div style="background:#1a1a1a;border:1px solid #2e2e2e;border-radius:8px;padding:16px;margin:16px 0;">
              <div style="font-size:11px;color:#888;margin-bottom:4px;">Your Score</div>
              <div style="font-size:28px;font-weight:700;color:#B88D2A;">${scoreVal}</div>
              ${feedback ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #2e2e2e;"><div style="font-size:11px;color:#888;margin-bottom:4px;">Feedback</div><div style="font-size:13px;color:#ccc;">${feedback}</div></div>` : ''}
            </div>
            <p>Log in to your student portal to view your full results.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/portal" style="display:inline-block;padding:13px 26px;background:#B88D2A;color:#000;text-decoration:none;border-radius:8px;font-weight:700;">View My Results →</a>
            <hr style="border-color:#2e2e2e;margin:24px 0;">
            <p style="color:#555;font-size:11px;margin:0;">Celcium360 Solutions Limited</p>
          </div>`
        );
      }
    } catch (emailErr) { console.error('[Grade email error]', emailErr.message); }

    res.json({ success: true, message: 'Submission graded successfully.' });
  } catch (err) {
    console.error('[gradeSubmission]', err.message);
    res.status(500).json({ message: err.message || 'Failed to grade submission.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  MIGRATE — one-time endpoint to convert old Map records to plain objects
//  POST /api/coursework-questions/migrate
// ══════════════════════════════════════════════════════════════════════════
exports.migrateProgress = async (req, res) => {
  try {
    const allDocs = await StudentProgress.find({});
    let migrated = 0;

    for (const doc of allDocs) {
      const normalised = normalisedWeekProgress(doc.weekProgress);
      // Replace weekProgress entirely with the plain object
      doc.weekProgress = undefined;  // clear
      await StudentProgress.findByIdAndUpdate(doc._id, {
        $set: { weekProgress: normalised },
      });
      migrated++;
    }

    console.log(`[Migrate] ${migrated} documents normalised`);
    res.json({ success: true, migrated, total: allDocs.length, message: 'Migration complete. Refresh the admin page.' });
  } catch (err) {
    console.error('[migrateProgress]', err.message);
    res.status(500).json({ message: err.message });
  }
};