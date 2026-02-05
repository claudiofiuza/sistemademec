
// ==========================================
// CONFIGURAÇÃO SUPABASE
// Substitua os valores abaixo pelos seus dados do projeto Supabase
// ==========================================
const SUPABASE_URL = "SUA_URL_DO_SUPABASE"; 
const SUPABASE_ANON_KEY = "SUA_ANON_KEY_DO_SUPABASE";

export const saveToSupabase = async (data: any) => {
  if (SUPABASE_URL === "SUA_URL_DO_SUPABASE") return false;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/storage?id=eq.global_state`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: 'global_state',
        data: data,
        updated_at: new Date().toISOString()
      })
    });
    return response.ok;
  } catch (e) {
    console.error("Supabase Save Error:", e);
    return false;
  }
};

export const fetchFromSupabase = async () => {
  if (SUPABASE_URL === "SUA_URL_DO_SUPABASE") return null;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/storage?id=eq.global_state&select=data`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) return null;
    const result = await response.json();
    return result[0]?.data || null;
  } catch (e) {
    console.error("Supabase Fetch Error:", e);
    return null;
  }
};
