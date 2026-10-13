#!/usr/bin/env node
/**
 * Operator tool: check the *delivery* status of one IPPanel OTP message.
 *
 *   node server_node/scripts/check-sms-status.mjs <message_outbox_id>
 *   node server_node/scripts/check-sms-status.mjs --challenge <challenge_uuid>
 *
 * Reads the server-side environment (server_node/.env or injected env) and calls the
 * documented IPPanel report endpoints:
 *   GET /v1/api/report/by_bulk?messages_outbox_id=<id>
 *   GET /v1/api/report/recipients?bulk_id=<id>&page=1&per_page=30
 *     message_status: 0 sent to operator | 1 operator received | 2 delivered | 3 not delivered
 *                     | 4 blacklisted
 *
 * The output is sanitized on purpose: no API key, no OTP code, no raw provider body and no
 * full phone numbers (recipients are masked). Exit code 0 = report read, 1 = failure.
 */

import { config } from '../src/config.js';
import { fetchSmsDeliveryStatus } from '../src/lib/sms.js';
import { supabaseAdmin } from '../src/lib/supabase.js';
import { createSupabaseStore } from '../src/lib/store.js';

function usage() {
  console.error('usage: node server_node/scripts/check-sms-status.mjs <message_outbox_id> | --challenge <challenge_uuid>');
}

async function resolveMessageId(argv) {
  const [first, second] = argv;
  if (first === '--challenge') {
    const challengeId = String(second || '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(challengeId)) {
      throw new Error('challenge id must be a UUID');
    }
    if (!supabaseAdmin) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are not configured');
    const store = createSupabaseStore(supabaseAdmin);
    const messageId = await store.getOtpSmsMessageId(challengeId);
    if (!messageId) throw new Error('no provider message id recorded for this challenge');
    return messageId;
  }
  const messageId = String(first || '').trim();
  if (!/^\d{1,32}$/.test(messageId)) throw new Error('message id must be numeric');
  return messageId;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    usage();
    process.exit(argv.length === 0 ? 1 : 0);
  }

  const messageId = await resolveMessageId(argv);
  const status = await fetchSmsDeliveryStatus(messageId);

  console.log(JSON.stringify({
    messageId: status.messageId,
    provider: status.provider,
    bulkState: status.state,
    deliveredToHandset: status.delivered,
    counts: status.counts,
    recipients: status.recipients,
    note: status.delivered
      ? 'Provider reports handset delivery for every retrieved recipient.'
      : 'Not delivered yet: check bulkState, counts and message_status per recipient.',
  }, null, 2));

  // Environment summary without any secret value.
  console.log(JSON.stringify({
    environment: config.nodeEnv,
    smsConfigured: Boolean(config.ippanelKey && config.ippanelFrom),
    otpTtlSeconds: config.otpTtlSeconds,
  }));
}

main().catch((error) => {
  console.error(`check-sms-status failed: ${String(error?.code || error?.message || error).slice(0, 120)}`);
  process.exit(1);
});
