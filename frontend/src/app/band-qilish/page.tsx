'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useDashboard } from '@/context/dashboard-context';
import {
  Receipt,
  Calendar as CalendarIcon,
  Zap,
  AlertCircle,
  Monitor,
  Gamepad2,
  Timer,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { formatAssetCategoryLabel, getAssetCategoryKind, normalizeAssetCategoryValue } from '@/lib/asset-category';
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
  const { tariffs, assets, calculateBooking, createBooking, isCheckingAuth } = useDashboard();
  const { toast } = useToast();

  const [selectedTariffId, setSelectedTariffId] = useState<string | null>(null);
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
      const key = asset.roomNumber;
      const current = groups.get(key) ?? [];
      groups.set(key, [...current, asset]);
    }

    return Array.from(groups.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [assets]);

  const selectedTariff = tariffs.find((tariff) => tariff.id === selectedTariffId) ?? null;
  const selectedAssets = assets.filter((asset) => selectedAssetIds.includes(asset.id));
  const parsedDurationHours = Number(durationHoursInput);

  const tariffPriceMap = useMemo(() => {
    if (!selectedTariff) {
      return new Map<string, number>();
    }

    return new Map(
      selectedTariff.categoryPrices.map((price) => [normalizeAssetCategoryValue(price.category).toLowerCase(), price.hourlyPrice])
    );
  }, [selectedTariff]);

  const missingCategoryLabels = useMemo(() => {
    if (!selectedTariff || selectedTariff.categoryPrices.length === 0) {
      return [];
    }

    const labels = new Map<string, string>();

    for (const asset of selectedAssets) {
      const normalizedCategory = normalizeAssetCategoryValue(asset.category);
      const key = normalizedCategory.toLowerCase();

      if (!tariffPriceMap.has(key)) {
        labels.set(key, normalizedCategory);
      }
    }

    return Array.from(labels.values());
  }, [selectedAssets, selectedTariff, tariffPriceMap]);

  const localEndTimePreview = useMemo(() => {
    if (isVip || !Number.isFinite(parsedDurationHours) || parsedDurationHours <= 0 || !startTime) {
      return null;
    }

    return new Date(new Date(startTime).getTime() + parsedDurationHours * 60 * 60 * 1000).toISOString();
  }, [durationHoursInput, isVip, parsedDurationHours, startTime]);

  if (isCheckingAuth) return null;

  const toggleAsset = (assetId: string) => {
    setSelectedAssetIds((current) =>
      current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId]
    );
  };

  useEffect(() => {
    if (!selectedTariff || selectedAssetIds.length === 0 || !startTime) {
      setCalculation(null);
      setCalculationError(null);
      return;
    }

    if (!isVip && (!Number.isFinite(parsedDurationHours) || parsedDurationHours <= 0)) {
      setCalculation(null);
      setCalculationError(null);
      return;
    }

    if (missingCategoryLabels.length > 0) {
      setCalculation(null);
      setCalculationError(`Tanlangan tarifda quyidagi kategoriyalar uchun narx yo'q: ${missingCategoryLabels.join(', ')}.`);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          setIsCalculating(true);
          const result = await calculateBooking({
            tariffId: selectedTariff.backendId,
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
  }, [assets, calculateBooking, isVip, missingCategoryLabels, parsedDurationHours, selectedAssetIds, selectedTariff, startTime]);

  const handleCreateBooking = async () => {
    if (!selectedTariff) {
      toast({
        variant: 'destructive',
        title: 'Tarif tanlanmagan',
        description: 'Booking yaratishdan oldin tarifni tanlang.',
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

    if (missingCategoryLabels.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Tarif narxlari yetishmayapti',
        description: `Quyidagi kategoriyalar uchun narx belgilang: ${missingCategoryLabels.join(', ')}.`,
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
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="space-y-6">
            <section className="bg-[#0a1f1f]/50 border border-white/5 rounded-3xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/5 border border-primary/20">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">Tarifni tanlang</h2>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Har bir jihoz kategoriyasi uchun alohida narx ishlatiladi</p>
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
                        'rounded-2xl border p-5 text-left transition-all bg-[#081616] space-y-4',
                        selectedTariffId === tariff.id ? 'border-primary shadow-[0_0_25px_rgba(0,255,255,0.15)]' : 'border-white/5 hover:border-primary/20'
                      )}
                    >
                      <div>
                        <p className="text-[9px] font-black text-primary/50 uppercase tracking-widest">Tarif #{tariff.backendId}</p>
                        <h3 className="text-sm font-black text-white uppercase tracking-tight mt-2">{tariff.name}</h3>
                        <p className="text-lg font-black text-primary mt-3">Boshlanish narxi {tariff.hourlyPrice.toLocaleString()} UZS</p>
                      </div>
                      <div className="space-y-2">
                        {tariff.categoryPrices.map((price) => (
                          <div key={price.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-3 py-2">
                            <span className="text-[10px] font-black text-white uppercase tracking-tight">{price.category}</span>
                            <span className="text-[10px] font-black text-primary">{price.hourlyPrice.toLocaleString()} UZS</span>
                          </div>
                        ))}
                      </div>
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
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Bir booking ichida bir nechta jihoz tanlash mumkin</p>
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
                        {roomAssets.map((asset) => {
                          const assetRate = tariffPriceMap.get(normalizeAssetCategoryValue(asset.category).toLowerCase());

                          return (
                            <button
                              key={asset.id}
                              onClick={() => toggleAsset(asset.id)}
                              className={cn(
                                'rounded-xl border p-4 text-left transition-all',
                                selectedAssetIds.includes(asset.id) ? 'border-primary bg-primary/10' : 'border-white/5 bg-[#051111] hover:border-primary/20'
                              )}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 shrink-0">
                                    {getAssetCategoryKind(asset.category) === 'console' ? (
                                      <Gamepad2 className="h-4 w-4 text-primary" />
                                    ) : (
                                      <Monitor className="h-4 w-4 text-primary" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-black text-white uppercase tracking-tight truncate">{formatAssetCategoryLabel(asset.category)}</p>
                                    <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest">Jihoz #{asset.backendId}</p>
                                    {selectedTariff && assetRate !== undefined && (
                                      <p className="text-[8px] text-primary font-black uppercase tracking-widest mt-1">
                                        {assetRate.toLocaleString()} UZS / SOAT
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {selectedAssetIds.includes(asset.id) && (
                                  <Badge className="bg-primary text-black font-black">Tanlandi</Badge>
                                )}
                              </div>
                            </button>
                          );
                        })}
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
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Boshlanish va duration yoki VIP rejimi</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Boshlanish vaqti</Label>
                  <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm" />
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Duration</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {durationOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          setIsVip(false);
                          setDurationHoursInput(String(option));
                        }}
                        className={cn(
                          'h-11 rounded-xl border font-black uppercase tracking-widest text-[10px] transition-all',
                          !isVip && Number(durationHoursInput) === option
                            ? 'bg-primary text-black border-primary'
                            : 'bg-[#051111] border-white/5 text-white/60'
                        )}
                      >
                        {option} SOAT
                      </button>
                    ))}
                    <button
                      onClick={() => setIsVip(true)}
                      className={cn(
                        'h-11 rounded-xl border font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 col-span-3',
                        isVip ? 'bg-amber-400 text-black border-amber-400' : 'bg-[#051111] border-white/5 text-white/60'
                      )}
                    >
                      <Crown className="h-4 w-4" /> VIP
                    </button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Custom Duration (soat)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      disabled={isVip}
                      value={durationHoursInput}
                      onChange={(e) => {
                        setIsVip(false);
                        setDurationHoursInput(e.target.value);
                      }}
                      className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-[#051111] p-4 space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <Timer className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Tugash Preview</span>
                  </div>
                  <p className="text-sm font-black text-white">
                    {formatDateTimePreview(calculation?.endTime ?? localEndTimePreview)}
                  </p>
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

                {missingCategoryLabels.length > 0 ? (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-destructive text-sm font-bold">
                    Quyidagi kategoriyalar uchun tarif narxi yo'q: {missingCategoryLabels.join(', ')}.
                  </div>
                ) : calculationError ? (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-destructive text-sm font-bold">
                    {calculationError}
                  </div>
                ) : calculation ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/60">
                      <span>Soatlik Jami</span>
                      <span className="text-primary">{calculation.hourlyRateTotal.toLocaleString()} UZS</span>
                    </div>
                    {!calculation.isVip ? (
                      <>
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/60">
                          <span>Duration</span>
                          <span className="text-white">{calculation.durationHours} soat</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/60">
                          <span>Jami</span>
                          <span className="text-primary text-lg">{calculation.totalCost.toLocaleString()} UZS</span>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100 text-sm font-bold">
                        VIP seans uchun yakuniy summa session tugaganda actual vaqt bo'yicha hisoblanadi.
                      </div>
                    )}
                    <div className="space-y-2 pt-2">
                      {calculation.assetBreakdown.map((asset) => (
                        <div key={asset.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-3 py-2">
                          <span className="text-[10px] font-black text-white uppercase tracking-tight">{asset.category}</span>
                          <span className="text-[10px] font-black text-primary">{asset.hourlyPrice.toLocaleString()} UZS</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-[#051111] p-5 text-center">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">
                      Tarif, jihoz va duration tanlang
                    </p>
                  </div>
                )}
              </div>

              <Button
                disabled={
                  isSubmitting ||
                  isCalculating ||
                  !selectedTariff ||
                  selectedAssetIds.length === 0 ||
                  missingCategoryLabels.length > 0 ||
                  Boolean(calculationError)
                }
                onClick={() => void handleCreateBooking()}
                className="w-full h-12 bg-primary text-black font-black uppercase tracking-[0.3em] rounded-xl shadow-[0_10px_30px_rgba(0,255,255,0.2)] hover:bg-primary/90 transition-all active:scale-[0.98] text-xs"
              >
                {isSubmitting ? 'SAQLANMOQDA...' : isVip ? 'VIP SEANSNI BOSHLASH' : 'BOOKINGNI YARATISH'}
              </Button>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
