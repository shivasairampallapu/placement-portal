// Small helper functions used by many routes.
const db = require('../config/db');

const DEFAULT_ROUNDS = [
  { name: 'Online Assessment', description: 'Aptitude, reasoning and coding test' },
  { name: 'Technical Interview', description: 'Data structures, core subjects and projects' },
  { name: 'HR Interview', description: 'Communication skills and behaviour' },
  { name: 'Final Selection', description: 'Final decision and offer' }
];

// Branch names are compared in UPPERCASE without spaces. "ALL" means every branch.
function cleanText(text) {
  return String(text || '').toUpperCase().replace(/\s+/g, '');
}

// Has the application deadline passed?  (deadline looks like "2026-11-10 17:30:00")
function isDeadlinePassed(deadline) {
  return new Date(String(deadline).replace(' ', 'T')) < new Date();
}

// Academic eligibility: CGPA, batch and branch (does not look at deadline)
function checkAcademicEligibility(student, drive) {
  if (!student) {
    return { eligible: false, reason: 'Student profile not found' };
  }
  if (Number(student.cgpa) < Number(drive.min_cgpa)) {
    return { eligible: false, reason: `CGPA ${student.cgpa} is below the required ${drive.min_cgpa}` };
  }
  if (Number(student.graduation_year) !== Number(drive.graduation_year)) {
    return { eligible: false, reason: `Drive is for the ${drive.graduation_year} batch` };
  }
  const branches = drive.eligible_branches.split(',').map(cleanText);
  if (!branches.includes('ALL') && !branches.includes(cleanText(student.department))) {
    return { eligible: false, reason: `Branch ${student.department} is not allowed` };
  }
  return { eligible: true, reason: 'You meet all criteria' };
}

// Full eligibility to APPLY = academic rules + drive must be published, open and before deadline
function checkApplyEligibility(student, drive) {
  if (!drive.is_published) return { eligible: false, reason: 'Drive is not published' };
  if (drive.status !== 'open') return { eligible: false, reason: 'Drive is closed' };
  if (isDeadlinePassed(drive.application_deadline)) return { eligible: false, reason: 'Application deadline has passed' };
  return checkAcademicEligibility(student, drive);
}

// Convert "2026-11-10T17:30" (from the browser) to "2026-11-10 17:30:00" (MySQL)
function toMysqlDateTime(text) {
  let t = String(text).replace('T', ' ');
  if (t.length === 16) t += ':00';
  return t;
}

// Add one notification
async function notify(userId, title, message, type) {
  await db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
    [userId, title, message, type || 'info']);
}

// Add the same notification for many users (array of user ids)
async function notifyMany(userIds, title, message, type) {
  if (userIds.length === 0) return;
  const rows = userIds.map(id => [id, title, message, type || 'info']);
  await db.query('INSERT INTO notifications (user_id, title, message, type) VALUES ?', [rows]);
}

module.exports = {
  DEFAULT_ROUNDS, checkAcademicEligibility, checkApplyEligibility,
  isDeadlinePassed, toMysqlDateTime, notify, notifyMany
};
