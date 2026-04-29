'use client';

import React, { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useDashboard } from '@/context/dashboard-context';
import {
  Receipt,
  Calendar as CalendarIcon,
  Zap,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Gamepad2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function toLocalDateTimeValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

export default function BandQilishPage() {
  const { tariffs, assets, calculateBooking, createBooking, isCheckingAuth } = useDashboard();
  const { toast } = useToast();

  const [selectedTariffId, setSelectedTariffId] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [startTime, setStartTime] = useState(() => toLocalDateTimeValue(new Date()));
  const [endTime, setEndTime] = useState(() => toLocalDateTimeValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [status, setStatus] = useState<'submitted' | 'debt_closed'>('submitted');
  const [debtName, setDebtName] = useState('');
  const [debtPhoneNumber, setDebtPhoneNumber] = useState('');
  const [calculation, setCalculation] = useState<{ durationMinutes: number; totalCost: number } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assetsByRoom = useMemo(() => {
    const groups = new Map<string, typeof assets>();

    for (const asset of assets) {
      const key = asset.roomNumber;
      const current = groups.get(key) ?? [];
      groups.set(key, [...current, asset]);
    }

    return Array.from(groups.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [assets]);

  const selectedTariff = tariffs.find((tariff) => tariff.id === selectedTariffId) ?? null;

  if (isCheckingAuth) return null;

  const toggleAsset = (assetId: string) => {
    setSelectedAssetIds((current) =>
      current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId]
    );
  };

  const handleCalculate = async () => {
    if (!selectedTariff) {
      toast({
        variant: 'destructive',
        title: "Tarif tanlanmagan",
        description: "Hisoblash uchun tarifni tanlang.",
      });
      return;
    }

    if (selectedAssetIds.length === 0) {
      toast({
        variant: 'destructive',
        title: "Jihoz tanlanmagan",
        description: "Kamida bitta asset tanlang.",
      });
      return;
    }

    try {
      setIsCalculating(true);
      const result = await calculateBooking({
        tariffId: selectedTariff.backendId,
        assetIds: selectedAssetIds
          .map((assetId) => assets.find((asset) => asset.id === assetId)?.backendId)
          .filter((value): value is number => Boolean(value)),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });

      setCalculation(result);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: "Hisoblashda xatolik",
        description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCreateBooking = async () => {
    if (!selectedTariff) {
      return;
    }

    if (status === 'debt_closed' && (!debtName || !debtPhoneNumber)) {
      toast({
        variant: 'destructive',
        title: "Qarz ma'lumotlari yetarli emas",
        description: "Qarzga yopish uchun ism va telefon raqamini kiriting.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await createBooking({
        tariffId: selectedTariff.backendId,
        assetIds: selectedAssetIds
          .map((assetId) => assets.find((asset) => asset.id === assetId)?.backendId)
          .filter((value): value is number => Boolean(value)),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        status,
        debtName: status === 'debt_closed' ? debtName : undefined,
        debtPhoneNumber: status === 'debt_closed' ? debtPhoneNumber : undefined,
      });

      setCalculation(null);
      setSelectedAssetIds([]);
      setDebtName('');
      setDebtPhoneNumber('');
      toast({
        title: "Booking yaratildi",
        description: "Seans backend bazasiga muvaffaqiyatli saqlandi.",
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: "Booking yaratilmadi",
        description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="space-y-6">
            <section className="bg-[#0a1f1f]/50 border border-white/5 rounded-3xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/5 border border-primary/20">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">Tarifni tanlang</h2>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Backend tariflari bilan booking yarating</p>
                </div>
              </div>

              {tariffs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/5 min-h-[180px] flex items-center justify-center bg-[#061414]/20">
                  <p className="text-[10px] font-black text-[#444f4f] uppercase tracking-[0.5em]">Tariflar mavjud emas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tariffs.map((tariff) => (
                    <button
                      key={tariff.id}
                      onClick={() => setSelectedTariffId(tariff.id)}
                      className={cn(
                        'rounded-2xl border p-5 text-left transition-all bg-[#081616]',
                        selectedTariffId === tariff.id ? 'border-primary shadow-[0_0_25px_rgba(0,255,255,0.15)]' : 'border-white/5 hover:border-primary/20'
                      )}
                    >
                      <p className="text-[9px] font-black text-primary/50 uppercase tracking-widest">Tarif #{tariff.backendId}</p>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight mt-2">{tariff.name}</h3>
                      <p className="text-lg font-black text-primary mt-3">{tariff.hourlyPrice.toLocaleString()} UZS</p>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-[#0a1f1f]/50 border border-white/5 rounded-3xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/5 border border-primary/20">
                  <Monitor className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">Jihozlarni tanlang</h2>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Booking bir yoki bir nechta assetga ulanadi</p>
                </div>
              </div>

              {assetsByRoom.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/5 min-h-[180px] flex items-center justify-center bg-[#061414]/20">
                  <p className="text-[10px] font-black text-[#444f4f] uppercase tracking-[0.5em]">Avval jihoz yarating</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assetsByRoom.map(([roomNumber, roomAssets]) => (
                    <div key={roomNumber} className="rounded-2xl border border-white/5 bg-[#081616] p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Xona {roomNumber}</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {roomAssets.map((asset) => (
                          <button
                            key={asset.id}
                            onClick={() => toggleAsset(asset.id)}
                            className={cn(
                              'rounded-xl border p-4 text-left transition-all',
                              selectedAssetIds.includes(asset.id) ? 'border-primary bg-primary/10' : 'border-white/5 bg-[#051111] hover:border-primary/20'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10">
                                  {asset.category === 'Computer' ? <Monitor className="h-4 w-4 text-primary" /> : <Gamepad2 className="h-4 w-4 text-primary" />}
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-white uppercase tracking-tight">{asset.category}</p>
                                  <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest">Asset #{asset.backendId}</p>
                                </div>
                              </div>
                              {selectedAssetIds.includes(asset.id) && (
                                <Badge className="bg-primary text-black font-black">Tanlandi</Badge>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-[#0a1f1f]/50 border border-white/5 rounded-3xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/5 border border-primary/20">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">Booking ma'lumotlari</h2>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Vaqt oralig'i va to'lov holati</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Boshlanish vaqti</Label>
                  <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Tugash vaqti</Label>
                  <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm" />
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Yopish turi</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setStatus('submitted')}
                      className={cn(
                        'h-12 rounded-xl border font-black uppercase tracking-widest text-[10px] transition-all',
                        status === 'submitted' ? 'bg-primary text-black border-primary' : 'bg-[#051111] border-white/5 text-white/60'
                      )}
                    >
                      TO'LANGAN
                    </button>
                    <button
                      onClick={() => setStatus('debt_closed')}
                      className={cn(
                        'h-12 rounded-xl border font-black uppercase tracking-widest text-[10px] transition-all',
                        status === 'debt_closed' ? 'bg-destructive text-white border-destructive' : 'bg-[#051111] border-white/5 text-white/60'
                      )}
                    >
                      QARZ
                    </button>
                  </div>
                </div>

                {status === 'debt_closed' && (
                  <div className="space-y-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Qarz ma'lumotlari</span>
                    </div>
                    <Input placeholder="Mijoz ismi" value={debtName} onChange={(e) => setDebtName(e.target.value)} className="h-11 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm" />
                    <Input placeholder="+998 90 123 45 67" value={debtPhoneNumber} onChange={(e) => setDebtPhoneNumber(e.target.value)} className="h-11 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm" />
                  </div>
                )}
              </div>
            </section>

            <section className="bg-[#0a1f1f]/50 border border-white/5 rounded-3xl p-6 space-y-5 shadow-xl">
              <div className="rounded-2xl border border-primary/10 bg-primary/5 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Hisob-kitob</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Davomiyligi</p>
                    <p className="text-xl font-black text-white mt-2">{calculation?.durationMinutes ?? 0} min</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Jami</p>
                    <p className="text-xl font-black text-primary mt-2">{(calculation?.totalCost ?? 0).toLocaleString()} UZS</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button disabled={isCalculating} onClick={() => void handleCalculate()} className="h-12 bg-white/5 hover:bg-primary hover:text-black border border-white/10 text-white font-black uppercase tracking-[0.2em] rounded-xl transition-all">
                  HISOBLASH
                </Button>
                <Button disabled={isSubmitting} onClick={() => void handleCreateBooking()} className="h-12 bg-primary text-black font-black uppercase tracking-[0.2em] rounded-xl shadow-[0_10px_30px_rgba(0,255,255,0.2)] hover:bg-primary/90 transition-all">
                  SAQLASH <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
