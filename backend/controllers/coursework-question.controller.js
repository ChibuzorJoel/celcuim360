/**
 * controllers/coursework-questions.controller.js
 *
 * Handles all CRUD for CourseworkQuestion — the 10 scenario questions
 * admin sets per week. Students fetch published weeks only.
 *
 * Wired via routes/coursework-questions.routes.js:
 *   GET    /api/coursework-questions
 *   GET    /api/coursework-questions/:week
 *   GET    /api/coursework-questions/:week/student
 *   PUT    /api/coursework-questions/:week
 *   PATCH  /api/coursework-questions/:week
 *   PATCH  /api/coursework-questions/:week/publish
 *   DELETE /api/coursework-questions/:week
 *
 * Wired via routes/student.routes.js:
 *   GET    /api/student/:registrationId/progress
 *
 * Wired via routes/coursework.routes.js:
 *   POST   /api/coursework
 *
 * Wired via routes/finalexam.routes.js:
 *   POST   /api/final-exam
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
    await mailer.sendMail({
      from: `"Celcium360" <${process.env.SMTP_USER}>`,
      to, subject, html,
    });
    console.log(`[Email] ${subject} → ${to}`);
  } catch (e) {
    console.error(`[Email failed] ${e.message}`);
  }
}

// ── Default questions for each week ──────────────────────────────────────
const DEFAULT_QUESTIONS = {
  1: {
    weekTitle:   'Foundation for Workplace',
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
    weekTitle:   'Communication & Professional Presence',
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
    weekTitle:   'Career Positioning & Job Readiness',
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
    weekTitle:   'Productivity & Workplace Performance',
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
    weekTitle:   'Workplace Excellence & Growth',
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
    weekTitle:   'Career Direction & Real-World Application',
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

// ══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════════════

function parseWeekParam(param) {
  const n = parseInt(param, 10);
  if (isNaN(n) || n < 1 || n > 6) return null;
  return n;
}

function validate10Questions(questions) {
  if (!Array.isArray(questions))        return 'questions must be an array';
  if (questions.length !== 10)          return 'Exactly 10 questions are required';
  const empty = questions.findIndex(q => !q || !String(q).trim());
  if (empty !== -1) return `Question ${empty + 1} is empty`;
  return null;
}

// ══════════════════════════════════════════════════════════════════════════
//  GET ALL WEEKS — admin summary (all 6 weeks, published or not)
// ══════════════════════════════════════════════════════════════════════════

exports.getAllWeeks = async (req, res) => {
  try {
    const dbWeeks = await CourseworkQuestion.find({}).sort({ weekNumber: 1 }).lean();

    const weeks = [];
    for (let w = 1; w <= 6; w++) {
      const found = dbWeeks.find(d => d.weekNumber === w);
      if (found) {
        weeks.push(found);
      } else {
        const def = DEFAULT_QUESTIONS[w];
        weeks.push({
          weekNumber:   w,
          weekTitle:    def.weekTitle,
          instruction:  def.instruction,
          questions:    def.questions,
          isPublished:  false,
          publishedAt:  null,
          updatedAt:    null,
          _fromDefault: true,
        });
      }
    }

    res.json({ weeks });
  } catch (err) {
    console.error('[getAllWeeks]', err.message);
    res.status(500).json({ message: 'Failed to fetch weeks' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET SINGLE WEEK — admin full detail
// ══════════════════════════════════════════════════════════════════════════

exports.getWeek = async (req, res) => {
  try {
    const weekNumber = parseWeekParam(req.params.week);
    if (!weekNumber) return res.status(400).json({ message: 'Invalid week number (1–6)' });

    let week = await CourseworkQuestion.findOne({ weekNumber }).lean();

    if (!week) {
      const def = DEFAULT_QUESTIONS[weekNumber];
      week = { weekNumber, ...def, isPublished: false, publishedAt: null, updatedAt: null, _fromDefault: true };
    }

    res.json({ week });
  } catch (err) {
    console.error('[getWeek]', err.message);
    res.status(500).json({ message: 'Failed to fetch week' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET WEEK FOR STUDENT — only if published
// ══════════════════════════════════════════════════════════════════════════

exports.getWeekForStudent = async (req, res) => {
  try {
    const weekNumber = parseWeekParam(req.params.week);
    if (!weekNumber) return res.status(400).json({ message: 'Invalid week number' });

    const week = await CourseworkQuestion.findOne({ weekNumber, isPublished: true }).lean();

    if (!week) {
      return res.status(403).json({ message: 'This week has not been published yet' });
    }

    const { weekNumber: wn, weekTitle, instruction, questions, publishedAt } = week;
    res.json({ week: { weekNumber: wn, weekTitle, instruction, questions, publishedAt } });
  } catch (err) {
    console.error('[getWeekForStudent]', err.message);
    res.status(500).json({ message: 'Failed to fetch week' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  PUT — create or fully replace a week's questions
// ══════════════════════════════════════════════════════════════════════════

exports.upsertWeek = async (req, res) => {
  try {
    const weekNumber = parseWeekParam(req.params.week);
    if (!weekNumber) return res.status(400).json({ message: 'Invalid week number (1–6)' });

    const { weekTitle, instruction, questions, updatedBy } = req.body;

    if (!weekTitle || !String(weekTitle).trim()) {
      return res.status(400).json({ message: 'weekTitle is required' });
    }

    const qErr = validate10Questions(questions);
    if (qErr) return res.status(400).json({ message: qErr });

    const week = await CourseworkQuestion.findOneAndUpdate(
      { weekNumber },
      {
        $set: {
          weekNumber,
          weekTitle:   weekTitle.trim(),
          instruction: instruction?.trim() || DEFAULT_QUESTIONS[weekNumber]?.instruction || '',
          questions:   questions.map(q => String(q).trim()),
          updatedAt:   new Date(),
          updatedBy:   updatedBy || 'admin',
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    console.log(`[CourseworkQ] Week ${weekNumber} saved by ${updatedBy || 'admin'}`);
    res.json({ message: `Week ${weekNumber} questions saved successfully`, week });
  } catch (err) {
    console.error('[upsertWeek]', err.message);
    res.status(500).json({ message: err.message || 'Failed to save week' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  PATCH — partial update (title, instruction, or individual question)
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
      if (isNaN(idx) || idx < 0 || idx > 9) {
        return res.status(400).json({ message: 'questionIndex must be 0–9' });
      }
      if (!String(questionText).trim()) {
        return res.status(400).json({ message: 'questionText cannot be empty' });
      }
      upd[`questions.${idx}`] = String(questionText).trim();
    }

    let week = await CourseworkQuestion.findOneAndUpdate(
      { weekNumber },
      { $set: upd },
      { new: true }
    );

    if (!week) {
      const def = DEFAULT_QUESTIONS[weekNumber];
      const newWeek = new CourseworkQuestion({
        weekNumber,
        weekTitle:   weekTitle?.trim()   || def.weekTitle,
        instruction: instruction?.trim() || def.instruction,
        questions:   [...def.questions],
        isPublished: false,
        updatedAt:   new Date(),
        updatedBy:   updatedBy || 'admin',
      });
      if (questionIndex !== undefined) {
        const idx = parseInt(questionIndex, 10);
        newWeek.questions[idx] = String(questionText).trim();
      }
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
//  PATCH /publish — publish or unpublish a week
// ══════════════════════════════════════════════════════════════════════════

exports.setPublishStatus = async (req, res) => {
  try {
    const weekNumber = parseWeekParam(req.params.week);
    if (!weekNumber) return res.status(400).json({ message: 'Invalid week number (1–6)' });

    const { publish, dueDate, publishedBy } = req.body;

    if (typeof publish !== 'boolean') {
      return res.status(400).json({ message: '"publish" must be true or false' });
    }

    let week = await CourseworkQuestion.findOne({ weekNumber });

    if (!week) {
      if (!publish) {
        return res.status(404).json({ message: `Week ${weekNumber} has no questions set yet` });
      }
      const def = DEFAULT_QUESTIONS[weekNumber];
      week = new CourseworkQuestion({
        weekNumber,
        weekTitle:   def.weekTitle,
        instruction: def.instruction,
        questions:   [...def.questions],
        isPublished: false,
        updatedAt:   new Date(),
        updatedBy:   publishedBy || 'admin',
      });
      await week.save();
    }

    if (publish) {
      const qErr = validate10Questions(week.questions);
      if (qErr) {
        return res.status(400).json({
          message: `Cannot publish: ${qErr}. Please save all 10 questions first.`,
        });
      }
    }

    week.isPublished = publish;
    week.publishedAt = publish ? new Date() : null;
    week.updatedAt   = new Date();
    week.updatedBy   = publishedBy || 'admin';
    await week.save();

    console.log(`[Publish] Week ${weekNumber} → ${publish ? 'PUBLISHED' : 'UNPUBLISHED'} by ${publishedBy || 'admin'}`);

    if (publish) {
      try {
        const students = await Registration.find({ status: 'approved' }, 'email fullName').lean();

        const dueDateStr = dueDate
          ? new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : null;

        for (const s of students) {
          await sendEmail(
            s.email,
            `📚 Week ${weekNumber} is Now Available — Celcium360`,
            `<div style="font-family:Arial,sans-serif;max-width:580px;margin:auto;padding:28px;background:#111;color:#e0e0e0;border-radius:12px;border:1px solid #B88D2A;">
              <h2 style="color:#B88D2A;margin-top:0;">Week ${weekNumber} is Live! 📚</h2>
              <p>Hi <strong>${s.fullName}</strong>,</p>
              <p><strong>Week ${weekNumber}: ${week.weekTitle}</strong> is now available in your student portal.</p>
              ${dueDateStr ? `<div style="background:#1a1a1a;border:1px solid #2e2e2e;border-radius:8px;padding:12px 16px;margin:16px 0;display:inline-block;">
                <span style="font-size:11px;color:#888;">Due Date</span><br>
                <strong style="color:#B88D2A;font-size:15px;">${dueDateStr}</strong>
              </div>` : ''}
              <p style="margin-bottom:20px;">Log in to your student portal to view and submit your coursework.</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/portal"
                 style="display:inline-block;padding:13px 26px;background:#B88D2A;color:#000;text-decoration:none;border-radius:8px;font-weight:700;font-family:Arial;">
                Open Student Portal →
              </a>
              <hr style="border-color:#2e2e2e;margin:24px 0;">
              <p style="color:#555;font-size:11px;margin:0;">
                Celcium360 Solutions Limited ·
                <a href="mailto:training@celcium360solutions.com" style="color:#B88D2A;">training@celcium360solutions.com</a>
              </p>
            </div>`
          );
        }
        console.log(`[Publish] Emails sent to ${students.length} students`);
      } catch (emailErr) {
        console.error('[Publish email error]', emailErr.message);
      }
    }

    res.json({
      message:     `Week ${weekNumber} ${publish ? 'published' : 'unpublished'} successfully`,
      isPublished: week.isPublished,
      publishedAt: week.publishedAt,
      weekNumber,
    });
  } catch (err) {
    console.error('[setPublishStatus]', err.message);
    res.status(500).json({ message: err.message || 'Failed to update publish status' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  DELETE — reset a week (remove from DB, student sees "coming soon")
// ══════════════════════════════════════════════════════════════════════════

exports.deleteWeek = async (req, res) => {
  try {
    const weekNumber = parseWeekParam(req.params.week);
    if (!weekNumber) return res.status(400).json({ message: 'Invalid week number (1–6)' });

    const deleted = await CourseworkQuestion.findOneAndDelete({ weekNumber });

    if (!deleted) {
      return res.status(404).json({ message: `Week ${weekNumber} not found in database` });
    }

    console.log(`[CourseworkQ] Week ${weekNumber} reset/deleted`);
    res.json({
      message: `Week ${weekNumber} questions reset. Students will see "Coming Soon" until re-published.`,
    });
  } catch (err) {
    console.error('[deleteWeek]', err.message);
    res.status(500).json({ message: 'Failed to reset week' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET STUDENT PROGRESS — called by student dashboard on every load
// ══════════════════════════════════════════════════════════════════════════

exports.getStudentProgress = async (req, res) => {
  try {
    const { registrationId } = req.params;

    // All weeks admin has published
    const publishedWeeks = await CourseworkQuestion
      .find({ isPublished: true })
      .select('weekNumber publishedAt')
      .lean();

    // This student's progress record
    const progressDoc = await StudentProgress.findOne({ registrationId }).lean();

    // Convert Mongoose Map → plain object { "1": {...}, "2": {...} }
    const weekProgress = {};
    if (progressDoc?.weekProgress) {
      for (const [key, val] of Object.entries(progressDoc.weekProgress)) {
        weekProgress[key] = val;
      }
    }

    res.json({
      publishedWeeks: publishedWeeks.map(w => ({
        weekId:  w.weekNumber,
        dueDate: w.publishedAt || null,
      })),
      weekProgress,
      finalExam: progressDoc?.finalExam || {
        submitted: false, score: null, feedback: null, graded: false,
      },
    });
  } catch (err) {
    console.error('[getStudentProgress]', err.message);
    res.status(500).json({ message: 'Failed to load progress.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  SUBMIT COURSEWORK — student submits answers for a week
// ══════════════════════════════════════════════════════════════════════════

exports.submitCoursework = async (req, res) => {
  const { registrationId, weekId, answers } = req.body;

  if (!registrationId || !weekId || !answers?.length) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    await StudentProgress.findOneAndUpdate(
      { registrationId },
      {
        $set: {
          [`weekProgress.${weekId}`]: {
            submitted:   true,
            score:       null,
            feedback:    null,
            graded:      false,
            submittedAt: new Date(),
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
//  SUBMIT FINAL EXAM — student submits final exam answers
// ══════════════════════════════════════════════════════════════════════════

exports.submitFinalExam = async (req, res) => {
  const { registrationId, answers } = req.body;

  if (!registrationId || !answers?.length) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    await StudentProgress.findOneAndUpdate(
      { registrationId },
      {
        $set: {
          finalExam: {
            submitted:   true,
            score:       null,
            feedback:    null,
            graded:      false,
            submittedAt: new Date(),
          },
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