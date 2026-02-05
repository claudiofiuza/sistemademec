
export interface SyncConfig {
  token: string;
  owner: string;
  repo: string;
  path: string;
}

// Configurações globais embutidas para evitar configuração manual
export const CLOUD_CONFIG: SyncConfig = {
  token: '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',
  owner: 'claudiofiuza', // AJUSTE: Coloque aqui o seu nome de usuário do GitHub
  repo: 'sc-pro-db',      // AJUSTE: Coloque aqui o nome do repositório privado que você criou
  path: 'database.json'
};

export const syncToCloud = async (data: any) => {
  const { token, owner, repo, path } = CLOUD_CONFIG;
  if (!token || owner === 'seu-usuario') return null;

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
  try {
    const getRes = await fetch(url, {
      headers: { Authorization: `token ${token}` }
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
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Sync: Workshop Database Update',
        content,
        sha: sha || undefined
      })
    });

    return putRes.ok;
  } catch (error) {
    console.error("Erro na sincronização Cloud:", error);
    return false;
  }
};

export const fetchFromCloud = async () => {
  const { token, owner, repo, path } = CLOUD_CONFIG;
  if (!token || owner === 'seu-usuario') return null;

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
  try {
    const res = await fetch(url, {
      headers: { Authorization: `token ${token}` }
    });
    
    if (!res.ok) return null;
    
    const fileData = await res.json();
    const content = decodeURIComponent(escape(atob(fileData.content)));
    return JSON.parse(content);
  } catch (error) {
    console.error("Erro ao buscar dados Cloud:", error);
    return null;
  }
};
