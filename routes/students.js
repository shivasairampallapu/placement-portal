// Student routes (dashboard, profile) and officer views (dashboard, student list)
const express = require('express');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { checkApplyEligibility } = require('../utils/helpers');
const { fail, isText, isOptionalText, isNumberBetween, isWholeNumberBetween } = require('../utils/validate');

const router = express.Router();
router.use(verifyToken);

// ---------- STUDENT DASHBOARD ----------
router.get('/dashboard', requireRole('student'), async (req, res) => {
  const userId = req.user.id;

  const [profiles] = await db.query('SELECT * FROM student_profiles WHERE user_id = ?', [userId]);
  const student = profiles[0];

  // All published drives (with company name) and the drives this student already applied to
  const [drives] = await db.query(
    `SELECT d.*, c.name AS company_name FROM placement_drives d
     JOIN companies c ON c.id = d.company_id
     WHERE d.is_published = 1 ORDER BY d.application_deadline`);
  const [myApps] = await db.query('SELECT drive_id FROM applications WHERE student_user_id = ?', [userId]);
  const appliedIds = myApps.map(a => a.drive_id);

  let eligibleCount = 0;
  const upcoming = [];
  for (const d of drives) {
    const elig = checkApplyEligibility(student, d);
    const alreadyApplied = appliedIds.includes(d.id);
    if (elig.eligible && !alreadyApplied) eligibleCount++;
    if (elig.eligible || alreadyApplied) {
      if (d.status === 'open' && upcoming.length < 5) {
        upcoming.push({
          job_title: d.job_title, company_name: d.company_name, package_lpa: d.package_lpa,
          application_deadline: d.application_deadline, already_applied: alreadyApplied
        });
      }
    }
  }

  // Only PUBLISHED shortlists / results are counted
  const [[sl]] = await db.query(
    `SELECT COUNT(*) AS n FROM shortlists s JOIN placement_drives d ON d.id = s.drive_id
     WHERE s.student_user_id = ? AND d.shortlist_published = 1 AND s.selection_status IN ('Shortlisted', 'Selected')`, [userId]);
  const [[sel]] = await db.query(
    `SELECT COUNT(*) AS n FROM applications a JOIN placement_drives d ON d.id = a.drive_id
     WHERE a.student_user_id = ? AND a.final_result = 'Selected' AND a.result_published = 1 AND d.results_published = 1`, [userId]);

  const [notifs] = await db.query(
    'SELECT id, title, message, type, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 5', [userId]);
  const [[unread]] = await db.query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);

  res.json({
    success: true,
    student: { full_name: req.user.full_name, is_profile_complete: !!student },
    stats: {
      eligible_drives_count: eligibleCount,
      applications_submitted: appliedIds.length,
      shortlisted_applications: sl.n,
      selected_applications: sel.n
    },
    upcoming_deadlines: upcoming,
    recent_notifications: notifs,
    unread_notifications: unread.n
  });
});

// ---------- STUDENT PROFILE ----------
router.get('/profile', requireRole('student'), async (req, res) => {
  const [rows] = await db.query(
    `SELECT u.full_name, u.email, p.roll_number, p.department, p.graduation_year, p.cgpa, p.skills,
            p.github_url, p.linkedin_url, p.leetcode_url, p.hackerrank_url, p.codechef_url
     FROM users u JOIN student_profiles p ON p.user_id = u.id WHERE u.id = ?`, [req.user.id]);
  res.json({ success: true, profile: rows[0] || null });
});

// A student can change ONLY name, skills and links.
// Roll number, department, batch and CGPA are official records - only the officer can change them.
router.put('/profile', requireRole('student'), async (req, res) => {
  const { full_name, skills, github_url, linkedin_url, leetcode_url, hackerrank_url, codechef_url } = req.body;
  if (!isText(full_name, 120) || !isText(skills, 2000)) {
    return fail(res, 'Name and skills are required.');
  }
  const links = [github_url, linkedin_url, leetcode_url, hackerrank_url, codechef_url];
  for (const link of links) {
    if (!isOptionalText(link, 255)) return fail(res, 'Each link must be text of at most 255 characters.');
    if (link && !/^https?:\/\//i.test(link)) {
      return fail(res, 'Links must start with http:// or https://');
    }
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE users SET full_name = ? WHERE id = ?', [full_name.trim(), req.user.id]);
    await conn.query(
      `UPDATE student_profiles SET skills = ?, github_url = ?, linkedin_url = ?, leetcode_url = ?,
         hackerrank_url = ?, codechef_url = ? WHERE user_id = ?`,
      [skills.trim(), github_url || null, linkedin_url || null, leetcode_url || null,
       hackerrank_url || null, codechef_url || null, req.user.id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  res.json({ success: true, message: 'Profile updated. (Roll number, branch and CGPA can only be changed by the placement officer.)' });
});

// ---------- OFFICER DASHBOARD ----------
router.get('/officer-dashboard', requireRole('officer'), async (req, res) => {
  const [[students]] = await db.query("SELECT COUNT(*) AS n FROM users WHERE role = 'student' AND is_active = 1");
  const [[companies]] = await db.query('SELECT COUNT(*) AS n FROM companies');
  const [[drives]] = await db.query('SELECT COUNT(*) AS n FROM placement_drives');
  const [[apps]] = await db.query('SELECT COUNT(*) AS n FROM applications');
  const [[shortlisted]] = await db.query('SELECT COUNT(DISTINCT student_user_id) AS n FROM shortlists');
  const [[selected]] = await db.query("SELECT COUNT(*) AS n FROM applications WHERE final_result = 'Selected'");
  const [[pkgStats]] = await db.query("SELECT COALESCE(MAX(offered_package_lpa), 0) AS max_pkg, COALESCE(ROUND(AVG(offered_package_lpa), 2), 0) AS avg_pkg FROM applications WHERE final_result = 'Selected'");

  const [deptStats] = await db.query(`
    SELECT sp.department,
           COUNT(DISTINCT sp.user_id) AS total_students,
           COUNT(DISTINCT CASE WHEN a.final_result = 'Selected' THEN a.student_user_id END) AS placed_students,
           COALESCE(MAX(CASE WHEN a.final_result = 'Selected' THEN a.offered_package_lpa END), 0) AS highest_lpa
    FROM student_profiles sp
    JOIN users u ON u.id = sp.user_id AND u.is_active = 1
    LEFT JOIN applications a ON a.student_user_id = sp.user_id AND a.final_result = 'Selected'
    GROUP BY sp.department
    ORDER BY placed_students DESC, total_students DESC
  `);

  const [recent] = await db.query(
    `SELECT u.full_name AS student_name, p.roll_number, c.name AS company_name, d.job_title,
            a.status, a.applied_at AS status_updated_at
     FROM applications a
     JOIN users u ON u.id = a.student_user_id
     JOIN student_profiles p ON p.user_id = u.id
     JOIN placement_drives d ON d.id = a.drive_id
     JOIN companies c ON c.id = d.company_id
     ORDER BY a.applied_at DESC, a.id DESC LIMIT 8`);

  const placementRate = students.n > 0 ? Number(((selected.n / students.n) * 100).toFixed(1)) : 0;

  res.json({
    success: true,
    stats: {
      total_students: students.n,
      total_companies: companies.n,
      total_drives: drives.n,
      total_applications: apps.n,
      shortlisted_students: shortlisted.n,
      selected_students: selected.n,
      highest_package: Number(pkgStats.max_pkg),
      average_package: Number(pkgStats.avg_pkg),
      placement_rate: placementRate
    },
    department_stats: deptStats,
    recent_activity: recent
  });
});

// ---------- OFFICER: STUDENT LIST (search + filters, sorted by CGPA) ----------
router.get('/directory', requireRole('officer'), async (req, res) => {
  const { q, department, min_cgpa, graduation_year } = req.query;

  let sql = `SELECT u.id AS user_id, u.full_name, u.email, p.roll_number, p.department, p.graduation_year,
                    p.cgpa, p.skills, p.github_url, p.linkedin_url, p.leetcode_url, p.hackerrank_url, p.codechef_url
             FROM users u JOIN student_profiles p ON p.user_id = u.id WHERE u.role = 'student'`;
  const params = [];
  if (q) {
    sql += ' AND (u.full_name LIKE ? OR p.roll_number LIKE ? OR p.skills LIKE ? OR u.email LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (department) { sql += ' AND p.department = ?'; params.push(department.trim().toUpperCase()); }
  if (min_cgpa !== undefined && min_cgpa !== '') {
    if (!isNumberBetween(min_cgpa, 0, 10)) return fail(res, 'Minimum CGPA filter must be a number between 0 and 10.');
    sql += ' AND p.cgpa >= ?';
    params.push(Number(min_cgpa));
  }
  if (graduation_year !== undefined && graduation_year !== '') {
    if (!isWholeNumberBetween(graduation_year, 1900, 2100)) return fail(res, 'Graduation year filter must be a valid year.');
    sql += ' AND p.graduation_year = ?';
    params.push(Number(graduation_year));
  }
  sql += ' ORDER BY p.cgpa DESC, p.roll_number ASC';   // highest CGPA first

  const [students] = await db.query(sql, params);
  res.json({ success: true, students });
});

// ---------- OFFICER: update a student's official CGPA ----------
router.patch('/:userId/cgpa', requireRole('officer'), async (req, res) => {
  if (!isNumberBetween(req.body.cgpa, 0, 10)) {
    return fail(res, 'CGPA must be a number between 0 and 10.');
  }
  const cgpa = Number(req.body.cgpa);
  const [result] = await db.query('UPDATE student_profiles SET cgpa = ? WHERE user_id = ?', [cgpa, req.params.userId]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, message: 'Student not found.' });
  }
  res.json({ success: true, message: 'CGPA updated.' });
});

// ---------- OFFICER: update a student's official academic record (Branch/Batch/CGPA) ----------
router.patch('/:userId/academics', requireRole('officer'), async (req, res) => {
  const { department, graduation_year, cgpa } = req.body;
  if (department !== undefined && !isText(department, 100)) {
    return fail(res, 'Department must be valid text (max 100 characters).');
  }
  if (graduation_year !== undefined && !isWholeNumberBetween(graduation_year, 2000, 2100)) {
    return fail(res, 'Graduation year must be between 2000 and 2100.');
  }
  if (cgpa !== undefined && !isNumberBetween(cgpa, 0, 10)) {
    return fail(res, 'CGPA must be a number between 0 and 10.');
  }

  const updates = [];
  const params = [];
  if (department !== undefined) { updates.push('department = ?'); params.push(department.trim().toUpperCase()); }
  if (graduation_year !== undefined) { updates.push('graduation_year = ?'); params.push(Number(graduation_year)); }
  if (cgpa !== undefined) { updates.push('cgpa = ?'); params.push(Number(cgpa)); }

  if (updates.length === 0) return fail(res, 'No changes provided.');
  params.push(req.params.userId);

  const [result] = await db.query(`UPDATE student_profiles SET ${updates.join(', ')} WHERE user_id = ?`, params);
  if (result.affectedRows === 0) return fail(res, 'Student not found.', 404);
  res.json({ success: true, message: 'Student academic records updated successfully.' });
});

module.exports = router;
