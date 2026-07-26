export type TabType = 'dashboard' | 'conversas' | 'leads' | 'pipeline' | 'agente' | 'configuracoes';

export interface AILeadQualification {
  status: 'novo' | 'em_contato' | 'negociacao' | 'fechado' | 'perdido';
  estimatedValue: number;
  summary: string;
  suggestedNextAction: string;
  suggestedReply?: string;
  score: number; // 0-100
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  status: 'novo' | 'em_contato' | 'negociacao' | 'fechado' | 'perdido';
  source: string;
  value?: number;
  notes?: string;
  contactId?: string;
  remoteJid?: string;
  aiScore?: number;
  aiNextAction?: string;
  aiQualification?: AILeadQualification;
  createdAt: string;
  updatedAt?: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'contact' | 'agent';
  timestamp: string;
  remoteJid?: string;
  status?: 'PENDING' | 'SENT' | 'RECEIVED' | 'READ';
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  remoteJid?: string;
  lastMessage?: string;
  unread: number;
  profilePicUrl?: string;
}

export interface DashboardStats {
  totalLeads: number;
  totalMessages: number;
  conversionRate: number;
  totalPipelineValue: number;
  leadsByStatus: Record<string, number>;
  dailyInteractions: { name: string; leads: number; messages: number }[];
}

