
// ==========================================
// CONFIGURAÇÃO SUPABASE - CONECTADO
// ==========================================
const SUPABASE_URL = "https://ubzkyzyahnpfpydwxeja.supabase.co"; 

// AQUI: Você DEVE colar o código da sua TERCEIRA imagem (campo 'anon public')
// Ele começa com "eyJhbG..." e é bem longo.
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViemt5enlhaG5wZnB5ZHd4ZWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzIwMzgsImV4cCI6MjA4NTkwODAzOH0.bsgg5KvOMqYx8YA7Kmg3hhxJvUVuvmzDNClvodsC6pI";

export const saveToSupabase = async (data: any) => {
  if (SUPABASE_ANON_KEY.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViemt5enlhaG5wZnB5ZHd4ZWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzIwMzgsImV4cCI6MjA4NTkwODAzOH0.bsgg5KvOMqYx8YA7Kmg3hhxJvUVuvmzDNClvodsC6pI")) {
    console.error("Supabase: Você esqueceu de colar a sua Anon Key!");
    return false;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/storage`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates' // Isso faz o 'Upsert' (Cria ou Atualiza)
      },
      body: JSON.stringify({
        id: 'global_state',
        data: data,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro Supabase Save:", errorText);
      return false;
    }

    return true;
  } catch (e) {
    console.error("Erro de conexão Supabase:", e);
    return false;
  }
};

export const fetchFromSupabase = async () => {
  if (SUPABASE_ANON_KEY.includes("COLE_AQUI")) return null;

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
    // Se não houver dados ainda, retornamos null para o App saber que precisa inicializar
    if (!result || result.length === 0) return { _isEmpty: true };
    
    return result[0].data;
  } catch (e) {
    console.error("Erro Supabase Fetch:", e);
    return null;
  }
};
