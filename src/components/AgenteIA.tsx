import { Bot, Play, Pause, Settings2, MessageSquare, Zap, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

export function AgenteIA() {
  const [isActive, setIsActive] = useState(true);

  return (
    <div className="p-8 h-full overflow-y-auto bg-zinc-50/50">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900">Agente de I.A</h2>
            <p className="text-zinc-500 mt-1">Configure o comportamento do seu assistente virtual (Gemini).</p>
          </div>
          <button 
            onClick={() => setIsActive(!isActive)}
            className={cn(
              "px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors",
              isActive 
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200" 
                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm col-span-2">
            <h3 className="text-lg font-medium text-zinc-900 mb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-zinc-500" />
              Prompt Base (System Instruction)
            </h3>
            <textarea
              className="w-full h-[300px] bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none font-mono"
              defaultValue={`Você é o assistente virtual de vendas da WhatsCRM.
Seu objetivo é qualificar leads e agendar reuniões.

Regras:
1. Seja sempre educado e prestativo.
2. Peça o nome e e-mail antes de agendar.
3. Se não souber responder, direcione para um atendente humano.
4. Mantenha as respostas curtas e diretas.`}
            />
            <div className="mt-4 flex justify-end">
              <button className="bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors">
                Salvar Configurações
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
              <h3 className="font-medium text-zinc-900 mb-4">Status do Agente</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className={cn("w-3 h-3 rounded-full", isActive ? "bg-emerald-500" : "bg-zinc-300")} />
                  {isActive && <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20" />}
                </div>
                <span className="text-sm font-medium text-zinc-700">
                  {isActive ? 'Online e Respondendo' : 'Pausado'}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Respostas hoje</span>
                  <span className="font-medium text-zinc-900">142</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500 flex items-center gap-2"><Zap className="w-4 h-4" /> Qualificados</span>
                  <span className="font-medium text-zinc-900">28</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Transferência Humana</h4>
                  <p className="text-xs text-blue-700">
                    O agente irá parar automaticamente de responder e notificar você caso detecte insatisfação ou intenção de falar com um humano.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
