import { Message, Lead, AILeadQualification, Contact } from '../types';
import { 
  saveLeadToSupabase, 
  getLeadsFromSupabase, 
  saveMessageToSupabase,
  getSettingFromSupabase,
  saveSettingToSupabase 
} from './supabaseService';
import { sendTextMessage } from './evolution';

export interface GroqConfig {
  apiKey: string;
  model: string;
  systemPrompt: string;
  isActive: boolean;
  autoReplyEnabled: boolean;
}

export const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Recomendado - Mais Inteligente)', provider: 'Meta' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Ultra Rápido)', provider: 'Meta' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Contexto Longo)', provider: 'Mistral' },
];

export const DEFAULT_GROQ_SYSTEM_PROMPT = `Você é um agente de vendas e atendimento de elite para a empresa. Sua função é conduzir ativamente a conversa com o cliente no WhatsApp para tirar dúvidas, agendar reuniões, apresentar soluções e qualificar o Lead no Pipeline.

Com base na conversa fornecida, retorne estritamente um JSON com a seguinte estrutura:
{
  "status": "novo" | "em_contato" | "negociacao" | "fechado" | "perdido",
  "estimatedValue": número (valor estimado do contrato/produto em R$, ex: 2500, ou 0 se não especificado),
  "summary": "resumo conciso de 1 a 2 frases com o diagnóstico do interesse do cliente",
  "suggestedNextAction": "próxima ação recomendada para a equipe de vendas",
  "suggestedReply": "resposta direta, amigável e persuasiva para ser ENVIADA AO CLIENTE no WhatsApp no papel de atendente",
  "score": número entre 0 e 100 (pontuação da temperatura do lead: 0-30 frio, 31-70 morno, 71-100 quente)
}

Regras de Condução:
1. Responda o cliente de forma empática, profissional e objetiva em "suggestedReply".
2. Se o cliente perguntar preços ou serviços, explique e procure avançar para fechamento ou agendamento.
3. Se o cliente demonstrar insatisfação grave ou pedir atendente humano, informe que está transferindo.

Importante: Responda APENAS com o JSON válido.`;

// Purga de segurança para remover qualquer chave herdada salva em localStorage no navegador
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('groq_api_key');
  }
} catch {
  // Ignore
}

// Configuração em memória para sessão ativa
let memoryGroqConfig: GroqConfig = {
  apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
  model: typeof localStorage !== 'undefined' ? localStorage.getItem('groq_model') || 'llama-3.3-70b-versatile' : 'llama-3.3-70b-versatile',
  systemPrompt: typeof localStorage !== 'undefined' ? localStorage.getItem('groq_system_prompt') || DEFAULT_GROQ_SYSTEM_PROMPT : DEFAULT_GROQ_SYSTEM_PROMPT,
  isActive: typeof localStorage !== 'undefined' ? localStorage.getItem('groq_agent_active') !== 'false' : true,
  autoReplyEnabled: typeof localStorage !== 'undefined' ? localStorage.getItem('groq_auto_reply_enabled') === 'true' : false,
};

/**
 * Obter configurações atuais em memória do Groq
 */
export function getGroqConfig(): GroqConfig {
  return { ...memoryGroqConfig };
}

/**
 * Carregar configurações do Groq atualizadas com segurança do Supabase (sem salvar no localStorage)
 */
export async function fetchGroqConfigFromSupabase(): Promise<GroqConfig> {
  const dbConfig = await getSettingFromSupabase<Partial<GroqConfig>>('groq_config', {});

  memoryGroqConfig = {
    apiKey: dbConfig.apiKey || memoryGroqConfig.apiKey || import.meta.env.VITE_GROQ_API_KEY || '',
    model: dbConfig.model || memoryGroqConfig.model,
    systemPrompt: dbConfig.systemPrompt || memoryGroqConfig.systemPrompt,
    isActive: dbConfig.isActive !== undefined ? dbConfig.isActive : memoryGroqConfig.isActive,
    autoReplyEnabled: dbConfig.autoReplyEnabled !== undefined ? dbConfig.autoReplyEnabled : memoryGroqConfig.autoReplyEnabled,
  };

  // Garante que a chave NUNCA é gravada no localStorage
  saveGroqConfigLocal(memoryGroqConfig);
  return { ...memoryGroqConfig };
}

function saveGroqConfigLocal(config: Partial<GroqConfig>): void {
  // NUNCA salvar config.apiKey no localStorage!
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('groq_api_key');
    if (config.model !== undefined) localStorage.setItem('groq_model', config.model);
    if (config.systemPrompt !== undefined) localStorage.setItem('groq_system_prompt', config.systemPrompt);
    if (config.isActive !== undefined) localStorage.setItem('groq_agent_active', String(config.isActive));
    if (config.autoReplyEnabled !== undefined) localStorage.setItem('groq_auto_reply_enabled', String(config.autoReplyEnabled));
  }
}

/**
 * Salvar configurações da API Groq com segurança no banco de dados Supabase
 */
export async function saveGroqConfig(config: Partial<GroqConfig>): Promise<void> {
  if (config.apiKey !== undefined) {
    memoryGroqConfig.apiKey = config.apiKey;
  }
  if (config.model !== undefined) memoryGroqConfig.model = config.model;
  if (config.systemPrompt !== undefined) memoryGroqConfig.systemPrompt = config.systemPrompt;
  if (config.isActive !== undefined) memoryGroqConfig.isActive = config.isActive;
  if (config.autoReplyEnabled !== undefined) memoryGroqConfig.autoReplyEnabled = config.autoReplyEnabled;

  saveGroqConfigLocal(memoryGroqConfig);

  // Persistir diretamente na tabela `settings` no Supabase
  await saveSettingToSupabase('groq_config', memoryGroqConfig);
}

/**
 * Enviar requisição para a API do Groq e retornar a qualificação do Lead em formato JSON
 */
export async function analyzeConversationAndQualifyLead(
  contactName: string,
  contactPhone: string,
  messages: Message[],
  customPrompt?: string
): Promise<{ success: boolean; qualification?: AILeadQualification; rawResponse?: string; error?: string }> {
  const { apiKey, model, systemPrompt } = getGroqConfig();

  if (!apiKey) {
    return {
      success: false,
      error: 'Chave da API do Groq (VITE_GROQ_API_KEY) não configurada. Insira sua API Key no menu do Agente de I.A.',
    };
  }

  if (!messages || messages.length === 0) {
    return {
      success: false,
      error: 'Nenhuma mensagem encontrada para analisar nesta conversa.',
    };
  }

  // Formatar histórico de mensagens
  const formattedChatHistory = messages
    .map((m) => `[${m.timestamp}] ${m.sender === 'user' ? 'Atendente/Vendedor' : contactName || 'Cliente'}: ${m.text}`)
    .join('\n');

  const promptToUse = customPrompt || systemPrompt;

  const userContent = `Contato: ${contactName} (${contactPhone})\n\nHistórico da Conversa no WhatsApp:\n${formattedChatHistory}\n\nPor favor, analise a conversa acima e qualifique este lead.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: promptToUse },
          { role: 'user', content: userContent },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errData.error?.message || `Erro na API do Groq (Status HTTP ${response.status})`,
      };
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      // Fallback em caso de JSON envelopado em blocos de código
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedJson = JSON.parse(jsonMatch[0]);
      } else {
        return { success: false, error: 'Falha ao interpretar a resposta JSON do Groq.', rawResponse: rawContent };
      }
    }

    const validStatuses: Lead['status'][] = ['novo', 'em_contato', 'negociacao', 'fechado', 'perdido'];
    const status: Lead['status'] = validStatuses.includes(parsedJson.status) ? parsedJson.status : 'em_contato';
    const estimatedValue = typeof parsedJson.estimatedValue === 'number' ? parsedJson.estimatedValue : 0;
    const summary = parsedJson.summary || 'Análise efetuada com sucesso via Groq AI.';
    const suggestedNextAction = parsedJson.suggestedNextAction || 'Acompanhar interação.';
    const suggestedReply = parsedJson.suggestedReply || undefined;
    const score = typeof parsedJson.score === 'number' ? Math.min(100, Math.max(0, parsedJson.score)) : 50;

    const qualification: AILeadQualification = {
      status,
      estimatedValue,
      summary,
      suggestedNextAction,
      suggestedReply,
      score,
    };

    return {
      success: true,
      qualification,
      rawResponse: rawContent,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Erro de conexão com os servidores do Groq.',
    };
  }
}

/**
 * Executa a qualificação via Groq e atualiza automaticamente o Lead no Supabase
 */
export async function qualifyAndSyncLeadToSupabase(
  contactName: string,
  contactPhone: string,
  remoteJid: string,
  messages: Message[]
): Promise<{ success: boolean; lead?: Lead; qualification?: AILeadQualification; error?: string }> {
  const result = await analyzeConversationAndQualifyLead(contactName, contactPhone, messages);

  if (!result.success || !result.qualification) {
    return { success: false, error: result.error || 'Não foi possível gerar a qualificação.' };
  }

  const q = result.qualification;
  const cleanPhone = contactPhone || remoteJid;

  // Buscar lead existente no Supabase para manter ID se já houver
  const leads = await getLeadsFromSupabase();
  const existingLead = leads.find((l) => l.remoteJid === remoteJid || l.phone === cleanPhone || l.contactId === remoteJid);

  const leadPayload: Partial<Lead> & { name: string; phone: string } = {
    ...(existingLead ? { id: existingLead.id } : {}),
    name: contactName || cleanPhone,
    phone: cleanPhone,
    status: q.status,
    source: 'WhatsApp',
    value: q.estimatedValue > 0 ? q.estimatedValue : (existingLead?.value || 0),
    notes: `[I.A Groq - Score: ${q.score}/100]\nResumo: ${q.summary}\nPróxima Ação: ${q.suggestedNextAction}`,
    contactId: remoteJid,
    remoteJid,
  };

  const savedLead = await saveLeadToSupabase(leadPayload);

  if (!savedLead) {
    return { success: false, error: 'Qualificação gerada, mas erro ao salvar Lead no Supabase.' };
  }

  // Anexar dados da IA para retorno
  const updatedLead: Lead = {
    ...savedLead,
    aiScore: q.score,
    aiNextAction: q.suggestedNextAction,
    aiQualification: q,
  };

  return {
    success: true,
    lead: updatedLead,
    qualification: q,
  };
}

/**
 * Conduz a conversa gerando uma resposta com a I.A do Groq e enviando diretamente para o WhatsApp
 */
export async function conductAndSendGroqResponse(
  contactName: string,
  contactPhone: string,
  remoteJid: string,
  messages: Message[],
  isEvolutionConnected: boolean = true
): Promise<{ success: boolean; sentMessage?: Message; qualification?: AILeadQualification; error?: string }> {
  // 1. Qualificar lead e gerar resposta da IA
  const syncResult = await qualifyAndSyncLeadToSupabase(contactName, contactPhone, remoteJid, messages);

  if (!syncResult.success || !syncResult.qualification) {
    return { success: false, error: syncResult.error || 'Falha ao conduzir a conversa com a I.A.' };
  }

  const q = syncResult.qualification;
  if (!q.suggestedReply) {
    return { success: false, error: 'A I.A não gerou uma resposta de texto para enviar nesta interação.' };
  }

  const replyText = q.suggestedReply;
  const tempId = `msg_agent_${Date.now()}`;
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const targetDestination = remoteJid || contactPhone;

  let finalMsgId = tempId;
  let status: 'SENT' | 'PENDING' = 'SENT';

  // 2. Se a Evolution API estiver conectada, envia a resposta para o WhatsApp do cliente
  if (isEvolutionConnected) {
    const apiRes = await sendTextMessage(targetDestination, replyText);
    if (apiRes.success && apiRes.messageId) {
      finalMsgId = apiRes.messageId;
    }
  }

  const agentMessage: Message = {
    id: finalMsgId,
    text: replyText,
    sender: 'agent',
    timestamp: timeStr,
    remoteJid: targetDestination,
    status,
  };

  const contactObj: Contact = {
    id: remoteJid,
    name: contactName,
    phone: contactPhone,
    remoteJid,
    unread: 0,
    lastMessage: replyText,
  };

  // 3. Salva a resposta no Supabase sob sender: 'agent'
  await saveMessageToSupabase(agentMessage, contactObj);

  return {
    success: true,
    sentMessage: agentMessage,
    qualification: q,
  };
}
