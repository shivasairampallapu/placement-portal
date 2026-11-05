// Final result routes (officer only)
const express = require('express');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { notifyMany } = require('../utils/helpers');
const { fail, isOptionalText, isNumberBetween } = require('../utils/validate');

const router = express.Router();
router.use(verifyToken, requireRole('officer'));

// Shortlisted students of a drive with their final decision
router.get('/drive/:driveId', async (req, res) => {
  const [drives] = await db.query(
    `SELECT d.id, d.job_title, d.package_lpa, d.results_published, c.name AS company_name
     FROM placement_drives d JOIN companies c ON c.id = d.company_id WHERE d.id = ?`, [req.params.driveId]);
  if (drives.length === 0) return res.status(404).json({ success: false, message: 'Drive not found.' });

  const [results] = await db.query(
    `SELECT a.id AS application_id, u.full_name AS student_name, p.roll_number, p.department, p.cgpa,
            a.final_result, a.offered_package_lpa, a.offer_details
     FROM shortlists s JOIN applications a ON a.id = s.application_id
     JOIN users u ON u.id = a.student_user_id JOIN student_profiles p ON p.user_id = a.student_user_id
     WHERE s.drive_id = ? AND s.selection_status <> 'Rejected' ORDER BY s.rank_position`, [req.params.driveId]);
  res.json({ success: true, drive: drives[0], results });
});

// Save one student's final decision.
// Being shortlisted does NOT select a student automatically - the officer must do it here.
router.post('/', async (req, res) => {
  const { application_id, final_result, offered_package_lpa, offer_details } = req.body;
  if (!application_id || !Number.isInteger(Number(application_id))) {
    return fail(res, 'A valid application ID is required.');
  }
  if (!['Pending', 'Selected', 'Rejected'].includes(final_result)) {
    return res.status(400).json({ success: false, message: 'Invalid final decision.' });
  }
  if (!isOptionalText(offer_details, 255)) return fail(res, 'Offer details are too long (maximum 255 characters).');
  const [rows] = await db.query(
    `SELECT a.id, a.drive_id, d.results_published FROM applications a
     JOIN placement_drives d ON d.id = a.drive_id WHERE a.id = ?`, [application_id]);
  if (rows.length === 0) return res.status(404).json({ success: false, message: 'Application not found.' });

  const [inList] = await db.query(
    "SELECT id FROM shortlists WHERE application_id = ? AND selection_status <> 'Rejected'", [application_id]);
  if (inList.length === 0) {
    return res.status(400).json({ success: false, message: 'Only shortlisted students can be given a final decision.' });
  }
  if (final_result === 'Selected') {
    // a student who failed or missed a round cannot be selected
    const [failed] = await db.query(
      "SELECT id FROM round_results WHERE application_id = ? AND status IN ('Not Qualified', 'Absent')", [application_id]);
    if (failed.length > 0) {
      return res.status(400).json({ success: false, message: 'Cannot select: this student was Not Qualified or Absent in a round.' });
    }
    if (!isNumberBetween(offered_package_lpa, 0.01, 9999)) {
      return fail(res, 'Enter the offered package (LPA) as a number greater than 0.');
    }
  }

  // If the drive's results are already published, this change is visible immediately
  await db.query(
    `UPDATE applications SET status = IF(? = 'Selected', 'Selected', status), final_result = ?, offered_package_lpa = ?, offer_details = ?, result_published = ?, updated_by = ?
     WHERE id = ?`,
    [final_result, final_result, final_result === 'Selected' ? Number(offered_package_lpa) : null, offer_details || null,
     rows[0].results_published, req.user.id, application_id]);
  res.json({ success: true, message: 'Final decision saved.' + (rows[0].results_published ? '' : ' (Hidden until you publish final results)') });
});

// Publish / hide final results of a drive
router.patch('/drive/:driveId/publish', async (req, res) => {
  const publish = req.body.results_published ? 1 : 0;
  const [drives] = await db.query(
    `SELECT d.job_title, c.name FROM placement_drives d JOIN companies c ON c.id = d.company_id WHERE d.id = ?`, [req.params.driveId]);
  if (drives.length === 0) return res.status(404).json({ success: false, message: 'Drive not found.' });

  await db.query('UPDATE placement_drives SET results_published = ? WHERE id = ?', [publish, req.params.driveId]);
  await db.query('UPDATE applications SET result_published = ? WHERE drive_id = ?', [publish, req.params.driveId]);

  if (publish) {
    const [decided] = await db.query(
      "SELECT student_user_id, final_result FROM applications WHERE drive_id = ? AND final_result <> 'Pending'", [req.params.driveId]);
    const selected = decided.filter(a => a.final_result === 'Selected').map(a => a.student_user_id);
    const rejected = decided.filter(a => a.final_result === 'Rejected').map(a => a.student_user_id);
    await notifyMany(selected, 'Congratulations! You are selected',
      `You are selected by ${drives[0].name} for ${drives[0].job_title}. See My Applications for offer details.`, 'result');
    await notifyMany(rejected, 'Final result published',
      `The final result for ${drives[0].name} - ${drives[0].job_title} is published. Check My Applications.`, 'result');
  }
  res.json({ success: true, message: publish ? 'Final results published. Students were notified.' : 'Final results hidden.' });
});

module.exports = router;
