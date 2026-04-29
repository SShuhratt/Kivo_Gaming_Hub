'use client';

import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useDashboard } from '@/context/dashboard-context';
import { 
  Filter, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export default function SavdoPage() {
  const { sales, isCheckingAuth } = useDashboard();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSales = useMemo(() => {
    return sales.filter(sale => 
      sale.room.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sales, searchTerm]);

  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, curr) => acc + curr.total, 0);
  }, [filteredSales]);

  if (isCheckingAuth) return null;

  const formatCurrency = (val: number) => {
    return val > 0 ? val.toLocaleString() : '0';
  };

  return (
    <DashboardLayout>
      <div className="animate-in fade-in duration-500 space-y-4">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a1a1a]/40 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black text-white uppercase tracking-tight">Savdo ({filteredSales.length})</h2>
            <div className="h-3 w-px bg-white/10 mx-1" />
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-primary/40" />
              <Input 
                placeholder="Qidirish..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 bg-[#051111] border-white/5 text-[10px] font-bold text-white rounded-lg focus:border-primary/40"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-8 border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-primary/70 hover:text-primary rounded-lg">
              <Download className="mr-2 h-3 w-3" /> Eksport
            </Button>
            <Button className="h-8 bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-black rounded-lg px-3 transition-all">
              <Filter className="mr-2 h-3 w-3" /> Filtrlash
            </Button>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-[#0a1a1a]/60 border border-white/5 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#0d1f1f]/50">
                <TableRow className="hover:bg-transparent border-white/5">
                  <TableHead className="text-[8px] font-black text-primary/60 uppercase tracking-widest h-8 px-4">Xona nomi</TableHead>
                  <TableHead className="text-[8px] font-black text-primary/60 uppercase tracking-widest h-8">Tarif</TableHead>
                  <TableHead className="text-[8px] font-black text-primary/60 uppercase tracking-widest h-8">Boshlanish</TableHead>
                  <TableHead className="text-[8px] font-black text-primary/60 uppercase tracking-widest h-8">Tugash</TableHead>
                  <TableHead className="text-[8px] font-black text-primary/60 uppercase tracking-widest h-8">Xizmat</TableHead>
                  <TableHead className="text-[8px] font-black text-primary/60 uppercase tracking-widest h-8">Mahsulot</TableHead>
                  <TableHead className="text-[8px] font-black text-primary/60 uppercase tracking-widest h-8">Jami</TableHead>
                  <TableHead className="text-[8px] font-black text-primary/60 uppercase tracking-widest h-8">Naqd</TableHead>
                  <TableHead className="text-[8px] font-black text-primary/60 uppercase tracking-widest h-8 text-center">Terminal</TableHead>
                  <TableHead className="text-[8px] font-black text-primary/60 uppercase tracking-widest h-8 text-center">Click</TableHead>
                  <TableHead className="text-[8px] font-black text-primary/60 uppercase tracking-widest h-8 text-center">Payme</TableHead>
                  <TableHead className="text-[8px] font-black text-primary/60 uppercase tracking-widest h-8 text-center">Qarz</TableHead>
                  <TableHead className="text-[8px] font-black text-primary/60 uppercase tracking-widest h-8 text-right pr-4">To'langan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-10 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                      SAVDO MA'LUMOTLARI MAVJUD EMAS
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((row) => (
                    <TableRow key={row.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                      <TableCell className="text-[10px] font-bold text-white py-2 px-4 uppercase tracking-tight">{row.room}</TableCell>
                      <TableCell className="text-[10px] font-medium text-white/60">{formatCurrency(row.basePrice)}</TableCell>
                      <TableCell className="text-[9px] font-medium text-white/40">{row.start}</TableCell>
                      <TableCell className="text-[9px] font-medium text-white/40">{row.end}</TableCell>
                      <TableCell className="text-[10px] font-bold text-white/80">{formatCurrency(row.serviceCost)}</TableCell>
                      <TableCell className="text-[10px] font-bold text-white/80">{formatCurrency(row.products)}</TableCell>
                      <TableCell className="text-[10px] font-black text-primary">{formatCurrency(row.total)}</TableCell>
                      <TableCell className="text-[10px] font-medium text-white/60">{formatCurrency(row.cash)}</TableCell>
                      <TableCell className="text-[10px] font-medium text-white/40 text-center">{formatCurrency(row.terminal)}</TableCell>
                      <TableCell className="text-[10px] font-medium text-white/40 text-center">{formatCurrency(row.click)}</TableCell>
                      <TableCell className="text-[10px] font-medium text-white/40 text-center">{formatCurrency(row.payme)}</TableCell>
                      <TableCell className={cn(
                        "text-[10px] font-bold text-center",
                        row.debt > 0 ? "text-destructive" : "text-white/20"
                      )}>{formatCurrency(row.debt)}</TableCell>
                      <TableCell className="text-[10px] font-black text-white text-right pr-4">{formatCurrency(row.paid)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Table Footer Summary */}
          <div className="bg-[#051111] p-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Jami tushum:</span>
              <div className="flex items-center gap-2">
                 <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_5px_#00ffff]" />
                 <span className="text-xs font-black text-primary uppercase tracking-tight">{formatCurrency(totalRevenue)} UZS</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-primary rounded-lg">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[9px] font-black text-primary">1</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-primary rounded-lg">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Info Helper */}
        <div className="flex items-center justify-center gap-2 opacity-20">
          <CalendarIcon className="h-2.5 w-2.5 text-primary" />
          <span className="text-[7px] font-black text-white uppercase tracking-[0.4em]">Kivo Sales Protocol Active</span>
        </div>
      </div>
    </DashboardLayout>
  );
}
