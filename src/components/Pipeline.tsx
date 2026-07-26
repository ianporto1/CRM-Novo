import React, { useState, useEffect, DragEvent } from 'react';
import { Lead } from '../types';
import { cn } from '../lib/utils';
import { MoreHorizontal, Plus, RefreshCw, MessageSquare, DollarSign, X, Check } from 'lucide-react';
import { 
  getLeadsFromSupabase, 
  saveLeadToSupabase, 
  updateLeadStatusInSupabase,
  deleteLeadInSupabase
} from '../lib/supabaseService';

const COLUMNS = [
  { id: 'novo', title: 'Novos Leads', color: 'border-blue-500', headerBg: 'bg-blue-50/50', badgeColor: 'bg-blue-100 text-blue-700' },
  { id: 'em_contato', title: 'Em Contato', color: 'border-amber-500', headerBg: 'bg-amber-50/50', badgeColor: 'bg-amber-100 text-amber-700' },
  { id: 'negociacao', title: 'Negociação', color: 'border-purple-500', headerBg: 'bg-purple-50/50', badgeColor: 'bg-purple-100 text-purple-700' },
  { id: 'fechado', title: 'Fechado', color: 'border-emerald-500', headerBg: 'bg-emerald-50/50', badgeColor: 'bg-emerald-100 text-emerald-700' },
  { id: 'perdido', title: 'Perdido', color: 'border-red-500', headerBg: 'bg-red-50/50', badgeColor: 'bg-red-100 text-red-700' },
];

export function Pipeline() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Partial<Lead> | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    status: 'novo' as Lead['status'],
    source: 'WhatsApp',
    value: 0,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    const data = await getLeadsFromSupabase();
    setLeads(data);
    setLoading(false);
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e: DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverColumn(colId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: DragEvent, targetStatus: Lead['status']) => {
    e.preventDefault();
    setDragOverColumn(null);

    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (!leadId) return;

    // Atualização otimista na UI
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: targetStatus } : l))
    );

    // Persistir no Supabase
    await updateLeadStatusInSupabase(leadId, targetStatus);
    setDraggedLeadId(null);
  };

  // Modal Handlers
  const handleOpenNewModal = (defaultStatus: Lead['status'] = 'novo') => {
    setEditingLead(null);
    setFormData({
      name: '',
      phone: '',
      status: defaultStatus,
      source: 'WhatsApp',
      value: 0,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      phone: lead.phone,
      status: lead.status,
      source: lead.source || 'WhatsApp',
      value: lead.value || 0,
      notes: lead.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || saving) return;

    setSaving(true);
    const leadPayload: Partial<Lead> & { name: string; phone: string } = {
      ...(editingLead?.id ? { id: editingLead.id } : {}),
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      status: formData.status,
      source: formData.source || 'WhatsApp',
      value: Number(formData.value) || 0,
      notes: formData.notes.trim(),
    };

    const savedLead = await saveLeadToSupabase(leadPayload);

    if (savedLead) {
      setLeads((prev) => {
        const exists = prev.some((l) => l.id === savedLead.id);
        if (exists) {
          return prev.map((l) => (l.id === savedLead.id ? savedLead : l));
        }
        return [savedLead, ...prev];
      });
      setIsModalOpen(false);
    }
    setSaving(false);
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm('Deseja realmente remover este lead do Pipeline?')) return;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    await deleteLeadInSupabase(id);
    setIsModalOpen(false);
  };

  // Totais
  const totalPipelineValue = leads.reduce((acc, l) => acc + (l.value || 0), 0);

  const getLeadsForColumn = (status: string) => leads.filter((l) => l.status === status);
  const getColumnValue = (status: string) =>
    getLeadsForColumn(status).reduce((acc, l) => acc + (l.value || 0), 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="p-8 h-full flex flex-col bg-zinc-50/50 overflow-hidden">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Pipeline de Vendas</h2>
          <p className="text-zinc-500 mt-1">Gerencie a jornada de seus clientes e mova os cards interativamente.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-lg flex items-center gap-2 text-emerald-800 text-sm font-semibold">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Total no Funil: {formatCurrency(totalPipelineValue)}</span>
          </div>

          <button
            onClick={loadLeads}
            title="Atualizar Pipeline"
            className="p-2 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-lg text-zinc-600 transition-colors shadow-sm"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>

          <button
            onClick={() => handleOpenNewModal('novo')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Colunas do Kanban */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 items-start">
        {COLUMNS.map((col) => {
          const colLeads = getLeadsForColumn(col.id);
          const colValue = getColumnValue(col.id);
          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id as Lead['status'])}
              className={cn(
                'min-w-[280px] w-[280px] flex flex-col max-h-full rounded-2xl bg-zinc-100/60 p-3 border transition-all',
                isOver ? 'border-emerald-500 bg-emerald-50/30 shadow-md scale-[1.01]' : 'border-zinc-200/80'
              )}
            >
              {/* Header da Coluna */}
              <div className={cn('bg-white border border-zinc-200 rounded-xl p-3.5 mb-3 shadow-sm border-t-4', col.color)}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-zinc-900 text-sm">{col.title}</h3>
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', col.badgeColor)}>
                    {colLeads.length}
                  </span>
                </div>
                {colValue > 0 && (
                  <p className="text-xs text-zinc-500 font-mono mt-1">
                    {formatCurrency(colValue)}
                  </p>
                )}
              </div>

              {/* Lista de Cards */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-0.5">
                {colLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    className="bg-white border border-zinc-200 p-4 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-emerald-400 hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <h4 className="font-medium text-zinc-900 text-sm group-hover:text-emerald-700 transition-colors">
                        {lead.name}
                      </h4>
                      <button
                        onClick={() => handleOpenEditModal(lead)}
                        className="text-zinc-400 hover:text-zinc-700 p-1 rounded hover:bg-zinc-100 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-zinc-500 mb-2 font-mono">{lead.phone}</p>

                    {lead.value && lead.value > 0 ? (
                      <p className="text-xs font-semibold text-emerald-600 mb-3 bg-emerald-50 px-2 py-1 rounded w-max border border-emerald-100">
                        {formatCurrency(lead.value)}
                      </p>
                    ) : null}

                    {lead.notes && (
                      <p className="text-[11px] text-zinc-400 italic line-clamp-2 mb-3 bg-zinc-50 p-1.5 rounded border border-zinc-100">
                        "{lead.notes}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[10px]">
                      <span className="font-medium px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded">
                        {lead.source}
                      </span>
                      <a
                        href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageSquare className="w-3 h-3" />
                        WhatsApp
                      </a>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => handleOpenNewModal(col.id as Lead['status'])}
                  className="w-full py-2.5 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/50 flex items-center justify-center gap-2 text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar nesta coluna
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Adicionar / Editar Lead */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-semibold text-zinc-900">
                {editingLead ? 'Editar Lead' : 'Novo Lead no Pipeline'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Carlos Silva"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Telefone / WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ex: +55 11 99999-9999"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Etapa no Funil</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Lead['status'] })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="novo">Novos Leads</option>
                    <option value="em_contato">Em Contato</option>
                    <option value="negociacao">Negociação</option>
                    <option value="fechado">Fechado</option>
                    <option value="perdido">Perdido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Origem do Lead</label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="Ex: Instagram, Google, Indicação"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Valor Estimado do Negócio (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Observações / Anotações</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Detalhes adicionais sobre a negociação..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-zinc-100">
                {editingLead ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteLead(editingLead.id!)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium underline"
                  >
                    Excluir Lead
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-zinc-200 hover:bg-zinc-100 rounded-lg text-sm text-zinc-600 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {saving ? 'Salvando...' : 'Salvar Lead'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
