// ===== CONEXIÓN Y LOGIN CON SUPABASE =====
// La "anon/publishable key" es pública por diseño (segura de exponer en el
// navegador) -- la seguridad real la dan las políticas RLS configuradas en
// supabase_schema.sql, no que esta clave sea secreta.
const SUPABASE_URL = 'https://cfukejzjifyfiejfwhsj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_GNh6stUKtkoy9BUa6NAoHg_nFxYcu8J';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let appIniciada = false;

export { supabaseClient };

