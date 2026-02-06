
// ==========================================
// CONFIGURAÇÃO SUPABASE - CONECTADO
// ==========================================
const SUPABASE_URL = "https://ubzkyzyahnpfpydwxeja.supabase.co"; 

// AQUI: Você DEVE colar o código da sua TERCEIRA imagem (campo 'anon public')
// Ele começa com "eyJhbG..." e é bem longo.
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViemt5enlhaG5wZnB5ZHd4ZWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzIwMzgsImV4cCI6MjA4NTkwODAzOH0.bsgg5KvOMqYx8YA7Kmg3hhxJvUVuvmzDNClvodsC6pI";

export const saveToSupabase = async (data: any) => {
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("COLE_AQUI")) {
    console.error("❌ SUPABASE: Erro de Configuração! Você não colou a sua 'Anon Key' no arquivo supabaseService.ts.");
    return false;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/storage`, {
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ SUPABASE Erro ao Salvar:", errorText);
      if (errorText.includes("relation \"public.storage\" does not exist")) {
        console.error("💡 DICA: Você esqueceu de criar a tabela 'storage' no SQL Editor do Supabase!");
      }
      return false;
    }

    return true;
  } catch (e) {
    console.error("❌ SUPABASE Erro de Rede:", e);
    return false;
  }
};

export const fetchFromSupabase = async () => {
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("COLE_AQUI")) {
    return { _isConfigError: true };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/storage?id=eq.global_state&select=data`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ SUPABASE Erro ao Buscar Dados:", errorText);
      return null;
    }
    
    const result = await response.json();
    if (!result || result.length === 0) return { _isEmpty: true };
    
    return result[0].data;
  } catch (e) {
    console.error("❌ SUPABASE Erro de Conexão:", e);
    return null;
  }
};
