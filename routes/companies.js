// Company routes: list, add, edit, delete, activate/deactivate
const express = require('express');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { fail, isText, isOptionalText, isEmail } = require('../utils/validate');

// Checks the company form fields. Returns an error message, or '' when everything is fine.
function checkCompany(b) {
  if (!isText(b.name, 150)) return 'Company name is required (maximum 150 characters).';
  if (!isText(b.description, 2000)) return 'Company description is required.';
  if (!isOptionalText(b.website, 255)) return 'Website is too long.';
  if (b.contact_email && !isEmail(b.contact_email)) return 'Enter a valid contact email.';
  if (!isOptionalText(b.contact_phone, 50)) return 'Contact phone is too long.';
  return '';
}

const router = express.Router();
router.use(verifyToken);

// List companies (students see only active ones)
router.get('/', async (req, res) => {
  let sql = 'SELECT * FROM companies';
  if (req.user.role === 'student') sql += ' WHERE is_active = 1';
  sql += ' ORDER BY name';
  const [companies] = await db.query(sql);
  res.json({ success: true, companies });
});

// Add company
router.post('/', requireRole('officer'), async (req, res) => {
  const { name, description, website, contact_email, contact_phone } = req.body;
  const problem = checkCompany(req.body);
  if (problem) return fail(res, problem);
  const [exists] = await db.query('SELECT id FROM companies WHERE name = ?', [name.trim()]);
  if (exists.length > 0) {
    return res.status(409).json({ success: false, message: 'A company with this name already exists.' });
  }
  await db.query(
    'INSERT INTO companies (name, description, website, contact_email, contact_phone, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [name.trim(), description.trim(), website || null, contact_email || null, contact_phone || null, req.user.id]);
  res.status(201).json({ success: true, message: 'Company added successfully.' });
});

// Edit company
router.put('/:id', requireRole('officer'), async (req, res) => {
  const { name, description, website, contact_email, contact_phone } = req.body;
  const problem = checkCompany(req.body);
  if (problem) return fail(res, problem);
  const [same] = await db.query('SELECT id FROM companies WHERE name = ? AND id <> ?', [name.trim(), req.params.id]);
  if (same.length > 0) {
    return res.status(409).json({ success: false, message: 'Another company already has this name.' });
  }
  const [result] = await db.query(
    'UPDATE companies SET name = ?, description = ?, website = ?, contact_email = ?, contact_phone = ? WHERE id = ?',
    [name.trim(), description.trim(), website || null, contact_email || null, contact_phone || null, req.params.id]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, message: 'Company not found.' });
  }
  res.json({ success: true, message: 'Company updated successfully.' });
});

// Delete company (not allowed if it already has placement drives - history must be kept)
router.delete('/:id', requireRole('officer'), async (req, res) => {
  const [[count]] = await db.query('SELECT COUNT(*) AS n FROM placement_drives WHERE company_id = ?', [req.params.id]);
  if (count.n > 0) {
    return res.status(400).json({ success: false, message: `Cannot delete: this company has ${count.n} placement drive(s). Use Deactivate instead.` });
  }
  const [result] = await db.query('DELETE FROM companies WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, message: 'Company not found.' });
  }
  res.json({ success: true, message: 'Company deleted.' });
});

// Activate / deactivate
router.patch('/:id/status', requireRole('officer'), async (req, res) => {
  const active = req.body.is_active ? 1 : 0;
  const [result] = await db.query('UPDATE companies SET is_active = ? WHERE id = ?', [active, req.params.id]);
  if (result.affectedRows === 0) return fail(res, 'Company not found.', 404);
  res.json({ success: true, message: active ? 'Company activated.' : 'Company deactivated.' });
});

module.exports = router;
