import { useState, useEffect } from 'react';
import { Database, Smartphone, RefreshCw, LogOut, QrCode, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { 
  getEvolutionConfig, 
  fetchInstanceStatus, 
  fetchQrCode, 
  logoutInstance, 
  InstanceConnectionState 
} from '../lib/evolution';

export function Configuracoes() {
  const [evolutionConfig] = useState(getEvolutionConfig());
  const [connectionState, setConnectionState] = useState<InstanceConnectionState>({ state: 'unknown' });
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [loadingQr, setLoadingQr] = useState<boolean>(false);
  const [loadingLogout, setLoadingLogout] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vhjqpbydrilvyzvcwnmy.supabase.co';

  // Verificar status da instância ao carregar
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoadingStatus(true);
    setFeedbackMessage(null);
    const status = await fetchInstanceStatus();
    setConnectionState(status);
    setLoadingStatus(false);

    // Se a instância se conectar, limpa o QR code
    if (status.state === 'open') {
      setQrCodeData(null);
    }
  };

  const handleGenerateQrCode = async () => {
    setLoadingQr(true);
    setFeedbackMessage(null);
    const result = await fetchQrCode();

    if (result.error) {
      setFeedbackMessage({ type: 'error', text: result.error });
      setLoadingQr(false);
      return;
    }

    if (result.state === 'open') {
      setFeedbackMessage({ type: 'success', text: 'Instância já está conectada!' });
      setQrCodeData(null);
      await checkStatus();
    } else if (result.base64) {
      // Garantir formato base64 correto
      const base64Formatted = result.base64.startsWith('data:image') 
        ? result.base64 
        : `data:image/png;base64,${result.base64}`;
      setQrCodeData(base64Formatted);
    } else {
      setFeedbackMessage({ type: 'error', text: 'Não foi possível obter a imagem do QR Code.' });
    }

    setLoadingQr(false);
  };

  const handleLogout = async () => {
    if (!confirm('Deseja realmente desconectar esta instância do WhatsApp?')) {
      return;
    }

    setLoadingLogout(true);
    setFeedbackMessage(null);
    const result = await logoutInstance();

    if (result.success) {
      setFeedbackMessage({ type: 'success', text: 'Instância desconectada com sucesso.' });
      setQrCodeData(null);
      await checkStatus();
    } else {
      setFeedbackMessage({ type: 'error', text: result.error || 'Erro ao desconectar.' });
    }

    setLoadingLogout(false);
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-zinc-50/50">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Configurações</h2>
          <p className="text-zinc-500 mt-1">Gerenciamento de Instância e Conexões do Sistema via Vercel</p>
        </div>

        {feedbackMessage && (
          <div className={`p-4 rounded-xl text-sm flex items-center justify-between ${
            feedbackMessage.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            <span>{feedbackMessage.text}</span>
            <button onClick={() => setFeedbackMessage(null)} className="text-xs font-semibold underline">
              Fechar
            </button>
          </div>
        )}

        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm divide-y divide-zinc-200 overflow-hidden">
          
          {/* Card Supabase */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-zinc-900">Supabase</h3>
                  <p className="text-sm text-zinc-500">Banco de Dados e Autenticação</p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Configurado na Vercel
              </span>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-xs font-mono text-zinc-600 flex items-center justify-between">
              <span>URL: {supabaseUrl}</span>
              <span className="text-zinc-400">VITE_SUPABASE_URL</span>
            </div>
          </div>

          {/* Card Evolution API Instance */}
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-zinc-900">Evolution API (WhatsApp)</h3>
                  <p className="text-sm text-zinc-500">Gerenciamento de Instância Única</p>
                </div>
              </div>

              {/* Status Badge */}
              {loadingStatus ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Verificando...
                </span>
              ) : connectionState.state === 'open' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Conectado
                </span>
              ) : connectionState.state === 'connecting' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  Conectando...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  Desconectado
                </span>
              )}
            </div>

            {/* Banner se variáveis não estiverem configuradas */}
            {!evolutionConfig.isConfigured && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">Variáveis de Ambiente Não Encontradas</p>
                  <p className="mt-1">
                    Cadastre as variáveis <code className="bg-amber-100 px-1 py-0.5 rounded">VITE_EVOLUTION_API_URL</code>, <code className="bg-amber-100 px-1 py-0.5 rounded">VITE_EVOLUTION_API_KEY</code> e <code className="bg-amber-100 px-1 py-0.5 rounded">VITE_EVOLUTION_INSTANCE_NAME</code> no painel da Vercel.
                  </p>
                </div>
              </div>
            )}

            {/* Informações da Instância */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg">
                <span className="text-xs text-zinc-500 block mb-1">Nome da Instância</span>
                <span className="font-mono text-sm font-semibold text-zinc-800">
                  {evolutionConfig.instanceName || 'Não definida'}
                </span>
              </div>
              <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg">
                <span className="text-xs text-zinc-500 block mb-1">Perfil Conectado</span>
                <span className="text-sm font-semibold text-zinc-800">
                  {connectionState.profileName || connectionState.ownerJid || 'Nenhum dispositivo emparelhado'}
                </span>
              </div>
            </div>

            {/* Ações da Instância */}
            <div className="pt-2 flex flex-wrap gap-3 items-center justify-between border-t border-zinc-100">
              <button
                onClick={checkStatus}
                disabled={loadingStatus}
                className="px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-100 text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />
                Atualizar Status
              </button>

              {connectionState.state === 'open' ? (
                <button
                  onClick={handleLogout}
                  disabled={loadingLogout}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  {loadingLogout ? 'Desconectando...' : 'Desconectar da Instância'}
                </button>
              ) : (
                <button
                  onClick={handleGenerateQrCode}
                  disabled={loadingQr || !evolutionConfig.isConfigured}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <QrCode className="w-4 h-4" />
                  {loadingQr ? 'Gerando QR Code...' : 'Ler QR Code para Conectar'}
                </button>
              )}
            </div>

            {/* Exibição do QR Code se gerado */}
            {qrCodeData && connectionState.state !== 'open' && (
              <div className="mt-4 p-6 bg-zinc-900 rounded-xl text-white flex flex-col items-center justify-center space-y-4">
                <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-blue-400" />
                  Escaneie o QR Code abaixo com seu WhatsApp
                </h4>

                <div className="p-3 bg-white rounded-xl shadow-lg">
                  <img 
                    src={qrCodeData} 
                    alt="QR Code WhatsApp Evolution API" 
                    className="w-56 h-56 object-contain"
                  />
                </div>

                <div className="text-center max-w-sm">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    No seu aplicativo do WhatsApp, vá em <strong>Configurações &gt; Aparelhos conectados &gt; Conectar um aparelho</strong> e aponte a câmera para a imagem.
                  </p>
                </div>

                <button
                  onClick={checkStatus}
                  className="text-xs text-blue-400 hover:text-blue-300 underline font-medium pt-1"
                >
                  Já escaneou? Clique para verificar conexão
                </button>
              </div>
            )}

          </div>

          {/* Guia de Configuração Vercel */}
          <div className="p-6 bg-zinc-50/70 space-y-3">
            <h4 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
              Como configurar as variáveis no painel da Vercel
            </h4>
            <ol className="text-xs text-zinc-600 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Acesse seu projeto na Vercel e vá em <strong>Settings &gt; Environment Variables</strong>.</li>
              <li>Cadastre <code className="bg-white border border-zinc-200 px-1 py-0.5 rounded text-zinc-800 font-mono">VITE_SUPABASE_URL</code> e <code className="bg-white border border-zinc-200 px-1 py-0.5 rounded text-zinc-800 font-mono">VITE_SUPABASE_ANON_KEY</code>.</li>
              <li>Cadastre <code className="bg-white border border-zinc-200 px-1 py-0.5 rounded text-zinc-800 font-mono">VITE_EVOLUTION_API_URL</code>, <code className="bg-white border border-zinc-200 px-1 py-0.5 rounded text-zinc-800 font-mono">VITE_EVOLUTION_API_KEY</code> e <code className="bg-white border border-zinc-200 px-1 py-0.5 rounded text-zinc-800 font-mono">VITE_EVOLUTION_INSTANCE_NAME</code>.</li>
              <li>Faça um <strong>Redeploy</strong> do projeto para aplicar as variáveis ao bundle.</li>
            </ol>
          </div>

        </div>
      </div>
    </div>
  );
}
