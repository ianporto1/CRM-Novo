import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://vhjqpbydrilvyzvcwnmy.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_mM8TACXjqMLXtmXcIkbQLQ_4kEhCjGg';

const supabase = createClient(supabaseUrl, supabaseKey);

function extractMessageText(msgPayload: any): string {
  if (!msgPayload) return '';
  const message = msgPayload.message?.ephemeralMessage?.message || msgPayload.message || msgPayload;

  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  if (message.documentMessage?.caption) return message.documentMessage.caption;
  if (message.imageMessage) return '[📷 Imagem]';
  if (message.videoMessage) return '[🎥 Vídeo]';
  if (message.audioMessage) return '[🎵 Áudio]';
  if (message.documentMessage) return '[📄 Documento]';
  if (message.stickerMessage) return '[🎴 Figurinha]';
  
  return msgPayload.body || msgPayload.text || '';
}

export default async function handler(req: any, res: any) {
  // Permitir chamadas OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // manteve body como texto se falhar no parse
      }
    }

    body = body || {};

    // Extrair eventos ou itens de mensagem
    let messageItems: any[] = [];

    if (Array.isArray(body)) {
      messageItems = body;
    } else if (Array.isArray(body.data)) {
      messageItems = body.data;
    } else if (body.data && typeof body.data === 'object') {
      messageItems = [body.data];
    } else if (body.key) {
      messageItems = [body];
    } else if (body.message) {
      messageItems = [body];
    }

    for (const item of messageItems) {
      const key = item.key || item.message?.key || {};
      const remoteJid = key.remoteJid || item.remoteJid || item.jid;

      if (remoteJid && !remoteJid.includes('@g.us') && !remoteJid.includes('@newsletter')) {
        const isFromMe = key.fromMe ?? item.fromMe ?? false;
        const pushName = item.pushName || item.senderName || remoteJid.split('@')[0];
        const text = extractMessageText(item) || '[Nova mensagem]';
        
        let rawTs = item.messageTimestamp || item.timestamp || Date.now() / 1000;
        let timestampMs = Date.now();
        if (typeof rawTs === 'number') {
          timestampMs = rawTs < 10000000000 ? rawTs * 1000 : rawTs;
        } else if (typeof rawTs === 'string' && !isNaN(Number(rawTs))) {
          const num = Number(rawTs);
          timestampMs = num < 10000000000 ? num * 1000 : num;
        }

        const timeStr = new Date(timestampMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const contactId = remoteJid;
        const phone = `+${remoteJid.split('@')[0]}`;

        // 1. Gravar/atualizar contato no Supabase
        await supabase.from('contacts').upsert(
          {
            id: contactId,
            name: pushName,
            phone,
            remote_jid: remoteJid,
            last_message: text,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        // 2. Gravar mensagem recebida/enviada no Supabase
        const messageId = key.id || item.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await supabase.from('messages').upsert(
          {
            id: messageId,
            contact_id: contactId,
            remote_jid: remoteJid,
            text,
            sender: isFromMe ? 'user' : 'contact',
            timestamp: timeStr,
            status: isFromMe ? 'SENT' : 'RECEIVED',
            created_at: new Date(timestampMs).toISOString(),
          },
          { onConflict: 'id' }
        );
      }
    }

    return res.status(200).json({ status: 'success', message: 'Webhook processado e salvo no Supabase' });
  } catch (err: any) {
    console.error('Erro ao processar Webhook da Evolution API:', err);
    return res.status(500).json({ error: err.message || 'Erro interno no servidor' });
  }
}
