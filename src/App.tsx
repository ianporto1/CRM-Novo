/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Conversas } from './components/Conversas';
import { Leads } from './components/Leads';
import { Pipeline } from './components/Pipeline';
import { AgenteIA } from './components/AgenteIA';
import { Configuracoes } from './components/Configuracoes';
import { TabType } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'conversas':
        return <Conversas />;
      case 'leads':
        return <Leads />;
      case 'pipeline':
        return <Pipeline />;
      case 'agente':
        return <AgenteIA />;
      case 'configuracoes':
        return <Configuracoes />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
}
