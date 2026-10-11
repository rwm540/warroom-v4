import('./src/index.js').catch(() => {
  console.error('[warroom-otp-api] startup failed');
  process.exitCode = 1;
});
