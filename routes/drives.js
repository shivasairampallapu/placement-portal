// Placement drive routes
const express = require('express');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { DEFAULT_ROUNDS, checkApplyEligibility, isDeadlinePassed, toMysqlDateTime, notifyMany } = require('../utils/helpers');
const { fail, isText, isNumberBetween, isWholeNumberBetween, isDate, isDateTime } = require('../utils/validate');

const router = express.Router();
router.use(verifyToken);

// List drives.
//  - Officer: all drives.
//  - Student: only PUBLISHED drives, with eligibility result and applied status.
router.get('/', async (req, res) => {
  const [drives] = await db.query(
    `SELECT d.*, c.name AS company_name, c.description AS company_description, c.website AS company_website
     FROM placement_drives d JOIN companies c ON c.id = d.company_id
     ${req.user.role === 'student' ? 'WHERE d.is_published = 1' : ''}
     ORDER BY d.created_at DESC, d.id DESC`);

  if (req.user.role === 'officer') {
    return res.json({ success: true, drives });
  }

  const [profiles] = await db.query('SELECT * FROM student_profiles WHERE user_id = ?', [req.user.id]);
  const [myApps] = await db.query('SELECT drive_id, status FROM applications WHERE student_user_id = ?', [req.user.id]);

  for (const d of drives) {
    d.eligibility = checkApplyEligibility(profiles[0], d);
    const mine = myApps.find(a => a.drive_id === d.id);
    d.already_applied = !!mine;
    d.application_status = mine ? mine.status : null;
    // students never see result flags
    delete d.shortlist_published; delete d.results_published; delete d.shortlist_approved;
  }
  res.json({ success: true, drives });
});

// Create drive (+ 4 default rounds)
router.post('/', requireRole('officer'), async (req, res) => {
  const b = req.body;
  if (!b.company_id || !b.job_title || !b.job_description || b.package_lpa === undefined || !b.location ||
      !b.required_skills || !b.eligible_branches || !b.graduation_year || !b.application_deadline || !b.placement_date) {
    return res.status(400).json({ success: false, message: 'Please fill all required drive details.' });
  }

  // ---- check every field (so bad data gives a clear message, not a server crash) ----
  if (!isText(b.job_title, 150))        return fail(res, 'Job title is required (maximum 150 characters).');
  if (!isText(b.job_description, 5000)) return fail(res, 'Job description is required.');
  if (!isText(b.location, 150))         return fail(res, 'Location is required (maximum 150 characters).');
  if (!isText(b.required_skills, 2000)) return fail(res, 'Required skills are required.');
  if (!isText(b.eligible_branches, 255)) return fail(res, 'Eligible branches are required (use ALL for every branch).');
  if (!isNumberBetween(b.package_lpa, 0, 9999)) return fail(res, 'Package must be a number between 0 and 9999 LPA.');
  if (b.min_cgpa !== undefined && b.min_cgpa !== '' && !isNumberBetween(b.min_cgpa, 0, 10)) {
    return fail(res, 'Minimum CGPA must be between 0 and 10.');
  }
  if (!isWholeNumberBetween(b.graduation_year, 2000, 2100)) return fail(res, 'Enter a valid graduation year (for example 2027).');
  if (!isDateTime(b.application_deadline)) return fail(res, 'Enter a valid application deadline.');
  if (!isDate(b.placement_date))           return fail(res, 'Enter a valid placement date.');
  if (isDeadlinePassed(toMysqlDateTime(b.application_deadline))) {
    return fail(res, 'Application deadline must be in the future.');
  }
  if (b.placement_date < b.application_deadline.slice(0, 10)) {
    return fail(res, 'Placement date cannot be before the application deadline.');
  }
  const minCgpa = Number(b.min_cgpa || 0);
  const [companies] = await db.query('SELECT id FROM companies WHERE id = ? AND is_active = 1', [b.company_id]);
  if (companies.length === 0) {
    return res.status(400).json({ success: false, message: 'Selected company is not available.' });
  }

  const conn = await db.getConnection();
  let driveId;
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO placement_drives (company_id, job_title, job_description, package_lpa, location, required_skills,
         min_cgpa, eligible_branches, graduation_year, application_deadline, placement_date, is_published, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.company_id, b.job_title.trim(), b.job_description.trim(), Number(b.package_lpa), b.location.trim(),
       b.required_skills.trim(), minCgpa, b.eligible_branches.trim(), Number(b.graduation_year),
       toMysqlDateTime(b.application_deadline), b.placement_date, b.is_published ? 1 : 0, req.user.id]);
    driveId = result.insertId;

    // Add the 4 default rounds
    for (let i = 0; i < DEFAULT_ROUNDS.length; i++) {
      await conn.query('INSERT INTO placement_rounds (drive_id, round_name, round_order, description) VALUES (?, ?, ?, ?)',
        [driveId, DEFAULT_ROUNDS[i].name, i + 1, DEFAULT_ROUNDS[i].description]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  if (b.is_published) await notifyStudentsAboutDrive(driveId);

  res.status(201).json({ success: true, message: 'Drive created with 4 default rounds.', drive_id: driveId });
});

// Tell all students of the target batch that a drive is open
async function notifyStudentsAboutDrive(driveId) {
  const [[d]] = await db.query(
    `SELECT d.job_title, d.graduation_year, c.name FROM placement_drives d
     JOIN companies c ON c.id = d.company_id WHERE d.id = ?`, [driveId]);
  const [students] = await db.query('SELECT user_id FROM student_profiles WHERE graduation_year = ?', [d.graduation_year]);
  await notifyMany(students.map(s => s.user_id), 'New Drive: ' + d.name,
    `${d.name} is hiring for ${d.job_title}. Check the Placement Drives tab and apply before the deadline.`, 'drive');
}

// Publish / unpublish
router.patch('/:id/publish', requireRole('officer'), async (req, res) => {
  const publish = req.body.is_published ? 1 : 0;
  const [rows] = await db.query('SELECT is_published FROM placement_drives WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ success: false, message: 'Drive not found.' });

  await db.query('UPDATE placement_drives SET is_published = ? WHERE id = ?', [publish, req.params.id]);
  if (publish && !rows[0].is_published) await notifyStudentsAboutDrive(req.params.id);
  res.json({ success: true, message: publish ? 'Drive published. Students can now see it.' : 'Drive hidden from students.' });
});

// Open / close
router.patch('/:id/status', requireRole('officer'), async (req, res) => {
  const status = req.body.status;
  if (status !== 'open' && status !== 'closed') {
    return res.status(400).json({ success: false, message: 'Status must be open or closed.' });
  }
  const [result] = await db.query('UPDATE placement_drives SET status = ? WHERE id = ?', [status, req.params.id]);
  if (result.affectedRows === 0) return fail(res, 'Drive not found.', 404);
  res.json({ success: true, message: status === 'closed' ? 'Drive closed. No more applications.' : 'Drive reopened.' });
});

// Single drive details
router.get('/:id', async (req, res) => {
  const [rows] = await db.query(
    `SELECT d.*, c.name AS company_name, c.website AS company_website, c.description AS company_description
     FROM placement_drives d JOIN companies c ON c.id = d.company_id WHERE d.id = ?`, [req.params.id]);
  if (rows.length === 0) return fail(res, 'Drive not found.', 404);
  res.json({ success: true, drive: rows[0] });
});

// Edit drive details
router.put('/:id', requireRole('officer'), async (req, res) => {
  const b = req.body;
  if (!b.company_id || !b.job_title || !b.job_description || b.package_lpa === undefined || !b.location ||
      !b.required_skills || !b.eligible_branches || !b.graduation_year || !b.application_deadline || !b.placement_date) {
    return res.status(400).json({ success: false, message: 'Please fill all required drive details.' });
  }

  if (!isText(b.job_title, 150))        return fail(res, 'Job title is required (maximum 150 characters).');
  if (!isText(b.job_description, 5000)) return fail(res, 'Job description is required.');
  if (!isText(b.location, 150))         return fail(res, 'Location is required (maximum 150 characters).');
  if (!isText(b.required_skills, 2000)) return fail(res, 'Required skills are required.');
  if (!isText(b.eligible_branches, 255)) return fail(res, 'Eligible branches are required.');
  if (!isNumberBetween(b.package_lpa, 0, 9999)) return fail(res, 'Package must be a number between 0 and 9999 LPA.');
  if (b.min_cgpa !== undefined && b.min_cgpa !== '' && !isNumberBetween(b.min_cgpa, 0, 10)) {
    return fail(res, 'Minimum CGPA must be between 0 and 10.');
  }
  if (!isWholeNumberBetween(b.graduation_year, 2000, 2100)) return fail(res, 'Enter a valid graduation year.');
  if (!isDateTime(b.application_deadline)) return fail(res, 'Enter a valid application deadline.');
  if (!isDate(b.placement_date))           return fail(res, 'Enter a valid placement date.');
  if (b.placement_date < b.application_deadline.slice(0, 10)) {
    return fail(res, 'Placement date cannot be before the application deadline.');
  }

  const [companies] = await db.query('SELECT id FROM companies WHERE id = ? AND is_active = 1', [b.company_id]);
  if (companies.length === 0) {
    return res.status(400).json({ success: false, message: 'Selected company is not available.' });
  }

  const minCgpa = Number(b.min_cgpa || 0);
  const [result] = await db.query(
    `UPDATE placement_drives SET company_id = ?, job_title = ?, job_description = ?, package_lpa = ?,
       location = ?, required_skills = ?, min_cgpa = ?, eligible_branches = ?, graduation_year = ?,
       application_deadline = ?, placement_date = ?, is_published = ?
     WHERE id = ?`,
    [b.company_id, b.job_title.trim(), b.job_description.trim(), Number(b.package_lpa), b.location.trim(),
     b.required_skills.trim(), minCgpa, b.eligible_branches.trim(), Number(b.graduation_year),
     toMysqlDateTime(b.application_deadline), b.placement_date, b.is_published ? 1 : 0, req.params.id]);

  if (result.affectedRows === 0) return fail(res, 'Drive not found.', 404);
  res.json({ success: true, message: 'Placement drive updated successfully.' });
});

// Delete drive (only if no student applications exist)
router.delete('/:id', requireRole('officer'), async (req, res) => {
  const [[appCount]] = await db.query('SELECT COUNT(*) AS n FROM applications WHERE drive_id = ?', [req.params.id]);
  if (appCount.n > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete: drive has ${appCount.n} application(s). Close or unpublish the drive instead.`
    });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM placement_rounds WHERE drive_id = ?', [req.params.id]);
    const [result] = await conn.query('DELETE FROM placement_drives WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      await conn.rollback();
      return fail(res, 'Drive not found.', 404);
    }
    await conn.commit();
    res.json({ success: true, message: 'Placement drive deleted.' });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

module.exports = router;
