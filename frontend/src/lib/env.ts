const trim = (v: string | undefined) => (v ?? '').trim().replace(/\/$/, '');

export const env = {
  apiUrl: trim(import.meta.env.VITE_API_URL) || 'http://localhost:4000/api/v1',
  siteUrl: trim(import.meta.env.VITE_SITE_URL) || (typeof window !== 'undefined' ? window.location.origin : ''),
  supabaseUrl: trim(import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim(),
};

export const authConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
