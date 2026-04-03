import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './sidebar';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className="flex-1 overflow-auto">
        <div className="p-6 md:p-8 max-w-7xl mx-auto"><Outlet /></div>
      </main>
    </div>
  );
}
