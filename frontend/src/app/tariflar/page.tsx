'use client';

import React, { useMemo, useState } from 'react';
import { DeleteConfirmButton } from '@/components/delete-confirm-button';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useDashboard } from '@/context/dashboard-context';
import { Plus, CreditCard, PlusCircle, Trash2, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { collectUniqueAssetCategories, normalizeAssetCategoryValue } from '@/lib/asset-category';

type CategoryPriceDraft = {
  id: string;
  category: string;
  hourlyPrice: string;
};

type TariffDraft = {
  name: string;
  categoryPrices: CategoryPriceDraft[];
};

function createDraftRow(category = '', hourlyPrice = ''): CategoryPriceDraft {
  return {
    id: `${Date.now()}-${Math.random()}`,
    category,
    hourlyPrice,
  };
}

const emptyDraft = (): TariffDraft => ({
  name: '',
  categoryPrices: [createDraftRow()],
});

export default function TariflarPage() {
  const { tariffs, assets, createTariff, updateTariff, deleteTariff, isCheckingAuth } = useDashboard();
  const { toast } = useToast();
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);
  const [draft, setDraft] = useState<TariffDraft>(emptyDraft);
  const [editingTariffId, setEditingTariffId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const categoryOptions = useMemo(
    () =>
      collectUniqueAssetCategories([
        ...assets.map((asset) => asset.category),
        ...tariffs.flatMap((tariff) => tariff.categoryPrices.map((price) => price.category)),
      ]),
    [assets, tariffs]
  );

  if (isCheckingAuth) return null;

  const openCreateModal = () => {
    setEditingTariffId(null);
    setDraft(emptyDraft());
    setIsTariffModalOpen(true);
  };

  const openEditModal = (tariffId: number) => {
    const tariff = tariffs.find((item) => item.backendId === tariffId);

    if (!tariff) {
      return;
    }

    setEditingTariffId(tariff.backendId);
    setDraft({
      name: tariff.name,
      categoryPrices:
        tariff.categoryPrices.length > 0
          ? tariff.categoryPrices.map((price) => createDraftRow(price.category, String(price.hourlyPrice)))
          : [createDraftRow()],
    });
    setIsTariffModalOpen(true);
  };

  const updateDraftRow = (rowId: string, field: 'category' | 'hourlyPrice', value: string) => {
    setDraft((current) => ({
      ...current,
      categoryPrices: current.categoryPrices.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    }));
  };

  const addDraftRow = () => {
    setDraft((current) => ({
      ...current,
      categoryPrices: [...current.categoryPrices, createDraftRow()],
    }));
  };

  const removeDraftRow = (rowId: string) => {
    setDraft((current) => {
      const nextRows = current.categoryPrices.filter((row) => row.id !== rowId);

      return {
        ...current,
        categoryPrices: nextRows.length > 0 ? nextRows : [createDraftRow()],
      };
    });
  };

  const handleSaveTariff = async () => {
    const name = draft.name.trim();
    const categoryPrices = draft.categoryPrices
      .map((row) => ({
        category: normalizeAssetCategoryValue(row.category),
        hourlyPrice: Number(row.hourlyPrice),
      }))
      .filter((row) => row.category && Number.isFinite(row.hourlyPrice) && row.hourlyPrice >= 0);

    if (!name) {
      toast({
        variant: 'destructive',
        title: 'Tarif nomi kiritilmagan',
        description: 'Tarif uchun nom kiriting.',
      });
      return;
    }

    if (categoryPrices.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Kategoriya narxlari yetarli emas',
        description: 'Kamida bitta kategoriya va uning soatlik narxini kiriting.',
      });
      return;
    }

    try {
      setIsSaving(true);

      if (editingTariffId) {
        await updateTariff({
          backendId: editingTariffId,
          name,
          categoryPrices,
        });
      } else {
        await createTariff({
          name,
          categoryPrices,
        });
      }

      setIsTariffModalOpen(false);
      setDraft(emptyDraft());
      setEditingTariffId(null);
      toast({
        title: editingTariffId ? 'Tarif yangilandi!' : 'Tarif yaratildi!',
        description: 'Kategoriya bo‘yicha narxlar bazaga saqlandi.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: editingTariffId ? 'Tarif yangilanmadi' : 'Tarif saqlanmadi',
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
                <p className="text-[10px] text-[#444f4f] font-medium max-w-[220px] mx-auto leading-relaxed uppercase tracking-[0.2em]">
                  Bitta tarif ichida bir nechta kategoriya narxlarini yarating.
                </p>
              </div>
              <Button
                onClick={openCreateModal}
                className="h-12 bg-primary text-black font-black uppercase tracking-[0.2em] rounded-xl shadow-[0_10px_30px_rgba(0,255,255,0.2)] hover:bg-primary/90 transition-all flex items-center gap-3 px-8 text-xs"
              >
                <PlusCircle className="h-4.5 w-4.5" /> YANGI TARIF YARATISH
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {tariffs.map((tariff) => (
                <div key={tariff.id} className="bg-[#0a1515]/60 border border-white/5 p-5 rounded-2xl space-y-4 hover:border-primary/30 transition-all shadow-xl backdrop-blur-md group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-sm font-black text-white uppercase tracking-tight truncate">{tariff.name}</h4>
                      <p className="text-primary font-black text-xs tracking-tight">Boshlanish narxi: {tariff.hourlyPrice.toLocaleString()} UZS / SOAT</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(tariff.backendId)}
                        className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-primary/30 transition-all"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DeleteConfirmButton
                        itemName={tariff.name}
                        onConfirm={async () => {
                          try {
                            await deleteTariff(tariff);
                            toast({ title: "Tarif o'chirildi", description: `${tariff.name} ro'yxatdan olib tashlandi.` });
                          } catch (error) {
                            toast({
                              variant: 'destructive',
                              title: "Tarif o'chirilmadi",
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
                  <div className="space-y-2 pt-3 border-t border-white/5">
                    {tariff.categoryPrices.map((price) => (
                      <div key={price.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-3 py-2">
                        <span className="text-[10px] font-black text-white uppercase tracking-tight">{price.category}</span>
                        <span className="text-[10px] font-black text-primary">{price.hourlyPrice.toLocaleString()} UZS</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-1">
                    <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">ID: {tariff.backendId}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={openCreateModal}
              className="fixed bottom-10 right-10 h-14 w-14 bg-primary text-black rounded-2xl shadow-[0_15px_40px_rgba(0,255,255,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-30 group"
            >
              <Plus className="h-7 w-7 transition-transform group-hover:rotate-90" />
            </button>
          </>
        )}

        <Dialog
          open={isTariffModalOpen}
          onOpenChange={(open) => {
            setIsTariffModalOpen(open);

            if (!open) {
              setEditingTariffId(null);
              setDraft(emptyDraft());
            }
          }}
        >
          <DialogContent className="bg-[#0a1f1f] border-white/10 text-white max-w-xl rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-base font-black uppercase tracking-tight">
                {editingTariffId ? 'TARIFNI TAHRIRLASH' : 'YANGI TARIF'}
              </DialogTitle>
              <DialogDescription className="text-[9px] text-muted-foreground/60 font-medium uppercase tracking-[0.2em]">
                Har bir jihoz kategoriyasi uchun alohida narx belgilang.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Tarif Nomi</Label>
                <Input
                  placeholder="M: Standard"
                  value={draft.name}
                  onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))}
                  className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Kategoriya Narxlari</Label>
                  <Button type="button" variant="ghost" onClick={addDraftRow} className="h-8 px-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20">
                    <Plus className="mr-1 h-4 w-4" /> Qator
                  </Button>
                </div>
                <div className="space-y-3">
                  {draft.categoryPrices.map((row) => (
                    <div key={row.id} className="grid grid-cols-[1fr_160px_40px] gap-3 items-center">
                      <Input
                        type="text"
                        list="tariff-category-options"
                        placeholder="M: Computer"
                        value={row.category}
                        onChange={(e) => updateDraftRow(row.id, 'category', e.target.value)}
                        className="h-11 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="20000"
                        value={row.hourlyPrice}
                        onChange={(e) => updateDraftRow(row.id, 'hourlyPrice', e.target.value)}
                        className="h-11 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDraftRow(row.id)}
                        className="h-11 w-11 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive/50 hover:text-destructive hover:border-destructive/30"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <datalist id="tariff-category-options">
                    {categoryOptions.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button disabled={isSaving} onClick={() => void handleSaveTariff()} className="w-full h-12 bg-primary text-black font-black uppercase tracking-[0.3em] rounded-xl shadow-[0_10px_30px_rgba(0,255,255,0.2)] hover:bg-primary/90 transition-all active:scale-[0.98] text-xs">
                {editingTariffId ? 'YANGILASH' : 'TASDIQLASH'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
