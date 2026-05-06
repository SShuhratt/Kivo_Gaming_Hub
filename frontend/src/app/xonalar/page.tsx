'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DeleteConfirmButton } from '@/components/delete-confirm-button';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ServicesSetupCallout } from '@/components/services-setup-callout';
import { useDashboard } from '@/context/dashboard-context';
import { Building2, Layers3, Monitor, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function XonalarPage() {
  const { rooms, services, servicesReady, createRoom, createAsset, deleteAsset, isCheckingAuth } = useDashboard();
  const { toast } = useToast();
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [assetModalRoomId, setAssetModalRoomId] = useState<string | null>(null);
  const [assetDraft, setAssetDraft] = useState({ name: '', serviceId: '' });
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [isSavingAsset, setIsSavingAsset] = useState(false);

  useEffect(() => {
    if (rooms.length === 0) {
      setSelectedRoomId(null);
      return;
    }

    setSelectedRoomId((current) => (current && rooms.some((room) => room.id === current) ? current : rooms[0].id));
  }, [rooms]);

  useEffect(() => {
    if (!servicesReady) {
      setAssetModalRoomId(null);
      setAssetDraft({ name: '', serviceId: '' });
    }
  }, [servicesReady]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId]
  );

  const groupedAssets = useMemo(() => {
    if (!selectedRoom) {
      return [];
    }

    const groups = new Map<string, typeof selectedRoom.assets>();

    for (const asset of selectedRoom.assets) {
      const category = asset.serviceName ?? asset.category ?? 'Kategoriya yo‘q';
      const current = groups.get(category) ?? [];
      groups.set(category, [...current, asset]);
    }

    return Array.from(groups.entries()).map(([category, assets]) => ({
      category,
      assets: assets.slice().sort((left, right) => left.name.localeCompare(right.name)),
    }));
  }, [selectedRoom]);

  if (isCheckingAuth) return null;

  const handleCreateRoom = async () => {
    if (!servicesReady) {
      toast({
        variant: 'destructive',
        title: 'Xizmatlar hali yaratilmagan',
        description: "Avval Xizmatlar bo'limida kategoriya va narx yarating.",
      });
      return;
    }

    if (!newRoomName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Xona nomi kiritilmagan',
        description: 'Yangi xona uchun nom kiriting.',
      });
      return;
    }

    try {
      setIsSavingRoom(true);
      await createRoom({ name: newRoomName });
      toast({
        title: "Xona qo'shildi",
        description: `${newRoomName} yaratildi.`,
      });
      setNewRoomName('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Xona saqlanmadi',
        description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
      });
    } finally {
      setIsSavingRoom(false);
    }
  };

  const handleOpenAssetModal = (roomId: string) => {
    if (!servicesReady || services.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Xizmat kategoriyasi yo‘q',
        description: "Avval Xizmatlar bo'limida kamida bitta kategoriya yarating.",
      });
      return;
    }

    setAssetDraft({ name: '', serviceId: '' });
    setAssetModalRoomId(roomId);
  };

  const handleCreateAsset = async () => {
    const room = rooms.find((item) => item.id === assetModalRoomId);
    const serviceId = Number(assetDraft.serviceId);

    if (!room) {
      toast({
        variant: 'destructive',
        title: 'Xona topilmadi',
        description: 'Jihoz qaysi xonaga qo‘shilishini qayta tanlang.',
      });
      return;
    }

    if (!assetDraft.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Jihoz nomi kiritilmagan',
        description: 'Jihoz nomini kiriting.',
      });
      return;
    }

    if (!Number.isFinite(serviceId) || serviceId <= 0) {
      toast({
        variant: 'destructive',
        title: 'Kategoriya tanlanmagan',
        description: 'Mavjud xizmat kategoriyasidan birini tanlang.',
      });
      return;
    }

    try {
      setIsSavingAsset(true);
      await createAsset({
        name: assetDraft.name,
        serviceId,
        roomId: room.backendId,
      });
      toast({
        title: "Jihoz qo'shildi",
        description: `${room.name} uchun yangi jihoz saqlandi.`,
      });
      setAssetModalRoomId(null);
      setAssetDraft({ name: '', serviceId: '' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Jihoz saqlanmadi',
        description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
      });
    } finally {
      setIsSavingAsset(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-in fade-in duration-500 space-y-6">
        {!servicesReady ? <ServicesSetupCallout /> : null}

        <section className="rounded-3xl border border-white/5 bg-[#0a1a1a]/40 p-5 backdrop-blur-md shadow-xl">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4 xl:items-end">
            <div className="space-y-2">
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Xonalar</h2>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                {servicesReady
                  ? "Xona yarating, keyin shu xona ichiga xizmat kategoriyasi bilan jihoz qo'shing"
                  : "Avval xizmat kategoriyasi va narx yarating, keyin xona yaratish ochiladi"}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[280px_auto] gap-3">
              <Input
                aria-label="Xona nomi"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="h-11 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm"
              />
              <Button
                disabled={isSavingRoom || !servicesReady}
                onClick={() => void handleCreateRoom()}
                className="h-11 bg-primary text-black font-black uppercase tracking-[0.2em] rounded-xl px-6"
              >
                <Plus className="mr-2 h-4 w-4" /> Xona qo'shish
              </Button>
            </div>
          </div>
        </section>

        {rooms.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/5 h-[420px] flex flex-col items-center justify-center bg-[#061414]/20 gap-4">
            <Building2 className="h-12 w-12 text-primary/30" />
            <p className="text-[10px] font-black text-[#444f4f] uppercase tracking-[0.5em]">Xonalar hali yaratilmagan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6">
            <section className="space-y-4">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`w-full text-left rounded-3xl border p-5 shadow-xl transition-all ${
                    selectedRoomId === room.id
                      ? 'border-primary bg-[#0b1d1d] shadow-[0_0_30px_rgba(0,255,255,0.08)]'
                      : 'border-white/5 bg-[#0a1515]/60 hover:border-primary/25'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white uppercase tracking-tight">{room.name}</h3>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                          {room.assets.length} jihoz biriktirilgan
                        </p>
                      </div>
                    </div>

                    <Button
                      disabled={!servicesReady}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenAssetModal(room.id);
                      }}
                      className="shrink-0 h-10 rounded-xl bg-primary text-black font-black uppercase tracking-[0.2em] text-[10px] hover:bg-primary/90"
                    >
                      Jihozlar qo'shish
                    </Button>
                  </div>
                </button>
              ))}
            </section>

            <section className="rounded-3xl border border-white/5 bg-[#0a1515]/60 p-6 shadow-xl min-h-[460px]">
              {selectedRoom ? (
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-primary/50 uppercase tracking-[0.3em]">ROOM DETAIL</p>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">{selectedRoom.name} jihozlari</h3>
                    </div>
                    <Button
                      disabled={!servicesReady}
                      onClick={() => handleOpenAssetModal(selectedRoom.id)}
                      className="h-10 rounded-xl bg-primary text-black font-black uppercase tracking-[0.2em] text-[10px] hover:bg-primary/90"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Jihozlar qo'shish
                    </Button>
                  </div>

                  {groupedAssets.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/5 h-[300px] flex flex-col items-center justify-center bg-[#051111] gap-4">
                      <Layers3 className="h-10 w-10 text-primary/25" />
                      <p className="text-[10px] font-black text-[#556060] uppercase tracking-[0.4em]">Bu xonada jihoz yo'q</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {groupedAssets.map((group) => (
                        <div key={group.category} className="rounded-2xl border border-white/5 bg-[#051111] p-5">
                          <p className="text-sm font-black text-primary uppercase tracking-[0.2em]">{group.category}</p>
                          <div className="mt-4 space-y-3">
                            {group.assets.map((asset, index) => (
                              <div
                                key={asset.id}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                    <Monitor className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-black text-white truncate">
                                      {index + 1}. {asset.name}
                                    </p>
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                                      {(asset.servicePrice ?? 0).toLocaleString()} UZS / soat
                                    </p>
                                  </div>
                                </div>

                                <DeleteConfirmButton
                                  itemName={asset.name}
                                  onConfirm={async () => {
                                    try {
                                      await deleteAsset(asset);
                                      toast({
                                        title: "Jihoz o'chirildi",
                                        description: `${asset.name} olib tashlandi.`,
                                      });
                                    } catch (error) {
                                      toast({
                                        variant: 'destructive',
                                        title: "Jihoz o'chirilmadi",
                                        description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
                                      });
                                      throw error;
                                    }
                                  }}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive/50 hover:text-destructive hover:border-destructive/30"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </DeleteConfirmButton>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          </div>
        )}

        <Dialog
          open={assetModalRoomId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setAssetModalRoomId(null);
              setAssetDraft({ name: '', serviceId: '' });
            }
          }}
        >
          <DialogContent className="bg-[#0a1f1f] border-white/10 text-white max-w-sm rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-base font-black uppercase tracking-tight">JIHOZ QO'SHISH</DialogTitle>
              <DialogDescription className="text-[9px] text-muted-foreground/60 font-medium uppercase tracking-[0.2em]">
                Jihoz faqat tanlangan xonaga va mavjud xizmat kategoriyasiga biriktiriladi.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-6">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Jihoz nomi</Label>
                <Input
                  aria-label="Jihoz nomi"
                  value={assetDraft.name}
                  onChange={(e) => setAssetDraft((current) => ({ ...current, name: e.target.value }))}
                  className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Xizmat kategoriyasi</Label>
                <Select value={assetDraft.serviceId} onValueChange={(value) => setAssetDraft((current) => ({ ...current, serviceId: value }))}>
                  <SelectTrigger className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a1a1a] border-white/10 text-white rounded-xl">
                    {services.map((service) => (
                      <SelectItem key={service.id} value={String(service.backendId)} className="text-[10px] font-black uppercase">
                        {service.name} • {service.price.toLocaleString()} UZS
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={isSavingAsset}
                onClick={() => void handleCreateAsset()}
                className="w-full h-12 bg-primary text-black font-black uppercase tracking-[0.3em] rounded-xl shadow-[0_10px_30px_rgba(0,255,255,0.2)] hover:bg-primary/90 transition-all active:scale-[0.98] text-xs"
              >
                SAQLASH
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
