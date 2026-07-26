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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const body = req.body || {};
    const event = body.event || body.type;

    // Verificar eventos de mensagem da Evolution API (MESSAGES_UPSERT, MESSAGES_UPDATE, SEND_MESSAGE)
    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT' || body.data?.key) {
      const data = body.data || body;
      const key = data.key || {};
      const remoteJid = key.remoteJid || data.remoteJid;

      if (remoteJid && !remoteJid.includes('@g.us')) { // Ignora grupos se desejar
        const isFromMe = key.fromMe ?? data.fromMe ?? false;
        const pushName = data.pushName || remoteJid.split('@')[0];
        const text = extractMessageText(data);
        const timestampMs = (data.messageTimestamp || Date.now() / 1000) * 1000;
        const timeStr = new Date(timestampMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const contactId = remoteJid;
        const phone = `+${remoteJid.split('@')[0]}`;

        // 1. Salvar ou atualizar o contato no Supabase
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

        // 2. Salvar a nova mensagem no Supabase
        const messageId = key.id || `msg_${Date.now()}`;
        await supabase.from('messages').upsert(
          {
            id: messageId,
            contact_id: contactId,
            remote_jid: remoteJid,
            text,
            sender: isFromMe ? 'user' : 'contact',
            timestamp: timeStr,
            status: 'RECEIVED',
            created_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      }
    }

    return res.status(200).json({ status: 'success', message: 'Webhook processado com sucesso' });
  } catch (err: any) {
    console.error('Erro ao processar Webhook da Evolution API:', err);
    return res.status(500).json({ error: err.message || 'Erro interno no servidor' });
  }
}
