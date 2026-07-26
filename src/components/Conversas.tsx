import { useState, useEffect, useRef } from 'react';
import { Search, Send, Paperclip, MoreVertical, CheckCheck, RefreshCw, AlertCircle, MessageSquare, Database } from 'lucide-react';
import { Contact, Message } from '../types';
import { cn } from '../lib/utils';
import { 
  getEvolutionConfig, 
  fetchMessages, 
  sendTextMessage, 
  fetchInstanceStatus 
} from '../lib/evolution';
import { 
  getContactsFromSupabase, 
  saveContactToSupabase, 
  getMessagesFromSupabase, 
  saveMessageToSupabase, 
  saveMessagesToSupabase 
} from '../lib/supabaseService';

const WHATSAPP_PATTERN_BG = `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.06' fill-rule='evenodd'%3E%3Cpath d='M11 0l3 3-3 3-3-3 3-3zm28 0l3 3-3 3-3-3 3-3zm28 0l3 3-3 3-3-3 3-3zm-56 28l3 3-3 3-3-3 3-3zm28 0l3 3-3 3-3-3 3-3zm28 0l3 3-3 3-3-3 3-3zm-56 28l3 3-3 3-3-3 3-3zm28 0l3 3-3 3-3-3 3-3zm28 0l3 3-3 3-3-3 3-3z'/%3E%3C/g%3E%3C/svg%3E")`;

export function Conversas() {
  const [evolutionConfig] = useState(getEvolutionConfig());
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [isEvolutionConnected, setIsEvolutionConnected] = useState<boolean | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Polling de mensagens da conversa ativa a cada 5 segundos
  useEffect(() => {
    if (!activeContact) return;

    const interval = setInterval(() => {
      loadMessagesForContact(activeContact, true);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeContact, isEvolutionConnected]);

  const loadInitialData = async () => {
    setLoadingChats(true);
    setApiError(null);

    // 1. Carregar contatos estritamente do banco de dados Supabase (fonte da verdade)
    const dbContacts = await getContactsFromSupabase();

    // 2. Checar conexão da Evolution API
    if (evolutionConfig.isConfigured) {
      const status = await fetchInstanceStatus();
      setIsEvolutionConnected(status.state === 'open');
    } else {
      setIsEvolutionConnected(false);
    }

    setContacts(dbContacts || []);
    if (dbContacts && dbContacts.length > 0) {
      // Manter contato selecionado se já existir na lista
      if (!activeContact || !dbContacts.find((c) => c.id === activeContact.id)) {
        selectContact(dbContacts[0]);
      }
    } else {
      setActiveContact(null);
      setMessages([]);
    }

    setLoadingChats(false);
  };

  const selectContact = async (contact: Contact) => {
    setActiveContact(contact);
    await loadMessagesForContact(contact, false);
  };

  const loadMessagesForContact = async (contact: Contact, isSilent = false) => {
    if (!isSilent) setLoadingMessages(true);

    const targetJid = contact.remoteJid || contact.id;

    // 1. Carregar histórico salvo no Supabase
    const dbMsgs = await getMessagesFromSupabase(targetJid);
    let combinedMsgs: Message[] = [...dbMsgs];

    // 2. Se a Evolution API estiver conectada, carregar novas mensagens e sincronizar
    if (isEvolutionConnected && targetJid) {
      const { messages: apiMsgs } = await fetchMessages(targetJid);
      
      if (apiMsgs && apiMsgs.length > 0) {
        const msgMap = new Map<string, Message>();
        dbMsgs.forEach((m) => msgMap.set(m.id, m));
        apiMsgs.forEach((m) => msgMap.set(m.id, m));
        combinedMsgs = Array.from(msgMap.values());

        // Grava no Supabase apenas se houver contato válido
        saveMessagesToSupabase(apiMsgs, contact);
      }
    }

    setMessages(combinedMsgs);
    if (!isSilent) setLoadingMessages(false);
  };

  const handleSendMessage = async () => {
    if (!newMessageText.trim() || !activeContact || sending) return;

    const messageText = newMessageText.trim();
    setNewMessageText('');
    setSending(true);

    const tempId = `msg_${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const targetDestination = activeContact.remoteJid || activeContact.phone || activeContact.id;

    const newMsg: Message = {
      id: tempId,
      text: messageText,
      sender: 'user',
      timestamp: timeStr,
      remoteJid: targetDestination,
      status: 'PENDING',
    };

    setMessages((prev) => [...prev, newMsg]);

    // Grava imediatamente no Supabase
    await saveMessageToSupabase(newMsg, activeContact);

    if (isEvolutionConnected) {
      const result = await sendTextMessage(targetDestination, messageText);
      if (result.success) {
        const updatedMsg: Message = {
          ...newMsg,
          id: result.messageId || tempId,
          status: 'SENT',
        };
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? updatedMsg : msg))
        );
        saveMessageToSupabase(updatedMsg, activeContact);
      } else {
        setApiError(result.error || 'Falha ao enviar mensagem via Evolution API');
      }
    }

    // Atualiza contato no Supabase e na UI
    const updatedContact = { ...activeContact, lastMessage: messageText };
    setContacts((prev) =>
      prev.map((c) => (c.id === activeContact.id ? updatedContact : c))
    );
    saveContactToSupabase(updatedContact);

    setSending(false);
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* Sidebar de Contatos */}
      <div className="w-[340px] flex-shrink-0 border-r border-zinc-200 flex flex-col h-full bg-zinc-50/50">
        <div className="p-4 border-b border-zinc-200 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              Conversas
            </h2>
            <button
              onClick={loadInitialData}
              title="Atualizar Conversas"
              className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4", loadingChats && "animate-spin")} />
            </button>
          </div>

          {/* Status do Sistema */}
          <div className="flex flex-col gap-1.5">
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Fonte de Dados: Supabase</span>
            </div>

            {isEvolutionConnected === false && (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>WhatsApp Desconectado</span>
              </div>
            )}

            {isEvolutionConnected === true && (
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>Evolution API Conectada</span>
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar conversa..."
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Lista de Contatos */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
          {loadingChats ? (
            <div className="p-8 text-center text-zinc-400 text-sm flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
              Carregando conversas do Supabase...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-sm leading-relaxed">
              <p className="font-medium text-zinc-600 mb-1">Nenhuma conversa no Supabase</p>
              <p className="text-xs text-zinc-400">
                O banco de dados está limpo. Novas conversas serão salvas aqui conforme forem iniciadas.
              </p>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => selectContact(contact)}
                className={cn(
                  "w-full text-left p-4 transition-colors hover:bg-zinc-100 flex items-start gap-3 relative",
                  activeContact?.id === contact.id ? "bg-emerald-50/70 hover:bg-emerald-50/90 border-l-4 border-l-emerald-600" : ""
                )}
              >
                {contact.profilePicUrl ? (
                  <img 
                    src={contact.profilePicUrl} 
                    alt={contact.name} 
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-zinc-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-semibold shrink-0 flex items-center justify-center text-sm border border-emerald-200">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-medium text-zinc-900 truncate text-sm">{contact.name}</h3>
                    <span className="text-[10px] text-zinc-400">WhatsApp</span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{contact.lastMessage || 'Sem mensagens'}</p>
                </div>

                {contact.unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {contact.unread}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Área Principal do Chat */}
      {activeContact ? (
        <div 
          className="flex-1 flex flex-col h-full bg-[#f0f2f5]"
          style={{ backgroundImage: WHATSAPP_PATTERN_BG }}
        >
          {/* Header do Chat */}
          <div className="h-16 border-b border-zinc-200 bg-white shadow-sm flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-3">
              {activeContact.profilePicUrl ? (
                <img 
                  src={activeContact.profilePicUrl} 
                  alt={activeContact.name} 
                  className="w-10 h-10 rounded-full object-cover border border-zinc-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center justify-center text-sm border border-emerald-200">
                  {activeContact.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-medium text-zinc-900 text-sm">{activeContact.name}</h3>
                <p className="text-xs text-zinc-500 font-mono">{activeContact.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => loadMessagesForContact(activeContact, false)}
                title="Recarregar Mensagens"
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <RefreshCw className={cn("w-4 h-4", loadingMessages && "animate-spin")} />
              </button>
              <button className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mensagem de Erro da API */}
          {apiError && (
            <div className="p-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs text-center flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {loadingMessages ? (
              <div className="flex justify-center p-4">
                <span className="bg-white/80 backdrop-blur-sm text-zinc-600 text-xs px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 border border-zinc-200">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  Carregando mensagens do Supabase...
                </span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center p-8">
                <span className="bg-white/90 backdrop-blur-sm text-zinc-500 text-xs px-4 py-2 rounded-full shadow-sm border border-zinc-200">
                  Nenhuma mensagem salva para este contato. Digite e envie abaixo.
                </span>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[70%] rounded-xl px-4 py-2.5 text-sm shadow-sm relative group",
                        isUser
                          ? "bg-emerald-600 text-white rounded-tr-none"
                          : "bg-white text-zinc-800 rounded-tl-none border border-zinc-100"
                      )}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      <div
                        className={cn(
                          "flex items-center justify-end gap-1 mt-1 text-[10px]",
                          isUser ? "text-emerald-100" : "text-zinc-400"
                        )}
                      >
                        <span>{msg.timestamp}</span>
                        {isUser && <CheckCheck className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input de Mensagem */}
          <div className="p-4 bg-white border-t border-zinc-200 shadow-lg">
            <div className="max-w-4xl mx-auto flex items-end gap-2 bg-zinc-50 rounded-xl border border-zinc-200 p-2 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
              <button className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-200/50 shrink-0 transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>

              <textarea
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Digite sua mensagem (Pressione Enter para enviar)..."
                className="w-full bg-transparent resize-none outline-none text-sm text-zinc-800 py-2 min-h-[40px] max-h-[120px]"
                rows={1}
              />

              <button
                onClick={handleSendMessage}
                disabled={!newMessageText.trim() || sending}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 rounded-lg shrink-0 transition-all shadow-sm flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50 text-center p-8 space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-zinc-800">Suas Conversas do WhatsApp</h3>
          <p className="text-sm text-zinc-500 max-w-sm">
            Selecione uma conversa para visualizar as mensagens salvas no Supabase e enviar mensagens pelo WhatsApp.
          </p>
        </div>
      )}
    </div>
  );
}
