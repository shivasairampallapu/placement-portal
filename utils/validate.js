// Simple input-checking helpers. Every route uses these so bad data is rejected
// with a clear message (status 400) instead of crashing the server (status 500).

// Send an error answer. Example:  return fail(res, 'Enter a valid email.');
function fail(res, message, status) {
  return res.status(status || 400).json({ success: false, message: message });
}

// Is it a real text (not a number / empty / too long)?
function isText(value, maxLength) {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  return text.length > 0 && text.length <= (maxLength || 255);
}

// Optional text: empty is fine, but if given it must be a text of allowed length
function isOptionalText(value, maxLength) {
  if (value === undefined || value === null || value === '') return true;
  return isText(value, maxLength);
}

// Is it a number between min and max?  ("" and "abc" are NOT numbers)
function isNumberBetween(value, min, max) {
  if (value === '' || value === null || value === undefined || typeof value === 'boolean') return false;
  const n = Number(value);
  return !isNaN(n) && n >= min && n <= max;
}

// Is it a whole number between min and max?
function isWholeNumberBetween(value, min, max) {
  return isNumberBetween(value, min, max) && Number.isInteger(Number(value));
}

// Basic email check:  something@something.something
function isEmail(value) {
  return typeof value === 'string' && value.length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// "2026-11-10"
function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));      // UTC, so the computer's time zone does not matter
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

// "2026-11-10T17:30" (from the browser) or "2026-11-10 17:30:00"
function isDateTime(value) {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(:\d{2})?$/);
  return !!match && isDate(match[1]) && Number(match[2]) < 24 && Number(match[3]) < 60;
}

module.exports = { fail, isText, isOptionalText, isNumberBetween, isWholeNumberBetween, isEmail, isDate, isDateTime };
