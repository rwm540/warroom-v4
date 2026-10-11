import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

const key = config.supabaseServiceRoleKey;

export const supabaseAdmin = config.supabaseUrl && key
  ? createClient(config.supabaseUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export function assertDb() {
  if (!supabaseAdmin) {
    const error = new Error('DATABASE_NOT_CONFIGURED');
    error.status = 503;
    error.code = 'DATABASE_NOT_CONFIGURED';
    throw error;
  }
  return supabaseAdmin;
}

export async function findUserByNationalCode(nationalCode) {
  const { data, error } = await assertDb()
    .from('warroom_users')
    .select('id, data')
    .eq('data->>national_code', nationalCode)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function findUserByPhone(phoneLocal) {
  const { data, error } = await assertDb()
    .from('warroom_users')
    .select('id, data')
    .eq('data->>phone', phoneLocal)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function findUserByPhoneOrNational({ phone, nationalCode }) {
  // Prefer national_code lookup, fallback to phone
  if (nationalCode) {
    const byNational = await findUserByNationalCode(nationalCode);
    if (byNational) return byNational;
  }
  if (phone) {
    return findUserByPhone(phone);
  }
  return null;
}

export function getSupabaseAdmin() {
  return assertDb();
}
