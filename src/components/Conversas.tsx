import { useState } from 'react';
import { Search, Send, Paperclip, MoreVertical, CheckCheck } from 'lucide-react';
import { Contact, Message } from '../types';
import { cn } from '../lib/utils';

const MOCK_CONTACTS: Contact[] = [
  { id: '1', name: 'Maria Silva', phone: '+55 11 99999-1111', lastMessage: 'Olá, gostaria de saber mais sobre o produto.', unread: 2 },
  { id: '2', name: 'João Santos', phone: '+55 11 98888-2222', lastMessage: 'Perfeito, vou enviar o comprovante.', unread: 0 },
  { id: '3', name: 'Ana Oliveira', phone: '+55 11 97777-3333', lastMessage: 'Qual o valor do frete?', unread: 1 },
];

const MOCK_MESSAGES: Message[] = [
  { id: 'm1', text: 'Bom dia! Tudo bem?', sender: 'contact', timestamp: '10:00' },
  { id: 'm2', text: 'Bom dia, Maria! Tudo ótimo. Como posso te ajudar hoje?', sender: 'user', timestamp: '10:02' },
  { id: 'm3', text: 'Olá, gostaria de saber mais sobre o produto que vi no Instagram.', sender: 'contact', timestamp: '10:05' },
];

export function Conversas() {
  const [activeContact, setActiveContact] = useState<Contact | null>(MOCK_CONTACTS[0]);
  const [newMessage, setNewMessage] = useState('');

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* Sidebar de Contatos */}
      <div className="w-[320px] flex-shrink-0 border-r border-zinc-200 flex flex-col h-full bg-zinc-50/30">
        <div className="p-4 border-b border-zinc-200">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">Conversas</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Buscar contato..." 
              className="w-full bg-white border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {MOCK_CONTACTS.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setActiveContact(contact)}
              className={cn(
                "w-full text-left p-4 border-b border-zinc-100 transition-colors hover:bg-zinc-50 flex items-start gap-3",
                activeContact?.id === contact.id ? "bg-emerald-50/50" : ""
              )}
            >
              <div className="w-10 h-10 rounded-full bg-zinc-200 flex-shrink-0 flex items-center justify-center font-medium text-zinc-600">
                {contact.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-medium text-zinc-900 truncate text-sm">{contact.name}</h3>
                  <span className="text-[10px] text-zinc-400">10:05</span>
                </div>
                <p className="text-xs text-zinc-500 truncate">{contact.lastMessage}</p>
              </div>
              {contact.unread > 0 && (
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                  {contact.unread}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Área Principal de Chat */}
      {activeContact ? (
        <div className="flex-1 flex flex-col h-full bg-[url('https://i.imgur.com/kFmdPT2.png')] bg-repeat bg-[length:300px]">
          {/* Header do Chat */}
          <div className="h-16 border-b border-zinc-200 bg-white/95 backdrop-blur-sm flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center font-medium text-zinc-600">
                {activeContact.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-medium text-zinc-900">{activeContact.name}</h3>
                <p className="text-xs text-zinc-500">{activeContact.phone}</p>
              </div>
            </div>
            <button className="text-zinc-400 hover:text-zinc-600">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {MOCK_MESSAGES.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                  <div 
                    className={cn(
                      "max-w-[70%] rounded-xl px-4 py-2 text-sm shadow-sm",
                      isUser 
                        ? "bg-emerald-500 text-white rounded-tr-sm" 
                        : "bg-white text-zinc-800 rounded-tl-sm border border-zinc-100"
                    )}
                  >
                    <p>{msg.text}</p>
                    <div className={cn(
                      "flex items-center justify-end gap-1 mt-1",
                      isUser ? "text-emerald-100" : "text-zinc-400"
                    )}>
                      <span className="text-[10px]">{msg.timestamp}</span>
                      {isUser && <CheckCheck className="w-3 h-3" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input de Mensagem */}
          <div className="p-4 bg-white/95 backdrop-blur-sm border-t border-zinc-200">
            <div className="max-w-4xl mx-auto flex items-end gap-2 bg-zinc-50 rounded-xl border border-zinc-200 p-2 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
              <button className="p-2 text-zinc-400 hover:text-zinc-600 shrink-0">
                <Paperclip className="w-5 h-5" />
              </button>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite uma mensagem..."
                className="w-full bg-transparent resize-none outline-none text-sm text-zinc-800 py-2 min-h-[40px] max-h-[120px]"
                rows={1}
              />
              <button className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg shrink-0 transition-colors">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-zinc-50">
          <p className="text-zinc-400">Selecione uma conversa para iniciar.</p>
        </div>
      )}
    </div>
  );
}
