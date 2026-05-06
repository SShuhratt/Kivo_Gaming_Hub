'use client';

import React, { useMemo, useState } from 'react';
import { DeleteConfirmButton } from '@/components/delete-confirm-button';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDashboard } from '@/context/dashboard-context';
import { useToast } from '@/hooks/use-toast';
import { formatBundleRequirements, getBaseServices, getBundleServices } from '@/lib/service-bundles';
import { Minus, Plus, Search, Trash2, Wrench } from 'lucide-react';

type RequirementDraft = {
  serviceId: string;
  quantity: string;
};

const emptyRequirementDraft = (): RequirementDraft => ({
  serviceId: '',
  quantity: '1',
});

export default function XizmatlarPage() {
  const { services, createService, deleteService, isCheckingAuth } = useDashboard();
  const { toast } = useToast();
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [draft, setDraft] = useState({
    name: '',
    rate: '',
    manualPriority: '',
    isRecommendable: false,
    isBundle: false,
  });
  const [requirementDrafts, setRequirementDrafts] = useState<RequirementDraft[]>([emptyRequirementDraft()]);
  const [isSaving, setIsSaving] = useState(false);

  const baseServices = useMemo(() => getBaseServices(services), [services]);
  const bundleServices = useMemo(() => getBundleServices(services), [services]);

  const filteredServices = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();

    if (!query) {
      return services;
    }

    return services.filter((service) =>
      [
        service.name,
        String(service.rate ?? service.price),
        formatBundleRequirements(service.requirements, services),
        service.isBundle ? 'bundle' : 'service',
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [serviceSearch, services]);

  const filteredBaseServices = filteredServices.filter((service) => !service.isBundle);
  const filteredBundleServices = filteredServices.filter((service) => service.isBundle);

  if (isCheckingAuth) return null;

  const resetForm = () => {
    setDraft({
      name: '',
      rate: '',
      manualPriority: '',
      isRecommendable: false,
      isBundle: false,
    });
    setRequirementDrafts([emptyRequirementDraft()]);
  };

  const handleCreateService = async () => {
    const rate = Number(draft.rate);
    const manualPriority = draft.manualPriority !== '' ? Number(draft.manualPriority) : null;

    if (!draft.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Xizmat nomi kiritilmagan',
        description: 'Xizmat nomini kiriting.',
      });
      return;
    }

    if (!Number.isFinite(rate) || rate < 0) {
      toast({
        variant: 'destructive',
        title: 'Narx noto‘g‘ri',
        description: '0 yoki undan katta narx kiriting.',
      });
      return;
    }

    const requirements = requirementDrafts.reduce<Record<string, number>>((accumulator, row, index) => {
      const service = baseServices.find((item) => String(item.backendId) === row.serviceId);
      const quantity = Number(row.quantity);

      if (!draft.isBundle) {
        return accumulator;
      }

      if (!service) {
        throw new Error(`Bundle uchun ${index + 1}-xizmat tanlanmagan.`);
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`Bundle uchun ${index + 1}-miqdor noto'g'ri.`);
      }

      accumulator[service.name.trim().toLowerCase()] =
        (accumulator[service.name.trim().toLowerCase()] ?? 0) + quantity;

      return accumulator;
    }, {});

    if (draft.isBundle && Object.keys(requirements).length === 0) {
      toast({
        variant: 'destructive',
        title: 'Bundle tarkibi bo‘sh',
        description: 'Bundle uchun kamida bitta asosiy xizmat qo‘shing.',
      });
      return;
    }

    try {
      setIsSaving(true);
      await createService({
        name: draft.name,
        rate,
        requirements: draft.isBundle ? requirements : undefined,
        manualPriority,
        isRecommendable: draft.isBundle ? draft.isRecommendable : false,
      });

      resetForm();
      setIsServiceModalOpen(false);
      toast({
        title: draft.isBundle ? "Bundle qo'shildi" : "Xizmat qo'shildi",
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
                  Avval asosiy xizmat nomi va soatlik narxni yarating. Keyin shu xizmatlardan bundle tuzish mumkin.
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
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Xizmatlar va Bundles</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Asosiy xizmatlar assetlarga ulanadi, bundles esa booking paytida avtomatik qo'llanadi
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

            <div className="space-y-6">
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
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Soatlik narx</p>
                          <p className="mt-2 text-lg font-black text-primary">{(service.rate ?? service.price).toLocaleString()} UZS</p>
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

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Bundles</h3>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">{filteredBundleServices.length}</span>
                </div>

                {filteredBundleServices.length === 0 ? (
                  <div className="flex h-[220px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/5 bg-[#061414]/20">
                    <Wrench className="h-10 w-10 text-primary/25" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#556060]">
                      Bundle hali yaratilmagan
                    </p>
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
                            title="Delete bundle"
                            description={`Do you really want to delete ${service.name}?`}
                            confirmLabel="Delete bundle"
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
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Tarkibi</p>
                          <p className="mt-2 text-sm font-black text-white">{formatBundleRequirements(service.requirements, services)}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-white/5 bg-[#051111] px-4 py-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Bundle narxi</p>
                            <p className="mt-2 text-sm font-black text-primary">{(service.rate ?? service.price).toLocaleString()} UZS</p>
                          </div>
                          <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Savings</p>
                            <p className="mt-2 text-sm font-black text-white">{Math.max(0, service.savingsRatio * 100).toFixed(1)}%</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Priority</p>
                            <p className="mt-2 text-sm font-black text-white">{service.manualPriority ?? 'Auto'}</p>
                          </div>
                          <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Recommendable</p>
                            <p className="mt-2 text-sm font-black text-white">{service.isRecommendable ? 'Yes' : 'No'}</p>
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

        <Dialog
          open={isServiceModalOpen}
          onOpenChange={(open) => {
            setIsServiceModalOpen(open);
            if (!open) {
              resetForm();
            }
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl border-white/10 bg-[#0a1f1f] p-8 text-white shadow-2xl backdrop-blur-xl">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-base font-black uppercase tracking-tight">
                {draft.isBundle ? 'YANGI BUNDLE' : 'YANGI XIZMAT'}
              </DialogTitle>
              <DialogDescription className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
                Asosiy xizmatlar assetlarga ulanadi. Bundle esa booking hisobida qo'llanadi.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setDraft((current) => ({ ...current, isBundle: false, isRecommendable: false, manualPriority: '' }))}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                    !draft.isBundle ? 'border-primary bg-primary/10' : 'border-white/5 bg-[#051111] hover:border-primary/20'
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-white">Asosiy xizmat</p>
                  <p className="mt-1 text-[10px] text-white/40">Assetlarga to'g'ridan to'g'ri ulanadi</p>
                </button>
                <button
                  disabled={baseServices.length === 0}
                  onClick={() => setDraft((current) => ({ ...current, isBundle: true }))}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                    draft.isBundle ? 'border-primary bg-primary/10' : 'border-white/5 bg-[#051111] hover:border-primary/20'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-white">Bundle</p>
                  <p className="mt-1 text-[10px] text-white/40">Bir nechta xizmatdan chegirmali paket</p>
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">
                    {draft.isBundle ? 'Bundle nomi' : 'Xizmat nomi'}
                  </Label>
                  <Input
                    id="service-name"
                    name="service-name"
                    aria-label={draft.isBundle ? 'Bundle nomi' : 'Xizmat nomi'}
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    className="h-12 rounded-xl border-white/5 bg-[#051111] px-4 text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Soatlik narx (UZS)</Label>
                  <Input
                    id="service-rate"
                    name="service-rate"
                    type="number"
                    aria-label="Soatlik narx"
                    value={draft.rate}
                    onChange={(event) => setDraft((current) => ({ ...current, rate: event.target.value }))}
                    className="h-12 rounded-xl border-white/5 bg-[#051111] px-4 text-sm font-bold"
                  />
                </div>
              </div>

              {draft.isBundle ? (
                <>
                  <div className="space-y-3 rounded-2xl border border-white/5 bg-[#051111] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white">Bundle tarkibi</p>
                      <Button
                        type="button"
                        onClick={() => setRequirementDrafts((current) => [...current, emptyRequirementDraft()])}
                        className="h-9 rounded-xl bg-primary px-4 text-[10px] font-black uppercase tracking-[0.2em] text-black"
                      >
                        <Plus className="mr-2 h-4 w-4" /> Qator qo'shish
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {requirementDrafts.map((row, index) => (
                        <div key={`requirement-${index}`} className="grid gap-3 md:grid-cols-[1fr_140px_auto]">
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Xizmat</Label>
                            <select
                              id={`requirement-service-${index}`}
                              name={`requirement-service-${index}`}
                              value={row.serviceId}
                              onChange={(event) =>
                                setRequirementDrafts((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, serviceId: event.target.value } : item,
                                  ),
                                )
                              }
                              className="h-12 w-full rounded-xl border border-white/5 bg-[#081616] px-4 text-sm font-bold text-white"
                            >
                              <option value="">Tanlang</option>
                              {baseServices.map((service) => (
                                <option key={service.id} value={String(service.backendId)}>
                                  {service.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Miqdor</Label>
                            <Input
                              id={`requirement-quantity-${index}`}
                              name={`requirement-quantity-${index}`}
                              type="number"
                              min="1"
                              aria-label={`Bundle miqdor ${index + 1}`}
                              value={row.quantity}
                              onChange={(event) =>
                                setRequirementDrafts((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, quantity: event.target.value } : item,
                                  ),
                                )
                              }
                              className="h-12 rounded-xl border-white/5 bg-[#081616] px-4 text-sm font-bold"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              disabled={requirementDrafts.length === 1}
                              onClick={() =>
                                setRequirementDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))
                              }
                              variant="ghost"
                              className="h-12 w-full rounded-xl border border-destructive/10 bg-destructive/5 text-destructive hover:bg-destructive/10"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Admin priority</Label>
                      <Input
                        id="service-priority"
                        name="service-priority"
                        type="number"
                        aria-label="Admin priority"
                        value={draft.manualPriority}
                        onChange={(event) => setDraft((current) => ({ ...current, manualPriority: event.target.value }))}
                        className="h-12 rounded-xl border-white/5 bg-[#051111] px-4 text-sm font-bold"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="flex h-12 w-full items-center gap-3 rounded-xl border border-white/5 bg-[#051111] px-4">
                        <Checkbox
                          id="is_recommendable"
                          checked={draft.isRecommendable}
                          onCheckedChange={(checked) => setDraft((current) => ({ ...current, isRecommendable: Boolean(checked) }))}
                        />
                        <Label htmlFor="is_recommendable" className="text-[10px] font-black uppercase tracking-widest text-white">
                          Recommendable bundle
                        </Label>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
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
