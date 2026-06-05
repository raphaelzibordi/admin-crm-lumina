// Calls the CRM Supabase Edge Function (server-side proxy with service role).
// The anon key is safe to expose in the browser — the service role stays server-side.
const QUERY_URL = import.meta.env.VITE_CRM_QUERY_URL as string;
const ANON_KEY  = import.meta.env.VITE_CRM_ANON_KEY  as string;

if (!QUERY_URL || !ANON_KEY) throw new Error('Missing CRM Edge Function env vars');

interface QueryOptions {
  select?: string;
  filters?: Record<string, string>;
  order?: string;
  limit?: number;
}

export async function crmQuery<T>(table: string, opts: QueryOptions = {}): Promise<T[]> {
  const res = await fetch(QUERY_URL, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      table,
      select: opts.select,
      filters: opts.filters,
      order: opts.order,
      limit: opts.limit,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CRM query failed [${table}]: ${res.status} ${body}`);
  }

  const json = await res.json();
  if (json?.error) throw new Error(`CRM error [${table}]: ${json.error}`);
  return json as T[];
}

export async function crmPatch(table: string, id: string, updates: Record<string, unknown>): Promise<void> {
  const res = await fetch(QUERY_URL, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'patch', table, id, updates }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CRM update failed [${table}]: ${res.status} ${body}`);
  }
  const json = await res.json();
  if (json?.error) throw new Error(`CRM update error [${table}]: ${json.error}`);
}

export async function crmPost(table: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetch(QUERY_URL, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'insert', table, data }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CRM insert failed [${table}]: ${res.status} ${body}`);
  }
  const json = await res.json();
  if (json?.error) throw new Error(`CRM insert error [${table}]: ${json.error}`);
}
