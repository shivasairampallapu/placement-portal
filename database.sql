-- ============================================================================
-- COLLEGE PLACEMENT MANAGEMENT PORTAL - MYSQL DATABASE SCHEMA & SEED DATA
-- Database: college_placement_portal 
-- Technology Stack: HTML5, CSS3, Vanilla JS, Node.js, Express, MySQL, JWT
-- Academic Project: B.Tech 2nd-Year PBL Project
-- ============================================================================

DROP DATABASE IF EXISTS college_placement_portal;

CREATE DATABASE IF NOT EXISTS college_placement_portal
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE college_placement_portal;

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE (Students & Placement Officers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'officer') NOT NULL DEFAULT 'student',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. STUDENT PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  roll_number VARCHAR(50) NOT NULL UNIQUE,
  department VARCHAR(100) NOT NULL,
  graduation_year INT NOT NULL,
  cgpa DECIMAL(4,2) NOT NULL,
  skills TEXT NOT NULL,
  github_url VARCHAR(255) DEFAULT NULL,
  linkedin_url VARCHAR(255) DEFAULT NULL,
  leetcode_url VARCHAR(255) DEFAULT NULL,
  hackerrank_url VARCHAR(255) DEFAULT NULL,
  codechef_url VARCHAR(255) DEFAULT NULL,
  is_profile_complete TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_student_cgpa CHECK (cgpa >= 0.00 AND cgpa <= 10.00),
  CONSTRAINT fk_profile_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_profile_dept_grad (department, graduation_year),
  INDEX idx_profile_cgpa (cgpa),
  INDEX idx_profile_roll (roll_number)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. COMPANIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  website VARCHAR(255) DEFAULT NULL,
  contact_email VARCHAR(150) DEFAULT NULL,
  contact_phone VARCHAR(50) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_company_creator FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_companies_active (is_active)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. PLACEMENT DRIVES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS placement_drives (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  job_title VARCHAR(150) NOT NULL,
  job_description TEXT NOT NULL,
  package_lpa DECIMAL(6,2) NOT NULL,
  location VARCHAR(150) NOT NULL,
  required_skills TEXT NOT NULL,
  min_cgpa DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  eligible_branches VARCHAR(255) NOT NULL,
  graduation_year INT NOT NULL,
  application_deadline DATETIME NOT NULL,
  placement_date DATE NOT NULL,
  status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  shortlist_approved TINYINT(1) NOT NULL DEFAULT 0,
  shortlist_published TINYINT(1) NOT NULL DEFAULT 0,
  results_published TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_drive_min_cgpa CHECK (min_cgpa >= 0.00 AND min_cgpa <= 10.00),
  CONSTRAINT chk_drive_package CHECK (package_lpa >= 0.00),
  CONSTRAINT fk_drive_company FOREIGN KEY (company_id)
    REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_drive_creator FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_drives_published_status (is_published, status),
  INDEX idx_drives_deadline (application_deadline),
  INDEX idx_drives_company (company_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. APPLICATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  drive_id INT NOT NULL,
  student_user_id INT NOT NULL,
  status ENUM('Applied', 'Under Review', 'Approved', 'Shortlisted', 'Selected', 'Rejected', 'Not Eligible') NOT NULL DEFAULT 'Applied',
  officer_remarks TEXT DEFAULT NULL,
  final_result ENUM('Pending', 'Selected', 'Rejected') NOT NULL DEFAULT 'Pending',
  offered_package_lpa DECIMAL(6,2) DEFAULT NULL,
  offer_details VARCHAR(255) DEFAULT NULL,
  result_published TINYINT(1) NOT NULL DEFAULT 0,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT DEFAULT NULL,
  UNIQUE KEY uq_drive_student (drive_id, student_user_id),
  CONSTRAINT fk_app_drive FOREIGN KEY (drive_id)
    REFERENCES placement_drives(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_app_student FOREIGN KEY (student_user_id)
    REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_app_updater FOREIGN KEY (updated_by)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_apps_drive_status (drive_id, status),
  INDEX idx_apps_student (student_user_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. SHORTLISTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shortlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  drive_id INT NOT NULL,
  application_id INT NOT NULL,
  student_user_id INT NOT NULL,
  rank_position INT NOT NULL,
  cgpa_snapshot DECIMAL(4,2) NOT NULL,
  roll_number_snapshot VARCHAR(50) NOT NULL,
  selection_status ENUM('Shortlisted', 'Waitlisted', 'Selected', 'Rejected') NOT NULL DEFAULT 'Shortlisted',
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shortlist_drive_student (drive_id, student_user_id),
  UNIQUE KEY uq_shortlist_application (application_id),
  CONSTRAINT fk_shortlist_drive FOREIGN KEY (drive_id)
    REFERENCES placement_drives(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_shortlist_app FOREIGN KEY (application_id)
    REFERENCES applications(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_shortlist_student FOREIGN KEY (student_user_id)
    REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_shortlist_drive_rank (drive_id, rank_position)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 7. PLACEMENT ROUNDS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS placement_rounds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  drive_id INT NOT NULL,
  round_name VARCHAR(120) NOT NULL,
  round_order INT NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  results_published TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_drive_round_order (drive_id, round_order),
  CONSTRAINT fk_round_drive FOREIGN KEY (drive_id)
    REFERENCES placement_drives(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_rounds_drive_active (drive_id, is_active, round_order)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 8. ROUND RESULTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS round_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  round_id INT NOT NULL,
  drive_id INT NOT NULL,
  application_id INT NOT NULL,
  student_user_id INT NOT NULL,
  status ENUM('Pending', 'Qualified', 'Not Qualified', 'Absent') NOT NULL DEFAULT 'Pending',
  score DECIMAL(6,2) DEFAULT NULL,
  feedback VARCHAR(255) DEFAULT NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  updated_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_round_student (round_id, student_user_id),
  CONSTRAINT fk_rr_round FOREIGN KEY (round_id)
    REFERENCES placement_rounds(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rr_drive FOREIGN KEY (drive_id)
    REFERENCES placement_drives(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rr_application FOREIGN KEY (application_id)
    REFERENCES applications(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rr_student FOREIGN KEY (student_user_id)
    REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_rr_updater FOREIGN KEY (updated_by)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_rr_drive_student (drive_id, student_user_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 9. NOTIFICATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_notif_user_read (user_id, is_read, created_at)
) ENGINE=InnoDB;

-- ============================================================================
-- INITIAL SEED DATA
-- ============================================================================

-- 1. Placement Officer Account (Default Credentials: college@campus.edu.in / college@123)
INSERT INTO users (id, full_name, email, password_hash, role, is_active) VALUES
(1, 'Placement Cell Officer', 'college@campus.edu.in', '$2a$10$P/5TD919aD.6HVwTyBmu2.CD1zIlLkbDojZIWP9VP/IgxK0m7sP62', 'officer', 1);

-- 2. Real Engineering Students (Users Table)
INSERT INTO users (id, full_name, email, password_hash, role, is_active) VALUES
(3, 'ADE SRINJA', '22r11a66k3@campus.edu.in', '$2a$10$nS4a0wo8ii3/8GOhuyatbO4XZY2fW/LA3S5M8C/Dzz05o/WGZRACC', 'student', 1),
(4, 'AELPULA HASINI', '22r11a66k4@campus.edu.in', '$2a$10$YzECmJpNG8sSsjweiDNA2Oywky8PCAzzt720//fBmIFNcaPVYWwWC', 'student', 1),
(5, 'AKOJU HARSHINI', '22r11a66k5@campus.edu.in', '$2a$10$TclWuSRdUZO5rER2aT37v./xmgh9/lNmtvv.E6qGfvFQWDViBK6d6', 'student', 1),
(6, 'ALLA LEKHYA REDDY', '22r11a66k6@campus.edu.in', '$2a$10$MfW8FFbu3yyjnspmRR6cTeFvBqGRdNcAk/tFzhe2IehQIFejJ2XeW', 'student', 1),
(7, 'BAIRI BHARATH', '22r11a66k7@campus.edu.in', '$2a$10$3izyjF5c0nl/TovgXr4AMemAvZqldq0ERK52lq5sfSKPJxcNFHbxq', 'student', 1),
(8, 'CHALLA ABHIRAM', '22r11a66k8@campus.edu.in', '$2a$10$ohJr1u.zbXn3ZgZ8pe4mF.9XLqzhmVVjyv.oM.sL2Dkg2fKuZjki.', 'student', 1),
(9, 'CHALLA CHAITRA', '22r11a66k9@campus.edu.in', '$2a$10$6uOKWwlJ.L//32J/6PWYf.I0tqDabgr5Iet8AU3ERwiJpYJ.cphjO', 'student', 1),
(10, 'CHINDAM CHARANYA', '22r11a66l0@campus.edu.in', '$2a$10$HVP4nuX1CHaRoFlV8HXOzewEGH..JirYdrwZbt8qrF9.YisBHplKa', 'student', 1),
(11, 'CHINDAM SAHASRA ARORA', '22r11a66l1@campus.edu.in', '$2a$10$ZdDdCHSF7MZAjGd6uWW3UuTTtmzwQALzSmkkPc1bozeQYaU9WAIoW', 'student', 1),
(12, 'CHINTLA NEHA REDDY', '22r11a66l2@campus.edu.in', '$2a$10$w16Fh4hw0guEIStepc43ae/wi3qdrysqNmTQGV/yw.oFj0vB3M8WW', 'student', 1),
(13, 'CHIPPA ANURAJ', '22r11a66l3@campus.edu.in', '$2a$10$M17v14AjdvjER/E2BZeXXOW4F30XMA4JZPLYSRiMD1LvjjLt4YWAS', 'student', 1),
(14, 'D ADITI', '22r11a66l4@campus.edu.in', '$2a$10$pzMYaxeU2dbxg0ub9WaDtesONEWf6w/nQpa2iaC.K9W7JHPc5invm', 'student', 1),
(15, 'DHARAVATH SRAVAN', '22r11a66l6@campus.edu.in', '$2a$10$qNUhcI1p4Jf28WJPbtVbAeLViUpAiiwZQoHXJgTajK1cNcH/dNj9W', 'student', 1),
(16, 'DYAPA BHAVYA SAGAR', '22r11a66l7@campus.edu.in', '$2a$10$a9kg9.KuoxolBXX5URINTO9XOIPn.OsWpyXQAHNUYuMZLIMBjtWTq', 'student', 1),
(17, 'ELLA VINODH KUMAR', '22r11a66l8@campus.edu.in', '$2a$10$Q5qSpT0VxrGwalDec9Y60OlaDlcKW6HsEbwLjc656M.uqzPFIdXui', 'student', 1),
(18, 'GADDAM SAI PHANEENDRA REDDY', '22r11a66l9@campus.edu.in', '$2a$10$IqOH0CCVL0M0s2EP85J2iekrqWOSD8F2fD24js9lgrbLADF8Lp51.', 'student', 1),
(19, 'GAJULA DIVYANJALI', '22r11a66m0@campus.edu.in', '$2a$10$WZAtEGQMoPeusBbE7HFA8O2JyRTm5UWjilZ9vWCKU44g4u287vUS2', 'student', 1),
(20, 'GANDRA AKSHARA', '22r11a66m1@campus.edu.in', '$2a$10$pOPYuToLj6OH8DdRt5zjDe.sk6J0lX2icLyVPYYQqokx1H5CP/g4G', 'student', 1),
(21, 'GANGI BHANU SREE', '22r11a66m2@campus.edu.in', '$2a$10$K9hcJI8lxQFp0O9FZqYyb.BxmzzJaTwhdmTsELySxr4..8lLxeqwK', 'student', 1),
(22, 'GATADI RISHITHA', '22r11a66m3@campus.edu.in', '$2a$10$YigqWQpt.hJtj3sdVfc3rOwB6wcpKQnPbMYGJDVKSPLb5U9MtdqJ6', 'student', 1),
(23, 'GOLLAPALLY SHIVANI', '22r11a66m4@campus.edu.in', '$2a$10$VfWl/qeoGReXXYFcNiyVbOAzzJlxaczIwU3sjhYFcUHB05CJkIJXu', 'student', 1),
(24, 'GOSIKA YASHWANTH', '22r11a66m5@campus.edu.in', '$2a$10$vk1XNHXtMUEVCYtVBVHvrOncmStKFSvA2kc18mudXme6At75pZvbm', 'student', 1),
(25, 'GUGULOTH MOVITH', '22r11a66m6@campus.edu.in', '$2a$10$Rx4u0rd8biurCA5sr5n.FOXbl9rnK9glMnBd7XfPWBiWDDEMgckqm', 'student', 1),
(26, 'JAKKULA TARUN', '22r11a66m7@campus.edu.in', '$2a$10$7RVUUDgZMFuINqIFXHw.Fu9xFltSYL4u8qQqJ.LvNTI6kyea86t2.', 'student', 1),
(27, 'JATOTH ARUN NAIK', '22r11a66m8@campus.edu.in', '$2a$10$2Xf/JFlk1u.yc0Q.wlNsS..2aY6XiLHjjYjgHvRg7LUh2fO/8f5TS', 'student', 1),
(28, 'KANCHEMREDDY VARSHITHA', '22r11a66m9@campus.edu.in', '$2a$10$Gvtg5zsyL.c3qM15P1bhTe4R23Ahcd4tfKGkUyk/8pqzVMu2Rb6Vq', 'student', 1),
(29, 'KANDALOJU HASINI', '22r11a66n0@campus.edu.in', '$2a$10$S1nfGEJYhr9.if7NlnAbIOswqMinRg24jl3JGrNsnE5NRi7fVLwSO', 'student', 1),
(30, 'KAPARTHI PRANAV', '22r11a66n1@campus.edu.in', '$2a$10$J0pM1prDOWroUMr01FSrXu1swbkiRBIgj7UhZHhDd.vhv5RUbKDDK', 'student', 1),
(31, 'KEERTHANA ODELA', '22r11a66n2@campus.edu.in', '$2a$10$tlXgx1r/22Sk1Vw0FENEj.8QiXJVUkl.AckAhKeQeKLfZ1pV2ozwy', 'student', 1),
(32, 'KOPPARTHY TEJ ABHIRAM', '22r11a66n3@campus.edu.in', '$2a$10$wMvi5WJvXNtd37J251RTDuvvqpwHiUkvv2DWp608LeH/AOSSwlfmG', 'student', 1),
(33, 'KOTHAKONDA RACHITH', '22r11a66n4@campus.edu.in', '$2a$10$Qj0BcTnk2/DXs.x7LerPHO/0Nq1xUDbONxQmfxi9c/wSfdXT07w7O', 'student', 1),
(34, 'LAVUDYA ANJAN KUMAR', '22r11a66n5@campus.edu.in', '$2a$10$t8U.BO3AlxR8wokjnjVNtePvNZfssiDJLlltc1KalJQRnno6jF/ey', 'student', 1),
(35, 'MADASU MANISHWANTH', '22r11a66n6@campus.edu.in', '$2a$10$G1QKGrYGWc.aV6dLurLh/OsfWxFZIP6p.JVwVKWp4kzlXEMjobwwm', 'student', 1),
(36, 'MARYADA LOKESH REDDY', '22r11a66n7@campus.edu.in', '$2a$10$2KVaFZptXqK81qhWC0h5k.glQkOy56Q/C6BHEcX0wgP0jHnMTtctC', 'student', 1),
(37, 'MEGHANA REDDY VALLELA', '22r11a66n8@campus.edu.in', '$2a$10$EHXvedzY/CdEGr391s4HP.Cnr9DN27Srj0TWW/LCeiAL.qtD1fSTi', 'student', 1),
(38, 'MOGILI ANAND KISHORE', '22r11a66n9@campus.edu.in', '$2a$10$ehoK.4UMH5cEtq6WX.qO/OKHtck1KEjWcRpXzhNYEZ4RIIt5a3.6.', 'student', 1),
(39, 'MOHAMMED TAFAZZUL AHMED', '22r11a66p0@campus.edu.in', '$2a$10$IBuTUSYQ.QZ/CQyD6C2xYOJ5yiCGAwPw1E1D90uvQNnExhTXAhph2', 'student', 1),
(40, 'MUNAVATH SANDEEP', '22r11a66p1@campus.edu.in', '$2a$10$5zZXXVXtypjoGGSyFl3r6uRqBu4jFBtn6rBpLNLv1RuzUCPsAkCwS', 'student', 1),
(41, 'MURATHOTA JAYAKAR EMMANUEL', '22r11a66p2@campus.edu.in', '$2a$10$gyaoCQ6R8gPL.PwF.pWDuu4moaSKA9SJDC7VkZjmty5P2XLfj1U0K', 'student', 1),
(42, 'NEIL BENEDICT', '22r11a66p3@campus.edu.in', '$2a$10$o2f3vO4WyHy3/IRxHxOHWOH2Rx6xFGkdGHKHUYERc25GLDWAy8HxG', 'student', 1),
(43, 'PALLAPU SHIVA SAI RAM', '22r11a66p4@campus.edu.in', '$2a$10$Fqz3z9RsoHC7S5sx3fIV6uQ2l1JmeLye9Mq.T8WqHATfpd231FWPy', 'student', 1),
(44, 'PANCHALINGALA SHIVAPRAVALIKA', '22r11a66p5@campus.edu.in', '$2a$10$TThiqHr5Ch6SocjP7pKPhuC8NuUQpi0/Y3s/pZm6jLh7K3lcqM3HO', 'student', 1),
(45, 'PINEPE THANUJA', '22r11a66p6@campus.edu.in', '$2a$10$cDTJ3EDHB0Mn1vKjzQcGxunxRfNJliAKYZ.YrZNUNp/vRWnZnvg5y', 'student', 1),
(46, 'SATRASALA SARAVANA SRINIVAS', '22r11a66p7@campus.edu.in', '$2a$10$63eCWd62Ex2uM7B6jATWbOy7GBZMr2ZF/ALMfb1fES58PdGbQI6se', 'student', 1),
(47, 'SHAIK RAHIMATH ALI', '22r11a66p8@campus.edu.in', '$2a$10$prPkeEVUiScPuy159WMwo.o6/mvq8jfN58LRCx5nBDvwWOVd2m4IS', 'student', 1),
(48, 'T MANJULA', '22r11a66p9@campus.edu.in', '$2a$10$8n6EdzmdrshVeo4TBkA5g.kqr8kdKKlMq2SazeGgMhTDa/TnXlpJC', 'student', 1),
(49, 'TALLAPALLY SPANDHANA', '22r11a66q0@campus.edu.in', '$2a$10$q69pgNYjsyxm5LMla0iHneeeDYT2q/k7XBWdKRaZ8c.ILJAWCQW.e', 'student', 1),
(50, 'THAKUR MOKSHA SRI SAI', '22r11a66q1@campus.edu.in', '$2a$10$sBvE9qtDnknXr9DT1kHSpejsZz9pQyEPHBAk2t5KeRzH9GqAfAv2W', 'student', 1),
(51, 'THANNEERU POOJITHA', '22r11a66q2@campus.edu.in', '$2a$10$Pi6JLS5ri3BsqYttnbK4HOQXt.pVPOKrQRCwhW/jaAII9S.KpveVC', 'student', 1),
(52, 'THOGITE RAJENDER REDDY', '22r11a66q3@campus.edu.in', '$2a$10$iyBzr0Wc13ZDgUQ/s9ik2uXymsSwycLVvhWq.dPwww26b9uPtPJg.', 'student', 1),
(53, 'THONDA GANESH', '22r11a66q4@campus.edu.in', '$2a$10$dcBOeFksgTq2IVVBvBIi4eHicIjJEE.l9fLxMwMND.2end2XLpaC.', 'student', 1),
(54, 'UMESH CHANDRA MADUPALLI', '22r11a66q6@campus.edu.in', '$2a$10$0xNWRaypbHHVaeOWB.mZXOhgnIlsv1/uFafLdVq.1/rtZA2d6Ly6y', 'student', 1),
(55, 'UPPALWAR AKHILESH', '22r11a66q7@campus.edu.in', '$2a$10$TH4s2V5IoxLEP.9.Vs2mc.U4rauz8L39rGtw4YkOpDx7Tps6TO2ZS', 'student', 1),
(56, 'VADDE SUSHMA', '22r11a66q8@campus.edu.in', '$2a$10$kf0Qu5HtEfWhor1nekt/EeiawuFNS7t9CVsukbM6Fhl59kqSOb1QW', 'student', 1),
(57, 'VALA SAHITHI', '22r11a66q9@campus.edu.in', '$2a$10$TjT9XPf8gniM48vsN2vihO3MqOLBkzPYACAtaZWACHehZS5gLsOF.', 'student', 1),
(58, 'VALLAPINNI NIDHI KEERTHANA', '22r11a66r0@campus.edu.in', '$2a$10$93YoLtltJ3ARzm.AuaMJdO7x4BNQvwsd/BAwWxAj7zs3KcDjRo1t.', 'student', 1),
(59, 'VANGA ANVITHA REDDY', '22r11a66r1@campus.edu.in', '$2a$10$g0u/1lmtssCLGJm1fL0W4Ofs8niIBmwTmfeV.Vqnz/StaYJuWdxH.', 'student', 1),
(60, 'VEDIRE AKHIL REDDY', '22r11a66r2@campus.edu.in', '$2a$10$63k0fNc0/zs1bi/vwG5r2uJbGe.hyNfaoJGXC0IRMXqRziFVybJlO', 'student', 1),
(61, 'YALAKA SHANDUKAR REDDY', '22r11a66r3@campus.edu.in', '$2a$10$/8y1/zeFRZMMQXF2yGSnzuXN0SCmPJJgnn7PRQYfloC30cPLEcFpu', 'student', 1),
(62, 'YALAMURI POOJITHA KRISHNA', '22r11a66r4@campus.edu.in', '$2a$10$9neyEVAazsjdFtQrQF5CTegPzmtw3dqkJANp/D7EdwJadotr0si1G', 'student', 1),
(63, 'YEDDULA GANGA HARSHINI', '22r11a66r7@campus.edu.in', '$2a$10$PJ6DeJpP.ZJCUI1iOgU6Xer9psyooWU7v1telwqJ8m.cam3YfaXl2', 'student', 1),
(64, 'YENIGALLA ANVESH', '22r11a66r6@campus.edu.in', '$2a$10$A4LUaV9Y0PsDmxBR0RAFeuax5iAeWdgpXhV2nKrnJMxIMfhtbekHC', 'student', 1),
(65, 'DAVALA KEERTHANA', '26r15a6622@campus.edu.in', '$2a$10$hiHoHnFVSe7Ls.nPY2o0OeeQ1TQleHRIsNzMplE6XFsy3zryeIoGi', 'student', 1),
(66, 'GUNDAMALA BHARATH', '26r15a6623@campus.edu.in', '$2a$10$ukRXGvTBPXatZXUaCJYbPeCQCnMztP71.kIkKyflL7OtNgrwq1aQG', 'student', 1),
(67, 'MOHAMMAD PARWEEZ', '26r15a6624@campus.edu.in', '$2a$10$p1udJarhWCp1RLwmsfWKH.JoZ7aub4oj88tpiBFwRlKdWLG2dBY72', 'student', 1),
(68, 'PENDEM RAJESH', '26r15a6625@campus.edu.in', '$2a$10$18fZWyIHUhbtS84hmCvE1.r6mNgcRwd34KELJ6GpLvTRsLKLSn1F6', 'student', 1),
(69, 'SHAIK KHASEEM', '26r15a6626@campus.edu.in', '$2a$10$IA5aIEAwyoyx9yu2/jXvAOcOEnps/a1u3fBfv7lBn5/AR4kBy.Qqy', 'student', 1),
(70, 'BEGARI SHARA', '26r15a6627@campus.edu.in', '$2a$10$KOLfSNUas6ZEve20DnYQpeYOduGmYzE1Tr.e7aSr34GwlCYrvrdBq', 'student', 1),
(71, 'VUPPALA SAI TEJA', '22r11a6701@campus.edu.in', '$2a$10$nXo49dR/qnQlg0neljJ7oef8KY3bh.S8kv7DMhwbZoIza2bphjsUq', 'student', 1),
(72, 'KONDURU SRIKANTH', '22r11a6702@campus.edu.in', '$2a$10$C8nT4ky2J2SppbaiMkOpa.ZyFkK94KvIIrBnz7qH9akD0NORObsz2', 'student', 1),
(73, 'BURRA ROHITH KUMAR', '22r11a6703@campus.edu.in', '$2a$10$RPoj7A4vPOfAZUMoMmezxeApoUwsM5FGiIhJCzHSSh.MrIsO3j1Za', 'student', 1),
(74, 'NALLA SHRAVANI', '22r11a6704@campus.edu.in', '$2a$10$AbESqISZjdYHOYCiNvRYwu/pjjKAD0UbZp00/xYYwMF2n.RbY7KpG', 'student', 1),
(75, 'CHILUKURI NIKHIL', '22r11a6705@campus.edu.in', '$2a$10$JLMlnt8agpGdFT9Y59/dcugjVpQVFlkWimMeCv.FBrhhgSRr0GM6O', 'student', 1),
(76, 'MOHAMMED REHAN', '22r11a6706@campus.edu.in', '$2a$10$xiGWeSwumfbDVF7hoTqk.OVCbLetHRWcL.nn1K.g6ZqiuBMWQfHIW', 'student', 1),
(77, 'GANDHAM POOJITHA', '22r11a6707@campus.edu.in', '$2a$10$6BnEkSiEfxg9DGejq8.g1egAP3eblCpDjeyKkZjn2vhY0oxAF/hRe', 'student', 1),
(78, 'KOTHA RAKESH', '22r11a6708@campus.edu.in', '$2a$10$yE2a.gM5gTGJFeT.DSnDvuAgNQjHooznU2dlPEU2zCisZuRRkHSbm', 'student', 1),
(79, 'PINDI VAISHNAVI', '22r11a6709@campus.edu.in', '$2a$10$iYcs3jxGXO1ZZhxRl2IV0.R3QMgkNLdIFXAdkB9jqvipNlC5jcPaa', 'student', 1),
(80, 'DUDAM VAMSHI KRISHNA', '22r11a6710@campus.edu.in', '$2a$10$rOxujhRUedstf18/WEZs7uZ5MSp6dydqxsRnaVIXDrRz.rYsuRSWO', 'student', 1),
(81, 'BANOTH NARESH', '22r11a6711@campus.edu.in', '$2a$10$tYPlUd3V6pHLOuJrgqlee.8LG80YmuOiV8.9KDEU/m46YmXymqSU6', 'student', 1),
(82, 'REGATTI MANISHA', '22r11a6712@campus.edu.in', '$2a$10$YC8fiePYhF4tEdFwJnxOeuWeGIvTjwpkQIqrfH5VPYJBIVPwCK3py', 'student', 1),
(83, 'KOMATIREDDY HARSHITHA', '22r11a6713@campus.edu.in', '$2a$10$8fn5gO7bXcGRhzFY7Nj5UeYDqoWCLyn1tNWdqW64.JWBvYg0LHuxa', 'student', 1),
(84, 'ENUGULA SHIVA KUMAR', '22r11a6714@campus.edu.in', '$2a$10$XqmG9E2jUzStAzTXJKThyeUBghtGmejsBsCDZnAhUillgnn6YlU76', 'student', 1),
(85, 'MARAMREDDY ABHINAV', '22r11a6715@campus.edu.in', '$2a$10$mfcfyW/eqPA4BObqqWKp/uT3pt2w8LftWYymJNdHpD8FmEfT9fwNO', 'student', 1),
(86, 'BHEEMREDDY SNEHA', '22r11a6716@campus.edu.in', '$2a$10$8jBGmDw1WhKh1PTcplEoDOnNyC6gQlCznHC3WaXUFBf9IT.C2uyFi', 'student', 1),
(87, 'THUMMA MANIKANTA', '22r11a6717@campus.edu.in', '$2a$10$.wT8OSxJWcbX8vsfbLzC0.yhTy49wKB9cmQPuBLhqUfqX/lgUFk2.', 'student', 1),
(88, 'SAMUDRALA PRANAY', '22r11a6718@campus.edu.in', '$2a$10$22RvzBqsDY2b9Gy1zEZd/eqe5s9oC0nbq1oxvHx6O88uW0nOCQ99K', 'student', 1),
(89, 'GUDURU NAVYA SREE', '22r11a6719@campus.edu.in', '$2a$10$XD7ZF1n7unRYwczVXhNn6O5oaLksuj0ac6EQOB6vXiQh3qBPMUmxm', 'student', 1),
(90, 'CHERUKU MADHUKAR', '22r11a6720@campus.edu.in', '$2a$10$zyPhiwzvYfQuxldKObRq7OQ/JyX4KDlv.rnnWTgF3K4idwmTUg6tq', 'student', 1),
(91, 'KOTA VINAY', '22r11a6721@campus.edu.in', '$2a$10$d6AH5bAo1.yNszWmMYq7BeXzOeeNyloXi558KomPh9VDeLEX0t57C', 'student', 1),
(92, 'PEDDINTI KAVYA', '22r11a6722@campus.edu.in', '$2a$10$GQjaP91yTe45LkSFNhfPPuTTGw7pUA3yWJm2kXkNrsXJeXiRFGg.e', 'student', 1),
(93, 'GUNTURU DINESH', '22r11a6723@campus.edu.in', '$2a$10$Fn1r5VYPGTZJpLocAm1ZjuwKqFn9jQXLosPfNVwn2t8MMyvFznWWa', 'student', 1),
(94, 'MAMIDI SWETHA', '22r11a6724@campus.edu.in', '$2a$10$OLbpC8DauKBWtQaG2keZtOLDAv2KAcyO41lefi091VwWgi.JkZHBO', 'student', 1),
(95, 'RAPARTHI VIVEK', '22r11a6725@campus.edu.in', '$2a$10$FLtHaPYrddsi0vf2dNRyO.5wNvAyTErgsVo1J4kOo8KEJHVDS58oC', 'student', 1),
(96, 'BASANI ANUDEEP', '22r11a6726@campus.edu.in', '$2a$10$RblagMqWzoy/2PNmYQcKWuzAXF27nqTeX2g.F17ccYZ7xTe9tcQAK', 'student', 1),
(97, 'SINGAMSETTY ANUSHA', '22r11a6727@campus.edu.in', '$2a$10$GpHiSoktSECL69HE9eQjS.b7/bvIPM4z5ve8CnKuhpqf21zy.VOji', 'student', 1),
(98, 'KUNCHAM SRAVANTHI', '22r11a6728@campus.edu.in', '$2a$10$9csKQBcobXg0lAGrT.AIXe5Gq9aP2p4Wb8WJmp5uEvKRvePblN4sG', 'student', 1),
(99, 'BODDU HARISH', '22r11a6729@campus.edu.in', '$2a$10$Gz/.peRjNMKHxZqn82nI3OfICFZ7X7WmcwygQPK1mJsyAETJkw4ey', 'student', 1),
(100, 'VEMULA SAI KRISHNA', '22r11a6730@campus.edu.in', '$2a$10$/M1tKe/98B6seZq2L4r8ou9LT1JZWXtl6uL/BRuxlK2pPzG5IHZu.', 'student', 1),
(101, 'NUKALA SOWMYA', '22r11a6731@campus.edu.in', '$2a$10$l6.W0c6nqeQCCyxFcXq1BuxKMrUEzQSxLvs1.LSO.XEoeBCI1B996', 'student', 1);

-- 3. Student Profiles for Real Students
INSERT INTO student_profiles 
(user_id, roll_number, department, graduation_year, cgpa, skills, github_url, linkedin_url, leetcode_url, hackerrank_url, codechef_url, is_profile_complete)
VALUES
(3, '22R11A66K3', 'AIML', 2022, 8.00, 'Python, C++, SQL, Machine Learning, HTML/CSS, Spring Boot', 'https://github.com/22r11a66k3', 'https://linkedin.com/in/22r11a66k3', 'https://leetcode.com/u/22r11a66k3', 'https://hackerrank.com/profile/22r11a66k3', 'https://codechef.com/users/22r11a66k3', 1),
(4, '22R11A66K4', 'AIML', 2022, 8.6, 'Python, TensorFlow, Machine Learning, Scikit-Learn, SQL, Pandas', 'https://github.com/22r11a66k4', 'https://linkedin.com/in/22r11a66k4', 'https://leetcode.com/u/22r11a66k4', 'https://hackerrank.com/profile/22r11a66k4', 'https://codechef.com/users/22r11a66k4', 1),
(5, '22R11A66K5', 'EEE', 2022, 8.15, 'MATLAB, Simulink, Power Systems, Arduino, C++, Microcontrollers', 'https://github.com/22r11a66k5', 'https://linkedin.com/in/22r11a66k5', 'https://leetcode.com/u/22r11a66k5', 'https://hackerrank.com/profile/22r11a66k5', 'https://codechef.com/users/22r11a66k5', 1),
(6, '22R11A66K6', 'AIDS', 2022, 8.78, 'Python, Data Analytics, Power BI, SQL, Machine Learning, Tableau', 'https://github.com/22r11a66k6', 'https://linkedin.com/in/22r11a66k6', 'https://leetcode.com/u/22r11a66k6', 'https://hackerrank.com/profile/22r11a66k6', 'https://codechef.com/users/22r11a66k6', 1),
(7, '22R11A66K7', 'ECE', 2022, 7.4, 'Embedded C, Verilog HDL, MATLAB, Microcontrollers, VLSI, IoT', 'https://github.com/22r11a66k7', 'https://linkedin.com/in/22r11a66k7', 'https://leetcode.com/u/22r11a66k7', 'https://hackerrank.com/profile/22r11a66k7', 'https://codechef.com/users/22r11a66k7', 1),
(8, '22R11A66K8', 'MECH', 2022, 7.65, 'AutoCAD, SolidWorks, ANSYS, GD&T, CNC Basics, Python', 'https://github.com/22r11a66k8', 'https://linkedin.com/in/22r11a66k8', 'https://leetcode.com/u/22r11a66k8', 'https://hackerrank.com/profile/22r11a66k8', 'https://codechef.com/users/22r11a66k8', 1),
(9, '22R11A66K9', 'CIVIL', 2022, 7.85, 'AutoCAD Civil, STAAD.Pro, Revit, Structural Analysis, Total Station', 'https://github.com/22r11a66k9', 'https://linkedin.com/in/22r11a66k9', 'https://leetcode.com/u/22r11a66k9', 'https://hackerrank.com/profile/22r11a66k9', 'https://codechef.com/users/22r11a66k9', 1),
(10, '22R11A66L0', 'AIML', 2022, 9.30, 'Python, Java, Business Analytics, SQL, Cloud Computing, REST APIs', 'https://github.com/22r11a66l0', 'https://linkedin.com/in/22r11a66l0', 'https://leetcode.com/u/22r11a66l0', 'https://hackerrank.com/profile/22r11a66l0', 'https://codechef.com/users/22r11a66l0', 1),
(11, '22R11A66L1', 'CSE', 2022, 8.8, 'Python, Machine Learning, Java, React, SQL, Git', 'https://github.com/22r11a66l1', 'https://linkedin.com/in/22r11a66l1', 'https://leetcode.com/u/22r11a66l1', 'https://hackerrank.com/profile/22r11a66l1', 'https://codechef.com/users/22r11a66l1', 1),
(12, '22R11A66L2', 'AIML', 2022, 8.65, 'Python, Deep Learning, PyTorch, Computer Vision, SQL', 'https://github.com/22r11a66l2', 'https://linkedin.com/in/22r11a66l2', 'https://leetcode.com/u/22r11a66l2', 'https://hackerrank.com/profile/22r11a66l2', 'https://codechef.com/users/22r11a66l2', 1),
(13, '22R11A66L3', 'AIML', 2022, 8.90, 'IoT Sensors, Arduino, ESP32, Python, MQTT, C++', 'https://github.com/22r11a66l3', 'https://linkedin.com/in/22r11a66l3', 'https://leetcode.com/u/22r11a66l3', 'https://hackerrank.com/profile/22r11a66l3', 'https://codechef.com/users/22r11a66l3', 1),
(14, '22R11A66L4', 'AIDS', 2022, 8.9, 'Python, Data Structures, Machine Learning, SQL, Big Data Basics', 'https://github.com/22r11a66l4', 'https://linkedin.com/in/22r11a66l4', 'https://leetcode.com/u/22r11a66l4', 'https://hackerrank.com/profile/22r11a66l4', 'https://codechef.com/users/22r11a66l4', 1),
(15, '22R11A66L6', 'EEE', 2022, 7.45, 'Electrical Machines, Control Systems, MATLAB, PLC, C', 'https://github.com/22r11a66l6', 'https://linkedin.com/in/22r11a66l6', 'https://leetcode.com/u/22r11a66l6', 'https://hackerrank.com/profile/22r11a66l6', 'https://codechef.com/users/22r11a66l6', 1),
(16, '22R11A66L7', 'ECE', 2022, 8.1, 'Digital Electronics, Verilog, Embedded Systems, Python, C', 'https://github.com/22r11a66l7', 'https://linkedin.com/in/22r11a66l7', 'https://leetcode.com/u/22r11a66l7', 'https://hackerrank.com/profile/22r11a66l7', 'https://codechef.com/users/22r11a66l7', 1),
(17, '22R11A66L8', 'IT', 2022, 6.2, 'HTML, CSS, JavaScript, SQL, Web Basics, Bootstrap', 'https://github.com/22r11a66l8', 'https://linkedin.com/in/22r11a66l8', 'https://leetcode.com/u/22r11a66l8', 'https://hackerrank.com/profile/22r11a66l8', 'https://codechef.com/users/22r11a66l8', 1),
(18, '22R11A66L9', 'MECH', 2022, 7.7, 'AutoCAD, SolidWorks, Thermodynamics, 3D Printing, Python', 'https://github.com/22r11a66l9', 'https://linkedin.com/in/22r11a66l9', 'https://leetcode.com/u/22r11a66l9', 'https://hackerrank.com/profile/22r11a66l9', 'https://codechef.com/users/22r11a66l9', 1),
(19, '22R11A66M0', 'CIVIL', 2022, 8.4, 'STAAD.Pro, AutoCAD, Surveying, Project Management, MS Excel', 'https://github.com/22r11a66m0', 'https://linkedin.com/in/22r11a66m0', 'https://leetcode.com/u/22r11a66m0', 'https://hackerrank.com/profile/22r11a66m0', 'https://codechef.com/users/22r11a66m0', 1),
(20, '22R11A66M1', 'CSBS', 2022, 8.85, 'Python, Financial Analytics, SQL, Java, Enterprise Systems', 'https://github.com/22r11a66m1', 'https://linkedin.com/in/22r11a66m1', 'https://leetcode.com/u/22r11a66m1', 'https://hackerrank.com/profile/22r11a66m1', 'https://codechef.com/users/22r11a66m1', 1),
(21, '22R11A66M2', 'AIML', 2022, 8.70, 'Java, Spring Boot, MySQL, Data Structures, Git, REST APIs', 'https://github.com/22r11a66m2', 'https://linkedin.com/in/22r11a66m2', 'https://leetcode.com/u/22r11a66m2', 'https://hackerrank.com/profile/22r11a66m2', 'https://codechef.com/users/22r11a66m2', 1),
(22, '22R11A66M3', 'AIML', 2022, 8.62, 'Python, NLP, Scikit-Learn, TensorFlow, SQL, Data Visualization', 'https://github.com/22r11a66m3', 'https://linkedin.com/in/22r11a66m3', 'https://leetcode.com/u/22r11a66m3', 'https://hackerrank.com/profile/22r11a66m3', 'https://codechef.com/users/22r11a66m3', 1),
(23, '22R11A66M4', 'IOT', 2022, 8.25, 'Embedded C, IoT Protocols, Raspberry Pi, Python, MySQL', 'https://github.com/22r11a66m4', 'https://linkedin.com/in/22r11a66m4', 'https://leetcode.com/u/22r11a66m4', 'https://hackerrank.com/profile/22r11a66m4', 'https://codechef.com/users/22r11a66m4', 1),
(24, '22R11A66M5', 'AIDS', 2022, 7.95, 'Python, Pandas, NumPy, Power BI, SQL, Machine Learning', 'https://github.com/22r11a66m5', 'https://linkedin.com/in/22r11a66m5', 'https://leetcode.com/u/22r11a66m5', 'https://hackerrank.com/profile/22r11a66m5', 'https://codechef.com/users/22r11a66m5', 1),
(25, '22R11A66M6', 'EEE', 2022, 7.7, 'Power Electronics, MATLAB, Microcontrollers, Arduino, C', 'https://github.com/22r11a66m6', 'https://linkedin.com/in/22r11a66m6', 'https://leetcode.com/u/22r11a66m6', 'https://hackerrank.com/profile/22r11a66m6', 'https://codechef.com/users/22r11a66m6', 1),
(26, '22R11A66M7', 'IT', 2022, 8.12, 'Java, Python, Web Development, MySQL, Linux, Git', 'https://github.com/22r11a66m7', 'https://linkedin.com/in/22r11a66m7', 'https://leetcode.com/u/22r11a66m7', 'https://hackerrank.com/profile/22r11a66m7', 'https://codechef.com/users/22r11a66m7', 1),
(27, '22R11A66M8', 'ECE', 2022, 7.6, 'Digital Signal Processing, Embedded C, MATLAB, VLSI Basics', 'https://github.com/22r11a66m8', 'https://linkedin.com/in/22r11a66m8', 'https://leetcode.com/u/22r11a66m8', 'https://hackerrank.com/profile/22r11a66m8', 'https://codechef.com/users/22r11a66m8', 1),
(28, '22R11A66M9', 'MECH', 2022, 8.75, 'SolidWorks, ANSYS Mechanical, AutoCAD, Python, Mechatronics', 'https://github.com/22r11a66m9', 'https://linkedin.com/in/22r11a66m9', 'https://leetcode.com/u/22r11a66m9', 'https://hackerrank.com/profile/22r11a66m9', 'https://codechef.com/users/22r11a66m9', 1),
(29, '22R11A66N0', 'CIVIL', 2022, 8.48, 'Revit, AutoCAD, Structural Design, Concrete Technology, GIS', 'https://github.com/22r11a66n0', 'https://linkedin.com/in/22r11a66n0', 'https://leetcode.com/u/22r11a66n0', 'https://hackerrank.com/profile/22r11a66n0', 'https://codechef.com/users/22r11a66n0', 1),
(30, '22R11A66N1', 'CSBS', 2022, 8.38, 'Business Analytics, Python, Cloud Computing, SQL, Agile', 'https://github.com/22r11a66n1', 'https://linkedin.com/in/22r11a66n1', 'https://leetcode.com/u/22r11a66n1', 'https://hackerrank.com/profile/22r11a66n1', 'https://codechef.com/users/22r11a66n1', 1),
(31, '22R11A66N2', 'CSE', 2022, 8.66, 'Python, Java, Data Structures, Algorithms, MySQL, Git', 'https://github.com/22r11a66n2', 'https://linkedin.com/in/22r11a66n2', 'https://leetcode.com/u/22r11a66n2', 'https://hackerrank.com/profile/22r11a66n2', 'https://codechef.com/users/22r11a66n2', 1),
(32, '22R11A66N3', 'AIML', 2022, 8.28, 'Machine Learning, Python, TensorFlow, SQL, Deep Learning', 'https://github.com/22r11a66n3', 'https://linkedin.com/in/22r11a66n3', 'https://leetcode.com/u/22r11a66n3', 'https://hackerrank.com/profile/22r11a66n3', 'https://codechef.com/users/22r11a66n3', 1),
(33, '22R11A66N4', 'IOT', 2022, 8.05, 'IoT Security, Python, C++, Arduino, AWS IoT Core', 'https://github.com/22r11a66n4', 'https://linkedin.com/in/22r11a66n4', 'https://leetcode.com/u/22r11a66n4', 'https://hackerrank.com/profile/22r11a66n4', 'https://codechef.com/users/22r11a66n4', 1),
(34, '22R11A66N5', 'AIDS', 2022, 7.5, 'Data Analytics, Python, SQL, Statistics, Excel, Power BI', 'https://github.com/22r11a66n5', 'https://linkedin.com/in/22r11a66n5', 'https://leetcode.com/u/22r11a66n5', 'https://hackerrank.com/profile/22r11a66n5', 'https://codechef.com/users/22r11a66n5', 1),
(35, '22R11A66N6', 'EEE', 2022, 8.32, 'Smart Grids, Power Systems, MATLAB, Circuit Simulation, C++', 'https://github.com/22r11a66n6', 'https://linkedin.com/in/22r11a66n6', 'https://leetcode.com/u/22r11a66n6', 'https://hackerrank.com/profile/22r11a66n6', 'https://codechef.com/users/22r11a66n6', 1),
(36, '22R11A66N7', 'IT', 2022, 8.42, 'Full Stack Web Development, Node.js, React, MongoDB, Git', 'https://github.com/22r11a66n7', 'https://linkedin.com/in/22r11a66n7', 'https://leetcode.com/u/22r11a66n7', 'https://hackerrank.com/profile/22r11a66n7', 'https://codechef.com/users/22r11a66n7', 1),
(37, '22R11A66N8', 'ECE', 2022, 8.7, 'VLSI Design, Verilog, Cadence basics, Embedded C, MATLAB', 'https://github.com/22r11a66n8', 'https://linkedin.com/in/22r11a66n8', 'https://leetcode.com/u/22r11a66n8', 'https://hackerrank.com/profile/22r11a66n8', 'https://codechef.com/users/22r11a66n8', 1),
(38, '22R11A66N9', 'MECH', 2022, 8.18, 'CAD/CAM, SolidWorks, Robotics, Python, Manufacturing Processes', 'https://github.com/22r11a66n9', 'https://linkedin.com/in/22r11a66n9', 'https://leetcode.com/u/22r11a66n9', 'https://hackerrank.com/profile/22r11a66n9', 'https://codechef.com/users/22r11a66n9', 1),
(39, '22R11A66P0', 'CIVIL', 2022, 8.5, 'STAAD.Pro, Highway Engineering, AutoCAD, Structural Analysis', 'https://github.com/22r11a66p0', 'https://linkedin.com/in/22r11a66p0', 'https://leetcode.com/u/22r11a66p0', 'https://hackerrank.com/profile/22r11a66p0', 'https://codechef.com/users/22r11a66p0', 1),
(40, '22R11A66P1', 'CSBS', 2022, 7.65, 'Python, Management Information Systems, SQL, Web Basics', 'https://github.com/22r11a66p1', 'https://linkedin.com/in/22r11a66p1', 'https://leetcode.com/u/22r11a66p1', 'https://hackerrank.com/profile/22r11a66p1', 'https://codechef.com/users/22r11a66p1', 1),
(41, '22R11A66P2', 'AIML', 2022, 8.22, 'Python, Deep Learning, OpenCV, Machine Learning, MySQL', 'https://github.com/22r11a66p2', 'https://linkedin.com/in/22r11a66p2', 'https://leetcode.com/u/22r11a66p2', 'https://hackerrank.com/profile/22r11a66p2', 'https://codechef.com/users/22r11a66p2', 1),
(42, '22R11A66P3', 'AIDS', 2022, 8.88, 'Data Science, Python, PyTorch, Big Data, SQL, Machine Learning', 'https://github.com/22r11a66p3', 'https://linkedin.com/in/22r11a66p3', 'https://leetcode.com/u/22r11a66p3', 'https://hackerrank.com/profile/22r11a66p3', 'https://codechef.com/users/22r11a66p3', 1),
(43, '22R11A66P4', 'AIML', 2022, 9.60, 'Java, Python, Full-Stack Web Development, Node.js, Express, MySQL, Machine Learning, Git', 'https://github.com/22r11a66p4', 'https://linkedin.com/in/22r11a66p4', 'https://leetcode.com/u/22r11a66p4', 'https://hackerrank.com/profile/22r11a66p4', 'https://codechef.com/users/22r11a66p4', 1),
(44, '22R11A66P5', 'ECE', 2022, 8.6, 'Embedded Systems, IoT, C, Verilog, Digital Communication', 'https://github.com/22r11a66p5', 'https://linkedin.com/in/22r11a66p5', 'https://leetcode.com/u/22r11a66p5', 'https://hackerrank.com/profile/22r11a66p5', 'https://codechef.com/users/22r11a66p5', 1),
(45, '22R11A66P6', 'EEE', 2022, 8.58, 'Renewable Energy Systems, MATLAB, Simulink, Arduino, Python', 'https://github.com/22r11a66p6', 'https://linkedin.com/in/22r11a66p6', 'https://leetcode.com/u/22r11a66p6', 'https://hackerrank.com/profile/22r11a66p6', 'https://codechef.com/users/22r11a66p6', 1),
(46, '22R11A66P7', 'IT', 2022, 8.3, 'Cloud Computing, DevOps basics, Docker, Linux, Python, MySQL', 'https://github.com/22r11a66p7', 'https://linkedin.com/in/22r11a66p7', 'https://leetcode.com/u/22r11a66p7', 'https://hackerrank.com/profile/22r11a66p7', 'https://codechef.com/users/22r11a66p7', 1),
(47, '22R11A66P8', 'AIML', 2022, 9.00, 'ANSYS Fluent, CFD basics, SolidWorks, AutoCAD, Python', 'https://github.com/22r11a66p8', 'https://linkedin.com/in/22r11a66p8', 'https://leetcode.com/u/22r11a66p8', 'https://hackerrank.com/profile/22r11a66p8', 'https://codechef.com/users/22r11a66p8', 1),
(48, '22R11A66P9', 'CIVIL', 2022, 8.4, 'Geotechnical Engineering, AutoCAD, Revit, Construction Mgmt', 'https://github.com/22r11a66p9', 'https://linkedin.com/in/22r11a66p9', 'https://leetcode.com/u/22r11a66p9', 'https://hackerrank.com/profile/22r11a66p9', 'https://codechef.com/users/22r11a66p9', 1),
(49, '22R11A66Q0', 'AIML', 2022, 8.55, 'Machine Learning, Python, NLP, Data Analysis, SQL', 'https://github.com/22r11a66q0', 'https://linkedin.com/in/22r11a66q0', 'https://leetcode.com/u/22r11a66q0', 'https://hackerrank.com/profile/22r11a66q0', 'https://codechef.com/users/22r11a66q0', 1),
(50, '22R11A66Q1', 'CSBS', 2022, 8.72, 'Python, Financial Modeling, SQL, Java, Product Management', 'https://github.com/22r11a66q1', 'https://linkedin.com/in/22r11a66q1', 'https://leetcode.com/u/22r11a66q1', 'https://hackerrank.com/profile/22r11a66q1', 'https://codechef.com/users/22r11a66q1', 1),
(51, '22R11A66Q2', 'CSE', 2022, 8.64, 'Java, Spring Boot, Angular, MySQL, Data Structures', 'https://github.com/22r11a66q2', 'https://linkedin.com/in/22r11a66q2', 'https://leetcode.com/u/22r11a66q2', 'https://hackerrank.com/profile/22r11a66q2', 'https://codechef.com/users/22r11a66q2', 1),
(52, '22R11A66Q3', 'IOT', 2022, 8.2, 'Embedded C++, IoT Hardware, LoRaWAN, Python, MQTT', 'https://github.com/22r11a66q3', 'https://linkedin.com/in/22r11a66q3', 'https://leetcode.com/u/22r11a66q3', 'https://hackerrank.com/profile/22r11a66q3', 'https://codechef.com/users/22r11a66q3', 1),
(53, '22R11A66Q4', 'EEE', 2022, 7.85, 'Electric Vehicles Tech, MATLAB, Power Electronics, C', 'https://github.com/22r11a66q4', 'https://linkedin.com/in/22r11a66q4', 'https://leetcode.com/u/22r11a66q4', 'https://hackerrank.com/profile/22r11a66q4', 'https://codechef.com/users/22r11a66q4', 1),
(54, '22R11A66Q6', 'AIDS', 2022, 8.44, 'Data Analytics, Python, Tableau, Machine Learning, SQL', 'https://github.com/22r11a66q6', 'https://linkedin.com/in/22r11a66q6', 'https://leetcode.com/u/22r11a66q6', 'https://hackerrank.com/profile/22r11a66q6', 'https://codechef.com/users/22r11a66q6', 1),
(55, '22R11A66Q7', 'MECH', 2022, 8.35, 'Automobile Engineering, SolidWorks, Finite Element Analysis', 'https://github.com/22r11a66q7', 'https://linkedin.com/in/22r11a66q7', 'https://leetcode.com/u/22r11a66q7', 'https://hackerrank.com/profile/22r11a66q7', 'https://codechef.com/users/22r11a66q7', 1),
(56, '22R11A66Q8', 'IT', 2022, 8.68, 'Cybersecurity Basics, Python, Network Security, Linux, SQL', 'https://github.com/22r11a66q8', 'https://linkedin.com/in/22r11a66q8', 'https://leetcode.com/u/22r11a66q8', 'https://hackerrank.com/profile/22r11a66q8', 'https://codechef.com/users/22r11a66q8', 1),
(57, '22R11A66Q9', 'CIVIL', 2022, 8.5, 'Environmental Engineering, AutoCAD, GIS, Water Resource Mgmt', 'https://github.com/22r11a66q9', 'https://linkedin.com/in/22r11a66q9', 'https://leetcode.com/u/22r11a66q9', 'https://hackerrank.com/profile/22r11a66q9', 'https://codechef.com/users/22r11a66q9', 1),
(58, '22R11A66R0', 'ECE', 2022, 8.74, 'VLSI, Verilog HDL, Microcontrollers, Python, MATLAB', 'https://github.com/22r11a66r0', 'https://linkedin.com/in/22r11a66r0', 'https://leetcode.com/u/22r11a66r0', 'https://hackerrank.com/profile/22r11a66r0', 'https://codechef.com/users/22r11a66r0', 1),
(59, '22R11A66R1', 'AIML', 2022, 8.82, 'Deep Learning, PyTorch, Generative AI basics, Python, SQL', 'https://github.com/22r11a66r1', 'https://linkedin.com/in/22r11a66r1', 'https://leetcode.com/u/22r11a66r1', 'https://hackerrank.com/profile/22r11a66r1', 'https://codechef.com/users/22r11a66r1', 1),
(60, '22R11A66R2', 'CSBS', 2022, 8.15, 'Business Analytics, Python, Enterprise Architecture, SQL', 'https://github.com/22r11a66r2', 'https://linkedin.com/in/22r11a66r2', 'https://leetcode.com/u/22r11a66r2', 'https://hackerrank.com/profile/22r11a66r2', 'https://codechef.com/users/22r11a66r2', 1),
(61, '22R11A66R3', 'CSE', 2022, 8.25, 'Full Stack Development, React, Node.js, PostgreSQL, Git', 'https://github.com/22r11a66r3', 'https://linkedin.com/in/22r11a66r3', 'https://leetcode.com/u/22r11a66r3', 'https://hackerrank.com/profile/22r11a66r3', 'https://codechef.com/users/22r11a66r3', 1),
(62, '22R11A66R4', 'AIDS', 2022, 8.62, 'Data Science, Machine Learning, Python, Power BI, Statistics', 'https://github.com/22r11a66r4', 'https://linkedin.com/in/22r11a66r4', 'https://leetcode.com/u/22r11a66r4', 'https://hackerrank.com/profile/22r11a66r4', 'https://codechef.com/users/22r11a66r4', 1),
(63, '22R11A66R7', 'IOT', 2022, 8.55, 'Smart Sensors, Arduino, Python, C++, Edge Computing', 'https://github.com/22r11a66r7', 'https://linkedin.com/in/22r11a66r7', 'https://leetcode.com/u/22r11a66r7', 'https://hackerrank.com/profile/22r11a66r7', 'https://codechef.com/users/22r11a66r7', 1),
(64, '22R11A66R6', 'EEE', 2022, 8.3, 'Industrial Automation, PLC, SCADA, MATLAB, C++', 'https://github.com/22r11a66r6', 'https://linkedin.com/in/22r11a66r6', 'https://leetcode.com/u/22r11a66r6', 'https://hackerrank.com/profile/22r11a66r6', 'https://codechef.com/users/22r11a66r6', 1),
(65, '26R15A6622', 'ECE', 2022, 8.4, 'Embedded Systems, Wireless Communication, Python, MATLAB', 'https://github.com/26r15a6622', 'https://linkedin.com/in/26r15a6622', 'https://leetcode.com/u/26r15a6622', 'https://hackerrank.com/profile/26r15a6622', 'https://codechef.com/users/26r15a6622', 1),
(66, '26R15A6623', 'IT', 2022, 7.9, 'Cloud Platforms, AWS Basics, Python, Web Technologies, SQL', 'https://github.com/26r15a6623', 'https://linkedin.com/in/26r15a6623', 'https://leetcode.com/u/26r15a6623', 'https://hackerrank.com/profile/26r15a6623', 'https://codechef.com/users/26r15a6623', 1),
(67, '26R15A6624', 'MECH', 2022, 8.1, 'SolidWorks, Thermal Analysis, AutoCAD, C, Python', 'https://github.com/26r15a6624', 'https://linkedin.com/in/26r15a6624', 'https://leetcode.com/u/26r15a6624', 'https://hackerrank.com/profile/26r15a6624', 'https://codechef.com/users/26r15a6624', 1),
(68, '26R15A6625', 'CIVIL', 2022, 7.75, 'Structural Engineering, STAAD.Pro, AutoCAD, Concrete Tech', 'https://github.com/26r15a6625', 'https://linkedin.com/in/26r15a6625', 'https://leetcode.com/u/26r15a6625', 'https://hackerrank.com/profile/26r15a6625', 'https://codechef.com/users/26r15a6625', 1),
(69, '26R15A6626', 'AIML', 2022, 8.05, 'Machine Learning, Python, Data Preprocessing, MySQL', 'https://github.com/26r15a6626', 'https://linkedin.com/in/26r15a6626', 'https://leetcode.com/u/26r15a6626', 'https://hackerrank.com/profile/26r15a6626', 'https://codechef.com/users/26r15a6626', 1),
(70, '26R15A6627', 'CSBS', 2022, 8.35, 'Business Intelligence, Python, SQL, Tableau, Cloud Basics', 'https://github.com/26r15a6627', 'https://linkedin.com/in/26r15a6627', 'https://leetcode.com/u/26r15a6627', 'https://hackerrank.com/profile/26r15a6627', 'https://codechef.com/users/26r15a6627', 1),
(71, '22R11A6701', 'CSE', 2022, 8.85, 'Java, Python, SQL, Data Structures, Spring Boot, Git', 'https://github.com/22r11a6701', 'https://linkedin.com/in/22r11a6701', 'https://leetcode.com/u/22r11a6701', 'https://hackerrank.com/profile/22r11a6701', 'https://codechef.com/users/22r11a6701', 1),
(72, '22R11A6702', 'IT', 2022, 8.4, 'Web Development, JavaScript, React, SQL, Python', 'https://github.com/22r11a6702', 'https://linkedin.com/in/22r11a6702', 'https://leetcode.com/u/22r11a6702', 'https://hackerrank.com/profile/22r11a6702', 'https://codechef.com/users/22r11a6702', 1),
(73, '22R11A6703', 'ECE', 2022, 8.25, 'Embedded C, Verilog, Microcontrollers, MATLAB, IoT', 'https://github.com/22r11a6703', 'https://linkedin.com/in/22r11a6703', 'https://leetcode.com/u/22r11a6703', 'https://hackerrank.com/profile/22r11a6703', 'https://codechef.com/users/22r11a6703', 1),
(74, '22R11A6704', 'EEE', 2022, 8.6, 'MATLAB, Power Systems, Simulink, Arduino, PLC', 'https://github.com/22r11a6704', 'https://linkedin.com/in/22r11a6704', 'https://leetcode.com/u/22r11a6704', 'https://hackerrank.com/profile/22r11a6704', 'https://codechef.com/users/22r11a6704', 1),
(75, '22R11A6705', 'MECH', 2022, 7.9, 'AutoCAD, SolidWorks, ANSYS, GD&T, 3D Printing', 'https://github.com/22r11a6705', 'https://linkedin.com/in/22r11a6705', 'https://leetcode.com/u/22r11a6705', 'https://hackerrank.com/profile/22r11a6705', 'https://codechef.com/users/22r11a6705', 1),
(76, '22R11A6706', 'CIVIL', 2022, 8.15, 'AutoCAD Civil, STAAD.Pro, Surveying, Total Station', 'https://github.com/22r11a6706', 'https://linkedin.com/in/22r11a6706', 'https://leetcode.com/u/22r11a6706', 'https://hackerrank.com/profile/22r11a6706', 'https://codechef.com/users/22r11a6706', 1),
(77, '22R11A6707', 'AIML', 2022, 8.92, 'Python, Machine Learning, TensorFlow, PyTorch, Pandas', 'https://github.com/22r11a6707', 'https://linkedin.com/in/22r11a6707', 'https://leetcode.com/u/22r11a6707', 'https://hackerrank.com/profile/22r11a6707', 'https://codechef.com/users/22r11a6707', 1),
(78, '22R11A6708', 'AIDS', 2022, 8.3, 'Python, Data Analytics, Power BI, SQL, Statistics', 'https://github.com/22r11a6708', 'https://linkedin.com/in/22r11a6708', 'https://leetcode.com/u/22r11a6708', 'https://hackerrank.com/profile/22r11a6708', 'https://codechef.com/users/22r11a6708', 1),
(79, '22R11A6709', 'CSBS', 2022, 8.55, 'Python, Business Analytics, SQL, Cloud Computing, Agile', 'https://github.com/22r11a6709', 'https://linkedin.com/in/22r11a6709', 'https://leetcode.com/u/22r11a6709', 'https://hackerrank.com/profile/22r11a6709', 'https://codechef.com/users/22r11a6709', 1),
(80, '22R11A6710', 'IOT', 2022, 8.1, 'Arduino, ESP32, Python, MQTT, IoT Sensors, C++', 'https://github.com/22r11a6710', 'https://linkedin.com/in/22r11a6710', 'https://leetcode.com/u/22r11a6710', 'https://hackerrank.com/profile/22r11a6710', 'https://codechef.com/users/22r11a6710', 1),
(81, '22R11A6711', 'CSE', 2022, 8.45, 'C++, Java, Algorithms, MySQL, Git, Linux', 'https://github.com/22r11a6711', 'https://linkedin.com/in/22r11a6711', 'https://leetcode.com/u/22r11a6711', 'https://hackerrank.com/profile/22r11a6711', 'https://codechef.com/users/22r11a6711', 1),
(82, '22R11A6712', 'IT', 2022, 8.75, 'Full Stack, Node.js, Express, MongoDB, HTML/CSS', 'https://github.com/22r11a6712', 'https://linkedin.com/in/22r11a6712', 'https://leetcode.com/u/22r11a6712', 'https://hackerrank.com/profile/22r11a6712', 'https://codechef.com/users/22r11a6712', 1),
(83, '22R11A6713', 'ECE', 2022, 8.65, 'VLSI, Verilog HDL, Digital Design, Embedded Systems', 'https://github.com/22r11a6713', 'https://linkedin.com/in/22r11a6713', 'https://leetcode.com/u/22r11a6713', 'https://hackerrank.com/profile/22r11a6713', 'https://codechef.com/users/22r11a6713', 1),
(84, '22R11A6714', 'EEE', 2022, 7.8, 'Power Electronics, Electric Drives, MATLAB, C', 'https://github.com/22r11a6714', 'https://linkedin.com/in/22r11a6714', 'https://leetcode.com/u/22r11a6714', 'https://hackerrank.com/profile/22r11a6714', 'https://codechef.com/users/22r11a6714', 1),
(85, '22R11A6715', 'MECH', 2022, 8.05, 'SolidWorks, Thermodynamics, CNC Programming, Python', 'https://github.com/22r11a6715', 'https://linkedin.com/in/22r11a6715', 'https://leetcode.com/u/22r11a6715', 'https://hackerrank.com/profile/22r11a6715', 'https://codechef.com/users/22r11a6715', 1),
(86, '22R11A6716', 'CIVIL', 2022, 8.7, 'Revit, Structural Analysis, Concrete Technology, GIS', 'https://github.com/22r11a6716', 'https://linkedin.com/in/22r11a6716', 'https://leetcode.com/u/22r11a6716', 'https://hackerrank.com/profile/22r11a6716', 'https://codechef.com/users/22r11a6716', 1),
(87, '22R11A6717', 'AIML', 2022, 8.5, 'Deep Learning, Computer Vision, OpenCV, Python, SQL', 'https://github.com/22r11a6717', 'https://linkedin.com/in/22r11a6717', 'https://leetcode.com/u/22r11a6717', 'https://hackerrank.com/profile/22r11a6717', 'https://codechef.com/users/22r11a6717', 1),
(88, '22R11A6718', 'AIDS', 2022, 8.2, 'Data Science, Machine Learning, Scikit-Learn, Power BI', 'https://github.com/22r11a6718', 'https://linkedin.com/in/22r11a6718', 'https://leetcode.com/u/22r11a6718', 'https://hackerrank.com/profile/22r11a6718', 'https://codechef.com/users/22r11a6718', 1),
(89, '22R11A6719', 'CSBS', 2022, 8.68, 'Financial Analytics, Python, Enterprise Systems, SQL', 'https://github.com/22r11a6719', 'https://linkedin.com/in/22r11a6719', 'https://leetcode.com/u/22r11a6719', 'https://hackerrank.com/profile/22r11a6719', 'https://codechef.com/users/22r11a6719', 1),
(90, '22R11A6720', 'IOT', 2022, 7.95, 'IoT Protocols, Raspberry Pi, Python, Wireless Sensors', 'https://github.com/22r11a6720', 'https://linkedin.com/in/22r11a6720', 'https://leetcode.com/u/22r11a6720', 'https://hackerrank.com/profile/22r11a6720', 'https://codechef.com/users/22r11a6720', 1),
(91, '22R11A6721', 'CSE', 2022, 8.9, 'Java, Data Structures, Spring Boot, MySQL, REST APIs', 'https://github.com/22r11a6721', 'https://linkedin.com/in/22r11a6721', 'https://leetcode.com/u/22r11a6721', 'https://hackerrank.com/profile/22r11a6721', 'https://codechef.com/users/22r11a6721', 1),
(92, '22R11A6722', 'IT', 2022, 8.52, 'Web Development, React, JavaScript, SQL, Bootstrap', 'https://github.com/22r11a6722', 'https://linkedin.com/in/22r11a6722', 'https://leetcode.com/u/22r11a6722', 'https://hackerrank.com/profile/22r11a6722', 'https://codechef.com/users/22r11a6722', 1),
(93, '22R11A6723', 'ECE', 2022, 8.18, 'Microcontrollers, ARM, Embedded C, Digital Comm', 'https://github.com/22r11a6723', 'https://linkedin.com/in/22r11a6723', 'https://leetcode.com/u/22r11a6723', 'https://hackerrank.com/profile/22r11a6723', 'https://codechef.com/users/22r11a6723', 1),
(94, '22R11A6724', 'EEE', 2022, 8.35, 'Smart Grids, Control Systems, MATLAB, Circuit Design', 'https://github.com/22r11a6724', 'https://linkedin.com/in/22r11a6724', 'https://leetcode.com/u/22r11a6724', 'https://hackerrank.com/profile/22r11a6724', 'https://codechef.com/users/22r11a6724', 1),
(95, '22R11A6725', 'MECH', 2022, 7.75, 'AutoCAD, Manufacturing, Finite Element Analysis, ANSYS', 'https://github.com/22r11a6725', 'https://linkedin.com/in/22r11a6725', 'https://leetcode.com/u/22r11a6725', 'https://hackerrank.com/profile/22r11a6725', 'https://codechef.com/users/22r11a6725', 1),
(96, '22R11A6726', 'CIVIL', 2022, 8.42, 'STAAD.Pro, AutoCAD Civil, Geotechnical Engineering', 'https://github.com/22r11a6726', 'https://linkedin.com/in/22r11a6726', 'https://leetcode.com/u/22r11a6726', 'https://hackerrank.com/profile/22r11a6726', 'https://codechef.com/users/22r11a6726', 1),
(97, '22R11A6727', 'AIML', 2022, 8.8, 'NLP, Transformer Models, Python, PyTorch, SQL', 'https://github.com/22r11a6727', 'https://linkedin.com/in/22r11a6727', 'https://leetcode.com/u/22r11a6727', 'https://hackerrank.com/profile/22r11a6727', 'https://codechef.com/users/22r11a6727', 1),
(98, '22R11A6728', 'AIDS', 2022, 8.6, 'Big Data, Python, Machine Learning, Power BI, SQL', 'https://github.com/22r11a6728', 'https://linkedin.com/in/22r11a6728', 'https://leetcode.com/u/22r11a6728', 'https://hackerrank.com/profile/22r11a6728', 'https://codechef.com/users/22r11a6728', 1),
(99, '22R11A6729', 'CSBS', 2022, 8.28, 'Business Intelligence, Python, Cloud Platforms, SQL', 'https://github.com/22r11a6729', 'https://linkedin.com/in/22r11a6729', 'https://leetcode.com/u/22r11a6729', 'https://hackerrank.com/profile/22r11a6729', 'https://codechef.com/users/22r11a6729', 1),
(100, '22R11A6730', 'IOT', 2022, 8, 'Edge Computing, Arduino, Python, C++, AWS IoT', 'https://github.com/22r11a6730', 'https://linkedin.com/in/22r11a6730', 'https://leetcode.com/u/22r11a6730', 'https://hackerrank.com/profile/22r11a6730', 'https://codechef.com/users/22r11a6730', 1),
(101, '22R11A6731', 'CSE', 2022, 9.05, 'Python, Java, Machine Learning, Data Structures, Git', 'https://github.com/22r11a6731', 'https://linkedin.com/in/22r11a6731', 'https://leetcode.com/u/22r11a6731', 'https://hackerrank.com/profile/22r11a6731', 'https://codechef.com/users/22r11a6731', 1);

-- 4. 10 Real Tier-1 & Tier-2 Recruiting Companies
INSERT INTO companies (id, name, description, website, contact_email, contact_phone, is_active, created_by) VALUES
(1, 'Tata Consultancy Services (TCS)', 'Global leader in IT services, consulting, and business solutions with extensive digital transformation footprint.', 'https://www.tcs.com', 'campus.tcs@tcs.com', '+91-22-67789999', 1, 1),
(2, 'Infosys Limited', 'Next-generation digital services and consulting firm empowering enterprise transformation across 56 countries.', 'https://www.infosys.com', 'talentacquisition@infosys.com', '+91-80-28520261', 1, 1),
(3, 'Wipro Technologies', 'Pioneering technology services and consulting company focused on building innovative solutions across cloud and AI.', 'https://www.wipro.com', 'campusconnect@wipro.com', '+91-80-28440011', 1, 1),
(4, 'Cognizant Technology Solutions', 'Leading provider of information technology, consulting, and business process outsourcing services.', 'https://www.cognizant.com', 'campusrecruitment@cognizant.com', '+91-44-42096000', 1, 1),
(5, 'Accenture India', 'Global professional services company with leading capabilities in digital, cloud, security, and enterprise AI.', 'https://www.accenture.com/in-en', 'campus.india@accenture.com', '+91-124-4096000', 1, 1),
(6, 'Capgemini India', 'Global leader in partnering with companies to transform and manage business through technology and innovation.', 'https://www.capgemini.com/in-en', 'fresherscampus.in@capgemini.com', '+91-22-67557000', 1, 1),
(7, 'Amazon Development Centre India', 'Worldwide technology powerhouse operating AWS cloud, ecommerce platforms, and digital streaming innovations.', 'https://www.amazon.jobs', 'university-recruiting@amazon.com', '+91-80-41355000', 1, 1),
(8, 'Microsoft India', 'World leader in software, cloud computing (Azure), artificial intelligence, and hardware devices.', 'https://careers.microsoft.com', 'indiacampus@microsoft.com', '+91-40-66930000', 1, 1),
(9, 'Tech Mahindra', 'Digital transformation, consulting, and business re-engineering services provider.', 'https://www.techmahindra.com', 'entrylevelhiring@techmahindra.com', '+91-20-66018100', 1, 1),
(10, 'Oracle India', 'Cloud applications and platform services delivering enterprise databases, ERP, and developer tools.', 'https://www.oracle.com/in', 'campusrelations_in@oracle.com', '+91-80-41076000', 1, 1);

-- 5. Placement Drives (Open & Active Drives for Batch 2022)
-- Drive 1 has shortlist and results published to showcase complete placement workflow
INSERT INTO placement_drives 
(id, company_id, job_title, job_description, package_lpa, location, required_skills, min_cgpa, eligible_branches, graduation_year, application_deadline, placement_date, status, is_published, shortlist_approved, shortlist_published, results_published, created_by)
VALUES
(1, 1, 'Systems Engineer (Digital & Ninja)', 'Software engineering, cloud solutions, and automation across enterprise systems.', 7.00, 'Hyderabad / Bengaluru', 'Python, Java, Data Structures, SQL, Problem Solving', 6.50, 'ALL', 2022, DATE_ADD(NOW(), INTERVAL 14 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY), 'open', 1, 1, 1, 1, 1),
(2, 2, 'Specialist Programmer (Power Programmer)', 'High-impact product development, distributed computing, and machine learning.', 9.50, 'Bengaluru / Pune', 'Data Structures, Algorithms, Java/C++, Python, System Design', 7.50, 'CSE, IT, AIML, AIDS, CSBS', 2022, DATE_ADD(NOW(), INTERVAL 18 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 25 DAY), 'open', 1, 0, 0, 0, 1),
(3, 8, 'Software Engineering Associate', 'Cloud infrastructure, microservices development, and developer tools on Microsoft Azure platform.', 16.00, 'Hyderabad', 'Algorithms, C++, C#, Java, Cloud Concepts, OOP, Git', 8.00, 'CSE, IT, AIML, AIDS', 2022, DATE_ADD(NOW(), INTERVAL 21 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), 'open', 1, 0, 0, 0, 1),
(4, 7, 'Software Development Engineer - I (SDE-1)', 'Scalable web services, database architecture, and performance engineering.', 18.00, 'Bengaluru / Hyderabad', 'Data Structures, Algorithms, Distributed Systems, Problem Solving, Java/C++', 8.00, 'CSE, IT, AIML, AIDS, ECE', 2022, DATE_ADD(NOW(), INTERVAL 25 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 35 DAY), 'open', 1, 0, 0, 0, 1);

-- PAST DRIVES (already finished): applications closed, shortlist + all results published
INSERT INTO placement_drives
(id, company_id, job_title, job_description, package_lpa, location, required_skills, min_cgpa, eligible_branches, graduation_year, application_deadline, placement_date, status, is_published, shortlist_approved, shortlist_published, results_published, created_by, created_at)
VALUES
(5, 3, 'Project Engineer (Wipro Turbo)', 'Application development and support for global enterprise clients.', 6.50, 'Hyderabad / Chennai', 'Java, SQL, Problem Solving, Communication', 7.00, 'ALL', 2022, DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 15 DAY), 'closed', 1, 1, 1, 1, 1, DATE_SUB(NOW(), INTERVAL 40 DAY)),
(6, 6, 'Analyst (Software)', 'Software analyst role in cloud and application services.', 4.50, 'Pune / Mumbai', 'Python, SQL, Aptitude, Communication', 6.50, 'ALL', 2022, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 20 DAY), 'closed', 1, 1, 1, 1, 1, DATE_SUB(NOW(), INTERVAL 45 DAY));

-- 6. Default Placement Rounds for Each Drive
INSERT INTO placement_rounds (id, drive_id, round_name, round_order, description, is_active, results_published) VALUES
(1, 1, 'Online Assessment', 1, 'Proctored Aptitude, Quantitative Analysis, Verbal Ability, and Coding Assessment.', 1, 1),
(2, 1, 'Technical Interview', 2, 'Core computer science fundamentals, data structures, algorithms, and project discussion.', 1, 1),
(3, 1, 'Managerial Interview', 3, 'System scenarios, team collaboration, problem solving, and behavioral evaluation.', 1, 0),
(4, 1, 'Final Selection', 4, 'HR verification, document check, offer rollout, and package finalization.', 1, 0),

(5, 2, 'Online Assessment', 1, 'Proctored Aptitude, Quantitative Analysis, Verbal Ability, and Coding Assessment.', 1, 0),
(6, 2, 'Technical Interview', 2, 'Core computer science fundamentals, data structures, algorithms, and project discussion.', 1, 0),
(7, 2, 'Managerial Interview', 3, 'System scenarios, team collaboration, problem solving, and behavioral evaluation.', 1, 0),
(8, 2, 'Final Selection', 4, 'HR verification, document check, offer rollout, and package finalization.', 1, 0),

(9, 3, 'Online Assessment', 1, 'Proctored Aptitude, Quantitative Analysis, Verbal Ability, and Coding Assessment.', 1, 0),
(10, 3, 'Technical Interview', 2, 'Core computer science fundamentals, data structures, algorithms, and project discussion.', 1, 0),
(11, 3, 'Managerial Interview', 3, 'System scenarios, team collaboration, problem solving, and behavioral evaluation.', 1, 0),
(12, 3, 'Final Selection', 4, 'HR verification, document check, offer rollout, and package finalization.', 1, 0),

(13, 4, 'Online Assessment', 1, 'Proctored Aptitude, Quantitative Analysis, Verbal Ability, and Coding Assessment.', 1, 0),
(14, 4, 'Technical Interview', 2, 'Core computer science fundamentals, data structures, algorithms, and project discussion.', 1, 0),
(15, 4, 'Managerial Interview', 3, 'System scenarios, team collaboration, problem solving, and behavioral evaluation.', 1, 0),
(16, 4, 'Final Selection', 4, 'HR verification, document check, offer rollout, and package finalization.', 1, 0),

(17, 5, 'Online Assessment', 1, 'Aptitude, reasoning and coding test.', 1, 1),
(18, 5, 'Technical Interview', 2, 'Data structures, core subjects and projects.', 1, 1),
(19, 5, 'HR Interview', 3, 'Communication skills and behaviour.', 1, 1),
(20, 5, 'Final Selection', 4, 'Final decision and offer.', 1, 1),

(21, 6, 'Online Assessment', 1, 'Aptitude, reasoning and coding test.', 1, 1),
(22, 6, 'Technical Interview', 2, 'Data structures, core subjects and projects.', 1, 1),
(23, 6, 'HR Interview', 3, 'Communication skills and behaviour.', 1, 1),
(24, 6, 'Final Selection', 4, 'Final decision and offer.', 1, 1);

-- 7. Demo Student Job Applications (Showcasing all application statuses & workflows)
INSERT INTO applications 
(id, drive_id, student_user_id, status, officer_remarks, final_result, offered_package_lpa, offer_details, result_published, applied_at, status_updated_at, updated_by)
VALUES
-- Drive 1 (TCS): Top Selected candidates
(1, 1, 101, 'Selected', 'Qualified all interview rounds with distinction. Selected for Systems Engineer Digital role.', 'Selected', 7.00, 'TCS Digital - Official Campus Placement Offer Letter', 1, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(2, 1, 71, 'Selected', 'Exceptional performance in coding and technical interview. Selected for Systems Engineer role.', 'Selected', 7.00, 'TCS Ninja & Digital - Official Campus Placement Offer Letter', 1, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(40, 1, 43, 'Selected', 'Department topper with flawless coding and technical interview performance. Selected for Systems Engineer (Digital) role.', 'Selected', 7.00, 'TCS Digital - Official Campus Placement Offer Letter (Ref: TCS/2026/DIG-43)', 1, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),

-- Drive 1 (TCS): Shortlisted candidates with published interview evaluations
(3, 1, 77, 'Shortlisted', 'Cleared Online Assessment and Technical round with high merit.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 1),
(4, 1, 91, 'Shortlisted', 'Shortlisted for technical interviews based on CGPA and aptitude score.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 1),
(5, 1, 82, 'Shortlisted', 'Shortlisted based on academic ranking and proctored assessment score.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 1),
(6, 1, 14, 'Shortlisted', 'Shortlisted for technical round.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 1),
(41, 1, 47, 'Shortlisted', 'AIML candidate with strong analytical and programming aptitude. Cleared Online Assessment with distinction.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 1),

-- Drive 1 (TCS): Approved, Under Review, Applied, and Rejected candidates
(7, 1, 4, 'Approved', 'Academic eligibility, department, and CGPA verified by placement cell.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(8, 1, 10, 'Approved', 'Credentials verified.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(9, 1, 21, 'Approved', 'Approved for technical rounds.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(48, 1, 3, 'Approved', 'AIML candidate with strong programming fundamentals approved for placement rounds.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(42, 1, 13, 'Under Review', 'Academic documents and AIML specialization electives being verified by placement coordinator.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(10, 1, 72, 'Under Review', 'Academic documents and semester records being verified.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(11, 1, 9, 'Under Review', 'Profile under review by university placement coordinator.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(12, 1, 28, 'Under Review', 'Reviewing student coding submissions and resume.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(13, 1, 7, 'Applied', NULL, 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), NULL),
(14, 1, 8, 'Applied', NULL, 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), NULL),
(15, 1, 6, 'Rejected', 'Did not meet the minimum benchmark score in the online assessment.', 'Rejected', NULL, NULL, 1, DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 1),

-- Drive 2 (Infosys): Applications with diverse review states
(16, 2, 71, 'Approved', 'Eligible branch and CGPA verified for Specialist Programmer role.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(17, 2, 82, 'Approved', 'Approved for online programming assessment.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(43, 2, 10, 'Approved', 'Eligible branch (AIML) and CGPA verified for Specialist Programmer role. Approved for online programming assessment.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(18, 2, 77, 'Under Review', 'Profile under evaluation by Infosys campus recruitment team.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(19, 2, 4, 'Applied', NULL, 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), NULL),
(20, 2, 72, 'Applied', NULL, 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), NULL),

-- Drive 3 (Microsoft): Applications for premier cloud engineering drive
(21, 3, 71, 'Under Review', 'Verified CGPA >= 8.0 and core CSE department prerequisites.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(22, 3, 77, 'Approved', 'High CGPA (8.92) candidate approved for Azure engineering track.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(45, 3, 43, 'Under Review', 'Verified core CSE prerequisites and project portfolio. Under final review by recruitment team.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(23, 3, 91, 'Applied', NULL, 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), NULL),

-- Drive 4 (Amazon): SDE-1 Applications
(24, 4, 101, 'Approved', 'Top merit candidate approved for Amazon proctored online test.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(44, 4, 43, 'Approved', 'Top merit candidate (CGPA 9.60) approved for Amazon SDE-1 proctored online coding challenge.', 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
(25, 4, 14, 'Applied', NULL, 'Pending', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), NULL),

-- Drive 5 (Wipro, PAST): 2 selected, 4 shortlisted but not selected, 2 rejected at review
(26, 5, 42, 'Selected', 'Cleared all rounds. Selected as Project Engineer.', 'Selected', 6.50, 'Wipro Turbo - Offer Letter', 1, DATE_SUB(NOW(), INTERVAL 35 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY), 1),
(27, 5, 59, 'Selected', 'Cleared all rounds. Selected as Project Engineer.', 'Selected', 6.50, 'Wipro Turbo - Offer Letter', 1, DATE_SUB(NOW(), INTERVAL 35 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY), 1),
(28, 5, 28, 'Shortlisted', 'Not qualified in the HR interview.', 'Rejected', NULL, NULL, 1, DATE_SUB(NOW(), INTERVAL 35 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY), 1),
(29, 5, 58, 'Shortlisted', 'Not qualified in the technical interview.', 'Rejected', NULL, NULL, 1, DATE_SUB(NOW(), INTERVAL 35 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY), 1),
(30, 5, 50, 'Shortlisted', 'Absent for the technical interview.', 'Rejected', NULL, NULL, 1, DATE_SUB(NOW(), INTERVAL 34 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY), 1),
(31, 5, 37, 'Shortlisted', 'Did not clear the online assessment cut-off.', 'Rejected', NULL, NULL, 1, DATE_SUB(NOW(), INTERVAL 34 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY), 1),
(46, 5, 47, 'Shortlisted', 'Cleared Online Assessment and Technical round. Did not clear final managerial discussion.', 'Rejected', NULL, NULL, 1, DATE_SUB(NOW(), INTERVAL 35 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY), 1),
(32, 5, 7, 'Rejected', 'Profile not shortlisted (CGPA lower than other applicants).', 'Rejected', NULL, NULL, 1, DATE_SUB(NOW(), INTERVAL 33 DAY), DATE_SUB(NOW(), INTERVAL 28 DAY), 1),
(33, 5, 8, 'Rejected', 'Profile not shortlisted (CGPA lower than other applicants).', 'Rejected', NULL, NULL, 1, DATE_SUB(NOW(), INTERVAL 33 DAY), DATE_SUB(NOW(), INTERVAL 28 DAY), 1),

-- Drive 6 (Capgemini, PAST): 2 selected, 2 shortlisted but not selected, 2 rejected at review
(34, 6, 31, 'Selected', 'Strong technical round. Selected as Analyst.', 'Selected', 4.50, 'Capgemini - Offer Letter', 1, DATE_SUB(NOW(), INTERVAL 40 DAY), DATE_SUB(NOW(), INTERVAL 18 DAY), 1),
(35, 6, 22, 'Selected', 'Good all-round performance. Selected as Analyst.', 'Selected', 4.50, 'Capgemini - Offer Letter', 1, DATE_SUB(NOW(), INTERVAL 40 DAY), DATE_SUB(NOW(), INTERVAL 18 DAY), 1),
(36, 6, 51, 'Shortlisted', 'Not qualified in the technical interview.', 'Rejected', NULL, NULL, 1, DATE_SUB(NOW(), INTERVAL 40 DAY), DATE_SUB(NOW(), INTERVAL 18 DAY), 1),
(37, 6, 62, 'Shortlisted', 'Did not clear the online assessment cut-off.', 'Rejected', NULL, NULL, 1, DATE_SUB(NOW(), INTERVAL 39 DAY), DATE_SUB(NOW(), INTERVAL 18 DAY), 1),
(38, 6, 44, 'Rejected', 'Profile not shortlisted.', 'Rejected', NULL, NULL, 1, DATE_SUB(NOW(), INTERVAL 39 DAY), DATE_SUB(NOW(), INTERVAL 33 DAY), 1),
(39, 6, 45, 'Rejected', 'Profile not shortlisted.', 'Rejected', NULL, NULL, 1, DATE_SUB(NOW(), INTERVAL 39 DAY), DATE_SUB(NOW(), INTERVAL 33 DAY), 1),
(47, 6, 13, 'Rejected', 'Application evaluated. Branch benchmark cut-off not met.', 'Rejected', NULL, NULL, 1, DATE_SUB(NOW(), INTERVAL 39 DAY), DATE_SUB(NOW(), INTERVAL 33 DAY), 1);

-- 8. Ranked Shortlist for Drive 1 (TCS) - Ordered by CGPA Descending, Roll Number Ascending
INSERT INTO shortlists 
(id, drive_id, application_id, student_user_id, rank_position, cgpa_snapshot, roll_number_snapshot, selection_status, is_published)
VALUES
(1, 1, 40, 43, 1, 9.60, '22R11A66P4', 'Selected', 1),
(2, 1, 1, 101, 2, 9.05, '22R11A6731', 'Selected', 1),
(3, 1, 3, 77, 3, 8.92, '22R11A6707', 'Shortlisted', 1),
(4, 1, 6, 14, 4, 8.90, '22R11A66L4', 'Shortlisted', 1),
(5, 1, 4, 91, 5, 8.90, '22R11A6721', 'Shortlisted', 1),
(6, 1, 2, 71, 6, 8.85, '22R11A6701', 'Selected', 1),
(7, 1, 5, 82, 7, 8.75, '22R11A6712', 'Shortlisted', 1),
(8, 1, 41, 47, 8, 9.00, '22R11A66P8', 'Shortlisted', 1),

-- Past drive 5 (Wipro)
(9, 5, 26, 42, 1, 8.88, '22R11A66P3', 'Selected', 1),
(10, 5, 27, 59, 2, 8.82, '22R11A66R1', 'Selected', 1),
(11, 5, 28, 28, 3, 8.75, '22R11A66M9', 'Shortlisted', 1),
(12, 5, 29, 58, 4, 8.74, '22R11A66R0', 'Shortlisted', 1),
(13, 5, 30, 50, 5, 8.72, '22R11A66Q1', 'Shortlisted', 1),
(14, 5, 31, 37, 6, 8.70, '22R11A66N8', 'Shortlisted', 1),
(15, 5, 46, 47, 7, 9.00, '22R11A66P8', 'Shortlisted', 1),

-- Past drive 6 (Capgemini)
(16, 6, 34, 31, 1, 8.66, '22R11A66N2', 'Selected', 1),
(17, 6, 36, 51, 2, 8.64, '22R11A66Q2', 'Shortlisted', 1),
(18, 6, 35, 22, 3, 8.62, '22R11A66M3', 'Selected', 1),
(19, 6, 37, 62, 4, 8.62, '22R11A66R4', 'Shortlisted', 1);

-- 9. Interview Round Results for Drive 1 (TCS)
INSERT INTO round_results 
(round_id, drive_id, application_id, student_user_id, status, score, feedback, is_published, updated_by)
VALUES
-- Round 1: Online Assessment (Published)
(1, 1, 40, 43, 'Qualified', 98.00, 'Exceptional performance across Data Structures, Algorithms, and Aptitude.', 1, 1),
(1, 1, 1, 101, 'Qualified', 94.50, 'Excellent performance across Data Structures, Algorithms, and Aptitude.', 1, 1),
(1, 1, 2, 71, 'Qualified', 91.00, 'Cleared all coding test cases with optimal time complexity.', 1, 1),
(1, 1, 3, 77, 'Qualified', 89.50, 'Strong problem-solving and programming fundamentals.', 1, 1),
(1, 1, 4, 91, 'Qualified', 88.00, 'Cleared coding and analytical reasoning sections.', 1, 1),
(1, 1, 5, 82, 'Qualified', 87.50, 'Cleared online assessment with good aptitude score.', 1, 1),
(1, 1, 6, 14, 'Qualified', 86.00, 'Cleared assessment.', 1, 1),
(1, 1, 41, 47, 'Qualified', 86.50, 'Strong performance in quantitative aptitude and analytical reasoning.', 1, 1),

-- Round 2: Technical Interview (Published)
(2, 1, 40, 43, 'Qualified', 97.00, 'Outstanding grasp of Web Architecture, Java, Node.js, and System Design.', 1, 1),
(2, 1, 1, 101, 'Qualified', 96.00, 'Outstanding grasp of Web Architecture, Java, MySQL, and System Design.', 1, 1),
(2, 1, 2, 71, 'Qualified', 93.50, 'Strong live coding, OOP, and Spring Boot framework knowledge.', 1, 1),
(2, 1, 3, 77, 'Qualified', 90.00, 'Good technical articulation and machine learning project knowledge.', 1, 1),

-- Past drive 5 (Wipro): all rounds published
(17, 5, 26, 42, 'Qualified', 91.00, 'Very good aptitude and coding.', 1, 1),
(17, 5, 27, 59, 'Qualified', 88.00, 'Good aptitude and coding.', 1, 1),
(17, 5, 28, 28, 'Qualified', 84.00, 'Cleared the test.', 1, 1),
(17, 5, 29, 58, 'Qualified', 82.00, 'Cleared the test.', 1, 1),
(17, 5, 30, 50, 'Qualified', 76.00, 'Cleared the test.', 1, 1),
(17, 5, 31, 37, 'Not Qualified', 48.00, 'Score below the cut-off.', 1, 1),
(17, 5, 46, 47, 'Qualified', 82.00, 'Cleared aptitude and coding test.', 1, 1),
(18, 5, 26, 42, 'Qualified', 89.00, 'Strong in data structures and projects.', 1, 1),
(18, 5, 27, 59, 'Qualified', 85.00, 'Good technical knowledge.', 1, 1),
(18, 5, 28, 28, 'Qualified', 80.00, 'Satisfactory technical knowledge.', 1, 1),
(18, 5, 29, 58, 'Not Qualified', 55.00, 'Weak in core subjects.', 1, 1),
(18, 5, 30, 50, 'Absent', NULL, 'Did not attend the interview.', 1, 1),
(18, 5, 46, 47, 'Qualified', 80.00, 'Good fundamental engineering knowledge.', 1, 1),
(19, 5, 26, 42, 'Qualified', 90.00, 'Excellent communication.', 1, 1),
(19, 5, 27, 59, 'Qualified', 86.00, 'Good communication.', 1, 1),
(19, 5, 28, 28, 'Not Qualified', 58.00, 'Needs better communication skills.', 1, 1),
(19, 5, 46, 47, 'Not Qualified', 58.00, 'Needs better communication in managerial scenarios.', 1, 1),

-- Past drive 6 (Capgemini): rounds 1 and 2 published
(21, 6, 34, 31, 'Qualified', 87.00, 'Very good aptitude.', 1, 1),
(21, 6, 36, 51, 'Qualified', 80.00, 'Cleared the test.', 1, 1),
(21, 6, 35, 22, 'Qualified', 83.00, 'Cleared the test.', 1, 1),
(21, 6, 37, 62, 'Not Qualified', 45.00, 'Score below the cut-off.', 1, 1),
(22, 6, 34, 31, 'Qualified', 88.00, 'Strong technical round.', 1, 1),
(22, 6, 36, 51, 'Not Qualified', 52.00, 'Weak in programming basics.', 1, 1),
(22, 6, 35, 22, 'Qualified', 82.00, 'Good technical round.', 1, 1);

-- 10. Campus Notifications & Job Alerts
INSERT INTO notifications (user_id, title, message, type)
SELECT id, 'Campus Placement Season 2026 Commenced', 'Welcome to the College Placement Portal. All students are advised to review open placement drives and keep profiles updated.', 'announcement'
FROM users WHERE role = 'student';

-- Specific Congratulations Notifications for Selected Students & Pipeline Tracking
INSERT INTO notifications (user_id, title, message, type) VALUES
(43, '🎉 Congratulations! You are selected', 'You have been selected by Tata Consultancy Services (TCS) for Systems Engineer (Digital). Package: 7.00 LPA. Offer Ref: TCS/2026/DIG-43. Check My Applications for your official offer letter.', 'result'),
(43, 'Shortlisted for Placement Drive', 'Congratulations! You have been shortlisted at Rank #1 for Tata Consultancy Services (TCS) Systems Engineer (Digital). Check your interview round schedule.', 'shortlist'),
(43, 'Technical Interview Qualified', 'Outstanding score of 97.00 in TCS Technical Interview. Final selection completed.', 'round'),
(43, 'Application Approved - Amazon SDE-1', 'Your application for Amazon Development Centre India (SDE-1, 18.00 LPA) has been approved by the Placement Cell.', 'application'),
(47, 'Shortlisted for Placement Drive', 'Congratulations! You have been shortlisted for Tata Consultancy Services (TCS) Systems Engineer. Check your interview rounds schedule.', 'shortlist'),
(47, 'Online Assessment Qualified', 'You scored 86.50 in TCS Online Assessment and qualified for Round 2 Technical Interview.', 'round'),
(10, 'Application Approved - Infosys', 'Your application for Infosys Specialist Programmer (9.50 LPA) has been verified and approved by the Placement Cell.', 'application'),
(10, 'Application Approved - TCS', 'Your application for TCS Systems Engineer has been approved by the Placement Cell.', 'application'),
(13, 'Application Under Review - TCS', 'Your application for TCS Systems Engineer is under verification by university placement coordinator.', 'application'),
(101, 'Congratulations! You are selected', 'You have been selected by Tata Consultancy Services (TCS) for Systems Engineer (Digital & Ninja). Package: 7.00 LPA. Check My Applications for your official offer details.', 'result'),
(71, 'Congratulations! You are selected', 'You have been selected by Tata Consultancy Services (TCS) for Systems Engineer (Digital & Ninja). Package: 7.00 LPA. Check My Applications for your official offer details.', 'result'),
(77, 'Shortlisted for Placement Drive', 'Congratulations! You have been shortlisted for Tata Consultancy Services (TCS) Systems Engineer. Check your interview rounds schedule.', 'shortlist'),
(91, 'Shortlisted for Placement Drive', 'Congratulations! You have been shortlisted for Tata Consultancy Services (TCS) Systems Engineer. Check your interview rounds schedule.', 'shortlist'),
(82, 'Shortlisted for Placement Drive', 'Congratulations! You have been shortlisted for Tata Consultancy Services (TCS) Systems Engineer. Check your interview rounds schedule.', 'shortlist'),
(14, 'Shortlisted for Placement Drive', 'Congratulations! You have been shortlisted for Tata Consultancy Services (TCS) Systems Engineer. Check your interview rounds schedule.', 'shortlist'),
(42, 'Congratulations! You are selected', 'You are selected by Wipro Technologies for Project Engineer (Wipro Turbo). Package: 6.50 LPA.', 'result'),
(59, 'Congratulations! You are selected', 'You are selected by Wipro Technologies for Project Engineer (Wipro Turbo). Package: 6.50 LPA.', 'result'),
(31, 'Congratulations! You are selected', 'You are selected by Capgemini India for Analyst (Software). Package: 4.50 LPA.', 'result'),
(22, 'Congratulations! You are selected', 'You are selected by Capgemini India for Analyst (Software). Package: 4.50 LPA.', 'result'),
(28, 'Final result published', 'The final result for Wipro Technologies - Project Engineer is published. Check My Applications.', 'result'),
(51, 'Final result published', 'The final result for Capgemini India - Analyst is published. Check My Applications.', 'result');
