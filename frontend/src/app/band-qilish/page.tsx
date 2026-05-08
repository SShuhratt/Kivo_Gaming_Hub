'use client';

import React, { startTransition, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ServicesSetupCallout } from '@/components/services-setup-callout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDashboard } from '@/context/dashboard-context';
import { useToast } from '@/hooks/use-toast';
import { groupAssetsByService, resolveAssetRoomLabel, sortAssetsForDisplay } from '@/lib/asset-display';
import { formatBundleRequirements } from '@/lib/service-bundles';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Crown, Monitor, Timer, Zap } from 'lucide-react';

function toLocalDateTimeValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function hoursToHHMM(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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

function formatBundlePhaseLabel(phase: 'explicit_selection' | 'admin_override' | 'best_value' | 'residual') {
  switch (phase) {
    case 'explicit_selection':
      return 'Tanlangan bundle';
    case 'admin_override':
      return 'Admin qoida';
    case 'best_value':
      return 'Avtomatik bundle';
    default:
      return 'Standard';
  }
}

export default function BandQilishPage() {
  const { assets, servicesReady, services: allServices = [], calculateBooking, createBooking, isCheckingAuth } = useDashboard();
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
  const [selectedBundleServiceIds, setSelectedBundleServiceIds] = useState<number[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBookingRoomLabel, setSelectedBookingRoomLabel] = useState<string | null>(null);

  const assetLookupById = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  );
  const selectedAssetIdSet = useMemo(() => new Set(selectedAssetIds), [selectedAssetIds]);

  const assetsByRoom = useMemo(() => {
    type RoomAssetBucket = {
      roomLabel: string;
      assets: typeof assets;
    };

    const roomMap = new Map<
      string,
      RoomAssetBucket
    >();

    for (const asset of sortAssetsForDisplay(assets)) {
      const roomLabel = resolveAssetRoomLabel(asset);
      const key = `${asset.roomId ?? roomLabel}`;
      const current = roomMap.get(key);

      if (current) {
        current.assets.push(asset);
        continue;
      }

      roomMap.set(key, {
        roomLabel,
        assets: [asset],
      });
    }

    return Array.from(roomMap.values())
      .sort((left, right) => left.roomLabel.localeCompare(right.roomLabel))
      .map((roomGroup) => ({
        roomLabel: roomGroup.roomLabel,
        hasSelectedAssets: roomGroup.assets.some((asset) => selectedAssetIdSet.has(asset.id)),
        serviceGroups: groupAssetsByService(roomGroup.assets),
      }));
  }, [assets, selectedAssetIdSet]);

  const selectedAssets = useMemo(
    () =>
      selectedAssetIds
        .map((assetId) => assetLookupById.get(assetId))
        .filter((asset): asset is (typeof assets)[number] => Boolean(asset)),
    [assetLookupById, selectedAssetIds],
  );
  const selectedAssetBackendIds = useMemo(
    () => selectedAssets.map((asset) => asset.backendId),
    [selectedAssets],
  );
  const parsedDurationHours = Number(durationHoursInput);

  const localEndTimePreview = useMemo(() => {
    if (isVip || !Number.isFinite(parsedDurationHours) || parsedDurationHours <= 0 || !startTime) {
      return null;
    }

    return new Date(new Date(startTime).getTime() + parsedDurationHours * 60 * 60 * 1000).toISOString();
  }, [durationHoursInput, isVip, parsedDurationHours, startTime]);

  useEffect(() => {
    if (!servicesReady) {
      startTransition(() => {
        setSelectedAssetIds([]);
        setCalculation(null);
        setCalculationError(null);
        setIsCalculating(false);
      });
      return;
    }

    if (selectedAssetBackendIds.length === 0 || !startTime) {
      startTransition(() => {
        setCalculation(null);
        setCalculationError(null);
        setIsCalculating(false);
      });
      return;
    }

    if (!isVip && (!Number.isFinite(parsedDurationHours) || parsedDurationHours <= 0)) {
      startTransition(() => {
        setCalculation(null);
        setCalculationError(null);
        setIsCalculating(false);
      });
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          startTransition(() => {
            setIsCalculating(true);
          });

          const result = await calculateBooking({
            assetIds: selectedAssetBackendIds,
            startTime: new Date(startTime).toISOString(),
            durationHours: isVip ? undefined : parsedDurationHours,
            isVip,
            selectedBundleServiceIds,
            signal: controller.signal,
          });

          if (!cancelled) {
            startTransition(() => {
              setCalculation(result);
              setCalculationError(null);
            });
          }
        } catch (error) {
          if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
            return;
          }

          if (!cancelled) {
            startTransition(() => {
              setCalculation(null);
              setCalculationError(error instanceof Error ? error.message : "So'rov bajarilmadi.");
            });
          }
        } finally {
          if (!cancelled) {
            startTransition(() => {
              setIsCalculating(false);
            });
          }
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [calculateBooking, isVip, parsedDurationHours, selectedAssetBackendIds, servicesReady, startTime, selectedBundleServiceIds]);


  const toggleAsset = (assetId: string) => {
    if (!servicesReady) {
      return;
    }

    setSelectedAssetIds((current) =>
      current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId],
    );
    setSelectedBundleServiceIds([]);
  };

  const handleCreateBooking = async () => {
    if (!servicesReady) {
      toast({
        variant: 'destructive',
        title: 'Xizmatlar hali yaratilmagan',
        description: "Avval Xizmatlar bo'limida xizmat nomi va narx yarating.",
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
        description: 'Band qilish uchun boshlanish vaqtini kiriting.',
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
        assetIds: selectedAssetBackendIds,
        startTime: new Date(startTime).toISOString(),
        durationHours: isVip ? undefined : parsedDurationHours,
        isVip,
        selectedBundleServiceIds,
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
          : "Band qilingan seans Aktiv seanslar bo'limiga yuborildi.",
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Band qilish amalga oshmadi',
        description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCartTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const asset of selectedAssets) {
      if (asset.serviceName) {
        const key = asset.serviceName.toLowerCase().trim();
        totals[key] = (totals[key] ?? 0) + 1;
      }
    }
    return totals;
  }, [selectedAssets]);

  const selectedAssetsBaseHourlyTotal = useMemo(
    () => selectedAssets.reduce((sum, asset) => sum + (asset.servicePrice ?? 0), 0),
    [selectedAssets],
  );
  const appliedBundles = useMemo(
    () => (calculation?.breakdown ?? []).filter((line) => line.type === 'bundle'),
    [calculation],
  );
  const bundleSavingsPerHour = useMemo(() => {
    if (!calculation || appliedBundles.length === 0) {
      return 0;
    }

    return Math.max(0, selectedAssetsBaseHourlyTotal - calculation.hourlyRateTotal);
  }, [appliedBundles.length, calculation, selectedAssetsBaseHourlyTotal]);

  const recommendations = useMemo(() => {
    if (!servicesReady || selectedAssetIds.length === 0) return [];

    const recommendableBundles = allServices.filter((s) => s.isBundle && s.isRecommendable);

    return recommendableBundles
      .map((bundle) => {
        const reqs = bundle.requirements;
        let metCount = 0;
        let totalNeeded = 0;

        for (const [key, count] of Object.entries(reqs)) {
          const current = currentCartTotals[key] ?? 0;
          metCount += Math.min(current, count);
          totalNeeded += count;
        }

        const progress = totalNeeded > 0 ? metCount / totalNeeded : 0;

        return {
          bundle,
          progress,
          alreadySelected: selectedBundleServiceIds.includes(bundle.backendId),
        };
      })
      .filter((r) => r.progress >= 0.8 && r.progress < 1 && !r.alreadySelected)
      .sort((a, b) => b.progress - a.progress);
  }, [servicesReady, selectedAssetIds, allServices, currentCartTotals, selectedBundleServiceIds]);

  const toggleBundle = (serviceId: number) => {
    setSelectedBundleServiceIds((current) =>
      current.includes(serviceId) ? current.filter((id) => id !== serviceId) : [...current, serviceId],
    );
  };
  
  if (isCheckingAuth) return null;

  const activeBookingRoom =
    assetsByRoom.find((r) => r.roomLabel === selectedBookingRoomLabel) ?? assetsByRoom[0] ?? null;

  return (
    <DashboardLayout>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
        {!servicesReady ? <ServicesSetupCallout /> : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="space-y-5 rounded-3xl border border-white/5 bg-[#0a1f1f]/50 p-6 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/5">
                  <Monitor className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Jihozlarni tanlang</h2>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Bir booking ichida bir nechta xonadan jihoz tanlash mumkin
                  </p>
                </div>
              </div>

              {assetsByRoom.length === 0 ? (
                <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/5 bg-[#061414]/20">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#444f4f]">
                    Avval xonaga jihoz yarating
                  </p>
                </div>
              ) : (
                <div className="flex gap-3">
                  {/* Room ruler */}
                  <div className="flex w-36 flex-shrink-0 flex-col gap-1 self-start rounded-2xl border border-white/5 bg-[#051111] p-2">
                    {assetsByRoom.map((roomGroup) => (
                      <button
                        key={roomGroup.roomLabel}
                        onClick={() => setSelectedBookingRoomLabel(roomGroup.roomLabel)}
                        className={cn(
                          'flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-all',
                          activeBookingRoom?.roomLabel === roomGroup.roomLabel
                            ? 'bg-primary/15 text-primary'
                            : 'text-white/50 hover:bg-white/5 hover:text-white/80',
                        )}
                      >
                        <div
                          className={cn(
                            'h-1.5 w-1.5 flex-shrink-0 rounded-full',
                            roomGroup.hasSelectedAssets ? 'bg-primary' : 'bg-white/20',
                          )}
                        />
                        <span className="truncate text-[10px] font-black uppercase tracking-[0.1em]">
                          {roomGroup.roomLabel}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Assets for the active room */}
                  <div className="min-w-0 flex-1 space-y-3">
                    {activeBookingRoom === null ? null : activeBookingRoom.serviceGroups.length === 0 ? (
                      <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-white/5 bg-[#061414]/20">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#444f4f]">Jihozlar yo'q</p>
                      </div>
                    ) : (
                      activeBookingRoom.serviceGroups.map((group) => (
                        <div key={group.serviceName} className="space-y-2 rounded-2xl border border-white/5 bg-[#051111] p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                            {group.serviceName}
                          </p>
                          <div className="space-y-2">
                            {group.assets.map((asset) => {
                              const selected = selectedAssetIdSet.has(String(asset.id));

                              return (
                                <button
                                  key={String(asset.id)}
                                  disabled={!servicesReady}
                                  onClick={() => toggleAsset(String(asset.id))}
                                  className={cn(
                                    'w-full rounded-xl border p-3 text-left transition-all',
                                    selected
                                      ? 'border-primary bg-primary/10'
                                      : 'border-white/5 bg-white/5 hover:border-primary/20',
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 space-y-1">
                                      <p className="truncate text-sm font-black text-white">
                                        {asset.displayOrder}. {asset.name}
                                      </p>
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                        {group.serviceName}
                                      </p>
                                    </div>
                                    <Badge className="border-primary/10 bg-primary/10 text-[9px] font-black uppercase text-primary">
                                      {(asset.servicePrice ?? 0).toLocaleString()} UZS
                                    </Badge>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="space-y-5 rounded-3xl border border-white/5 bg-[#0a1f1f]/50 p-6 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/5">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Seans parametrlari</h2>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                    VIP seanslar yakunda real vaqt bilan hisoblanadi
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time" className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Boshlanish vaqti</Label>
                  <Input
                    id="start-time"
                    name="start-time"
                    type="datetime-local"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="h-12 rounded-xl border-white/5 bg-[#051111] font-bold"
                  />
                </div>

                <div className="space-y-3 rounded-2xl border border-white/5 bg-[#051111] p-4">
                  <button
                    onClick={() => setIsVip((current) => !current)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-2xl border px-4 py-3 transition-all',
                      isVip ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5 hover:border-primary/20',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                        <Crown className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white">VIP rejim</p>
                        <p className="text-[10px] text-white/40">Yakuniy narx seans tugaganda aniqlanadi</p>
                      </div>
                    </div>
                    <Badge className={isVip ? 'bg-primary text-black' : 'border-white/10 bg-white/5 text-white/40'}>
                      {isVip ? 'ON' : 'OFF'}
                    </Badge>
                  </button>

                  {!isVip ? (
                    <div className="space-y-3">
                      <Label htmlFor="duration-hours" className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Davomiylik (soat)</Label>
                      <div className="grid grid-cols-5 gap-2">
                      {durationOptions.map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setDurationHoursInput(String(value))}
                            className={cn(
                              'h-11 rounded-xl border text-[11px] font-black transition-all',
                              durationHoursInput === String(value)
                                ? 'border-primary bg-primary text-black'
                                : 'border-white/5 bg-[#051111] text-white/60 hover:border-primary/20',
                            )}
                          >
                            {hoursToHHMM(value)}
                          </button>
                        ))}
                      </div>
                      <Input
                        id="duration-hours"
                        name="duration-hours"
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={durationHoursInput}
                        onChange={(event) => setDurationHoursInput(event.target.value)}
                        className="h-12 rounded-xl border-white/5 bg-[#051111] font-bold"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setStatus('submitted')}
                    className={cn(
                      'rounded-2xl border px-4 py-4 text-left transition-all',
                      status === 'submitted' ? 'border-primary bg-primary/10' : 'border-white/5 bg-[#051111] hover:border-primary/20',
                    )}
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">To'langan</p>
                    <p className="mt-1 text-[10px] text-white/40">Darhol yopiladi</p>
                  </button>
                  <button
                    onClick={() => setStatus('debt_closed')}
                    className={cn(
                      'rounded-2xl border px-4 py-4 text-left transition-all',
                      status === 'debt_closed' ? 'border-primary bg-primary/10' : 'border-white/5 bg-[#051111] hover:border-primary/20',
                    )}
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Qarz</p>
                    <p className="mt-1 text-[10px] text-white/40">Mijoz ma'lumoti bilan</p>
                  </button>
                </div>

                {status === 'debt_closed' ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="debt-name" className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Qarzdorning ismi</Label>
                      <Input
                        id="debt-name"
                        name="debt-name"
                        aria-label="Qarzdorning ismi"
                        value={debtName}
                        onChange={(event) => setDebtName(event.target.value)}
                        className="h-12 rounded-xl border-white/5 bg-[#051111] font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="debt-phone" className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Qarzdorning telefon raqami</Label>
                      <Input
                        id="debt-phone"
                        name="debt-phone"
                        aria-label="Qarzdorning telefon raqami"
                        value={debtPhoneNumber}
                        onChange={(event) => setDebtPhoneNumber(event.target.value)}
                        className="h-12 rounded-xl border-white/5 bg-[#051111] font-bold"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="space-y-5 rounded-3xl border border-white/5 bg-[#0a1f1f]/50 p-6 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/5">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Hisob-kitob</h2>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Server tomonidan qayta tekshiriladi
                  </p>
                </div>
              </div>

              {recommendations.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Takliflar (Best Value)</p>
                  <div className="space-y-2">
                    {recommendations.map(({ bundle, progress }) => (
                      <button
                        key={bundle.id}
                        onClick={() => toggleBundle(bundle.backendId)}
                        className="group relative w-full overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/10"
                      >
                        <div className="relative z-10 flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-[11px] font-black uppercase text-white">{bundle.name}</p>
                            <p className="text-[9px] font-bold text-primary/60">
                              {Math.round(progress * 100)}% tayyor • {bundle.rate?.toLocaleString()} UZS
                            </p>
                          </div>
                          <Zap className="h-4 w-4 text-primary animate-pulse" />
                        </div>
                        <div 
                          className="absolute bottom-0 left-0 h-1 bg-primary/20 transition-all duration-500" 
                          style={{ width: `${progress * 100}%` }} 
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4 rounded-2xl border border-white/5 bg-[#051111] p-4">
                <div className="flex items-center justify-between text-[11px] font-bold text-white/60">
                  <span>Tanlangan jihozlar</span>
                  <span>{selectedAssets.length}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold text-white/60">
                  <span>Oddiy soatlik narx</span>
                  <span>{selectedAssetsBaseHourlyTotal.toLocaleString()} UZS</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold text-white/60">
                  <span>Qo'llangan bundles</span>
                  <span>{appliedBundles.length}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold text-white/60">
                  <span>{isVip ? 'VIP holati' : 'Rejadagi tugash'}</span>
                  <span>{formatDateTimePreview(calculation?.endTime ?? localEndTimePreview)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold text-white/60">
                  <span>Soatlik jami</span>
                  <span>{(calculation?.hourlyRateTotal ?? 0).toLocaleString()} UZS</span>
                </div>
                {bundleSavingsPerHour > 0 ? (
                  <div className="flex items-center justify-between text-[11px] font-bold text-primary">
                    <span>Bundle tejami / soat</span>
                    <span>-{bundleSavingsPerHour.toLocaleString()} UZS</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Jami summa</span>
                  </div>
                  <span className="text-lg font-black text-primary">
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
                {appliedBundles.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                      Qo'llangan bundles
                    </p>
                    {appliedBundles.map((bundle, idx) => (
                      <div
                        key={`${bundle.serviceId}-${idx}`}
                        className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="h-5 border-none bg-primary px-2 text-[8px] font-black text-black">
                                BUNDLE
                              </Badge>
                              <Badge variant="outline" className="border-primary/30 text-[8px] font-black uppercase tracking-widest text-primary">
                                {formatBundlePhaseLabel(bundle.phase)}
                              </Badge>
                              {bundle.quantity > 1 ? (
                                <Badge variant="outline" className="border-white/10 text-[8px] font-black uppercase tracking-widest text-white/70">
                                  x{bundle.quantity}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-[11px] font-black uppercase tracking-tight text-white">
                              {bundle.serviceName}
                            </p>
                            <p className="text-[9px] uppercase tracking-widest text-primary/40">
                              {formatBundleRequirements(bundle.requirements, allServices)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-primary">{bundle.subtotal.toLocaleString()} UZS</p>
                            {bundle.savingsRatio > 0 ? (
                              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-primary/60">
                                {(bundle.savingsRatio * 100).toFixed(1)}% saving
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
 
                {(calculation?.assetBreakdown ?? []).map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#051111] px-4 py-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-tight text-white">
                        {(asset.assetOrder ?? 0) > 0 ? `${asset.serviceName ?? asset.category} #${asset.assetOrder}` : asset.serviceName ?? asset.category}
                        {asset.name ? ` - ${asset.name}` : ''}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-widest text-white/40">
                        {asset.roomName ?? asset.roomNumber}
                      </p>
                    </div>
                    <span className="text-[10px] font-black text-primary/60">{asset.hourlyPrice.toLocaleString()} UZS</span>
                  </div>
                ))}
              </div>

              <Button
                disabled={isSubmitting || isCalculating || selectedAssetIds.length === 0 || !servicesReady}
                onClick={() => void handleCreateBooking()}
                className="h-12 w-full rounded-xl bg-primary font-black uppercase tracking-[0.3em] text-black"
              >
                {isSubmitting ? 'SAQLANMOQDA...' : 'BAND QILISH'}
              </Button>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
