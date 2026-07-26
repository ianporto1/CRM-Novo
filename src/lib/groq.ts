import { Message, Lead, AILeadQualification } from '../types';
import { saveLeadToSupabase, getLeadsFromSupabase } from './supabaseService';

export interface GroqConfig {
  apiKey: string;
  model: string;
  systemPrompt: string;
  isActive: boolean;
}

export const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Recomendado - Mais Inteligente)', provider: 'Meta' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Ultra Rápido)', provider: 'Meta' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Contexto Longo)', provider: 'Mistral' },
];

export const DEFAULT_GROQ_SYSTEM_PROMPT = `Você é um especialista em vendas e CRM inteligente. Sua função é analisar o histórico de conversas do WhatsApp com um cliente e qualificar com precisão o Lead no Pipeline de Vendas.

Com base na conversa fornecida, retorne estritamente um JSON com a seguinte estrutura:
{
  "status": "novo" | "em_contato" | "negociacao" | "fechado" | "perdido",
  "estimatedValue": número (valor estimado do contrato/produto em R$, ex: 2500, ou 0 se não especificado),
  "summary": "resumo conciso de 1 a 2 frases com o diagnóstico do interesse do cliente",
  "suggestedNextAction": "próxima ação recomendada para a equipe de vendas",
  "suggestedReply": "sugestão de resposta amigável e profissional para enviar ao cliente no WhatsApp",
  "score": número entre 0 e 100 (pontuação da temperatura do lead: 0-30 frio, 31-70 morno, 71-100 quente)
}

Regras para definição do Status:
- "novo": Apresentação inicial ou primeira mensagem sem detalhamento.
- "em_contato": Já conversa e respondeu perguntas sobre necessidades.
- "negociacao": Solicitou orçamento, negocia valores ou solicitou proposta.
- "fechado": Aceitou a compra/serviço, confirmou pagamento ou fechou contrato.
- "perdido": Informou expressamente que não deseja comprar, achou caro demais ou cancelou.

Importante: Responda APENAS com o JSON válido.`;

/**
 * Obter configurações atuais da API Groq
 */
export function getGroqConfig(): GroqConfig {
  const envApiKey = import.meta.env.VITE_GROQ_API_KEY || '';
  const localApiKey = localStorage.getItem('groq_api_key') || '';
  const apiKey = localApiKey || envApiKey;

  const model = localStorage.getItem('groq_model') || 'llama-3.3-70b-versatile';
  const systemPrompt = localStorage.getItem('groq_system_prompt') || DEFAULT_GROQ_SYSTEM_PROMPT;
  const isActive = localStorage.getItem('groq_agent_active') !== 'false';

  return {
    apiKey,
    model,
    systemPrompt,
    isActive,
  };
}

/**
 * Salvar configurações da API Groq no localStorage
 */
export function saveGroqConfig(config: Partial<GroqConfig>): void {
  if (config.apiKey !== undefined) {
    localStorage.setItem('groq_api_key', config.apiKey);
  }
  if (config.model !== undefined) {
    localStorage.setItem('groq_model', config.model);
  }
  if (config.systemPrompt !== undefined) {
    localStorage.setItem('groq_system_prompt', config.systemPrompt);
  }
  if (config.isActive !== undefined) {
    localStorage.setItem('groq_agent_active', String(config.isActive));
  }
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
