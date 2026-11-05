// Placement round routes (officer only): list, add custom round, edit, enter results, publish results
const express = require('express');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { notifyMany } = require('../utils/helpers');
const { fail, isText, isOptionalText, isNumberBetween } = require('../utils/validate');

const router = express.Router();
router.use(verifyToken, requireRole('officer'));

// Rounds of a drive + all saved results
router.get('/drive/:driveId', async (req, res) => {
  const [rounds] = await db.query('SELECT * FROM placement_rounds WHERE drive_id = ? ORDER BY round_order', [req.params.driveId]);
  const [results] = await db.query(
    'SELECT round_id, application_id, status, score, feedback, is_published FROM round_results WHERE drive_id = ?', [req.params.driveId]);
  res.json({ success: true, rounds, results });
});

// Add a custom round (it is placed before "Final Selection", so Final Selection stays last)
router.post('/', async (req, res) => {
  const { drive_id, round_name, description } = req.body;
  if (!drive_id || !isText(round_name, 120)) {
    return fail(res, 'Drive and round name are required (round name maximum 120 characters).');
  }
  if (!isOptionalText(description, 255)) return fail(res, 'Description is too long (maximum 255 characters).');
  const [driveRows] = await db.query('SELECT id FROM placement_drives WHERE id = ?', [drive_id]);
  if (driveRows.length === 0) return fail(res, 'Drive not found.', 404);
  const [rounds] = await db.query('SELECT * FROM placement_rounds WHERE drive_id = ? ORDER BY round_order', [drive_id]);
  if (rounds.some(r => r.round_name.toLowerCase() === round_name.trim().toLowerCase())) {
    return res.status(409).json({ success: false, message: 'This drive already has a round with that name.' });
  }

  let newOrder = rounds.length + 1;
  const last = rounds[rounds.length - 1];

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (last && last.round_name === 'Final Selection') {
      // move Final Selection one step down, put the new round in its old place
      newOrder = last.round_order;
      await conn.query('UPDATE placement_rounds SET round_order = ? WHERE id = ?', [last.round_order + 1, last.id]);
    }
    await conn.query('INSERT INTO placement_rounds (drive_id, round_name, round_order, description) VALUES (?, ?, ?, ?)',
      [drive_id, round_name.trim(), newOrder, description || null]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  res.status(201).json({ success: true, message: 'Round added.' });
});

// Edit a round (name, description, active / inactive)
router.put('/:roundId', async (req, res) => {
  const { round_name, description, is_active } = req.body;
  if (!isText(round_name, 120)) return fail(res, 'Round name is required (maximum 120 characters).');
  if (!isOptionalText(description, 255)) return fail(res, 'Description is too long (maximum 255 characters).');
  const [result] = await db.query(
    'UPDATE placement_rounds SET round_name = ?, description = ?, is_active = ? WHERE id = ?',
    [round_name.trim(), description || null, is_active ? 1 : 0, req.params.roundId]);
  if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Round not found.' });
  res.json({ success: true, message: 'Round updated.' });
});

// Save one student's result for a round
router.post('/:roundId/results', async (req, res) => {
  const { application_id, status, score, feedback } = req.body;
  if (!application_id || !Number.isInteger(Number(application_id))) {
    return fail(res, 'A valid application ID is required.');
  }
  if (!['Pending', 'Qualified', 'Not Qualified', 'Absent'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid result status.' });
  }
  if (score !== null && score !== undefined && score !== '' && !isNumberBetween(score, 0, 9999)) {
    return fail(res, 'Score must be a number between 0 and 9999.');
  }
  if (!isOptionalText(feedback, 255)) return fail(res, 'Feedback is too long (maximum 255 characters).');
  const [rounds] = await db.query('SELECT * FROM placement_rounds WHERE id = ?', [req.params.roundId]);
  if (rounds.length === 0) return res.status(404).json({ success: false, message: 'Round not found.' });
  const round = rounds[0];
  if (!round.is_active) return res.status(400).json({ success: false, message: 'This round is deactivated.' });

  // Disallow marking candidate as Not Qualified or Absent if they were already marked as Selected in final results
  if (['Not Qualified', 'Absent'].includes(status)) {
    const [alreadySelected] = await db.query(
      "SELECT id FROM applications WHERE id = ? AND final_result = 'Selected'", [application_id]);
    if (alreadySelected.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark candidate as Not Qualified or Absent while their Final Result is Selected. Please update their final result first.'
      });
    }
  }

  // The student must be in the shortlist of the same drive
  const [rows] = await db.query(
    `SELECT s.student_user_id FROM shortlists s WHERE s.application_id = ? AND s.drive_id = ? AND s.selection_status <> 'Rejected'`,
    [application_id, round.drive_id]);
  if (rows.length === 0) {
    return res.status(400).json({ success: false, message: 'Only shortlisted students of this drive can get round results.' });
  }

  // INSERT, or UPDATE if a result already exists. A new result follows the round's publish state.
  await db.query(
    `INSERT INTO round_results (round_id, drive_id, application_id, student_user_id, status, score, feedback, is_published, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), score = VALUES(score), feedback = VALUES(feedback),
       is_published = VALUES(is_published), updated_by = VALUES(updated_by)`,
    [round.id, round.drive_id, application_id, rows[0].student_user_id, status,
     score === null || score === undefined || score === '' ? null : Number(score), feedback || null, round.results_published, req.user.id]);
  res.json({ success: true, message: 'Round result saved.' + (round.results_published ? ' (Visible to the student)' : ' (Hidden until you publish)') });
});

// Publish / hide the results of a round
router.patch('/:roundId/publish-results', async (req, res) => {
  const publish = req.body.is_published ? 1 : 0;
  const [rounds] = await db.query(
    `SELECT r.*, d.job_title FROM placement_rounds r JOIN placement_drives d ON d.id = r.drive_id WHERE r.id = ?`, [req.params.roundId]);
  if (rounds.length === 0) return res.status(404).json({ success: false, message: 'Round not found.' });

  await db.query('UPDATE placement_rounds SET results_published = ? WHERE id = ?', [publish, req.params.roundId]);
  await db.query('UPDATE round_results SET is_published = ? WHERE round_id = ?', [publish, req.params.roundId]);

  if (publish) {
    const [rows] = await db.query('SELECT student_user_id FROM round_results WHERE round_id = ?', [req.params.roundId]);
    await notifyMany(rows.map(r => r.student_user_id), rounds[0].round_name + ' results published',
      `Results of "${rounds[0].round_name}" for ${rounds[0].job_title} are out. Check My Applications.`, 'result');
  }
  res.json({ success: true, message: publish ? 'Round results published. Students were notified.' : 'Round results hidden.' });
});

module.exports = router;
