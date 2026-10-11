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
    error.status = 500;
    throw error;
  }
  return supabaseAdmin;
}

export async function findUserByNationalCode(nationalCode) {
  const db = assertDb();
  const { data, error } = await db
    .from('warroom_users')
    .select('id, data')
    .eq('data->>national_code', nationalCode)
    .limit(5);

  if (error) {
    const { data: fallback, error: fallbackError } = await db
      .from('warroom_users')
      .select('id, data');
    if (fallbackError) throw fallbackError;
    return (fallback || []).find((row) => String(row.data?.national_code || '') === nationalCode) || null;
  }

  return (data || []).find((row) => String(row.data?.national_code || '') === nationalCode) || null;
}

export async function findUserById(userId) {
  const { data, error } = await assertDb()
    .from('warroom_users')
    .select('id, data')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function findUserByPhone(phone) {
  const { data, error } = await assertDb()
    .from('warroom_users')
    .select('id, data')
    .eq('data->>phone', phone)
    .limit(5);
  if (error) throw error;
  return (data || []).find((row) => String(row.data?.phone || '') === phone) || null;
}
