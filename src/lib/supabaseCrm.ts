// Admin e CRM agora vivem no mesmo projeto Supabase (Lumina CRM).
// Reexporta o cliente único para evitar duas instâncias de auth no mesmo storage.
import { supabase } from './supabase';

export const supabaseCrm = supabase;
