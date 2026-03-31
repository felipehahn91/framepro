export const getEvolutionConfig = () => {
  const url = localStorage.getItem('evo_api_url')?.replace(/\/$/, ''); 
  const key = localStorage.getItem('evo_api_key');
  return { url, key };
};

export const fetchWithEvolution = async (endpoint: string, options: RequestInit = {}) => {
  const { url, key } = getEvolutionConfig();
  if (!url || !key) throw new Error("Evolution API não configurada.");

  const response = await fetch(`${url}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Erro na API: ${response.status}`);
  }
  return response.json();
};

export const createInstance = (instanceName: string) => {
  const webhookUrl = "https://wsytmrzgvkvbufpqqxwi.supabase.co/functions/v1/evolution-webhook";
  
  return fetchWithEvolution('/instance/create', {
    method: 'POST',
    body: JSON.stringify({ 
      instanceName, 
      qrcode: true, 
      integration: 'WHATSAPP-BAILEYS',
      syncFullHistory: true,
      webhook: {
        enabled: true,
        url: webhookUrl,
        byEvents: false,
        base64: false,
        events: ["MESSAGES_UPSERT", "MESSAGES_SET", "SEND_MESSAGE"]
      }
    })
  });
};

export const setEvolutionWebhook = async (instanceName: string) => {
  const webhookUrl = "https://wsytmrzgvkvbufpqqxwi.supabase.co/functions/v1/evolution-webhook";
  
  try {
    return await fetchWithEvolution(`/webhook/set/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ 
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: false,
          events: ["MESSAGES_UPSERT", "MESSAGES_SET", "SEND_MESSAGE"]
        }
      })
    });
  } catch (error) {
    console.warn("Falha no payload V2, tentando V1/Flat...", error);
    return await fetchWithEvolution(`/webhook/set/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ 
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        byEvents: false,
        base64: false,
        events: ["MESSAGES_UPSERT", "MESSAGES_SET", "SEND_MESSAGE"]
      })
    });
  }
};

export const getConnectionState = (instanceName: string) => fetchWithEvolution(`/instance/connectionState/${instanceName}`, { method: 'GET' });
export const connectInstance = (instanceName: string) => fetchWithEvolution(`/instance/connect/${instanceName}`, { method: 'GET' });
export const logoutInstance = (instanceName: string) => fetchWithEvolution(`/instance/logout/${instanceName}`, { method: 'DELETE' });
export const deleteInstance = (instanceName: string) => fetchWithEvolution(`/instance/delete/${instanceName}`, { method: 'DELETE' });

export const fetchChats = (instanceName: string) => fetchWithEvolution(`/chat/findChats/${instanceName}`, { method: 'POST', body: JSON.stringify({}) });
export const fetchMessages = (instanceName: string, remoteJid: string) => fetchWithEvolution(`/chat/findMessages/${instanceName}`, { method: 'POST', body: JSON.stringify({ where: { remoteJid } }) });

export const sendTextMessage = (instanceName: string, number: string, text: string) => {
  // Limpa o sufixo @s.whatsapp.net para garantir que a API não recuse por formatação de número inválida
  const cleanNumber = number.split('@')[0];
  
  return fetchWithEvolution(`/message/sendText/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({ 
      number: cleanNumber, 
      text: text, // Evolution espera "text" na raiz, não dentro de textMessage
      options: { delay: 0 } 
    })
  });
};