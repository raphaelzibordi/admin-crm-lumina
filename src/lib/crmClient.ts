import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_CRM_SUPABASE_URL;
const key = import.meta.env.VITE_CRM_SERVICE_KEY;

if (!url || !key) throw new Error('Missing CRM Supabase env vars');

// Service-role client — bypasses RLS for super-admin reads
export const crm = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
