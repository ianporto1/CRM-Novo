import { Database, Link, Smartphone, Key, Save } from 'lucide-react';

export function Configuracoes() {
  return (
    <div className="p-8 h-full overflow-y-auto bg-zinc-50/50">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Configurações</h2>
          <p className="text-zinc-500 mt-1">Integrações e preferências do sistema.</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm divide-y divide-zinc-200">
          
          {/* Supabase Config */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-zinc-900">Supabase</h3>
                <p className="text-sm text-zinc-500">Banco de dados e autenticação</p>
              </div>
            </div>
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">URL do Projeto</label>
                <input 
                  type="text" 
                  placeholder="https://xyzcompany.supabase.co" 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Chave Anon (Public)</label>
                <input 
                  type="password" 
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5c..." 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Evolution API Config */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-zinc-900">Evolution API</h3>
                <p className="text-sm text-zinc-500">Conexão com WhatsApp</p>
              </div>
            </div>
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">URL da API</label>
                <input 
                  type="text" 
                  placeholder="https://api.evolution.com" 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Global API Key</label>
                <input 
                  type="password" 
                  placeholder="Sua chave global..." 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Nome da Instância</label>
                <input 
                  type="text" 
                  placeholder="whatsapp_crm_1" 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                />
              </div>
            </div>
          </div>

        </div>
        
        <div className="flex justify-end pt-4">
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors">
            <Save className="w-4 h-4" />
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}
