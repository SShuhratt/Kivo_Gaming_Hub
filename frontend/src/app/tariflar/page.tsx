'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useDashboard } from '@/context/dashboard-context';
import { Plus, CreditCard, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function TariflarPage() {
  const { tariffs, createTariff, isCheckingAuth } = useDashboard();
  const { toast } = useToast();
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);
  const [newTariff, setNewTariff] = useState({
    name: '',
    price: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  if (isCheckingAuth) return null;

  const handleAddTariff = async () => {
    if (!newTariff.name || !newTariff.price) return;

    try {
      setIsSaving(true);
      await createTariff({
        name: newTariff.name,
        hourlyPrice: Number(newTariff.price),
      });
      setNewTariff({ name: '', price: '' });
      setIsTariffModalOpen(false);
      toast({ title: "Tarif yaratildi!", description: "Yangi narx paketi bazaga saqlandi." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Tarif saqlanmadi",
        description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
       

        {tariffs.length === 0 ? (
          <div className="relative rounded-[32px] border border-dashed border-primary/10 min-h-[400px] flex flex-col items-center justify-center text-center bg-[#061414]/20 backdrop-blur-sm">
            <div className="space-y-6 flex flex-col items-center">
              <div className="h-20 w-20 rounded-full border border-primary/10 bg-primary/5 flex items-center justify-center shadow-[0_0_40px_rgba(0,255,255,0.03)]">
                <CreditCard className="h-8 w-8 text-primary opacity-20" />
              </div>
              <div className="space-y-1.5 mb-2">
                <h3 className="text-base font-black text-white uppercase tracking-tight">TARIFLAR RO'YXATI BO'SH</h3>
                <p className="text-[10px] text-[#444f4f] font-medium max-w-[200px] mx-auto leading-relaxed uppercase tracking-[0.2em]">
                  O'yin xonalari uchun maxsus narx paketlarini yarating.
                </p>
              </div>
              <Button 
                onClick={() => setIsTariffModalOpen(true)}
                className="h-12 bg-primary text-black font-black uppercase tracking-[0.2em] rounded-xl shadow-[0_10px_30px_rgba(0,255,255,0.2)] hover:bg-primary/90 transition-all flex items-center gap-3 px-8 text-xs"
              >
                <PlusCircle className="h-4.5 w-4.5" /> YANGI TARIF YARATISH
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {tariffs.map((t) => (
                <div key={t.id} className="bg-[#0a1515]/60 border border-white/5 p-5 rounded-2xl space-y-4 hover:border-primary/30 transition-all shadow-xl backdrop-blur-md group">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-white uppercase tracking-tight">{t.name}</h4>
                    <p className="text-primary font-black text-xs tracking-tight">{t.hourlyPrice.toLocaleString()} UZS / SOAT</p>
                  </div>
                  <div className="pt-3 border-t border-white/5">
                    <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">ID: {t.backendId}</span>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setIsTariffModalOpen(true)}
              className="fixed bottom-10 right-10 h-14 w-14 bg-primary text-black rounded-2xl shadow-[0_15px_40px_rgba(0,255,255,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-30 group"
            >
              <Plus className="h-7 w-7 transition-transform group-hover:rotate-90" />
            </button>
          </>
        )}

        <Dialog open={isTariffModalOpen} onOpenChange={setIsTariffModalOpen}>
          <DialogContent className="bg-[#0a1f1f] border-white/10 text-white max-w-sm rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-base font-black uppercase tracking-tight">YANGI TARIF</DialogTitle>
              <DialogDescription className="text-[9px] text-muted-foreground/60 font-medium uppercase tracking-[0.2em]">Narx paketlari asosida yarating.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Tarif Nomi</Label>
                <Input 
                  placeholder="M: VIP Seans" 
                  value={newTariff.name}
                  onChange={(e) => setNewTariff({...newTariff, name: e.target.value})}
                  className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">SOATLIK Narxi (UZS)</Label>
                <Input 
                  type="number"
                  placeholder="M: 50000" 
                  value={newTariff.price}
                  onChange={(e) => setNewTariff({...newTariff, price: e.target.value})}
                  className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={isSaving} onClick={() => void handleAddTariff()} className="w-full h-12 bg-primary text-black font-black uppercase tracking-[0.3em] rounded-xl shadow-[0_10px_30px_rgba(0,255,255,0.2)] hover:bg-primary/90 transition-all active:scale-[0.98] text-xs">
                TASDIQLASH
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
