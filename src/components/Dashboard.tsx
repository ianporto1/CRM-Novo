import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, MessageSquare, Target, Zap } from 'lucide-react';

const data = [
  { name: 'Seg', leads: 4, messages: 120 },
  { name: 'Ter', leads: 7, messages: 150 },
  { name: 'Qua', leads: 5, messages: 180 },
  { name: 'Qui', leads: 12, messages: 210 },
  { name: 'Sex', leads: 9, messages: 170 },
  { name: 'Sáb', leads: 3, messages: 80 },
  { name: 'Dom', leads: 2, messages: 50 },
];

function StatCard({ title, value, icon: Icon, trend }: { title: string, value: string, icon: any, trend: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-zinc-500 font-medium text-sm">{title}</span>
        <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-700">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-semibold text-zinc-900">{value}</h3>
        <p className="text-emerald-600 text-sm font-medium mt-1">{trend}</p>
      </div>
    </div>
  );
}

export function Dashboard() {
  return (
    <div className="p-8 h-full overflow-y-auto bg-zinc-50/50">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Dashboard</h2>
          <p className="text-zinc-500 mt-1">Visão geral do seu atendimento no WhatsApp.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Leads Capturados (Semana)" value="42" icon={Users} trend="+12% vs última semana" />
          <StatCard title="Mensagens Trocadas" value="960" icon={MessageSquare} trend="+5% vs última semana" />
          <StatCard title="Taxa de Conversão" value="18%" icon={Target} trend="+2.1% vs última semana" />
          <StatCard title="I.A. Resoluções" value="340" icon={Zap} trend="+18% vs última semana" />
        </div>

        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-medium text-zinc-900 mb-6">Volume de Interações</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#18181b', fontSize: '14px', fontWeight: 500 }}
                />
                <Area type="monotone" dataKey="messages" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorMessages)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
