
// ==========================================
// CONFIGURAÇÃO SUPABASE - CONECTADO
// ==========================================
// URL extraída da sua imagem:
const SUPABASE_URL = "https://ubzkyzyahnpfpydwxeja.supabase.co"; 

// IMPORTANTE: Copie o código da sua terceira imagem (campo 'anon public') e cole abaixo:
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViemt5enlhaG5wZnB5ZHd4ZWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzIwMzgsImV4cCI6MjA4NTkwODAzOH0.bsgg5KvOMqYx8YA7Kmg3hhxJvUVuvmzDNClvodsC6pI";

export const saveToSupabase = async (data: any) => {
  if (SUPABASE_ANON_KEY === "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViemt5enlhaG5wZnB5ZHd4ZWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzIwMzgsImV4cCI6MjA4NTkwODAzOH0.bsgg5KvOMqYx8YA7Kmg3hhxJvUVuvmzDNClvodsC6pI") {
    console.warn("Supabase: Chave Anon Key não configurada.");
    return false;
  }

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
    console.error("Erro ao salvar no Supabase:", e);
    return false;
  }
};

export const fetchFromSupabase = async () => {
  if (SUPABASE_ANON_KEY === "COLE_AQUI_O_CODIGO_DA_SUA_TERCEIRA_IMAGEM") return null;

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
    console.error("Erro ao carregar do Supabase:", e);
    return null;
  }
};
