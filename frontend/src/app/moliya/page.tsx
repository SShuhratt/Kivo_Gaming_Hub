'use client';

import React, { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useDashboard } from '@/context/dashboard-context';
import { 
  Calendar as CalendarIcon, 
  Search, 
  DollarSign, 
  Clock, 
  ArrowRightLeft, 
  Wallet, 
  TrendingUp,
  PieChart as PieIcon,
  ChevronDown,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip
} from 'recharts';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

const COLORS = ['#00ffff', '#00cccc', '#009999', '#006666', '#ff4444'];

const FinanceCard = ({ title, value, icon: Icon, subValue }: { title: string, value: string, icon: any, subValue?: string }) => (
  <Card className="bg-[#0a1f1f]/60 border-white/5 shadow-xl backdrop-blur-md hover:border-primary/20 transition-all rounded-[28px] overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-6">
      <CardTitle className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em]">{title}</CardTitle>
      <div className="h-8 w-8 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,255,0.05)]">
        <Icon className="h-4 w-4 text-primary" />
      </div>
    </CardHeader>
    <CardContent className="p-6 pt-0">
      <div className="text-2xl font-black text-white tracking-tighter">{value}</div>
      {subValue && (
        <div className="mt-2 flex items-center gap-2">
           <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
           <p className="text-[9px] font-black text-primary/60 uppercase tracking-[0.2em]">{subValue}</p>
        </div>
      )}
    </CardContent>
  </Card>
);

const RoomFinanceCard = ({ room, data }: { room: string, data: any }) => (
  <Card className="bg-[#0a1f1f]/40 border-white/5 hover:border-primary/30 transition-all rounded-2xl overflow-hidden">
    <CardContent className="p-5 space-y-4">
      <h3 className="text-sm font-black text-white uppercase tracking-tight border-b border-white/5 pb-2">{room}</h3>
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
          <span className="text-white/40">Savdo:</span>
          <span className="text-white">{data.savdo.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
          <span className="text-white/40">Xizmat:</span>
          <span className="text-white">{data.xizmat.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
          <span className="text-white/40">To'langan:</span>
          <span className="text-primary">{data.paid.toLocaleString()}</span>
        </div>
      </div>
      <div className="pt-2 border-t border-white/5 space-y-1">
        {data.cash > 0 && (
          <p className="text-[9px] font-black text-white/60">NAQD: {data.cash.toLocaleString()} UZS</p>
        )}
        {data.terminal > 0 && (
          <p className="text-[9px] font-black text-white/60">TERMINAL: {data.terminal.toLocaleString()} UZS</p>
        )}
        {data.click > 0 && (
          <p className="text-[9px] font-black text-white/60">CLICK: {data.click.toLocaleString()} UZS</p>
        )}
      </div>
    </CardContent>
  </Card>
);

export default function MoliyaPage() {
  const { sales, isCheckingAuth } = useDashboard();
  
  // Filtrlash state-lari
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('BARCHA XONALAR');
  const [selectedType, setSelectedType] = useState('BARCHASI');
  const [appliedFilters, setAppliedFilters] = useState({
    room: 'BARCHA XONALAR',
    type: 'BARCHASI'
  });

  // Filtrlangan savdolar
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesRoom = appliedFilters.room === 'BARCHA XONALAR' || sale.room.includes(appliedFilters.room);
      return matchesRoom;
    });
  }, [sales, appliedFilters]);

  // Moliyaviy hisob-kitoblar (filtrlangan ma'lumotlar asosida)
  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, curr) => acc + curr.total, 0);
    const totalService = filteredSales.reduce((acc, curr) => acc + curr.serviceCost, 0);
    const totalProducts = filteredSales.reduce((acc, curr) => acc + curr.products, 0);
    const totalDebt = filteredSales.reduce((acc, curr) => acc + curr.debt, 0);
    const totalPaid = filteredSales.reduce((acc, curr) => acc + curr.paid, 0);
    
    const roomStats: Record<string, any> = {};
    filteredSales.forEach(sale => {
      if (!roomStats[sale.room]) {
        roomStats[sale.room] = { savdo: 0, xizmat: 0, paid: 0, cash: 0, terminal: 0, click: 0 };
      }
      roomStats[sale.room].savdo += sale.products;
      roomStats[sale.room].xizmat += sale.serviceCost;
      roomStats[sale.room].paid += sale.paid;
      roomStats[sale.room].cash += sale.cash;
      roomStats[sale.room].terminal += sale.terminal;
      roomStats[sale.room].click += sale.click;
    });

    const paymentMethods = [
      { name: 'Naqd', value: filteredSales.reduce((acc, curr) => acc + curr.cash, 0) },
      { name: 'Terminal', value: filteredSales.reduce((acc, curr) => acc + curr.terminal, 0) },
      { name: 'Click', value: filteredSales.reduce((acc, curr) => acc + curr.click, 0) },
      { name: 'Payme', value: filteredSales.reduce((acc, curr) => acc + curr.payme, 0) },
      { name: 'Qarz', value: filteredSales.reduce((acc, curr) => acc + curr.debt, 0) },
    ].filter(m => m.value > 0);

    return {
      totalRevenue,
      totalService,
      totalProducts,
      totalDebt,
      totalPaid,
      roomStats,
      paymentMethods
    };
  }, [filteredSales]);

  const handleSearch = () => {
    setAppliedFilters({
      room: selectedRoom,
      type: selectedType
    });
  };

  if (isCheckingAuth) return null;

  const roomOptions = ['BARCHA XONALAR', ...new Set(sales.map(s => s.room))];

  return (
    <DashboardLayout>
      <div className="animate-in fade-in duration-500 space-y-8">
        
        {/* Filtrlar paneli */}
        <div className="bg-[#0a1a1a]/40 p-8 rounded-[32px] border border-white/5 backdrop-blur-md space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2.5">
               <Label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-1">Boshlanish sanasi</Label>
               <div className="flex items-center gap-3 bg-[#051111] border border-white/5 rounded-2xl px-4 h-14">
                <CalendarIcon className="h-5 w-5 text-primary/40" />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none text-[12px] font-bold text-white focus:ring-0 w-full appearance-none" 
                />
              </div>
            </div>
            <div className="space-y-2.5">
               <Label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-1">Tugash sanasi</Label>
               <div className="flex items-center gap-3 bg-[#051111] border border-white/5 rounded-2xl px-4 h-14">
                <CalendarIcon className="h-5 w-5 text-primary/40" />
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none text-[12px] font-bold text-white focus:ring-0 w-full appearance-none" 
                />
              </div>
            </div>
            
            <div className="space-y-2.5">
              <Label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-1">Xonani tanlang</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full h-14 bg-[#051111] border-white/5 text-[11px] font-black text-white/60 uppercase justify-between px-5 rounded-2xl hover:bg-[#081818] hover:text-white transition-all">
                    {selectedRoom} <ChevronDown className="h-5 w-5 text-white/20" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#0a1a1a] border-white/10 text-white min-w-[220px] rounded-2xl p-1 shadow-2xl backdrop-blur-xl">
                  {roomOptions.map((room) => (
                    <DropdownMenuItem key={room} onClick={() => setSelectedRoom(room)} className="text-[10px] font-black uppercase tracking-widest py-3.5 px-5 focus:bg-primary/10 focus:text-primary rounded-xl cursor-pointer">
                      {room}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2.5">
              <Label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-1">To'lov turi</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full h-14 bg-[#051111] border-white/5 text-[11px] font-black text-white/60 uppercase justify-between px-5 rounded-2xl hover:bg-[#081818] hover:text-white transition-all">
                    {selectedType} <ChevronDown className="h-5 w-5 text-white/20" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#0a1a1a] border-white/10 text-white min-w-[220px] rounded-2xl p-1 shadow-2xl backdrop-blur-xl">
                  {['BARCHASI', 'NAQD', 'TERMINAL', 'CLICK', 'QARZ'].map((type) => (
                    <DropdownMenuItem key={type} onClick={() => setSelectedType(type)} className="text-[10px] font-black uppercase tracking-widest py-3.5 px-5 focus:bg-primary/10 focus:text-primary rounded-xl cursor-pointer">
                      {type}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex justify-start pt-2">
            <Button 
              onClick={handleSearch}
              className="h-14 bg-primary text-black font-black uppercase tracking-[0.3em] text-[12px] px-12 rounded-2xl shadow-[0_12px_40px_rgba(0,255,255,0.4)] hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-3"
            >
              <Search className="h-5 w-5" /> QIDIRISH
            </Button>
          </div>
        </div>

        {/* Moliyaviy ko'rsatkichlar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FinanceCard title="Jami savdo xarajatlari" value={`${stats.totalRevenue.toLocaleString()} UZS`} icon={DollarSign} />
          <FinanceCard title="Savdo qilingan" value={`${stats.totalProducts.toLocaleString()} UZS`} icon={TrendingUp} />
          <FinanceCard title="Marjanalniy foyda" value={`${(stats.totalRevenue * 0.1).toLocaleString()} UZS`} icon={DollarSign} />
          <FinanceCard title="Sarflangan pul" value="0 UZS" icon={Wallet} />
          
          <FinanceCard 
            title="Ko'rsatilgan xizmat soati va olingan summasi" 
            value={`${stats.totalService.toLocaleString()} UZS`} 
            icon={Clock}
            subValue="HISOBOT"
          />
          <FinanceCard title="Qaytarilgan mahsulotlar" value="0 UZS" icon={ArrowRightLeft} />
          <FinanceCard title="Qarzlar" value={`${stats.totalDebt.toLocaleString()} UZS`} icon={Wallet} />
          <FinanceCard title="Qarzlarimiz" value="0 UZS" icon={Wallet} />
        </div>

        {/* Xona ma'lumotlari va Grafik */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-[11px] font-black text-white/40 uppercase tracking-[0.4em] pl-1">Xonalar bo'yicha tahlil</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {Object.entries(stats.roomStats).length === 0 ? (
                <div className="col-span-2 h-[220px] border border-dashed border-white/5 rounded-[32px] flex items-center justify-center text-white/10 text-[10px] font-black uppercase tracking-widest bg-white/5">
                  Ma'lumotlar mavjud emas
                </div>
              ) : (
                Object.entries(stats.roomStats).map(([room, data]) => (
                  <RoomFinanceCard key={room} room={room} data={data} />
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-[11px] font-black text-white/40 uppercase tracking-[0.4em] pl-1">Sotuv uslubi</h2>
            <Card className="bg-[#0a1f1f]/60 border-white/5 shadow-xl backdrop-blur-md h-[420px] flex flex-col overflow-hidden rounded-[32px]">
              <CardContent className="flex-1 p-8 flex flex-col items-center justify-center">
                <div className="h-[220px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.paymentMethods.length > 0 ? stats.paymentMethods : [{ name: 'NOMA\'LUM', value: 1 }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {stats.paymentMethods.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        {stats.paymentMethods.length === 0 && <Cell fill="#1a2a2a" />}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#051111', border: '1px solid rgba(0,255,255,0.1)', borderRadius: '16px' }}
                        itemStyle={{ color: '#00ffff', fontSize: '11px', fontWeight: 'black', textTransform: 'uppercase' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                     <PieIcon className="h-8 w-8 text-primary opacity-20" />
                  </div>
                </div>

                <div className="w-full space-y-4 mt-8">
                  {stats.paymentMethods.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: COLORS[index % COLORS.length], color: COLORS[index % COLORS.length] }} />
                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest group-hover:text-white transition-colors">{entry.name}</span>
                      </div>
                      <span className="text-[11px] font-black text-white bg-white/5 px-2.5 py-1 rounded-lg">
                        {((entry.value / (stats.totalRevenue || 1)) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                  {stats.paymentMethods.length === 0 && (
                     <p className="text-[10px] text-center text-white/20 font-black uppercase tracking-widest py-6">Hozircha ma'lumot yo'q</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
