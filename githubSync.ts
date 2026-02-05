
export interface SyncConfig {
  token: string;
  owner: string;
  repo: string;
  path: string;
}

// Configurações globais embutidas para sincronização
export const CLOUD_CONFIG: SyncConfig = {
  // ATENÇÃO: Se este token foi exposto publicamente, o GitHub pode tê-lo revogado. 
  // Caso o erro persista, gere um novo token (Classic) com escopo 'repo' no GitHub.
  token: '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',
  owner: 'claudiofiuza', 
  repo: 'lsc-pro-db',    
  path: 'database.json'
};

export const syncToCloud = async (data: any) => {
  const { token, owner, repo, path } = CLOUD_CONFIG;
  if (!token || token.includes('SEU_TOKEN')) return null;

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
  try {
    const getRes = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
      }
    });
    
    let sha = '';
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    }

    // Encoding UTF-8 seguro para Base64
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    
    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `Cloud Sync: ${new Date().toISOString()}`,
        content,
        sha: sha || undefined
      })
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      console.error("Erro no PUT do GitHub:", err);
    }

    return putRes.ok;
  } catch (error) {
    console.error("Erro crítico na sincronização Cloud:", error);
    return false;
  }
};

export const fetchFromCloud = async () => {
  const { token, owner, repo, path } = CLOUD_CONFIG;
  if (!token || token.includes('SEU_TOKEN')) return null;

  // Cache-busting agressivo para evitar dados antigos
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?nocache=${Date.now()}`;
  
  try {
    const res = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!res.ok) {
      if (res.status === 404) console.warn("Banco de dados não encontrado no GitHub. Criando um novo ao salvar.");
      return null;
    }
    
    const fileData = await res.json();
    
    // IMPORTANTE: GitHub adiciona \n no base64 de arquivos grandes. Precisamos remover.
    const cleanBase64 = fileData.content.replace(/\s/g, '');
    const content = decodeURIComponent(escape(atob(cleanBase64)));
    
    return JSON.parse(content);
  } catch (error) {
    console.error("Erro ao buscar dados Cloud:", error);
    return null;
  }
};
