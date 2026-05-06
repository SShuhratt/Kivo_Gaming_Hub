'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ServicesSetupCallout } from '@/components/services-setup-callout';
import { useDashboard } from '@/context/dashboard-context';
import { AlertCircle, Calendar as CalendarIcon, Crown, Monitor, Receipt, Timer, Zap } from 'lucide-react';
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

function formatDateTimePreview(value: string | null) {
  if (!value) {
    return 'VIP / Open-ended';
  }

  return new Date(value).toLocaleString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const durationOptions = [0.5, 1, 2, 2.5, 3];

export default function BandQilishPage() {
  const { assets, servicesReady, calculateBooking, createBooking, isCheckingAuth } = useDashboard();
  const { toast } = useToast();

  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [startTime, setStartTime] = useState(() => toLocalDateTimeValue(new Date()));
  const [durationHoursInput, setDurationHoursInput] = useState('1');
  const [isVip, setIsVip] = useState(false);
  const [status, setStatus] = useState<'submitted' | 'debt_closed'>('submitted');
  const [debtName, setDebtName] = useState('');
  const [debtPhoneNumber, setDebtPhoneNumber] = useState('');
  const [calculation, setCalculation] = useState<Awaited<ReturnType<typeof calculateBooking>> | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assetsByRoom = useMemo(() => {
    const groups = new Map<string, typeof assets>();

    for (const asset of assets) {
      const key = asset.roomNumber || 'Xona N/A';
      const current = groups.get(key) ?? [];
      groups.set(key, [...current, asset]);
    }

    return Array.from(groups.entries()).sort((left, right) => left[0].localeCompare(right[0]));
  }, [assets]);

  const selectedAssets = assets.filter((asset) => selectedAssetIds.includes(asset.id));
  const parsedDurationHours = Number(durationHoursInput);

  const localEndTimePreview = useMemo(() => {
    if (isVip || !Number.isFinite(parsedDurationHours) || parsedDurationHours <= 0 || !startTime) {
      return null;
    }

    return new Date(new Date(startTime).getTime() + parsedDurationHours * 60 * 60 * 1000).toISOString();
  }, [durationHoursInput, isVip, parsedDurationHours, startTime]);

  if (isCheckingAuth) return null;

  const toggleAsset = (assetId: string) => {
    if (!servicesReady) {
      return;
    }

    setSelectedAssetIds((current) =>
      current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId]
    );
  };

  useEffect(() => {
    if (!servicesReady) {
      setSelectedAssetIds([]);
      setCalculation(null);
      setCalculationError(null);
      return;
    }

    if (selectedAssetIds.length === 0 || !startTime) {
      setCalculation(null);
      setCalculationError(null);
      return;
    }

    if (!isVip && (!Number.isFinite(parsedDurationHours) || parsedDurationHours <= 0)) {
      setCalculation(null);
      setCalculationError(null);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          setIsCalculating(true);
          const result = await calculateBooking({
            assetIds: selectedAssetIds
              .map((assetId) => assets.find((asset) => asset.id === assetId)?.backendId)
              .filter((value): value is number => Boolean(value)),
            startTime: new Date(startTime).toISOString(),
            durationHours: isVip ? undefined : parsedDurationHours,
            isVip,
          });

          if (!cancelled) {
            setCalculation(result);
            setCalculationError(null);
          }
        } catch (error) {
          if (!cancelled) {
            setCalculation(null);
            setCalculationError(error instanceof Error ? error.message : "So'rov bajarilmadi.");
          }
        } finally {
          if (!cancelled) {
            setIsCalculating(false);
          }
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [assets, calculateBooking, isVip, parsedDurationHours, selectedAssetIds, servicesReady, startTime]);

  const handleCreateBooking = async () => {
    if (!servicesReady) {
      toast({
        variant: 'destructive',
        title: 'Xizmatlar hali yaratilmagan',
        description: "Avval Xizmatlar bo'limida kategoriya va narx yarating.",
      });
      return;
    }

    if (selectedAssetIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Jihoz tanlanmagan',
        description: 'Kamida bitta jihozni tanlang.',
      });
      return;
    }

    if (!startTime) {
      toast({
        variant: 'destructive',
        title: 'Boshlanish vaqti kiritilmagan',
        description: 'Booking uchun boshlanish vaqtini kiriting.',
      });
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

    if (!isVip && (!Number.isFinite(parsedDurationHours) || parsedDurationHours <= 0)) {
      toast({
        variant: 'destructive',
        title: 'Davomiylik noto‘g‘ri',
        description: 'Ijobiy duration kiriting yoki VIP rejimni tanlang.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await createBooking({
        assetIds: selectedAssetIds
          .map((assetId) => assets.find((asset) => asset.id === assetId)?.backendId)
          .filter((value): value is number => Boolean(value)),
        startTime: new Date(startTime).toISOString(),
        durationHours: isVip ? undefined : parsedDurationHours,
        isVip,
        status,
        debtName: status === 'debt_closed' ? debtName : undefined,
        debtPhoneNumber: status === 'debt_closed' ? debtPhoneNumber : undefined,
      });

      setCalculation(null);
      setCalculationError(null);
      setSelectedAssetIds([]);
      setDebtName('');
      setDebtPhoneNumber('');
      toast({
        title: isVip ? 'VIP seans yaratildi' : 'Aktiv seans yaratildi',
        description: isVip
          ? "VIP seans boshlatildi. Yakuniy summa seans tugaganda hisoblanadi."
          : "Bron qilingan seans Aktiv seanslar bo'limiga yuborildi.",
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Booking yaratilmadi',
        description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
        {!servicesReady ? <ServicesSetupCallout /> : null}

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="space-y-6">
            <section className="bg-[#0a1f1f]/50 border border-white/5 rounded-3xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/5 border border-primary/20">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">Hisob-kitob manbai</h2>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
                    Booking jami tanlangan jihozlarning xizmat narxlaridan olinadi.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">Service pricing active</p>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    Har bir tanlangan jihoz o'zining xizmat kategoriyasi narxini olib keladi, keyin vaqtga ko'paytiriladi.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-[#0a1f1f]/50 border border-white/5 rounded-3xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/5 border border-primary/20">
                  <Monitor className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">Jihozlarni tanlang</h2>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Bir booking ichida bir nechta jihoz tanlash mumkin</p>
                </div>
              </div>

              {assetsByRoom.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/5 min-h-[180px] flex items-center justify-center bg-[#061414]/20">
                  <p className="text-[10px] font-black text-[#444f4f] uppercase tracking-[0.5em]">Avval xonaga jihoz yarating</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assetsByRoom.map(([roomLabel, roomAssets]) => (
                    <div key={roomLabel} className="rounded-2xl border border-white/5 bg-[#081616] p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{roomLabel}</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {roomAssets.map((asset) => (
                          <button
                            key={asset.id}
                            disabled={!servicesReady}
                            onClick={() => toggleAsset(asset.id)}
                            className={cn(
                              'rounded-xl border p-4 text-left transition-all',
                              selectedAssetIds.includes(asset.id)
                                ? 'border-primary bg-primary/10'
                                : 'border-white/5 bg-[#051111] hover:border-primary/20'
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-2 min-w-0">
                                <p className="text-sm font-black text-white uppercase tracking-tight truncate">{asset.name}</p>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                  {asset.serviceName ?? asset.category}
                                </p>
                              </div>
                              <Badge className="bg-primary/10 text-primary border-primary/10 text-[9px] font-black uppercase">
                                {(asset.servicePrice ?? 0).toLocaleString()} UZS
                              </Badge>
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
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">Seans parametrlari</h2>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">VIP seanslar yakunda real vaqt bilan hisoblanadi</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-primary/60 uppercase tracking-[0.2em]">Boshlanish vaqti</label>
                  <Input
                    type="datetime-local"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold"
                  />
                </div>

                <div className="rounded-2xl border border-white/5 bg-[#051111] p-4 space-y-3">
                  <button
                    onClick={() => setIsVip((current) => !current)}
                    className={cn(
                      'w-full rounded-2xl border px-4 py-3 flex items-center justify-between transition-all',
                      isVip ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5 hover:border-primary/20'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Crown className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">VIP rejim</p>
                        <p className="text-[10px] text-white/40">Yakuniy narx seans tugaganda aniqlanadi</p>
                      </div>
                    </div>
                    <Badge className={isVip ? 'bg-primary text-black' : 'bg-white/5 text-white/40 border-white/10'}>
                      {isVip ? 'ON' : 'OFF'}
                    </Badge>
                  </button>

                  {!isVip ? (
                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-primary/60 uppercase tracking-[0.2em]">Davomiylik (soat)</label>
                      <div className="grid grid-cols-5 gap-2">
                        {durationOptions.map((value) => (
                          <button
                            key={value}
                            onClick={() => setDurationHoursInput(String(value))}
                            className={cn(
                              'h-11 rounded-xl border text-[11px] font-black transition-all',
                              durationHoursInput === String(value)
                                ? 'border-primary bg-primary text-black'
                                : 'border-white/5 bg-[#051111] text-white/60 hover:border-primary/20'
                            )}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={durationHoursInput}
                        onChange={(event) => setDurationHoursInput(event.target.value)}
                        className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setStatus('submitted')}
                    className={cn(
                      'rounded-2xl border px-4 py-4 text-left transition-all',
                      status === 'submitted' ? 'border-primary bg-primary/10' : 'border-white/5 bg-[#051111] hover:border-primary/20'
                    )}
                  >
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">To'langan</p>
                    <p className="text-[10px] text-white/40 mt-1">Darhol yopiladi</p>
                  </button>
                  <button
                    onClick={() => setStatus('debt_closed')}
                    className={cn(
                      'rounded-2xl border px-4 py-4 text-left transition-all',
                      status === 'debt_closed' ? 'border-primary bg-primary/10' : 'border-white/5 bg-[#051111] hover:border-primary/20'
                    )}
                  >
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Qarz</p>
                    <p className="text-[10px] text-white/40 mt-1">Mijoz ma'lumoti bilan</p>
                  </button>
                </div>

                {status === 'debt_closed' ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-primary/60 uppercase tracking-[0.2em]">Qarz ismi</Label>
                      <Input
                        aria-label="Qarz ismi"
                        value={debtName}
                        onChange={(event) => setDebtName(event.target.value)}
                        className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-primary/60 uppercase tracking-[0.2em]">Qarz telefoni</Label>
                      <Input
                        aria-label="Qarz telefoni"
                        value={debtPhoneNumber}
                        onChange={(event) => setDebtPhoneNumber(event.target.value)}
                        className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="bg-[#0a1f1f]/50 border border-white/5 rounded-3xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/5 border border-primary/20">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">Hisob-kitob</h2>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Server tomonidan qayta tekshiriladi</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-[#051111] p-4 space-y-4">
                <div className="flex items-center justify-between text-[11px] font-bold text-white/60">
                  <span>Tanlangan jihozlar</span>
                  <span>{selectedAssets.length}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold text-white/60">
                  <span>{isVip ? 'VIP holati' : 'Rejadagi tugash'}</span>
                  <span>{formatDateTimePreview(calculation?.endTime ?? localEndTimePreview)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold text-white/60">
                  <span>Soatlik jami</span>
                  <span>{(calculation?.hourlyRateTotal ?? 0).toLocaleString()} UZS</span>
                </div>
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Jami summa</span>
                  </div>
                  <span className="text-primary text-lg font-black">
                    {isVip && !calculation ? 'Seans yakunida' : `${(calculation?.totalCost ?? 0).toLocaleString()} UZS`}
                  </span>
                </div>
              </div>

              {calculationError ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[11px] text-destructive">
                  {calculationError}
                </div>
              ) : null}

              <div className="space-y-2">
                {(calculation?.assetBreakdown ?? []).map((asset) => (
                  <div key={asset.id} className="rounded-xl border border-white/5 bg-[#051111] px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black text-white uppercase tracking-tight">{asset.name}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                        {asset.category} • {asset.roomName ?? asset.roomNumber}
                      </p>
                    </div>
                    <span className="text-[10px] font-black text-primary">{asset.hourlyPrice.toLocaleString()} UZS</span>
                  </div>
                ))}
              </div>

              <Button
                disabled={isSubmitting || isCalculating || selectedAssetIds.length === 0 || !servicesReady}
                onClick={() => void handleCreateBooking()}
                className="w-full h-12 bg-primary text-black font-black uppercase tracking-[0.3em] rounded-xl"
              >
                {isSubmitting ? 'SAQLANMOQDA...' : isVip ? 'VIP SEANS BOSHLASH' : 'BOOKING YARATISH'}
              </Button>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
