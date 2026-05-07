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
import { ChevronDown, Plus, Search, Trash2, Wrench, X } from 'lucide-react';

type ServiceRow = {
  id: string;
  existingServiceId: string; // '' = new service
  name: string;
  rate: string;
};

function makeRow(): ServiceRow {
  return { id: Math.random().toString(36).slice(2), existingServiceId: '', name: '', rate: '' };
}

export default function XizmatlarPage() {
  const { services: allServices = [], createServiceBatch, deleteService, isCheckingAuth } = useDashboard();
  const { toast } = useToast();
  const baseServices = getBaseServices(allServices);

  // ── List state ──────────────────────────────────────────────────────────────
  const [serviceSearch, setServiceSearch] = useState('');

  // ── Form state ──────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rows, setRows] = useState<ServiceRow[]>([makeRow()]);
  const [bundleName, setBundleName] = useState('');
  const [customBundleRate, setCustomBundleRate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);

  const isBundle = rows.length > 1;

  const calculatedTotal = useMemo(() =>
    rows.reduce((sum, row) => {
      if (row.existingServiceId) {
        const svc = baseServices.find((s) => String(s.backendId) === row.existingServiceId);
        return sum + (svc ? (svc.rate ?? svc.price) : 0);
      }
      const r = Number(row.rate);
      return sum + (Number.isFinite(r) && r >= 0 ? r : 0);
    }, 0),
    [rows, baseServices],
  );

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return allServices;
    return allServices.filter((s) =>
      [s.name, String(s.rate ?? s.price), formatBundleRequirements(s.requirements, allServices), s.isBundle ? 'bundle' : 'service']
        .some((v) => v.toLowerCase().includes(q)),
    );
  }, [serviceSearch, allServices]);
  const filteredBase = filteredServices.filter((s) => !s.isBundle);
  const filteredBundles = filteredServices.filter((s) => s.isBundle);

  if (isCheckingAuth) return null;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const resetForm = () => { setRows([makeRow()]); setBundleName(''); setCustomBundleRate(''); setOpenPickerId(null); };
  const addRow = () => { setRows((p) => [...p, makeRow()]); setOpenPickerId(null); };
  const removeRow = (id: string) => setRows((p) => p.filter((r) => r.id !== id));
  const updateRow = (id: string, patch: Partial<ServiceRow>) => setRows((p) => p.map((r) => r.id === id ? { ...r, ...patch } : r));

  const pickExisting = (rowId: string, svcBackendId: string) => {
    updateRow(rowId, { existingServiceId: svcBackendId, name: '', rate: '' });
    setOpenPickerId(null);
  };
  const clearExisting = (rowId: string) => updateRow(rowId, { existingServiceId: '', name: '', rate: '' });
  const togglePicker = (rowId: string) => setOpenPickerId((prev) => prev === rowId ? null : rowId);

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const usedIds = new Set<string>();
    for (const [i, row] of rows.entries()) {
      if (row.existingServiceId) {
        if (usedIds.has(row.existingServiceId)) {
          toast({ variant: 'destructive', title: `${i + 1}-qator: bu xizmat allaqachon qo'shilgan` });
          return;
        }
        usedIds.add(row.existingServiceId);
        continue;
      }
      if (!row.name.trim()) { toast({ variant: 'destructive', title: `${i + 1}-qator: xizmat nomi kiritilmagan` }); return; }
      const r = Number(row.rate);
      if (!Number.isFinite(r) || r < 0) { toast({ variant: 'destructive', title: `${i + 1}-qator: narx noto'g'ri` }); return; }
    }
    if (!isBundle && rows[0].existingServiceId) {
      toast({ variant: 'destructive', title: 'Bu xizmat allaqachon mavjud', description: "Yangi xizmat uchun qo'lda kiriting." });
      return;
    }
    if (isBundle && !bundleName.trim()) { toast({ variant: 'destructive', title: 'Umumiy xizmat nomi kiritilmagan' }); return; }

    const parsed = Number(customBundleRate);
    const bundleRate = customBundleRate.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 ? parsed : calculatedTotal;

    try {
      setIsSaving(true);
      await createServiceBatch({
        rows: rows.map((row) => row.existingServiceId
          ? { existingBackendId: Number(row.existingServiceId), name: '', rate: 0 }
          : { name: row.name.trim(), rate: Number(row.rate) }),
        bundle: isBundle ? { name: bundleName.trim(), rate: bundleRate } : undefined,
      });
      const label = isBundle ? bundleName.trim() : rows[0].name.trim();
      toast({ title: isBundle ? "Bundle qo'shildi" : "Xizmat qo'shildi", description: `${label} saqlandi.` });
      resetForm();
      setIsModalOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Xizmat saqlanmadi', description: error instanceof Error ? error.message : "So'rov bajarilmadi." });
    } finally {
      setIsSaving(false);
    }
  };

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">

        {allServices.length === 0 ? (
          <div className="relative flex min-h-[400px] flex-col items-center justify-center rounded-[32px] border border-dashed border-primary/10 bg-[#061414]/20 text-center">
            <div className="flex flex-col items-center space-y-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/10 bg-primary/5">
                <Wrench className="h-8 w-8 text-primary opacity-20" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black uppercase tracking-tight text-white">XIZMATLAR BO'SH</h3>
                <p className="mx-auto max-w-xs text-[10px] font-medium uppercase tracking-[0.2em] text-[#444f4f]">
                  Xizmat nomi va soatlik narxini kiriting. Bir nechta qo'shsangiz bundle yaratiladi.
                </p>
              </div>
              <Button onClick={() => setIsModalOpen(true)} className="h-12 gap-3 rounded-xl bg-primary px-8 text-xs font-black uppercase tracking-[0.2em] text-black shadow-[0_10px_30px_rgba(0,255,255,0.2)]">
                <Plus className="h-4 w-4" /> XIZMAT QO'SHISH
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <section className="rounded-3xl border border-white/5 bg-[#0a1a1a]/40 p-5 shadow-xl backdrop-blur-md">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="space-y-1">
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Xizmatlar va Bundles</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Asosiy xizmatlar assetlarga, bundles bookingda qo'llanadi</p>
                </div>
                <div className="flex gap-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                    <Input aria-label="Xizmat qidirish" value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} className="h-11 w-64 rounded-xl border-white/5 bg-[#051111] pl-10 text-sm font-bold" />
                  </div>
                  <Button onClick={() => setIsModalOpen(true)} className="h-11 rounded-xl bg-primary px-6 font-black uppercase tracking-[0.2em] text-black">
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">{filteredBase.length}</span>
                </div>
                {filteredBase.length === 0 ? (
                  <div className="flex h-[220px] items-center justify-center rounded-3xl border border-dashed border-white/5 bg-[#061414]/20">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#556060]">Asosiy xizmat topilmadi</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredBase.map((svc) => (
                      <div key={svc.id} className="space-y-4 rounded-2xl border border-white/5 bg-[#0a1515]/60 p-5 shadow-xl">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/50">ASOSIY XIZMAT</p>
                            <h4 className="mt-1 text-sm font-black uppercase tracking-tight text-white">{svc.name}</h4>
                          </div>
                          <DeleteConfirmButton itemName={svc.name} title="Xizmatni o'chirish" description={`${svc.name} xizmatini o'chirishni xohlaysizmi?`} confirmLabel="O'chirish"
                            onConfirm={async () => { try { await deleteService(svc); toast({ title: "O'chirildi", description: `${svc.name} olib tashlandi.` }); } catch (e) { toast({ variant: 'destructive', title: "Xatolik", description: e instanceof Error ? e.message : "So'rov bajarilmadi." }); throw e; } }}>
                            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive/40 hover:bg-destructive/10 hover:text-destructive transition-all"><Trash2 className="h-4 w-4" /></button>
                          </DeleteConfirmButton>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-[#051111] px-4 py-3">
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Soatlik narx</p>
                          <p className="mt-2 text-lg font-black text-primary">{(svc.rate ?? svc.price).toLocaleString()} so'm</p>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Bog'langan jihozlar</p>
                          <p className="mt-2 text-sm font-black text-white">{svc.assetsCount}</p>
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">{filteredBundles.length}</span>
                </div>
                {filteredBundles.length === 0 ? (
                  <div className="flex h-[220px] items-center justify-center rounded-3xl border border-dashed border-white/5 bg-[#061414]/20">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#556060]">Bundle hali yaratilmagan</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
                    {filteredBundles.map((svc) => (
                      <div key={svc.id} className="space-y-4 rounded-2xl border border-primary/20 bg-[#0a1515]/60 p-5 shadow-xl">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/50">BUNDLE</p>
                            <h4 className="mt-1 text-sm font-black uppercase tracking-tight text-white">{svc.name}</h4>
                          </div>
                          <DeleteConfirmButton itemName={svc.name} title="Bundleni o'chirish" description={`${svc.name} bundleni o'chirishni xohlaysizmi?`} confirmLabel="O'chirish"
                            onConfirm={async () => { try { await deleteService(svc); toast({ title: "O'chirildi", description: `${svc.name} olib tashlandi.` }); } catch (e) { toast({ variant: 'destructive', title: "Xatolik", description: e instanceof Error ? e.message : "So'rov bajarilmadi." }); throw e; } }}>
                            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive/40 hover:bg-destructive/10 hover:text-destructive transition-all"><Trash2 className="h-4 w-4" /></button>
                          </DeleteConfirmButton>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-[#051111] px-4 py-3">
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Tarkibi</p>
                          <p className="mt-2 text-sm font-black text-white">{formatBundleRequirements(svc.requirements, allServices)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-white/5 bg-[#051111] px-4 py-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Bundle narxi</p>
                            <p className="mt-2 text-sm font-black text-primary">{(svc.rate ?? svc.price).toLocaleString()} so'm</p>
                          </div>
                          <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Tejam</p>
                            <p className="mt-2 text-sm font-black text-white">{Math.max(0, svc.savingsRatio * 100).toFixed(1)}%</p>
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

        {/* ─── Modal ──────────────────────────────────────────────────────────── */}
        <Dialog open={isModalOpen} onOpenChange={(o) => { setIsModalOpen(o); if (!o) resetForm(); }}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl border-white/10 bg-[#0a1f1f] p-8 text-white shadow-2xl backdrop-blur-xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base font-black uppercase tracking-tight">Xizmat qo'shish</DialogTitle>
              <DialogDescription className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
                Bitta yoki bir nechta xizmat qo'shing. Bir nechta bo'lsa — bundle yaratiladi.
              </DialogDescription>
            </DialogHeader>

            <div className="py-5 space-y-3">
              {/* Column headers */}
              <div className="grid gap-2 pr-[76px]" style={{ gridTemplateColumns: '1fr 140px' }}>
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Xizmat nomi</Label>
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Xizmat narxi</Label>
              </div>

              {/* Service rows */}
              {rows.map((row, index) => {
                const selectedSvc = row.existingServiceId
                  ? baseServices.find((s) => String(s.backendId) === row.existingServiceId)
                  : null;

                return (
                  <div key={row.id} className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr 140px 36px 36px' }}>
                    {/* Name field with inline picker */}
                    <div
                      className="relative"
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          setTimeout(() => setOpenPickerId((prev) => prev === row.id ? null : prev), 100);
                        }
                      }}
                    >
                      <input
                        type="text"
                        value={selectedSvc ? selectedSvc.name : row.name}
                        readOnly={!!row.existingServiceId}
                        onChange={(e) => {
                          if (!row.existingServiceId) updateRow(row.id, { name: e.target.value });
                        }}
                        aria-label={`Xizmat ${index + 1} nomi`}
                        className={`h-11 w-full rounded-xl border px-4 text-sm font-bold text-white outline-none transition-colors ${
                          row.existingServiceId
                            ? 'border-primary/20 bg-primary/5 pr-16 text-primary/80'
                            : 'border-white/5 bg-[#081616] pr-10 focus:border-primary/30'
                        }`}
                      />
                      {/* Clear existing selection */}
                      {row.existingServiceId && (
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => clearExisting(row.id)}
                          className="absolute right-9 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {/* Picker toggle */}
                      <button
                        type="button"
                        tabIndex={0}
                        onClick={() => togglePicker(row.id)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-primary"
                        aria-label="Mavjud xizmatlarni ko'rish"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openPickerId === row.id ? 'rotate-180 text-primary' : ''}`} />
                      </button>

                      {/* Existing services dropdown */}
                      {openPickerId === row.id && (
                        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-[#081818] shadow-2xl">
                          {baseServices.length === 0 ? (
                            <p className="px-4 py-3 text-[10px] text-white/40">Mavjud xizmat yo'q</p>
                          ) : (
                            baseServices.map((svc) => (
                              <button
                                key={svc.id}
                                type="button"
                                tabIndex={0}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  pickExisting(row.id, String(svc.backendId));
                                }}
                                className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-primary/10"
                              >
                                <span className="text-sm font-bold text-white">{svc.name}</span>
                                <span className="text-[11px] font-black text-primary">{(svc.rate ?? svc.price).toLocaleString()} so'm</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Price field */}
                    {row.existingServiceId ? (
                      <div className="flex h-11 items-center rounded-xl border border-primary/20 bg-primary/5 px-3">
                        <span className="text-sm font-black text-primary">
                          {selectedSvc ? (selectedSvc.rate ?? selectedSvc.price).toLocaleString() : '—'} so'm
                        </span>
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          aria-label={`Xizmat ${index + 1} narxi`}
                          value={row.rate}
                          onChange={(e) => updateRow(row.id, { rate: e.target.value })}
                          className="h-11 rounded-xl border-white/5 bg-[#081616] px-3 pr-10 text-sm font-bold"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30">so'm</span>
                      </div>
                    )}

                    {/* Add row */}
                    <button
                      type="button"
                      onClick={addRow}
                      className="flex h-11 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-primary transition-all hover:bg-primary/15"
                      title="Qator qo'shish"
                    >
                      <Plus className="h-4 w-4" />
                    </button>

                    {/* Remove row */}
                    <button
                      type="button"
                      onClick={() => rows.length > 1 && removeRow(row.id)}
                      disabled={rows.length === 1}
                      className="flex h-11 w-9 items-center justify-center rounded-xl text-destructive/50 transition-all hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-25"
                      title="Qatorni o'chirish"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}

              {/* Bundle section */}
              {isBundle && (
                <div className="mt-4 space-y-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                  {/* Bundle name */}
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Umumiy xizmat nomi</Label>
                    <Input
                      aria-label="Umumiy xizmat nomi"
                      value={bundleName}
                      onChange={(e) => setBundleName(e.target.value)}
                      className="h-11 rounded-xl border-white/5 bg-[#051111] px-4 text-sm font-bold"
                    />
                  </div>

                  {/* Hisoblangan narx | Xizmat narxi */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Hisoblangan narx</Label>
                      <div className="flex h-11 items-center rounded-xl border border-white/5 bg-[#051111]/60 px-4">
                        <span className="text-sm font-black text-white/70">{calculatedTotal.toLocaleString()} so'm</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Xizmat narxi</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          aria-label="Bundle narxi"
                          value={customBundleRate}
                          onChange={(e) => setCustomBundleRate(e.target.value)}
                          className="h-11 rounded-xl border-white/5 bg-[#051111] px-4 pr-10 text-sm font-bold"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30">so'm</span>
                      </div>
                      {!customBundleRate && (
                        <p className="text-[9px] text-white/25">Bo'sh bo'lsa, hisoblangan narx ishlatiladi</p>
                      )}
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
