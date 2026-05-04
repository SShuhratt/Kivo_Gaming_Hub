'use client';

import React, { useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { DeleteConfirmButton } from '@/components/delete-confirm-button';
import { useDashboard } from '@/context/dashboard-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Clock3, Crown, Gamepad2, Monitor, ShieldAlert, StopCircle, Trash2 } from 'lucide-react';
import { formatAssetCategoryLabel, getAssetCategoryKind } from '@/lib/asset-category';

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
    return `${session.requestedDurationHours} soat`;
  }

  return `${session.durationMinutes} min`;
}

export default function AktivSeanslarPage() {
  const { sessions, endSession, deleteSession, isCheckingAuth } = useDashboard();
  const { toast } = useToast();

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.sessionStatus === 'active'),
    [sessions]
  );
  const endedSessions = useMemo(
    () => sessions.filter((session) => session.sessionStatus !== 'active'),
    [sessions]
  );

  if (isCheckingAuth) return null;

  return (
    <DashboardLayout>
      <div className="animate-in fade-in duration-500 space-y-6">
        <div className="bg-[#0a1a1a]/40 p-5 rounded-3xl border border-white/5 backdrop-blur-md flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Aktiv seanslar</h2>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
              Active Sessions va yakunlangan yozuvlarni boshqarish
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-[8px] font-black text-primary/60 uppercase tracking-widest">Aktiv</p>
              <p className="text-lg font-black text-white mt-1">{activeSessions.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Yakunlangan</p>
              <p className="text-lg font-black text-white mt-1">{endedSessions.length}</p>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Clock3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Ishlayotgan seanslar</h3>
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1">
                Aktiv seanslar Trade bo'limiga hali kiritilmaydi
              </p>
            </div>
          </div>

          {activeSessions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/5 h-[220px] flex flex-col items-center justify-center bg-[#061414]/20 gap-4">
              <CheckCircle2 className="h-10 w-10 text-primary/30" />
              <p className="text-[10px] font-black text-[#556060] uppercase tracking-[0.4em]">Aktiv seans topilmadi</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {activeSessions.map((session) => (
                <div key={session.id} className="bg-[#0a1515]/60 border border-white/5 rounded-3xl p-5 space-y-5 shadow-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary text-black font-black uppercase tracking-widest">Active</Badge>
                        <Badge variant="outline" className="border-white/10 text-white/60 uppercase tracking-widest">
                          {session.status === 'submitted' ? "To'langan" : 'Qarz'}
                        </Badge>
                        {session.isVip ? (
                          <Badge variant="outline" className="border-primary/30 text-primary uppercase tracking-widest">
                            <Crown className="mr-1 h-3 w-3" /> VIP
                          </Badge>
                        ) : null}
                      </div>
                      <h4 className="text-lg font-black text-white uppercase tracking-tight">{session.roomLabel}</h4>
                      <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">
                        {session.assetsCount} jihoz • {session.tariff.name ?? 'Tarif yo‘q'}
                      </p>
                    </div>

                    <DeleteConfirmButton
                      itemName={`session ${session.backendId}`}
                      title="End session"
                      description="Do you want to end this active session now?"
                      confirmLabel="End session"
                      onConfirm={async () => {
                        try {
                          await endSession(session.backendId);
                          toast({
                            title: 'Seans yakunlandi',
                            description: 'Seans Aktiv seanslar ro‘yxatidan chiqarildi va Trade bo‘limiga yuborildi.',
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
                      <Button className="h-10 rounded-xl bg-primary text-black font-black uppercase tracking-widest text-[10px] hover:bg-primary/90">
                        <StopCircle className="mr-2 h-4 w-4" /> End session
                      </Button>
                    </DeleteConfirmButton>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Boshlanish</p>
                      <p className="text-[11px] font-bold text-white mt-2">{formatDateTime(session.startTime)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">
                        {session.isVip ? 'VIP holati' : 'Rejadagi tugash'}
                      </p>
                      <p className="text-[11px] font-bold text-white mt-2">
                        {session.isVip ? 'Ochiq seans' : formatDateTime(session.endTime)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Davomiyligi</p>
                      <p className="text-sm font-black text-white mt-2">{formatDuration(session)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">
                        {session.isVip ? 'Hisob-kitob' : 'Jami'}
                      </p>
                      <p className="text-sm font-black text-primary mt-2">
                        {session.isVip ? 'Seans yakunida' : `${session.totalCost.toLocaleString()} UZS`}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Jihozlar</p>
                    <div className="flex flex-wrap gap-2">
                      {session.assets.map((asset, index) => (
                        <div key={`${session.id}-${asset.id ?? index}`} className="rounded-xl bg-[#051111] border border-white/5 px-3 py-2 flex items-center gap-2">
                          {getAssetCategoryKind(asset.category) === 'console' ? (
                            <Gamepad2 className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Monitor className="h-3.5 w-3.5 text-primary" />
                          )}
                          <span className="text-[10px] font-black text-white uppercase tracking-tight">
                            {formatAssetCategoryLabel(asset.category)} {asset.roomNumber ? `• Xona ${asset.roomNumber}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Trash2 className="h-4 w-4 text-white/70" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Yakunlangan yozuvlar</h3>
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1">
                Trade saqlangandan keyin bu yozuvlar ro‘yxatdan tozalanishi mumkin
              </p>
            </div>
          </div>

          {endedSessions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/5 h-[180px] flex flex-col items-center justify-center bg-[#061414]/20 gap-4">
              <ShieldAlert className="h-10 w-10 text-white/20" />
              <p className="text-[10px] font-black text-[#556060] uppercase tracking-[0.4em]">Yakunlangan yozuv yo‘q</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {endedSessions.map((session) => (
                <div key={session.id} className="bg-[#0a1515]/60 border border-white/5 rounded-3xl p-5 space-y-5 shadow-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-white/10 text-white font-black uppercase tracking-widest">Ended</Badge>
                        <Badge variant="outline" className="border-white/10 text-white/60 uppercase tracking-widest">
                          {session.tradeExists ? 'Trade saved' : 'Trade missing'}
                        </Badge>
                        {session.isVip ? (
                          <Badge variant="outline" className="border-primary/30 text-primary uppercase tracking-widest">
                            <Crown className="mr-1 h-3 w-3" /> VIP
                          </Badge>
                        ) : null}
                      </div>
                      <h4 className="text-lg font-black text-white uppercase tracking-tight">{session.roomLabel}</h4>
                      <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">
                        {session.assetsCount} jihoz • {session.tariff.name ?? 'Tarif yo‘q'}
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
                          className="h-10 w-10 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive/50 hover:text-destructive hover:border-destructive/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DeleteConfirmButton>
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Delete disabled</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Boshlanish</p>
                      <p className="text-[11px] font-bold text-white mt-2">{formatDateTime(session.startTime)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Yakunlandi</p>
                      <p className="text-[11px] font-bold text-white mt-2">{formatDateTime(session.endedAt ?? session.endTime)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Davomiyligi</p>
                      <p className="text-sm font-black text-white mt-2">{formatDuration(session)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Trade holati</p>
                      <p className="text-sm font-black text-primary mt-2">{session.tradeExists ? 'Saved' : 'Pending'}</p>
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
