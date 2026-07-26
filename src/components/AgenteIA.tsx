import { useState, useEffect } from 'react';
import { 
  Bot, 
  Play, 
  Pause, 
  Settings2, 
  Zap, 
  Key, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  Check, 
  DollarSign, 
  ArrowRight,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  getGroqConfig, 
  fetchGroqConfigFromSupabase,
  saveGroqConfig, 
  GROQ_MODELS, 
  DEFAULT_GROQ_SYSTEM_PROMPT,
  qualifyAndSyncLeadToSupabase
} from '../lib/groq';
import { getContactsFromSupabase, getMessagesFromSupabase, getLeadsFromSupabase } from '../lib/supabaseService';
import { Lead, AILeadQualification } from '../types';

interface QualificationLogItem {
  id: string;
  name: string;
  phone: string;
  timestamp: string;
  qualification: AILeadQualification;
}

export function AgenteIA() {
  const [config, setConfig] = useState(getGroqConfig());
  const [apiKeyInput, setApiKeyInput] = useState(config.apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState(config.model);
  const [systemPromptInput, setSystemPromptInput] = useState(config.systemPrompt);
  const [isActive, setIsActive] = useState(config.isActive);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(config.autoReplyEnabled);

  const [savingConfig, setSavingConfig] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Batch qualification state
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchMessage, setBatchMessage] = useState<string | null>(null);

  // Logs & Metrics
  const [recentLogs, setRecentLogs] = useState<QualificationLogItem[]>([]);
  const [qualifiedCount, setQualifiedCount] = useState<number>(0);

  useEffect(() => {
    loadDashboardMetrics();
  }, []);

  const loadDashboardMetrics = async () => {
    const [dbConfig, leads] = await Promise.all([
      fetchGroqConfigFromSupabase(),
      getLeadsFromSupabase(),
    ]);

    if (dbConfig) {
      setConfig(dbConfig);
      setApiKeyInput(dbConfig.apiKey);
      setSelectedModel(dbConfig.model);
      setSystemPromptInput(dbConfig.systemPrompt);
      setIsActive(dbConfig.isActive);
      setAutoReplyEnabled(dbConfig.autoReplyEnabled);
    }

    const qualifiedLeads = leads.filter((l) => l.notes && l.notes.includes('[I.A Groq'));
    setQualifiedCount(qualifiedLeads.length);

    // Build recent log list
    const logs: QualificationLogItem[] = qualifiedLeads.map((l) => {
      const scoreMatch = l.notes?.match(/Score:\s*(\d+)/);
      const score = scoreMatch ? Number(scoreMatch[1]) : 50;

      const summaryMatch = l.notes?.match(/Resumo:\s*(.*?)(?=\nPróxima|$)/s);
      const summary = summaryMatch ? summaryMatch[1].trim() : l.notes || '';

      const actionMatch = l.notes?.match(/Próxima Ação:\s*(.*)/);
      const suggestedNextAction = actionMatch ? actionMatch[1].trim() : '';

      return {
        id: l.id,
        name: l.name,
        phone: l.phone,
        timestamp: l.updatedAt || l.createdAt,
        qualification: {
          status: l.status,
          estimatedValue: l.value || 0,
          summary,
          suggestedNextAction,
          score,
        },
      };
    });

    setRecentLogs(logs.slice(0, 10));
  };

  const handleToggleActive = () => {
    const nextState = !isActive;
    setIsActive(nextState);
    saveGroqConfig({ isActive: nextState });
  };

  const handleSaveSettings = () => {
    setSavingConfig(true);
    saveGroqConfig({
      apiKey: apiKeyInput.trim(),
      model: selectedModel,
      systemPrompt: systemPromptInput.trim(),
      isActive,
      autoReplyEnabled,
    });

    setConfig(getGroqConfig());
    setSavingConfig(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetDefaultPrompt = () => {
    if (confirm('Deseja restaurar a instrução padrão do sistema?')) {
      setSystemPromptInput(DEFAULT_GROQ_SYSTEM_PROMPT);
    }
  };

  const handleRunBatchQualification = async () => {
    if (!config.apiKey && !apiKeyInput.trim()) {
      alert('Por favor, configure sua Chave de API do Groq antes de executar a qualificação.');
      return;
    }

    if (!confirm('Deseja qualificar todas as conversas salvas no Supabase utilizando a I.A do Groq?')) {
      return;
    }

    setBatchLoading(true);
    setBatchMessage('Buscando conversas do Supabase...');

    try {
      const contacts = await getContactsFromSupabase();
      if (contacts.length === 0) {
        setBatchMessage('Nenhum contato encontrado no Supabase.');
        setBatchLoading(false);
        return;
      }

      setBatchProgress({ current: 0, total: contacts.length });
      let successCount = 0;

      for (let i = 0; i < contacts.length; i++) {
        const c = contacts[i];
        setBatchMessage(`Analisando conversa de ${c.name || c.phone} (${i + 1}/${contacts.length})...`);
        setBatchProgress({ current: i + 1, total: contacts.length });

        const messages = await getMessagesFromSupabase(c.remoteJid || c.id);
        if (messages.length > 0) {
          const res = await qualifyAndSyncLeadToSupabase(
            c.name,
            c.phone,
            c.remoteJid || c.id,
            messages
          );
          if (res.success) {
            successCount++;
          }
        }
      }

      setBatchMessage(`Sincronização concluída com sucesso! ${successCount} leads qualificados no Pipeline.`);
      await loadDashboardMetrics();
    } catch (err: any) {
      setBatchMessage(`Erro ao executar qualificação em lote: ${err.message}`);
    }

    setBatchLoading(false);
  };

  const getStatusBadgeClass = (status: Lead['status']) => {
    switch (status) {
      case 'novo': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'em_contato': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'negociacao': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'fechado': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'perdido': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="p-8 h-full overflow-y-auto bg-zinc-50/50">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-semibold text-zinc-900">Agente de I.A (Groq Cloud)</h2>
            </div>
            <p className="text-zinc-500 mt-1">Qualifique conversas do WhatsApp e mova seus Leads no Pipeline em tempo real com o Groq.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunBatchQualification}
              disabled={batchLoading}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all shadow-sm"
            >
              <RefreshCw className={cn("w-4 h-4", batchLoading && "animate-spin")} />
              {batchLoading ? 'Qualificando Conversas...' : 'Qualificar Todas as Conversas'}
            </button>

            <button 
              onClick={handleToggleActive}
              className={cn(
                "px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm border",
                isActive 
                  ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100" 
                  : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
              )}
            >
              {isActive ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  Pausar Agente
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Ativar Agente
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mensagem de Progresso do Lote */}
        {batchMessage && (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className={cn("w-4 h-4 text-blue-600 shrink-0", batchLoading && "animate-spin")} />
              <span>{batchMessage}</span>
            </div>
            {batchProgress.total > 0 && (
              <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-bold">
                {batchProgress.current} / {batchProgress.total}
              </span>
            )}
          </div>
        )}

        {/* Banner de Configuração da API Groq */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">Credenciais da API do Groq</h3>
                <p className="text-xs text-zinc-500">Obtenha sua chave gratuita em console.groq.com</p>
              </div>
            </div>

            {config.apiKey ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                API Key Conectada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5" />
                Aguardando API Key
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Groq API Key (gsk_...)</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-3 pr-20 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-500 hover:text-zinc-800 px-2 py-1 bg-zinc-200/60 rounded"
                >
                  {showApiKey ? 'Ocultar' : 'Exibir'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Modelo de Linguagem (LLM)</label>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                >
                  {GROQ_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Form e Métricas em 2 Colunas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Instrução do Sistema (Prompt Base) */}
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-emerald-600" />
                Prompt Base & Regras de Qualificação
              </h3>

              <button
                type="button"
                onClick={handleResetDefaultPrompt}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-800 underline"
              >
                Restaurar Padrão
              </button>
            </div>

            <p className="text-xs text-zinc-500">Instruções enviadas para a I.A do Groq interpretar os diálogos e categorizar os contatos no Pipeline.</p>

            <textarea
              value={systemPromptInput}
              onChange={(e) => setSystemPromptInput(e.target.value)}
              className="w-full h-[320px] bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none font-mono leading-relaxed"
            />

            <div className="flex items-center justify-between pt-2">
              {saveSuccess ? (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Configurações salvas com sucesso!
                </span>
              ) : <span />}

              <button
                onClick={handleSaveSettings}
                disabled={savingConfig}
                className="bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
              >
                {savingConfig ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>

          {/* Painel Lateral de Status */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-4">
              <h3 className="font-semibold text-zinc-900">Status do Agente Groq</h3>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                <div className="relative">
                  <div className={cn("w-3 h-3 rounded-full", isActive ? "bg-emerald-500" : "bg-zinc-300")} />
                  {isActive && <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-25" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800">
                    {isActive ? 'Agente Ativo' : 'Agente Pausado'}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {isActive ? 'Pronto para qualificar no chat e pipeline' : 'Qualificação manual mantida'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" /> Leads Qualificados
                  </span>
                  <span className="font-semibold text-zinc-900 font-mono">{qualifiedCount}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-500" /> Modelo Ativo
                  </span>
                  <span className="font-semibold text-zinc-900 text-xs truncate max-w-[120px]" title={selectedModel}>
                    {selectedModel.split('-')[0]} {selectedModel.split('-')[1]}
                  </span>
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-zinc-800">Piloto Automático (Auto-Responder)</p>
                    <p className="text-[10px] text-zinc-500">Enviar respostas no WhatsApp</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !autoReplyEnabled;
                      setAutoReplyEnabled(next);
                      saveGroqConfig({ autoReplyEnabled: next });
                    }}
                    className={cn(
                      "w-11 h-6 flex items-center rounded-full p-1 transition-colors",
                      autoReplyEnabled ? "bg-emerald-600 justify-end" : "bg-zinc-300 justify-start"
                    )}
                  >
                    <span className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Condução Ativa de Conversas
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Além de qualificar no Pipeline, o Agente pode responder no WhatsApp diretamente. Clique em <strong>"Conduzir & Responder (I.A)"</strong> no chat para gerar e enviar a resposta em 1 clique.
              </p>
            </div>
          </div>

        </div>

        {/* Tabela de Qualificações Recentes */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden p-6 space-y-4">
          <h3 className="font-semibold text-zinc-900 text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Qualificações Recentes Efetuadas pela I.A
          </h3>

          {recentLogs.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-sm">
              Nenhuma qualificação registrada ainda. Clique em "Qualificar Todas as Conversas" para começar.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {recentLogs.map((log) => (
                <div key={log.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/60 p-2 rounded-lg transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900 text-sm">{log.name}</span>
                      <span className="text-zinc-400 text-xs font-mono">({log.phone})</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider", getStatusBadgeClass(log.qualification.status))}>
                        {log.qualification.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600">{log.qualification.summary}</p>
                    {log.qualification.suggestedNextAction && (
                      <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-emerald-500 shrink-0" />
                        Próxima Ação: {log.qualification.suggestedNextAction}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0 sm:text-right">
                    {log.qualification.estimatedValue > 0 && (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                        {formatCurrency(log.qualification.estimatedValue)}
                      </span>
                    )}

                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded text-xs font-bold font-mono">
                      <span>Score:</span>
                      <span>{log.qualification.score}/100</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
