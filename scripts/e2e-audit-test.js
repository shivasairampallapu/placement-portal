/**
 * e2e-audit-test.js
 * Exhaustive Principal QA Audit Test Suite for College Placement Portal
 * Validates All Business Flows, State Mutations, Edge Cases, Security & Roles
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const results = [];

function recordTest(name, category, passed, details = '') {
  results.push({ name, category, status: passed ? 'PASS' : 'FAIL', details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${category}] ${name}: ${passed ? 'PASS' : 'FAIL'} ${details ? `(${details})` : ''}`);
}

async function runAudit() {
  console.log('\n=======================================================================');
  console.log('STARTING EXHAUSTIVE E2E FULL-STACK AUDIT & SECURITY TEST SUITE');
  console.log('=======================================================================\n');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'college_placement_portal'
  });

  let officerToken = '';
  let officerUser = null;
  let studentToken = '';
  let studentUser = null;

  // Track created temporary test records for guaranteed cleanup
  const cleanup = {
    companyIds: [],
    driveIds: [],
    appIds: [],
    userIds: []
  };

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: DATABASE INTEGRITY & CORE CONSTRAINTS
    // -------------------------------------------------------------------------
    console.log('\n--- 1. DATABASE INTEGRITY & PRESERVED DATA VERIFICATION ---');

    // 1.1 Total Active Students (99 preserved)
    const [[studentCount]] = await conn.query("SELECT COUNT(*) AS count FROM users WHERE role = 'student' AND is_active = 1");
    recordTest('Total Active Students Preserved (99)', 'Database', studentCount.count === 99, `Count: ${studentCount.count}`);

    // 1.2 Placement Officer Account Exists
    const [officers] = await conn.query("SELECT id, email, role FROM users WHERE role = 'officer'");
    recordTest('Placement Officer Account Exists', 'Database', officers.length >= 1, `Officer: ${officers[0]?.email}`);

    // 1.3 Deleted user 24R11A66R5
    const [delUsers] = await conn.query("SELECT id FROM users WHERE email LIKE '%24R11A66R5%'");
    const [delProfiles] = await conn.query("SELECT id FROM student_profiles WHERE roll_number = '24R11A66R5'");
    recordTest('24R11A66R5 Completely Deleted', 'Database', delUsers.length === 0 && delProfiles.length === 0, 'No traces found');

    // 1.4 All Students in 2022 batch
    const [[non2022]] = await conn.query("SELECT COUNT(*) AS count FROM student_profiles WHERE graduation_year != 2022");
    recordTest('All Students Set to Graduation Batch 2022', 'Database', non2022.count === 0, `Non-2022: ${non2022.count}`);

    // 1.5 The 6 AIML Students & CGPAs
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

    let aimlOk = true;
    for (const exp of expectedAiml) {
      const actual = aimlRows.find(r => r.roll_number === exp.roll);
      if (!actual || actual.department !== exp.dept || actual.cgpa !== exp.cgpa) {
        aimlOk = false;
        console.error(`Mismatch for ${exp.roll}: Expected ${exp.dept}/${exp.cgpa}, Got ${actual?.department}/${actual?.cgpa}`);
      }
    }
    recordTest('6 Specified Candidates Belong to AIML with Exact CGPAs', 'Database', aimlOk, 'P4(9.6), L0(9.3), P8(9.0), L3(8.9), M2(8.7), K3(8.0)');

    // -------------------------------------------------------------------------
    // SECTION 2: AUTHENTICATION, JWT & ROLE BOUNDARIES
    // -------------------------------------------------------------------------
    console.log('\n--- 2. AUTHENTICATION & ACCESS CONTROL (RBAC) ---');

    // 2.1 Officer Login
    const offLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'college@campus.edu.in', password: 'college@123', role: 'officer' })
    });
    const offLoginData = await offLoginRes.json();
    officerToken = offLoginData.token;
    officerUser = offLoginData.user;
    recordTest('Officer Login & Token Issuance', 'Auth', offLoginRes.status === 200 && !!officerToken, `Role: ${officerUser?.role}`);

    // 2.2 Student Login (22R11A66P4)
    const stuLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '22r11a66p4@campus.edu.in', password: '22R11A66P4', role: 'student' })
    });
    const stuLoginData = await stuLoginRes.json();
    studentToken = stuLoginData.token;
    studentUser = stuLoginData.user;
    recordTest('Student Login & Token Issuance', 'Auth', stuLoginRes.status === 200 && !!studentToken, `Name: ${studentUser?.full_name}`);

    // 2.3 Wrong password rejected
    const badPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'college@campus.edu.in', password: 'WrongPassword!', role: 'officer' })
    });
    recordTest('Invalid Password Rejected (HTTP 401)', 'Security', badPassRes.status === 401, 'Rejected');

    // 2.4 Role mismatch rejected
    const roleMismatchRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'college@campus.edu.in', password: 'college@123', role: 'student' })
    });
    recordTest('Role Mismatch Blocked (HTTP 403)', 'Security', roleMismatchRes.status === 403, 'Blocked');

    // 2.5 Student token blocked from officer routes
    const rbacOfficerRes = await fetch(`${BASE_URL}/api/students/officer-dashboard`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    recordTest('RBAC: Student Token Forbidden on Officer Routes (HTTP 403)', 'Security', rbacOfficerRes.status === 403, `Status: ${rbacOfficerRes.status}`);

    // 2.6 Officer token blocked from student routes
    const rbacStudentRes = await fetch(`${BASE_URL}/api/students/profile`, {
      headers: { 'Authorization': `Bearer ${officerToken}` }
    });
    recordTest('RBAC: Officer Token Forbidden on Student Routes (HTTP 403)', 'Security', rbacStudentRes.status === 403, `Status: ${rbacStudentRes.status}`);

    // 2.7 Unauthenticated request rejected
    const noAuthRes = await fetch(`${BASE_URL}/api/students/dashboard`);
    recordTest('Unauthenticated Request Rejected (HTTP 401)', 'Security', noAuthRes.status === 401, `Status: ${noAuthRes.status}`);

    // 2.8 Tampered JWT token rejected
    const tamperedRes = await fetch(`${BASE_URL}/api/students/profile`, {
      headers: { 'Authorization': `Bearer ${studentToken}tampered` }
    });
    recordTest('Tampered JWT Token Rejected (HTTP 401)', 'Security', tamperedRes.status === 401, 'Rejected');

    // -------------------------------------------------------------------------
    // SECTION 3: RECRUITING COMPANY MANAGEMENT (CRUD & EDGE CASES)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. RECRUITING COMPANY LIFECYCLE ---');

    const compName = 'E2E Tech Labs ' + Date.now();
    const createCompRes = await fetch(`${BASE_URL}/api/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({
        name: compName,
        description: 'Next-Gen Autonomous Solutions & Cloud Robotics',
        website: 'https://e2e-techlabs.corp',
        contact_email: 'hiring@e2e-techlabs.corp',
        contact_phone: '+91 9876543210'
      })
    });
    recordTest('Officer Creates Company (HTTP 201)', 'Company', createCompRes.status === 201, compName);

    const [compRows] = await conn.query('SELECT id, name FROM companies WHERE name = ?', [compName]);
    const testCompId = compRows[0]?.id;
    if (testCompId) cleanup.companyIds.push(testCompId);

    // 3.2 Duplicate Company Name Prevention (409)
    const dupCompRes = await fetch(`${BASE_URL}/api/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({
        name: compName,
        description: 'Duplicate test attempt',
        website: 'https://e2e-techlabs.corp'
      })
    });
    recordTest('Duplicate Company Name Blocked (HTTP 409)', 'Company', dupCompRes.status === 409, 'Duplicate blocked');

    // 3.3 Edit Company Details
    const editCompRes = await fetch(`${BASE_URL}/api/companies/${testCompId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({
        name: compName + ' Inc',
        description: 'Updated company description with full autonomous research stack.',
        website: 'https://e2e-techlabs.corp',
        contact_email: 'careers@e2e-techlabs.corp',
        contact_phone: '+91 9999888877'
      })
    });
    recordTest('Officer Updates Company Details (HTTP 200)', 'Company', editCompRes.status === 200, 'Updated');

    // Verify DB update
    const [updatedComp] = await conn.query('SELECT name FROM companies WHERE id = ?', [testCompId]);
    recordTest('Company DB Mutation Verified', 'Company', updatedComp[0]?.name === compName + ' Inc', updatedComp[0]?.name);

    // -------------------------------------------------------------------------
    // SECTION 4: PLACEMENT DRIVE LIFECYCLE (VALIDATION & DEFAULTS)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. PLACEMENT DRIVE CREATION & MANAGEMENT ---');

    // 4.1 Past deadline rejected (400)
    const pastDateRes = await fetch(`${BASE_URL}/api/drives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({
        company_id: testCompId,
        job_title: 'Software Engineer',
        job_description: 'Full stack development',
        package_lpa: 10,
        location: 'Hyderabad',
        eligible_branches: 'AIML, CSE',
        graduation_year: 2022,
        required_skills: 'Node, React',
        application_deadline: '2020-01-01T10:00',
        placement_date: '2020-01-05'
      })
    });
    recordTest('Drive with Past Deadline Rejected (HTTP 400)', 'Drive', pastDateRes.status === 400, 'Past deadline rejected');

    // 4.2 Create Drive with Future Dates
    const futureDeadline = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16);
    const futureDriveDate = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    const createDriveRes = await fetch(`${BASE_URL}/api/drives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({
        company_id: testCompId,
        job_title: 'AI Perception Engineer',
        job_description: 'Computer vision, robotics perception, neural architecture search.',
        package_lpa: 15.00,
        location: 'Hyderabad R&D Hub',
        min_cgpa: 8.50,
        eligible_branches: 'AIML, CSE',
        graduation_year: 2022,
        required_skills: 'Python, PyTorch, C++, ROS',
        application_deadline: futureDeadline,
        placement_date: futureDriveDate,
        is_published: 1
      })
    });
    const driveData = await createDriveRes.json();
    const testDriveId = driveData.drive_id;
    if (testDriveId) cleanup.driveIds.push(testDriveId);
    recordTest('Officer Publishes Placement Drive (HTTP 201)', 'Drive', createDriveRes.status === 201 && !!testDriveId, `Drive ID: ${testDriveId}`);

    // 4.3 Verify 4 Default Rounds Created Automatically in DB
    const [roundsRows] = await conn.query('SELECT round_name, round_order FROM placement_rounds WHERE drive_id = ? ORDER BY round_order', [testDriveId]);
    const roundsOk = roundsRows.length === 4 && roundsRows[0].round_name === 'Online Assessment' && roundsRows[3].round_name === 'Final Selection';
    recordTest('4 Default Placement Rounds Generated in Correct Order', 'Drive', roundsOk, roundsRows.map(r => r.round_name).join(' -> '));

    // 4.4 Add Custom Round (inserts before Final Selection)
    const customRoundRes = await fetch(`${BASE_URL}/api/rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({
        drive_id: testDriveId,
        round_name: 'System Design Round',
        description: 'Scalable backend architecture and API design'
      })
    });
    recordTest('Officer Adds Custom Round Before Final Selection (HTTP 201)', 'Drive', customRoundRes.status === 201, 'System Design Round');

    const [updatedRounds] = await conn.query('SELECT id, round_name, round_order FROM placement_rounds WHERE drive_id = ? ORDER BY round_order', [testDriveId]);
    const lastRound = updatedRounds[updatedRounds.length - 1];
    recordTest('Final Selection Remains the Last Round After Custom Insertion', 'Drive', lastRound?.round_name === 'Final Selection' && updatedRounds.length === 5, `Total Rounds: ${updatedRounds.length}`);

    // -------------------------------------------------------------------------
    // SECTION 5: STUDENT ELIGIBILITY, APPLICATION & WORKFLOW
    // -------------------------------------------------------------------------
    console.log('\n--- 5. STUDENT ELIGIBILITY, APPLY & REVIEW ---');

    // 5.1 Register two test candidates: Candidate A (Eligible: AIML, 9.10) & Candidate B (Ineligible: Mechanical, 6.50)
    const candAEmail = `audit_cand_a_${Date.now()}@campus.edu`;
    const candARoll = 'TEST_AUDIT_A_' + Math.floor(1000 + Math.random() * 9000);
    const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Eligible Candidate A',
        email: candAEmail,
        password: 'Password@123',
        roll_number: candARoll,
        department: 'AIML',
        graduation_year: 2022,
        cgpa: 9.10,
        skills: 'Python, PyTorch, C++, Algorithms'
      })
    });
    const regAData = await regARes.json();
    const tokenA = regAData.token;
    if (regAData.user?.id) cleanup.userIds.push(regAData.user.id);
    recordTest('Register Eligible Candidate A (AIML, CGPA 9.10)', 'Student', regARes.status === 201 && !!tokenA, `Roll: ${candARoll}`);

    const candBEmail = `audit_cand_b_${Date.now()}@campus.edu`;
    const candBRoll = 'TEST_AUDIT_B_' + Math.floor(1000 + Math.random() * 9000);
    const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Ineligible Candidate B',
        email: candBEmail,
        password: 'Password@123',
        roll_number: candBRoll,
        department: 'MECH',
        graduation_year: 2022,
        cgpa: 6.50,
        skills: 'AutoCAD, SolidWorks'
      })
    });
    const regBData = await regBRes.json();
    const tokenB = regBData.token;
    if (regBData.user?.id) cleanup.userIds.push(regBData.user.id);
    recordTest('Register Ineligible Candidate B (MECH, CGPA 6.50)', 'Student', regBRes.status === 201 && !!tokenB, `Roll: ${candBRoll}`);

    // 5.2 Server-Side Eligibility Rejection for Candidate B (Branch & CGPA fail)
    const applyBRes = await fetch(`${BASE_URL}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
      body: JSON.stringify({ drive_id: testDriveId })
    });
    recordTest('Server-Side Eligibility Blocks Ineligible Candidate B (HTTP 400)', 'Eligibility', applyBRes.status === 400, 'Blocked');

    // 5.3 Candidate A Applies (Eligible)
    const applyARes = await fetch(`${BASE_URL}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({ drive_id: testDriveId })
    });
    recordTest('Eligible Candidate A Application Accepted (HTTP 201)', 'Student', applyARes.status === 201, 'Submitted');

    const [appARows] = await conn.query('SELECT id, status FROM applications WHERE drive_id = ? AND student_user_id = ?', [testDriveId, regAData.user.id]);
    const appAId = appARows[0]?.id;
    if (appAId) cleanup.appIds.push(appAId);

    // 5.4 Duplicate Application Blocked (HTTP 409)
    const dupApplyRes = await fetch(`${BASE_URL}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({ drive_id: testDriveId })
    });
    recordTest('Duplicate Application Prevented (HTTP 409)', 'Student', dupApplyRes.status === 409, 'Duplicate blocked');

    // 5.5 Student Profile Update & Tamper Resistance
    const updateProfRes = await fetch(`${BASE_URL}/api/students/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({
        full_name: 'Eligible Candidate A (Updated)',
        skills: 'Python, PyTorch, C++, ROS, Distributed Training',
        github_url: 'https://github.com/candidate-a',
        linkedin_url: 'https://linkedin.com/in/candidate-a',
        // Attempting to mutate official records via payload:
        cgpa: 10.00,
        department: 'CSE',
        roll_number: 'TAMPER_ROLL_99'
      })
    });
    recordTest('Student Profile Update (HTTP 200)', 'Security', updateProfRes.status === 200, 'Profile updated');

    // Verify official academic fields remained untouched in DB
    const [profRows] = await conn.query('SELECT roll_number, cgpa, department FROM student_profiles WHERE user_id = ?', [regAData.user.id]);
    const profileTamperResistant = profRows[0]?.roll_number === candARoll && Number(profRows[0]?.cgpa) === 9.10 && profRows[0]?.department === 'AIML';
    recordTest('Tamper Resistance: Student Cannot Mutate Roll/CGPA/Branch', 'Security', profileTamperResistant, `CGPA: ${profRows[0]?.cgpa}, Roll: ${profRows[0]?.roll_number}`);

    // 5.6 Officer Bulk Approves Eligible Applications for Drive
    const bulkApproveRes = await fetch(`${BASE_URL}/api/applications/bulk-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({ drive_id: testDriveId })
    });
    const bulkData = await bulkApproveRes.json();
    recordTest('Officer Bulk Approves Applications for Drive', 'Workflow', bulkApproveRes.status === 200 && bulkData.approved_count >= 1, `Approved: ${bulkData.approved_count}`);

    // Verify application status changed to Approved in DB
    const [appStateRows] = await conn.query('SELECT status FROM applications WHERE id = ?', [appAId]);
    recordTest('Application Status Mutated to "Approved" in DB', 'Database', appStateRows[0]?.status === 'Approved', appStateRows[0]?.status);

    // -------------------------------------------------------------------------
    // SECTION 6: SHORTLIST RANKING, APPROVAL & PUBLISHING
    // -------------------------------------------------------------------------
    console.log('\n--- 6. RANKED SHORTLIST WORKFLOW ---');

    // 6.1 Generate CGPA-Ranked Shortlist
    const genSlRes = await fetch(`${BASE_URL}/api/shortlists/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({ drive_id: testDriveId })
    });
    recordTest('Officer Generates CGPA-Ranked Shortlist', 'Shortlist', genSlRes.status === 200, 'Generated');

    // 6.2 Cannot publish unapproved shortlist (Rule enforcement)
    const pubUnapprovedRes = await fetch(`${BASE_URL}/api/shortlists/drive/${testDriveId}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({ is_published: 1 })
    });
    recordTest('Publishing Unapproved Shortlist Blocked (HTTP 400)', 'Shortlist', pubUnapprovedRes.status === 400, 'Approval required first');

    // 6.3 Approve Shortlist
    const approveSlRes = await fetch(`${BASE_URL}/api/shortlists/drive/${testDriveId}/approve`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${officerToken}` }
    });
    recordTest('Officer Approves Shortlist (HTTP 200)', 'Shortlist', approveSlRes.status === 200, 'Approved');

    // 6.4 Publish Shortlist
    const pubSlRes = await fetch(`${BASE_URL}/api/shortlists/drive/${testDriveId}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({ is_published: 1 })
    });
    recordTest('Officer Publishes Shortlist (HTTP 200)', 'Shortlist', pubSlRes.status === 200, 'Published');

    // 6.5 Student Views Shortlist Rank in Portal
    const stuAppRes = await fetch(`${BASE_URL}/api/applications/my`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const stuAppData = await stuAppRes.json();
    const myApp = stuAppData.applications?.find(a => a.id === appAId);
    recordTest('Student Receives Published Shortlist Rank (#1)', 'Student', myApp?.shortlist_info?.rank_position === 1, `Rank: #${myApp?.shortlist_info?.rank_position}`);

    // -------------------------------------------------------------------------
    // SECTION 7: ROUND EVALUATION & FINAL PLACEMENT RESULTS
    // -------------------------------------------------------------------------
    console.log('\n--- 7. ROUND EVALUATION & FINAL OFFER SELECTION ---');

    const round1Id = updatedRounds[0].id; // Online Assessment

    // 7.1 Missing application_id in round result rejected (400)
    const badRoundRes = await fetch(`${BASE_URL}/api/rounds/${round1Id}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({ status: 'Qualified', score: 98 })
    });
    recordTest('Missing Application ID in Round Result Rejected (HTTP 400)', 'Validation', badRoundRes.status === 400, 'Rejected');

    // 7.2 Evaluate Candidate A in Round 1 (Qualified)
    const evalRes = await fetch(`${BASE_URL}/api/rounds/${round1Id}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({
        application_id: appAId,
        status: 'Qualified',
        score: 98.0,
        feedback: 'Top 1% score in perceptions and algorithms.'
      })
    });
    recordTest('Save Candidate Round 1 Evaluation (Qualified @ 98.0)', 'Evaluation', evalRes.status === 200, 'Saved');

    // 7.3 Final Decision Saved (Selected @ 15.00 LPA)
    const finalDecRes = await fetch(`${BASE_URL}/api/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({
        application_id: appAId,
        final_result: 'Selected',
        offered_package_lpa: 15.00,
        offer_details: 'Perception Software Engineer offer letter issued.'
      })
    });
    recordTest('Officer Saves Final Decision (Selected @ 15.00 LPA)', 'Results', finalDecRes.status === 200, 'Saved');

    // 7.4 Inconsistent State Prevention: Cannot disqualify candidate who is already Selected
    const disqSelectedRes = await fetch(`${BASE_URL}/api/rounds/${round1Id}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({
        application_id: appAId,
        status: 'Not Qualified'
      })
    });
    recordTest('Disqualification Guard: Cannot Disqualify Already-Selected Candidate (HTTP 400)', 'Integrity', disqSelectedRes.status === 400, 'Blocked');

    // 7.5 Publish Final Results
    const pubFinalRes = await fetch(`${BASE_URL}/api/results/drive/${testDriveId}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({ results_published: 1 })
    });
    recordTest('Officer Publishes Final Results (HTTP 200)', 'Results', pubFinalRes.status === 200, 'Published');

    // 7.6 Verify Student Views Final Job Offer in Portal
    const finalStuRes = await fetch(`${BASE_URL}/api/applications/my`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const finalStuData = await finalStuRes.json();
    const offerApp = finalStuData.applications?.find(a => a.id === appAId);
    const hasOffer = offerApp && offerApp.final_result === 'Selected' && Number(offerApp.offered_package_lpa) === 15;
    recordTest('Student Views Published Offer Details & Status "Selected"', 'Student', hasOffer, `Offered: ${offerApp?.offered_package_lpa} LPA`);

    // -------------------------------------------------------------------------
    // SECTION 8: SQL INJECTION & FILTER SANITIZATION
    // -------------------------------------------------------------------------
    console.log('\n--- 8. SECURITY & SQL INJECTION RESISTANCE ---');

    // 8.1 SQL injection attack string on directory search
    const sqlPayload = "' OR '1'='1' -- ";
    const sqliRes = await fetch(`${BASE_URL}/api/students/directory?q=${encodeURIComponent(sqlPayload)}`, {
      headers: { 'Authorization': `Bearer ${officerToken}` }
    });
    const sqliData = await sqliRes.json();
    // In a prepared statement, this searches literally for students containing the string, returning 0 rows instead of dumping all rows
    recordTest('SQL Injection Payload Safely Parameterized in Directory Search', 'Security', sqliRes.status === 200 && sqliData.students.length === 0, 'Safe parameterized query');

    // 8.2 Non-numeric min_cgpa query rejected
    const badCgpaQueryRes = await fetch(`${BASE_URL}/api/students/directory?min_cgpa=invalid_string`, {
      headers: { 'Authorization': `Bearer ${officerToken}` }
    });
    recordTest('Invalid Non-Numeric min_cgpa Filter Rejected (HTTP 400)', 'Validation', badCgpaQueryRes.status === 400, 'Rejected');

    // 8.3 Invalid status filter in applications rejected
    const badStatusQueryRes = await fetch(`${BASE_URL}/api/applications?status=DROP_TABLE`, {
      headers: { 'Authorization': `Bearer ${officerToken}` }
    });
    recordTest('Invalid Status Query Filter Rejected (HTTP 400)', 'Validation', badStatusQueryRes.status === 400, 'Rejected');

    // -------------------------------------------------------------------------
    // SECTION 9: BROADCAST ANNOUNCEMENTS & NOTIFICATIONS
    // -------------------------------------------------------------------------
    console.log('\n--- 9. BROADCAST ANNOUNCEMENTS & NOTIFICATIONS ---');

    const announceRes = await fetch(`${BASE_URL}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${officerToken}` },
      body: JSON.stringify({
        title: 'Official Campus Notice: End-of-Week Placement Orientation',
        message: 'All registered B.Tech 2022 batch candidates must attend the online orientation session.',
        drive_id: testDriveId
      })
    });
    recordTest('Officer Broadcasts Targeted Notice to Drive Applicants', 'Notifications', announceRes.status === 200, 'Sent');

    // Verify Candidate A received the notification
    const [candNotifs] = await conn.query('SELECT title, is_read FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 1', [regAData.user.id]);
    recordTest('Targeted Notification Delivered to Student Account in DB', 'Notifications', candNotifs.length > 0 && candNotifs[0].is_read === 0, candNotifs[0]?.title);

    // Candidate A marks notification as read
    const markAllReadRes = await fetch(`${BASE_URL}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    recordTest('Student Marks All Notifications as Read (HTTP 200)', 'Notifications', markAllReadRes.status === 200, 'Marked read');

    const [afterReadNotifs] = await conn.query('SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0', [regAData.user.id]);
    recordTest('Notification Read Status Permanently Committed to DB', 'Database', afterReadNotifs[0]?.unread === 0, 'Unread: 0');

  } catch (err) {
    console.error('Test execution error occurred:', err);
    recordTest('Audit Suite Execution', 'Runner', false, err.message);
  } finally {
    // -------------------------------------------------------------------------
    // SAFE CLEANUP OF TEMPORARY TEST ENTITIES
    // -------------------------------------------------------------------------
    console.log('\n--- CLEANING UP TEMPORARY AUDIT TEST RECORDS ---');
    for (const appId of cleanup.appIds) {
      await conn.query('DELETE FROM round_results WHERE application_id = ?', [appId]);
      await conn.query('DELETE FROM shortlists WHERE application_id = ?', [appId]);
      await conn.query('DELETE FROM applications WHERE id = ?', [appId]);
    }
    for (const driveId of cleanup.driveIds) {
      await conn.query('DELETE FROM placement_rounds WHERE drive_id = ?', [driveId]);
      await conn.query('DELETE FROM placement_drives WHERE id = ?', [driveId]);
    }
    for (const compId of cleanup.companyIds) {
      await conn.query('DELETE FROM companies WHERE id = ?', [compId]);
    }
    for (const userId of cleanup.userIds) {
      await conn.query('DELETE FROM notifications WHERE user_id = ?', [userId]);
      await conn.query('DELETE FROM student_profiles WHERE user_id = ?', [userId]);
      await conn.query('DELETE FROM users WHERE id = ?', [userId]);
    }
    await conn.end();
  }

  // ---------------------------------------------------------------------------
  // SUMMARY METRICS
  // ---------------------------------------------------------------------------
  console.log('\n=======================================================================');
  console.log('EXHAUSTIVE AUDIT TEST RESULTS SUMMARY');
  console.log('=======================================================================');
  const passedCount = results.filter(r => r.status === 'PASS').length;
  const totalCount = results.length;
  console.log(`TOTAL AUDIT CHECKS: ${totalCount}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${totalCount - passedCount}`);
  console.log(`PASS RATE: ${((passedCount / totalCount) * 100).toFixed(1)}%`);
  console.log('=======================================================================\n');

  if (passedCount < totalCount) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
