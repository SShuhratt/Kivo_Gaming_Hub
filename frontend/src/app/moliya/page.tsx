'use client';

import React, { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { type DebtRecord, useDashboard } from '@/context/dashboard-context';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const COLORS = ['#00ffff', '#00cccc', '#009999', '#006666', '#ff4444'];

const FinanceCard = ({
  title,
  value,
  icon: Icon,
  subValue,
  onClick,
  isActive = false,
}: {
  title: string;
  value: string;
  icon: any;
  subValue?: string;
  onClick?: () => void;
  isActive?: boolean;
}) => {
  const isInteractive = typeof onClick === 'function';

  return (
    <Card
      onClick={onClick}
      onKeyDown={(event) => {
        if (!isInteractive) {
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      className={cn(
        'overflow-hidden rounded-[28px] border border-white/5 bg-[#0a1f1f]/60 shadow-xl backdrop-blur-md transition-all',
        isInteractive && 'cursor-pointer hover:border-primary/25',
        isActive && 'border-primary/30 bg-primary/5',
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40">
          {title}
        </CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 shadow-[0_0_15px_rgba(0,255,255,0.05)]">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="text-2xl font-black tracking-tighter text-white">{value}</div>
        {subValue ? (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">{subValue}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

const RoomFinanceCard = ({ room, data }: { room: string; data: any }) => (
  <Card className="overflow-hidden rounded-2xl border border-white/5 bg-[#0a1f1f]/40 transition-all hover:border-primary/30">
    <CardContent className="space-y-4 p-5">
      <h3 className="border-b border-white/5 pb-2 text-sm font-black uppercase tracking-tight text-white">{room}</h3>
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
      <div className="space-y-1 border-t border-white/5 pt-2">
        {data.cash > 0 ? <p className="text-[9px] font-black text-white/60">NAQD: {data.cash.toLocaleString()} UZS</p> : null}
        {data.terminal > 0 ? <p className="text-[9px] font-black text-white/60">TERMINAL: {data.terminal.toLocaleString()} UZS</p> : null}
        {data.click > 0 ? <p className="text-[9px] font-black text-white/60">CLICK: {data.click.toLocaleString()} UZS</p> : null}
      </div>
    </CardContent>
  </Card>
);

function formatDateTime(value: string | null) {
  if (!value) {
    return "Noma'lum";
  }

  return new Date(value).toLocaleString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value: number) {
  return value > 0 ? value.toLocaleString() : '0';
}

function matchesSelectedPaymentType(
  sale: {
    cash: number;
    terminal: number;
    click: number;
    debt: number;
  },
  filter: string,
) {
  switch (filter) {
    case 'NAQD':
      return sale.cash > 0;
    case 'TERMINAL':
      return sale.terminal > 0;
    case 'CLICK':
      return sale.click > 0;
    case 'QARZ':
      return sale.debt > 0;
    default:
      return true;
  }
}

function getDebtStatusLabel(record: DebtRecord) {
  return {
    session: record.sessionState === 'active' ? 'Aktiv' : 'Yakunlangan',
    payment: record.paymentState === 'paid' ? "To'langan" : "To'lanmagan",
  };
}

function resolveDebtDisplayDate(record: DebtRecord) {
  if (record.sessionState === 'ended') {
    return record.endTime ?? record.sessionDate ?? record.createdAt;
  }

  return record.sessionDate ?? record.startTime ?? record.createdAt;
}

export default function MoliyaPage() {
  const { sales, debts, isCheckingAuth } = useDashboard();
  const [activePanel, setActivePanel] = useState<'overview' | 'debts'>('overview');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('BARCHA XONALAR');
  const [selectedType, setSelectedType] = useState('BARCHASI');
  const [appliedFilters, setAppliedFilters] = useState({
    room: 'BARCHA XONALAR',
    type: 'BARCHASI',
  });
  const [debtSearch, setDebtSearch] = useState('');
  const [debtStatus, setDebtStatus] = useState<'all' | 'active' | 'ended' | 'paid' | 'unpaid'>('all');

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const matchesRoom = appliedFilters.room === 'BARCHA XONALAR' || sale.room.includes(appliedFilters.room);
      const matchesType = appliedFilters.type === 'BARCHASI' || matchesSelectedPaymentType(sale, appliedFilters.type);

      return matchesRoom && matchesType;
    });
  }, [sales, appliedFilters]);

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, curr) => acc + curr.total, 0);
    const totalService = filteredSales.reduce((acc, curr) => acc + curr.serviceCost, 0);
    const totalProducts = filteredSales.reduce((acc, curr) => acc + curr.products, 0);
    const totalDebt = filteredSales.reduce((acc, curr) => acc + curr.debt, 0);

    const roomStats: Record<string, any> = {};
    filteredSales.forEach((sale) => {
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
    ].filter((method) => method.value > 0);

    return {
      totalRevenue,
      totalService,
      totalProducts,
      totalDebt,
      roomStats,
      paymentMethods,
    };
  }, [filteredSales]);

  const debtSummary = useMemo(() => {
    return {
      totalAmount: debts.reduce((acc, record) => acc + record.finalCost, 0),
      activeCount: debts.filter((record) => record.sessionState === 'active').length,
      unpaidCount: debts.filter((record) => record.paymentState === 'unpaid').length,
    };
  }, [debts]);

  const filteredDebts = useMemo(() => {
    const query = debtSearch.trim().toLowerCase();

    return debts.filter((record) => {
      const matchesSearch =
        query === '' ||
        [
          record.debtorName ?? '',
          record.debtorPhoneNumber ?? '',
          record.roomLabel,
          record.referenceLabel,
        ].some((value) => value.toLowerCase().includes(query));

      const matchesStatus =
        debtStatus === 'all' ||
        (debtStatus === 'active' && record.sessionState === 'active') ||
        (debtStatus === 'ended' && record.sessionState === 'ended') ||
        (debtStatus === 'paid' && record.paymentState === 'paid') ||
        (debtStatus === 'unpaid' && record.paymentState === 'unpaid');

      return matchesSearch && matchesStatus;
    });
  }, [debtSearch, debtStatus, debts]);

  const handleSearch = () => {
    setAppliedFilters({
      room: selectedRoom,
      type: selectedType,
    });
  };

  if (isCheckingAuth) return null;

  const roomOptions = ['BARCHA XONALAR', ...new Set(sales.map((sale) => sale.room))];
  const debtStatusOptions: Array<{ value: 'all' | 'active' | 'ended' | 'paid' | 'unpaid'; label: string }> = [
    { value: 'all', label: 'BARCHASI' },
    { value: 'active', label: 'AKTIV' },
    { value: 'ended', label: 'YAKUNLANGAN' },
    { value: 'unpaid', label: "TO'LANMAGAN" },
    { value: 'paid', label: "TO'LANGAN" },
  ];

  return (
    <DashboardLayout>
      <div className="animate-in fade-in space-y-8 duration-500">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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
          <FinanceCard
            title="Qarzlar"
            value={`${debtSummary.totalAmount.toLocaleString()} UZS`}
            icon={Wallet}
            subValue={debts.length > 0 ? `${debts.length} yozuv` : "Qarzlar bo'limi"}
            onClick={() => setActivePanel('debts')}
            isActive={activePanel === 'debts'}
          />
          <FinanceCard title="Qarzlarimiz" value="0 UZS" icon={Wallet} />
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-[28px] border border-white/5 bg-[#0a1a1a]/40 p-3 backdrop-blur-md">
          <Button
            type="button"
            onClick={() => setActivePanel('overview')}
            className={cn(
              'h-11 rounded-2xl px-6 text-[10px] font-black uppercase tracking-[0.25em]',
              activePanel === 'overview'
                ? 'bg-primary text-black hover:bg-primary/90'
                : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
            )}
          >
            Umumiy tahlil
          </Button>
          <Button
            type="button"
            onClick={() => setActivePanel('debts')}
            className={cn(
              'h-11 rounded-2xl px-6 text-[10px] font-black uppercase tracking-[0.25em]',
              activePanel === 'debts'
                ? 'bg-primary text-black hover:bg-primary/90'
                : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
            )}
          >
            Debts / Qarzlar
          </Button>
        </div>

        {activePanel === 'overview' ? (
          <>
            <div className="space-y-6 rounded-[32px] border border-white/5 bg-[#0a1a1a]/40 p-8 backdrop-blur-md">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2.5">
                  <Label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Boshlanish sanasi</Label>
                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-white/5 bg-[#051111] px-4">
                    <CalendarIcon className="h-5 w-5 text-primary/40" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="w-full appearance-none border-none bg-transparent text-[12px] font-bold text-white focus:ring-0"
                    />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <Label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Tugash sanasi</Label>
                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-white/5 bg-[#051111] px-4">
                    <CalendarIcon className="h-5 w-5 text-primary/40" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="w-full appearance-none border-none bg-transparent text-[12px] font-bold text-white focus:ring-0"
                    />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <Label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Xonani tanlang</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-14 w-full justify-between rounded-2xl border-white/5 bg-[#051111] px-5 text-[11px] font-black uppercase text-white/60 transition-all hover:bg-[#081818] hover:text-white"
                      >
                        {selectedRoom} <ChevronDown className="h-5 w-5 text-white/20" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[220px] rounded-2xl border-white/10 bg-[#0a1a1a] p-1 text-white shadow-2xl backdrop-blur-xl">
                      {roomOptions.map((room) => (
                        <DropdownMenuItem
                          key={room}
                          onClick={() => setSelectedRoom(room)}
                          className="cursor-pointer rounded-xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest focus:bg-primary/10 focus:text-primary"
                        >
                          {room}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-2.5">
                  <Label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">To'lov turi</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-14 w-full justify-between rounded-2xl border-white/5 bg-[#051111] px-5 text-[11px] font-black uppercase text-white/60 transition-all hover:bg-[#081818] hover:text-white"
                      >
                        {selectedType} <ChevronDown className="h-5 w-5 text-white/20" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[220px] rounded-2xl border-white/10 bg-[#0a1a1a] p-1 text-white shadow-2xl backdrop-blur-xl">
                      {['BARCHASI', 'NAQD', 'TERMINAL', 'CLICK', 'QARZ'].map((type) => (
                        <DropdownMenuItem
                          key={type}
                          onClick={() => setSelectedType(type)}
                          className="cursor-pointer rounded-xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest focus:bg-primary/10 focus:text-primary"
                        >
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
                  className="flex h-14 items-center gap-3 rounded-2xl bg-primary px-12 text-[12px] font-black uppercase tracking-[0.3em] text-black shadow-[0_12px_40px_rgba(0,255,255,0.4)] transition-all hover:bg-primary/90 active:scale-95"
                >
                  <Search className="h-5 w-5" /> QIDIRISH
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <h2 className="pl-1 text-[11px] font-black uppercase tracking-[0.4em] text-white/40">Xonalar bo'yicha tahlil</h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {Object.entries(stats.roomStats).length === 0 ? (
                    <div className="col-span-2 flex h-[220px] items-center justify-center rounded-[32px] border border-dashed border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/10">
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
                <h2 className="pl-1 text-[11px] font-black uppercase tracking-[0.4em] text-white/40">Sotuv uslubi</h2>
                <Card className="flex h-[420px] flex-col overflow-hidden rounded-[32px] border-white/5 bg-[#0a1f1f]/60 shadow-xl backdrop-blur-md">
                  <CardContent className="flex flex-1 flex-col items-center justify-center p-8">
                    <div className="relative h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.paymentMethods.length > 0 ? stats.paymentMethods : [{ name: "NOMA'LUM", value: 1 }]}
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
                            {stats.paymentMethods.length === 0 ? <Cell fill="#1a2a2a" /> : null}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#051111', border: '1px solid rgba(0,255,255,0.1)', borderRadius: '16px' }}
                            itemStyle={{ color: '#00ffff', fontSize: '11px', fontWeight: 'black', textTransform: 'uppercase' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <PieIcon className="h-8 w-8 opacity-20 text-primary" />
                      </div>
                    </div>

                    <div className="mt-8 w-full space-y-4">
                      {stats.paymentMethods.map((entry, index) => (
                        <div key={entry.name} className="group flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_currentColor]"
                              style={{ backgroundColor: COLORS[index % COLORS.length], color: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/60 transition-colors group-hover:text-white">
                              {entry.name}
                            </span>
                          </div>
                          <span className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-black text-white">
                            {((entry.value / (stats.totalRevenue || 1)) * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                      {stats.paymentMethods.length === 0 ? (
                        <p className="py-6 text-center text-[10px] font-black uppercase tracking-widest text-white/20">
                          Hozircha ma'lumot yo'q
                        </p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-6 rounded-[32px] border border-white/5 bg-[#0a1a1a]/40 p-8 backdrop-blur-md">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Qarzlar ro'yxati</h2>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Qarzdor ismi, telefon raqami va holati bo'yicha qidirish mumkin
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                    <p className="text-[8px] font-black uppercase tracking-widest text-primary/60">Aktiv</p>
                    <p className="mt-1 text-lg font-black text-white">{debtSummary.activeCount}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <p className="text-[8px] font-black uppercase tracking-widest text-amber-200/70">To'lanmagan</p>
                    <p className="mt-1 text-lg font-black text-white">{debtSummary.unpaidCount}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2.5">
                  <Label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                    Qarzdor qidiruvi
                  </Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
                    <Input
                      aria-label="Qarzdor qidiruvi"
                      value={debtSearch}
                      onChange={(event) => setDebtSearch(event.target.value)}
                      className="h-14 rounded-2xl border-white/5 bg-[#051111] pl-11 text-[12px] font-bold text-white"
                      placeholder="Ali yoki +99890..."
                    />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <Label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Holati</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-14 w-full justify-between rounded-2xl border-white/5 bg-[#051111] px-5 text-[11px] font-black uppercase text-white/60 transition-all hover:bg-[#081818] hover:text-white"
                      >
                        {debtStatusOptions.find((option) => option.value === debtStatus)?.label ?? 'BARCHASI'}
                        <ChevronDown className="h-5 w-5 text-white/20" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[220px] rounded-2xl border-white/10 bg-[#0a1a1a] p-1 text-white shadow-2xl backdrop-blur-xl">
                      {debtStatusOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => setDebtStatus(option.value)}
                          className="cursor-pointer rounded-xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest focus:bg-primary/10 focus:text-primary"
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[32px] border border-white/5 bg-[#0a1f1f]/60 shadow-2xl backdrop-blur-md">
              <Table>
                <TableHeader className="bg-[#0d1f1f]/50">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="h-10 px-5 text-[8px] font-black uppercase tracking-widest text-primary/60">
                      Qarzdor
                    </TableHead>
                    <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">
                      Telefon
                    </TableHead>
                    <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">
                      Qarz summasi
                    </TableHead>
                    <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">
                      Holati
                    </TableHead>
                    <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">
                      Sana
                    </TableHead>
                    <TableHead className="h-10 pr-5 text-right text-[8px] font-black uppercase tracking-widest text-primary/60">
                      Bog'liq yozuv
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDebts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-[10px] font-bold uppercase tracking-widest text-white/30">
                        {debts.length === 0 ? "Hozircha qarzlar yo'q" : 'Filtr bo\'yicha qarz topilmadi'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDebts.map((record) => {
                      const statusLabel = getDebtStatusLabel(record);

                      return (
                        <TableRow key={record.id} className="border-white/5 transition-colors hover:bg-white/5">
                          <TableCell className="px-5 py-4">
                            <p className="text-[11px] font-black uppercase tracking-tight text-white">
                              {record.debtorName ?? "Noma'lum"}
                            </p>
                            <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/35">
                              {record.roomLabel}
                            </p>
                          </TableCell>
                          <TableCell className="py-4 text-[10px] font-bold text-white/70">
                            {record.debtorPhoneNumber ?? '-'}
                          </TableCell>
                          <TableCell className="py-4 text-[10px] font-black text-amber-200">
                            {formatCurrency(record.finalCost)} so'm
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-wrap gap-2">
                              <Badge className={cn(
                                'border uppercase tracking-widest',
                                record.sessionState === 'active'
                                  ? 'border-primary/30 bg-primary/10 text-primary'
                                  : 'border-white/10 bg-white/5 text-white/70',
                              )}>
                                {statusLabel.session}
                              </Badge>
                              <Badge className={cn(
                                'border uppercase tracking-widest',
                                record.paymentState === 'paid'
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                  : 'border-amber-500/30 bg-amber-500/10 text-amber-200',
                              )}>
                                {statusLabel.payment}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-[10px] font-bold text-white/70">
                            {formatDateTime(resolveDebtDisplayDate(record))}
                          </TableCell>
                          <TableCell className="py-4 pr-5 text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white">
                              {record.referenceLabel}
                            </p>
                            <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/35">
                              {record.source === 'trade' && record.tradeId ? `Trade ID #${record.tradeId}` : `Session ID #${record.sessionId ?? '-'}`}
                            </p>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-4 border-t border-white/5 bg-[#051111] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Jami qarz:</span>
                  <span className="text-xs font-black uppercase tracking-tight text-amber-200">
                    {formatCurrency(filteredDebts.reduce((acc, record) => acc + record.finalCost, 0))} UZS
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="border-primary/20 bg-primary/10 text-primary">
                    Aktiv: {filteredDebts.filter((record) => record.sessionState === 'active').length}
                  </Badge>
                  <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">
                    To'lanmagan: {filteredDebts.filter((record) => record.paymentState === 'unpaid').length}
                  </Badge>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
