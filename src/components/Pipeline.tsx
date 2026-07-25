import { Lead } from '../types';
import { cn } from '../lib/utils';
import { MoreHorizontal, Plus } from 'lucide-react';

const MOCK_PIPELINE: Record<string, Lead[]> = {
  novo: [
    { id: '1', name: 'Carlos Ferreira', phone: '+55 11 99999-9999', status: 'novo', source: 'Instagram', createdAt: '2026-07-25' },
    { id: '5', name: 'Ricardo Mendes', phone: '+55 11 95555-5555', status: 'novo', source: 'Site', createdAt: '2026-07-25' },
  ],
  em_contato: [
    { id: '2', name: 'Juliana Costa', phone: '+55 11 98888-8888', status: 'em_contato', source: 'Facebook', createdAt: '2026-07-24' },
  ],
  negociacao: [
    { id: '3', name: 'Roberto Almeida', phone: '+55 11 97777-7777', status: 'negociacao', source: 'Indicação', createdAt: '2026-07-20' },
  ],
  fechado: [
    { id: '4', name: 'Fernanda Lima', phone: '+55 11 96666-6666', status: 'fechado', source: 'Google', createdAt: '2026-07-15' },
  ],
};

const COLUMNS = [
  { id: 'novo', title: 'Novos Leads', color: 'border-blue-500' },
  { id: 'em_contato', title: 'Em Contato', color: 'border-amber-500' },
  { id: 'negociacao', title: 'Negociação', color: 'border-purple-500' },
  { id: 'fechado', title: 'Fechado', color: 'border-emerald-500' },
];

export function Pipeline() {
  return (
    <div className="p-8 h-full flex flex-col bg-zinc-50/50">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Pipeline de Vendas</h2>
          <p className="text-zinc-500 mt-1">Acompanhe a jornada de seus clientes visualmente.</p>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div key={col.id} className="min-w-[300px] w-[300px] flex flex-col">
            <div className={cn("bg-white border border-zinc-200 rounded-xl p-4 mb-3 shadow-sm border-t-4", col.color)}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-zinc-900">{col.title}</h3>
                <span className="bg-zinc-100 text-zinc-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {MOCK_PIPELINE[col.id]?.length || 0}
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto rounded-xl">
              {MOCK_PIPELINE[col.id]?.map((lead) => (
                <div key={lead.id} className="bg-white border border-zinc-200 p-4 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-emerald-300 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-zinc-900 text-sm">{lead.name}</h4>
                    <button className="text-zinc-400 hover:text-zinc-700">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">{lead.phone}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] font-medium px-2 py-1 bg-zinc-100 text-zinc-600 rounded">
                      {lead.source}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(lead.createdAt).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
              <button className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/50 flex items-center justify-center gap-2 text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
