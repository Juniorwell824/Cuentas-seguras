import { createClient } from '@supabase/supabase-js';

// ⚠️ REEMPLAZA ESTOS VALORES con los de tu proyecto Supabase
// Los encuentras en: https://app.supabase.com → Settings → API
const SUPABASE_URL = 'https://fkndkhuhkeyedmtlrpli.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_AKHfM0iznPCiK5Dk6lApQw_xMbdCYLx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
