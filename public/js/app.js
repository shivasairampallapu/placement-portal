/**
 * app.js - Single Page Application (SPA) Controller & Tab Router
 * Manages view switching between Student, Officer, and Auth interfaces,
 * mobile sidebar drawer, breadcrumb headers, and clears state on logout.
 */

const App = {
  currentUser: null,
  activeRole: null,
  activeTab: 'dashboard',

  tabTitles: {
    dashboard: 'Dashboard Overview',
    profile: 'Academic Profile & Coding Links',
    drives: 'Placement Opportunities',
    applications: 'My Applications',
    notifications: 'Notices & Announcements',
    password: 'Security & Password',
    companies: 'Recruiting Partners Directory',
    shortlist: 'Ranked Shortlists',
    rounds: 'Interview Rounds & Evaluation',
    results: 'Final Decisions & Placement Offers',
    directory: 'Registered Students Directory',
    announcements: 'Broadcast Placement Notice',
    officers: 'Placement Officers Management'
  },

  init() {
    this.bindGlobalTabs();
    this.bindSidebarToggles();
    Auth.init();
    Student.init();
    Officer.init();
  },

  bindGlobalTabs() {
    // Delegate tab button clicks
    document.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.tab-btn');
      if (!tabBtn) return;
      const tabName = tabBtn.dataset.tab;
      const role = tabBtn.dataset.role;
      if (tabName && role) {
        this.switchTab(role, tabName);
      }
    });
  },

  bindSidebarToggles() {
    document.addEventListener('click', (e) => {
      const toggle = e.target.closest('.sidebar-toggle-btn');
      if (toggle) {
        this.toggleSidebar();
      }
      const backdrop = e.target.closest('.sidebar-backdrop');
      if (backdrop) {
        this.toggleSidebar(false);
      }
    });
  },

  toggleSidebar(force) {
    const portal = document.querySelector('#student-portal:not(.hidden), #officer-portal:not(.hidden)');
    if (!portal) return;
    const sidebar = portal.querySelector('.app-sidebar');
    const backdrop = portal.querySelector('.sidebar-backdrop');
    if (!sidebar) return;

    const isOpen = force !== undefined ? force : !sidebar.classList.contains('open');
    if (isOpen) {
      sidebar.classList.add('open');
      backdrop?.classList.add('open');
      document.body.classList.add('sidebar-locked');
    } else {
      sidebar.classList.remove('open');
      backdrop?.classList.remove('open');
      document.body.classList.remove('sidebar-locked');
    }
  },

  showAuth() {
    this.currentUser = null;
    this.activeRole = null;
    document.getElementById('nav-user-panel')?.classList.add('hidden');
    document.getElementById('student-portal')?.classList.add('hidden');
    document.getElementById('officer-portal')?.classList.add('hidden');
    document.getElementById('auth-section')?.classList.remove('hidden');
    this.toggleSidebar(false);
    this.resetPortals();
  },

  onLoginSuccess(user) {
    this.currentUser = user;
    this.activeRole = user.role;

    // Update Navbar user details & avatar
    const userPanel = document.getElementById('nav-user-panel');
    if (userPanel) {
      document.getElementById('nav-username').textContent = user.full_name;
      document.getElementById('nav-userrole').textContent = user.role === 'officer' ? 'Placement Officer' : 'Student';
      const avatar = document.getElementById('nav-avatar');
      if (avatar && user.full_name) {
        const parts = user.full_name.trim().split(/\s+/);
        avatar.textContent = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
      }
      userPanel.classList.remove('hidden');
    }

    // Hide Auth screen
    document.getElementById('auth-section')?.classList.add('hidden');

    this.resetPortals();
    this.toggleSidebar(false);

    if (user.role === 'officer') {
      document.getElementById('student-portal')?.classList.add('hidden');
      document.getElementById('officer-portal')?.classList.remove('hidden');
      this.switchTab('officer', 'dashboard');
    } else {
      document.getElementById('officer-portal')?.classList.add('hidden');
      document.getElementById('student-portal')?.classList.remove('hidden');
      this.switchTab('student', 'dashboard');
    }
  },

  onLogout() {
    this.showAuth();
  },

  // Clears out previous user's rendered table rows and resets to dashboard tab
  resetPortals() {
    // Clear student tables/containers
    const studentTbody = document.getElementById('student-applications-tbody');
    if (studentTbody) studentTbody.innerHTML = '';
    const studentShortlistTbody = document.getElementById('student-shortlist-tbody');
    if (studentShortlistTbody) studentShortlistTbody.innerHTML = '';
    const studentRoundsTbody = document.getElementById('student-rounds-tbody');
    if (studentRoundsTbody) studentRoundsTbody.innerHTML = '';
    const studentResultsTbody = document.getElementById('student-results-tbody');
    if (studentResultsTbody) studentResultsTbody.innerHTML = '';
    const studentDrivesList = document.getElementById('student-drives-list');
    if (studentDrivesList) studentDrivesList.innerHTML = '';
    const notifsList = document.getElementById('student-notifications-list');
    if (notifsList) notifsList.innerHTML = '';

    // Clear officer tables/containers
    const officerRecent = document.getElementById('officer-recent-activity-tbody');
    if (officerRecent) officerRecent.innerHTML = '';
    const officerApps = document.getElementById('officer-apps-tbody');
    if (officerApps) officerApps.innerHTML = '';
    const officerComp = document.getElementById('officer-companies-tbody');
    if (officerComp) officerComp.innerHTML = '';
    const officerDrives = document.getElementById('officer-drives-tbody');
    if (officerDrives) officerDrives.innerHTML = '';
    const officerDir = document.getElementById('officer-directory-tbody');
    if (officerDir) officerDir.innerHTML = '';
    const officerShortlist = document.getElementById('officer-shortlist-results');
    if (officerShortlist) officerShortlist.innerHTML = '';
    const officerRounds = document.getElementById('officer-rounds-content');
    if (officerRounds) officerRounds.innerHTML = '';
    const officerResults = document.getElementById('officer-results-content');
    if (officerResults) officerResults.innerHTML = '';
  },

  switchTab(role, tabName) {
    this.activeTab = tabName;

    // Automatically dismiss mobile sidebar drawer on navigation
    this.toggleSidebar(false);

    // Update Tab Buttons UI
    const container = document.getElementById(`${role}-portal`);
    if (!container) return;

    const buttons = container.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update Tab Content Panes
    const panes = container.querySelectorAll('.tab-pane');
    panes.forEach(pane => {
      if (pane.id === `${role}-tab-${tabName}`) {
        pane.classList.remove('hidden');
      } else {
        pane.classList.add('hidden');
      }
    });

    // Update breadcrumb section title
    const breadcrumbTitle = document.getElementById(`${role}-current-tab-title`);
    if (breadcrumbTitle) {
      breadcrumbTitle.textContent = this.tabTitles[tabName] || tabName;
    }

    // Trigger tab specific data load
    if (role === 'student') {
      if (tabName === 'dashboard') Student.loadDashboard();
      if (tabName === 'profile') Student.loadProfile();
      if (tabName === 'drives') Student.loadDrives();
      if (['applications', 'shortlist', 'rounds', 'results'].includes(tabName)) Student.loadApplications();
      if (tabName === 'notifications') Student.loadNotifications();
    } else if (role === 'officer') {
      if (tabName === 'dashboard') Officer.loadDashboard();
      if (tabName === 'companies') Officer.loadCompanies();
      if (tabName === 'drives') { Officer.loadCompanies(); Officer.loadDrives(); }
      if (tabName === 'applications') { Officer.loadDrives(); Officer.loadApplications(); }
      if (tabName === 'shortlist') Officer.loadDrives();
      if (tabName === 'rounds') Officer.loadDrives();
      if (tabName === 'results') Officer.loadDrives();
      if (tabName === 'directory') Officer.loadDirectory();
      if (tabName === 'announcements') Officer.loadDrives();
    }
  }
};

window.App = App;

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

