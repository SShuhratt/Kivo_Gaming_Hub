'use client';

import React, { useState } from 'react';
import { DeleteConfirmButton } from '@/components/delete-confirm-button';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useDashboard } from '@/context/dashboard-context';
import { Plus, Wrench, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function XizmatlarPage() {
  const { services, createService, deleteService, isCheckingAuth } = useDashboard();
  const { toast } = useToast();
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [draft, setDraft] = useState({ name: '', price: '' });
  const [isSaving, setIsSaving] = useState(false);

  if (isCheckingAuth) return null;

  const handleCreateService = async () => {
    const price = Number(draft.price);

    if (!draft.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Kategoriya nomi kiritilmagan',
        description: "Xizmat kategoriyasi nomini kiriting.",
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
        description: `${draft.name} kategoriyasi saqlandi.`,
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
          <div className="relative rounded-[32px] border border-dashed border-primary/10 min-h-[400px] flex flex-col items-center justify-center text-center bg-[#061414]/20 backdrop-blur-sm">
            <div className="space-y-6 flex flex-col items-center">
              <div className="h-20 w-20 rounded-full border border-primary/10 bg-primary/5 flex items-center justify-center shadow-[0_0_40px_rgba(0,255,255,0.03)]">
                <Wrench className="h-8 w-8 text-primary opacity-20" />
              </div>
              <div className="space-y-1.5 mb-2">
                <h3 className="text-base font-black text-white uppercase tracking-tight">XIZMAT KATEGORIYALARI BO'SH</h3>
                <p className="text-[10px] text-[#444f4f] font-medium max-w-[260px] mx-auto leading-relaxed uppercase tracking-[0.2em]">
                  Avval kategoriya va soatlik narxni kiriting. Shu kategoriyalar keyin xonadagi jihozlarga biriktiriladi.
                </p>
              </div>
              <Button
                onClick={() => setIsServiceModalOpen(true)}
                className="h-12 bg-primary text-black font-black uppercase tracking-[0.2em] rounded-xl shadow-[0_10px_30px_rgba(0,255,255,0.2)] hover:bg-primary/90 transition-all flex items-center gap-3 px-8 text-xs"
              >
                <Plus className="h-4.5 w-4.5" /> XIZMAT QO'SHISH
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="bg-[#0a1515]/60 border border-white/5 p-5 rounded-2xl space-y-4 hover:border-primary/30 transition-all shadow-xl backdrop-blur-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-primary/50 uppercase tracking-[0.3em]">KATEGORIYA</p>
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">{service.name}</h4>
                    </div>
                    <DeleteConfirmButton
                      itemName={service.name}
                      onConfirm={async () => {
                        try {
                          await deleteService(service);
                          toast({
                            title: "O'chirildi",
                            description: `${service.name} kategoriyasi olib tashlandi.`,
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
                      <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-destructive/40 hover:text-destructive transition-all">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </DeleteConfirmButton>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-[#051111] px-4 py-3">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Narx</p>
                    <p className="text-lg font-black text-primary mt-2">{service.price.toLocaleString()} UZS</p>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Bog'langan jihozlar</p>
                    <p className="text-sm font-black text-white mt-2">{service.assetsCount}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsServiceModalOpen(true)}
              className="fixed bottom-10 right-10 h-14 w-14 bg-primary text-black rounded-2xl shadow-[0_15px_40px_rgba(0,255,255,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-30 group"
            >
              <Plus className="h-7 w-7 transition-transform group-hover:rotate-90" />
            </button>
          </>
        )}

        <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
          <DialogContent className="bg-[#0a1f1f] border-white/10 text-white max-w-sm rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-base font-black uppercase tracking-tight">YANGI XIZMAT KATEGORIYASI</DialogTitle>
              <DialogDescription className="text-[9px] text-muted-foreground/60 font-medium uppercase tracking-[0.2em]">
                Jihozlar aynan shu ro'yxatdagi kategoriyalardan birini tanlaydi.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Kategoriya nomi</Label>
                <Input
                  aria-label="Kategoriya nomi"
                  value={draft.name}
                  onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))}
                  className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Narxi (UZS)</Label>
                <Input
                  type="number"
                  aria-label="Narxi"
                  value={draft.price}
                  onChange={(e) => setDraft((current) => ({ ...current, price: e.target.value }))}
                  className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={isSaving}
                onClick={() => void handleCreateService()}
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
