import { LayoutDashboard, MessageSquare, Users, Kanban, Bot, Settings } from 'lucide-react';
import { TabType } from '../types';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'conversas', label: 'Conversas', icon: MessageSquare },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'pipeline', label: 'Pipeline', icon: Kanban },
  { id: 'agente', label: 'Agente de I.A', icon: Bot },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
] as const;

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <aside className="w-64 bg-zinc-950 text-zinc-400 flex flex-col h-screen border-r border-zinc-800 shrink-0">
      <div className="p-6">
        <h1 className="text-xl font-medium text-zinc-50 flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-emerald-500 text-zinc-950 flex items-center justify-center font-bold">W</div>
          WhatsCRM
        </h1>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm font-medium",
                isActive 
                  ? "bg-zinc-800/80 text-zinc-50" 
                  : "hover:bg-zinc-900 hover:text-zinc-100"
              )}
            >
              <Icon className="w-[18px] h-[18px]" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-zinc-800 text-xs text-zinc-600">
        Pronto para Vercel & Supabase
      </div>
    </aside>
  );
}
