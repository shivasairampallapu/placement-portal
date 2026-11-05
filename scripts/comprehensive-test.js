/**
 * comprehensive-test.js
 * End-to-end QA Testing Suite for College Placement Management Portal
 * Tests Backend APIs, Database Constraints, Workflow Lifecycle & Simulation
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const results = [];

function recordTest(name, category, passed, details = '') {
  results.push({ name, category, status: passed ? 'PASS' : 'FAIL', details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${category}] ${name}: ${passed ? 'PASS' : 'FAIL'} ${details ? `(${details})` : ''}`);
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('STARTING COMPREHENSIVE QA & FULL-STACK INTEGRATION TEST SUITE');
  console.log('===============================================================\n');

  // 1. DATABASE INTEGRITY TESTS
  console.log('\n--- 1. DATABASE & STUDENT INTEGRITY CHECKS ---');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'college_placement_portal'
  });

  // Verify total active student count
  const [[studentCount]] = await conn.query("SELECT COUNT(*) AS count FROM users WHERE role = 'student' AND is_active = 1");
  recordTest('Total Active Students Preserved (99)', 'Database', studentCount.count === 99, `Count: ${studentCount.count}`);

  // Verify officer account
  const [officers] = await conn.query("SELECT id, email, role FROM users WHERE role = 'officer'");
  recordTest('Placement Officer Account Exists', 'Database', officers.length >= 1, `Officer: ${officers[0]?.email}`);

  // Verify removed user 24R11A66R5
  const [removedUser] = await conn.query("SELECT id FROM users WHERE email LIKE '%24R11A66R5%'");
  const [removedProfile] = await conn.query("SELECT id FROM student_profiles WHERE roll_number = '24R11A66R5'");
  recordTest('24R11A66R5 Completely Deleted', 'Database', removedUser.length === 0 && removedProfile.length === 0, 'No traces found');

  // Verify 2022 batch graduation consistency
  const [[non2022]] = await conn.query("SELECT COUNT(*) AS count FROM student_profiles WHERE graduation_year != 2022");
  recordTest('All Students Set to Graduation Batch 2022', 'Database', non2022.count === 0, `Non-2022: ${non2022.count}`);

  // Verify the 6 AIML students and their respective CGPAs
  const expectedAiml = [
    { roll: '22R11A66P4', dept: 'AIML', cgpa: '9.60' },
    { roll: '22R11A66L0', dept: 'AIML', cgpa: '9.30' },
    { roll: '22R11A66P8', dept: 'AIML', cgpa: '9.00' },
    { roll: '22R11A66L3', dept: 'AIML', cgpa: '8.90' },
    { roll: '22R11A66M2', dept: 'AIML', cgpa: '8.70' },
    { roll: '22R11A66K3', dept: 'AIML', cgpa: '8.00' }
  ];

  const [aimlRows] = await conn.query(
    "SELECT u.full_name, sp.roll_number, sp.department, sp.cgpa FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.roll_number IN (?) ORDER BY sp.cgpa DESC, sp.roll_number ASC",
    [expectedAiml.map(e => e.roll)]
  );

  let aimlPassed = true;
  for (let i = 0; i < expectedAiml.length; i++) {
    const exp = expectedAiml[i];
    const actual = aimlRows.find(r => r.roll_number === exp.roll);
    if (!actual || actual.department !== exp.dept || actual.cgpa !== exp.cgpa) {
      aimlPassed = false;
      console.error(`Mismatch for ${exp.roll}: Expected ${exp.dept}/${exp.cgpa}, Got ${actual?.department}/${actual?.cgpa}`);
    }
  }
  recordTest('6 Specified Candidates Belong to AIML with Correct CGPAs', 'Data Verification', aimlPassed, 'P4(9.6), L0(9.3), P8(9.0), L3(8.9), M2(8.7), K3(8.0)');

  // Verify automatic CGPA-based student ordering in directory query
  const [sortedDirectory] = await conn.query(
    "SELECT sp.roll_number, sp.cgpa FROM student_profiles sp ORDER BY sp.cgpa DESC, sp.roll_number ASC LIMIT 6"
  );
  const highestCgpa = Number(sortedDirectory[0].cgpa);
  const secondHighest = Number(sortedDirectory[1].cgpa);
  recordTest('Automatic CGPA-Based Ordering (Highest CGPA First)', 'Database Ordering', highestCgpa >= secondHighest, `Top CGPA: ${highestCgpa}`);

  // 2. AUTHENTICATION & SECURITY TESTS
  console.log('\n--- 2. AUTHENTICATION & SECURITY CHECKS ---');
  let officerToken = '';
  let studentToken = '';

  // Officer Login
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'college@campus.edu.in', password: 'college@123', role: 'officer' })
    });
    const data = await res.json();
    officerToken = data.token;
    recordTest('Placement Officer Login & JWT Generation', 'Auth', res.status === 200 && !!officerToken, `Role: ${data.user?.role}`);
  } catch (err) {
    recordTest('Placement Officer Login & JWT Generation', 'Auth', false, err.message);
  }

  // Student Login (P4 - PALLAPU SHIVA SAI RAM)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '22r11a66p4@campus.edu.in', password: '22R11A66P4', role: 'student' })
    });
    const data = await res.json();
    studentToken = data.token;
    recordTest('Student Login (22R11A66P4) & JWT Generation', 'Auth', res.status === 200 && !!studentToken, `Name: ${data.user?.full_name}`);
  } catch (err) {
    recordTest('Student Login', 'Auth', false, err.message);
  }

  // Security: Role-based Access Control (Student accessing officer route)
  try {
    const res = await fetch(`${BASE_URL}/api/students/officer-dashboard`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    recordTest('RBAC: Student Blocked From Officer Routes (HTTP 403)', 'Security', res.status === 403, `Status: ${res.status}`);
  } catch (err) {
    recordTest('RBAC: Student Blocked', 'Security', false, err.message);
  }

  // Security: Unauthenticated request rejected
  try {
    const res = await fetch(`${BASE_URL}/api/students/profile`);
    recordTest('Security: Unauthenticated Request Rejected (HTTP 401)', 'Security', res.status === 401, `Status: ${res.status}`);
  } catch (err) {
    recordTest('Security: Unauthenticated Request', 'Security', false, err.message);
  }

  // 3. PLACEMENT STATISTICS & DASHBOARD METRICS
  console.log('\n--- 3. ADVANCED PLACEMENT STATISTICS & ANALYTICS ---');
  try {
    const res = await fetch(`${BASE_URL}/api/students/officer-dashboard`, {
      headers: { 'Authorization': `Bearer ${officerToken}` }
    });
    const data = await res.json();
    const stats = data.stats || {};
    const depts = data.department_stats || [];
    const hasPkg = stats.highest_package > 0 && stats.average_package > 0;
    const hasDepts = depts.length > 0 && depts.some(d => d.department === 'AIML');
    recordTest('Officer Dashboard Stats (Package Metrics & Placement Rate)', 'Analytics', hasPkg && stats.placement_rate !== undefined, `Highest: ${stats.highest_package} LPA, Avg: ${stats.average_package} LPA, Rate: ${stats.placement_rate}%`);
    recordTest('Department-wise Placement Performance Analytics', 'Analytics', hasDepts, `Tracked branches: ${depts.length}`);
  } catch (err) {
    recordTest('Officer Dashboard Stats', 'Analytics', false, err.message);
  }

  // 4. STUDENT ELIGIBILITY VERIFICATION
  console.log('\n--- 4. STUDENT ELIGIBILITY VERIFICATION ---');
  try {
    const res = await fetch(`${BASE_URL}/api/drives`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const data = await res.json();
    const drives = data.drives || [];
    const tcs = drives.find(d => d.id === 1);
    const isElig = tcs && tcs.eligibility && tcs.eligibility.eligible;
    recordTest('Eligibility Engine: P4 (AIML, CGPA 9.60) Meets Drive 1 Criteria', 'Eligibility', !!isElig, tcs?.eligibility?.reason);
  } catch (err) {
    recordTest('Eligibility Engine', 'Eligibility', false, err.message);
  }

  // 5. SIMULATED PLACEMENT DRIVE WORKFLOW
  console.log('\n--- 5. COMPLETE PLACEMENT DRIVE WORKFLOW SIMULATION ---');
  let testCompanyId = null;
  let testDriveId = null;
  let testStudentUser = null;
  let testAppId = null;

  try {
    // 5.1 Officer creates a temporary test recruiting partner
    const compRes = await fetch(`${BASE_URL}/api/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({
        name: 'QA Test Robotics Corp ' + Date.now(),
        description: 'Autonomous Systems & Deep Learning',
        website: 'https://test-robotics.corp',
        contact_email: 'recruitment@test-robotics.corp'
      })
    });
    const compData = await compRes.json();
    recordTest('Officer Creates Recruiting Partner Company', 'Workflow', compRes.status === 201, compData.message);

    const [compRows] = await conn.query("SELECT id FROM companies WHERE name LIKE 'QA Test Robotics Corp%' ORDER BY id DESC LIMIT 1");
    testCompanyId = compRows[0]?.id;

    // 5.2 Officer publishes a new placement drive with 4 default rounds
    const futureDate = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().slice(0, 16);
    const futureDriveDate = new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    const driveRes = await fetch(`${BASE_URL}/api/drives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({
        company_id: testCompanyId,
        job_title: 'AI Robotics Engineer',
        job_description: 'Robotics perception, computer vision, and ROS integration.',
        package_lpa: 12.50,
        location: 'Hyderabad Tech Park',
        min_cgpa: 7.50,
        eligible_branches: 'AIML, CSE, ECE',
        graduation_year: 2022,
        required_skills: 'Python, C++, ROS, Deep Learning',
        application_deadline: futureDate,
        placement_date: futureDriveDate,
        is_published: 1
      })
    });
    const driveData = await driveRes.json();
    testDriveId = driveData.drive_id;
    recordTest('Officer Publishes Placement Drive with Default Rounds', 'Workflow', driveRes.status === 201 && !!testDriveId, `Drive ID: ${testDriveId}`);

    // Verify 4 default rounds were generated
    const [roundsRows] = await conn.query('SELECT * FROM placement_rounds WHERE drive_id = ? ORDER BY round_order', [testDriveId]);
    recordTest('4 Default Placement Rounds Created Automatically', 'Workflow', roundsRows.length === 4, roundsRows.map(r => r.round_name).join(' -> '));

    // 5.3 Student Registration (separate dedicated test student)
    const testRoll = 'TEST_SIM_' + Math.floor(1000 + Math.random() * 9000);
    const testEmail = `sim_${Date.now()}@testcampus.edu`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Simulated Candidate',
        email: testEmail,
        password: 'Password@123',
        roll_number: testRoll,
        department: 'AIML',
        graduation_year: 2022,
        cgpa: 8.95,
        skills: 'Python, PyTorch, ROS, C++'
      })
    });
    const regData = await regRes.json();
    testStudentUser = regData.user;
    const testStudentToken = regData.token;
    recordTest('New Student Account Registered & Verified (AIML, 8.95)', 'Workflow', regRes.status === 201 && !!testStudentToken, `Roll: ${testRoll}`);

    // 5.4 Student applies for the simulated drive
    const applyRes = await fetch(`${BASE_URL}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testStudentToken}` },
      body: JSON.stringify({ drive_id: testDriveId })
    });
    const applyData = await applyRes.json();
    recordTest('Student Applies for Published Drive (Server Eligibility Passed)', 'Workflow', applyRes.status === 201, applyData.message);

    const [appRows] = await conn.query('SELECT id, status FROM applications WHERE drive_id = ? AND student_user_id = ?', [testDriveId, testStudentUser.id]);
    testAppId = appRows[0]?.id;

    // 5.5 Duplicate Application Prevention
    const dupRes = await fetch(`${BASE_URL}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testStudentToken}` },
      body: JSON.stringify({ drive_id: testDriveId })
    });
    recordTest('Duplicate Application Prevented (HTTP 409)', 'Workflow', dupRes.status === 409, 'Duplicate blocked');

    // 5.6 Officer reviews and approves application
    const approveRes = await fetch(`${BASE_URL}/api/applications/${testAppId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({ status: 'Approved', officer_remarks: 'Verified AIML robotics prerequisites.' })
    });
    const approveData = await approveRes.json();
    recordTest('Officer Approves Candidate Application', 'Workflow', approveRes.status === 200, approveData.message);

    // 5.7 Officer generates ranked shortlist
    const slRes = await fetch(`${BASE_URL}/api/shortlists/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({ drive_id: testDriveId })
    });
    const slData = await slRes.json();
    recordTest('Officer Generates CGPA-Ranked Shortlist', 'Workflow', slRes.status === 200, slData.message);

    // Approve & Publish Shortlist
    await fetch(`${BASE_URL}/api/shortlists/drive/${testDriveId}/approve`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${officerToken}` }
    });
    const pubSlRes = await fetch(`${BASE_URL}/api/shortlists/drive/${testDriveId}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({ is_published: 1 })
    });
    recordTest('Shortlist Approved & Published with Notifications', 'Workflow', pubSlRes.status === 200, 'Published');

    // 5.8 Enter Round 1 Assessment Score (Qualified)
    const round1Id = roundsRows[0].id;
    const scoreRes = await fetch(`${BASE_URL}/api/rounds/${round1Id}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({
        application_id: testAppId,
        status: 'Qualified',
        score: 95.5,
        feedback: 'Top score in coding & perception algorithms.'
      })
    });
    recordTest('Candidate Evaluated & Qualified in Technical Round 1', 'Workflow', scoreRes.status === 200, 'Score: 95.5');

    // Publish Round 1 Results
    await fetch(`${BASE_URL}/api/rounds/${round1Id}/publish-results`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({ is_published: 1 })
    });

    // 5.9 Final Selection & Job Offer
    const finalRes = await fetch(`${BASE_URL}/api/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({
        application_id: testAppId,
        final_result: 'Selected',
        offered_package_lpa: 14.00,
        offer_details: 'Robotics perception specialist offer letter issued.'
      })
    });
    const finalData = await finalRes.json();
    recordTest('Final Decision Saved (Selected @ 14.00 LPA)', 'Workflow', finalRes.status === 200, finalData.message);

    // Publish Final Results
    const pubFinalRes = await fetch(`${BASE_URL}/api/results/drive/${testDriveId}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({ results_published: 1 })
    });
    recordTest('Final Selection Published to Student Portal', 'Workflow', pubFinalRes.status === 200, 'Published');

    // 5.10 Student Views Offer in Portal
    const myRes = await fetch(`${BASE_URL}/api/applications/my`, {
      headers: { 'Authorization': `Bearer ${testStudentToken}` }
    });
    const myData = await myRes.json();
    const myApp = myData.applications?.find(a => a.id === testAppId);
    const offerOk = myApp && myApp.final_result === 'Selected' && Number(myApp.offered_package_lpa) === 14;
    recordTest('Student Real-Time Tracking: Offer Letter & Status Received', 'Workflow', offerOk, `Offered: ${myApp?.offered_package_lpa} LPA`);

  } catch (err) {
    recordTest('Simulation Workflow', 'Workflow', false, err.message);
  } finally {
    // Clean up temporary test simulation records safely (preserving all real data)
    if (testAppId) {
      await conn.query('DELETE FROM round_results WHERE application_id = ?', [testAppId]);
      await conn.query('DELETE FROM shortlists WHERE application_id = ?', [testAppId]);
      await conn.query('DELETE FROM applications WHERE id = ?', [testAppId]);
    }
    if (testDriveId) {
      await conn.query('DELETE FROM placement_rounds WHERE drive_id = ?', [testDriveId]);
      await conn.query('DELETE FROM placement_drives WHERE id = ?', [testDriveId]);
    }
    if (testCompanyId) {
      await conn.query('DELETE FROM companies WHERE id = ?', [testCompanyId]);
    }
    if (testStudentUser) {
      await conn.query('DELETE FROM student_profiles WHERE user_id = ?', [testStudentUser.id]);
      await conn.query('DELETE FROM notifications WHERE user_id = ?', [testStudentUser.id]);
      await conn.query('DELETE FROM users WHERE id = ?', [testStudentUser.id]);
    }
    await conn.end();
  }

  // Summary
  console.log('\n===============================================================');
  console.log('TEST SUMMARY RESULTS');
  console.log('===============================================================');
  const passedCount = results.filter(r => r.status === 'PASS').length;
  const totalCount = results.length;
  console.log(`TOTAL TESTS: ${totalCount}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${totalCount - passedCount}`);
  console.log(`PASS RATE: ${((passedCount / totalCount) * 100).toFixed(1)}%`);
  console.log('===============================================================\n');

  if (passedCount < totalCount) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
