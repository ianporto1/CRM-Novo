import { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Users, MessageSquare, Target, DollarSign, RefreshCw, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import { DashboardStats } from '../types';
import { getDashboardStatsFromSupabase } from '../lib/supabaseService';
import { fetchInstanceStatus, InstanceConnectionState } from '../lib/evolution';
import { cn } from '../lib/utils';

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = 'zinc' 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: any; 
  color?: 'emerald' | 'blue' | 'purple' | 'amber' | 'zinc'; 
}) {
  const iconColor = {
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    zinc: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  }[color];

  return (
    <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <span className="text-zinc-500 font-medium text-xs uppercase tracking-wider">{title}</span>
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border", iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-bold text-zinc-900 tracking-tight">{value}</h3>
        {subtitle && <p className="text-zinc-500 text-xs font-medium mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

const FUNNEL_COLORS = ['#3b82f6', '#f59e0b', '#a855f7', '#10b981', '#ef4444'];

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [evolutionStatus, setEvolutionStatus] = useState<InstanceConnectionState>({ state: 'unknown' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    const [dbStats, evoStatus] = await Promise.all([
      getDashboardStatsFromSupabase(),
      fetchInstanceStatus(),
    ]);

    setStats(dbStats);
    setEvolutionStatus(evoStatus);
    setLoading(false);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const funnelChartData = stats ? [
    { name: 'Novos', count: stats.leadsByStatus.novo || 0 },
    { name: 'Em Contato', count: stats.leadsByStatus.em_contato || 0 },
    { name: 'Negociação', count: stats.leadsByStatus.negociacao || 0 },
    { name: 'Fechados', count: stats.leadsByStatus.fechado || 0 },
    { name: 'Perdidos', count: stats.leadsByStatus.perdido || 0 },
  ] : [];

  return (
    <div className="p-8 h-full overflow-y-auto bg-zinc-50/50">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900">Dashboard de Performance</h2>
            <p className="text-zinc-500 mt-1">Métricas em tempo real integradas ao Supabase e Evolution API.</p>
          </div>

          <button
            onClick={loadDashboardData}
            title="Atualizar Dados"
            className="p-2 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-lg text-zinc-600 transition-colors shadow-sm flex items-center gap-2 text-xs font-medium"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Atualizar Métricas
          </button>
        </div>

        {/* Status Conexão WhatsApp Banner */}
        <div className={cn(
          "p-4 rounded-xl border flex items-center justify-between text-sm transition-all",
          evolutionStatus.state === 'open' 
            ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
            : "bg-amber-50/80 border-amber-200 text-amber-900"
        )}>
          <div className="flex items-center gap-3">
            <Smartphone className={cn("w-5 h-5", evolutionStatus.state === 'open' ? "text-emerald-600" : "text-amber-600")} />
            <div>
              <p className="font-semibold text-xs uppercase tracking-wider">Evolution API - Status do Dispositivo</p>
              <p className="text-xs font-medium mt-0.5">
                {evolutionStatus.state === 'open' 
                  ? `Conectado via ${evolutionStatus.profileName || evolutionStatus.ownerJid || 'Instância WhatsApp'}`
                  : 'Instância desconectada ou pendente. Configure a conexão na aba Configurações.'}
              </p>
            </div>
          </div>

          <span className={cn(
            "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border",
            evolutionStatus.state === 'open'
              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
              : "bg-amber-100 text-amber-800 border-amber-300"
          )}>
            {evolutionStatus.state === 'open' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                WhatsApp Online
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                WhatsApp Offline
              </>
            )}
          </span>
        </div>

        {/* Cards de Métricas (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Leads Cadastrados" 
            value={stats?.totalLeads ?? 0} 
            subtitle="Persistidos no Supabase"
            icon={Users} 
            color="blue"
          />
          <StatCard 
            title="Mensagens Registradas" 
            value={stats?.totalMessages ?? 0} 
            subtitle="Histórico total de interações"
            icon={MessageSquare} 
            color="emerald"
          />
          <StatCard 
            title="Taxa de Conversão" 
            value={`${stats?.conversionRate ?? 0}%`} 
            subtitle="Leads com vendas fechadas"
            icon={Target} 
            color="purple"
          />
          <StatCard 
            title="Valor no Pipeline" 
            value={formatCurrency(stats?.totalPipelineValue ?? 0)} 
            subtitle="Soma do valor estimado"
            icon={DollarSign} 
            color="amber"
          />
        </div>

        {/* Seção de Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Gráfico 1: Volume de Interações Diárias */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-between">
            <div className="mb-6">
              <h3 className="text-base font-semibold text-zinc-900">Volume de Interações Diárias</h3>
              <p className="text-xs text-zinc-500 mt-1">Total de conversas e novos leads ao longo dos últimos 7 dias.</p>
            </div>
            
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.dailyInteractions || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#18181b', fontSize: '13px', fontWeight: 500 }}
                  />
                  <Area type="monotone" dataKey="messages" name="Mensagens" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMessages)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Distribuição Funil de Vendas */}
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-between">
            <div className="mb-6">
              <h3 className="text-base font-semibold text-zinc-900">Distribuição no Funil</h3>
              <p className="text-xs text-zinc-500 mt-1">Quantidade de leads por etapa do Pipeline.</p>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7' }}
                    itemStyle={{ color: '#18181b', fontSize: '13px', fontWeight: 500 }}
                  />
                  <Bar dataKey="count" name="Leads" radius={[6, 6, 0, 0]}>
                    {funnelChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
