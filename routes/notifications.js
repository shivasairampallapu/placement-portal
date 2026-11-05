// Notification routes
const express = require('express');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { notifyMany } = require('../utils/helpers');
const { fail, isText } = require('../utils/validate');

const router = express.Router();
router.use(verifyToken);

// My notifications
router.get('/', async (req, res) => {
  const [notifications] = await db.query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100', [req.user.id]);
  const [[unread]] = await db.query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id]);
  res.json({ success: true, notifications, unread_count: unread.n });
});

// (this route must be above "/:id/read")
router.patch('/read-all', async (req, res) => {
  await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ success: true, message: 'All marked as read.' });
});

router.patch('/:id/read', async (req, res) => {
  await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ success: true });
});

// Officer sends an announcement to all students, or only to applicants of one drive
router.post('/send', requireRole('officer'), async (req, res) => {
  const { title, message, drive_id } = req.body;
  if (!isText(title, 150) || !isText(message, 2000)) {
    return fail(res, 'Title (maximum 150 characters) and message (maximum 2000 characters) are required.');
  }
  let rows;
  if (drive_id) {
    [rows] = await db.query('SELECT DISTINCT student_user_id AS id FROM applications WHERE drive_id = ?', [drive_id]);
  } else {
    [rows] = await db.query("SELECT id FROM users WHERE role = 'student' AND is_active = 1");
  }
  if (rows.length === 0) {
    return res.status(400).json({ success: false, message: 'No students to notify for this selection.' });
  }
  await notifyMany(rows.map(r => r.id), title.trim(), message.trim(), 'announcement');
  res.json({ success: true, message: `Announcement sent to ${rows.length} student(s).` });
});

module.exports = router;
