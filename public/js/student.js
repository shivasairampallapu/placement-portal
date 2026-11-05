/**
 * student.js - Student Portal Logic
 * Handles dashboard statistics, profile management, eligible drive browsing & applying,
 * application status tracking with published shortlist/round/final results, and notifications.
 */

const Student = {
  currentDashboardData: null,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Academic Profile Form Submit & Real-Time Validation
    const profileForm = document.getElementById('student-profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => this.handleSaveProfile(e));

      const fn = document.getElementById('profile-fullname');
      const sk = document.getElementById('profile-skills');
      const gh = document.getElementById('profile-github');
      const li = document.getElementById('profile-linkedin');
      const lc = document.getElementById('profile-leetcode');
      const hr = document.getElementById('profile-hackerrank');
      const cc = document.getElementById('profile-codechef');

      if (fn) Validator.bind(fn, () => Validator.validateText(fn, { min: 1, max: 120, required: true, fieldName: 'Student full name' }, 'err-profile-fullname'));
      if (sk) Validator.bind(sk, () => Validator.validateText(sk, { min: 1, max: 2000, required: true, fieldName: 'Technical skills' }, 'err-profile-skills'));
      if (gh) Validator.bind(gh, () => Validator.validateUrl(gh, { required: false, max: 255, fieldName: 'GitHub URL' }, 'err-profile-github'));
      if (li) Validator.bind(li, () => Validator.validateUrl(li, { required: false, max: 255, fieldName: 'LinkedIn URL' }, 'err-profile-linkedin'));
      if (lc) Validator.bind(lc, () => Validator.validateUrl(lc, { required: false, max: 255, fieldName: 'LeetCode URL' }, 'err-profile-leetcode'));
      if (hr) Validator.bind(hr, () => Validator.validateUrl(hr, { required: false, max: 255, fieldName: 'HackerRank URL' }, 'err-profile-hackerrank'));
      if (cc) Validator.bind(cc, () => Validator.validateUrl(cc, { required: false, max: 255, fieldName: 'CodeChef URL' }, 'err-profile-codechef'));
    }

    // Drives search filter
    const driveSearchInput = document.getElementById('student-drives-search');
    if (driveSearchInput) {
      driveSearchInput.addEventListener('input', () => this.filterDrives());
    }

    // Notifications mark all read button
    const markAllReadBtn = document.getElementById('student-mark-all-read');
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', () => this.handleMarkAllRead());
    }
  },

  async loadDashboard() {
    try {
      const res = await API.api('/students/dashboard');
      this.currentDashboardData = res;

      // Update Header & Welcome Banner
      const nameEl = document.getElementById('student-welcome-name');
      if (nameEl) nameEl.textContent = res.student.full_name;

      // Profile completeness banner
      const banner = document.getElementById('student-profile-alert');
      if (banner) {
        if (!res.student.is_profile_complete) {
          banner.classList.remove('hidden');
        } else {
          banner.classList.add('hidden');
        }
      }

      // Unread notification badge
      const badge = document.getElementById('notif-count-badge');
      if (badge) {
        badge.textContent = res.unread_notifications || 0;
        badge.classList.toggle('hidden', !res.unread_notifications);
      }

      // Populate Stats
      document.getElementById('stat-eligible-drives').textContent = res.stats.eligible_drives_count;
      document.getElementById('stat-applied-drives').textContent = res.stats.applications_submitted;
      document.getElementById('stat-shortlisted-drives').textContent = res.stats.shortlisted_applications;
      document.getElementById('stat-selected-drives').textContent = res.stats.selected_applications;

      // Populate Upcoming Deadlines
      const deadlinesContainer = document.getElementById('student-upcoming-deadlines');
      if (deadlinesContainer) {
        if (!res.upcoming_deadlines || res.upcoming_deadlines.length === 0) {
          deadlinesContainer.innerHTML = `
            <div class="empty-state-box">
              <svg class="empty-state-svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <div class="empty-state-heading">No Pending Deadlines</div>
              <p class="empty-state-text">You are all caught up! Visit the Companies tab to browse active campus recruitment drives.</p>
            </div>
          `;
        } else {
          deadlinesContainer.innerHTML = `
            <div class="dashboard-list">
              ${res.upcoming_deadlines.map(d => `
                <div class="dashboard-list-item">
                  <div class="dashboard-item-info">
                    <strong class="dashboard-item-title">${API.escapeHtml(d.job_title)}</strong>
                    <div class="dashboard-item-meta">${API.escapeHtml(d.company_name)} &bull; ${d.package_lpa} LPA</div>
                  </div>
                  <div class="dashboard-item-action">
                    <span class="badge ${d.already_applied ? 'badge-success' : 'badge-warning'}">
                      ${d.already_applied ? 'Applied' : 'Due: ' + API.formatDateTime(d.application_deadline)}
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }
      }

      // Populate Recent Notifications
      const notifsContainer = document.getElementById('student-dashboard-notifications');
      if (notifsContainer) {
        if (!res.recent_notifications || res.recent_notifications.length === 0) {
          notifsContainer.innerHTML = `
            <div class="empty-state-box">
              <svg class="empty-state-svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <div class="empty-state-heading">No Recent Announcements</div>
              <p class="empty-state-text">Official placement updates, drives schedules and results will appear here as they are published.</p>
            </div>
          `;
        } else {
          notifsContainer.innerHTML = `
            <div class="dashboard-list">
              ${res.recent_notifications.map(n => `
                <div class="dashboard-list-item">
                  <div class="dashboard-item-info">
                    <div class="dashboard-notice-header">
                      <strong class="dashboard-item-title">${API.escapeHtml(n.title)}</strong>
                      <span class="dashboard-item-time">${API.formatDate(n.created_at)}</span>
                    </div>
                    <p class="dashboard-notice-body">${API.escapeHtml(n.message)}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }
      }
    } catch (err) {
      API.showToast(err.message || 'Failed to load dashboard data.', 'danger');
    }
  },

  async loadProfile() {
    try {
      const res = await API.api('/students/profile');
      const p = res.profile || {};

      document.getElementById('profile-fullname').value = p.full_name || '';
      document.getElementById('profile-email').value = p.email || '';
      document.getElementById('profile-roll').value = p.roll_number || '';
      document.getElementById('profile-dept').value = p.department || '';
      document.getElementById('profile-batch').value = p.graduation_year || '';
      document.getElementById('profile-cgpa').value = p.cgpa !== null && p.cgpa !== undefined ? p.cgpa : '';
      document.getElementById('profile-skills').value = p.skills || '';
      document.getElementById('profile-github').value = p.github_url || '';
      document.getElementById('profile-linkedin').value = p.linkedin_url || '';
      document.getElementById('profile-leetcode').value = p.leetcode_url || '';
      document.getElementById('profile-hackerrank').value = p.hackerrank_url || '';
      document.getElementById('profile-codechef').value = p.codechef_url || '';
    } catch (err) {
      API.showToast(err.message || 'Failed to load profile details.', 'danger');
    }
  },

  async handleSaveProfile(e) {
    e.preventDefault();
    const btn = document.getElementById('save-profile-btn');
    const fn = document.getElementById('profile-fullname');
    const sk = document.getElementById('profile-skills');
    const gh = document.getElementById('profile-github');
    const li = document.getElementById('profile-linkedin');
    const lc = document.getElementById('profile-leetcode');
    const hr = document.getElementById('profile-hackerrank');
    const cc = document.getElementById('profile-codechef');

    const fnOk = Validator.validateText(fn, { min: 1, max: 120, required: true, fieldName: 'Student full name' }, 'err-profile-fullname');
    const skOk = Validator.validateText(sk, { min: 1, max: 2000, required: true, fieldName: 'Technical skills' }, 'err-profile-skills');
    const ghOk = Validator.validateUrl(gh, { required: false, max: 255, fieldName: 'GitHub URL' }, 'err-profile-github');
    const liOk = Validator.validateUrl(li, { required: false, max: 255, fieldName: 'LinkedIn URL' }, 'err-profile-linkedin');
    const lcOk = Validator.validateUrl(lc, { required: false, max: 255, fieldName: 'LeetCode URL' }, 'err-profile-leetcode');
    const hrOk = Validator.validateUrl(hr, { required: false, max: 255, fieldName: 'HackerRank URL' }, 'err-profile-hackerrank');
    const ccOk = Validator.validateUrl(cc, { required: false, max: 255, fieldName: 'CodeChef URL' }, 'err-profile-codechef');

    if (!fnOk || !skOk || !ghOk || !liOk || !lcOk || !hrOk || !ccOk) {
      API.showToast('Please fix the highlighted errors before saving your profile.', 'warning');
      const firstErr = document.getElementById('student-profile-form').querySelector('.input-error');
      if (firstErr) firstErr.focus();
      return;
    }

    const full_name = fn.value.trim();
    const roll_number = document.getElementById('profile-roll').value.trim();
    const department = document.getElementById('profile-dept').value.trim();
    const graduation_year = document.getElementById('profile-batch').value;
    const cgpa = document.getElementById('profile-cgpa').value;
    const skills = sk.value.trim();
    const github_url = gh.value.trim();
    const linkedin_url = li.value.trim();
    const leetcode_url = lc.value.trim();
    const hackerrank_url = hr.value.trim();
    const codechef_url = cc.value.trim();

    try {
      btn.disabled = true;
      btn.textContent = 'Saving Profile...';

      const res = await API.api('/students/profile', {
        method: 'PUT',
        body: {
          full_name,
          roll_number,
          department,
          graduation_year: Number(graduation_year),
          cgpa: Number(cgpa),
          skills,
          github_url: github_url || null,
          linkedin_url: linkedin_url || null,
          leetcode_url: leetcode_url || null,
          hackerrank_url: hackerrank_url || null,
          codechef_url: codechef_url || null
        }
      });

      API.showToast(res.message || 'Academic profile updated successfully!', 'success');
      this.loadDashboard();
    } catch (err) {
      API.showToast(err.message || 'Failed to save profile.', 'danger');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Profile Changes';
    }
  },

  async loadDrives() {
    try {
      const res = await API.api('/drives');
      this.allDrives = res.drives || [];
      this.renderDrives(this.allDrives);
    } catch (err) {
      API.showToast(err.message || 'Failed to load placement drives.', 'danger');
    }
  },

  filterDrives() {
    const q = (document.getElementById('student-drives-search')?.value || '').toLowerCase().trim();
    if (!this.allDrives) return;
    if (!q) {
      this.renderDrives(this.allDrives);
      return;
    }
    const filtered = this.allDrives.filter(d =>
      d.company_name.toLowerCase().includes(q) ||
      d.job_title.toLowerCase().includes(q) ||
      d.required_skills.toLowerCase().includes(q) ||
      d.location.toLowerCase().includes(q)
    );
    this.renderDrives(filtered);
  },

  renderDrives(drives) {
    const container = document.getElementById('student-drives-list');
    if (!container) return;

    if (!drives || drives.length === 0) {
      container.innerHTML = '<div class="alert alert-info">No placement drives found matching your criteria.</div>';
      return;
    }

    container.innerHTML = drives.map(d => {
      const elig = d.eligibility || {};
      const isEligible = elig.eligible;
      const alreadyApplied = d.already_applied;

      let badgeHtml = '';
      if (alreadyApplied) {
        badgeHtml = `<span class="badge badge-success">Applied (${d.application_status || 'Submitted'})</span>`;
      } else if (isEligible) {
        badgeHtml = `<span class="badge badge-success">Eligible to Apply</span>`;
      } else {
        badgeHtml = `<span class="badge badge-danger">Ineligible: ${API.escapeHtml(elig.reason || 'Criteria not met')}</span>`;
      }

      return `
        <div class="card" style="margin-bottom:1rem">
          <div class="card-header">
            <div>
              <div class="card-title">${API.escapeHtml(d.job_title)}</div>
              <div style="font-size:0.875rem;color:var(--text-muted);font-weight:500">
                ${API.escapeHtml(d.company_name)} &bull; ${API.escapeHtml(d.location)}
              </div>
            </div>
            <div>${badgeHtml}</div>
          </div>
          <div class="grid grid-cols-4" style="font-size:0.85rem;margin-bottom:1rem">
            <div><strong>Package:</strong> ${d.package_lpa} LPA</div>
            <div><strong>Min CGPA:</strong> ${d.min_cgpa}</div>
            <div><strong>Batch:</strong> ${d.graduation_year}</div>
            <div><strong>Branches:</strong> ${API.escapeHtml(d.eligible_branches)}</div>
          </div>
          <p style="font-size:0.875rem;margin-bottom:0.5rem">${API.escapeHtml(d.job_description)}</p>
          <p style="font-size:0.8rem;margin-bottom:0.75rem;color:var(--text-muted)">
            <strong>About ${API.escapeHtml(d.company_name)}:</strong> ${API.escapeHtml(d.company_description || '')}
            ${d.company_website ? ` <a href="${API.escapeHtml(d.company_website)}" target="_blank" rel="noopener">Visit company website</a>` : ''}
          </p>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem">
            <strong>Skills:</strong> ${API.escapeHtml(d.required_skills)}<br>
            <strong>Deadline:</strong> ${API.formatDateTime(d.application_deadline)} | <strong>Drive Date:</strong> ${API.formatDate(d.placement_date)}
          </div>
          <div style="display:flex;justify-content:flex-end;gap:0.75rem">
            ${
              alreadyApplied
                ? `<button class="btn btn-secondary btn-sm" disabled>Already Applied</button>`
                : isEligible
                  ? `<button class="btn btn-primary btn-sm" onclick="Student.handleApply(${d.id})">Apply Now</button>`
                  : `<button class="btn btn-secondary btn-sm" disabled title="${API.escapeHtml(elig.reason || '')}">Cannot Apply</button>`
            }
          </div>
        </div>
      `;
    }).join('');
  },

  async handleApply(driveId) {
    if (!confirm('Are you sure you want to apply for this placement drive?')) return;

    try {
      const res = await API.api('/applications', {
        method: 'POST',
        body: { drive_id: driveId }
      });
      API.showToast(res.message || 'Application submitted successfully!', 'success');
      this.loadDrives();
      this.loadDashboard();
      this.loadApplications();
    } catch (err) {
      API.showToast(err.message || 'Failed to submit application.', 'danger');
    }
  },

  async loadApplications() {
    const tableBody = document.getElementById('student-applications-tbody');
    const shortlistTable = document.getElementById('student-shortlist-tbody');
    const roundsTable = document.getElementById('student-rounds-tbody');
    const resultsTable = document.getElementById('student-results-tbody');

    try {
      const res = await API.api('/applications/my');
      const apps = res.applications || [];

      // 1. My Applications Overview Table
      if (tableBody) {
        if (apps.length === 0) {
          tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem">You have not applied for any placement drives yet.</td></tr>`;
        } else {
          tableBody.innerHTML = apps.map(a => {
            let statusBadge = 'badge-neutral';
            if (a.status === 'Shortlisted' || a.status === 'Selected') statusBadge = 'badge-success';
            if (a.status === 'Rejected' || a.status === 'Not Eligible') statusBadge = 'badge-danger';
            if (a.status === 'Under Review' || a.status === 'Approved') statusBadge = 'badge-info';

            let shortlistText = '<span style="color:var(--text-muted)">Pending / Unpublished</span>';
            if (a.shortlist_info) {
              shortlistText = `<span class="badge badge-info">Rank #${a.shortlist_info.rank_position} (${a.shortlist_info.selection_status})</span>`;
            }

            let roundsText = '<span style="color:var(--text-muted)">No results yet</span>';
            if (a.round_results && a.round_results.length > 0) {
              roundsText = a.round_results.map(r => `
                <div style="font-size:0.75rem">
                  <strong>${API.escapeHtml(r.round_name)}:</strong>
                  <span class="badge ${r.status === 'Qualified' ? 'badge-success' : r.status === 'Not Qualified' ? 'badge-danger' : 'badge-neutral'}">
                    ${r.status}
                  </span>
                  ${r.score !== null ? `(${r.score})` : ''}
                </div>
              `).join('');
            }

            let finalOfferText = '<span style="color:var(--text-muted)">In Progress</span>';
            if (a.result_published && a.final_result) {
              if (a.final_result === 'Selected') {
                finalOfferText = `
                  <span class="badge badge-success">Selected</span>
                  <div style="font-size:0.75rem;margin-top:0.2rem;color:var(--success)">
                    <strong>${a.offered_package_lpa || a.package_lpa} LPA</strong>
                    ${a.offer_details ? `<br>${API.escapeHtml(a.offer_details)}` : ''}
                  </div>
                `;
              } else if (a.final_result === 'Rejected') {
                finalOfferText = '<span class="badge badge-danger">Not Selected</span>';
              }
            }

            return `
              <tr>
                <td>
                  <strong>${API.escapeHtml(a.job_title)}</strong>
                  <div style="font-size:0.75rem;color:var(--text-muted)">${API.escapeHtml(a.company_name)}</div>
                </td>
                <td>${a.package_lpa} LPA</td>
                <td><span class="badge ${statusBadge}">${a.status}</span>
                  ${a.officer_remarks ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.2rem">"${API.escapeHtml(a.officer_remarks)}"</div>` : ''}</td>
                <td>${shortlistText}</td>
                <td>${roundsText}</td>
                <td>${finalOfferText}</td>
                <td style="font-size:0.8rem;color:var(--text-muted);white-space:nowrap">
                  <div>${API.formatDate(a.applied_at)}</div>
                  ${a.status === 'Applied' ? `<button class="btn btn-secondary btn-sm" style="font-size:0.7rem;padding:0.2rem 0.4rem;margin-top:0.25rem" onclick="Student.handleWithdrawApp(${a.id})">Withdraw</button>` : ''}
                </td>
              </tr>
            `;
          }).join('');
        }
      }

      // 2. Dedicated Shortlist View
      if (shortlistTable) {
        const shortlistedApps = apps.filter(a => a.shortlist_info);
        if (shortlistedApps.length === 0) {
          shortlistTable.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem">No published shortlist available yet. (Shortlists appear here once officially approved and published by the Placement Officer).</td></tr>`;
        } else {
          shortlistTable.innerHTML = shortlistedApps.map(a => `
            <tr>
              <td><strong>${API.escapeHtml(a.company_name)}</strong></td>
              <td>${API.escapeHtml(a.job_title)}</td>
              <td><span class="badge badge-info" style="font-size:0.85rem">Rank #${a.shortlist_info.rank_position}</span></td>
              <td>${a.package_lpa} LPA</td>
              <td><span class="badge badge-success">${API.escapeHtml(a.shortlist_info.selection_status)}</span></td>
            </tr>
          `).join('');
        }
      }

      // 3. Dedicated Placement Rounds View
      if (roundsTable) {
        const roundsList = [];
        apps.forEach(a => {
          if (a.round_results && a.round_results.length > 0) {
            a.round_results.forEach((r, idx) => {
              roundsList.push({ company_name: a.company_name, job_title: a.job_title, round: r, order: idx + 1 });
            });
          }
        });
        if (roundsList.length === 0) {
          roundsTable.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem">No round evaluations published yet. Results appear here once published by the Placement Officer.</td></tr>`;
        } else {
          roundsTable.innerHTML = roundsList.map(item => {
            let badge = 'badge-neutral';
            if (item.round.status === 'Qualified') badge = 'badge-success';
            else if (item.round.status === 'Not Qualified') badge = 'badge-danger';
            return `
              <tr>
                <td><strong>${API.escapeHtml(item.company_name)}</strong></td>
                <td>${API.escapeHtml(item.job_title)}</td>
                <td>Round ${item.order}: ${API.escapeHtml(item.round.round_name)}</td>
                <td><span class="badge ${badge}">${API.escapeHtml(item.round.status)}</span></td>
                <td>${item.round.score !== null ? item.round.score : '—'}</td>
                <td>${API.escapeHtml(item.round.feedback || '—')}</td>
              </tr>
            `;
          }).join('');
        }
      }

      // 4. Dedicated Final Results View
      if (resultsTable) {
        const resultsApps = apps.filter(a => a.result_published && a.final_result && a.final_result !== 'Pending');
        if (resultsApps.length === 0) {
          resultsTable.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem">No final selection results published yet. Check back after drive completion.</td></tr>`;
        } else {
          resultsTable.innerHTML = resultsApps.map(a => `
            <tr>
              <td><strong>${API.escapeHtml(a.company_name)}</strong></td>
              <td>${API.escapeHtml(a.job_title)}</td>
              <td>
                <span class="badge ${a.final_result === 'Selected' ? 'badge-success' : 'badge-danger'}">
                  ${API.escapeHtml(a.final_result)}
                </span>
              </td>
              <td><strong>${a.offered_package_lpa ? a.offered_package_lpa + ' LPA' : a.package_lpa + ' LPA'}</strong></td>
              <td>${API.escapeHtml(a.offer_details || 'Official Offer Letter')}</td>
            </tr>
          `).join('');
        }
      }

    } catch (err) {
      API.showToast(err.message || 'Failed to load applications.', 'danger');
    }
  },

  async loadNotifications() {
    const container = document.getElementById('student-notifications-list');
    if (!container) return;

    try {
      const res = await API.api('/notifications');
      const notifs = res.notifications || [];

      // Update unread count badge in navbar
      const badge = document.getElementById('notif-count-badge');
      if (badge) {
        if (res.unread_count > 0) {
          badge.textContent = res.unread_count;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }

      if (notifs.length === 0) {
        container.innerHTML = '<div class="alert alert-info">You have no notifications.</div>';
        return;
      }

      container.innerHTML = notifs.map(n => `
        <div class="card" style="margin-bottom:0.75rem;background:${n.is_read ? 'var(--surface)' : 'var(--primary-light)'}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <strong style="color:var(--text-main)">${API.escapeHtml(n.title)}</strong>
              <span class="badge badge-neutral" style="margin-left:0.5rem;font-size:0.7rem">${n.type}</span>
              <p style="font-size:0.85rem;color:var(--text-main);margin-top:0.35rem">${API.escapeHtml(n.message)}</p>
            </div>
            <div style="text-align:right">
              <span style="font-size:0.75rem;color:var(--text-muted)">${API.formatDateTime(n.created_at)}</span>
              ${!n.is_read ? `
                <div style="margin-top:0.3rem">
                  <button class="btn btn-secondary btn-sm" onclick="Student.handleMarkRead(${n.id})">Mark as read</button>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      API.showToast(err.message || 'Failed to load notifications.', 'danger');
    }
  },

  async handleMarkRead(id) {
    try {
      await API.api(`/notifications/${id}/read`, { method: 'PATCH' });
      this.loadNotifications();
    } catch (err) {
      API.showToast(err.message || 'Failed to mark notification as read.', 'danger');
    }
  },

  async handleMarkAllRead() {
    try {
      await API.api('/notifications/read-all', { method: 'PATCH' });
      API.showToast('All notifications marked as read.', 'success');
      this.loadNotifications();
    } catch (err) {
      API.showToast(err.message || 'Failed to mark all as read.', 'danger');
    }
  },

  async handleWithdrawApp(id) {
    if (!confirm('Are you sure you want to withdraw this application? You can re-apply before the deadline if eligible.')) return;
    try {
      const res = await API.api(`/applications/${id}`, { method: 'DELETE' });
      API.showToast(res.message || 'Application withdrawn.', 'info');
      this.loadApplications();
      this.loadDashboard();
      this.loadDrives();
    } catch (err) {
      API.showToast(err.message || 'Could not withdraw application.', 'danger');
    }
  }
};

window.Student = Student;

