'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useDashboard } from '@/context/dashboard-context';
import { Plus, Wrench, Key, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function XizmatlarPage() {
  const { services, createServiceRoom, deleteServiceRoom, isCheckingAuth } = useDashboard();
  const { toast } = useToast();
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [newService, setNewService] = useState({ names: '', roomNumber: '' });
  const [isSaving, setIsSaving] = useState(false);

  if (isCheckingAuth) return null;

  const handleAddService = async () => {
    if (!newService.names || !newService.roomNumber) return;

    try {
      setIsSaving(true);
      const itemsList = newService.names.split(',').map(s => s.trim()).filter(Boolean);
      await createServiceRoom({
        roomNumber: newService.roomNumber,
        items: itemsList,
      });

      setNewService({ names: '', roomNumber: '' });
      setIsServiceModalOpen(false);
      toast({ title: "Muvaffaqiyatli!", description: `${newService.roomNumber}-hona xizmatlari qo'shildi.` });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Xizmat saqlanmadi",
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
                <h3 className="text-base font-black text-white uppercase tracking-tight">XIZMATLAR RO'YXATI BO'SH</h3>
                <p className="text-[10px] text-[#444f4f] font-medium max-w-[200px] mx-auto leading-relaxed uppercase tracking-[0.2em]">
                  Yangi xona va xizmatlarni qo'shib, boshqaruvni boshlang.
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
              {services.map((room) => (
                <div key={room.id} className="bg-[#0a1515]/60 border border-white/5 p-5 rounded-2xl space-y-4 hover:border-primary/30 transition-all shadow-xl backdrop-blur-md group relative">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                       <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/5 border border-primary/20 shadow-[0_0_10px_rgba(0,255,255,0.05)]">
                         <Key className="h-4 w-4 text-primary" />
                       </div>
                       <h4 className="text-sm font-black text-white uppercase tracking-tight">XONA {room.roomNumber}</h4>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await deleteServiceRoom(room);
                          toast({ title: "O'chirildi", description: `Xona ${room.roomNumber} xizmatlari olib tashlandi.` });
                        } catch (error) {
                          toast({
                            variant: "destructive",
                            title: "O'chirishda xatolik",
                            description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
                          });
                        }
                      }}
                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-destructive/40 hover:text-destructive transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {room.items.map((item, i) => (
                      <Badge key={i} className="bg-primary/5 text-primary border-primary/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg">
                        {item}
                      </Badge>
                    ))}
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
              <DialogTitle className="text-base font-black uppercase tracking-tight">YANGI XIZMAT</DialogTitle>
              <DialogDescription className="text-[9px] text-muted-foreground/60 font-medium uppercase tracking-[0.2em]">Hona va jihozlarni biriktiring.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Xizmat Nomlari (mas: PS5, PS4)</Label>
                <Input 
                  placeholder="Kiriting..." 
                  value={newService.names}
                  onChange={(e) => setNewService({...newService, names: e.target.value})}
                  className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Hona Raqami</Label>
                <Input 
                  type="number"
                  placeholder="M: 1" 
                  value={newService.roomNumber}
                  onChange={(e) => setNewService({...newService, roomNumber: e.target.value})}
                  className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={isSaving} onClick={() => void handleAddService()} className="w-full h-12 bg-primary text-black font-black uppercase tracking-[0.3em] rounded-xl shadow-[0_10px_30px_rgba(0,255,255,0.2)] hover:bg-primary/90 transition-all active:scale-[0.98] text-xs">
                SAQLASH
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
