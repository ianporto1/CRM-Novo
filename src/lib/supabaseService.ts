import { supabase } from './supabase';
import { Contact, Message } from '../types';

/**
 * Buscar todos os contatos salvos no Supabase
 */
export async function getContactsFromSupabase(): Promise<Contact[]> {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Erro ao buscar contatos do Supabase:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      remoteJid: row.remote_jid || row.id,
      name: row.name,
      phone: row.phone,
      lastMessage: row.last_message || '',
      unread: row.unread || 0,
      profilePicUrl: row.profile_pic_url || undefined,
    }));
  } catch (err: any) {
    console.warn('Falha na integração com Supabase contacts:', err.message);
    return [];
  }
}

/**
 * Salvar ou atualizar um contato no Supabase
 */
export async function saveContactToSupabase(contact: Contact): Promise<void> {
  if (!contact || !contact.id) return;

  try {
    const remoteJid = contact.remoteJid || contact.id;
    const payload = {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      remote_jid: remoteJid,
      last_message: contact.lastMessage || null,
      unread: contact.unread || 0,
      profile_pic_url: contact.profilePicUrl || null,
      updated_at: new Date().toISOString(),
    };

    await supabase.from('contacts').upsert(payload, { onConflict: 'id' });
  } catch (err: any) {
    console.warn('Erro ao salvar contato no Supabase:', err.message);
  }
}

/**
 * Salvar lista de contatos no Supabase em lote
 */
export async function saveContactsToSupabase(contacts: Contact[]): Promise<void> {
  if (!contacts || contacts.length === 0) return;

  try {
    const payloads = contacts.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      remote_jid: c.remoteJid || c.id,
      last_message: c.lastMessage || null,
      unread: c.unread || 0,
      profile_pic_url: c.profilePicUrl || null,
      updated_at: new Date().toISOString(),
    }));

    await supabase.from('contacts').upsert(payloads, { onConflict: 'id' });
  } catch (err: any) {
    console.warn('Erro ao salvar lote de contatos no Supabase:', err.message);
  }
}

/**
 * Buscar histórico de mensagens de um contato no Supabase
 */
export async function getMessagesFromSupabase(remoteJid: string): Promise<Message[]> {
  if (!remoteJid) return [];

  try {
    const cleanJid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`remote_jid.eq.${remoteJid},remote_jid.eq.${cleanJid}`)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Erro ao buscar mensagens do Supabase:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      text: row.text,
      sender: row.sender as 'user' | 'contact' | 'agent',
      timestamp: row.timestamp,
      remoteJid: row.remote_jid,
      status: row.status || 'SENT',
    }));
  } catch (err: any) {
    console.warn('Falha ao buscar mensagens do Supabase:', err.message);
    return [];
  }
}

/**
 * Salvar uma mensagem no Supabase e atualizar a última mensagem do contato
 */
export async function saveMessageToSupabase(message: Message, contact?: Contact): Promise<void> {
  if (!message || !message.id) return;

  try {
    const remoteJid = message.remoteJid || (contact ? contact.remoteJid || contact.id : '');
    const contactId = contact ? contact.id : remoteJid;

    const payload = {
      id: message.id,
      contact_id: contactId || null,
      remote_jid: remoteJid,
      text: message.text,
      sender: message.sender,
      timestamp: message.timestamp,
      status: message.status || 'SENT',
      created_at: new Date().toISOString(),
    };

    await supabase.from('messages').upsert(payload, { onConflict: 'id' });

    // Atualizar a última mensagem no contato no Supabase
    if (contactId && message.text) {
      await supabase.from('contacts').upsert(
        {
          id: contactId,
          name: contact?.name || remoteJid.split('@')[0],
          phone: contact?.phone || remoteJid.split('@')[0],
          remote_jid: remoteJid,
          last_message: message.text,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    }
  } catch (err: any) {
    console.warn('Erro ao salvar mensagem no Supabase:', err.message);
  }
}

/**
 * Salvar lote de mensagens no Supabase
 */
export async function saveMessagesToSupabase(messages: Message[], contact?: Contact): Promise<void> {
  if (!messages || messages.length === 0) return;

  try {
    const payloads = messages.map((m) => ({
      id: m.id,
      contact_id: contact ? contact.id : m.remoteJid,
      remote_jid: m.remoteJid || (contact ? contact.remoteJid || contact.id : ''),
      text: m.text,
      sender: m.sender,
      timestamp: m.timestamp,
      status: m.status || 'SENT',
      created_at: new Date().toISOString(),
    }));

    await supabase.from('messages').upsert(payloads, { onConflict: 'id' });
  } catch (err: any) {
    console.warn('Erro ao salvar lote de mensagens no Supabase:', err.message);
  }
}
