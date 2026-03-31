export const getEvolutionConfig = () => {
  // Remove a barra final da URL caso exista para evitar erros de rota
  const url = localStorage.getItem('evo_api_url')?.replace(/\/$/, ''); 
  const key = localStorage.getItem('evo_api_key');
  return { url, key };
};

export const fetchWithEvolution = async (endpoint: string, options: RequestInit = {}) => {
  const { url, key } = getEvolutionConfig();
  
  if (!url || !key) {
    throw new Error("Evolution API não configurada. Entre em contato com o administrador.");
  }

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

export const createInstance = (instanceName: string) => 
  fetchWithEvolution('/instance/create', {
    method: 'POST',
    body: JSON.stringify({ 
      instanceName, 
      qrcode: true, 
      integration: 'WHATSAPP-BAILEYS',
      syncFullHistory: true // Força a Evolution a puxar as mensagens antigas do celular
    })
  });

export const getConnectionState = (instanceName: string) => 
  fetchWithEvolution(`/instance/connectionState/${instanceName}`, { method: 'GET' });

export const connectInstance = (instanceName: string) => 
  fetchWithEvolution(`/instance/connect/${instanceName}`, { method: 'GET' });

export const logoutInstance = (instanceName: string) => 
  fetchWithEvolution(`/instance/logout/${instanceName}`, { method: 'DELETE' });

export const deleteInstance = (instanceName: string) => 
  fetchWithEvolution(`/instance/delete/${instanceName}`, { method: 'DELETE' });

// ==========================================
// CHAT & MENSAGENS
// ==========================================

export const fetchChats = (instanceName: string) => 
  fetchWithEvolution(`/chat/findChats/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({}) // Dependendo da versão, aceita corpo vazio para trazer todos
  });

export const fetchMessages = (instanceName: string, remoteJid: string) => 
  fetchWithEvolution(`/chat/findMessages/${instanceName}`, {
    method: 'POST',
    // Enviamos tanto na raiz quanto no where para cobrir diferentes versões da Evolution
    body: JSON.stringify({ remoteJid, where: { remoteJid } })
  });

export const sendTextMessage = (instanceName: string, number: string, text: string) => 
  fetchWithEvolution(`/message/sendText/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({ 
      number, 
      options: { delay: 0 }, 
      textMessage: { text } 
    })
  });