
export interface SyncConfig {
  token: string;
  owner: string;
  repo: string;
  path: string;
}

// Configurações globais de sincronização
export const CLOUD_CONFIG: SyncConfig = {
  // CERTIFIQUE-SE DE QUE O TOKEN ABAIXO SEJA O NOVO QUE VOCÊ GEROU
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

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    
    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `Cloud Update: ${new Date().toLocaleString()}`,
        content,
        sha: sha || undefined
      })
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      console.error("Falha no GitHub PUT:", err);
    }
    return putRes.ok;
  } catch (error) {
    console.error("Erro crítico Cloud Sync:", error);
    return false;
  }
};

export const fetchFromCloud = async () => {
  const { token, owner, repo, path } = CLOUD_CONFIG;
  if (!token || token.includes('SEU_TOKEN')) return null;

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?nocache=${Date.now()}`;
  
  try {
    const res = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
      }
    });
    
    // Se o arquivo não existir (404), retornamos um objeto vazio indicando "Novo Banco"
    if (res.status === 404) {
      return { _isNew: true };
    }
    
    if (!res.ok) return null;
    
    const fileData = await res.json();
    const cleanBase64 = fileData.content.replace(/\s/g, '');
    const content = decodeURIComponent(escape(atob(cleanBase64)));
    
    return JSON.parse(content);
  } catch (error) {
    console.error("Erro fetch Cloud:", error);
    return null;
  }
};
