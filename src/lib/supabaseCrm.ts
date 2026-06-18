import { createClient } from '@supabase/supabase-js';

const CRM_QUERY_URL = import.meta.env.VITE_CRM_QUERY_URL as string;
const CRM_ANON_KEY = import.meta.env.VITE_CRM_ANON_KEY as string;

// Extrai a URL base do Supabase do CRM (removendo a rota de edge functions, se houver)
const CRM_URL = CRM_QUERY_URL ? CRM_QUERY_URL.split('/functions/')[0] : '';

export const supabaseCrm = createClient(CRM_URL, CRM_ANON_KEY);
