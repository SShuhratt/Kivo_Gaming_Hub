'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { DeleteConfirmButton } from '@/components/delete-confirm-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDashboard } from '@/context/dashboard-context';
import { useToast } from '@/hooks/use-toast';
import { getAssetCategoryKind } from '@/lib/asset-category';
import { resolveAssetRoomLabel, resolveAssetServiceLabel } from '@/lib/asset-display';
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

function hoursToHHMM(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function secondsToHHMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatDuration(session: {
  durationMinutes: number;
  requestedDurationHours: number | null;
  isVip: boolean;
  sessionStatus: 'active' | 'completed' | 'cancelled';
}) {
  if (session.isVip && session.sessionStatus === 'active') {
    return 'VIP';
  }

  if (session.requestedDurationHours !== null) {
    return hoursToHHMM(session.requestedDurationHours);
  }

  const h = Math.floor(session.durationMinutes / 60);
  const m = session.durationMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function AktivSeanslarPage() {
  const { sessions, endSession, deleteSession, isCheckingAuth } = useDashboard();
  const { toast } = useToast();
  const [sessionSearch, setSessionSearch] = useState('');
  const [now, setNow] = useState(() => Date.now());

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
                const elapsedSeconds = (now - new Date(session.startTime).getTime()) / 1000;
                const elapsedHours = elapsedSeconds / 3600;
                const hourlyRate = session.assets.reduce((sum, a) => sum + (a.hourlyPrice ?? 0), 0);
                const liveCost = Math.round(elapsedHours * hourlyRate);

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
                          {session.assetsCount} jihoz • {session.pricing.label === 'Service pricing' ? 'Xizmat narxi' : session.pricing.label}
                        </p>
                      </div>

                      <DeleteConfirmButton
                        itemName={`session ${session.backendId}`}
                        title="Bu seansni yakunlash"
                        description={
                          <span className="space-y-2 text-sm">
                            <span className="block text-white/70">Bu seansni yakunlashni xohlaysizmi?</span>
                            <span className="block">
                              <span className="text-[10px] uppercase tracking-widest text-white/40">Ishlatilgan vaqt: </span>
                              <span className="font-mono font-black text-white">{secondsToHHMMSS(elapsedSeconds)}</span>
                            </span>
                            <span className="block rounded-xl border border-primary/20 bg-primary/10 px-3 py-2">
                              <span className="text-[10px] uppercase tracking-widest text-primary/60">Narx: </span>
                              <span className="font-black text-primary">{liveCost.toLocaleString()} so'm</span>
                            </span>
                          </span>
                        }
                        confirmLabel="Yakunlash"
                        onConfirm={async () => {
                          try {
                            await endSession(session.backendId);
                            toast({
                              title: 'Seans yakunlandi',
                              description: 'Seans Aktiv seanslar ro\'yxatidan chiqarildi va Trade bo\'limiga yuborildi.',
                            });
                          } catch (error) {
                            toast({
                              variant: 'destructive',
                              title: 'Seans yakunlanmadi',
                              description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
                            });
                            throw error;
                          }
                        }}
                      >
                        <Button className="h-10 rounded-xl bg-primary text-[10px] font-black uppercase tracking-widest text-black hover:bg-primary/90">
                          <StopCircle className="mr-2 h-4 w-4" /> End session
                        </Button>
                      </DeleteConfirmButton>
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
                            ? `${secondsToHHMMSS(elapsedSeconds)} / ${secondsToHHMMSS(session.requestedDurationHours * 3600)}`
                            : secondsToHHMMSS(elapsedSeconds)}
                        </p>
                      </div>

                      <div className="col-span-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-primary/50">Jonli narx</p>
                        <p className="mt-2 text-sm font-black text-primary">
                          {liveCost.toLocaleString()} so'm
                        </p>
                      </div>
                    </div>

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
              {endedSessions.map((session) => (
                <div key={session.id} className="space-y-5 rounded-3xl border border-white/5 bg-[#0a1515]/60 p-5 shadow-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-white/10 font-black uppercase tracking-widest text-white">Ended</Badge>
                        <Badge variant="outline" className="border-white/10 uppercase tracking-widest text-white/60">
                          {session.tradeExists ? 'Trade saved' : 'Trade missing'}
                        </Badge>
                        {session.isVip ? (
                          <Badge variant="outline" className="border-primary/30 uppercase tracking-widest text-primary">
                            <Crown className="mr-1 h-3 w-3" /> VIP
                          </Badge>
                        ) : null}
                      </div>
                      <h4 className="text-lg font-black uppercase tracking-tight text-white">{session.roomLabel}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                        {session.assetsCount} jihoz • {session.pricing.label === 'Service pricing' ? 'Xizmat narxi' : session.pricing.label}
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
                      <p className="mt-2 text-[11px] font-bold text-white">{formatDateTime(session.endedAt ?? session.endTime)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                      <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Davomiyligi</p>
                      <p className="mt-2 text-sm font-black text-white">{formatDuration(session)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                      <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Trade holati</p>
                      <p className="mt-2 text-sm font-black text-primary">{session.tradeExists ? 'Saved' : 'Pending'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
