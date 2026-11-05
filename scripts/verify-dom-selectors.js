const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');

const jsFiles = [
  'public/js/api.js',
  'public/js/auth.js',
  'public/js/app.js',
  'public/js/officer.js',
  'public/js/student.js'
];

// Dynamically created elements and their children injected at runtime:
const runtimeCreated = new Set([
  'toast-container',
  'info-modal',
  'app-status-modal',
  'modal-app-status',
  'modal-app-remarks',
  'custom-round-modal',
  'new-round-name',
  'new-round-desc',
  'round-eval-modal',
  'final-result-modal',
  'student-academic-modal',
  'round-edit-modal',
  'edit-round-name',
  'edit-round-desc',
  'edit-round-active',
  'student-view-modal',
  'edit-cgpa-modal',
  'new-student-cgpa'
]);

const idRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
const missing = [];

for (const f of jsFiles) {
  const content = fs.readFileSync(path.join(rootDir, f), 'utf8');
  let match;
  while ((match = idRegex.exec(content)) !== null) {
    const id = match[1];
    if (runtimeCreated.has(id)) continue;
    const pattern = new RegExp(`id=["']${id}["']`);
    if (!pattern.test(html)) {
      missing.push({ file: f, id });
    }
  }
}

console.log('Missing DOM selectors count:', missing.length);
if (missing.length > 0) {
  console.log(JSON.stringify(missing, null, 2));
} else {
  console.log('All static DOM element selectors verified successfully! Zero mismatches.');
}
