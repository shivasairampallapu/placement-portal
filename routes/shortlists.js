// Shortlist routes (officer only): generate -> approve -> publish
const express = require('express');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { notifyMany } = require('../utils/helpers');
const { fail, isNumberBetween, isWholeNumberBetween } = require('../utils/validate');

const router = express.Router();
router.use(verifyToken, requireRole('officer'));

const RANKING_RULE = 'Ranking rule: higher CGPA first. If CGPA is equal, smaller roll number first.';

// ---------- Generate shortlist ----------
router.post('/generate', async (req, res) => {
  const { drive_id, min_cgpa_override, max_candidates } = req.body;
  if (!drive_id) return res.status(400).json({ success: false, message: 'Select a drive.' });

  const [drives] = await db.query('SELECT * FROM placement_drives WHERE id = ?', [drive_id]);
  if (drives.length === 0) return res.status(404).json({ success: false, message: 'Drive not found.' });
  const drive = drives[0];
  if (drive.shortlist_published) {
    return res.status(400).json({ success: false, message: 'Shortlist is already published. Unpublish it before regenerating.' });
  }

  let cutoff = drive.min_cgpa;
  if (min_cgpa_override !== undefined && min_cgpa_override !== '' && min_cgpa_override !== null) {
    if (!isNumberBetween(min_cgpa_override, 0, 10)) {
      return fail(res, 'Cutoff override must be a number between 0 and 10.');
    }
    cutoff = Number(min_cgpa_override);
  }

  if (max_candidates !== undefined && max_candidates !== '' && max_candidates !== null) {
    if (!isWholeNumberBetween(max_candidates, 1, 100000)) {
      return fail(res, 'Max candidates must be a positive integer.');
    }
  }

  // Only APPROVED applications can be shortlisted. The SQL sorts by CGPA (high to low), then roll number (low to high).
  let sql = `SELECT a.id AS application_id, a.student_user_id, p.cgpa, p.roll_number
             FROM applications a JOIN student_profiles p ON p.user_id = a.student_user_id
             WHERE a.drive_id = ? AND a.status = 'Approved' AND p.cgpa >= ?
             ORDER BY p.cgpa DESC, p.roll_number ASC`;
  const params = [drive_id, cutoff];
  if (max_candidates !== undefined && max_candidates !== '' && max_candidates !== null) {
    sql += ' LIMIT ?';
    params.push(Number(max_candidates));
  }
  const [candidates] = await db.query(sql, params);

  if (candidates.length === 0) {
    return res.status(400).json({ success: false, message: 'No approved applications meet the cutoff. Approve applications first.' });
  }

  // Delete the old list and insert the new one in one transaction (no duplicates are possible)
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM shortlists WHERE drive_id = ?', [drive_id]);
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      await conn.query(
        `INSERT INTO shortlists (drive_id, application_id, student_user_id, rank_position, cgpa_snapshot, roll_number_snapshot)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [drive_id, c.application_id, c.student_user_id, i + 1, c.cgpa, c.roll_number]);
    }
    await conn.query('UPDATE placement_drives SET shortlist_approved = 0 WHERE id = ?', [drive_id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  res.json({ success: true, message: `Shortlist generated with ${candidates.length} students. Please review and approve it.` });
});

// ---------- View shortlist of a drive ----------
router.get('/drive/:driveId', async (req, res) => {
  const [drives] = await db.query(
    `SELECT d.id, d.job_title, d.shortlist_approved, d.shortlist_published, c.name AS company_name
     FROM placement_drives d JOIN companies c ON c.id = d.company_id WHERE d.id = ?`, [req.params.driveId]);
  if (drives.length === 0) return res.status(404).json({ success: false, message: 'Drive not found.' });

  const [list] = await db.query(
    `SELECT s.id, s.application_id, s.rank_position, s.cgpa_snapshot AS cgpa, s.roll_number_snapshot AS roll_number,
            s.selection_status, u.full_name AS student_name, u.email AS student_email, p.department
     FROM shortlists s JOIN users u ON u.id = s.student_user_id
     JOIN student_profiles p ON p.user_id = s.student_user_id
     WHERE s.drive_id = ? ORDER BY s.rank_position`, [req.params.driveId]);
  res.json({ success: true, drive: drives[0], shortlist: list, ranking_rule: RANKING_RULE });
});

// ---------- Approve shortlist (must be done before publishing) ----------
router.patch('/drive/:driveId/approve', async (req, res) => {
  const [[count]] = await db.query('SELECT COUNT(*) AS n FROM shortlists WHERE drive_id = ?', [req.params.driveId]);
  if (count.n === 0) return res.status(400).json({ success: false, message: 'Generate a shortlist first.' });
  await db.query('UPDATE placement_drives SET shortlist_approved = 1 WHERE id = ?', [req.params.driveId]);
  res.json({ success: true, message: 'Shortlist approved. You can now publish it.' });
});

// ---------- Publish / unpublish shortlist ----------
router.patch('/drive/:driveId/publish', async (req, res) => {
  const publish = req.body.is_published ? 1 : 0;
  const [drives] = await db.query('SELECT * FROM placement_drives WHERE id = ?', [req.params.driveId]);
  if (drives.length === 0) return res.status(404).json({ success: false, message: 'Drive not found.' });

  // Rule: shortlist must be approved before publishing
  if (publish && !drives[0].shortlist_approved) {
    return res.status(400).json({ success: false, message: 'Approve the shortlist before publishing it.' });
  }
  await db.query('UPDATE placement_drives SET shortlist_published = ? WHERE id = ?', [publish, req.params.driveId]);
  await db.query('UPDATE shortlists SET is_published = ? WHERE drive_id = ?', [publish, req.params.driveId]);

  if (publish) {
    const [rows] = await db.query("SELECT student_user_id FROM shortlists WHERE drive_id = ? AND selection_status = 'Shortlisted'", [req.params.driveId]);
    await notifyMany(rows.map(r => r.student_user_id), 'Shortlist published',
      `Congratulations! You are shortlisted for ${drives[0].job_title}. Check My Applications for your rank.`, 'shortlist');
  }
  res.json({ success: true, message: publish ? 'Shortlist published. Shortlisted students were notified.' : 'Shortlist hidden from students.' });
});

// ---------- Change one student's shortlist status ----------
// "Selected" is NOT allowed here. Final selection is only done in Final Results.
router.patch('/:id/status', async (req, res) => {
  const status = req.body.selection_status;
  if (!['Shortlisted', 'Waitlisted', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be Shortlisted, Waitlisted or Rejected.' });
  }
  const [rows] = await db.query(
    'SELECT s.drive_id, d.shortlist_published FROM shortlists s JOIN placement_drives d ON d.id = s.drive_id WHERE s.id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ success: false, message: 'Entry not found.' });
  if (rows[0].shortlist_published) {
    return res.status(400).json({ success: false, message: 'Unpublish the shortlist before changing it.' });
  }
  await db.query('UPDATE shortlists SET selection_status = ? WHERE id = ?', [status, req.params.id]);
  await db.query('UPDATE placement_drives SET shortlist_approved = 0 WHERE id = ?', [rows[0].drive_id]);  // needs approval again
  res.json({ success: true, message: 'Updated. Please approve the shortlist again.' });
});

module.exports = router;
