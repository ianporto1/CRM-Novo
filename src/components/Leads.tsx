import { Lead } from '../types';
import { Search, Plus, Filter, MoreHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';

const MOCK_LEADS: Lead[] = [
  { id: '1', name: 'Carlos Ferreira', phone: '+55 11 99999-9999', status: 'novo', source: 'Instagram', createdAt: '2026-07-25' },
  { id: '2', name: 'Juliana Costa', phone: '+55 11 98888-8888', status: 'em_contato', source: 'Facebook', createdAt: '2026-07-24' },
  { id: '3', name: 'Roberto Almeida', phone: '+55 11 97777-7777', status: 'negociacao', source: 'Indicação', createdAt: '2026-07-20' },
  { id: '4', name: 'Fernanda Lima', phone: '+55 11 96666-6666', status: 'fechado', source: 'Google', createdAt: '2026-07-15' },
];

const statusColors = {
  novo: 'bg-blue-100 text-blue-700',
  em_contato: 'bg-amber-100 text-amber-700',
  negociacao: 'bg-purple-100 text-purple-700',
  fechado: 'bg-emerald-100 text-emerald-700',
  perdido: 'bg-red-100 text-red-700',
};

const statusLabels = {
  novo: 'Novo',
  em_contato: 'Em Contato',
  negociacao: 'Negociação',
  fechado: 'Fechado',
  perdido: 'Perdido'
};

export function Leads() {
  return (
    <div className="p-8 h-full overflow-y-auto bg-zinc-50/50">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900">Leads</h2>
            <p className="text-zinc-500 mt-1">Gerencie seus contatos e clientes em potencial.</p>
          </div>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" />
            Novo Lead
          </button>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-200 flex items-center justify-between gap-4">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar por nome ou telefone..." 
                className="w-full bg-white border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <button className="text-zinc-600 border border-zinc-200 hover:bg-zinc-50 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              <Filter className="w-4 h-4" />
              Filtros
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200 text-sm font-medium text-zinc-500">
                  <th className="p-4 font-medium">Nome</th>
                  <th className="p-4 font-medium">Telefone</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Origem</th>
                  <th className="p-4 font-medium">Data</th>
                  <th className="p-4 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {MOCK_LEADS.map((lead) => (
                  <tr key={lead.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="p-4 font-medium text-zinc-900">{lead.name}</td>
                    <td className="p-4 text-zinc-600">{lead.phone}</td>
                    <td className="p-4">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", statusColors[lead.status])}>
                        {statusLabels[lead.status]}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-600">{lead.source}</td>
                    <td className="p-4 text-zinc-600">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="p-4 text-zinc-400 hover:text-zinc-900 cursor-pointer text-center">
                      <MoreHorizontal className="w-4 h-4 mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
