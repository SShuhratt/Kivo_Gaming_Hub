'use client';

import React, { useMemo, useState } from 'react';
import { DeleteConfirmButton } from '@/components/delete-confirm-button';
import { DashboardLayout } from '@/components/dashboard-layout';
import { type AssetDevice, useDashboard } from '@/context/dashboard-context';
import { Monitor, Plus, Trash2, Gamepad2, Cpu, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  collectUniqueAssetCategories,
  formatAssetCategoryLabel,
  getAssetCategoryKind,
  normalizeAssetCategoryValue,
} from '@/lib/asset-category';

type AssetFormState = {
  name: string;
  category: string;
  roomId: string;
};

const emptyFormState: AssetFormState = {
  name: '',
  category: '',
  roomId: '',
};

export default function JihozlarPage() {
  const { assets, createAsset, updateAsset, deleteAsset, isCheckingAuth } = useDashboard();
  const { toast } = useToast();
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [formState, setFormState] = useState<AssetFormState>(emptyFormState);
  const [editingAsset, setEditingAsset] = useState<AssetDevice | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const categoryOptions = useMemo(
    () => collectUniqueAssetCategories(assets.map((asset) => asset.category)),
    [assets]
  );

  if (isCheckingAuth) return null;

  const openCreateModal = () => {
    setEditingAsset(null);
    setFormState(emptyFormState);
    setIsAssetModalOpen(true);
  };

  const openEditModal = (asset: AssetDevice) => {
    setEditingAsset(asset);
    setFormState({
      name: asset.name,
      category: asset.category,
      roomId: String(asset.roomId),
    });
    setIsAssetModalOpen(true);
  };

  const handleSaveAsset = async () => {
    const normalizedCategory = normalizeAssetCategoryValue(formState.category);
    const parsedRoomId = Number(formState.roomId);

    if (!formState.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Jihoz nomi kiritilmagan',
        description: "Jihoz nomini kiriting (Masalan: Kompyuter 1).",
      });
      return;
    }

    if (!normalizedCategory) {
      toast({
        variant: 'destructive',
        title: 'Kategoriya kiritilmagan',
        description: "Jihoz kategoriyasini kiriting (Masalan: Kompyuterlar).",
      });
      return;
    }

    if (!Number.isFinite(parsedRoomId) || parsedRoomId <= 0) {
      toast({
        variant: 'destructive',
        title: "Xona raqami noto'g'ri",
        description: 'Musbat xona raqamini kiriting.',
      });
      return;
    }

    try {
      setIsSaving(true);

      if (editingAsset) {
        await updateAsset({
          backendId: editingAsset.backendId,
          name: formState.name.trim(),
          category: normalizedCategory,
          roomId: parsedRoomId,
        });
      } else {
        await createAsset({
          name: formState.name.trim(),
          category: normalizedCategory,
          roomId: parsedRoomId,
        });
      }

      setFormState(emptyFormState);
      setEditingAsset(null);
      setIsAssetModalOpen(false);
      toast({
        title: editingAsset ? 'Jihoz yangilandi' : "Jihoz qo'shildi",
        description: `Xona ${parsedRoomId} uchun jihoz saqlandi.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: editingAsset ? 'Jihoz yangilanmadi' : 'Jihoz saqlanmadi',
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
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Jihozlar bo'limida barcha session jihozlari boshqariladi</p>
          </div>
          <Button onClick={openCreateModal} className="h-10 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-xl px-6 transition-all">
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
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/5 border border-primary/20 shrink-0">
                      {getAssetCategoryKind(asset.category) === 'console' ? (
                        <Gamepad2 className="h-5 w-5 text-primary" />
                      ) : getAssetCategoryKind(asset.category) === 'computer' ? (
                        <Cpu className="h-5 w-5 text-primary" />
                      ) : (
                        <Monitor className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-white uppercase tracking-tight truncate">{asset.name}</h3>
                      <p className="text-[9px] font-black text-primary/40 uppercase tracking-widest">{formatAssetCategoryLabel(asset.category)} • Xona {asset.roomNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(asset)}
                      className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-primary/30 transition-all"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <DeleteConfirmButton
                      itemName={`${formatAssetCategoryLabel(asset.category)} xona ${asset.roomNumber}`}
                      onConfirm={async () => {
                        try {
                          await deleteAsset(asset);
                          toast({ title: "O'chirildi", description: `Jihoz #${asset.backendId} olib tashlandi.` });
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg bg-destructive/5 border border-destructive/10 text-destructive/40 hover:text-destructive hover:border-destructive/30 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DeleteConfirmButton>
                  </div>
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

        <Dialog
          open={isAssetModalOpen}
          onOpenChange={(open) => {
            setIsAssetModalOpen(open);

            if (!open) {
              setEditingAsset(null);
              setFormState(emptyFormState);
            }
          }}
        >
          <DialogContent className="bg-[#0a1f1f] border-white/10 text-white max-w-sm rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-base font-black uppercase tracking-tight">
                {editingAsset ? 'Jihozni Tahrirlash' : 'Yangi Jihoz'}
              </DialogTitle>
              <DialogDescription className="text-[9px] text-muted-foreground/60 font-medium uppercase tracking-[0.2em]">
                Mavjud kategoriyani tanlang yoki yangi kategoriya kiriting.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Nomi</Label>
                <Input
                  type="text"
                  placeholder="M: Kompyuter 1"
                  value={formState.name}
                  onChange={(e) => setFormState((current) => ({ ...current, name: e.target.value }))}
                  className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Kategoriya</Label>
                <Input
                  type="text"
                  list="asset-category-options"
                  placeholder="M: Kompyuterlar"
                  value={formState.category}
                  onChange={(e) => setFormState((current) => ({ ...current, category: e.target.value }))}
                  className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm"
                />
                <datalist id="asset-category-options">
                  {categoryOptions.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Xona raqami</Label>
                <Input
                  type="number"
                  placeholder="M: 1"
                  value={formState.roomId}
                  onChange={(e) => setFormState((current) => ({ ...current, roomId: e.target.value }))}
                  className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={isSaving} onClick={() => void handleSaveAsset()} className="w-full h-12 bg-primary text-black font-black uppercase tracking-[0.3em] rounded-xl shadow-[0_10px_30px_rgba(0,255,255,0.2)] hover:bg-primary/90 transition-all active:scale-[0.98] text-xs">
                {editingAsset ? 'YANGILASH' : 'SAQLASH'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
