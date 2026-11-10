# 🎓 College Placement Management Portal

A web-based **College Placement Management Portal** designed to simplify and automate the college placement process. The system connects students and placement officers through a centralized platform where students can explore placement opportunities, apply for eligible drives, track application progress and view final selections.

Placement officers can manage companies, placement drives, student applications, shortlists, interview rounds and final results through a dedicated dashboard.

---

## 🚀 Key Features

### 👨‍🎓 Student Module

- Student registration and secure login.
- Change password and update profile information.
- Manage skills and coding platform profile links.
- View eligible and published placement drives.
- Check eligibility requirements and reasons for ineligibility.
- Apply for placement opportunities.
- Track application status in real time.
- View shortlist ranking and interview round results.
- Access final selection details and offer information.
- Receive notifications about placement activities.

### 🧑‍💼 Placement Officer Module

- Dedicated placement officer dashboard.
- View placement statistics and recent activities.
- Add, edit, activate and deactivate companies.
- Create and manage placement drives.
- Automatically generate four default interview rounds.
- Publish, hide, open and close placement drives.
- Review, approve and reject student applications.
- Generate ranked shortlists based on academic performance.
- Approve and publish shortlisted candidates.
- Add custom interview rounds.
- Enter student scores and interview results.
- Publish round-wise results.
- Manage final selections and offer details.
- Search and filter the student directory.
- Update official student CGPA.
- Create announcements and additional officer accounts.
- Change account password.

---

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Frontend structure |
| CSS3 | Styling and responsive design |
| JavaScript | Frontend functionality |
| Node.js | Backend runtime |
| Express.js | Backend framework and REST APIs |
| MySQL 8 | Relational database |
| JWT | Authentication and authorization |
| bcrypt | Password hashing |

---

## 🏗️ Project Architecture

The application follows a client-server architecture.

```text
        STUDENT / PLACEMENT OFFICER
                    |
                    ▼
          HTML + CSS + JavaScript
                    |
                    ▼
             NODE.JS SERVER
                    |
                    ▼
              EXPRESS.JS
                    |
          ┌─────────┴─────────┐
          ▼                   ▼
     JWT AUTH             API ROUTES
          |                   |
          └─────────┬─────────┘
                    |
                    ▼
                MYSQL 8
                    |
                    ▼
             DATABASE
```

---

## 📂 Project Structure

```text
placement-portal/
│
├── server.js
├── database.sql
├── package.json
├── .env
├── .env.example
├── .gitignore
│
├── config/
│   └── db.js
│
├── middleware/
│   └── auth.js
│
├── utils/
│   ├── helpers.js
│   └── validate.js
│
├── routes/
│   ├── auth.js
│   ├── students.js
│   ├── companies.js
│   ├── drives.js
│   ├── applications.js
│   ├── shortlists.js
│   ├── rounds.js
│   ├── results.js
│   └── notifications.js
│
├── scripts/
│   └── seed.js
│
└── public/
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        ├── auth.js
        ├── dashboard.js
        └── ...
```

---

## ⚙️ Installation and Setup

### Prerequisites

Install the following software before running the project:

- Node.js 18 or newer
- MySQL 8
- VS Code (recommended)
- Git (optional)

### Step 1: Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

Navigate to the project folder:

```bash
cd placement-portal
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Create the Database

Make sure the MySQL server is running.

Execute the following command:

```bash
mysql -u root -p -e "source database.sql"
```

Enter your MySQL root password when prompted.

**Alternative:** Open `database.sql` in MySQL Workbench and execute the SQL script.

### Step 4: Configure Environment Variables

Create a `.env` file in the project root directory.

Add your database credentials and JWT secret:

```env
PORT=3000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=college_placement_portal
DB_PORT=3306

JWT_SECRET=your_long_random_secret_key
```

Replace the example values with your actual configuration.

**Important:** Never upload `.env` to GitHub. Keep database passwords and JWT secrets private.

### Step 5: Start the Application

```bash
npm start
```

When the database connection is successful, the terminal should display:

```text
Database connected successfully.
```

### Step 6: Open the Application

Open your browser and visit:

**http://localhost:3000**

The College Placement Management Portal is now ready to use.

---

## 🔐 Authentication and Demo Access

The application supports two user roles:

| Role | Access |
|---|---|
| Student | Student dashboard and placement activities |
| Placement Officer | Administrative dashboard and placement management |

Demo accounts are configured in the database seed data.

Use the appropriate login role and the credentials configured for your local installation.

For security, do not publish real student credentials, personal email addresses or roll numbers in a public repository.

---

## 📊 Placement Workflow

The portal follows a structured placement process.

1. **Student Registration:** Students create accounts and complete their profiles.
2. **Drive Creation:** Placement officers add companies and create placement drives.
3. **Drive Publication:** Officers publish placement opportunities.
4. **Eligibility Verification:** The server checks CGPA, batch, branch and deadline requirements.
5. **Application:** Eligible students submit applications.
6. **Application Review:** Officers approve or reject applications.
7. **Shortlist Generation:** The system generates a ranked shortlist.
8. **Interview Process:** Officers conduct interview rounds and enter results.
9. **Final Selection:** Officers record selected candidates and offer details.
10. **Result Publication:** Students receive access to published results and notifications.

---

## 📌 Important Business Rules

- Only authorized placement officers can manage companies, drives and placement results.
- Students can apply only to published and open placement drives.
- Eligibility is verified on the backend.
- Students must satisfy the required CGPA, batch and branch conditions.
- Applications cannot be submitted after the deadline.
- Duplicate applications are prevented.
- Shortlists are ranked using CGPA in descending order.
- If CGPA is equal, the smaller roll number receives priority.
- Shortlists and interview results remain hidden until published by the officer.
- Final selection is controlled by the placement officer.
- Passwords are stored using bcrypt hashing.
- Protected APIs require valid JWT authentication.

---

## 🗄️ Database Information

**Database:** MySQL 8

**Database Name:** `college_placement_portal`

The database manages information related to:

- User authentication and roles.
- Student profiles and academic details.
- Company information.
- Placement drives and eligibility criteria.
- Student applications.
- Shortlists and rankings.
- Interview rounds and results.
- Final selections and offer details.
- Notifications and announcements.

The database schema and initial demo data are provided in `database.sql`.

---

## 🧪 Demo Scenarios

The project includes demonstration data to help understand the placement workflow.

| Company | Drive Status | Demonstration |
|---|---|---|
| TCS | Open | Applications, approvals, shortlist and selection |
| Infosys | Open | Pending applications and eligibility |
| Microsoft | Open | Application review |
| Amazon | Open | Student applications and approval |
| Wipro | Closed | Previous drive results and selections |
| Capgemini | Closed | Previous applications and interview results |

These scenarios help demonstrate the complete placement management process without exposing individual student identities.

---

## ⚠️ Common Problems and Solutions

| Error | Solution |
|---|---|
| `Access denied for user 'root'` | Verify MySQL username and password in `.env`. |
| `ECONNREFUSED 127.0.0.1:3306` | Start the MySQL server. |
| `Unknown database` | Execute `database.sql`. |
| `Port 3000 already in use` | Change the PORT value in `.env`. |
| `mysql is not recognized` | Use MySQL Workbench or configure MySQL in PATH. |
| `Cannot find module` | Run `npm install`. |
| `Invalid JWT Secret` | Configure a sufficiently long JWT secret in `.env`. |

---

## ⚡ Important Database Warning

**Backup your database before running database initialization or seed commands.**

The provided `database.sql` and `npm run seed` may contain `DROP DATABASE` commands that delete existing database contents and recreate the demo database.

Do not execute these commands on a database containing important production data.

---

## 🔮 Future Enhancements

- Email notifications for placement updates.
- Resume upload and automated resume analysis.
- Advanced student skill matching.
- Placement analytics and graphical reports.
- Automated interview scheduling.
- Company-specific placement reports.
- Export placement statistics to PDF and Excel.

---

## 🎯 Project Objective

The main objective of the College Placement Management Portal is to make the college placement process more organized, transparent and efficient.

It reduces manual work for placement officers and provides students with a centralized platform to access placement opportunities and monitor their progress.

---

## 👨‍💻 Project Information

**Project:** College Placement Management Portal

**Domain:** Web Development

**Project Type:** Academic / College Project

**Frontend:** HTML, CSS, JavaScript

**Backend:** Node.js, Express.js

**Database:** MySQL 8

**Authentication:** JWT and bcrypt

---

## 📜 License

This project is developed for academic and educational purposes.

---

<p align="center">
  <b>College Placement Management Portal</b><br>
  Simplifying College Recruitment Through Technology.
</p>