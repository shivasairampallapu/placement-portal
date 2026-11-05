// Application routes: student applies, officer reviews
const express = require('express');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { checkApplyEligibility, checkAcademicEligibility, notify } = require('../utils/helpers');
const { fail, isOptionalText } = require('../utils/validate');

const router = express.Router();
router.use(verifyToken);

// ---------- STUDENT: apply for a drive ----------
router.post('/', requireRole('student'), async (req, res) => {
  const driveId = req.body.drive_id;
  if (!driveId) return res.status(400).json({ success: false, message: 'Drive is required.' });

  const [drives] = await db.query(
    `SELECT d.*, c.is_active AS company_active FROM placement_drives d
     JOIN companies c ON c.id = d.company_id WHERE d.id = ?`, [driveId]);
  if (drives.length === 0 || !drives[0].is_published) {
    return res.status(404).json({ success: false, message: 'Drive not found.' });
  }
  if (!drives[0].company_active) {
    return res.status(400).json({ success: false, message: 'This recruiting partner is currently inactive.' });
  }
  const [profiles] = await db.query('SELECT * FROM student_profiles WHERE user_id = ?', [req.user.id]);

  // Eligibility is ALWAYS checked here on the server (deadline, open/closed, CGPA, batch, branch)
  const elig = checkApplyEligibility(profiles[0], drives[0]);
  if (!elig.eligible) {
    return res.status(400).json({ success: false, message: 'You cannot apply: ' + elig.reason + '.' });
  }

  // No duplicate applications
  const [already] = await db.query('SELECT id FROM applications WHERE drive_id = ? AND student_user_id = ?', [driveId, req.user.id]);
  if (already.length > 0) {
    return res.status(409).json({ success: false, message: 'You have already applied for this drive.' });
  }

  await db.query('INSERT INTO applications (drive_id, student_user_id) VALUES (?, ?)', [driveId, req.user.id]);
  await notify(req.user.id, 'Application submitted', `Your application for ${drives[0].job_title} was submitted. The placement officer will review it.`, 'application');
  res.status(201).json({ success: true, message: 'Application submitted successfully!' });
});

// ---------- STUDENT: my applications ----------
// Shortlists, round results and final results are shown ONLY after the officer publishes them.
router.get('/my', requireRole('student'), async (req, res) => {
  const [apps] = await db.query(
    `SELECT a.id, a.status, a.officer_remarks, a.final_result, a.offered_package_lpa, a.offer_details,
            a.result_published, a.applied_at, d.id AS drive_id, d.job_title, d.package_lpa,
            d.shortlist_published, d.results_published, c.name AS company_name
     FROM applications a
     JOIN placement_drives d ON d.id = a.drive_id
     JOIN companies c ON c.id = d.company_id
     WHERE a.student_user_id = ? ORDER BY a.applied_at DESC, a.id DESC`, [req.user.id]);

  const result = [];
  for (const a of apps) {
    const item = {
      id: a.id, drive_id: a.drive_id, job_title: a.job_title, company_name: a.company_name, package_lpa: a.package_lpa,
      status: a.status, officer_remarks: a.officer_remarks, applied_at: a.applied_at,
      shortlist_info: null, round_results: [], final_result: null,
      offered_package_lpa: null, offer_details: null, result_published: 0
    };

    // published shortlist only
    if (a.shortlist_published) {
      const [sl] = await db.query('SELECT rank_position, selection_status FROM shortlists WHERE application_id = ?', [a.id]);
      if (sl.length > 0) {
        item.shortlist_info = sl[0];
        if (['Shortlisted', 'Waitlisted'].includes(sl[0].selection_status)) {
          item.status = sl[0].selection_status;
        }
      }
    }
    // published round results only
    const [rounds] = await db.query(
      `SELECT r.round_name, rr.status, rr.score, rr.feedback FROM round_results rr
       JOIN placement_rounds r ON r.id = rr.round_id
       WHERE rr.application_id = ? AND rr.is_published = 1 ORDER BY r.round_order`, [a.id]);
    item.round_results = rounds;

    // published final result only
    if (a.result_published && a.results_published) {
      item.result_published = 1;
      item.final_result = a.final_result;
      item.offered_package_lpa = a.offered_package_lpa;
      item.offer_details = a.offer_details;
      if (a.final_result === 'Selected') item.status = 'Selected';
    }
    result.push(item);
  }
  res.json({ success: true, applications: result });
});

// ---------- OFFICER: list applications (filters: drive_id, status) ----------
router.get('/', requireRole('officer'), async (req, res) => {
  let sql = `SELECT a.id, a.drive_id, a.status, a.officer_remarks, a.applied_at,
                    u.full_name AS student_name, u.email AS student_email,
                    p.roll_number, p.department, p.cgpa, p.graduation_year,
                    d.job_title, d.min_cgpa, d.eligible_branches, d.graduation_year AS drive_year, c.name AS company_name
             FROM applications a
             JOIN users u ON u.id = a.student_user_id
             JOIN student_profiles p ON p.user_id = u.id
             JOIN placement_drives d ON d.id = a.drive_id
             JOIN companies c ON c.id = d.company_id WHERE 1 = 1`;
  const params = [];
  if (req.query.drive_id) { sql += ' AND a.drive_id = ?'; params.push(req.query.drive_id); }
  const allowedStatuses = ['Applied', 'Under Review', 'Approved', 'Shortlisted', 'Selected', 'Rejected', 'Not Eligible'];
  if (req.query.status) {
    if (!allowedStatuses.includes(req.query.status)) {
      return fail(res, 'Invalid status filter.');
    }
    sql += ' AND a.status = ?';
    params.push(req.query.status);
  }
  sql += ' ORDER BY p.cgpa DESC, p.roll_number ASC';

  const [apps] = await db.query(sql, params);
  // "Verify eligibility": check each student against the drive rules
  for (const a of apps) {
    a.academic_eligibility = checkAcademicEligibility(
      { cgpa: a.cgpa, graduation_year: a.graduation_year, department: a.department },
      { min_cgpa: a.min_cgpa, graduation_year: a.drive_year, eligible_branches: a.eligible_branches });
  }
  res.json({ success: true, applications: apps });
});

// ---------- OFFICER: approve / reject / review ----------
router.patch('/:id/status', requireRole('officer'), async (req, res) => {
  const { status, officer_remarks } = req.body;
  const allowed = ['Applied', 'Under Review', 'Approved', 'Rejected', 'Not Eligible'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }
  if (!isOptionalText(officer_remarks, 2000)) return fail(res, 'Remarks are too long (maximum 2000 characters).');

  const [rows] = await db.query(
    `SELECT a.*, p.cgpa, p.graduation_year, p.department, d.min_cgpa, d.eligible_branches,
            d.graduation_year AS drive_year, d.job_title
     FROM applications a JOIN student_profiles p ON p.user_id = a.student_user_id
     JOIN placement_drives d ON d.id = a.drive_id WHERE a.id = ?`, [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ success: false, message: 'Application not found.' });
  const app = rows[0];

  // Cannot approve a student who does not meet the drive rules
  if (status === 'Approved') {
    const elig = checkAcademicEligibility(
      { cgpa: app.cgpa, graduation_year: app.graduation_year, department: app.department },
      { min_cgpa: app.min_cgpa, graduation_year: app.drive_year, eligible_branches: app.eligible_branches });
    if (!elig.eligible) {
      return res.status(400).json({ success: false, message: 'Cannot approve: ' + elig.reason + '.' });
    }
  }
  // If the student is already in a shortlist, do not change the approval silently
  if (status !== 'Approved') {
    const [inList] = await db.query('SELECT id FROM shortlists WHERE application_id = ?', [app.id]);
    if (inList.length > 0) {
      return res.status(400).json({ success: false, message: 'This student is in a shortlist. Regenerate the shortlist first.' });
    }
  }

  await db.query('UPDATE applications SET status = ?, officer_remarks = ?, updated_by = ? WHERE id = ?',
    [status, officer_remarks || null, req.user.id, app.id]);
  if (status === 'Approved' || status === 'Rejected' || status === 'Not Eligible') {
    await notify(app.student_user_id, 'Application ' + status,
      `Your application for ${app.job_title} is now: ${status}.` + (officer_remarks ? ' Remarks: ' + officer_remarks : ''), 'application');
  }
  res.json({ success: true, message: 'Application marked as ' + status + '.' });
});

// ---------- OFFICER: Bulk Approve All Eligible Applications for a Drive ----------
router.post('/bulk-approve', requireRole('officer'), async (req, res) => {
  const { drive_id } = req.body;
  if (!drive_id) return fail(res, 'Drive ID is required.');

  const [drives] = await db.query('SELECT * FROM placement_drives WHERE id = ?', [drive_id]);
  if (drives.length === 0) return fail(res, 'Drive not found.', 404);
  const drive = drives[0];

  const [apps] = await db.query(`
    SELECT a.id, a.student_user_id, p.cgpa, p.graduation_year, p.department
    FROM applications a
    JOIN student_profiles p ON p.user_id = a.student_user_id
    WHERE a.drive_id = ? AND a.status IN ('Applied', 'Under Review')
  `, [drive_id]);

  let approvedCount = 0;
  const approvedUserIds = [];

  for (const app of apps) {
    const elig = checkAcademicEligibility(
      { cgpa: app.cgpa, graduation_year: app.graduation_year, department: app.department },
      { min_cgpa: drive.min_cgpa, graduation_year: drive.graduation_year, eligible_branches: drive.eligible_branches }
    );
    if (elig.eligible) {
      await db.query(
        "UPDATE applications SET status = 'Approved', officer_remarks = 'Automated eligibility verified. Approved for rounds.', updated_by = ? WHERE id = ?",
        [req.user.id, app.id]
      );
      approvedCount++;
      approvedUserIds.push(app.student_user_id);
    }
  }

  if (approvedUserIds.length > 0) {
    const { notifyMany } = require('../utils/helpers');
    await notifyMany(
      approvedUserIds,
      'Application Approved: ' + drive.job_title,
      `Your application for ${drive.job_title} has been verified and approved for placement rounds.`,
      'application'
    );
  }

  res.json({
    success: true,
    message: `Batch verification complete: ${approvedCount} eligible application(s) approved.`,
    approved_count: approvedCount
  });
});

// ---------- STUDENT: Withdraw Application (only if still 'Applied') ----------
router.delete('/:id', requireRole('student'), async (req, res) => {
  const [apps] = await db.query(
    'SELECT a.id, a.status, d.job_title, d.application_deadline, d.status AS drive_status FROM applications a JOIN placement_drives d ON d.id = a.drive_id WHERE a.id = ? AND a.student_user_id = ?',
    [req.params.id, req.user.id]
  );
  if (apps.length === 0) return fail(res, 'Application not found.', 404);
  const app = apps[0];

  if (app.status !== 'Applied') {
    return fail(res, `Cannot withdraw: application is already marked as ${app.status}.`);
  }

  await db.query('DELETE FROM applications WHERE id = ?', [app.id]);
  await notify(req.user.id, 'Application Withdrawn', `You have withdrawn your application for ${app.job_title}.`, 'application');
  res.json({ success: true, message: 'Application withdrawn successfully.' });
});

module.exports = router;
