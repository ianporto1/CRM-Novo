import { Contact, Message } from '../types';

export interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  isConfigured: boolean;
}

export interface InstanceConnectionState {
  state: 'open' | 'close' | 'connecting' | 'unknown';
  ownerJid?: string;
  profileName?: string;
  profilePictureUrl?: string;
  error?: string;
}

export interface QrCodeResponse {
  base64?: string;
  code?: string;
  pairingCode?: string;
  state?: string;
  error?: string;
}

export function getEvolutionConfig(): EvolutionConfig {
  const apiUrl = (import.meta.env.VITE_EVOLUTION_API_URL || '').replace(/\/$/, '');
  const apiKey = import.meta.env.VITE_EVOLUTION_API_KEY || '';
  const instanceName = import.meta.env.VITE_EVOLUTION_INSTANCE_NAME || '';

  return {
    apiUrl,
    apiKey,
    instanceName,
    isConfigured: Boolean(apiUrl && apiKey && instanceName),
  };
}

export async function fetchInstanceStatus(): Promise<InstanceConnectionState> {
  const { apiUrl, apiKey, instanceName, isConfigured } = getEvolutionConfig();

  if (!isConfigured) {
    return {
      state: 'unknown',
      error: 'Variáveis de ambiente VITE_EVOLUTION_* não configuradas na Vercel.',
    };
  }

  try {
    const response = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { state: 'close', error: 'Instância não encontrada na Evolution API.' };
      }
      return { state: 'unknown', error: `Erro HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    
    // Suporte para formatos Evolution API v1 e v2
    const instanceState = data.instance?.state || data.state || 'close';
    const ownerJid = data.instance?.ownerJid || data.ownerJid;
    const profileName = data.instance?.profileName || data.profileName;
    const profilePictureUrl = data.instance?.profilePictureUrl || data.profilePictureUrl;

    return {
      state: instanceState === 'open' ? 'open' : instanceState === 'connecting' ? 'connecting' : 'close',
      ownerJid,
      profileName,
      profilePictureUrl,
    };
  } catch (err: any) {
    return {
      state: 'unknown',
      error: err.message || 'Falha ao conectar com o servidor da Evolution API.',
    };
  }
}

export async function fetchQrCode(): Promise<QrCodeResponse> {
  const { apiUrl, apiKey, instanceName, isConfigured } = getEvolutionConfig();

  if (!isConfigured) {
    return { error: 'Variáveis da Evolution API não encontradas.' };
  }

  try {
    const response = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
    });

    if (!response.ok) {
      return { error: `Erro HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();

    const base64 = data.base64 || data.qrcode?.base64 || data.code;
    const pairingCode = data.pairingCode || data.qrcode?.pairingCode;

    if (data.instance?.state === 'open' || data.state === 'open') {
      return { state: 'open' };
    }

    return {
      base64,
      pairingCode,
      code: data.code,
      state: data.state || 'close',
    };
  } catch (err: any) {
    return { error: err.message || 'Erro ao obter QR Code da Evolution API.' };
  }
}

export async function logoutInstance(): Promise<{ success: boolean; error?: string }> {
  const { apiUrl, apiKey, instanceName, isConfigured } = getEvolutionConfig();

  if (!isConfigured) {
    return { success: false, error: 'Variáveis da Evolution API não foram configuradas.' };
  }

  try {
    const response = await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
    });

    if (!response.ok) {
      return { success: false, error: `Erro ao desconectar (${response.status})` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro de rede ao solicitar logout.' };
  }
}

/**
 * Buscar lista de conversas da instância Evolution API
 */
export async function fetchChats(): Promise<{ contacts: Contact[]; error?: string }> {
  const { apiUrl, apiKey, instanceName, isConfigured } = getEvolutionConfig();

  if (!isConfigured) {
    return { contacts: [], error: 'Evolution API não configurada.' };
  }

  try {
    // Tenta primeiro GET /chat/findChats, fallback POST /chat/findChats
    let response = await fetch(`${apiUrl}/chat/findChats/${instanceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
    });

    if (!response.ok) {
      response = await fetch(`${apiUrl}/chat/findChats/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
        },
        body: JSON.stringify({}),
      });
    }

    if (!response.ok) {
      return { contacts: [], error: `Erro ao buscar conversas (${response.status})` };
    }

    const data = await response.json();
    const chatList = Array.isArray(data) ? data : data.chats || data.records || [];

    const contacts: Contact[] = chatList.map((chat: any, idx: number) => {
      const jid = chat.id || chat.remoteJid || chat.key?.remoteJid || `chat_${idx}`;
      const name = chat.name || chat.pushName || chat.contact?.name || jid.split('@')[0] || 'Contato';
      const phone = jid.includes('@') ? `+${jid.split('@')[0]}` : jid;
      const lastMsgText = typeof chat.lastMessage === 'string' 
        ? chat.lastMessage 
        : chat.lastMessage?.message?.conversation || chat.lastMessage?.message?.extendedTextMessage?.text || '';

      return {
        id: jid,
        remoteJid: jid,
        name,
        phone,
        lastMessage: lastMsgText,
        unread: chat.unreadCount || 0,
        profilePicUrl: chat.profilePicUrl || chat.profilePictureUrl || undefined,
      };
    });

    return { contacts };
  } catch (err: any) {
    return { contacts: [], error: err.message || 'Erro ao buscar conversas da Evolution API.' };
  }
}

/**
 * Buscar histórico de mensagens de uma conversa específica
 */
export async function fetchMessages(remoteJid: string): Promise<{ messages: Message[]; error?: string }> {
  const { apiUrl, apiKey, instanceName, isConfigured } = getEvolutionConfig();

  if (!isConfigured) {
    return { messages: [], error: 'Evolution API não configurada.' };
  }

  try {
    const response = await fetch(`${apiUrl}/chat/findMessages/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        where: {
          key: {
            remoteJid,
          },
        },
        count: 50,
      }),
    });

    if (!response.ok) {
      return { messages: [], error: `Erro ao carregar histórico (${response.status})` };
    }

    const data = await response.json();
    const msgList = Array.isArray(data) ? data : data.messages || data.records || [];

    const messages: Message[] = msgList.map((msg: any, idx: number) => {
      const isFromMe = msg.key?.fromMe ?? msg.fromMe ?? false;
      const text = msg.message?.conversation 
        || msg.message?.extendedTextMessage?.text 
        || msg.body 
        || msg.content 
        || '[Mensagem de mídia/sistema]';
      
      const timestampMs = (msg.messageTimestamp || msg.timestamp) 
        ? (Number(msg.messageTimestamp || msg.timestamp) * (msg.messageTimestamp < 10000000000 ? 1000 : 1)) 
        : Date.now();

      const timeStr = new Date(timestampMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return {
        id: msg.key?.id || msg.id || `msg_${idx}`,
        text,
        sender: isFromMe ? 'user' : 'contact',
        timestamp: timeStr,
        remoteJid,
        status: msg.status || 'SENT',
      };
    });

    // Ordenar cronologicamente
    return { messages };
  } catch (err: any) {
    return { messages: [], error: err.message || 'Erro ao carregar mensagens.' };
  }
}

/**
 * Enviar mensagem de texto via Evolution API
 */
export async function sendTextMessage(
  remoteJidOrNumber: string, 
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { apiUrl, apiKey, instanceName, isConfigured } = getEvolutionConfig();

  if (!isConfigured) {
    return { success: false, error: 'Evolution API não configurada nas variáveis da Vercel.' };
  }

  // Formatando número para a Evolution API (remover sufixos se for jid completo)
  const number = remoteJidOrNumber.includes('@') 
    ? remoteJidOrNumber.split('@')[0] 
    : remoteJidOrNumber.replace(/\D/g, '');

  try {
    const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number,
        text,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { success: false, error: errData.message || `Erro de envio HTTP ${response.status}` };
    }

    const data = await response.json();
    const messageId = data.key?.id || data.id;

    return { success: true, messageId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro de rede ao enviar mensagem.' };
  }
}
