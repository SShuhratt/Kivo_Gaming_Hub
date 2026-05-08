'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { DeleteConfirmButton } from '@/components/delete-confirm-button';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type SessionRecord, useDashboard } from '@/context/dashboard-context';
import { useToast } from '@/hooks/use-toast';
import { getAssetCategoryKind } from '@/lib/asset-category';
import { resolveAssetRoomLabel, resolveAssetServiceLabel } from '@/lib/asset-display';
import { formatUzPricingLabel } from '@/lib/service-bundles';
import { CheckCircle2, Clock3, Crown, Gamepad2, Monitor, Search, ShieldAlert, StopCircle, Trash2 } from 'lucide-react';

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

function secondsToHHMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatDurationMinutes(totalMinutes: number) {
  const safeTotalMinutes = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(safeTotalMinutes / 60);
  const m = safeTotalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function resolveSessionHourlyRate(session: SessionRecord) {
  if (session.pricing.hourlyRate > 0) {
    return session.pricing.hourlyRate;
  }

  return session.assets.reduce((sum, asset) => sum + (asset.hourlyPrice ?? 0), 0);
}

function getActiveSessionElapsedSeconds(session: SessionRecord, referenceNow: number) {
  const startTimeMs = new Date(session.startTime).getTime();
  const cappedNowMs = !session.isVip && session.endTime
    ? Math.min(referenceNow, new Date(session.endTime).getTime())
    : referenceNow;

  return Math.max(0, (cappedNowMs - startTimeMs) / 1000);
}

function buildLiveSessionMetrics(session: SessionRecord, referenceNow: number) {
  const elapsedSeconds = getActiveSessionElapsedSeconds(session, referenceNow);
  const liveCost = Math.round((elapsedSeconds / 3600) * resolveSessionHourlyRate(session));

  return {
    elapsedSeconds,
    elapsedLabel: secondsToHHMMSS(elapsedSeconds),
    liveCost,
  };
}

function hasDebtorInfo(session: SessionRecord) {
  return Boolean(session.debtName?.trim() || session.debtPhoneNumber?.trim());
}

export default function AktivSeanslarPage() {
  const { sessions, endSession, deleteSession, isCheckingAuth } = useDashboard();
  const { toast } = useToast();
  const [sessionSearch, setSessionSearch] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [pendingEndSession, setPendingEndSession] = useState<{
    sessionBackendId: number;
    roomLabel: string;
    elapsedLabel: string;
    liveCost: number;
  } | null>(null);
  const [isEndingSession, setIsEndingSession] = useState(false);

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  const filteredSessions = useMemo(() => {
    const query = sessionSearch.trim().toLowerCase();

    if (!query) {
      return sessions;
    }

    return sessions.filter((session) => {
      const assetSearchableText = session.assets
        .map((asset) => [
          asset.name ?? '',
          resolveAssetServiceLabel(asset),
          resolveAssetRoomLabel(asset),
          asset.assetOrder ? String(asset.assetOrder) : '',
        ].join(' '))
        .join(' ');

      return [
        session.roomLabel,
        session.debtName ?? '',
        session.debtPhoneNumber ?? '',
        assetSearchableText,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [sessionSearch, sessions]);

  const activeSessions = useMemo(
    () => filteredSessions.filter((session) => session.sessionStatus === 'active'),
    [filteredSessions],
  );
  const endedSessions = useMemo(
    () => filteredSessions.filter((session) => session.sessionStatus !== 'active'),
    [filteredSessions],
  );

  const handleOpenEndSessionDialog = (session: SessionRecord) => {
    const liveMetrics = buildLiveSessionMetrics(session, Date.now());

    setPendingEndSession({
      sessionBackendId: session.backendId,
      roomLabel: session.roomLabel,
      elapsedLabel: liveMetrics.elapsedLabel,
      liveCost: liveMetrics.liveCost,
    });
  };

  const handleEndSessionDialogChange = (open: boolean) => {
    if (!open && !isEndingSession) {
      setPendingEndSession(null);
    }
  };

  const handleConfirmEndSession = async () => {
    if (!pendingEndSession) {
      return;
    }

    try {
      setIsEndingSession(true);
      const endedSession = await endSession(pendingEndSession.sessionBackendId);
      const finalCost = endedSession.trade?.savedCost ?? endedSession.totalCost;

      toast({
        title: 'Seans yakunlandi',
        description: `Savdo ${finalCost.toLocaleString()} so'm bilan saqlandi.`,
      });
      setPendingEndSession(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Seans yakunlanmadi',
        description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
      });
    } finally {
      setIsEndingSession(false);
    }
  };

  if (isCheckingAuth) return null;

  return (
    <DashboardLayout>
      <div className="animate-in fade-in duration-500 space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/5 bg-[#0a1a1a]/40 p-5 backdrop-blur-md lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Aktiv seanslar</h2>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                Room, xizmat, jihoz va tartib raqami bo'yicha qidirish mumkin
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">
                Seanslarni qidirish
              </Label>
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                <Input
                  aria-label="Seans qidirish"
                  value={sessionSearch}
                  onChange={(event) => setSessionSearch(event.target.value)}
                  className="h-11 rounded-xl border-white/5 bg-[#051111] pl-11 text-sm font-bold"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-[8px] font-black uppercase tracking-widest text-primary/60">Aktiv</p>
              <p className="mt-1 text-lg font-black text-white">{activeSessions.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Yakunlangan</p>
              <p className="mt-1 text-lg font-black text-white">{endedSessions.length}</p>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <Clock3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Ishlayotgan seanslar</h3>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/40">
                Aktiv seanslar Trade bo'limiga hali kiritilmaydi
              </p>
            </div>
          </div>

          {activeSessions.length === 0 ? (
            <div className="flex h-[220px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/5 bg-[#061414]/20">
              <CheckCircle2 className="h-10 w-10 text-primary/30" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#556060]">
                Aktiv seans topilmadi
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {activeSessions.map((session) => {
                const liveMetrics = pendingEndSession?.sessionBackendId === session.backendId
                  ? pendingEndSession
                  : buildLiveSessionMetrics(session, now);

                return (
                  <div key={session.id} className="space-y-5 rounded-3xl border border-white/5 bg-[#0a1515]/60 p-5 shadow-xl">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary font-black uppercase tracking-widest text-black">Active</Badge>
                          <Badge variant="outline" className="border-white/10 uppercase tracking-widest text-white/60">
                            {session.status === 'submitted' ? "To'langan" : 'Qarz'}
                          </Badge>
                          {session.isVip ? (
                            <Badge variant="outline" className="border-primary/30 uppercase tracking-widest text-primary">
                              <Crown className="mr-1 h-3 w-3" /> VIP
                            </Badge>
                          ) : null}
                        </div>
                        <h4 className="text-lg font-black uppercase tracking-tight text-white">{session.roomLabel}</h4>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                          {session.assetsCount} jihoz • {formatUzPricingLabel(session.pricing.label)}
                        </p>
                      </div>

                      <Button
                        onClick={() => handleOpenEndSessionDialog(session)}
                        className="h-10 rounded-xl bg-primary text-[10px] font-black uppercase tracking-widest text-black hover:bg-primary/90"
                      >
                        <StopCircle className="mr-2 h-4 w-4" /> Seansni yakunlash
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Boshlanish</p>
                        <p className="mt-2 text-[11px] font-bold text-white">{formatDateTime(session.startTime)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/30">
                          {session.isVip ? 'VIP holati' : 'Rejadagi tugash'}
                        </p>
                        <p className="mt-2 text-[11px] font-bold text-white">
                          {session.isVip ? 'Ochiq seans' : formatDateTime(session.endTime)}
                        </p>
                      </div>

                      <div className="col-span-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-primary/50">Ishlatilgan vaqt</p>
                        <p className="mt-2 font-mono text-sm font-black tabular-nums text-white">
                          {!session.isVip && session.requestedDurationHours !== null
                            ? `${liveMetrics.elapsedLabel} / ${secondsToHHMMSS(session.requestedDurationHours * 3600)}`
                            : liveMetrics.elapsedLabel}
                        </p>
                      </div>

                      <div className="col-span-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-primary/50">Jonli narx</p>
                        <p className="mt-2 text-sm font-black text-primary">
                          {liveMetrics.liveCost.toLocaleString()} so'm
                        </p>
                      </div>
                    </div>

                    {hasDebtorInfo(session) ? (
                      <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-amber-200/70">
                          Qarzdor ma'lumotlari
                        </p>
                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          {session.debtName ? (
                            <div className="rounded-2xl border border-white/5 bg-[#051111] p-4">
                              <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Qarzdorning ismi</p>
                              <p className="mt-2 text-[11px] font-bold text-white">{session.debtName}</p>
                            </div>
                          ) : null}
                          {session.debtPhoneNumber ? (
                            <div className="rounded-2xl border border-white/5 bg-[#051111] p-4">
                              <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Qarzdorning telefon raqami</p>
                              <p className="mt-2 text-[11px] font-bold text-white">{session.debtPhoneNumber}</p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div className="space-y-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Jihozlar</p>
                      <div className="space-y-2">
                        {session.assets.map((asset, index) => {
                          const assetCategory = asset.serviceName ?? asset.category;

                          return (
                            <div
                              key={`${session.id}-${asset.id ?? index}`}
                              className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#051111] px-3 py-3"
                            >
                              {getAssetCategoryKind(assetCategory) === 'console' ? (
                                <Gamepad2 className="h-4 w-4 text-primary" />
                              ) : (
                                <Monitor className="h-4 w-4 text-primary" />
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-black uppercase tracking-tight text-white">
                                  {resolveAssetServiceLabel(asset)}
                                  {asset.assetOrder ? ` #${asset.assetOrder}` : ''}
                                  {asset.name ? ` - ${asset.name}` : ''}
                                </p>
                                <p className="mt-1 text-[10px] uppercase tracking-widest text-white/40">
                                  {resolveAssetRoomLabel(asset)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <Trash2 className="h-4 w-4 text-white/70" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Yakunlangan yozuvlar</h3>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/40">
                Trade saqlangandan keyin bu yozuvlar ro‘yxatdan tozalanishi mumkin
              </p>
            </div>
          </div>

          {endedSessions.length === 0 ? (
            <div className="flex h-[180px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/5 bg-[#061414]/20">
              <ShieldAlert className="h-10 w-10 text-white/20" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#556060]">
                Yakunlangan yozuv yo‘q
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {endedSessions.map((session) => {
                const savedTradeCost = session.trade?.savedCost ?? session.totalCost;
                const savedDurationMinutes = session.trade?.durationMinutes ?? session.durationMinutes;
                const savedEndTime = session.endedAt ?? session.trade?.endTime ?? session.endTime;
                const savedTradeStatus = session.trade
                  ? (session.trade.status === 'submitted' ? "To'langan" : 'Qarz')
                  : 'Kutilmoqda';
                const showDebtorInfo = hasDebtorInfo(session);

                return (
                  <div key={session.id} className="space-y-5 rounded-3xl border border-white/5 bg-[#0a1515]/60 p-5 shadow-xl">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-white/10 font-black uppercase tracking-widest text-white">Ended</Badge>
                          <Badge variant="outline" className="border-white/10 uppercase tracking-widest text-white/60">
                            {session.tradeExists ? 'Savdo saqlandi' : "Savdo yo'q"}
                          </Badge>
                          {session.isVip ? (
                            <Badge variant="outline" className="border-primary/30 uppercase tracking-widest text-primary">
                              <Crown className="mr-1 h-3 w-3" /> VIP
                            </Badge>
                          ) : null}
                        </div>
                        <h4 className="text-lg font-black uppercase tracking-tight text-white">{session.roomLabel}</h4>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                          {session.assetsCount} jihoz • {formatUzPricingLabel(session.pricing.label)}
                        </p>
                      </div>

                      {session.canDelete ? (
                        <DeleteConfirmButton
                          itemName={`ended session ${session.backendId}`}
                          description="Do you really want to delete this ended session?"
                          onConfirm={async () => {
                            try {
                              await deleteSession(session.backendId);
                              toast({
                                title: "Yozuv o'chirildi",
                                description: 'Trade tarixi saqlandi, yozuv Aktiv seanslar ro‘yxatidan olib tashlandi.',
                              });
                            } catch (error) {
                              toast({
                                variant: 'destructive',
                                title: "Yozuv o'chirilmadi",
                                description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
                              });
                              throw error;
                            }
                          }}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl border border-destructive/10 bg-destructive/5 text-destructive/50 hover:border-destructive/30 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DeleteConfirmButton>
                      ) : (
                        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Delete disabled</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Boshlanish</p>
                        <p className="mt-2 text-[11px] font-bold text-white">{formatDateTime(session.startTime)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Yakunlandi</p>
                        <p className="mt-2 text-[11px] font-bold text-white">{formatDateTime(savedEndTime)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Davomiyligi</p>
                        <p className="mt-2 text-sm font-black text-white">{formatDurationMinutes(savedDurationMinutes)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Holati</p>
                        <p className="mt-2 text-sm font-black text-primary">{savedTradeStatus}</p>
                      </div>
                      {showDebtorInfo ? (
                        <div className="col-span-2 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
                          <p className="text-[8px] font-black uppercase tracking-widest text-amber-200/70">
                            Qarzdor ma'lumotlari
                          </p>
                          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                            {session.debtName ? (
                              <div className="rounded-2xl border border-white/5 bg-[#051111] p-4">
                                <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Qarzdorning ismi</p>
                                <p className="mt-2 text-[11px] font-bold text-white">{session.debtName}</p>
                              </div>
                            ) : null}
                            {session.debtPhoneNumber ? (
                              <div className="rounded-2xl border border-white/5 bg-[#051111] p-4">
                                <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Qarzdorning telefon raqami</p>
                                <p className="mt-2 text-[11px] font-bold text-white">{session.debtPhoneNumber}</p>
                              </div>
                            ) : null}
                            <div className="rounded-2xl border border-white/5 bg-[#051111] p-4">
                              <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Yakuniy qarz summasi</p>
                              <p className="mt-2 text-sm font-black text-amber-200">
                                {savedTradeCost.toLocaleString()} so'm
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      <div className="col-span-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-primary/50">Savdo</p>
                        <p className="mt-2 text-sm font-black text-primary">
                          {session.trade
                            ? `Savdo: ${savedTradeCost.toLocaleString()} so'm saqlandi`
                            : `Savdo: ${savedTradeCost.toLocaleString()} so'm kutilmoqda`}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                          {session.trade ? `ID #${session.trade.id} • ${savedTradeStatus}` : "Savdo ma'lumoti hali yo'q"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <AlertDialog open={pendingEndSession !== null} onOpenChange={handleEndSessionDialogChange}>
          <AlertDialogContent className="rounded-3xl border-white/10 bg-[#0a1f1f] text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-black uppercase tracking-tight">
                Bu seansni yakunlashni xohlaysizmi?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3 text-white/70">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-white/40">
                  {pendingEndSession?.roomLabel}
                </span>
                <span className="block">
                  <span className="text-[10px] uppercase tracking-widest text-white/40">Vaqt: </span>
                  <span className="font-mono font-black text-white">{pendingEndSession?.elapsedLabel ?? '00:00:00'}</span>
                </span>
                <span className="block rounded-xl border border-primary/20 bg-primary/10 px-3 py-3">
                  <span className="text-[10px] uppercase tracking-widest text-primary/60">Narx: </span>
                  <span className="font-black text-primary">
                    {pendingEndSession ? `${pendingEndSession.liveCost.toLocaleString()} so'm` : `0 so'm`}
                  </span>
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={isEndingSession}
                className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                Bekor qilish
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isEndingSession}
                onClick={(event) => {
                  event.preventDefault();
                  void handleConfirmEndSession();
                }}
                className="bg-primary text-black hover:bg-primary/90"
              >
                {isEndingSession ? 'Yakunlanmoqda...' : 'Yakunlash'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
