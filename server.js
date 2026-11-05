// Main server file. Run with:  node server.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const db = require('./config/db');

const app = express();
app.use(express.json());

// Express 5 leaves req.body empty when no JSON is sent. Use {} so routes never crash on it.
app.use((req, res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});
app.use(express.static(path.join(__dirname, 'public')));   // serves the HTML, CSS and JS files

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/drives', require('./routes/drives'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/shortlists', require('./routes/shortlists'));
app.use('/api/rounds', require('./routes/rounds'));
app.use('/api/results', require('./routes/results'));
app.use('/api/notifications', require('./routes/notifications'));

// Unknown API URL
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found.' });
});

// Any unexpected error ends up here (shows a friendly message, logs the real error)
app.use((err, req, res, next) => {
  // Browser sent broken JSON
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid data sent. Please check and try again.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'The data sent is too large.' });
  }
  // Database complaints that are really the user's mistake (not a server fault)
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'This record already exists.' });
  }
  const userMistakes = ['ER_DATA_TOO_LONG', 'ER_NO_REFERENCED_ROW_2', 'ER_TRUNCATED_WRONG_VALUE',
    'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD', 'ER_WARN_DATA_OUT_OF_RANGE', 'ER_CHECK_CONSTRAINT_VIOLATED', 'ER_BAD_NULL_ERROR'];
  if (userMistakes.includes(err.code)) {
    return res.status(400).json({ success: false, message: 'Some of the data you entered is not valid.' });
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Server error. Please try again.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Placement Portal running at http://localhost:${PORT}`);
  // Check the database connection once at start-up
  try {
    await db.query('SELECT 1');
    console.log('Database connected successfully (' + process.env.DB_NAME + ').');
  } catch (err) {
    console.log('Database connection FAILED: ' + err.message);
    console.log('Check DB_PASSWORD in the .env file and make sure MySQL is running.');
  }
});
