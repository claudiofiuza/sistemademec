
export interface SyncConfig {
  token: string;
  owner: string;
  repo: string;
  path: string;
}

// Configurações globais embutidas para sincronização com o repositório do usuário claudiofiuza
export const CLOUD_CONFIG: SyncConfig = {
  // Token para acesso ao repositório privado lsc-pro-db
  token: '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',
  owner: 'claudiofiuza', 
  repo: 'lsc-pro-db',    
  path: 'database.json'
};

export const syncToCloud = async (data: any) => {
  const { token, owner, repo, path } = CLOUD_CONFIG;
  if (!token || owner === 'seu-usuario') return null;

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
  try {
    const getRes = await fetch(url, {
      headers: { 
        Authorization: `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
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
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: 'Sync: LSC Pro Database Update',
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

  // Adicionamos nocache para garantir que sempre pegamos a versão mais recente do banco de dados no boot
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?nocache=${Date.now()}`;
  
  try {
    const res = await fetch(url, {
      headers: { 
        Authorization: `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
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
