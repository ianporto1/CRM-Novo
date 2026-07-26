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

/**
 * Função auxiliar para extrair o texto de um objeto de mensagem da Evolution API (v1 / v2 / Baileys)
 */
function extractMessageText(msg: any): string {
  if (!msg) return '';
  if (typeof msg === 'string') return msg;

  const messageObj = msg.message?.ephemeralMessage?.message || msg.message || msg;

  if (messageObj.conversation) return messageObj.conversation;
  if (messageObj.extendedTextMessage?.text) return messageObj.extendedTextMessage.text;
  if (messageObj.imageMessage?.caption) return messageObj.imageMessage.caption;
  if (messageObj.videoMessage?.caption) return messageObj.videoMessage.caption;
  if (messageObj.documentMessage?.caption) return messageObj.documentMessage.caption;
  if (messageObj.imageMessage) return '[📷 Imagem]';
  if (messageObj.videoMessage) return '[🎥 Vídeo]';
  if (messageObj.audioMessage) return '[🎵 Áudio]';
  if (messageObj.documentMessage) return '[📄 Documento]';
  if (messageObj.stickerMessage) return '[🎴 Figurinha]';
  if (messageObj.contactMessage || messageObj.contactsArrayMessage) return '[👤 Contato]';
  if (messageObj.locationMessage) return '[📍 Localização]';

  if (typeof msg.body === 'string') return msg.body;
  if (typeof msg.content === 'string') return msg.content;
  if (typeof msg.text === 'string') return msg.text;

  return '';
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
    
    let rawChatList: any[] = [];
    if (Array.isArray(data)) {
      rawChatList = data;
    } else if (Array.isArray(data.chats)) {
      rawChatList = data.chats;
    } else if (Array.isArray(data.chats?.records)) {
      rawChatList = data.chats.records;
    } else if (Array.isArray(data.records)) {
      rawChatList = data.records;
    } else if (Array.isArray(data.data)) {
      rawChatList = data.data;
    }

    const contacts: Contact[] = rawChatList.map((chat: any, idx: number) => {
      const jid = chat.id || chat.remoteJid || chat.key?.remoteJid || `chat_${idx}`;
      const name = chat.name || chat.pushName || chat.contact?.name || (jid.includes('@') ? jid.split('@')[0] : jid) || 'Contato';
      const phone = jid.includes('@') ? `+${jid.split('@')[0]}` : jid;
      const lastMsgText = extractMessageText(chat.lastMessage);

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
 * Função auxiliar interna para converter o JSON retornado pela Evolution API em objetos Message
 */
function parseEvolutionMessagesData(data: any, remoteJid: string): Message[] {
  let rawList: any[] = [];
  if (Array.isArray(data)) {
    rawList = data;
  } else if (Array.isArray(data.messages)) {
    rawList = data.messages;
  } else if (Array.isArray(data.messages?.records)) {
    rawList = data.messages.records;
  } else if (Array.isArray(data.records)) {
    rawList = data.records;
  } else if (Array.isArray(data.data)) {
    rawList = data.data;
  }

  if (rawList.length === 0) return [];

  const parsedMessages: { msg: Message; timestampMs: number }[] = rawList.map((msg: any, idx: number) => {
    const isFromMe = msg.key?.fromMe ?? msg.fromMe ?? (msg.sender === 'user');
    const text = extractMessageText(msg) || '[Mensagem recebida]';

    const rawTs = msg.messageTimestamp || msg.timestamp || msg.createdAt;
    let timestampMs = Date.now();
    if (typeof rawTs === 'number') {
      timestampMs = rawTs < 10000000000 ? rawTs * 1000 : rawTs;
    } else if (typeof rawTs === 'string' && !isNaN(Number(rawTs))) {
      const num = Number(rawTs);
      timestampMs = num < 10000000000 ? num * 1000 : num;
    } else if (rawTs) {
      timestampMs = new Date(rawTs).getTime() || Date.now();
    }

    const timeStr = new Date(timestampMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      timestampMs,
      msg: {
        id: msg.key?.id || msg.id || `msg_${idx}_${Date.now()}`,
        text,
        sender: isFromMe ? 'user' : 'contact',
        timestamp: timeStr,
        remoteJid,
        status: msg.status || 'SENT',
      },
    };
  });

  // Ordenar mensagens cronologicamente (do mais antigo para o mais novo)
  parsedMessages.sort((a, b) => a.timestampMs - b.timestampMs);
  return parsedMessages.map((item) => item.msg);
}

/**
 * Buscar histórico de mensagens de uma conversa específica com tratamento multi-payload e variações de JID
 */
export async function fetchMessages(remoteJid: string): Promise<{ messages: Message[]; error?: string }> {
  const { apiUrl, apiKey, instanceName, isConfigured } = getEvolutionConfig();

  if (!isConfigured) {
    return { messages: [], error: 'Evolution API não configurada.' };
  }

  // Variações de JID para garantir busca em qualquer padrão armazenado na API
  const cleanDigits = remoteJid.replace(/\D/g, '');
  const candidateJids: string[] = [remoteJid];

  if (!remoteJid.includes('@s.whatsapp.net') && cleanDigits) {
    candidateJids.push(`${cleanDigits}@s.whatsapp.net`);
    if (!cleanDigits.startsWith('55')) {
      candidateJids.push(`55${cleanDigits}@s.whatsapp.net`);
    }
  } else if (remoteJid.includes('@s.whatsapp.net') && cleanDigits) {
    if (!cleanDigits.startsWith('55')) {
      candidateJids.push(`55${cleanDigits}@s.whatsapp.net`);
    }
    candidateJids.push(cleanDigits);
  }

  try {
    // Tenta payloads de consulta em cascata para cada variação de JID
    for (const jid of candidateJids) {
      const payloadsToTry = [
        { where: { key: { remoteJid: jid } }, count: 50 },
        { where: { remoteJid: jid }, count: 50 },
        { remoteJid: jid, count: 50 },
      ];

      for (const payload of payloadsToTry) {
        const response = await fetch(`${apiUrl}/chat/findMessages/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          const parsedMsgs = parseEvolutionMessagesData(data, jid);
          if (parsedMsgs.length > 0) {
            return { messages: parsedMsgs };
          }
        }
      }
    }

    return { messages: [] };
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
