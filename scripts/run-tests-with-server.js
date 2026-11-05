const { spawn } = require('child_process');
const path = require('path');

const server = spawn('node', ['server.js'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit'
});

setTimeout(() => {
  const test1 = spawn('node', ['scripts/comprehensive-test.js'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit'
  });

  test1.on('exit', (code1) => {
    if (code1 !== 0) {
      server.kill();
      process.exit(code1);
    }

    const test2 = spawn('node', ['scripts/e2e-audit-test.js'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit'
    });

    test2.on('exit', (code2) => {
      server.kill();
      process.exit(code2 || 0);
    });
  });
}, 2000);

