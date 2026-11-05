/**
 * seed.js - Database Seeder
 * Reads and executes database.sql (for the database named in DB_NAME), which contains the complete schema and all 100 real students.
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function seedDatabase() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run development seed script in production mode.');
  }

  console.log('Seeding database directly from database.sql ...');
  const sqlPath = path.resolve(__dirname, '..', 'database.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`database.sql not found at ${sqlPath}`);
  }

  // database.sql is written for "college_placement_portal". Use the name from DB_NAME instead,
  // so the same file can build the real database OR the separate test database.
  const dbName = process.env.DB_NAME || 'college_placement_portal';
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
    throw new Error('DB_NAME may contain only letters, numbers and underscore.');
  }
  const sql = fs.readFileSync(sqlPath, 'utf8').split('college_placement_portal').join(dbName);
  console.log('Target database: ' + dbName);

  // Connect with multipleStatements enabled to execute database.sql
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true
  });

  try {
    await conn.query(sql);
    console.log('[SEED] Cleaned and reset all database tables.');
    console.log('[SEED] Created Placement Officer: college@campus.edu.in / college@123');
    console.log('[SEED] Seeded 100 real students with academic profiles.');
    console.log('[SEED] Seeded 10 real companies.');
    console.log('[SEED] Seeded placement drives and default interview rounds.');
    console.log('[SEED] Created campus-wide announcement for students.');
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Database seeding finished successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error seeding database:', err);
      process.exit(1);
    });
}

module.exports = seedDatabase;
