'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DeleteConfirmButton } from '@/components/delete-confirm-button';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ServicesSetupCallout } from '@/components/services-setup-callout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDashboard } from '@/context/dashboard-context';
import { useToast } from '@/hooks/use-toast';
import { groupAssetsByService, matchesAssetSearch } from '@/lib/asset-display';
import { AlertTriangle, Building2, Layers3, Monitor, Plus, Search, Trash2 } from 'lucide-react';

const roomDeleteBlockMessage = "This room has assets. Delete its assets first.";
const roomDeleteBlockMessageUz = "Bu xonada jihozlar bor. Avval jihozlarni o'chiring.";

export default function XonalarPage() {
  const {
    rooms,
    services,
    servicesReady,
    createRoom,
    createAsset,
    deleteAsset,
    deleteRoom,
    deleteRoomAssets,
    isCheckingAuth,
  } = useDashboard();
  const { toast } = useToast();

  const [newRoomName, setNewRoomName] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [assetModalRoomId, setAssetModalRoomId] = useState<string | null>(null);
  const [assetDraft, setAssetDraft] = useState({ name: '', serviceId: '' });
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const baseServices = useMemo(() => services.filter((service) => !service.isBundle), [services]);

  const filteredRooms = useMemo(() => {
    const query = roomSearch.trim().toLowerCase();

    if (!query) {
      return rooms;
    }

    return rooms.filter((room) => room.name.toLowerCase().includes(query));
  }, [roomSearch, rooms]);

  useEffect(() => {
    if (filteredRooms.length === 0) {
      setSelectedRoomId(null);
      return;
    }

    setSelectedRoomId((current) =>
      current && filteredRooms.some((room) => room.id === current) ? current : filteredRooms[0].id,
    );
  }, [filteredRooms]);

  useEffect(() => {
    if (!servicesReady) {
      setAssetModalRoomId(null);
      setAssetDraft({ name: '', serviceId: '' });
    }
  }, [servicesReady]);

  const selectedRoom = useMemo(
    () => filteredRooms.find((room) => room.id === selectedRoomId) ?? null,
    [filteredRooms, selectedRoomId],
  );

  const groupedAssets = useMemo(() => {
    if (!selectedRoom) {
      return [];
    }

    return groupAssetsByService(
      selectedRoom.assets.filter((asset) => matchesAssetSearch(asset, assetSearch)),
    );
  }, [assetSearch, selectedRoom]);

  if (isCheckingAuth) return null;

  const handleCreateRoom = async () => {
    if (!servicesReady) {
      toast({
        variant: 'destructive',
        title: 'Xizmatlar hali yaratilmagan',
        description: "Avval Xizmatlar bo'limida xizmat nomi va narx yarating.",
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
    if (!servicesReady || baseServices.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Xizmatlar topilmadi',
        description: "Avval Xizmatlar bo'limida kamida bitta xizmat yarating.",
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
        title: 'Xizmat tanlanmagan',
        description: 'Mavjud xizmatlardan birini tanlang.',
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

        <section className="rounded-3xl border border-white/5 bg-[#0a1a1a]/40 p-5 shadow-xl backdrop-blur-md">
          <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
            <div className="space-y-2">
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Xonalar</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                {servicesReady
                  ? "Xona yarating, keyin shu xona ichiga xizmat bilan bog'langan jihoz qo'shing"
                  : "Avval xizmat nomi va narx yarating, keyin xona va jihoz yaratish ochiladi"}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[280px_auto]">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Xona nomi</Label>
                <Input
                  aria-label="Xona nomi"
                  value={newRoomName}
                  onChange={(event) => setNewRoomName(event.target.value)}
                  className="h-11 rounded-xl border-white/5 bg-[#051111] px-4 text-sm font-bold"
                />
              </div>
              <Button
                disabled={isSavingRoom || !servicesReady}
                onClick={() => void handleCreateRoom()}
                className="h-11 self-end rounded-xl bg-primary px-6 font-black uppercase tracking-[0.2em] text-black"
              >
                <Plus className="mr-2 h-4 w-4" /> Xona qo'shish
              </Button>
            </div>
          </div>
        </section>

        {rooms.length === 0 ? (
          <div className="flex h-[420px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/5 bg-[#061414]/20">
            <Building2 className="h-12 w-12 text-primary/30" />
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#444f4f]">
              Xonalar hali yaratilmagan
            </p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-3xl border border-white/5 bg-[#0a1515]/60 p-5 shadow-xl">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">
                    Xonalarni qidirish
                  </Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                    <Input
                      aria-label="Xona qidirish"
                      value={roomSearch}
                      onChange={(event) => setRoomSearch(event.target.value)}
                      className="h-11 rounded-xl border-white/5 bg-[#051111] pl-11 text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-3 pr-1 xl:h-[70vh] xl:overflow-y-auto">
                  {filteredRooms.length === 0 ? (
                    <div className="flex h-[220px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/5 bg-[#051111]">
                      <Search className="h-10 w-10 text-primary/25" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#556060]">
                        Qidiruv bo'yicha xona topilmadi
                      </p>
                    </div>
                  ) : (
                    filteredRooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => setSelectedRoomId(room.id)}
                        className={`w-full rounded-3xl border p-5 text-left shadow-xl transition-all ${
                          selectedRoomId === room.id
                            ? 'border-primary bg-[#0b1d1d] shadow-[0_0_30px_rgba(0,255,255,0.08)]'
                            : 'border-white/5 bg-[#0a1515]/60 hover:border-primary/25'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-base font-black uppercase tracking-tight text-white">{room.name}</h3>
                              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
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
                            className="h-10 shrink-0 rounded-xl bg-primary text-[10px] font-black uppercase tracking-[0.2em] text-black hover:bg-primary/90"
                          >
                            Jihoz qo'shish
                          </Button>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="min-h-[500px] overflow-hidden rounded-3xl border border-white/5 bg-[#0a1515]/60 p-6 shadow-xl xl:h-[calc(70vh+2.5rem)]">
              {selectedRoom ? (
                <div className="flex h-full flex-col space-y-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/50">ROOM DETAIL</p>
                      <h3 className="text-xl font-black uppercase tracking-tight text-white">{selectedRoom.name}</h3>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                        {selectedRoom.assets.length} jihoz • xizmatlar bo'yicha guruhlangan ko'rinish
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        disabled={!servicesReady}
                        onClick={() => handleOpenAssetModal(selectedRoom.id)}
                        className="h-10 rounded-xl bg-primary text-[10px] font-black uppercase tracking-[0.2em] text-black hover:bg-primary/90"
                      >
                        <Plus className="mr-2 h-4 w-4" /> Jihoz qo'shish
                      </Button>

                      {selectedRoom.assets.length > 0 ? (
                        <DeleteConfirmButton
                          itemName={selectedRoom.name}
                          title="Delete all assets"
                          description="Do you really want to delete all assets in this room? Bu xonadagi barcha jihozlarni o'chirishni xohlaysizmi?"
                          confirmLabel="Delete all assets"
                          onConfirm={async () => {
                            try {
                              await deleteRoomAssets(selectedRoom.backendId);
                              toast({
                                title: "Jihozlar o'chirildi",
                                description: `${selectedRoom.name} ichidagi barcha jihozlar olib tashlandi.`,
                              });
                            } catch (error) {
                              toast({
                                variant: 'destructive',
                                title: "Jihozlar o'chirilmadi",
                                description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
                              });
                              throw error;
                            }
                          }}
                        >
                          <Button className="h-10 rounded-xl border border-destructive/20 bg-destructive/10 text-[10px] font-black uppercase tracking-[0.2em] text-destructive hover:bg-destructive/15">
                            <Trash2 className="mr-2 h-4 w-4" /> Barcha jihozlarni o'chirish
                          </Button>
                        </DeleteConfirmButton>
                      ) : null}

                      <DeleteConfirmButton
                        itemName={selectedRoom.name}
                        title="Delete room"
                        description="Do you really want to delete this room? Bu xonani o'chirishni xohlaysizmi?"
                        confirmLabel="Delete room"
                        onConfirm={async () => {
                          try {
                            await deleteRoom(selectedRoom);
                            toast({
                              title: "Xona o'chirildi",
                              description: `${selectedRoom.name} ro'yxatdan olib tashlandi.`,
                            });
                          } catch (error) {
                            toast({
                              variant: 'destructive',
                              title: "Xona o'chirilmadi",
                              description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
                            });
                            throw error;
                          }
                        }}
                      >
                        <Button
                          disabled={selectedRoom.assets.length > 0}
                          variant="ghost"
                          className="h-10 rounded-xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-white/70 hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Xonani o'chirish
                        </Button>
                      </DeleteConfirmButton>
                    </div>
                  </div>

                  {selectedRoom.assets.length > 0 ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-100">
                          {roomDeleteBlockMessage}
                        </p>
                        <p className="text-[10px] font-bold text-amber-50/80">{roomDeleteBlockMessageUz}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">
                      Jihozlarni qidirish
                    </Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                      <Input
                        aria-label="Jihoz qidirish"
                        value={assetSearch}
                        onChange={(event) => setAssetSearch(event.target.value)}
                        className="h-11 rounded-xl border-white/5 bg-[#051111] pl-11 text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1">
                    {groupedAssets.length === 0 ? (
                      <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/5 bg-[#051111]">
                        <Layers3 className="h-10 w-10 text-primary/25" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#556060]">
                          {selectedRoom.assets.length === 0 ? "Bu xonada jihoz yo'q" : "Qidiruv bo'yicha jihoz topilmadi"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {groupedAssets.map((group) => (
                          <div key={group.serviceName} className="rounded-2xl border border-white/5 bg-[#051111] p-5">
                            <p className="text-sm font-black uppercase tracking-[0.2em] text-primary">{group.serviceName}</p>
                            <div className="mt-4 space-y-3">
                              {group.assets.map((asset) => (
                                <div
                                  key={String(asset.id)}
                                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                                      <Monitor className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-black text-white">
                                        {asset.displayOrder}. {asset.name}
                                      </p>
                                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
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
                                      className="h-9 w-9 rounded-xl border border-destructive/10 bg-destructive/5 text-destructive/50 hover:border-destructive/30 hover:text-destructive"
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
          <DialogContent className="max-w-sm rounded-3xl border-white/10 bg-[#0a1f1f] p-8 text-white shadow-2xl backdrop-blur-xl">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-base font-black uppercase tracking-tight">Jihoz qo'shish</DialogTitle>
              <DialogDescription className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
                Jihoz faqat tanlangan xonaga va mavjud xizmatga biriktiriladi.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-6">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Jihoz nomi</Label>
                <Input
                  aria-label="Jihoz nomi"
                  value={assetDraft.name}
                  onChange={(event) => setAssetDraft((current) => ({ ...current, name: event.target.value }))}
                  className="h-12 rounded-xl border-white/5 bg-[#051111] px-4 text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Xizmat</Label>
                <Select value={assetDraft.serviceId} onValueChange={(value) => setAssetDraft((current) => ({ ...current, serviceId: value }))}>
                  <SelectTrigger className="h-12 rounded-xl border-white/5 bg-[#051111] px-4 text-sm font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-white/10 bg-[#0a1a1a] text-white">
                    {baseServices.map((service) => (
                      <SelectItem key={service.id} value={String(service.backendId)} className="text-[10px] font-black uppercase">
                        {service.name} • {(service.rate ?? service.price).toLocaleString()} UZS
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
                className="h-12 w-full rounded-xl bg-primary text-xs font-black uppercase tracking-[0.3em] text-black shadow-[0_10px_30px_rgba(0,255,255,0.2)] transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                Saqlash
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
