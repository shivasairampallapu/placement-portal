/**
 * auth.js - Authentication & Session handling
 * Controls login, registration, and logout
 */

const Auth = {
  loginRole: 'student',   // which login button is selected

  init() {
    this.bindEvents();
    this.bindPasswordToggles();
    this.bindSilentValidation();
    this.checkSession();
  },

  /* ---- Eye-icon password show/hide ---- */
  bindPasswordToggles() {
    document.querySelectorAll('.toggle-pw.eye-btn').forEach(btn => {
      const initialInput = btn.closest('.password-wrap')?.querySelector('input');
      if (initialInput) this.syncPasswordToggle(btn, initialInput);

      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Resolve the input from its own password wrapper first. This keeps
        // student and officer forms isolated even though they reuse names
        // such as "current", "new", and "confirm".
        let input = btn.closest('.password-wrap')?.querySelector('input');
        if (!input && btn.dataset.target) {
          input = document.getElementById(btn.dataset.target);
        }
        if (!input && btn.dataset.targetName) {
          input = btn.closest('form')?.elements[btn.dataset.targetName];
        }
        if (!input) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';

        this.syncPasswordToggle(btn, input);

        // Keep cursor active in input
        input.focus();
      };
    });
  },

  syncPasswordToggle(btn, input) {
    const isVisible = input.type === 'text';

    // Normal eye = click to show; crossed eye = click to hide.
    const eyeShow = btn.querySelector('.eye-show');
    const eyeHide = btn.querySelector('.eye-hide');
    if (eyeShow) {
      eyeShow.hidden = isVisible;
      eyeShow.style.display = isVisible ? 'none' : 'block';
    }
    if (eyeHide) {
      eyeHide.hidden = !isVisible;
      eyeHide.style.display = isVisible ? 'block' : 'none';
    }

    const labelText = isVisible ? 'Hide password' : 'Show password';
    btn.setAttribute('aria-label', labelText);
    btn.setAttribute('title', labelText);
    btn.setAttribute('aria-pressed', String(isVisible));
  },

  /* ---- Silent / real-time validation ---- */
  bindSilentValidation() {
    // ---- Login form ----
    const loginEmail    = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');

    if (loginEmail) {
      Validator.bind(loginEmail, () => {
        Validator.validateEmail(loginEmail, { required: true, max: 150, fieldName: 'Email' }, 'err-login-email');
      });
    }
    if (loginPassword) {
      Validator.bind(loginPassword, () => {
        Validator.validateRequired(loginPassword, 'Password', 'err-login-password');
      });
    }

    // ---- Register form ----
    const regName     = document.getElementById('reg-fullname');
    const regEmail    = document.getElementById('reg-email');
    const regPassword = document.getElementById('reg-password');
    const regRoll     = document.getElementById('reg-roll');
    const regDept     = document.getElementById('reg-dept');
    const regBatch    = document.getElementById('reg-batch');
    const regCgpa     = document.getElementById('reg-cgpa');
    const regSkills   = document.getElementById('reg-skills');

    if (regName) {
      Validator.bind(regName, () => {
        Validator.validateText(regName, { min: 1, max: 120, required: true, fieldName: 'Full name' }, 'err-reg-fullname');
      });
    }
    if (regEmail) {
      Validator.bind(regEmail, () => {
        Validator.validateEmail(regEmail, { required: true, max: 150, fieldName: 'College email' }, 'err-reg-email');
      });
    }
    if (regPassword) {
      Validator.bind(regPassword, () => {
        Validator.validatePassword(regPassword, { min: 6, max: 72, fieldName: 'Password' }, 'err-reg-password');
      });
    }
    if (regRoll) {
      Validator.bind(regRoll, () => {
        Validator.validateText(regRoll, { min: 1, max: 50, required: true, fieldName: 'Roll number' }, 'err-reg-roll');
      });
    }
    if (regDept) {
      Validator.bind(regDept, () => {
        Validator.validateRequired(regDept, 'Department / Branch', 'err-reg-dept');
      });
    }
    if (regBatch) {
      Validator.bind(regBatch, () => {
        Validator.validateNumber(regBatch, { min: 2000, max: 2100, integer: true, required: true, fieldName: 'Graduation year' }, 'err-reg-batch');
      });
    }
    if (regCgpa) {
      Validator.bind(regCgpa, () => {
        Validator.validateNumber(regCgpa, { min: 0, max: 10, integer: false, required: true, fieldName: 'Official CGPA' }, 'err-reg-cgpa');
      });
    }
    if (regSkills) {
      Validator.bind(regSkills, () => {
        Validator.validateText(regSkills, { min: 1, max: 2000, required: true, fieldName: 'Technical skills' }, 'err-reg-skills');
      });
    }

    // ---- Change password forms ----
    document.querySelectorAll('.cp-form').forEach(form => {
      const current = form.elements['current'];
      const newPass = form.elements['new'];
      const confirm = form.elements['confirm'];

      if (current) {
        Validator.bind(current, () => Validator.validateRequired(current, 'Current password'));
      }
      if (newPass) {
        Validator.bind(newPass, () => {
          Validator.validatePassword(newPass, { min: 6, max: 72, fieldName: 'New password' });
          if (confirm && confirm.value) {
            Validator.validateMatch(confirm, newPass, { message: 'Passwords do not match' });
          }
        });
      }
      if (confirm) {
        Validator.bind(confirm, () => {
          const reqOk = Validator.validateRequired(confirm, 'Confirm password');
          if (reqOk && newPass && newPass.value !== confirm.value) {
            Validator.setFieldState(confirm, 'Passwords do not match');
          }
        });
      }
    });
  },

  /* ---- Validation helpers (kept for backward compatibility) ---- */
  _setFieldState(input, errId, message) {
    return Validator.setFieldState(input, message, errId);
  },

  _validateRequired(input, errId, msg) {
    return Validator.validateRequired(input, msg || 'This field', errId);
  },

  _validateEmail(input, errId, strict = false) {
    return Validator.validateEmail(input, { required: strict, max: 150, fieldName: 'Email' }, errId);
  },

  _validatePassword(input, errId) {
    return Validator.validatePassword(input, { min: 6, max: 72, fieldName: 'Password' }, errId);
  },

  bindEvents() {
    // Student Login / Officer Login buttons
    document.querySelectorAll('.role-btn').forEach(btn => {
      btn.addEventListener('click', () => this.selectRole(btn.dataset.loginRole));
    });

    // Forgot password / Contact admin (no email service is used, so we show instructions)
    document.getElementById('forgot-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showInfo('Forgot Password?',
        '<p><b>Students:</b> your temporary password is your <b>Roll Number in CAPITAL letters</b> (until you change it).</p>' +
        '<p style="margin-top:0.5rem">If you changed it and forgot it, please meet the Placement Officer. The officer will reset it for you.</p>');
    });
    document.getElementById('contact-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showInfo('Contact Admin',
        '<p><b>Training &amp; Placement Cell</b></p>' +
        '<p>Visit the Placement Cell office during college hours, or email the placement officer.</p>' +
        '<p style="margin-top:0.5rem">Email: <b>college@campus.edu.in</b></p>');
    });

    // Change password forms (student and officer)
    document.querySelectorAll('.cp-form').forEach(form => {
      form.addEventListener('submit', (e) => this.handleChangePassword(e, form));
    });

    // Login form submit
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Register form submit
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }

    // Toggle between login and register views
    const showRegisterBtn = document.getElementById('show-register-btn');
    const showLoginBtn = document.getElementById('show-login-btn');
    const loginCard = document.getElementById('login-card');
    const registerCard = document.getElementById('register-card');

    if (showRegisterBtn && registerCard && loginCard) {
      showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginCard.classList.add('hidden');
        registerCard.classList.remove('hidden');
      });
    }

    if (showLoginBtn && registerCard && loginCard) {
      showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        registerCard.classList.add('hidden');
        loginCard.classList.remove('hidden');
      });
    }

    // Global logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleLogout();
      });
    }

    // Listen for session expiry event
    window.addEventListener('auth:expired', () => {
      API.showToast('Session expired. Please log in again.', 'warning');
      this.handleLogout(false);
    });
  },

  async handleLogin(e) {
    e.preventDefault();
    const emailEl    = document.getElementById('login-email');
    const passwordEl = document.getElementById('login-password');
    const email      = emailEl.value.trim();
    const password   = passwordEl.value;
    const submitBtn  = document.getElementById('login-submit-btn');
    API.setRemember(document.getElementById('login-remember').checked);

    // Run client-side validation on submit
    const emailOk = Validator.validateEmail(emailEl, { required: true, max: 150, fieldName: 'Email' }, 'err-login-email');
    const passOk  = Validator.validateRequired(passwordEl, 'Password', 'err-login-password');
    if (!emailOk || !passOk) {
      API.showToast('Please enter valid login credentials.', 'warning');
      const firstErr = (!emailOk ? emailEl : passwordEl);
      if (firstErr) firstErr.focus();
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in…';

      const res = await API.api('/auth/login', {
        method: 'POST',
        body: { email, password, role: this.loginRole }
      });

      API.setToken(res.token);
      API.setUser(res.user);
      API.showToast(`Welcome back, ${res.user.full_name}!`, 'success');

      // Update UI state
      App.onLoginSuccess(res.user);
    } catch (err) {
      API.showToast(err.message || 'Login failed. Please check credentials.', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const nameEl = document.getElementById('reg-fullname');
    const emailEl = document.getElementById('reg-email');
    const passEl = document.getElementById('reg-password');
    const rollEl = document.getElementById('reg-roll');
    const deptEl = document.getElementById('reg-dept');
    const batchEl = document.getElementById('reg-batch');
    const cgpaEl = document.getElementById('reg-cgpa');
    const skillsEl = document.getElementById('reg-skills');
    const submitBtn = document.getElementById('register-submit-btn');

    // Validate all fields before submit
    const nameOk = Validator.validateText(nameEl, { min: 1, max: 120, required: true, fieldName: 'Full name' }, 'err-reg-fullname');
    const emailOk = Validator.validateEmail(emailEl, { required: true, max: 150, fieldName: 'College email' }, 'err-reg-email');
    const passOk = Validator.validatePassword(passEl, { min: 6, max: 72, fieldName: 'Password' }, 'err-reg-password');
    const rollOk = Validator.validateText(rollEl, { min: 1, max: 50, required: true, fieldName: 'Roll number' }, 'err-reg-roll');
    const deptOk = Validator.validateRequired(deptEl, 'Department / Branch', 'err-reg-dept');
    const batchOk = Validator.validateNumber(batchEl, { min: 2000, max: 2100, integer: true, required: true, fieldName: 'Graduation year' }, 'err-reg-batch');
    const cgpaOk = Validator.validateNumber(cgpaEl, { min: 0, max: 10, integer: false, required: true, fieldName: 'Official CGPA' }, 'err-reg-cgpa');
    const skillsOk = Validator.validateText(skillsEl, { min: 1, max: 2000, required: true, fieldName: 'Technical skills' }, 'err-reg-skills');

    if (!nameOk || !emailOk || !passOk || !rollOk || !deptOk || !batchOk || !cgpaOk || !skillsOk) {
      API.showToast('Please fix the highlighted errors before creating your account.', 'warning');
      const firstErr = document.getElementById('register-form').querySelector('.input-error');
      if (firstErr) firstErr.focus();
      return;
    }

    const payload = {
      full_name: nameEl.value.trim(),
      email: emailEl.value.trim(),
      password: passEl.value,
      roll_number: rollEl.value.trim().toUpperCase(),
      department: deptEl.value.trim(),
      graduation_year: Number(batchEl.value),
      cgpa: Number(cgpaEl.value),
      skills: skillsEl.value.trim()
    };

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';

      const res = await API.api('/auth/register', {
        method: 'POST',
        body: payload
      });

      API.setToken(res.token);
      API.setUser(res.user);
      API.showToast(res.message || 'Account created successfully!', 'success');

      // Reset register form & switch
      document.getElementById('register-form').reset();
      Validator.clearErrors(document.getElementById('register-form'));
      document.getElementById('register-card').classList.add('hidden');
      document.getElementById('login-card').classList.remove('hidden');

      App.onLoginSuccess(res.user);
    } catch (err) {
      API.showToast(err.message || 'Registration failed.', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Complete Registration';
    }
  },

  // Switch between Student Login and Officer Login
  selectRole(role) {
    this.loginRole = role;
    document.querySelectorAll('.role-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.loginRole === role);
    });
    const email = document.getElementById('login-email');
    const password = document.getElementById('login-password');
    if (role === 'officer') {
      email.placeholder = 'Enter your email address';
      password.placeholder = 'Enter your password';
    } else {
      email.placeholder = 'Enter your email address';
      password.placeholder = 'Enter your password';
    }
    // only students can register
    document.getElementById('toggle-register-link').classList.toggle('hidden', role === 'officer');
  },

  // Small popup with a message
  showInfo(title, html) {
    let modal = document.getElementById('info-modal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'info-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          <button class="modal-close" onclick="document.getElementById('info-modal').remove()">&times;</button>
        </div>
        <div class="modal-body" style="font-size:0.9rem">${html}</div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="document.getElementById('info-modal').remove()">OK</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  },

  async handleChangePassword(e, form) {
    e.preventDefault();
    const currentInput = form.elements['current'];
    const newInput = form.elements['new'];
    const confirmInput = form.elements['confirm'];

    const currentOk = Validator.validateRequired(currentInput, 'Current password');
    const newOk = Validator.validatePassword(newInput, { min: 6, max: 72, fieldName: 'New password' });
    let confirmOk = Validator.validateRequired(confirmInput, 'Confirm password');
    if (confirmOk && newInput.value !== confirmInput.value) {
      Validator.setFieldState(confirmInput, 'New password and confirm password do not match');
      confirmOk = false;
    }
    if (newOk && currentOk && newInput.value === currentInput.value) {
      Validator.setFieldState(newInput, 'New password must be different from current password');
      API.showToast('New password must be different from current password.', 'warning');
      newInput.focus();
      return;
    }

    if (!currentOk || !newOk || !confirmOk) {
      API.showToast('Please fix the errors in the password form.', 'warning');
      const firstErr = form.querySelector('.input-error');
      if (firstErr) firstErr.focus();
      return;
    }

    try {
      const res = await API.api('/auth/change-password', {
        method: 'POST',
        body: { current_password: currentInput.value, new_password: newInput.value }
      });
      API.showToast(res.message, 'success');
      form.reset();
      Validator.clearErrors(form);
    } catch (err) {
      API.showToast(err.message || 'Could not change password.', 'danger');
    }
  },

  async checkSession() {
    const token = API.getToken();
    if (!token) {
      App.showAuth();
      return;
    }

    try {
      const res = await API.api('/auth/me');
      if (res.user) {
        API.setUser(res.user);
        App.onLoginSuccess(res.user);
      } else {
        this.handleLogout(false);
      }
    } catch {
      this.handleLogout(false);
    }
  },

  async handleLogout(notifyServer = true) {
    if (notifyServer && API.getToken()) {
      try {
        await API.api('/auth/logout', { method: 'POST' });
      } catch {
        // Ignore logout errors
      }
    }
    API.clearSession();
    App.onLogout();
    API.showToast('You have been logged out.', 'info');
  }
};

window.Auth = Auth;

