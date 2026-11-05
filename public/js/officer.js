/**
 * officer.js - Placement Officer Portal Logic
 * Comprehensive management of companies, placement drives, applications review,
 * ranked shortlist generation, rounds and results scoring, final offers, student directory,
 * broadcast notifications, and officer accounts.
 */

const Officer = {
  currentDashboardData: null,
  companies: [],
  editingCompanyId: null,
  editingDriveId: null,
  applications: [],
  students: [],
  drives: [],

  isKeyCandidate(roll) {
    return false;
  },

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Add Company Form & Real-time Validation
    const companyForm = document.getElementById('officer-company-form');
    if (companyForm) {
      companyForm.addEventListener('submit', (e) => this.handleSaveCompany(e));

      const cName = document.getElementById('comp-name');
      const cWeb = document.getElementById('comp-website');
      const cDesc = document.getElementById('comp-desc');
      const cEmail = document.getElementById('comp-email');
      const cPhone = document.getElementById('comp-phone');

      if (cName) Validator.bind(cName, () => Validator.validateText(cName, { min: 1, max: 150, required: true, fieldName: 'Company legal name' }, 'err-comp-name'));
      if (cWeb) Validator.bind(cWeb, () => Validator.validateUrl(cWeb, { required: false, max: 255, fieldName: 'Official website' }, 'err-comp-website'));
      if (cDesc) Validator.bind(cDesc, () => Validator.validateText(cDesc, { min: 1, max: 2000, required: true, fieldName: 'Company overview' }, 'err-comp-desc'));
      if (cEmail) Validator.bind(cEmail, () => Validator.validateEmail(cEmail, { required: false, max: 150, fieldName: 'Contact email' }, 'err-comp-email'));
      if (cPhone) Validator.bind(cPhone, () => Validator.validatePhone(cPhone, { required: false, max: 50, fieldName: 'Contact phone' }, 'err-comp-phone'));
    }

    // Cancel company edit
    document.getElementById('comp-cancel-btn')?.addEventListener('click', () => this.cancelEditCompany());

    // Create Drive Form & Real-time Validation
    const driveForm = document.getElementById('officer-drive-form');
    if (driveForm) {
      driveForm.addEventListener('submit', (e) => this.handleSaveDrive(e));

      const dComp = document.getElementById('drive-company-id');
      const dTitle = document.getElementById('drive-title');
      const dDesc = document.getElementById('drive-desc');
      const dPkg = document.getElementById('drive-package');
      const dLoc = document.getElementById('drive-location');
      const dCgpa = document.getElementById('drive-cgpa');
      const dBranches = document.getElementById('drive-branches');
      const dBatch = document.getElementById('drive-batch');
      const dSkills = document.getElementById('drive-skills');
      const dDeadline = document.getElementById('drive-deadline');
      const dDate = document.getElementById('drive-date');

      if (dComp) Validator.bind(dComp, () => Validator.validateRequired(dComp, 'Recruiting company', 'err-drive-company-id'));
      if (dTitle) Validator.bind(dTitle, () => Validator.validateText(dTitle, { min: 1, max: 150, required: true, fieldName: 'Job title' }, 'err-drive-title'));
      if (dDesc) Validator.bind(dDesc, () => Validator.validateText(dDesc, { min: 1, max: 5000, required: true, fieldName: 'Job description' }, 'err-drive-desc'));
      if (dPkg) Validator.bind(dPkg, () => Validator.validateNumber(dPkg, { min: 0, max: 9999, integer: false, required: true, fieldName: 'Annual compensation' }, 'err-drive-package'));
      if (dLoc) Validator.bind(dLoc, () => Validator.validateText(dLoc, { min: 1, max: 150, required: true, fieldName: 'Work location' }, 'err-drive-location'));
      if (dCgpa) Validator.bind(dCgpa, () => Validator.validateNumber(dCgpa, { min: 0, max: 10, integer: false, required: false, fieldName: 'Minimum cutoff CGPA' }, 'err-drive-cgpa'));
      if (dBranches) Validator.bind(dBranches, () => Validator.validateText(dBranches, { min: 1, max: 255, required: true, fieldName: 'Eligible branches' }, 'err-drive-branches'));
      if (dBatch) Validator.bind(dBatch, () => Validator.validateNumber(dBatch, { min: 2000, max: 2100, integer: true, required: true, fieldName: 'Target graduation batch' }, 'err-drive-batch'));
      if (dSkills) Validator.bind(dSkills, () => Validator.validateText(dSkills, { min: 1, max: 2000, required: true, fieldName: 'Required skills' }, 'err-drive-skills'));
      if (dDeadline) {
        Validator.bind(dDeadline, () => {
          Validator.validateFutureDateTime(dDeadline, { required: true, fieldName: 'Application deadline' }, 'err-drive-deadline');
          if (dDate && dDate.value) {
            Validator.validateDateAfter(dDate, dDeadline, { required: true, fieldName: 'Placement date', compareName: 'application deadline' }, 'err-drive-date');
          }
        });
      }
      if (dDate) {
        Validator.bind(dDate, () => {
          Validator.validateDateAfter(dDate, dDeadline, { required: true, fieldName: 'Placement date', compareName: 'application deadline' }, 'err-drive-date');
        });
      }
    }

    // Cancel drive edit
    document.getElementById('drive-cancel-btn')?.addEventListener('click', () => this.cancelEditDrive());

    // Bulk approve eligible applications
    document.getElementById('officer-bulk-approve-btn')?.addEventListener('click', () => this.handleBulkApprove());

    // Applications filter listeners
    const appDriveSelect = document.getElementById('officer-app-drive-select');
    const appStatusSelect = document.getElementById('officer-app-status-select');
    if (appDriveSelect) appDriveSelect.addEventListener('change', () => this.loadApplications());
    if (appStatusSelect) appStatusSelect.addEventListener('change', () => this.loadApplications());

    // Generate Shortlist Form & Real-time Validation
    const shortlistForm = document.getElementById('officer-shortlist-form');
    if (shortlistForm) {
      shortlistForm.addEventListener('submit', (e) => this.handleGenerateShortlist(e));

      const slDrive = document.getElementById('shortlist-drive-id');
      const slCgpa = document.getElementById('shortlist-cgpa-override');
      const slMax = document.getElementById('shortlist-max-candidates');

      if (slDrive) Validator.bind(slDrive, () => Validator.validateRequired(slDrive, 'Placement drive', 'err-shortlist-drive-id'));
      if (slCgpa) Validator.bind(slCgpa, () => Validator.validateNumber(slCgpa, { min: 0, max: 10, integer: false, required: false, fieldName: 'Cutoff override' }, 'err-shortlist-cgpa-override'));
      if (slMax) Validator.bind(slMax, () => Validator.validateNumber(slMax, { min: 1, max: 100000, integer: true, required: false, fieldName: 'Max candidates' }, 'err-shortlist-max-candidates'));
    }

    // Rounds Drive Select
    const roundsDriveSelect = document.getElementById('officer-rounds-drive-select');
    if (roundsDriveSelect) {
      roundsDriveSelect.addEventListener('change', () => this.loadRoundsForDrive());
    }

    // Results Drive Select
    const resultsDriveSelect = document.getElementById('officer-results-drive-select');
    if (resultsDriveSelect) {
      resultsDriveSelect.addEventListener('change', () => this.loadResultsForDrive());
    }

    // Student Directory Search & Filters
    const dirSearch = document.getElementById('dir-search');
    const dirDept = document.getElementById('dir-dept');
    const dirCgpa = document.getElementById('dir-cgpa');
    const dirBatch = document.getElementById('dir-batch');
    const dirSearchBtn = document.getElementById('dir-search-btn');

    if (dirSearchBtn) {
      dirSearchBtn.addEventListener('click', () => this.loadDirectory());
    }

    // Broadcast Announcement Form & Real-time Validation
    const announceForm = document.getElementById('officer-announce-form');
    if (announceForm) {
      announceForm.addEventListener('submit', (e) => this.handleSendAnnouncement(e));

      const annTitle = document.getElementById('announce-title');
      const annMsg = document.getElementById('announce-msg');

      if (annTitle) Validator.bind(annTitle, () => Validator.validateText(annTitle, { min: 1, max: 150, required: true, fieldName: 'Subject line' }, 'err-announce-title'));
      if (annMsg) Validator.bind(annMsg, () => Validator.validateText(annMsg, { min: 1, max: 2000, required: true, fieldName: 'Notice body' }, 'err-announce-msg'));
    }

    // Create Officer Form & Real-time Validation
    const createOfficerForm = document.getElementById('officer-create-account-form');
    if (createOfficerForm) {
      createOfficerForm.addEventListener('submit', (e) => this.handleCreateOfficer(e));

      const offName = document.getElementById('officer-new-name');
      const offEmail = document.getElementById('officer-new-email');
      const offPass = document.getElementById('officer-new-password');

      if (offName) Validator.bind(offName, () => Validator.validateText(offName, { min: 1, max: 120, required: true, fieldName: 'Officer full name' }, 'err-officer-new-name'));
      if (offEmail) Validator.bind(offEmail, () => Validator.validateEmail(offEmail, { required: true, max: 150, fieldName: 'Officer email' }, 'err-officer-new-email'));
      if (offPass) Validator.bind(offPass, () => Validator.validatePassword(offPass, { min: 8, max: 72, requireLetterNumber: true, fieldName: 'Password' }, 'err-officer-new-password'));
    }
  },

  /* -------------------- 1. DASHBOARD -------------------- */
  async loadDashboard() {
    try {
      const res = await API.api('/students/officer-dashboard');
      this.currentDashboardData = res;

      const s = res.stats || {};
      document.getElementById('stat-total-students').textContent = s.total_students || 0;
      document.getElementById('stat-total-companies').textContent = s.total_companies || 0;
      document.getElementById('stat-total-drives').textContent = s.total_drives || 0;
      document.getElementById('stat-total-apps').textContent = s.total_applications || 0;
      document.getElementById('stat-shortlisted-students').textContent = s.shortlisted_students || 0;
      document.getElementById('stat-placed-students').textContent = s.selected_students || 0;

      const highestPkgEl = document.getElementById('stat-highest-pkg');
      if (highestPkgEl) highestPkgEl.textContent = s.highest_package ? s.highest_package + ' LPA' : '0 LPA';

      const avgPkgEl = document.getElementById('stat-avg-pkg');
      if (avgPkgEl) avgPkgEl.textContent = s.average_package ? s.average_package + ' LPA' : '0 LPA';

      const placementRateEl = document.getElementById('stat-placement-rate');
      if (placementRateEl) placementRateEl.textContent = s.placement_rate !== undefined ? s.placement_rate + '%' : '0%';

      // Department-wise Placement Statistics
      const deptTbody = document.getElementById('officer-dept-stats-tbody');
      if (deptTbody && res.department_stats) {
        if (res.department_stats.length === 0) {
          deptTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No branch records available.</td></tr>';
        } else {
          deptTbody.innerHTML = res.department_stats.map(d => {
            const rate = d.total_students > 0 ? ((d.placed_students / d.total_students) * 100).toFixed(1) : '0.0';
            return `
              <tr>
                <td><strong>${API.escapeHtml(d.department)}</strong></td>
                <td>${d.total_students}</td>
                <td><span class="badge ${d.placed_students > 0 ? 'badge-success' : 'badge-neutral'}">${d.placed_students}</span></td>
                <td><strong>${rate}%</strong></td>
                <td><strong>${d.highest_lpa > 0 ? d.highest_lpa + ' LPA' : '—'}</strong></td>
              </tr>
            `;
          }).join('');
        }
      }

      // Recent Activity
      const tbody = document.getElementById('officer-recent-activity-tbody');
      if (tbody) {
        if (!res.recent_activity || res.recent_activity.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="5">
                <div class="empty-state-box" style="padding:2rem 1rem">
                  <svg class="empty-state-svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <div class="empty-state-heading">No Recent Activity</div>
                  <p class="empty-state-text">Candidate applications and placement review updates will stream live into this table.</p>
                </div>
              </td>
            </tr>
          `;
        } else {
          tbody.innerHTML = res.recent_activity.map(a => {
            const statusBadgeClass = {
              'Applied': 'badge-info',
              'Approved': 'badge-success',
              'Rejected': 'badge-danger',
              'Shortlisted': 'badge-warning',
              'Selected': 'badge-success'
            }[a.status] || 'badge-neutral';

            return `
              <tr>
                <td><strong>${API.escapeHtml(a.student_name)}</strong> <span style="font-size:0.8rem;color:var(--text-muted)">(${API.escapeHtml(a.roll_number || 'N/A')})</span></td>
                <td>${API.escapeHtml(a.company_name)}</td>
                <td>${API.escapeHtml(a.job_title)}</td>
                <td><span class="badge ${statusBadgeClass}">${a.status}</span></td>
                <td style="font-size:0.8rem;color:var(--text-muted)">${API.formatDateTime(a.status_updated_at)}</td>
              </tr>
            `;
          }).join('');
        }
      }
    } catch (err) {
      API.showToast(err.message || 'Failed to load officer dashboard.', 'danger');
    }
  },

  /* -------------------- 2. COMPANIES -------------------- */
  async loadCompanies() {
    try {
      const res = await API.api('/companies');
      this.companies = res.companies || [];
      const tbody = document.getElementById('officer-companies-tbody');
      if (!tbody) return;

      // Also populate company dropdown in drive creation form
      this.populateCompanySelects();

      if (this.companies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No companies registered yet. Add one above.</td></tr>';
        return;
      }

      tbody.innerHTML = this.companies.map(c => `
        <tr>
          <td><strong>${API.escapeHtml(c.name)}</strong></td>
          <td style="max-width:260px;font-size:0.85rem">${API.escapeHtml(c.description)}</td>
          <td>${c.website ? `<a href="${API.escapeHtml(c.website)}" target="_blank" rel="noopener">Visit</a>` : '—'}</td>
          <td>
            ${c.contact_email ? `<div>${API.escapeHtml(c.contact_email)}</div>` : ''}
            ${c.contact_phone ? `<div style="font-size:0.75rem;color:var(--text-muted)">${API.escapeHtml(c.contact_phone)}</div>` : ''}
          </td>
          <td>
            <span class="badge ${c.is_active ? 'badge-success' : 'badge-danger'}">
              ${c.is_active ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td style="white-space:nowrap">
            <button class="btn btn-primary btn-sm" onclick="Officer.startEditCompany(${c.id})">Edit</button>
            <button class="btn btn-secondary btn-sm" onclick="Officer.handleToggleCompanyStatus(${c.id}, ${c.is_active ? 0 : 1})">
              ${c.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button class="btn btn-danger btn-sm" onclick="Officer.handleDeleteCompany(${c.id})">Delete</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      API.showToast(err.message || 'Failed to load companies.', 'danger');
    }
  },

  populateCompanySelects() {
    const selects = [
      document.getElementById('drive-company-id')
    ];
    selects.forEach(select => {
      if (!select) return;
      const currentVal = select.value;
      select.innerHTML = '<option value="">-- Select Company --</option>' +
        this.companies.filter(c => c.is_active).map(c => `<option value="${c.id}">${API.escapeHtml(c.name)}</option>`).join('');
      if (currentVal) select.value = currentVal;
    });
  },

  async handleSaveCompany(e) {
    e.preventDefault();
    const nameEl = document.getElementById('comp-name');
    const websiteEl = document.getElementById('comp-website');
    const descEl = document.getElementById('comp-desc');
    const emailEl = document.getElementById('comp-email');
    const phoneEl = document.getElementById('comp-phone');
    const btn = document.getElementById('comp-save-btn');

    const nameOk = Validator.validateText(nameEl, { min: 1, max: 150, required: true, fieldName: 'Company legal name' }, 'err-comp-name');
    const webOk = Validator.validateUrl(websiteEl, { required: false, max: 255, fieldName: 'Official website' }, 'err-comp-website');
    const descOk = Validator.validateText(descEl, { min: 1, max: 2000, required: true, fieldName: 'Company overview' }, 'err-comp-desc');
    const emailOk = Validator.validateEmail(emailEl, { required: false, max: 150, fieldName: 'Contact email' }, 'err-comp-email');
    const phoneOk = Validator.validatePhone(phoneEl, { required: false, max: 50, fieldName: 'Contact phone' }, 'err-comp-phone');

    if (!nameOk || !webOk || !descOk || !emailOk || !phoneOk) {
      API.showToast('Please fix the highlighted errors before saving.', 'warning');
      const firstErr = document.getElementById('officer-company-form').querySelector('.input-error');
      if (firstErr) firstErr.focus();
      return;
    }

    const name = nameEl.value.trim();
    const description = descEl.value.trim();
    const website = websiteEl.value.trim();
    const contact_email = emailEl.value.trim();
    const contact_phone = phoneEl.value.trim();

    try {
      btn.disabled = true;
      btn.textContent = 'Saving...';

      // same form is used for adding (POST) and editing (PUT)
      const url = this.editingCompanyId ? `/companies/${this.editingCompanyId}` : '/companies';
      const res = await API.api(url, {
        method: this.editingCompanyId ? 'PUT' : 'POST',
        body: { name, description, website: website || undefined, contact_email: contact_email || undefined, contact_phone: contact_phone || undefined }
      });

      API.showToast(res.message || 'Company saved!', 'success');
      this.cancelEditCompany();
      this.loadCompanies();
    } catch (err) {
      API.showToast(err.message || 'Failed to save company.', 'danger');
    } finally {
      btn.disabled = false;
      btn.textContent = this.editingCompanyId ? 'Update Company' : 'Save Company Record';
    }
  },

  // Fill the form with the company's details so the officer can change them
  startEditCompany(id) {
    const c = this.companies.find(item => item.id === id);
    if (!c) return;
    this.editingCompanyId = id;
    document.getElementById('comp-name').value = c.name;
    document.getElementById('comp-desc').value = c.description;
    document.getElementById('comp-website').value = c.website || '';
    document.getElementById('comp-email').value = c.contact_email || '';
    document.getElementById('comp-phone').value = c.contact_phone || '';
    document.getElementById('comp-form-title').textContent = 'Edit Company: ' + c.name;
    document.getElementById('comp-save-btn').textContent = 'Update Company';
    document.getElementById('comp-cancel-btn').classList.remove('hidden');
    Validator.clearErrors(document.getElementById('officer-company-form'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  cancelEditCompany() {
    this.editingCompanyId = null;
    const form = document.getElementById('officer-company-form');
    if (form) {
      form.reset();
      Validator.clearErrors(form);
    }
    document.getElementById('comp-form-title').textContent = 'Add Recruiting Partner Company';
    document.getElementById('comp-save-btn').textContent = 'Save Company Record';
    document.getElementById('comp-cancel-btn').classList.add('hidden');
  },

  async handleDeleteCompany(id) {
    if (!confirm('Delete this company permanently?')) return;
    try {
      const res = await API.api(`/companies/${id}`, { method: 'DELETE' });
      API.showToast(res.message, 'success');
      this.loadCompanies();
    } catch (err) {
      API.showToast(err.message || 'Failed to delete company.', 'danger');
    }
  },

  async handleToggleCompanyStatus(id, newStatus) {
    try {
      const res = await API.api(`/companies/${id}/status`, {
        method: 'PATCH',
        body: { is_active: newStatus }
      });
      API.showToast(res.message || 'Company status updated.', 'success');
      this.loadCompanies();
    } catch (err) {
      API.showToast(err.message || 'Failed to update company status.', 'danger');
    }
  },

  /* -------------------- 3. DRIVES -------------------- */
  async loadDrives() {
    try {
      const res = await API.api('/drives');
      this.drives = res.drives || [];
      const tbody = document.getElementById('officer-drives-tbody');
      if (!tbody) return;

      this.populateDriveSelects();

      if (this.drives.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No placement drives created yet. Create one above.</td></tr>';
        return;
      }

      tbody.innerHTML = this.drives.map(d => `
        <tr>
          <td>
            <strong>${API.escapeHtml(d.job_title)}</strong>
            <div style="font-size:0.75rem;color:var(--text-muted)">${API.escapeHtml(d.company_name)} &bull; ${API.escapeHtml(d.location)}</div>
          </td>
          <td>${d.package_lpa} LPA</td>
          <td>
            <div style="font-size:0.8rem">Min CGPA: ${d.min_cgpa}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">Batch ${d.graduation_year} (${API.escapeHtml(d.eligible_branches)})</div>
          </td>
          <td>
            <span class="badge ${d.is_published ? 'badge-success' : 'badge-warning'}">
              ${d.is_published ? 'Published' : 'Draft'}
            </span>
          </td>
          <td>
            <span class="badge ${d.status === 'open' ? 'badge-info' : 'badge-neutral'}">
              ${d.status.toUpperCase()}
            </span>
          </td>
          <td style="font-size:0.8rem">
            <div><strong>Shortlist:</strong> ${d.shortlist_published ? '<span class="badge badge-success">Published</span>' : '<span class="badge badge-neutral">Unpublished</span>'}</div>
            <div style="margin-top:0.2rem"><strong>Final:</strong> ${d.results_published ? '<span class="badge badge-success">Published</span>' : '<span class="badge badge-neutral">Unpublished</span>'}</div>
          </td>
          <td style="white-space:nowrap">
            <button class="btn btn-primary btn-sm" onclick="Officer.startEditDrive(${d.id})">Edit</button>
            <button class="btn btn-secondary btn-sm" onclick="Officer.handleToggleDrivePublish(${d.id}, ${d.is_published ? 0 : 1})">
              ${d.is_published ? 'Unpublish' : 'Publish'}
            </button>
            <button class="btn btn-secondary btn-sm" onclick="Officer.handleToggleDriveStatus(${d.id}, '${d.status === 'open' ? 'closed' : 'open'}')">
              ${d.status === 'open' ? 'Close' : 'Reopen'}
            </button>
            <button class="btn btn-danger btn-sm" onclick="Officer.handleDeleteDrive(${d.id})">Delete</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      API.showToast(err.message || 'Failed to load placement drives.', 'danger');
    }
  },

  populateDriveSelects() {
    const selects = [
      document.getElementById('officer-app-drive-select'),
      document.getElementById('shortlist-drive-id'),
      document.getElementById('officer-rounds-drive-select'),
      document.getElementById('officer-results-drive-select'),
      document.getElementById('announce-drive-id')
    ];
    selects.forEach(select => {
      if (!select) return;
      const currentVal = select.value;
      const isFilter = select.id.includes('filter') || select.id.includes('select');
      select.innerHTML = (isFilter ? '<option value="">All Placement Drives</option>' : '<option value="">-- Select Drive --</option>') +
        this.drives.map(d => `<option value="${d.id}">${API.escapeHtml(d.company_name)} — ${API.escapeHtml(d.job_title)}</option>`).join('');
      if (currentVal) select.value = currentVal;
    });
  },

  async handleSaveDrive(e) {
    e.preventDefault();
    const compEl = document.getElementById('drive-company-id');
    const titleEl = document.getElementById('drive-title');
    const descEl = document.getElementById('drive-desc');
    const pkgEl = document.getElementById('drive-package');
    const locEl = document.getElementById('drive-location');
    const cgpaEl = document.getElementById('drive-cgpa');
    const branchesEl = document.getElementById('drive-branches');
    const batchEl = document.getElementById('drive-batch');
    const skillsEl = document.getElementById('drive-skills');
    const deadlineEl = document.getElementById('drive-deadline');
    const dateEl = document.getElementById('drive-date');
    const btn = document.getElementById('drive-save-btn');

    const compOk = Validator.validateRequired(compEl, 'Recruiting company', 'err-drive-company-id');
    const titleOk = Validator.validateText(titleEl, { min: 1, max: 150, required: true, fieldName: 'Job title' }, 'err-drive-title');
    const descOk = Validator.validateText(descEl, { min: 1, max: 5000, required: true, fieldName: 'Job description' }, 'err-drive-desc');
    const pkgOk = Validator.validateNumber(pkgEl, { min: 0, max: 9999, integer: false, required: true, fieldName: 'Annual compensation' }, 'err-drive-package');
    const locOk = Validator.validateText(locEl, { min: 1, max: 150, required: true, fieldName: 'Work location' }, 'err-drive-location');
    const cgpaOk = Validator.validateNumber(cgpaEl, { min: 0, max: 10, integer: false, required: false, fieldName: 'Minimum cutoff CGPA' }, 'err-drive-cgpa');
    const branchesOk = Validator.validateText(branchesEl, { min: 1, max: 255, required: true, fieldName: 'Eligible branches' }, 'err-drive-branches');
    const batchOk = Validator.validateNumber(batchEl, { min: 2000, max: 2100, integer: true, required: true, fieldName: 'Target graduation batch' }, 'err-drive-batch');
    const skillsOk = Validator.validateText(skillsEl, { min: 1, max: 2000, required: true, fieldName: 'Required skills' }, 'err-drive-skills');
    const deadlineOk = Validator.validateFutureDateTime(deadlineEl, { required: true, fieldName: 'Application deadline' }, 'err-drive-deadline');
    const dateOk = Validator.validateDateAfter(dateEl, deadlineEl, { required: true, fieldName: 'Placement date', compareName: 'application deadline' }, 'err-drive-date');

    if (!compOk || !titleOk || !descOk || !pkgOk || !locOk || !cgpaOk || !branchesOk || !batchOk || !skillsOk || !deadlineOk || !dateOk) {
      API.showToast('Please fix the highlighted errors before creating the drive.', 'warning');
      const firstErr = document.getElementById('officer-drive-form').querySelector('.input-error');
      if (firstErr) firstErr.focus();
      return;
    }

    const company_id = compEl.value;
    const job_title = titleEl.value.trim();
    const job_description = descEl.value.trim();
    const package_lpa = pkgEl.value;
    const location = locEl.value.trim();
    const required_skills = skillsEl.value.trim();
    const min_cgpa = cgpaEl.value;
    const eligible_branches = branchesEl.value.trim();
    const graduation_year = batchEl.value;
    const application_deadline = deadlineEl.value;
    const placement_date = dateEl.value;
    const is_published = document.getElementById('drive-publish-check').checked ? 1 : 0;

    try {
      btn.disabled = true;
      btn.textContent = this.editingDriveId ? 'Updating Drive...' : 'Creating Drive...';

      const url = this.editingDriveId ? `/drives/${this.editingDriveId}` : '/drives';
      const method = this.editingDriveId ? 'PUT' : 'POST';

      const res = await API.api(url, {
        method,
        body: {
          company_id: Number(company_id),
          job_title,
          job_description,
          package_lpa: Number(package_lpa),
          location,
          required_skills,
          min_cgpa: min_cgpa ? Number(min_cgpa) : 0,
          eligible_branches,
          graduation_year: Number(graduation_year),
          application_deadline,
          placement_date,
          is_published
        }
      });

      API.showToast(res.message || 'Drive saved successfully!', 'success');
      this.cancelEditDrive();
      this.loadDrives();
    } catch (err) {
      API.showToast(err.message || 'Failed to save drive.', 'danger');
    } finally {
      btn.disabled = false;
      btn.textContent = this.editingDriveId ? 'Update Drive' : 'Create Drive (adds 4 default rounds)';
    }
  },

  startEditDrive(id) {
    const d = this.drives.find(item => item.id === id);
    if (!d) return;
    this.editingDriveId = id;

    document.getElementById('drive-company-id').value = d.company_id;
    document.getElementById('drive-title').value = d.job_title;
    document.getElementById('drive-desc').value = d.job_description;
    document.getElementById('drive-package').value = d.package_lpa;
    document.getElementById('drive-location').value = d.location;
    document.getElementById('drive-cgpa').value = d.min_cgpa;
    document.getElementById('drive-branches').value = d.eligible_branches;
    document.getElementById('drive-batch').value = d.graduation_year;
    document.getElementById('drive-skills').value = d.required_skills;
    document.getElementById('drive-deadline').value = API.toInputDateTime(d.application_deadline);
    document.getElementById('drive-date').value = API.toInputDate(d.placement_date);
    document.getElementById('drive-publish-check').checked = !!d.is_published;

    document.getElementById('drive-form-title').textContent = 'Edit Placement Drive: ' + d.job_title;
    document.getElementById('drive-save-btn').textContent = 'Update Drive';
    document.getElementById('drive-cancel-btn').classList.remove('hidden');

    Validator.clearErrors(document.getElementById('officer-drive-form'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  cancelEditDrive() {
    this.editingDriveId = null;
    const form = document.getElementById('officer-drive-form');
    if (form) {
      form.reset();
      Validator.clearErrors(form);
    }
    document.getElementById('drive-form-title').textContent = 'Create Campus Placement Drive';
    document.getElementById('drive-save-btn').textContent = 'Create Drive (adds 4 default rounds)';
    document.getElementById('drive-cancel-btn').classList.add('hidden');
  },

  async handleDeleteDrive(id) {
    if (!confirm('Are you sure you want to permanently delete this placement drive? This only works if no student applications exist.')) return;
    try {
      const res = await API.api(`/drives/${id}`, { method: 'DELETE' });
      API.showToast(res.message || 'Drive deleted.', 'success');
      this.loadDrives();
    } catch (err) {
      API.showToast(err.message || 'Failed to delete drive.', 'danger');
    }
  },

  async handleBulkApprove() {
    const driveId = document.getElementById('officer-app-drive-select')?.value;
    if (!driveId) {
      API.showToast('Please select a specific placement drive from the dropdown first.', 'warning');
      return;
    }
    if (!confirm('Verify and approve all eligible candidates who applied for this drive?')) return;
    try {
      const res = await API.api('/applications/bulk-approve', {
        method: 'POST',
        body: { drive_id: Number(driveId) }
      });
      API.showToast(res.message, 'success');
      this.loadApplications();
    } catch (err) {
      API.showToast(err.message || 'Bulk approval failed.', 'danger');
    }
  },

  async handleToggleDrivePublish(id, newPub) {
    try {
      const res = await API.api(`/drives/${id}/publish`, {
        method: 'PATCH',
        body: { is_published: newPub }
      });
      API.showToast(res.message || 'Drive publish state updated.', 'success');
      this.loadDrives();
    } catch (err) {
      API.showToast(err.message || 'Failed to update publish state.', 'danger');
    }
  },

  async handleToggleDriveStatus(id, newStatus) {
    try {
      const res = await API.api(`/drives/${id}/status`, {
        method: 'PATCH',
        body: { status: newStatus }
      });
      API.showToast(res.message || 'Drive status updated.', 'success');
      this.loadDrives();
    } catch (err) {
      API.showToast(err.message || 'Failed to update drive status.', 'danger');
    }
  },

  /* -------------------- 4. APPLICATIONS -------------------- */
  async loadApplications() {
    const tbody = document.getElementById('officer-apps-tbody');
    if (!tbody) return;

    const driveId = document.getElementById('officer-app-drive-select')?.value || '';
    const status = document.getElementById('officer-app-status-select')?.value || '';

    let url = '/applications?';
    if (driveId) url += `drive_id=${driveId}&`;
    if (status) url += `status=${encodeURIComponent(status)}&`;

    try {
      const res = await API.api(url);
      const apps = res.applications || [];
      this.applications = apps;

      if (apps.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No applications found matching filters.</td></tr>';
        return;
      }

      tbody.innerHTML = apps.map(a => {
        const elig = a.academic_eligibility || {};
        return `
          <tr>
            <td>
              <strong>${API.escapeHtml(a.student_name)}</strong>
              <div style="font-size:0.75rem;color:var(--text-muted)">${API.escapeHtml(a.student_email)}</div>
            </td>
            <td>
              <div><strong>${API.escapeHtml(a.roll_number || 'N/A')}</strong></div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${API.escapeHtml(a.department || '')} &bull; CGPA: ${a.cgpa || 'N/A'}</div>
            </td>
            <td>
              <strong>${API.escapeHtml(a.job_title)}</strong>
              <div style="font-size:0.75rem;color:var(--text-muted)">${API.escapeHtml(a.company_name)}</div>
            </td>
            <td>
              <span class="badge ${elig.eligible ? 'badge-success' : 'badge-danger'}" title="${API.escapeHtml(elig.reason || '')}">
                ${elig.eligible ? 'Meets Criteria' : 'Ineligible'}
              </span>
            </td>
            <td>
              <span class="badge badge-info">${a.status}</span>
              ${a.officer_remarks ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.2rem">"${API.escapeHtml(a.officer_remarks)}"</div>` : ''}
            </td>
            <td style="font-size:0.8rem;color:var(--text-muted)">${API.formatDate(a.applied_at)}</td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="Officer.openStatusModal(${a.id})">
                Review / Status
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      API.showToast(err.message || 'Failed to load applications.', 'danger');
    }
  },

  openStatusModal(id) {
    const app = this.applications.find(item => item.id === id);
    const currentStatus = app.status;
    const currentRemarks = app.officer_remarks || '';
    const elig = app.academic_eligibility || {};
    let modal = document.getElementById('app-status-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'app-status-modal';
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">Update Application Review</div>
          <button class="modal-close" onclick="document.getElementById('app-status-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="alert ${elig.eligible ? 'alert-success' : 'alert-danger'}" style="margin-bottom:1rem">
            <strong>${API.escapeHtml(app.student_name)}</strong> (${API.escapeHtml(app.roll_number)}) &mdash;
            Eligibility check: ${API.escapeHtml(elig.reason || '')}
          </div>
          <div class="form-group">
            <label class="form-label">Review Status</label>
            <select id="modal-app-status" class="form-control">
              <option value="Applied" ${currentStatus === 'Applied' ? 'selected' : ''}>Applied</option>
              <option value="Under Review" ${currentStatus === 'Under Review' ? 'selected' : ''}>Under Review</option>
              <option value="Approved" ${currentStatus === 'Approved' ? 'selected' : ''}>Approved (can be shortlisted)</option>
              <option value="Rejected" ${currentStatus === 'Rejected' ? 'selected' : ''}>Rejected</option>
              <option value="Not Eligible" ${currentStatus === 'Not Eligible' ? 'selected' : ''}>Not Eligible</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Officer Remarks</label>
            <textarea id="modal-app-remarks" class="form-control" placeholder="Optional comments visible to the student...">${API.escapeHtml(currentRemarks)}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('app-status-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="Officer.handleUpdateAppStatus(${id})">Save Status</button>
        </div>
      </div>
    `;
  },

  async handleUpdateAppStatus(id) {
    const status = document.getElementById('modal-app-status').value;
    const remarks = document.getElementById('modal-app-remarks').value.trim();

    try {
      const res = await API.api(`/applications/${id}/status`, {
        method: 'PATCH',
        body: { status, officer_remarks: remarks || undefined }
      });
      API.showToast(res.message || 'Application status updated.', 'success');
      document.getElementById('app-status-modal')?.remove();
      this.loadApplications();
    } catch (err) {
      API.showToast(err.message || 'Failed to update application status.', 'danger');
    }
  },

  /* -------------------- 5. SHORTLIST -------------------- */
  async handleGenerateShortlist(e) {
    e.preventDefault();
    const driveIdEl = document.getElementById('shortlist-drive-id');
    const minCgpaEl = document.getElementById('shortlist-cgpa-override');
    const maxCandEl = document.getElementById('shortlist-max-candidates');
    const btn = document.getElementById('shortlist-generate-btn');

    const driveOk = Validator.validateRequired(driveIdEl, 'Placement drive', 'err-shortlist-drive-id');
    const cgpaOk = Validator.validateNumber(minCgpaEl, { min: 0, max: 10, integer: false, required: false, fieldName: 'Cutoff override' }, 'err-shortlist-cgpa-override');
    const maxOk = Validator.validateNumber(maxCandEl, { min: 1, max: 100000, integer: true, required: false, fieldName: 'Max candidates' }, 'err-shortlist-max-candidates');

    if (!driveOk || !cgpaOk || !maxOk) {
      API.showToast('Please correct the shortlist parameters.', 'warning');
      const firstErr = document.getElementById('officer-shortlist-form').querySelector('.input-error');
      if (firstErr) firstErr.focus();
      return;
    }

    const driveId = driveIdEl.value;
    const min_cgpa_override = minCgpaEl.value;
    const max_candidates = maxCandEl.value;

    try {
      btn.disabled = true;
      btn.textContent = 'Generating...';

      const res = await API.api('/shortlists/generate', {
        method: 'POST',
        body: {
          drive_id: Number(driveId),
          min_cgpa_override: min_cgpa_override ? Number(min_cgpa_override) : undefined,
          max_candidates: max_candidates ? Number(max_candidates) : undefined
        }
      });

      API.showToast(res.message || 'Ranked shortlist generated successfully!', 'success');
      this.loadShortlistForDrive(driveId);
    } catch (err) {
      API.showToast(err.message || 'Failed to generate shortlist.', 'danger');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generate Ranked Shortlist';
    }
  },

  async loadShortlistForDrive(driveId) {
    if (!driveId) return;
    const container = document.getElementById('officer-shortlist-results');
    if (!container) return;

    try {
      const res = await API.api(`/shortlists/drive/${driveId}`);
      const list = res.shortlist || [];
      const drive = res.drive || {};

      container.innerHTML = `
        <div class="card-header" style="margin-top:1.5rem">
          <div>
            <div class="card-title">${API.escapeHtml(drive.job_title)} Shortlist</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">${res.ranking_rule}</div>
          </div>
          <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
            <span class="badge ${drive.shortlist_approved ? 'badge-success' : 'badge-warning'}">${drive.shortlist_approved ? 'Approved' : 'Not approved'}</span>
            <span class="badge ${drive.shortlist_published ? 'badge-success' : 'badge-neutral'}">${drive.shortlist_published ? 'Published' : 'Unpublished'}</span>
            ${list.length > 0 && !drive.shortlist_approved ? `<button class="btn btn-primary btn-sm" onclick="Officer.handleApproveShortlist(${drive.id})">Approve Shortlist</button>` : ''}
            ${list.length > 0 ? `<button class="btn ${drive.shortlist_published ? 'btn-danger' : 'btn-success'} btn-sm" onclick="Officer.handleToggleShortlistPublish(${drive.id}, ${drive.shortlist_published ? 0 : 1})">
              ${drive.shortlist_published ? 'Unpublish Shortlist' : 'Publish Shortlist'}
            </button>` : ''}
          </div>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student</th>
                <th>Roll Number</th>
                <th>Branch</th>
                <th>CGPA Snapshot</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${list.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No students shortlisted yet.</td></tr>' : list.map(s => `
                <tr>
                  <td><strong>#${s.rank_position}</strong></td>
                  <td><strong>${API.escapeHtml(s.student_name)}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">${API.escapeHtml(s.student_email || '')}</span></td>
                  <td>${API.escapeHtml(s.roll_number)}</td>
                  <td>${API.escapeHtml(s.department || 'N/A')}</td>
                  <td><strong>${s.cgpa}</strong></td>
                  <td><span class="badge ${s.selection_status === 'Selected' ? 'badge-success' : s.selection_status === 'Rejected' ? 'badge-danger' : 'badge-info'}">${s.selection_status}</span></td>
                  <td>
                    <select class="form-control" style="padding:0.25rem 0.5rem;font-size:0.8rem;width:auto" onchange="Officer.handleUpdateShortlistStatus(${s.id}, this.value, ${driveId})">
                      <option value="Shortlisted" ${s.selection_status === 'Shortlisted' ? 'selected' : ''}>Shortlisted</option>
                      <option value="Waitlisted" ${s.selection_status === 'Waitlisted' ? 'selected' : ''}>Waitlisted</option>
                      <option value="Rejected" ${s.selection_status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      API.showToast(err.message || 'Failed to load shortlist.', 'danger');
    }
  },

  async handleApproveShortlist(driveId) {
    try {
      const res = await API.api(`/shortlists/drive/${driveId}/approve`, { method: 'PATCH' });
      API.showToast(res.message, 'success');
      this.loadShortlistForDrive(driveId);
    } catch (err) {
      API.showToast(err.message || 'Failed to approve shortlist.', 'danger');
    }
  },

  async handleToggleShortlistPublish(driveId, isPub) {
    try {
      const res = await API.api(`/shortlists/drive/${driveId}/publish`, {
        method: 'PATCH',
        body: { is_published: isPub }
      });
      API.showToast(res.message || 'Shortlist publication status changed.', 'success');
      this.loadShortlistForDrive(driveId);
      this.loadDrives();
    } catch (err) {
      API.showToast(err.message || 'Failed to publish shortlist.', 'danger');
    }
  },

  async handleUpdateShortlistStatus(shortlistId, newStatus, driveId) {
    try {
      const res = await API.api(`/shortlists/${shortlistId}/status`, {
        method: 'PATCH',
        body: { selection_status: newStatus }
      });
      API.showToast(res.message || 'Candidate status updated.', 'success');
      this.loadShortlistForDrive(driveId);
    } catch (err) {
      this.loadShortlistForDrive(driveId);
      API.showToast(err.message || 'Failed to update candidate status.', 'danger');
    }
  },

  /* -------------------- 6. ROUNDS & SCORING -------------------- */
  async loadRoundsForDrive() {
    const driveId = document.getElementById('officer-rounds-drive-select')?.value;
    const container = document.getElementById('officer-rounds-content');
    if (!container) return;

    if (!driveId) {
      container.innerHTML = '<div class="alert alert-info">Select a placement drive to manage rounds and enter results.</div>';
      return;
    }

    try {
      // rounds + saved results + the shortlisted students of this drive
      const [roundsRes, shortlistRes] = await Promise.all([
        API.api(`/rounds/drive/${driveId}`),
        API.api(`/shortlists/drive/${driveId}`)
      ]);
      this.currentRounds = roundsRes.rounds || [];
      this.roundResults = roundsRes.results || [];
      const students = (shortlistRes.shortlist || []).filter(s => s.selection_status !== 'Rejected');
      const activeRounds = this.currentRounds.filter(r => r.is_active);

      container.innerHTML = `
        <div class="card-header"><div class="card-title">Rounds of this drive (${this.currentRounds.length})</div></div>
        <div class="table-responsive" style="margin-bottom:1rem">
          <table class="table">
            <thead><tr><th>Order</th><th>Round Name</th><th>Description</th><th>Status</th><th>Results</th><th>Actions</th></tr></thead>
            <tbody>
              ${this.currentRounds.map(r => `
                <tr>
                  <td><strong>Round ${r.round_order}</strong></td>
                  <td><strong>${API.escapeHtml(r.round_name)}</strong></td>
                  <td style="font-size:0.85rem">${API.escapeHtml(r.description || '—')}</td>
                  <td><span class="badge ${r.is_active ? 'badge-success' : 'badge-danger'}">${r.is_active ? 'Active' : 'Deactivated'}</span></td>
                  <td><span class="badge ${r.results_published ? 'badge-success' : 'badge-neutral'}">${r.results_published ? 'Published' : 'Hidden'}</span></td>
                  <td style="white-space:nowrap">
                    <button class="btn btn-secondary btn-sm" onclick="Officer.openEditRound(${r.id})">Edit</button>
                    <button class="btn ${r.results_published ? 'btn-danger' : 'btn-success'} btn-sm"
                      onclick="Officer.handlePublishRoundResults(${r.id}, ${r.results_published ? 0 : 1})">
                      ${r.results_published ? 'Hide Results' : 'Publish Results'}
                    </button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="form-row" style="margin-bottom:1.5rem;align-items:flex-end">
          <div class="form-group"><label class="form-label">Add Custom Round</label>
            <input type="text" id="new-round-name" class="form-control" placeholder="e.g. Group Discussion"></div>
          <div class="form-group"><label class="form-label">Description (optional)</label>
            <input type="text" id="new-round-desc" class="form-control" placeholder="What happens in this round"></div>
          <div class="form-group" style="flex:0 0 auto;min-width:0">
            <button class="btn btn-primary" onclick="Officer.handleAddRound(${driveId})">Add Round</button></div>
        </div>

        <div class="card-header"><div class="card-title">Enter Round Results (shortlisted students)</div></div>
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>Student</th><th>Round</th><th>Result</th><th>Score</th><th>Feedback</th><th>Action</th></tr></thead>
            <tbody>
              ${students.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No shortlisted students yet. Generate a shortlist first (Shortlists tab).</td></tr>' : students.map(s => `
                <tr>
                  <td><strong>${API.escapeHtml(s.student_name)}</strong>
                    <div style="font-size:0.75rem;color:var(--text-muted)">${API.escapeHtml(s.roll_number)}</div></td>
                  <td>
                    <select id="score-round-${s.application_id}" class="form-control" style="font-size:0.8rem"
                      onchange="Officer.fillRoundScoreFields(${s.application_id})">
                      ${activeRounds.map(r => `<option value="${r.id}">R${r.round_order}: ${API.escapeHtml(r.round_name)}</option>`).join('')}
                    </select>
                  </td>
                  <td>
                    <select id="score-status-${s.application_id}" class="form-control" style="font-size:0.8rem">
                      <option value="Pending">Pending</option>
                      <option value="Qualified">Qualified</option>
                      <option value="Not Qualified">Not Qualified</option>
                      <option value="Absent">Absent</option>
                    </select>
                  </td>
                  <td><input type="number" step="0.01" min="0" id="score-val-${s.application_id}" class="form-control" style="width:90px;font-size:0.8rem" placeholder="Score"></td>
                  <td><input type="text" id="score-fb-${s.application_id}" class="form-control" style="font-size:0.8rem" placeholder="Feedback..."></td>
                  <td><button class="btn btn-primary btn-sm" onclick="Officer.handleSaveRoundScore(${s.application_id}, ${driveId})">Save</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;

      // show the already-saved values
      students.forEach(s => this.fillRoundScoreFields(s.application_id));
    } catch (err) {
      API.showToast(err.message || 'Failed to load rounds details.', 'danger');
    }
  },

  // When the round dropdown changes, show the saved result of that round
  fillRoundScoreFields(appId) {
    const roundSelect = document.getElementById(`score-round-${appId}`);
    if (!roundSelect) return;
    const saved = (this.roundResults || []).find(r => r.application_id === appId && String(r.round_id) === roundSelect.value);
    document.getElementById(`score-status-${appId}`).value = saved ? saved.status : 'Pending';
    document.getElementById(`score-val-${appId}`).value = saved && saved.score !== null ? saved.score : '';
    document.getElementById(`score-fb-${appId}`).value = saved && saved.feedback ? saved.feedback : '';
  },

  async handleAddRound(driveId) {
    const nameEl = document.getElementById('new-round-name');
    const descEl = document.getElementById('new-round-desc');
    const nameOk = Validator.validateText(nameEl, { min: 1, max: 120, required: true, fieldName: 'Round name' });
    const descOk = Validator.validateText(descEl, { min: 1, max: 255, required: false, fieldName: 'Description' });
    if (!nameOk || !descOk) {
      API.showToast('Please enter a valid round name (max 120 characters).', 'warning');
      const firstErr = (!nameOk ? nameEl : descEl);
      if (firstErr) firstErr.focus();
      return;
    }
    const round_name = nameEl.value.trim();
    const description = descEl.value.trim();
    try {
      const res = await API.api('/rounds', { method: 'POST', body: { drive_id: Number(driveId), round_name, description } });
      API.showToast(res.message, 'success');
      nameEl.value = '';
      descEl.value = '';
      Validator.clearErrors(nameEl.closest('.form-row'));
      this.loadRoundsForDrive();
    } catch (err) {
      API.showToast(err.message || 'Failed to add round.', 'danger');
    }
  },

  openEditRound(roundId) {
    const r = this.currentRounds.find(item => item.id === roundId);
    let modal = document.getElementById('round-edit-modal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'round-edit-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header"><div class="modal-title">Edit Round</div>
          <button class="modal-close" onclick="document.getElementById('round-edit-modal').remove()">&times;</button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Round Name <span class="required">*</span></label>
            <input type="text" id="edit-round-name" class="form-control" value="${API.escapeHtml(r.round_name)}" maxlength="120">
            <span class="field-error" id="err-edit-round-name"></span>
          </div>
          <div class="form-group"><label class="form-label">Description (optional)</label>
            <input type="text" id="edit-round-desc" class="form-control" value="${API.escapeHtml(r.description || '')}" maxlength="255">
            <span class="field-error" id="err-edit-round-desc"></span>
          </div>
          <label style="font-size:0.85rem"><input type="checkbox" id="edit-round-active" ${r.is_active ? 'checked' : ''}> Round is active</label>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('round-edit-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="Officer.handleSaveRoundEdit(${roundId})">Save</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const editName = document.getElementById('edit-round-name');
    const editDesc = document.getElementById('edit-round-desc');
    if (editName) Validator.bind(editName, () => Validator.validateText(editName, { min: 1, max: 120, required: true, fieldName: 'Round name' }, 'err-edit-round-name'));
    if (editDesc) Validator.bind(editDesc, () => Validator.validateText(editDesc, { min: 1, max: 255, required: false, fieldName: 'Description' }, 'err-edit-round-desc'));
  },

  async handleSaveRoundEdit(roundId) {
    const editName = document.getElementById('edit-round-name');
    const editDesc = document.getElementById('edit-round-desc');
    const nameOk = Validator.validateText(editName, { min: 1, max: 120, required: true, fieldName: 'Round name' }, 'err-edit-round-name');
    const descOk = Validator.validateText(editDesc, { min: 1, max: 255, required: false, fieldName: 'Description' }, 'err-edit-round-desc');
    if (!nameOk || !descOk) {
      API.showToast('Please enter a valid round name (max 120 characters).', 'warning');
      if (!nameOk) editName?.focus(); else editDesc?.focus();
      return;
    }
    try {
      const res = await API.api(`/rounds/${roundId}`, {
        method: 'PUT',
        body: {
          round_name: editName.value.trim(),
          description: editDesc.value.trim(),
          is_active: document.getElementById('edit-round-active').checked ? 1 : 0
        }
      });
      API.showToast(res.message, 'success');
      document.getElementById('round-edit-modal')?.remove();
      this.loadRoundsForDrive();
    } catch (err) {
      API.showToast(err.message || 'Failed to update round.', 'danger');
    }
  },

  async handleSaveRoundScore(appId, driveId) {
    const roundId = document.getElementById(`score-round-${appId}`).value;
    const status = document.getElementById(`score-status-${appId}`).value;
    const scoreEl = document.getElementById(`score-val-${appId}`);
    const fbEl = document.getElementById(`score-fb-${appId}`);

    const scoreOk = Validator.validateNumber(scoreEl, { min: 0, max: 1000, integer: false, required: false, fieldName: 'Round score' });
    const fbOk = Validator.validateText(fbEl, { min: 1, max: 255, required: false, fieldName: 'Feedback' });

    if (!scoreOk || !fbOk) {
      API.showToast('Score must be a number between 0 and 1000, and feedback max 255 chars.', 'warning');
      if (!scoreOk) scoreEl?.focus(); else fbEl?.focus();
      return;
    }

    const scoreVal = scoreEl.value;
    const feedback = fbEl.value.trim();

    try {
      const res = await API.api(`/rounds/${roundId}/results`, {
        method: 'POST',
        body: { application_id: appId, status, score: scoreVal ? Number(scoreVal) : null, feedback: feedback || undefined }
      });
      API.showToast(res.message || 'Round result saved.', 'success');
      // remember the saved value so the dropdown shows it again
      this.roundResults = this.roundResults.filter(r => !(r.application_id === appId && String(r.round_id) === roundId));
      this.roundResults.push({ round_id: Number(roundId), application_id: appId, status, score: scoreVal ? Number(scoreVal) : null, feedback: feedback || null });
    } catch (err) {
      API.showToast(err.message || 'Failed to save round result.', 'danger');
    }
  },

  async handlePublishRoundResults(roundId, isPub) {
    try {
      const res = await API.api(`/rounds/${roundId}/publish-results`, { method: 'PATCH', body: { is_published: isPub } });
      API.showToast(res.message, 'success');
      this.loadRoundsForDrive();
    } catch (err) {
      API.showToast(err.message || 'Failed to publish round results.', 'danger');
    }
  },

  /* -------------------- 7. FINAL RESULTS & OFFERS -------------------- */
  async loadResultsForDrive() {
    const driveId = document.getElementById('officer-results-drive-select')?.value;
    const container = document.getElementById('officer-results-content');
    if (!container) return;

    if (!driveId) {
      container.innerHTML = '<div class="alert alert-info">Select a placement drive to manage final results and job offers.</div>';
      return;
    }

    try {
      const res = await API.api(`/results/drive/${driveId}`);
      const drive = res.drive || {};
      const results = res.results || [];

      container.innerHTML = `
        <div class="card-header" style="margin-bottom:1rem">
          <div>
            <div class="card-title">${API.escapeHtml(drive.job_title)} (${API.escapeHtml(drive.company_name)})</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">Base Package: ${drive.package_lpa} LPA</div>
          </div>
          <div>
            <button class="btn ${drive.results_published ? 'btn-danger' : 'btn-success'} btn-sm" onclick="Officer.handleToggleFinalResultsPublish(${drive.id}, ${drive.results_published ? 0 : 1})">
              ${drive.results_published ? 'Unpublish Final Results' : 'Publish Final Results to Students'}
            </button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll No</th>
                <th>Branch & CGPA</th>
                <th>Final Decision</th>
                <th>Offered LPA</th>
                <th>Offer Details / Notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${results.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No shortlisted students yet. Generate a shortlist first (Shortlists tab).</td></tr>' : results.map(r => `
                <tr>
                  <td><strong>${API.escapeHtml(r.student_name)}</strong></td>
                  <td>${API.escapeHtml(r.roll_number || 'N/A')}</td>
                  <td>${API.escapeHtml(r.department || '')} (${r.cgpa || 'N/A'})</td>
                  <td>
                    <select id="final-decision-${r.application_id}" class="form-control" style="font-size:0.8rem">
                      <option value="Pending" ${r.final_result === 'Pending' ? 'selected' : ''}>Pending</option>
                      <option value="Selected" ${r.final_result === 'Selected' ? 'selected' : ''}>Selected</option>
                      <option value="Rejected" ${r.final_result === 'Rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                  </td>
                  <td>
                    <input type="number" step="0.1" id="final-pkg-${r.application_id}" class="form-control" style="width:90px;font-size:0.8rem" value="${r.offered_package_lpa !== null ? r.offered_package_lpa : drive.package_lpa}">
                  </td>
                  <td>
                    <input type="text" id="final-details-${r.application_id}" class="form-control" style="font-size:0.8rem" placeholder="e.g. Software Engineer offer" value="${API.escapeHtml(r.offer_details || '')}">
                  </td>
                  <td>
                    <button class="btn btn-primary btn-sm" onclick="Officer.handleSaveFinalResult(${r.application_id}, ${driveId})">Save</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      API.showToast(err.message || 'Failed to load results.', 'danger');
    }
  },

  async handleSaveFinalResult(appId, driveId) {
    const finalResult = document.getElementById(`final-decision-${appId}`).value;
    const pkgEl = document.getElementById(`final-pkg-${appId}`);
    const detailsEl = document.getElementById(`final-details-${appId}`);

    const pkgOk = Validator.validateNumber(pkgEl, { min: 0.01, max: 9999, integer: false, required: (finalResult === 'Selected'), fieldName: 'Offered package (LPA)' });
    const detailsOk = Validator.validateText(detailsEl, { min: 1, max: 255, required: false, fieldName: 'Offer details' });

    if (!pkgOk || !detailsOk) {
      API.showToast('Please check the offered package and details format.', 'warning');
      if (!pkgOk) pkgEl?.focus(); else detailsEl?.focus();
      return;
    }

    const pkgVal = pkgEl.value;
    const details = detailsEl.value.trim();

    try {
      const res = await API.api('/results', {
        method: 'POST',
        body: {
          application_id: appId,
          final_result: finalResult,
          offered_package_lpa: finalResult === 'Selected' && pkgVal ? Number(pkgVal) : null,
          offer_details: details || undefined,
          result_published: 0
        }
      });
      API.showToast(res.message || 'Final result saved.', 'success');
      this.loadResultsForDrive();
    } catch (err) {
      API.showToast(err.message || 'Failed to save final result.', 'danger');
    }
  },

  async handleToggleFinalResultsPublish(driveId, isPub) {
    try {
      const res = await API.api(`/results/drive/${driveId}/publish`, {
        method: 'PATCH',
        body: { results_published: isPub }
      });
      API.showToast(res.message || 'Final results publish state updated.', 'success');
      this.loadResultsForDrive();
      this.loadDrives();
    } catch (err) {
      API.showToast(err.message || 'Failed to publish results.', 'danger');
    }
  },

  /* -------------------- 8. STUDENT DIRECTORY -------------------- */
  async loadDirectory() {
    const tbody = document.getElementById('officer-directory-tbody');
    if (!tbody) return;

    const q = document.getElementById('dir-search')?.value.trim() || '';
    const dept = document.getElementById('dir-dept')?.value || '';
    const minCgpa = document.getElementById('dir-cgpa')?.value || '';
    const batch = document.getElementById('dir-batch')?.value || '';

    let url = '/students/directory?';
    if (q) url += `q=${encodeURIComponent(q)}&`;
    if (dept) url += `department=${encodeURIComponent(dept)}&`;
    if (minCgpa) url += `min_cgpa=${encodeURIComponent(minCgpa)}&`;
    if (batch) url += `graduation_year=${encodeURIComponent(batch)}&`;

    try {
      const res = await API.api(url);
      const students = res.students || [];
      this.students = students;
      const countEl = document.getElementById('dir-count');
      if (countEl) countEl.textContent = `(${students.length} students, highest CGPA first)`;

      if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">No students match the criteria.</td></tr>';
        return;
      }

      tbody.innerHTML = students.map(s => `
        <tr>
          <td><strong>${API.escapeHtml(s.roll_number || 'N/A')}</strong></td>
          <td>${API.escapeHtml(s.full_name)}</td>
          <td style="font-size:0.8rem">${API.escapeHtml(s.email)}</td>
          <td>${API.escapeHtml(s.department || '—')}</td>
          <td>${s.graduation_year || '—'}</td>
          <td><strong>${s.cgpa !== null && s.cgpa !== undefined ? s.cgpa : '—'}</strong></td>
          <td style="font-size:0.75rem;max-width:220px">${API.escapeHtml(s.skills || '—')}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-secondary btn-sm" onclick="Officer.viewStudent(${s.user_id})">View</button>
            <button class="btn btn-primary btn-sm" onclick="Officer.openUpdateCgpaModal(${s.user_id})">Edit CGPA</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      API.showToast(err.message || 'Failed to load student directory.', 'danger');
    }
  },

  // Show the full profile of one student in a popup
  viewStudent(userId) {
    const s = this.students.find(item => item.user_id === userId);
    const link = (label, url) => url ? `<div><strong>${label}:</strong> <a href="${API.escapeHtml(url)}" target="_blank" rel="noopener">${API.escapeHtml(url)}</a></div>` : '';
    let modal = document.getElementById('student-view-modal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'student-view-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header"><div class="modal-title">${API.escapeHtml(s.full_name)}</div>
          <button class="modal-close" onclick="document.getElementById('student-view-modal').remove()">&times;</button></div>
        <div class="modal-body" style="font-size:0.9rem;line-height:1.8">
          <div><strong>Roll Number:</strong> ${API.escapeHtml(s.roll_number)}</div>
          <div><strong>Email:</strong> ${API.escapeHtml(s.email)}</div>
          <div><strong>Branch:</strong> ${API.escapeHtml(s.department)} &bull; <strong>Batch:</strong> ${s.graduation_year}</div>
          <div><strong>CGPA:</strong> ${s.cgpa}</div>
          <div><strong>Skills:</strong> ${API.escapeHtml(s.skills)}</div>
          ${link('GitHub', s.github_url)}${link('LinkedIn', s.linkedin_url)}${link('LeetCode', s.leetcode_url)}
          ${link('HackerRank', s.hackerrank_url)}${link('CodeChef', s.codechef_url)}
        </div>
        <div class="modal-footer"><button class="btn btn-primary" onclick="document.getElementById('student-view-modal').remove()">Close</button></div>
      </div>`;
    document.body.appendChild(modal);
  },

  // Officer is the only person who can change an official CGPA
  openUpdateCgpaModal(userId) {
    const s = this.students.find(item => item.user_id === userId);
    if (!s) return;
    let modal = document.getElementById('edit-cgpa-modal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'edit-cgpa-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">Update Official CGPA</div>
          <button class="modal-close" onclick="document.getElementById('edit-cgpa-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size:0.9rem;margin-bottom:1rem">
            Updating official academic record for <strong>${API.escapeHtml(s.full_name)}</strong> (${API.escapeHtml(s.roll_number)}).
          </p>
          <div class="form-group">
            <label class="form-label" for="new-student-cgpa">Official CGPA (0.00 - 10.00) <span class="required">*</span></label>
            <input type="number" step="0.01" min="0" max="10" id="new-student-cgpa" class="form-control" value="${s.cgpa || ''}" placeholder="e.g. 8.75">
            <span class="field-error" id="err-new-student-cgpa"></span>
            <span class="form-hint">This authoritative grade affects eligibility and shortlist ranking across all drives.</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('edit-cgpa-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="Officer.handleSaveCgpa(${userId})">Save CGPA</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const cgpaInput = document.getElementById('new-student-cgpa');
    if (cgpaInput) {
      Validator.bind(cgpaInput, () => Validator.validateNumber(cgpaInput, { min: 0, max: 10, integer: false, required: true, fieldName: 'Official CGPA' }, 'err-new-student-cgpa'));
    }
  },

  async handleSaveCgpa(userId) {
    const input = document.getElementById('new-student-cgpa');
    const valid = Validator.validateNumber(input, { min: 0, max: 10, integer: false, required: true, fieldName: 'Official CGPA' }, 'err-new-student-cgpa');
    if (!valid) {
      API.showToast('Please enter a valid CGPA between 0 and 10.', 'warning');
      input?.focus();
      return;
    }
    const value = input.value.trim();
    try {
      const res = await API.api(`/students/${userId}/cgpa`, { method: 'PATCH', body: { cgpa: Number(value) } });
      API.showToast(res.message || 'CGPA updated successfully.', 'success');
      document.getElementById('edit-cgpa-modal')?.remove();
      this.loadDirectory();
    } catch (err) {
      API.showToast(err.message || 'Failed to update CGPA.', 'danger');
    }
  },

  /* -------------------- 9. ANNOUNCEMENTS -------------------- */
  async handleSendAnnouncement(e) {
    e.preventDefault();
    const drive_id = document.getElementById('announce-drive-id').value;
    const titleEl = document.getElementById('announce-title');
    const msgEl = document.getElementById('announce-msg');
    const btn = document.getElementById('announce-send-btn');

    const titleOk = Validator.validateText(titleEl, { min: 1, max: 150, required: true, fieldName: 'Subject line' }, 'err-announce-title');
    const msgOk = Validator.validateText(msgEl, { min: 1, max: 2000, required: true, fieldName: 'Notice body' }, 'err-announce-msg');

    if (!titleOk || !msgOk) {
      API.showToast('Please fix the errors before broadcasting notice.', 'warning');
      const firstErr = document.getElementById('officer-announce-form').querySelector('.input-error');
      if (firstErr) firstErr.focus();
      return;
    }

    const title = titleEl.value.trim();
    const message = msgEl.value.trim();

    try {
      btn.disabled = true;
      btn.textContent = 'Broadcasting...';

      const res = await API.api('/notifications/send', {
        method: 'POST',
        body: {
          title,
          message,
          drive_id: drive_id ? Number(drive_id) : undefined
        }
      });

      API.showToast(res.message || 'Announcement broadcast successfully!', 'success');
      document.getElementById('officer-announce-form').reset();
      Validator.clearErrors(document.getElementById('officer-announce-form'));
    } catch (err) {
      API.showToast(err.message || 'Failed to send announcement.', 'danger');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Broadcast Notice';
    }
  },

  /* -------------------- 10. CREATE OFFICER -------------------- */
  async handleCreateOfficer(e) {
    e.preventDefault();
    const nameEl = document.getElementById('officer-new-name');
    const emailEl = document.getElementById('officer-new-email');
    const passEl = document.getElementById('officer-new-password');
    const btn = document.getElementById('officer-new-btn');

    const nameOk = Validator.validateText(nameEl, { min: 1, max: 120, required: true, fieldName: 'Officer full name' }, 'err-officer-new-name');
    const emailOk = Validator.validateEmail(emailEl, { required: true, max: 150, fieldName: 'Officer email' }, 'err-officer-new-email');
    const passOk = Validator.validatePassword(passEl, { min: 8, max: 72, requireLetterNumber: true, fieldName: 'Password' }, 'err-officer-new-password');

    if (!nameOk || !emailOk || !passOk) {
      API.showToast('Please fix the errors before creating the officer account.', 'warning');
      const firstErr = document.getElementById('officer-create-account-form').querySelector('.input-error');
      if (firstErr) firstErr.focus();
      return;
    }

    const full_name = nameEl.value.trim();
    const email = emailEl.value.trim();
    const password = passEl.value;

    try {
      btn.disabled = true;
      btn.textContent = 'Creating Officer Account...';

      const res = await API.api('/auth/create-officer', {
        method: 'POST',
        body: { full_name, email, password }
      });

      API.showToast(res.message || 'Officer account created successfully!', 'success');
      document.getElementById('officer-create-account-form').reset();
      Validator.clearErrors(document.getElementById('officer-create-account-form'));
    } catch (err) {
      API.showToast(err.message || 'Failed to create officer account.', 'danger');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Officer Account';
    }
  }
};

window.Officer = Officer;

