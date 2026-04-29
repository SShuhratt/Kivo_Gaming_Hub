'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useDashboard } from '@/context/dashboard-context';
import { Monitor, Plus, Trash2, Gamepad2, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function KompyuterlarPage() {
  const { assets, createAsset, deleteAsset, isCheckingAuth } = useDashboard();
  const { toast } = useToast();
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [category, setCategory] = useState<'Computer' | 'PS'>('Computer');
  const [isSaving, setIsSaving] = useState(false);

  if (isCheckingAuth) return null;

  const handleCreateAsset = async () => {
    if (!roomId) {
      return;
    }

    try {
      setIsSaving(true);
      await createAsset({
        category,
        roomId: Number(roomId),
      });
      setRoomId('');
      setCategory('Computer');
      setIsAssetModalOpen(false);
      toast({ title: "Jihoz qo'shildi", description: `Xona ${roomId} uchun yangi jihoz yaratildi.` });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: "Jihoz saqlanmadi",
        description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-in fade-in duration-500 space-y-6">
        <div className="flex items-center justify-between bg-[#0a1a1a]/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Jihozlar ({assets.length})</h2>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Booking API uchun aktiv qurilmalar</p>
          </div>
          <Button onClick={() => setIsAssetModalOpen(true)} className="h-10 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-xl px-6 transition-all">
            <Plus className="mr-2 h-4 w-4" /> Jihoz Qo'shish
          </Button>
        </div>

        {assets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/5 h-[400px] flex flex-col items-center justify-center bg-[#061414]/20 gap-4">
            <Monitor className="h-12 w-12 text-primary/30" />
            <p className="text-[10px] font-black text-[#444f4f] uppercase tracking-[0.5em]">Jihozlar hali yaratilmagan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-[#0a1515]/60 border border-white/5 p-5 rounded-2xl space-y-4 hover:border-primary/30 transition-all shadow-xl backdrop-blur-md">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/5 border border-primary/20">
                      {asset.category === 'Computer' ? <Cpu className="h-5 w-5 text-primary" /> : <Gamepad2 className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight">{asset.category}</h3>
                      <p className="text-[9px] font-black text-primary/40 uppercase tracking-widest">Xona {asset.roomNumber}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      try {
                        await deleteAsset(asset);
                        toast({ title: "O'chirildi", description: `Jihoz #${asset.backendId} olib tashlandi.` });
                      } catch (error) {
                        toast({
                          variant: 'destructive',
                          title: "O'chirishda xatolik",
                          description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
                        });
                      }
                    }}
                    className="h-8 w-8 rounded-lg bg-destructive/5 border border-destructive/10 text-destructive/40 hover:text-destructive hover:border-destructive/30 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Foydalanish</p>
                    <p className="text-sm font-black text-white mt-1">{asset.totalUsageDurationMinutes} min</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Daromad</p>
                    <p className="text-sm font-black text-primary mt-1">{asset.totalEarnedMoney.toLocaleString()} UZS</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isAssetModalOpen} onOpenChange={setIsAssetModalOpen}>
          <DialogContent className="bg-[#0a1f1f] border-white/10 text-white max-w-sm rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-base font-black uppercase tracking-tight">Yangi Jihoz</DialogTitle>
              <DialogDescription className="text-[9px] text-muted-foreground/60 font-medium uppercase tracking-[0.2em]">Booking uchun asset yarating.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Kategoriya</Label>
                <Select value={category} onValueChange={(value: 'Computer' | 'PS') => setCategory(value)}>
                  <SelectTrigger className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm">
                    <SelectValue placeholder="Tanlang" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a1a1a] border-white/10 text-white rounded-xl">
                    <SelectItem value="Computer" className="text-[10px] font-black uppercase">Computer</SelectItem>
                    <SelectItem value="PS" className="text-[10px] font-black uppercase">PlayStation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Xona Raqami</Label>
                <Input
                  type="number"
                  placeholder="M: 2"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={isSaving} onClick={() => void handleCreateAsset()} className="w-full h-12 bg-primary text-black font-black uppercase tracking-[0.3em] rounded-xl shadow-[0_10px_30px_rgba(0,255,255,0.2)] hover:bg-primary/90 transition-all active:scale-[0.98] text-xs">
                SAQLASH
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
