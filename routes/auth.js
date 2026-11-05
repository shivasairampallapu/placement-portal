// Auth routes: register, login, me, logout, change-password, create-officer
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { fail, isText, isNumberBetween, isWholeNumberBetween, isEmail } = require('../utils/validate');

const router = express.Router();

// Create a JWT token that is valid for a few hours
function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
}

// Only send safe fields to the browser (never the password hash)
function safeUser(user) {
  return { id: user.id, full_name: user.full_name, email: user.email, role: user.role };
}

// ---------- Student registration ----------
router.post('/register', async (req, res) => {
  const { full_name, email, password, roll_number, department, graduation_year, cgpa, skills } = req.body;

  if (!isText(full_name, 120))  return fail(res, 'Enter your full name (maximum 120 characters).');
  if (!isEmail(email))          return fail(res, 'Enter a valid email address.');
  if (typeof password !== 'string' || password.length < 6 || password.length > 72) {
    return fail(res, 'Password must be 6 to 72 characters.');
  }
  if (!isText(roll_number, 50)) return fail(res, 'Enter your roll number.');
  if (!isText(department, 100)) return fail(res, 'Select your department.');
  if (!isWholeNumberBetween(graduation_year, 2000, 2100)) return fail(res, 'Enter a valid graduation year (for example 2027).');
  if (!isNumberBetween(cgpa, 0, 10)) return fail(res, 'CGPA must be a number between 0 and 10.');
  if (!isText(skills, 2000))    return fail(res, 'Enter your skills.');

  const cleanEmail = email.trim().toLowerCase();
  const cleanRoll = roll_number.trim().toUpperCase();

  // Email and roll number must be unique
  const [emailRows] = await db.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
  if (emailRows.length > 0) {
    return res.status(409).json({ success: false, message: 'This email is already registered.' });
  }
  const [rollRows] = await db.query('SELECT id FROM student_profiles WHERE roll_number = ?', [cleanRoll]);
  if (rollRows.length > 0) {
    return res.status(409).json({ success: false, message: 'This roll number is already registered.' });
  }

  const hash = await bcrypt.hash(password, 10);   // passwords are always stored hashed

  // Two INSERTs must succeed TOGETHER. If the second one fails, the first is undone (rollback),
  // so we never keep a half-created account.
  const conn = await db.getConnection();
  let newId;
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [full_name.trim(), cleanEmail, hash, 'student']);
    newId = result.insertId;
    await conn.query(
      `INSERT INTO student_profiles (user_id, roll_number, department, graduation_year, cgpa, skills)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newId, cleanRoll, department.trim(), Number(graduation_year), Number(cgpa), skills.trim()]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const user = { id: newId, full_name: full_name.trim(), email: cleanEmail, role: 'student' };
  res.status(201).json({ success: true, message: 'Registration successful! Welcome.', token: makeToken(user), user });
});

// ---------- Login (student or officer) ----------
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ success: false, message: 'Please enter email and password.' });
  }

  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  // Same message for wrong email and wrong password (safer)
  if (rows.length === 0) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }
  const user = rows[0];
  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }
  if (!user.is_active) {
    return res.status(403).json({ success: false, message: 'Your account is disabled. Contact the admin.' });
  }
  // The login page has "Student Login" and "Officer Login" buttons
  if (role && role !== user.role) {
    return res.status(403).json({ success: false, message: `This is a ${user.role} account. Please use the ${user.role === 'officer' ? 'Officer' : 'Student'} Login button.` });
  }

  res.json({ success: true, token: makeToken(user), user: safeUser(user) });
});

// ---------- Current user (used to keep the session after page refresh) ----------
router.get('/me', verifyToken, (req, res) => {
  res.json({ success: true, user: safeUser(req.user) });
});

// ---------- Logout (JWT is stateless, browser just deletes the token) ----------
router.post('/logout', verifyToken, (req, res) => {
  res.json({ success: true, message: 'Logged out.' });
});

// ---------- Change password (student or officer) ----------
router.post('/change-password', verifyToken, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (typeof current_password !== 'string' || typeof new_password !== 'string' || !current_password || !new_password) {
    return res.status(400).json({ success: false, message: 'Enter current and new password.' });
  }
  if (new_password.length < 6 || new_password.length > 72) {
    return res.status(400).json({ success: false, message: 'New password must be 6 to 72 characters.' });
  }
  if (new_password === current_password) {
    return res.status(400).json({ success: false, message: 'New password must be different from the current one.' });
  }

  const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  const ok = await bcrypt.compare(current_password, rows[0].password_hash);
  if (!ok) {
    return res.status(400).json({ success: false, message: 'Current password is wrong.' });
  }
  const hash = await bcrypt.hash(new_password, 10);
  await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
  res.json({ success: true, message: 'Password changed successfully.' });
});

// ---------- Officer creates another officer ----------
router.post('/create-officer', verifyToken, requireRole('officer'), async (req, res) => {
  const { full_name, email, password } = req.body;
  if (!isText(full_name, 120) || !isEmail(email) || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'Enter a valid name, email and password for the officer.' });
  }
  if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ success: false, message: 'Password must be 8-72 characters with letters and numbers.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
  if (exists.length > 0) {
    return res.status(409).json({ success: false, message: 'This email is already registered.' });
  }
  const hash = await bcrypt.hash(password, 10);
  await db.query('INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [full_name.trim(), cleanEmail, hash, 'officer']);
  res.status(201).json({ success: true, message: 'Officer account created.' });
});

module.exports = router;
