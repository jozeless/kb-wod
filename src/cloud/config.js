// Public browser configuration for the EXISTING KB WODS project only.
// Fill from Project Settings > API. Never use a secret or service_role key.
export const supabaseConfig = { url: '', publishableKey: '' };
export function validateConfig(config) {
  if (!config.url || !config.publishableKey) return false;
  const url = new URL(config.url);
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error('Use the HTTPS Supabase project origin.');
  const key = config.publishableKey;
  if (key.startsWith('sb_publishable_')) return true;
  try {
    const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.role === 'anon') return true;
  } catch { /* Reject unknown or privileged credentials. */ }
  throw new Error('Only a public publishable or legacy anon key is allowed.');
}
