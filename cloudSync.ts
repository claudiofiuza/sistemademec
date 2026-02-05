
import { CloudConfig } from './types';

// ==========================================
// COLE A URL DO SEU GOOGLE APPS SCRIPT AQUI:
// ==========================================
const GLOBAL_GSHEETS_URL = "https://script.google.com/macros/s/AKfycbxWEq_7VvsF1kRl77ACpQBnRwYGTltuwPzYns1fjn_7h_aIgpTy-AAFJk4WWB3ZT34/exec"; 

export const saveCloudConfig = (config: CloudConfig) => {
  localStorage.setItem('lsc_cloud_config_v4', JSON.stringify(config));
};

export const getCloudConfig = (): CloudConfig => {
  const stored = localStorage.getItem('lsc_cloud_config_v4');
  if (stored) return JSON.parse(stored);
  
  // Se não houver config local mas houver a URL global, usamos a global automaticamente
  if (GLOBAL_GSHEETS_URL) {
    return { provider: 'gsheets', gsheetsUrl: GLOBAL_GSHEETS_URL };
  }
  
  return { provider: 'none' };
};

export const syncToCloud = async (data: any) => {
  const config = getCloudConfig();
  const url = config.gsheetsUrl || GLOBAL_GSHEETS_URL;
  
  if (config.provider === 'github' && config.githubToken) {
    const { githubToken, githubOwner, githubRepo } = config;
    const path = 'database.json';
    const targetUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}`;
    
    try {
      const getRes = await fetch(targetUrl, {
        headers: { 
          'Authorization': `Bearer ${githubToken}`,
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
      const putRes = await fetch(targetUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Update: ${new Date().toLocaleString()}`,
          content,
          sha: sha || undefined
        })
      });
      return putRes.ok;
    } catch (e) { return false; }
  }

  if ((config.provider === 'gsheets' || GLOBAL_GSHEETS_URL) && url) {
    try {
      // Usando POST para enviar os dados
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return true; 
    } catch (e) { 
      console.error("Erro ao sincronizar com Google Drive:", e);
      return false; 
    }
  }

  return false;
};

export const fetchFromCloud = async () => {
  const config = getCloudConfig();
  const url = config.gsheetsUrl || GLOBAL_GSHEETS_URL;
  
  if (config.provider === 'github' && config.githubToken) {
    const { githubToken, githubOwner, githubRepo } = config;
    const targetUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/database.json?nocache=${Date.now()}`;
    
    try {
      const res = await fetch(targetUrl, {
        headers: { 
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Cache-Control': 'no-cache'
        }
      });
      if (res.status === 404) return { _isNew: true };
      if (!res.ok) return null;
      const fileData = await res.json();
      const content = decodeURIComponent(escape(atob(fileData.content.replace(/\s/g, ''))));
      return JSON.parse(content);
    } catch (e) { return null; }
  }

  if ((config.provider === 'gsheets' || GLOBAL_GSHEETS_URL) && url) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      // Se o retorno for um objeto vazio ou não tiver workshops, tratamos como novo
      if (!data || Object.keys(data).length === 0 || !data.workshops) {
        return { _isNew: true };
      }
      return data;
    } catch (e) { 
      console.error("Erro ao buscar do Google Drive:", e);
      return null; 
    }
  }

  return null;
};
