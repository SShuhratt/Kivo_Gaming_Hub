'use client';

import React from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useDashboard } from '@/context/dashboard-context';
import { Monitor, Database, History, TrendingUp } from 'lucide-react';

export default function AsosiyPage() {
  const { summary, isCheckingAuth } = useDashboard();

  if (isCheckingAuth) return null;

  const stats = [
    { label: 'Faol seanslar', value: summary.activeSessions.toString(), change: 'LIVE TRACKING', icon: Monitor },
    { label: 'Xonalar soni', value: summary.roomsCount.toString(), change: 'STABLE CONNECTION', icon: Database },
    { label: 'Tariflar', value: summary.pendingSessions.toString(), change: 'AVAILABLE PACKAGES', icon: History },
    { label: 'Bugungi tushum', value: `${summary.salesTotalToday.toLocaleString()} UZS`, change: 'DAILY REVENUE', icon: TrendingUp },
  ];

  return (
    <DashboardLayout>
      <div className="animate-in fade-in duration-500 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((card, idx) => (
            <div key={idx} className="bg-[#0a1a1a] border border-white/5 p-4 rounded-xl relative overflow-hidden group hover:border-primary/30 transition-all shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-0.5">
                  <p className="text-[8px] font-black text-[#667070] uppercase tracking-[0.2em]">{card.label}</p>
                  <h3 className="text-xl font-black text-white tracking-tighter">{card.value}</h3>
                </div>
                <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/5 border border-primary/20">
                  <card.icon className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[7px] font-black text-primary uppercase tracking-[0.2em]">
                <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                {card.change}
              </div>
            </div>
          ))}
        </div>
        
        <div className="rounded-2xl border border-dashed border-white/5 h-[250px] flex items-center justify-center bg-[#061414]/20">
          <p className="text-[9px] font-black text-[#444f4f] uppercase tracking-[0.5em]">Analitika grafigi tez kunda...</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
