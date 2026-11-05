// Database connection (MySQL). One shared pool is used by all routes.
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,     // dates come back as plain text like "2026-11-10 17:30:00"
  decimalNumbers: true   // DECIMAL columns (cgpa, package) come back as numbers
});

module.exports = db;
