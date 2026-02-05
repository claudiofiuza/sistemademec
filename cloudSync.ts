
import { CloudConfig } from './types';

// ==========================================
// URL DO GOOGLE DRIVE (APPS SCRIPT)
// ==========================================
const GLOBAL_GSHEETS_URL = "https://script.google.com/macros/s/AKfycbxWEq_7VvsF1kRl77ACpQBnRwYGTItuwPzYns1fjn_7h_algpTy-AAFJk4WWB3ZT34/exec"; 

export const saveCloudConfig = (config: CloudConfig) => {
  localStorage.setItem('lsc_cloud_config_v4', JSON.stringify(config));
};

export const getCloudConfig = (): CloudConfig => {
  const stored = localStorage.getItem('lsc_cloud_config_v4');
  if (stored) return JSON.parse(stored);
  
  if (GLOBAL_GSHEETS_URL) {
    return { provider: 'gsheets', gsheetsUrl: GLOBAL_GSHEETS_URL };
  }
  
  return { provider: 'none' };
};

export const syncToCloud = async (data: any) => {
  const config = getCloudConfig();
  const url = config.gsheetsUrl || GLOBAL_GSHEETS_URL;
  
  if (!url || config.provider === 'none') return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // Timeout agressivo de 3.5s

    // Usa 'no-cors' para Google Apps Script POST para evitar erros de pré-vôo CORS
    fetch(url, {
      method: 'POST',
      mode: 'no-cors', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal
    }).catch(() => {}); // Falha silenciosa

    clearTimeout(timeoutId);
    return true; 
  } catch (e) { 
    return false; 
  }
};

export const fetchFromCloud = async () => {
  const config = getCloudConfig();
  const url = config.gsheetsUrl || GLOBAL_GSHEETS_URL;
  
  if (!url || config.provider === 'none') return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Máximo 5s para buscar

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) return null;
    const data = await res.json();
    
    if (!data || Object.keys(data).length === 0 || !data.workshops) {
      return { _isNew: true };
    }
    return data;
  } catch (e) { 
    console.warn("Nuvem indisponível no momento.");
    return null; 
  }
};
