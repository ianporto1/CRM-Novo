import { useState, useEffect } from 'react';
import { Lead, Contact } from '../types';
import { Search, Plus, Filter, MoreHorizontal, RefreshCw, UserPlus, MessageSquare, Trash2, Edit, DollarSign, X, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  getLeadsFromSupabase, 
  saveLeadToSupabase, 
  deleteLeadInSupabase,
  getContactsFromSupabase,
  convertContactToLead
} from '../lib/supabaseService';

const statusColors = {
  novo: 'bg-blue-100 text-blue-700 border-blue-200',
  em_contato: 'bg-amber-100 text-amber-700 border-amber-200',
  negociacao: 'bg-purple-100 text-purple-700 border-purple-200',
  fechado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  perdido: 'bg-red-100 text-red-700 border-red-200',
};

const statusLabels = {
  novo: 'Novo',
  em_contato: 'Em Contato',
  negociacao: 'Negociação',
  fechado: 'Fechado',
  perdido: 'Perdido',
};

export function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showImportDropdown, setShowImportDropdown] = useState(false);

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
    loadLeadsAndContacts();
  }, []);

  const loadLeadsAndContacts = async () => {
    setLoading(true);
    const dbLeads = await getLeadsFromSupabase();
    const dbContacts = await getContactsFromSupabase();
    setLeads(dbLeads);
    setContacts(dbContacts);
    setLoading(false);
  };

  const handleOpenNewModal = () => {
    setEditingLead(null);
    setFormData({
      name: '',
      phone: '',
      status: 'novo',
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
    if (!confirm('Deseja realmente remover este lead?')) return;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    await deleteLeadInSupabase(id);
    setIsModalOpen(false);
  };

  const handleImportContactAsLead = async (contact: Contact) => {
    setShowImportDropdown(false);
    const newLead = await convertContactToLead(contact);
    if (newLead) {
      setLeads((prev) => [newLead, ...prev.filter((l) => l.id !== newLead.id)]);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm);

    const matchesStatus = selectedStatus === 'all' || lead.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="p-8 h-full overflow-y-auto bg-zinc-50/50">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900">Leads</h2>
            <p className="text-zinc-500 mt-1">Gerencie seus contatos e clientes em potencial com persistência no Supabase.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadLeadsAndContacts}
              title="Atualizar Leads"
              className="p-2 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-lg text-zinc-600 transition-colors shadow-sm"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>

            {/* Menu de Importação de Contatos WhatsApp */}
            <div className="relative">
              <button
                onClick={() => setShowImportDropdown(!showImportDropdown)}
                className="bg-zinc-900 hover:bg-zinc-800 text-white px-3.5 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                Importar WhatsApp ({contacts.length})
              </button>

              {showImportDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-zinc-200 rounded-xl shadow-xl z-30 max-h-80 overflow-y-auto divide-y divide-zinc-100 p-1">
                  <div className="p-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Contatos do WhatsApp
                  </div>
                  {contacts.length === 0 ? (
                    <div className="p-4 text-xs text-zinc-500 text-center">
                      Nenhum contato encontrado. Conecte sua instância da Evolution API nas Configurações.
                    </div>
                  ) : (
                    contacts.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleImportContactAsLead(c)}
                        className="w-full text-left p-2.5 hover:bg-emerald-50 rounded-lg transition-colors flex items-center justify-between text-xs"
                      >
                        <div className="truncate">
                          <p className="font-semibold text-zinc-800 truncate">{c.name}</p>
                          <p className="text-zinc-400 font-mono text-[10px]">{c.phone}</p>
                        </div>
                        <span className="text-[10px] text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded font-medium shrink-0 ml-2">
                          + Lead
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleOpenNewModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Lead
            </button>
          </div>
        </div>

        {/* Tabela e Filtros */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          {/* Barra de Pesquisa e Filtros */}
          <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou telefone..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-zinc-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">Todos os Status</option>
                <option value="novo">Novos Leads</option>
                <option value="em_contato">Em Contato</option>
                <option value="negociacao">Negociação</option>
                <option value="fechado">Fechados</option>
                <option value="perdido">Perdidos</option>
              </select>
            </div>
          </div>

          {/* Tabela de Leads */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  <th className="p-4">Nome</th>
                  <th className="p-4">Telefone</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Origem</th>
                  <th className="p-4">Valor Estimado</th>
                  <th className="p-4">Data</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
                      Carregando leads do Supabase...
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-400">
                      Nenhum lead encontrado. Clique em "Novo Lead" ou "Importar WhatsApp" para começar.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-zinc-50/60 transition-colors group">
                      <td className="p-4 font-semibold text-zinc-900">{lead.name}</td>
                      <td className="p-4 text-zinc-600 font-mono text-xs">{lead.phone}</td>
                      <td className="p-4">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-semibold border',
                            statusColors[lead.status]
                          )}
                        >
                          {statusLabels[lead.status]}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-600 text-xs">{lead.source}</td>
                      <td className="p-4 text-zinc-900 font-medium font-mono text-xs">
                        {lead.value && lead.value > 0 ? formatCurrency(lead.value) : '-'}
                      </td>
                      <td className="p-4 text-zinc-500 text-xs">
                        {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <a
                          href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir no WhatsApp"
                          className="inline-flex p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleOpenEditModal(lead)}
                          title="Editar"
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          title="Excluir"
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal de Adicionar / Editar Lead */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-semibold text-zinc-900">
                {editingLead ? 'Editar Lead' : 'Cadastrar Novo Lead'}
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
                <label className="block text-xs font-medium text-zinc-700 mb-1">Valor Estimado (R$)</label>
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
                <label className="block text-xs font-medium text-zinc-700 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Anotações do contato..."
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
