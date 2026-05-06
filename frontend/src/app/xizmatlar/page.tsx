'use client';

import React, { useMemo, useState } from 'react';
import { DeleteConfirmButton } from '@/components/delete-confirm-button';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDashboard } from '@/context/dashboard-context';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Trash2, Wrench } from 'lucide-react';

export default function XizmatlarPage() {
  const { services, createService, deleteService, isCheckingAuth } = useDashboard();
  const { toast } = useToast();
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [draft, setDraft] = useState({ name: '', price: '' });
  const [isSaving, setIsSaving] = useState(false);

  const filteredServices = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();

    if (!query) {
      return services;
    }

    return services.filter((service) =>
      [service.name, service.price.toLocaleString(), String(service.price)]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [serviceSearch, services]);

  if (isCheckingAuth) return null;

  const handleCreateService = async () => {
    const price = Number(draft.price);

    if (!draft.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Xizmat nomi kiritilmagan',
        description: 'Xizmat nomini kiriting.',
      });
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      toast({
        variant: 'destructive',
        title: 'Narx noto‘g‘ri',
        description: '0 yoki undan katta narx kiriting.',
      });
      return;
    }

    try {
      setIsSaving(true);
      await createService({
        name: draft.name,
        price,
      });

      setDraft({ name: '', price: '' });
      setIsServiceModalOpen(false);
      toast({
        title: "Xizmat qo'shildi",
        description: `${draft.name} saqlandi.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Xizmat saqlanmadi',
        description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
        {services.length === 0 ? (
          <div className="relative flex min-h-[400px] flex-col items-center justify-center rounded-[32px] border border-dashed border-primary/10 bg-[#061414]/20 text-center backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/10 bg-primary/5 shadow-[0_0_40px_rgba(0,255,255,0.03)]">
                <Wrench className="h-8 w-8 text-primary opacity-20" />
              </div>
              <div className="mb-2 space-y-1.5">
                <h3 className="text-base font-black uppercase tracking-tight text-white">XIZMATLAR BO'SH</h3>
                <p className="mx-auto max-w-[320px] text-[10px] font-medium uppercase tracking-[0.2em] text-[#444f4f]">
                  Avval xizmat nomi va narxini kiriting. Shu xizmatlar keyin xonadagi jihozlarga biriktiriladi.
                </p>
              </div>
              <Button
                onClick={() => setIsServiceModalOpen(true)}
                className="flex h-12 items-center gap-3 rounded-xl bg-primary px-8 text-xs font-black uppercase tracking-[0.2em] text-black shadow-[0_10px_30px_rgba(0,255,255,0.2)] transition-all hover:bg-primary/90"
              >
                <Plus className="h-4.5 w-4.5" /> XIZMAT QO'SHISH
              </Button>
            </div>
          </div>
        ) : (
          <>
            <section className="rounded-3xl border border-white/5 bg-[#0a1a1a]/40 p-5 shadow-xl backdrop-blur-md">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="space-y-2">
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Xizmatlar</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Xizmat nomi yoki narxi bo'yicha qidiring
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[320px_auto]">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">
                      Xizmatlarni qidirish
                    </Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                      <Input
                        aria-label="Xizmat qidirish"
                        value={serviceSearch}
                        onChange={(event) => setServiceSearch(event.target.value)}
                        className="h-11 rounded-xl border-white/5 bg-[#051111] pl-11 text-sm font-bold"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => setIsServiceModalOpen(true)}
                    className="h-11 self-end rounded-xl bg-primary px-6 font-black uppercase tracking-[0.2em] text-black"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Xizmat qo'shish
                  </Button>
                </div>
              </div>
            </section>

            {filteredServices.length === 0 ? (
              <div className="flex h-[260px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/5 bg-[#061414]/20">
                <Search className="h-10 w-10 text-primary/25" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#556060]">
                  Qidiruv bo'yicha xizmat topilmadi
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredServices.map((service) => (
                  <div
                    key={service.id}
                    className="space-y-4 rounded-2xl border border-white/5 bg-[#0a1515]/60 p-5 shadow-xl backdrop-blur-md transition-all hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/50">XIZMAT</p>
                        <h4 className="text-sm font-black uppercase tracking-tight text-white">{service.name}</h4>
                      </div>
                      <DeleteConfirmButton
                        itemName={service.name}
                        title="Delete service"
                        description={`Do you really want to delete ${service.name}?`}
                        confirmLabel="Delete service"
                        onConfirm={async () => {
                          try {
                            await deleteService(service);
                            toast({
                              title: "O'chirildi",
                              description: `${service.name} olib tashlandi.`,
                            });
                          } catch (error) {
                            toast({
                              variant: 'destructive',
                              title: "O'chirishda xatolik",
                              description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
                            });
                            throw error;
                          }
                        }}
                      >
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive/40 transition-all hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </DeleteConfirmButton>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-[#051111] px-4 py-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Narx</p>
                      <p className="mt-2 text-lg font-black text-primary">{service.price.toLocaleString()} UZS</p>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Bog'langan jihozlar</p>
                      <p className="mt-2 text-sm font-black text-white">{service.assetsCount}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
          <DialogContent className="max-w-sm rounded-3xl border-white/10 bg-[#0a1f1f] p-8 text-white shadow-2xl backdrop-blur-xl">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-base font-black uppercase tracking-tight">YANGI XIZMAT</DialogTitle>
              <DialogDescription className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
                Jihozlar aynan shu ro'yxatdagi xizmatlardan birini tanlaydi.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Xizmat nomi</Label>
                <Input
                  aria-label="Xizmat nomi"
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  className="h-12 rounded-xl border-white/5 bg-[#051111] px-4 text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Narxi (UZS)</Label>
                <Input
                  type="number"
                  aria-label="Narxi"
                  value={draft.price}
                  onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}
                  className="h-12 rounded-xl border-white/5 bg-[#051111] px-4 text-sm font-bold"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={isSaving}
                onClick={() => void handleCreateService()}
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
