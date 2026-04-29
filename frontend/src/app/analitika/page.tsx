'use client';

import React from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';

export default function AnalitikaPage() {
  return (
    <DashboardLayout>
      <div className="animate-in fade-in duration-500 space-y-8">
       
        <div className="rounded-3xl border border-dashed border-white/5 h-[400px] flex items-center justify-center bg-[#061414]/20">
          <p className="text-[10px] font-black text-[#444f4f] uppercase tracking-[0.5em]">Tez kunda...</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
