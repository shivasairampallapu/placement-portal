/**
 * api.js - Centralized API Client & Utility Functions
 * Handles JWT tokens, requests, errors, date parsing without timezone offset shifts,
 * HTML escaping for XSS prevention, and toast alerts.
 */

const API_BASE = '/api';

// Token and Session Management
// "Remember Me" ticked   -> saved in localStorage (stays after closing the browser)
// "Remember Me" unticked -> saved in sessionStorage (cleared when the tab is closed)
let rememberMe = true;

function setRemember(flag) {
  rememberMe = flag;
}

function getToken() {
  return localStorage.getItem('placement_token') || sessionStorage.getItem('placement_token') || null;
}

function setToken(token) {
  localStorage.removeItem('placement_token');
  sessionStorage.removeItem('placement_token');
  if (token) {
    (rememberMe ? localStorage : sessionStorage).setItem('placement_token', token);
  }
}

function getUser() {
  try {
    const raw = localStorage.getItem('placement_user') || sessionStorage.getItem('placement_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setUser(user) {
  localStorage.removeItem('placement_user');
  sessionStorage.removeItem('placement_user');
  if (user) {
    (rememberMe ? localStorage : sessionStorage).setItem('placement_user', JSON.stringify(user));
  }
}

function clearSession() {
  localStorage.removeItem('placement_token');
  localStorage.removeItem('placement_user');
  sessionStorage.removeItem('placement_token');
  sessionStorage.removeItem('placement_user');
}

// Unified API request caller
async function api(endpoint, { method = 'GET', body = null, headers = {} } = {}) {
  const token = getToken();
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers: reqHeaders
  };

  if (body !== null && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const response = await fetch(url, config);
    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { success: response.ok, message: text };
    }

    if (!response.ok) {
      if (response.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
        // Expired or invalid session
        clearSession();
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
      const errorMsg = (data && data.message) || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Unable to reach the server. Please ensure the backend is running.');
    }
    throw err;
  }
}

// HTML Escaping to prevent Cross-Site Scripting (XSS)
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Wall-clock Date Helpers (prevents timezone shifts in UTC/ISO parsing)
function parseServerDate(strVal) {
  if (!strVal) return null;
  // Normalize "YYYY-MM-DD HH:mm:ss" to "YYYY-MM-DDTHH:mm:ss"
  const s = String(strVal).replace(' ', 'T');
  return new Date(s);
}

function toInputDateTime(strVal) {
  if (!strVal) return '';
  const s = String(strVal).replace(' ', 'T');
  return s.slice(0, 16); // "YYYY-MM-DDTHH:mm"
}

function toInputDate(strVal) {
  if (!strVal) return '';
  return String(strVal).slice(0, 10); // "YYYY-MM-DD"
}

function formatDateTime(strVal) {
  if (!strVal) return 'N/A';
  const d = parseServerDate(strVal);
  if (!d || isNaN(d.getTime())) return String(strVal);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDate(strVal) {
  if (!strVal) return 'N/A';
  const d = parseServerDate(strVal);
  if (!d || isNaN(d.getTime())) return String(strVal);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Global Toast Notifications
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
    <button style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:inherit;opacity:0.6" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 4000);
}

// Client-Side Validation Utility
const Validator = {
  // Finds or creates a .field-error element for an input
  getErrorEl(input, explicitId) {
    if (explicitId) {
      const el = document.getElementById(explicitId);
      if (el) return el;
    }
    const group = input.closest('.form-group') || input.parentElement;
    if (!group) return null;
    let err = group.querySelector('.field-error');
    if (!err) {
      err = document.createElement('span');
      err.className = 'field-error';
      if (input.parentElement && input.parentElement.classList.contains('password-wrap')) {
        input.parentElement.after(err);
      } else {
        group.appendChild(err);
      }
    }
    return err;
  },

  // Sets visual error or valid state on an input
  setFieldState(input, message, errSpanOrId) {
    if (!input) return false;
    let errEl = null;
    if (typeof errSpanOrId === 'string') {
      errEl = document.getElementById(errSpanOrId) || Validator.getErrorEl(input, errSpanOrId);
    } else if (errSpanOrId && errSpanOrId.nodeType) {
      errEl = errSpanOrId;
    } else {
      errEl = Validator.getErrorEl(input);
    }

    if (message) {
      if (errEl) {
        errEl.textContent = message;
        errEl.style.display = 'block';
      }
      input.classList.add('input-error');
      input.classList.remove('input-ok');
      input.setAttribute('aria-invalid', 'true');
      return false;
    } else {
      if (errEl) {
        errEl.textContent = '';
      }
      input.classList.remove('input-error');
      const val = input.value !== undefined ? String(input.value).trim() : '';
      if (val.length > 0) {
        input.classList.add('input-ok');
      } else {
        input.classList.remove('input-ok');
      }
      input.removeAttribute('aria-invalid');
      return true;
    }
  },

  // Clear validation styles and messages in a container or form
  clearErrors(container) {
    if (!container) return;
    container.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
    container.querySelectorAll('.input-error').forEach(el => {
      el.classList.remove('input-error');
      el.removeAttribute('aria-invalid');
    });
    container.querySelectorAll('.input-ok').forEach(el => { el.classList.remove('input-ok'); });
  },

  // 1. Required text or select
  validateRequired(input, fieldName = 'This field', errId) {
    if (!input) return false;
    const val = input.value !== undefined ? String(input.value).trim() : '';
    if (!val) {
      return Validator.setFieldState(input, `${fieldName} is required`, errId);
    }
    return Validator.setFieldState(input, '', errId);
  },

  // 2. Text with length limits
  validateText(input, { min = 1, max = 255, required = true, fieldName = 'This field' } = {}, errId) {
    if (!input) return false;
    const val = input.value !== undefined ? String(input.value).trim() : '';
    if (!val) {
      if (required) {
        return Validator.setFieldState(input, `${fieldName} is required`, errId);
      }
      return Validator.setFieldState(input, '', errId);
    }
    if (val.length < min) {
      return Validator.setFieldState(input, `${fieldName} must be at least ${min} character${min > 1 ? 's' : ''}`, errId);
    }
    if (val.length > max) {
      return Validator.setFieldState(input, `${fieldName} cannot exceed ${max} characters`, errId);
    }
    return Validator.setFieldState(input, '', errId);
  },

  // 3. Email
  validateEmail(input, { required = true, max = 150, fieldName = 'Email' } = {}, errId) {
    if (!input) return false;
    const val = input.value !== undefined ? String(input.value).trim() : '';
    if (!val) {
      if (required) {
        return Validator.setFieldState(input, `${fieldName} is required`, errId);
      }
      return Validator.setFieldState(input, '', errId);
    }
    if (val.length > max) {
      return Validator.setFieldState(input, `${fieldName} cannot exceed ${max} characters`, errId);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      return Validator.setFieldState(input, 'Please enter a valid email address', errId);
    }
    return Validator.setFieldState(input, '', errId);
  },

  // 4. Password
  validatePassword(input, { min = 6, max = 72, requireLetterNumber = false, fieldName = 'Password' } = {}, errId) {
    if (!input) return false;
    const val = input.value || '';
    if (!val) {
      return Validator.setFieldState(input, `${fieldName} is required`, errId);
    }
    if (val.length < min) {
      return Validator.setFieldState(input, `${fieldName} must be at least ${min} characters`, errId);
    }
    if (val.length > max) {
      return Validator.setFieldState(input, `${fieldName} cannot exceed ${max} characters`, errId);
    }
    if (requireLetterNumber) {
      if (!/[A-Za-z]/.test(val) || !/[0-9]/.test(val)) {
        return Validator.setFieldState(input, `${fieldName} must contain both letters and numbers`, errId);
      }
    }
    return Validator.setFieldState(input, '', errId);
  },

  // 5. Number
  validateNumber(input, { min = 0, max = Infinity, integer = false, required = true, fieldName = 'Value' } = {}, errId) {
    if (!input) return false;
    const raw = input.value !== undefined ? String(input.value).trim() : '';
    if (!raw) {
      if (required) {
        return Validator.setFieldState(input, `${fieldName} is required`, errId);
      }
      return Validator.setFieldState(input, '', errId);
    }
    const num = Number(raw);
    if (isNaN(num)) {
      return Validator.setFieldState(input, `${fieldName} must be a valid number`, errId);
    }
    if (integer && !Number.isInteger(num)) {
      return Validator.setFieldState(input, `${fieldName} must be a whole number`, errId);
    }
    if (num < min) {
      return Validator.setFieldState(input, `${fieldName} must be at least ${min}`, errId);
    }
    if (num > max) {
      return Validator.setFieldState(input, `${fieldName} cannot exceed ${max}`, errId);
    }
    return Validator.setFieldState(input, '', errId);
  },

  // 6. URL
  validateUrl(input, { required = false, max = 255, fieldName = 'URL' } = {}, errId) {
    if (!input) return false;
    const val = input.value !== undefined ? String(input.value).trim() : '';
    if (!val) {
      if (required) {
        return Validator.setFieldState(input, `${fieldName} is required`, errId);
      }
      return Validator.setFieldState(input, '', errId);
    }
    if (val.length > max) {
      return Validator.setFieldState(input, `${fieldName} cannot exceed ${max} characters`, errId);
    }
    if (!/^https?:\/\//i.test(val)) {
      return Validator.setFieldState(input, `${fieldName} must start with http:// or https://`, errId);
    }
    return Validator.setFieldState(input, '', errId);
  },

  // 7. Phone
  validatePhone(input, { required = false, max = 50, fieldName = 'Phone number' } = {}, errId) {
    if (!input) return false;
    const val = input.value !== undefined ? String(input.value).trim() : '';
    if (!val) {
      if (required) {
        return Validator.setFieldState(input, `${fieldName} is required`, errId);
      }
      return Validator.setFieldState(input, '', errId);
    }
    if (val.length > max) {
      return Validator.setFieldState(input, `${fieldName} cannot exceed ${max} characters`, errId);
    }
    if (!/^[\d\s+\-()]{7,50}$/.test(val)) {
      return Validator.setFieldState(input, 'Enter a valid phone number (digits, +, -, min 7 chars)', errId);
    }
    return Validator.setFieldState(input, '', errId);
  },

  // 8. Future DateTime
  validateFutureDateTime(input, { required = true, fieldName = 'Application deadline' } = {}, errId) {
    if (!input) return false;
    const val = input.value ? String(input.value).trim() : '';
    if (!val) {
      if (required) {
        return Validator.setFieldState(input, `${fieldName} is required`, errId);
      }
      return Validator.setFieldState(input, '', errId);
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      return Validator.setFieldState(input, `Enter a valid ${fieldName}`, errId);
    }
    if (d.getTime() <= Date.now()) {
      return Validator.setFieldState(input, `${fieldName} must be in the future`, errId);
    }
    return Validator.setFieldState(input, '', errId);
  },

  // 9. Date after or equal to another date
  validateDateAfter(input, compareValueOrInput, { required = true, fieldName = 'Placement date', compareName = 'deadline' } = {}, errId) {
    if (!input) return false;
    const val = input.value ? String(input.value).trim() : '';
    if (!val) {
      if (required) {
        return Validator.setFieldState(input, `${fieldName} is required`, errId);
      }
      return Validator.setFieldState(input, '', errId);
    }
    let compareDateStr = '';
    if (typeof compareValueOrInput === 'string') {
      compareDateStr = compareValueOrInput.slice(0, 10);
    } else if (compareValueOrInput && compareValueOrInput.value) {
      compareDateStr = String(compareValueOrInput.value).slice(0, 10);
    }
    if (compareDateStr && val.slice(0, 10) < compareDateStr) {
      return Validator.setFieldState(input, `${fieldName} cannot be before the ${compareName}`, errId);
    }
    return Validator.setFieldState(input, '', errId);
  },

  // 10. Match (e.g. passwords)
  validateMatch(input, matchInput, { message = 'Values do not match' } = {}, errId) {
    if (!input || !matchInput) return false;
    if (input.value !== matchInput.value) {
      return Validator.setFieldState(input, message, errId);
    }
    return Validator.setFieldState(input, '', errId);
  },

  // Helper to attach real-time validation to an input element
  bind(input, validateFn) {
    if (!input) return;
    const handler = () => validateFn(input);
    input.addEventListener('input', handler);
    input.addEventListener('blur', handler);
    if (input.tagName === 'SELECT' || input.type === 'date' || input.type === 'datetime-local' || input.type === 'checkbox') {
      input.addEventListener('change', handler);
    }
  }
};

window.Validator = Validator;

window.API = {
  api,
  setRemember,
  getToken,
  setToken,
  getUser,
  setUser,
  clearSession,
  escapeHtml,
  parseServerDate,
  toInputDateTime,
  toInputDate,
  formatDateTime,
  formatDate,
  showToast,
  Validator
};

