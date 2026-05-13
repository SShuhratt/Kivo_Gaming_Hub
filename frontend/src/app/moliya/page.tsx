'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import {
  type DebtRecord,
  type ServiceFinanceAssetRecord,
  type ServiceFinanceDetailsResponse,
  type ServiceFinanceSummary,
  useDashboard,
} from '@/context/dashboard-context';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, CheckCircle2 } from 'lucide-react';
import { getWarehouseUnitLabel } from '@/lib/warehouse-units';

const COLORS = ['#00ffff', '#00cccc', '#009999', '#006666', '#ff4444'];

const FinanceCard = ({
  title,
  value,
  icon: Icon,
  subValue,
  secondaryLabel,
  secondaryValue,
  onClick,
  isActive = false,
}: {
  title: string;
  value: string;
  icon: any;
  subValue?: string;
  secondaryLabel?: string;
  secondaryValue?: string;
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
        {secondaryLabel && secondaryValue ? (
          <div className="mt-3 rounded-2xl border border-white/5 bg-[#051111] px-4 py-3">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">{secondaryLabel}</p>
            <p className="mt-1 text-sm font-black text-primary">{secondaryValue}</p>
          </div>
        ) : null}
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

function formatDurationFromSeconds(totalSeconds: number) {
  const normalizedSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const seconds = normalizedSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function serviceAssetKey(asset: ServiceFinanceAssetRecord) {
  return String(asset.assetId ?? `${asset.roomName}:${asset.serviceName}:${asset.assetName}:${asset.assetOrder ?? 'n/a'}`);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);

    promise
      .then((result) => {
        window.clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function summarizeServiceAssets(assets: ServiceFinanceAssetRecord[]) {
  const uniqueSessions = new Map<number, ServiceFinanceAssetRecord['sessions'][number]>();

  for (const asset of assets) {
    for (const session of asset.sessions) {
      if (!uniqueSessions.has(session.tradeId)) {
        uniqueSessions.set(session.tradeId, session);
      }
    }
  }

  const totalDurationSeconds = Array.from(uniqueSessions.values()).reduce(
    (acc, session) => acc + session.durationSeconds,
    0,
  );

  return {
    totalDurationSeconds,
    totalDurationFormatted: formatDurationFromSeconds(totalDurationSeconds),
    totalIncome: assets.reduce((acc, asset) => acc + asset.totalIncome, 0),
    totalRecords: assets.length,
    totalSessionRecords: uniqueSessions.size,
  };
}

function matchesDateRange(value: string | null, startDate: string, endDate: string) {
  if (!startDate && !endDate) {
    return true;
  }

  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`);
    if (date < start) {
      return false;
    }
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`);
    if (date > end) {
      return false;
    }
  }

  return true;
}

function matchesSelectedPaymentType(
  sale: {
    cash: number;
    terminal: number;
    click: number;
    payme: number;
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
    case 'PAYME':
      return sale.payme > 0;
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
  const {
    sales,
    debts,
    isCheckingAuth,
    markDebtPaid,
    deleteDebt,
    getServiceFinanceSummary,
    getServiceFinanceDetails,
  } = useDashboard();
  const [activePanel, setActivePanel] = useState<'overview' | 'traded' | 'debts' | 'services'>('overview');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('BARCHA XONALAR');
  const [selectedType, setSelectedType] = useState('BARCHASI');
  const [appliedFilters, setAppliedFilters] = useState({
    room: 'BARCHA XONALAR',
    type: 'BARCHASI',
    startDate: '',
    endDate: '',
  });
  const [debtSearch, setDebtSearch] = useState('');
  const [debtStatus, setDebtStatus] = useState<'all' | 'active' | 'ended' | 'paid' | 'unpaid'>('all');
  const [tradedSearch, setTradedSearch] = useState('');
  const [tradedManufacturer, setTradedManufacturer] = useState('BARCHASI');
  const [tradedPaymentMethod, setTradedPaymentMethod] = useState('BARCHASI');
  const [serviceSummary, setServiceSummary] = useState<ServiceFinanceSummary | null>(null);
  const [serviceSummaryError, setServiceSummaryError] = useState<string | null>(null);
  const [isServiceSummaryLoading, setIsServiceSummaryLoading] = useState(true);
  const [serviceDetailsResponse, setServiceDetailsResponse] = useState<ServiceFinanceDetailsResponse | null>(null);
  const [serviceDetailsError, setServiceDetailsError] = useState<string | null>(null);
  const [isServiceDetailsLoading, setIsServiceDetailsLoading] = useState(false);
  const [hasRequestedServiceDetails, setHasRequestedServiceDetails] = useState(false);
  const [serviceStartDate, setServiceStartDate] = useState('');
  const [serviceEndDate, setServiceEndDate] = useState('');
  const [serviceRoomFilter, setServiceRoomFilter] = useState('BARCHASI');
  const [serviceAssetFilter, setServiceAssetFilter] = useState('BARCHASI');
  const [serviceNameFilter, setServiceNameFilter] = useState('BARCHASI');
  const [servicePaymentFilter, setServicePaymentFilter] = useState<'all' | 'paid' | 'debt'>('all');
  const [expandedAssetKeys, setExpandedAssetKeys] = useState<string[]>([]);

  const [debtToPay, setDebtToPay] = useState<string | null>(null);
  const [debtToDelete, setDebtToDelete] = useState<string | null>(null);
  const controlIds = {
    overviewStartDate: 'finance-overview-start-date',
    overviewEndDate: 'finance-overview-end-date',
    overviewRoom: 'finance-overview-room',
    overviewPaymentType: 'finance-overview-payment-type',
    tradedSearch: 'finance-traded-search',
    tradedManufacturer: 'finance-traded-manufacturer',
    tradedPaymentMethod: 'finance-traded-payment-method',
    tradedStartDate: 'finance-traded-start-date',
    tradedEndDate: 'finance-traded-end-date',
    serviceRoom: 'finance-service-room',
    serviceAsset: 'finance-service-asset',
    serviceName: 'finance-service-name',
    serviceStatus: 'finance-service-status',
    serviceStartDate: 'finance-service-start-date',
    serviceEndDate: 'finance-service-end-date',
    debtSearch: 'finance-debt-search',
    debtStatus: 'finance-debt-status',
  } as const;

  useEffect(() => {
    if (isCheckingAuth) {
      return;
    }

    let isMounted = true;

    setIsServiceSummaryLoading(true);
    setServiceSummaryError(null);

    withTimeout(
      getServiceFinanceSummary(),
      15000,
      "Xizmatlar summary so'rovi juda uzoq davom etdi.",
    )
      .then((summary) => {
        if (isMounted) {
          setServiceSummary(summary);
        }
      })
      .catch((error: any) => {
        if (isMounted) {
          setServiceSummaryError(error?.message || "Xizmatlar hisobotini yuklab bo'lmadi");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsServiceSummaryLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [getServiceFinanceSummary, isCheckingAuth]);

  useEffect(() => {
    if (isCheckingAuth || activePanel !== 'services' || hasRequestedServiceDetails || isServiceDetailsLoading) {
      return;
    }

    let isMounted = true;

    setHasRequestedServiceDetails(true);
    setIsServiceDetailsLoading(true);
    setServiceDetailsError(null);

    withTimeout(
      getServiceFinanceDetails(),
      15000,
      "Xizmatlar tafsilotlari so'rovi juda uzoq davom etdi.",
    )
      .then((detailsResponse) => {
        if (isMounted) {
          setServiceDetailsResponse(detailsResponse);
          setExpandedAssetKeys(
            detailsResponse.assets
              .slice(0, 3)
              .map(serviceAssetKey),
          );
        }
      })
      .catch((error: any) => {
        if (isMounted) {
          setServiceDetailsError(error?.message || "Xizmat tafsilotlarini yuklab bo'lmadi");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsServiceDetailsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activePanel, getServiceFinanceDetails, hasRequestedServiceDetails, isCheckingAuth, isServiceDetailsLoading]);

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const matchesRoom = appliedFilters.room === 'BARCHA XONALAR' || sale.room.includes(appliedFilters.room);
      const matchesType = appliedFilters.type === 'BARCHASI' || matchesSelectedPaymentType(sale, appliedFilters.type);
      const matchesDate = matchesDateRange(sale.dateTime, appliedFilters.startDate, appliedFilters.endDate);

      return matchesRoom && matchesType && matchesDate;
    });
  }, [sales, appliedFilters]);

  const soldItems = useMemo(
    () => sales.filter((sale) => sale.transactionType === 'product_sale'),
    [sales],
  );

  const soldItemSummary = useMemo(() => {
    return {
      totalAmount: soldItems.reduce((acc, item) => acc + item.total, 0),
      count: soldItems.length,
    };
  }, [soldItems]);

  const soldItemManufacturers = useMemo(
    () => ['BARCHASI', ...new Set(soldItems.map((item) => item.manufacturer).filter((value): value is string => Boolean(value)))],
    [soldItems],
  );

  const filteredSoldItems = useMemo(() => {
    const query = tradedSearch.trim().toLowerCase();

    return soldItems.filter((item) => {
      const matchesSearch =
        query === ''
        || [
          item.productName ?? '',
          item.manufacturer ?? '',
          item.referenceLabel,
          item.cashierName ?? '',
          item.barcode ?? '',
        ].some((value) => value.toLowerCase().includes(query));

      const matchesManufacturer =
        tradedManufacturer === 'BARCHASI'
        || item.manufacturer === tradedManufacturer;

      const matchesPaymentMethod =
        tradedPaymentMethod === 'BARCHASI'
        || item.paymentMethod === tradedPaymentMethod;

      const matchesDate = matchesDateRange(item.dateTime, startDate, endDate);

      return matchesSearch && matchesManufacturer && matchesPaymentMethod && matchesDate;
    });
  }, [soldItems, tradedSearch, tradedManufacturer, tradedPaymentMethod, startDate, endDate]);

  const serviceAssets = serviceDetailsResponse?.assets ?? [];

  const serviceRoomOptions = useMemo(
    () => ['BARCHASI', ...new Set(serviceAssets.map((asset) => asset.roomName).filter(Boolean))],
    [serviceAssets],
  );

  const serviceAssetOptions = useMemo(
    () => ['BARCHASI', ...new Set(serviceAssets.map((asset) => asset.assetName).filter(Boolean))],
    [serviceAssets],
  );

  const serviceNameOptions = useMemo(
    () => ['BARCHASI', ...new Set(serviceAssets.map((asset) => asset.serviceName).filter(Boolean))],
    [serviceAssets],
  );

  const filteredServiceAssets = useMemo(() => {
    return serviceAssets
      .filter((asset) => {
        const matchesRoom = serviceRoomFilter === 'BARCHASI' || asset.roomName === serviceRoomFilter;
        const matchesAsset = serviceAssetFilter === 'BARCHASI' || asset.assetName === serviceAssetFilter;
        const matchesService = serviceNameFilter === 'BARCHASI' || asset.serviceName === serviceNameFilter;

        return matchesRoom && matchesAsset && matchesService;
      })
      .map((asset) => {
        const filteredSessions = asset.sessions.filter((session) => {
          const matchesPayment =
            servicePaymentFilter === 'all'
            || session.paymentStatus === servicePaymentFilter;
          const matchesDate = matchesDateRange(session.completedAt, serviceStartDate, serviceEndDate);

          return matchesPayment && matchesDate;
        });
        const totalDurationSeconds = filteredSessions.reduce((acc, session) => acc + session.durationSeconds, 0);

        return {
          ...asset,
          totalDurationSeconds,
          totalDurationFormatted: formatDurationFromSeconds(totalDurationSeconds),
          totalIncome: filteredSessions.reduce((acc, session) => acc + session.amount, 0),
          sessions: filteredSessions,
        };
      })
      .filter((asset) => asset.sessions.length > 0);
  }, [
    serviceAssetFilter,
    serviceAssets,
    serviceEndDate,
    serviceNameFilter,
    servicePaymentFilter,
    serviceRoomFilter,
    serviceStartDate,
  ]);

  const filteredServiceSummary = useMemo(() => {
    return summarizeServiceAssets(filteredServiceAssets);
  }, [filteredServiceAssets]);

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
      totalAmount: debts.reduce((acc, record) => acc + record.remainingAmount, 0),
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
      startDate,
      endDate,
    });
  };

  const openServicesPanel = () => {
    setActivePanel('services');

    if (!isServiceDetailsLoading && serviceDetailsResponse === null) {
      setHasRequestedServiceDetails(false);
    }
  };

  const retryServiceDetailsLoad = () => {
    setServiceDetailsError(null);
    setServiceDetailsResponse(null);
    setExpandedAssetKeys([]);
    setHasRequestedServiceDetails(false);
    setActivePanel('services');
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
  const tradedPaymentOptions = [
    { value: 'BARCHASI', label: 'BARCHASI' },
    { value: 'cash', label: 'NAQD' },
    { value: 'terminal', label: 'TERMINAL' },
    { value: 'click', label: 'CLICK' },
    { value: 'payme', label: 'PAYME' },
  ];
  const servicePaymentOptions = [
    { value: 'all', label: 'BARCHASI' },
    { value: 'paid', label: "TO'LANGAN" },
    { value: 'debt', label: 'QARZ' },
  ];

  return (
    <DashboardLayout>
      <div className="animate-in fade-in space-y-8 duration-500">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <FinanceCard title="Jami savdo xarajatlari" value={`${stats.totalRevenue.toLocaleString()} UZS`} icon={DollarSign} />
          <FinanceCard
            title="Savdo qilingan"
            value={`${soldItemSummary.totalAmount.toLocaleString()} UZS`}
            icon={TrendingUp}
            subValue={soldItemSummary.count > 0 ? `${soldItemSummary.count} ta sotuv qatori` : "Kassa mahsulot savdolari"}
            onClick={() => setActivePanel('traded')}
            isActive={activePanel === 'traded'}
          />
          <FinanceCard title="Marjanalniy foyda" value={`${(stats.totalRevenue * 0.1).toLocaleString()} UZS`} icon={DollarSign} />
          <FinanceCard title="Sarflangan pul" value="0 UZS" icon={Wallet} />
          <FinanceCard
            title="Jami xizmat ko'rsatilgan vaqt (soat):"
            value={isServiceSummaryLoading ? '--:--:--' : serviceSummary?.totalDurationFormatted ?? '00:00:00'}
            icon={Clock}
            secondaryLabel="Jami olingan summa:"
            secondaryValue={isServiceSummaryLoading
              ? 'Yuklanmoqda...'
              : `${formatCurrency(serviceSummary?.totalIncome ?? 0)} so'm`}
            subValue={serviceSummaryError
              ? serviceSummaryError
              : serviceSummary?.totalRecords
                ? `${serviceSummary.totalRecords} ta asset bo'yicha`
                : "Ko'rsatilgan xizmatlar mavjud emas"}
            onClick={openServicesPanel}
            isActive={activePanel === 'services'}
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
            onClick={openServicesPanel}
            className={cn(
              'h-11 rounded-2xl px-6 text-[10px] font-black uppercase tracking-[0.25em]',
              activePanel === 'services'
                ? 'bg-primary text-black hover:bg-primary/90'
                : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
            )}
          >
            Xizmatlar
          </Button>
          <Button
            type="button"
            onClick={() => setActivePanel('traded')}
            className={cn(
              'h-11 rounded-2xl px-6 text-[10px] font-black uppercase tracking-[0.25em]',
              activePanel === 'traded'
                ? 'bg-primary text-black hover:bg-primary/90'
                : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
            )}
          >
            Savdo qilingan
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
                  <Label htmlFor={controlIds.overviewStartDate} className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Boshlanish sanasi</Label>
                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-white/5 bg-[#051111] px-4">
                    <CalendarIcon className="h-5 w-5 text-primary/40" />
                    <input
                      id={controlIds.overviewStartDate}
                      name="overview_start_date"
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="w-full appearance-none border-none bg-transparent text-[12px] font-bold text-white focus:ring-0"
                    />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor={controlIds.overviewEndDate} className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Tugash sanasi</Label>
                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-white/5 bg-[#051111] px-4">
                    <CalendarIcon className="h-5 w-5 text-primary/40" />
                    <input
                      id={controlIds.overviewEndDate}
                      name="overview_end_date"
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="w-full appearance-none border-none bg-transparent text-[12px] font-bold text-white focus:ring-0"
                    />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor={controlIds.overviewRoom} className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Xonani tanlang</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id={controlIds.overviewRoom}
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
                  <Label htmlFor={controlIds.overviewPaymentType} className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">To'lov turi</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id={controlIds.overviewPaymentType}
                        variant="outline"
                        className="h-14 w-full justify-between rounded-2xl border-white/5 bg-[#051111] px-5 text-[11px] font-black uppercase text-white/60 transition-all hover:bg-[#081818] hover:text-white"
                      >
                        {selectedType} <ChevronDown className="h-5 w-5 text-white/20" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[220px] rounded-2xl border-white/10 bg-[#0a1a1a] p-1 text-white shadow-2xl backdrop-blur-xl">
                      {['BARCHASI', 'NAQD', 'TERMINAL', 'CLICK', 'PAYME', 'QARZ'].map((type) => (
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
        ) : activePanel === 'traded' ? (
          <>
            <div className="space-y-6 rounded-[32px] border border-white/5 bg-[#0a1a1a]/40 p-8 backdrop-blur-md">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Savdo qilingan mahsulotlar</h2>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Kassa orqali sotilgan mahsulotlar ro'yxati
                  </p>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <p className="text-[8px] font-black uppercase tracking-widest text-primary/60">Jami</p>
                  <p className="mt-1 text-lg font-black text-white">{soldItemSummary.totalAmount.toLocaleString()} UZS</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-6">
                <div className="space-y-2.5 lg:col-span-2">
                  <Label htmlFor={controlIds.tradedSearch} className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                    Mahsulot yoki ishlab chiqaruvchi
                  </Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
                    <Input
                      id={controlIds.tradedSearch}
                      name="traded_search"
                      aria-label="Savdo qilingan mahsulot qidiruvi"
                      value={tradedSearch}
                      onChange={(event) => setTradedSearch(event.target.value)}
                      className="h-14 rounded-2xl border-white/5 bg-[#051111] pl-11 text-[12px] font-bold text-white"
                      placeholder="Mahsulot nomi, ishlab chiqaruvchi..."
                    />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor={controlIds.tradedManufacturer} className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Ishlab chiqaruvchi</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id={controlIds.tradedManufacturer}
                        variant="outline"
                        className="h-14 w-full justify-between rounded-2xl border-white/5 bg-[#051111] px-5 text-[11px] font-black uppercase text-white/60 transition-all hover:bg-[#081818] hover:text-white"
                      >
                        {tradedManufacturer}
                        <ChevronDown className="h-5 w-5 text-white/20" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[220px] rounded-2xl border-white/10 bg-[#0a1a1a] p-1 text-white shadow-2xl backdrop-blur-xl">
                      {soldItemManufacturers.map((manufacturer) => (
                        <DropdownMenuItem
                          key={manufacturer}
                          onClick={() => setTradedManufacturer(manufacturer)}
                          className="cursor-pointer rounded-xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest focus:bg-primary/10 focus:text-primary"
                        >
                          {manufacturer}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor={controlIds.tradedPaymentMethod} className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">To'lov usuli</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id={controlIds.tradedPaymentMethod}
                        variant="outline"
                        className="h-14 w-full justify-between rounded-2xl border-white/5 bg-[#051111] px-5 text-[11px] font-black uppercase text-white/60 transition-all hover:bg-[#081818] hover:text-white"
                      >
                        {tradedPaymentOptions.find((option) => option.value === tradedPaymentMethod)?.label ?? 'BARCHASI'}
                        <ChevronDown className="h-5 w-5 text-white/20" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[220px] rounded-2xl border-white/10 bg-[#0a1a1a] p-1 text-white shadow-2xl backdrop-blur-xl">
                      {tradedPaymentOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => setTradedPaymentMethod(option.value)}
                          className="cursor-pointer rounded-xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest focus:bg-primary/10 focus:text-primary"
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor={controlIds.tradedStartDate} className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Boshlanish sanasi</Label>
                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-white/5 bg-[#051111] px-4">
                    <CalendarIcon className="h-5 w-5 text-primary/40" />
                    <input
                      id={controlIds.tradedStartDate}
                      name="traded_start_date"
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="w-full appearance-none border-none bg-transparent text-[12px] font-bold text-white focus:ring-0"
                    />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor={controlIds.tradedEndDate} className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Tugash sanasi</Label>
                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-white/5 bg-[#051111] px-4">
                    <CalendarIcon className="h-5 w-5 text-primary/40" />
                    <input
                      id={controlIds.tradedEndDate}
                      name="traded_end_date"
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="w-full appearance-none border-none bg-transparent text-[12px] font-bold text-white focus:ring-0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[32px] border border-white/5 bg-[#0a1f1f]/60 shadow-2xl backdrop-blur-md">
              <Table>
                <TableHeader className="bg-[#0d1f1f]/50">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="h-10 px-5 text-[8px] font-black uppercase tracking-widest text-primary/60">Mahsulot</TableHead>
                    <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">Ishlab chiqaruvchi</TableHead>
                    <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">Miqdor</TableHead>
                    <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">Birlik narxi</TableHead>
                    <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">Jami</TableHead>
                    <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">Sana</TableHead>
                    <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">To'lov</TableHead>
                    <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">Kassir</TableHead>
                    <TableHead className="h-10 pr-5 text-right text-[8px] font-black uppercase tracking-widest text-primary/60">Chek</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSoldItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-12 text-center text-[10px] font-bold uppercase tracking-widest text-white/30">
                        {soldItems.length === 0 ? "Hozircha mahsulot savdolari yo'q" : "Filtr bo'yicha savdo topilmadi"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSoldItems.map((item) => (
                      <TableRow key={item.id} className="border-white/5 transition-colors hover:bg-white/5">
                        <TableCell className="px-5 py-4">
                          <p className="text-[11px] font-black uppercase tracking-tight text-white">
                            {item.productName ?? "Noma'lum"}
                          </p>
                          <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/35">
                            {item.barcode ?? item.referenceLabel}
                          </p>
                        </TableCell>
                        <TableCell className="py-4 text-[10px] font-bold text-white/70">
                          {item.manufacturer ?? '-'}
                        </TableCell>
                        <TableCell className="py-4 text-[10px] font-bold text-white/70">
                          {item.quantity ?? 0} {getWarehouseUnitLabel(item.unit)}
                        </TableCell>
                        <TableCell className="py-4 text-[10px] font-bold text-white/70">
                          {formatCurrency(item.unitPrice ?? 0)} UZS
                        </TableCell>
                        <TableCell className="py-4 text-[10px] font-black text-primary">
                          {formatCurrency(item.total)} UZS
                        </TableCell>
                        <TableCell className="py-4 text-[10px] font-bold text-white/70">
                          {formatDateTime(item.dateTime)}
                        </TableCell>
                        <TableCell className="py-4 text-[10px] font-bold text-white/70">
                          {item.paymentMethod === 'cash'
                            ? 'Naqd'
                            : item.paymentMethod === 'terminal'
                              ? 'Terminal'
                              : item.paymentMethod === 'click'
                                ? 'Click'
                                : 'Payme'}
                        </TableCell>
                        <TableCell className="py-4 text-[10px] font-bold text-white/70">
                          {item.cashierName ?? '-'}
                        </TableCell>
                        <TableCell className="py-4 pr-5 text-right text-[10px] font-bold text-white/45">
                          #{item.relatedSaleId ?? '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-4 border-t border-white/5 bg-[#051111] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Jami savdo:</span>
                  <span className="text-xs font-black uppercase tracking-tight text-primary">
                    {formatCurrency(filteredSoldItems.reduce((acc, item) => acc + item.total, 0))} UZS
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="border-primary/20 bg-primary/10 text-primary">
                    Qatorlar: {filteredSoldItems.length}
                  </Badge>
                </div>
              </div>
            </div>
          </>
        ) : activePanel === 'services' ? (
          <>
            <div className="space-y-6 rounded-[32px] border border-white/5 bg-[#0a1a1a]/40 p-8 backdrop-blur-md">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Ko'rsatilgan xizmatlar</h2>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Assetlar bo'yicha yakunlangan xizmat davomiyligi va olingan summa
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                    <p className="text-[8px] font-black uppercase tracking-widest text-primary/60">Jami xizmat ko'rsatilgan vaqt (soat):</p>
                    <p className="mt-1 text-lg font-black text-white">{filteredServiceSummary.totalDurationFormatted}</p>
                  </div>
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                    <p className="text-[8px] font-black uppercase tracking-widest text-primary/60">Jami olingan summa:</p>
                    <p className="mt-1 text-lg font-black text-white">{formatCurrency(filteredServiceSummary.totalIncome)} so'm</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-6">
                <div className="space-y-2.5">
                  <Label htmlFor={controlIds.serviceRoom} className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Xona</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id={controlIds.serviceRoom}
                        variant="outline"
                        className="h-14 w-full justify-between rounded-2xl border-white/5 bg-[#051111] px-5 text-[11px] font-black uppercase text-white/60 transition-all hover:bg-[#081818] hover:text-white"
                      >
                        {serviceRoomFilter}
                        <ChevronDown className="h-5 w-5 text-white/20" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[220px] rounded-2xl border-white/10 bg-[#0a1a1a] p-1 text-white shadow-2xl backdrop-blur-xl">
                      {serviceRoomOptions.map((room) => (
                        <DropdownMenuItem
                          key={room}
                          onClick={() => setServiceRoomFilter(room)}
                          className="cursor-pointer rounded-xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest focus:bg-primary/10 focus:text-primary"
                        >
                          {room}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor={controlIds.serviceAsset} className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Asset</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id={controlIds.serviceAsset}
                        variant="outline"
                        className="h-14 w-full justify-between rounded-2xl border-white/5 bg-[#051111] px-5 text-[11px] font-black uppercase text-white/60 transition-all hover:bg-[#081818] hover:text-white"
                      >
                        {serviceAssetFilter}
                        <ChevronDown className="h-5 w-5 text-white/20" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[220px] rounded-2xl border-white/10 bg-[#0a1a1a] p-1 text-white shadow-2xl backdrop-blur-xl">
                      {serviceAssetOptions.map((asset) => (
                        <DropdownMenuItem
                          key={asset}
                          onClick={() => setServiceAssetFilter(asset)}
                          className="cursor-pointer rounded-xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest focus:bg-primary/10 focus:text-primary"
                        >
                          {asset}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor={controlIds.serviceName} className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Xizmat</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id={controlIds.serviceName}
                        variant="outline"
                        className="h-14 w-full justify-between rounded-2xl border-white/5 bg-[#051111] px-5 text-[11px] font-black uppercase text-white/60 transition-all hover:bg-[#081818] hover:text-white"
                      >
                        {serviceNameFilter}
                        <ChevronDown className="h-5 w-5 text-white/20" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[220px] rounded-2xl border-white/10 bg-[#0a1a1a] p-1 text-white shadow-2xl backdrop-blur-xl">
                      {serviceNameOptions.map((serviceName) => (
                        <DropdownMenuItem
                          key={serviceName}
                          onClick={() => setServiceNameFilter(serviceName)}
                          className="cursor-pointer rounded-xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest focus:bg-primary/10 focus:text-primary"
                        >
                          {serviceName}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor={controlIds.serviceStatus} className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Holati</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id={controlIds.serviceStatus}
                        variant="outline"
                        className="h-14 w-full justify-between rounded-2xl border-white/5 bg-[#051111] px-5 text-[11px] font-black uppercase text-white/60 transition-all hover:bg-[#081818] hover:text-white"
                      >
                        {servicePaymentOptions.find((option) => option.value === servicePaymentFilter)?.label ?? 'BARCHASI'}
                        <ChevronDown className="h-5 w-5 text-white/20" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[220px] rounded-2xl border-white/10 bg-[#0a1a1a] p-1 text-white shadow-2xl backdrop-blur-xl">
                      {servicePaymentOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => setServicePaymentFilter(option.value as 'all' | 'paid' | 'debt')}
                          className="cursor-pointer rounded-xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest focus:bg-primary/10 focus:text-primary"
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor={controlIds.serviceStartDate} className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Boshlanish sanasi</Label>
                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-white/5 bg-[#051111] px-4">
                    <CalendarIcon className="h-5 w-5 text-primary/40" />
                    <input
                      id={controlIds.serviceStartDate}
                      name="service_start_date"
                      type="date"
                      value={serviceStartDate}
                      onChange={(event) => setServiceStartDate(event.target.value)}
                      className="w-full appearance-none border-none bg-transparent text-[12px] font-bold text-white focus:ring-0"
                    />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor={controlIds.serviceEndDate} className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Tugash sanasi</Label>
                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-white/5 bg-[#051111] px-4">
                    <CalendarIcon className="h-5 w-5 text-primary/40" />
                    <input
                      id={controlIds.serviceEndDate}
                      name="service_end_date"
                      type="date"
                      value={serviceEndDate}
                      onChange={(event) => setServiceEndDate(event.target.value)}
                      className="w-full appearance-none border-none bg-transparent text-[12px] font-bold text-white focus:ring-0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[32px] border border-white/5 bg-[#0a1f1f]/60 shadow-2xl backdrop-blur-md">
              <Table>
                <TableHeader className="bg-[#0d1f1f]/50">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="h-10 px-5 text-[8px] font-black uppercase tracking-widest text-primary/60">Asset</TableHead>
                    <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">Xona</TableHead>
                    <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">Xizmat</TableHead>
                    <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">Tartib</TableHead>
                    <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">Jami vaqt</TableHead>
                    <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">Jami daromad</TableHead>
                    <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">Sessionlar</TableHead>
                    <TableHead className="h-10 pr-5 text-right text-[8px] font-black uppercase tracking-widest text-primary/60">Tafsilot</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isServiceDetailsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-[10px] font-bold uppercase tracking-widest text-white/30">
                        Xizmat tafsilotlari yuklanmoqda...
                      </TableCell>
                    </TableRow>
                  ) : serviceDetailsError ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center">
                        <div className="space-y-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-red-300/70">
                            {serviceDetailsError}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={retryServiceDetailsLoad}
                            className="h-10 rounded-2xl border-white/10 bg-white/5 px-5 text-[10px] font-black uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white"
                          >
                            Qayta yuklash
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredServiceAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-[10px] font-bold uppercase tracking-widest text-white/30">
                        {serviceAssets.length === 0 ? "Ko'rsatilgan xizmatlar mavjud emas" : "Filtr bo'yicha xizmat topilmadi"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredServiceAssets.flatMap((asset) => {
                      const key = serviceAssetKey(asset);
                      const isExpanded = expandedAssetKeys.includes(key);

                      return [
                        <TableRow key={key} className="border-white/5 transition-colors hover:bg-white/5">
                          <TableCell className="px-5 py-4">
                            <p className="text-[11px] font-black uppercase tracking-tight text-white">{asset.assetName}</p>
                            <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/35">
                              {asset.assetId ? `Asset ID #${asset.assetId}` : "Asset ID yo'q"}
                            </p>
                          </TableCell>
                          <TableCell className="py-4 text-[10px] font-bold text-white/70">{asset.roomName}</TableCell>
                          <TableCell className="py-4 text-[10px] font-bold text-white/70">{asset.serviceName}</TableCell>
                          <TableCell className="py-4 text-[10px] font-bold text-white/70">
                            {asset.assetOrder ? `#${asset.assetOrder}` : '-'}
                          </TableCell>
                          <TableCell className="py-4 text-[10px] font-black text-primary">
                            {asset.totalDurationFormatted}
                          </TableCell>
                          <TableCell className="py-4 text-[10px] font-black text-primary">
                            {formatCurrency(asset.totalIncome)} so'm
                          </TableCell>
                          <TableCell className="py-4 text-[10px] font-bold text-white/70">
                            {asset.sessions.length} ta
                          </TableCell>
                          <TableCell className="py-4 pr-5 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setExpandedAssetKeys((current) => (
                                current.includes(key)
                                  ? current.filter((item) => item !== key)
                                  : [...current, key]
                              ))}
                              className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white"
                            >
                              <ChevronDown className={cn('mr-2 h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
                              {isExpanded ? 'Yopish' : 'Ochish'}
                            </Button>
                          </TableCell>
                        </TableRow>,
                        ...(isExpanded ? [
                          <TableRow key={`${key}-sessions`} className="border-white/5 bg-[#051111]">
                            <TableCell colSpan={8} className="px-5 py-5">
                              <div className="overflow-hidden rounded-2xl border border-white/5">
                                <Table>
                                  <TableHeader className="bg-[#081818]">
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                      <TableHead className="h-10 px-4 text-[8px] font-black uppercase tracking-widest text-primary/60">Session</TableHead>
                                      <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">Boshlanish</TableHead>
                                      <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">Tugash</TableHead>
                                      <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">Davomiylik</TableHead>
                                      <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">Summa</TableHead>
                                      <TableHead className="h-10 text-[8px] font-black uppercase tracking-widest text-primary/60">Holat</TableHead>
                                      <TableHead className="h-10 pr-4 text-right text-[8px] font-black uppercase tracking-widest text-primary/60">Yakunlangan</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {asset.sessions.map((session) => (
                                      <TableRow key={`${key}-${session.tradeId}`} className="border-white/5 hover:bg-white/5">
                                        <TableCell className="px-4 py-4">
                                          <p className="text-[10px] font-black text-white">{`Trade #${session.tradeId}`}</p>
                                          <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/35">
                                            {session.sessionId ? `Session #${session.sessionId}` : "Session yo'q"}
                                          </p>
                                          {session.debtorName ? (
                                            <p className="mt-2 text-[9px] font-bold text-white/45">
                                              {session.debtorName} {session.debtorPhone ? `• ${session.debtorPhone}` : ''}
                                            </p>
                                          ) : null}
                                        </TableCell>
                                        <TableCell className="py-4 text-[10px] font-bold text-white/70">{formatDateTime(session.startTime)}</TableCell>
                                        <TableCell className="py-4 text-[10px] font-bold text-white/70">{formatDateTime(session.endTime)}</TableCell>
                                        <TableCell className="py-4 text-[10px] font-black text-primary">{session.durationFormatted}</TableCell>
                                        <TableCell className="py-4 text-[10px] font-black text-primary">{formatCurrency(session.amount)} so'm</TableCell>
                                        <TableCell className="py-4">
                                          <Badge className={cn(
                                            'border uppercase tracking-widest',
                                            session.paymentStatus === 'paid'
                                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                              : 'border-amber-500/30 bg-amber-500/10 text-amber-200',
                                          )}>
                                            {session.paymentStatusLabel}
                                          </Badge>
                                          <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-white/35">
                                            {session.paymentMethodLabel}
                                          </p>
                                        </TableCell>
                                        <TableCell className="py-4 pr-4 text-right text-[10px] font-bold text-white/70">{formatDateTime(session.completedAt)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>,
                        ] : []),
                      ];
                    })
                  )}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-4 border-t border-white/5 bg-[#051111] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Jami xizmat:</span>
                  <span className="text-xs font-black uppercase tracking-tight text-primary">
                    {filteredServiceSummary.totalDurationFormatted}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Jami summa:</span>
                  <span className="text-xs font-black uppercase tracking-tight text-primary">
                    {formatCurrency(filteredServiceSummary.totalIncome)} so'm
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="border-primary/20 bg-primary/10 text-primary">
                    Assetlar: {filteredServiceSummary.totalRecords}
                  </Badge>
                  <Badge className="border-white/10 bg-white/5 text-white/70">
                    Sessionlar: {filteredServiceSummary.totalSessionRecords}
                  </Badge>
                </div>
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
                  <Label htmlFor={controlIds.debtSearch} className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                    Qarzdor qidiruvi
                  </Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
                    <Input
                      id={controlIds.debtSearch}
                      name="debt_search"
                      aria-label="Qarzdor qidiruvi"
                      value={debtSearch}
                      onChange={(event) => setDebtSearch(event.target.value)}
                      className="h-14 rounded-2xl border-white/5 bg-[#051111] pl-11 text-[12px] font-bold text-white"
                      placeholder="Ali yoki +99890..."
                    />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor={controlIds.debtStatus} className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Holati</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id={controlIds.debtStatus}
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
                      Amallar
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
                      const canDeleteDebt = record.canDelete && record.paymentState === 'paid' && record.remainingAmount === 0;

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
                          <TableCell className="py-4">
                            <p className="text-[10px] font-black text-amber-200">
                              {formatCurrency(record.remainingAmount)} so'm
                            </p>
                            {record.paymentState === 'paid' && (
                              <p className="mt-1 text-[8px] font-bold text-white/40 line-through">
                                {formatCurrency(record.originalAmount)} so'm
                              </p>
                            )}
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
                            <div className="flex items-center justify-end gap-2">
                              {record.paymentState === 'unpaid' ? (
                                <Button
                                  onClick={() => setDebtToPay(record.id)}
                                  size="sm"
                                  className="h-8 rounded-lg bg-emerald-500/10 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/20"
                                >
                                  <CheckCircle2 className="mr-1.5 h-3 w-3" />
                                  To'landi
                                </Button>
                              ) : null}

                              {canDeleteDebt ? (
                                <Button
                                  onClick={() => setDebtToDelete(record.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 rounded-lg bg-red-500/10 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/20"
                                >
                                  <Trash2 className="mr-1.5 h-3 w-3" />
                                  O'chirish
                                </Button>
                              ) : null}
                            </div>
                            <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-white/35">
                              {record.source === 'trade' ? `Trade ID #${record.tradeId}` : `Session ID #${record.sessionId ?? '-'}`}
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
                    {formatCurrency(filteredDebts.reduce((acc, record) => acc + record.remainingAmount, 0))} UZS
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

            {/* Pay Debt Dialog */}
            <AlertDialog open={!!debtToPay} onOpenChange={(open) => !open && setDebtToPay(null)}>
              <AlertDialogContent className="border-emerald-500/20 bg-[#0a1a1a]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Qarz to'langanini tasdiqlaysizmi?</AlertDialogTitle>
                  <AlertDialogDescription className="text-white/60">
                    Qarz holati "To'landi" bo'lib o'zgaradi. Tasdiqlaysizmi? (Do you confirm the debt is paid back?)
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white">
                    Bekor qilish
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async (e) => {
                      e.preventDefault();
                      if (debtToPay) {
                        try {
                          await markDebtPaid(debtToPay);
                          setDebtToPay(null);
                        } catch (error: any) {
                          alert(error?.message || 'Xatolik yuz berdi');
                        }
                      }
                    }}
                    className="bg-emerald-500 text-white hover:bg-emerald-600"
                  >
                    Tasdiqlash
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Delete Debt Dialog */}
            <AlertDialog open={!!debtToDelete} onOpenChange={(open) => !open && setDebtToDelete(null)}>
              <AlertDialogContent className="border-red-500/20 bg-[#0a1a1a]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">To'langan qarzni ro'yxatdan o'chirishni xohlaysizmi?</AlertDialogTitle>
                  <AlertDialogDescription className="text-white/60">
                    Bu to'langan qarz Debtors/Qarzlar ro'yxatidan butunlay olib tashlanadi. (Do you want to permanently remove this paid debt from the debtors list?)
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white">
                    Bekor qilish
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async (e) => {
                      e.preventDefault();
                      if (debtToDelete) {
                        try {
                          await deleteDebt(debtToDelete);
                          setDebtToDelete(null);
                        } catch (error: any) {
                          alert(error?.message || 'Xatolik yuz berdi');
                        }
                      }
                    }}
                    className="bg-red-500 text-white hover:bg-red-600"
                  >
                    O'chirish
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
