// Authentication middleware: checks the JWT token and the user's role.
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Step 1: any logged-in user
async function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Please log in to continue.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ success: false, message: 'Invalid session token. Please log in again.' });
    }
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }

  // Make sure the user still exists and is active
  const [rows] = await db.query(
    'SELECT id, full_name, email, role, is_active FROM users WHERE id = ?', [decoded.id]);
  if (rows.length === 0 || !rows[0].is_active) {
    return res.status(401).json({ success: false, message: 'Account not found or disabled.' });
  }
  req.user = rows[0];
  next();
}

// Step 2: only allow one role (student or officer)
function requireRole(role) {
  return function (req, res, next) {
    if (req.user.role !== role) {
      return res.status(403).json({ success: false, message: `Access denied. This action is only for ${role}s.` });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
