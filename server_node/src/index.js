import { createApp } from './app.js';
import { config, collectConfigProblems } from './config.js';
import { supabaseAdmin } from './lib/supabase.js';
import { createSupabaseStore, createUnavailableStore } from './lib/store.js';
import { createSmsGateway } from './lib/smsGateway.js';

const problems = collectConfigProblems();
if (problems.length > 0) {
  // Only secret *names* are logged, never values.
  const summary = `[warroom-otp-api] configuration problems: ${problems.join(', ')}`;
  if (config.isProduction) {
    console.error(`FATAL: ${summary}`);
    process.exit(1);
  }
  console.warn(summary);
}

const store = supabaseAdmin ? createSupabaseStore(supabaseAdmin) : createUnavailableStore();
const sms = createSmsGateway();

const { redisDenyCheck } = await import('./lib/redis.js');

const app = createApp({ store, sms, redis: { denyCheck: redisDenyCheck } });

const server = app.listen(config.port, config.host, () => {
  console.info(
    `[warroom-otp-api] listening on ${config.host}:${config.port} env=${config.nodeEnv} trustProxy=${config.trustProxy}`,
  );
});

async function gracefulShutdown(signal) {
  console.info(`[warroom-otp-api] ${signal} received, shutting down gracefully`);
  server.close(async () => {
    try {
      const { closeRedis } = await import('./lib/redis.js');
      await closeRedis();
    } catch {}
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[warroom-otp-api] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
