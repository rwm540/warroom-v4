/**
 * پیکربندی اتصال امن به Supabase
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('❌ تنظیمات Supabase ناقص است. لطفاً SUPABASE_URL و SUPABASE_ANON_KEY را در .env تنظیم کنید.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

module.exports = { supabase };
