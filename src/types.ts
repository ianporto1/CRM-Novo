export type TabType = 'dashboard' | 'conversas' | 'leads' | 'pipeline' | 'agente' | 'configuracoes';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  status: 'novo' | 'em_contato' | 'negociacao' | 'fechado' | 'perdido';
  source: string;
  createdAt: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'contact' | 'agent';
  timestamp: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage?: string;
  unread: number;
}
