import('./src/index.js').catch((error) => {
  console.error('[warroom-server-node] startup failed:', error.message);
  process.exitCode = 1;
});
