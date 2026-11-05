# Campus Placement Management Portal

A web application for college placements. **Students** register, see the drives they are eligible for and apply.
The **Placement Officer** manages companies and drives, approves applications, creates a ranked shortlist,
enters interview round results and publishes the final selection. Students get notifications at every step.

**Technologies:** HTML, CSS, JavaScript (frontend) | Node.js + Express (backend) | MySQL (database) | JWT + bcrypt (security)

---

## 1. Features

**Student**
- Register / login, change password, edit profile (skills and coding-profile links)
- Dashboard with eligible drives, applications, shortlists, selections and upcoming deadlines
- See only the drives published for them, with a clear reason when they are *not eligible*
- Apply to a drive, track status, see shortlist rank, round results and final offer (only after the officer publishes them)
- Notifications

**Placement Officer**
- Dashboard with totals and recent activity
- Companies: add, edit, activate / deactivate, delete (only if it has no drives)
- Drives: create (4 default rounds are added automatically), publish / hide, open / close
- Applications: review, approve, reject; approval is blocked if the student does not meet the rules
- Shortlist: generate (highest CGPA first, then smaller roll number) -> approve -> publish
- Rounds: add custom rounds, enter result and score for each student, publish
- Final results: select with package and offer details, publish
- Student directory with search and filters, edit official CGPA
- Announcements, create another officer, change password

---

## 2. How to run (Windows / Mac / Linux)

You need **Node.js 18 or newer** and **MySQL 8**.

```bash
# 1. Install the libraries
npm install

# 2. Create the database, tables and demo data
#    (opens MySQL, asks for your root password)
mysql -u root -p -e "source database.sql"
#    No mysql command?  Open database.sql in MySQL Workbench and press the Run (lightning) button.

# 3. Open the file  .env  and write YOUR MySQL password:
#    DB_PASSWORD=your_mysql_password

# 4. Start the server
npm start
```

Open **http://localhost:3000** in your browser.

> **Warning:** `database.sql` and `npm run seed` start with `DROP DATABASE` (on the real database). They delete ALL existing data and rebuild the demo data.

### Demo logins

| Role | Button to use | Email | Password |
|---|---|---|---|
| Placement Officer | Officer | `college@campus.edu.in` | `college@123` |
| Student | Student | `22r11a66k3@campus.edu.in` | `22R11A66K3` |

Every student's starting password is their **roll number in CAPITAL letters** (they can change it after login).

### Demo data to show in the viva (already in the database)

When the server starts you should see: `Database connected successfully.`

| Drive | State | What it shows |
|---|---|---|
| TCS (id 1) | Open | Applied / Under Review / Approved / Shortlisted / **Selected** / Rejected students, ranked shortlist, published round scores |
| Infosys, Microsoft, Amazon (2-4) | Open | New applications waiting for officer approval |
| **Wipro (id 5)** | **Past, closed** | 8 applied, 6 shortlisted, **2 selected**, rest rejected, all round scores published |
| **Capgemini (id 6)** | **Past, closed** | 6 applied, 4 shortlisted, **2 selected**, rest rejected |

Students to log in with (Student button, password = roll number in capitals):

| Student / Roll No | Email | Password | Real-Time Process State (What you will see) |
|---|---|---|---|
| **22R11A66P4** (PALLAPU SHIVA SAI RAM) | `22r11a66p4@campus.edu.in` | `22R11A66P4` | **AIML (CGPA 9.60)**: **Selected @ TCS (7.00 LPA)** with official offer letter (`Ref: TCS/2026/DIG-43`), Round 1 Score 98.00, Round 2 Score 97.00, plus **Approved** for Amazon SDE-1 (18 LPA) and **Under Review** for Microsoft Azure Associate (16 LPA). |
| **22R11A66L0** (CHINDAM CHARANYA) | `22r11a66l0@campus.edu.in` | `22R11A66L0` | **AIML (CGPA 9.30)**: **Approved** by Placement Cell for **Infosys Specialist Programmer (9.50 LPA)** & TCS Systems Engineer. Departmental eligibility verified. |
| **22R11A66P8** (SHAIK RAHIMATH ALI) | `22r11a66p8@campus.edu.in` | `22R11A66P8` | **AIML (CGPA 9.00)**: **Shortlisted @ TCS** (Rank #8), cleared Round 1 Online Assessment (Score 86.50), active interview pipeline. Past Wipro drive performance tracking. |
| **22R11A66L3** (CHIPPA ANURAJ) | `22r11a66l3@campus.edu.in` | `22R11A66L3` | **AIML (CGPA 8.90)**: **Under Review** for TCS Systems Engineer (verification queue). Capgemini past drive application history. |
| **22R11A66M2** (GANGI BHANU SREE) | `22r11a66m2@campus.edu.in` | `22R11A66M2` | **AIML (CGPA 8.70)**: **Approved** for TCS Systems Engineer technical rounds. Strong full-stack and machine learning skills. |
| **22R11A66K3** (ADE SRINJA) | `22r11a66k3@campus.edu.in` | `22R11A66K3` | **AIML (CGPA 8.00)**: **Approved** for TCS Systems Engineer. Live application ready for viva demonstration. |

---

## 3. Folder structure

```
placement-portal/
├── server.js              Starts the server and connects all routes
├── database.sql           All tables + demo data (Batch 2022)
├── package.json           Libraries and npm commands
├── .env                   Settings: DB password, JWT secret  (never share this file)
├── .env.example           Template for environment settings
├── .gitignore             Git ignore patterns
├── config/
│   └── db.js              MySQL connection pool
├── middleware/
│   └── auth.js            Login check + role check (student / officer)
├── utils/
│   ├── helpers.js         Eligibility rules, notifications, date helper
│   └── validate.js        Input-checking helpers (isText, isEmail, isNumberBetween ...)
├── routes/                One file per feature (auth, students, companies, drives,
│                          applications, shortlists, rounds, results, notifications)
├── scripts/
│   └── seed.js            Rebuilds the database from database.sql
└── public/                Frontend SPA (index.html, css/style.css, js/*.js)
```

---

## 4. Main business rules

1. Only the officer can create companies, drives, shortlists and results.
2. A student can apply only if: drive is published and open, deadline is not over, CGPA >= minimum, batch and branch match.
3. These rules are checked on the **server**, so they cannot be bypassed from the browser.
4. One student can apply only once to a drive.
5. Shortlist ranking: higher CGPA first; equal CGPA -> smaller roll number first.
6. Shortlists, round results and final results stay hidden until the officer publishes them.
7. Being shortlisted does not mean selected. The officer must record the final decision.
8. Passwords are stored as bcrypt hashes. Every API (except register / login) needs a valid JWT token.

---

## 5. Common problems

| Problem | Solution |
|---|---|
| `Access denied for user 'root'` | Wrong `DB_PASSWORD` in `.env` |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL is not running. Start the MySQL service |
| `Unknown database` | You did not run `database.sql` yet |
| `Port 3000 already in use` | Change `PORT=3001` in `.env` |
| `mysql` is not recognised | Use MySQL Workbench to run `database.sql` |
