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
import { formatBundleRequirements, getBaseServices } from '@/lib/service-bundles';
import { Plus, Search, Trash2, Wrench } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceRow = {
  id: string;
  /** '' = user is entering a new service; otherwise the backendId as string */
  existingServiceId: string;
  /** only used when existingServiceId === '' */
  name: string;
  /** only used when existingServiceId === '' */
  rate: string;
};

function newRow(): ServiceRow {
  return {
    id: Math.random().toString(36).slice(2),
    existingServiceId: '',
    name: '',
    rate: '',
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function XizmatlarPage() {
  const {
    services: allServices = [],
    createServiceBatch,
    deleteService,
    isCheckingAuth,
  } = useDashboard();
  const { toast } = useToast();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rows, setRows] = useState<ServiceRow[]>([newRow()]);
  const [bundleName, setBundleName] = useState('');
  const [customBundleRate, setCustomBundleRate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Search
  const [serviceSearch, setServiceSearch] = useState('');

  const baseServices = getBaseServices(allServices);

  // Derived list for display
  const filteredServices = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();
    if (!query) return allServices;
    return allServices.filter((s) =>
      [
        s.name,
        String(s.rate ?? s.price),
        formatBundleRequirements(s.requirements, allServices),
        s.isBundle ? 'bundle' : 'service',
      ].some((v) => v.toLowerCase().includes(query)),
    );
  }, [serviceSearch, allServices]);

  const filteredBaseServices = filteredServices.filter((s) => !s.isBundle);
  const filteredBundleServices = filteredServices.filter((s) => s.isBundle);

  // Bundle mode = more than one row
  const isBundle = rows.length > 1;

  // Live calculated total (sum of all row prices)
  const calculatedTotal = useMemo(() => {
    return rows.reduce((sum, row) => {
      if (row.existingServiceId) {
        const svc = baseServices.find((s) => String(s.backendId) === row.existingServiceId);
        return sum + (svc ? (svc.rate ?? svc.price) : 0);
      }
      const r = Number(row.rate);
      return sum + (Number.isFinite(r) && r >= 0 ? r : 0);
    }, 0);
  }, [rows, baseServices]);

  if (isCheckingAuth) return null;

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const resetForm = () => {
    setRows([newRow()]);
    setBundleName('');
    setCustomBundleRate('');
  };

  const addRow = () => setRows((prev) => [...prev, newRow()]);

  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  const updateRow = (id: string, patch: Partial<ServiceRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const handleSelectService = (rowId: string, existingServiceId: string) => {
    updateRow(rowId, { existingServiceId, name: '', rate: '' });
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    // Validate rows
    const usedIds = new Set<string>();
    for (const [i, row] of rows.entries()) {
      if (row.existingServiceId) {
        if (usedIds.has(row.existingServiceId)) {
          toast({
            variant: 'destructive',
            title: 'Takroriy xizmat',
            description: `${i + 1}-qatorda allaqachon tanlangan xizmat qayta tanlangan.`,
          });
          return;
        }
        usedIds.add(row.existingServiceId);
        continue;
      }
      // new service
      if (!row.name.trim()) {
        toast({
          variant: 'destructive',
          title: `${i + 1}-qator: xizmat nomi kiritilmagan`,
        });
        return;
      }
      const rate = Number(row.rate);
      if (!Number.isFinite(rate) || rate < 0) {
        toast({
          variant: 'destructive',
          title: `${i + 1}-qator: narx noto'g'ri`,
          description: '0 yoki undan katta son kiriting.',
        });
        return;
      }
    }

    // Single row with existing service = nothing to do
    if (!isBundle) {
      const row = rows[0];
      if (row.existingServiceId) {
        toast({
          variant: 'destructive',
          title: 'Xizmat allaqachon mavjud',
          description: "Yangi xizmat qo'shish uchun '— Yangi xizmat —' tanlang.",
        });
        return;
      }
    }

    if (isBundle && !bundleName.trim()) {
      toast({ variant: 'destructive', title: 'Bundle nomi kiritilmagan' });
      return;
    }

    // Build batch payload
    const batchRows = rows.map((row) => {
      if (row.existingServiceId) {
        return { existingBackendId: Number(row.existingServiceId), name: '', rate: 0 };
      }
      return { name: row.name, rate: Number(row.rate) };
    });

    const parsedCustomRate = Number(customBundleRate);
    const bundleRate =
      customBundleRate.trim() !== '' &&
      Number.isFinite(parsedCustomRate) &&
      parsedCustomRate >= 0
        ? parsedCustomRate
        : calculatedTotal;

    try {
      setIsSaving(true);
      await createServiceBatch({
        rows: batchRows,
        bundle: isBundle ? { name: bundleName.trim(), rate: bundleRate } : undefined,
      });

      const label = isBundle ? bundleName.trim() : (rows[0].name.trim() || 'Xizmat');
      toast({
        title: isBundle ? "Bundle qo'shildi" : "Xizmat qo'shildi",
        description: `${label} saqlandi.`,
      });
      resetForm();
      setIsModalOpen(false);
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

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
        {allServices.length === 0 ? (
          <div className="relative flex min-h-[400px] flex-col items-center justify-center rounded-[32px] border border-dashed border-primary/10 bg-[#061414]/20 text-center backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/10 bg-primary/5 shadow-[0_0_40px_rgba(0,255,255,0.03)]">
                <Wrench className="h-8 w-8 text-primary opacity-20" />
              </div>
              <div className="mb-2 space-y-1.5">
                <h3 className="text-base font-black uppercase tracking-tight text-white">XIZMATLAR BO'SH</h3>
                <p className="mx-auto max-w-[320px] text-[10px] font-medium uppercase tracking-[0.2em] text-[#444f4f]">
                  Xizmat nomi va soatlik narxni kiriting. Bir nechta xizmat qo'shsangiz — bundle ham yaratiladi.
                </p>
              </div>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="flex h-12 items-center gap-3 rounded-xl bg-primary px-8 text-xs font-black uppercase tracking-[0.2em] text-black shadow-[0_10px_30px_rgba(0,255,255,0.2)] transition-all hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> XIZMAT QO'SHISH
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Header with search */}
            <section className="rounded-3xl border border-white/5 bg-[#0a1a1a]/40 p-5 shadow-xl backdrop-blur-md">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="space-y-2">
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Xizmatlar va Bundles</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Asosiy xizmatlar assetlarga ulanadi, bundles esa booking paytida avtomatik qo'llanadi
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[320px_auto]">
                  <div className="space-y-2">
                    <Label htmlFor="service-search" className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">
                      Xizmatlarni qidirish
                    </Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                      <Input
                        id="service-search"
                        name="service-search"
                        aria-label="Xizmat qidirish"
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        className="h-11 rounded-xl border-white/5 bg-[#051111] pl-11 text-sm font-bold"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => setIsModalOpen(true)}
                    className="h-11 self-end rounded-xl bg-primary px-6 font-black uppercase tracking-[0.2em] text-black"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Xizmat qo'shish
                  </Button>
                </div>
              </div>
            </section>

            <div className="space-y-6">
              {/* Base services */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Asosiy xizmatlar</h3>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">{filteredBaseServices.length}</span>
                </div>

                {filteredBaseServices.length === 0 ? (
                  <div className="flex h-[220px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/5 bg-[#061414]/20">
                    <Search className="h-10 w-10 text-primary/25" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#556060]">
                      Qidiruv bo'yicha asosiy xizmat topilmadi
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredBaseServices.map((service) => (
                      <div key={service.id} className="space-y-4 rounded-2xl border border-white/5 bg-[#0a1515]/60 p-5 shadow-xl backdrop-blur-md">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/50">ASOSIY XIZMAT</p>
                            <h4 className="text-sm font-black uppercase tracking-tight text-white">{service.name}</h4>
                          </div>
                          <DeleteConfirmButton
                            itemName={service.name}
                            title="Xizmatni o'chirish"
                            description={`${service.name} xizmatini o'chirishni xohlaysizmi?`}
                            confirmLabel="O'chirish"
                            onConfirm={async () => {
                              try {
                                await deleteService(service);
                                toast({ title: "O'chirildi", description: `${service.name} olib tashlandi.` });
                              } catch (error) {
                                toast({ variant: 'destructive', title: "O'chirishda xatolik", description: error instanceof Error ? error.message : "So'rov bajarilmadi." });
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
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Soatlik narx</p>
                          <p className="mt-2 text-lg font-black text-primary">{(service.rate ?? service.price).toLocaleString()} so'm</p>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Bog'langan jihozlar</p>
                          <p className="mt-2 text-sm font-black text-white">{service.assetsCount}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Bundles */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Bundles</h3>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">{filteredBundleServices.length}</span>
                </div>

                {filteredBundleServices.length === 0 ? (
                  <div className="flex h-[220px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/5 bg-[#061414]/20">
                    <Wrench className="h-10 w-10 text-primary/25" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#556060]">Bundle hali yaratilmagan</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
                    {filteredBundleServices.map((service) => (
                      <div key={service.id} className="space-y-4 rounded-2xl border border-primary/20 bg-[#0a1515]/60 p-5 shadow-xl backdrop-blur-md">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/50">BUNDLE</p>
                            <h4 className="text-sm font-black uppercase tracking-tight text-white">{service.name}</h4>
                          </div>
                          <DeleteConfirmButton
                            itemName={service.name}
                            title="Bundleni o'chirish"
                            description={`${service.name} bundleni o'chirishni xohlaysizmi?`}
                            confirmLabel="O'chirish"
                            onConfirm={async () => {
                              try {
                                await deleteService(service);
                                toast({ title: "O'chirildi", description: `${service.name} olib tashlandi.` });
                              } catch (error) {
                                toast({ variant: 'destructive', title: "O'chirishda xatolik", description: error instanceof Error ? error.message : "So'rov bajarilmadi." });
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
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Tarkibi</p>
                          <p className="mt-2 text-sm font-black text-white">{formatBundleRequirements(service.requirements, allServices)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-white/5 bg-[#051111] px-4 py-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Bundle narxi</p>
                            <p className="mt-2 text-sm font-black text-primary">{(service.rate ?? service.price).toLocaleString()} so'm</p>
                          </div>
                          <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Tejam</p>
                            <p className="mt-2 text-sm font-black text-white">{Math.max(0, service.savingsRatio * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {/* ─── Unified Add Service Modal ──────────────────────────────────── */}
        <Dialog
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto rounded-3xl border-white/10 bg-[#0a1f1f] p-8 text-white shadow-2xl backdrop-blur-xl">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-base font-black uppercase tracking-tight">
                Xizmat qo'shish
              </DialogTitle>
              <DialogDescription className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
                Bitta xizmat yoki bir nechta qo'shish mumkin. Bir nechta bo'lsa — bundle yaratiladi.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              {rows.map((row, index) => {
                const selectedSvc = row.existingServiceId
                  ? baseServices.find((s) => String(s.backendId) === row.existingServiceId)
                  : null;

                return (
                  <div
                    key={row.id}
                    className="space-y-3 rounded-2xl border border-white/5 bg-[#051111] p-4"
                  >
                    {/* Row header */}
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">
                        Xizmat {index + 1}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={addRow}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary transition-all hover:bg-primary/15"
                          title="Yangi xizmat qatori qo'shish"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-destructive/40 transition-all hover:bg-destructive/10 hover:text-destructive"
                            title="Qatorni o'chirish"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Service selector */}
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">
                        Xizmat nomi
                      </Label>
                      <select
                        value={row.existingServiceId}
                        onChange={(e) => handleSelectService(row.id, e.target.value)}
                        className="h-11 w-full rounded-xl border border-white/5 bg-[#081616] px-3 text-sm font-bold text-white"
                      >
                        <option value="">— Yangi xizmat —</option>
                        {baseServices.map((svc) => (
                          <option key={svc.id} value={String(svc.backendId)}>
                            {svc.name} — {(svc.rate ?? svc.price).toLocaleString()} so'm
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Name input for new service */}
                    {!row.existingServiceId && (
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">
                          Xizmat nomi (yangi)
                        </Label>
                        <Input
                          aria-label={`Xizmat ${index + 1} nomi`}
                          value={row.name}
                          onChange={(e) => updateRow(row.id, { name: e.target.value })}
                          className="h-11 rounded-xl border-white/5 bg-[#081616] px-4 text-sm font-bold"
                        />
                      </div>
                    )}

                    {/* Rate field */}
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">
                        Narxi (so'm/soat)
                      </Label>
                      {row.existingServiceId ? (
                        <div className="flex h-11 items-center rounded-xl border border-white/5 bg-[#051111]/50 px-4">
                          <span className="text-sm font-black text-primary">
                            {selectedSvc ? (selectedSvc.rate ?? selectedSvc.price).toLocaleString() : '—'} so'm
                          </span>
                        </div>
                      ) : (
                        <Input
                          aria-label={`Xizmat ${index + 1} narxi`}
                          type="number"
                          min="0"
                          value={row.rate}
                          onChange={(e) => updateRow(row.id, { rate: e.target.value })}
                          className="h-11 rounded-xl border-white/5 bg-[#081616] px-4 text-sm font-bold"
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Bundle section — only when multiple rows */}
              {isBundle && (
                <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">
                    Bundle ma'lumotlari
                  </p>

                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">
                      Bundle nomi
                    </Label>
                    <Input
                      aria-label="Bundle nomi"
                      value={bundleName}
                      onChange={(e) => setBundleName(e.target.value)}
                      className="h-11 rounded-xl border-white/5 bg-[#051111] px-4 text-sm font-bold"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/5 bg-[#051111] px-4 py-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Hisoblangan narx</p>
                      <p className="mt-1 text-sm font-black text-white">{calculatedTotal.toLocaleString()} so'm</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">
                        Xizmat narxi (ixtiyoriy)
                      </Label>
                      <Input
                        aria-label="Bundle narxi"
                        type="number"
                        min="0"
                        value={customBundleRate}
                        onChange={(e) => setCustomBundleRate(e.target.value)}
                        className="h-11 rounded-xl border-white/5 bg-[#051111] px-4 text-sm font-bold"
                      />
                      <p className="text-[9px] text-white/30">
                        Bo'sh qolsa, hisoblangan narx ({calculatedTotal.toLocaleString()} so'm) ishlatiladi
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                disabled={isSaving}
                onClick={() => void handleSubmit()}
                className="h-12 w-full rounded-xl bg-primary text-xs font-black uppercase tracking-[0.3em] text-black shadow-[0_10px_30px_rgba(0,255,255,0.2)] transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                {isSaving ? 'Saqlanmoqda...' : isBundle ? 'Bundle va xizmatlarni saqlash' : 'Saqlash'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
