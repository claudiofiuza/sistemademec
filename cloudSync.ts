
import { CloudConfig } from './types';

export const saveCloudConfig = (config: CloudConfig) => {
  localStorage.setItem('lsc_cloud_config_v4', JSON.stringify(config));
};

export const getCloudConfig = (): CloudConfig => {
  const stored = localStorage.getItem('lsc_cloud_config_v4');
  return stored ? JSON.parse(stored) : { provider: 'none' };
};

export const syncToCloud = async (data: any) => {
  const config = getCloudConfig();
  
  if (config.provider === 'github' && config.githubToken) {
    const { githubToken, githubOwner, githubRepo } = config;
    const path = 'database.json';
    const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}`;
    
    try {
      const getRes = await fetch(url, {
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
      const putRes = await fetch(url, {
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

  if (config.provider === 'gsheets' && config.gsheetsUrl) {
    try {
      const res = await fetch(config.gsheetsUrl, {
        method: 'POST',
        mode: 'no-cors', // Google Apps Script requer redirecionamento
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return true; // no-cors não permite ler resposta, assumimos sucesso
    } catch (e) { return false; }
  }

  return false;
};

export const fetchFromCloud = async () => {
  const config = getCloudConfig();
  
  if (config.provider === 'github' && config.githubToken) {
    const { githubToken, githubOwner, githubRepo } = config;
    const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/database.json?nocache=${Date.now()}`;
    
    try {
      const res = await fetch(url, {
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

  if (config.provider === 'gsheets' && config.gsheetsUrl) {
    try {
      const res = await fetch(config.gsheetsUrl);
      const data = await res.json();
      return (data && Object.keys(data).length > 0) ? data : { _isNew: true };
    } catch (e) { return null; }
  }

  return null;
};
