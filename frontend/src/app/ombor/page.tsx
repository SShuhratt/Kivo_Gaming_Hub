'use client';

import React, { useMemo, useState } from 'react';
import { DeleteConfirmButton } from '@/components/delete-confirm-button';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useDashboard, Product } from '@/context/dashboard-context';
import {
  Plus,
  Package,
  Building2,
  ArrowLeft,
  Trash2,
  ChevronRight,
  Tag,
  Scale,
  DollarSign,
  Barcode,
  TrendingUp,
  Pencil,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const unitLabels: Record<Product['unit'], string> = {
  bottle: 'BOTTLE',
  box: 'BOX',
  container: 'CONTAINER',
  bag: 'BAG',
};

type ProductFormState = {
  manufacturer: string;
  name: string;
  barcode: string;
  quantity: string;
  unit: Product['unit'];
  purchasePrice: string;
  sellingPrice: string;
};

const emptyProductForm: ProductFormState = {
  manufacturer: '',
  name: '',
  barcode: '',
  quantity: '',
  unit: 'bottle',
  purchasePrice: '',
  sellingPrice: '',
};

export default function OmborPage() {
  const {
    companies,
    saveWarehouseProduct,
    deleteWarehouseProduct,
    deleteManufacturer,
    isCheckingAuth,
  } = useDashboard();
  const { toast } = useToast();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);
  const [isSaving, setIsSaving] = useState(false);

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) ?? null;

  const profitMargin = useMemo(() => {
    const purchase = parseFloat(productForm.purchasePrice);
    const selling = parseFloat(productForm.sellingPrice);

    if (purchase > 0 && selling > 0) {
      return (((selling - purchase) / purchase) * 100).toFixed(1);
    }

    return null;
  }, [productForm.purchasePrice, productForm.sellingPrice]);

  if (isCheckingAuth) return null;

  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        manufacturer: product.manufacturer,
        name: product.name,
        barcode: product.barcode,
        quantity: product.quantity.toString(),
        unit: product.unit,
        purchasePrice: product.purchasePrice.toString(),
        sellingPrice: product.sellingPrice.toString(),
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        ...emptyProductForm,
        manufacturer: selectedCompany?.name ?? '',
      });
    }

    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (
      !productForm.manufacturer ||
      !productForm.name ||
      !productForm.barcode ||
      !productForm.quantity ||
      !productForm.purchasePrice ||
      !productForm.sellingPrice
    ) {
      toast({
        variant: 'destructive',
        title: "Xatolik",
        description: "Barcha majburiy maydonlarni to'ldiring.",
      });
      return;
    }

    try {
      setIsSaving(true);
      await saveWarehouseProduct({
        backendId: editingProduct?.backendId,
        manufacturer: productForm.manufacturer.trim(),
        name: productForm.name.trim(),
        barcode: productForm.barcode.trim(),
        quantity: Number(productForm.quantity),
        unit: productForm.unit,
        purchasePrice: Number(productForm.purchasePrice),
        sellingPrice: Number(productForm.sellingPrice),
      });

      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProductForm(emptyProductForm);

      toast({
        title: editingProduct ? "Mahsulot tahrirlandi!" : "Mahsulot qo'shildi!",
        description: `${productForm.name} muvaffaqiyatli saqlandi.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: "Saqlashda xatolik",
        description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    try {
      await deleteWarehouseProduct(product.backendId);
      toast({ title: "O'chirildi", description: "Mahsulot ro'yxatdan olib tashlandi." });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: "O'chirishda xatolik",
        description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
      });
      throw error;
    }
  };

  if (!selectedCompanyId || !selectedCompany) {
    return (
      <DashboardLayout>
        <div className="animate-in fade-in duration-500 space-y-6">
          {companies.length === 0 ? (
            <div className="min-h-[70vh] flex flex-col items-center justify-center">
              <button
                onClick={() => handleOpenProductModal()}
                className="group relative flex flex-col items-center gap-6"
              >
                <div className="h-32 w-32 rounded-[40px] bg-primary/5 border-2 border-dashed border-primary/20 flex items-center justify-center transition-all group-hover:scale-110 group-hover:border-primary/40 group-hover:bg-primary/10 group-active:scale-95 shadow-[0_0_50px_rgba(0,255,255,0.05)]">
                  <Plus className="h-14 w-14 text-primary group-hover:rotate-90 transition-transform duration-500" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-black text-white uppercase tracking-widest">OMBORXONA BO'SH</h2>
                  <p className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em]">Birinchi mahsulotni yarating</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-[#0a1a1a]/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                <h2 className="text-sm font-black text-white uppercase tracking-widest">ISHLAB CHIQARUVCHILAR ({companies.length})</h2>
                <Button onClick={() => handleOpenProductModal()} className="h-10 bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-black font-black uppercase tracking-widest text-[10px] rounded-xl px-6 transition-all">
                  <Plus className="mr-2 h-4 w-4" /> YANGI MAHSULOT
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => setSelectedCompanyId(company.id)}
                    className="bg-[#0a1f1f]/60 border border-white/5 rounded-[24px] p-6 space-y-5 hover:border-primary/40 transition-all cursor-pointer group relative overflow-hidden shadow-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div className="h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight truncate">{company.name}</h3>
                      <p className="text-[9px] font-black text-primary/40 uppercase tracking-widest mt-1">
                        {company.products.length} turdagi mahsulotlar
                      </p>
                    </div>
                    <div className="flex items-center justify-end">
                      <ChevronRight className="h-5 w-5 text-white/10 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ProductModal
            isOpen={isProductModalOpen}
            onOpenChange={setIsProductModalOpen}
            isSaving={isSaving}
            editingProduct={editingProduct}
            productForm={productForm}
            setProductForm={setProductForm}
            profitMargin={profitMargin}
            onSave={handleSaveProduct}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-in fade-in duration-500 space-y-6 pb-20">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a1a1a]/40 p-6 rounded-[28px] border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setSelectedCompanyId(null)}
              className="h-12 w-12 rounded-2xl bg-white/5 border border-white/5 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">{selectedCompany.name}</h2>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_#00ffff]" />
                <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Excel Boshqaruv Paneli</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button className="h-12 bg-white/5 border border-white/10 text-white/40 font-black uppercase tracking-widest text-[9px] rounded-2xl px-6 hover:text-white transition-all">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> EKSPORT EXCEL
            </Button>
            <DeleteConfirmButton
              itemName={selectedCompany.name}
              onConfirm={async () => {
                try {
                  await deleteManufacturer(selectedCompany);
                  setSelectedCompanyId(null);
                  toast({ title: "Ishlab chiqaruvchi o'chirildi", description: `${selectedCompany.name} ro'yxatdan olib tashlandi.` });
                } catch (error) {
                  toast({
                    variant: 'destructive',
                    title: "Ishlab chiqaruvchi o'chirilmadi",
                    description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
                  });
                  throw error;
                }
              }}
            >
              <Button className="h-12 bg-destructive/5 border border-destructive/10 text-destructive hover:bg-destructive/10 font-black uppercase tracking-widest text-[9px] rounded-2xl px-6 transition-all">
                <Trash2 className="mr-2 h-4 w-4" /> ISHLAB CHIQARUVCHINI O'CHIRISH
              </Button>
            </DeleteConfirmButton>
            <Button onClick={() => handleOpenProductModal()} className="h-12 bg-primary text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_30px_rgba(0,255,255,0.3)] hover:bg-primary/90 px-8">
              <Plus className="mr-2 h-5 w-5" /> MAHSULOT YARATISH
            </Button>
          </div>
        </header>

        <div className="bg-[#0a1a1a]/60 border border-white/5 rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-md">
          <Table>
            <TableHeader className="bg-[#0d1f1f]/50 border-b border-white/5">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px] text-[10px] font-black text-primary/60 uppercase tracking-widest text-center">#</TableHead>
                <TableHead className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Mahsulot nomi</TableHead>
                <TableHead className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Shtrix kod</TableHead>
                <TableHead className="text-[10px] font-black text-primary/60 uppercase tracking-widest text-center">Soni</TableHead>
                <TableHead className="text-[10px] font-black text-primary/60 uppercase tracking-widest text-center">Birligi</TableHead>
                <TableHead className="text-[10px] font-black text-primary/60 uppercase tracking-widest text-right">Olish narxi</TableHead>
                <TableHead className="text-[10px] font-black text-primary/60 uppercase tracking-widest text-right">Sotish narxi</TableHead>
                <TableHead className="text-[10px] font-black text-primary/60 uppercase tracking-widest text-center">Foyda %</TableHead>
                <TableHead className="text-[10px] font-black text-primary/60 uppercase tracking-widest text-right pr-8">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedCompany.products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center text-white/20 font-black uppercase tracking-widest">
                    MAHSULOTLAR MAVJUD EMAS
                  </TableCell>
                </TableRow>
              ) : (
                selectedCompany.products.map((product, index) => {
                  const margin = ((product.sellingPrice - product.purchasePrice) / product.purchasePrice) * 100;

                  return (
                    <TableRow key={product.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                      <TableCell className="text-[10px] font-black text-white/20 text-center">{index + 1}</TableCell>
                      <TableCell className="text-[11px] font-black text-white uppercase tracking-tight">{product.name}</TableCell>
                      <TableCell className="text-[10px] font-mono text-white/40">{product.barcode}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-primary/5 text-primary border-primary/20 text-[9px] font-black px-2 py-0.5 rounded-lg">
                          {product.quantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-[10px] font-black text-white/40 uppercase">{unitLabels[product.unit]}</TableCell>
                      <TableCell className="text-right text-[11px] font-black text-white/60">{product.purchasePrice.toLocaleString()} <span className="text-[8px] opacity-30">UZS</span></TableCell>
                      <TableCell className="text-right text-[11px] font-black text-primary">{product.sellingPrice.toLocaleString()} <span className="text-[8px] opacity-30">UZS</span></TableCell>
                      <TableCell className="text-center">
                        <span className="text-[10px] font-black text-primary/60">+{margin.toFixed(1)}%</span>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={() => handleOpenProductModal(product)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-primary hover:border-primary/30 transition-all"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <DeleteConfirmButton
                            itemName={product.name}
                            onConfirm={async () => {
                              await handleDeleteProduct(product);
                            }}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg bg-destructive/5 border border-destructive/10 text-destructive/40 hover:text-destructive hover:border-destructive/30 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </DeleteConfirmButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <ProductModal
          isOpen={isProductModalOpen}
          onOpenChange={setIsProductModalOpen}
          isSaving={isSaving}
          editingProduct={editingProduct}
          productForm={productForm}
          setProductForm={setProductForm}
          profitMargin={profitMargin}
          onSave={handleSaveProduct}
        />
      </div>
    </DashboardLayout>
  );
}

function ProductModal({
  isOpen,
  onOpenChange,
  isSaving,
  editingProduct,
  productForm,
  setProductForm,
  profitMargin,
  onSave,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isSaving: boolean;
  editingProduct: Product | null;
  productForm: ProductFormState;
  setProductForm: React.Dispatch<React.SetStateAction<ProductFormState>>;
  profitMargin: string | null;
  onSave: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a1f1f] border-white/10 text-white max-w-md rounded-[32px] p-8 shadow-2xl backdrop-blur-xl overflow-y-auto max-h-[90vh] custom-sidebar">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" /> {editingProduct ? 'MAHSULOTNI TAHRIRLASH' : 'YANGI MAHSULOT'}
          </DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-[0.2em]">Barcha tafsilotlarni to'ldiring.</DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">
              <Building2 className="h-3 w-3" /> Ishlab chiqaruvchi
            </Label>
            <Input
              aria-label="Ishlab chiqaruvchi"
              value={productForm.manufacturer}
              onChange={(e) => setProductForm((prev) => ({ ...prev, manufacturer: e.target.value }))}
              className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm focus:border-primary/40"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">
              <Tag className="h-3 w-3" /> Mahsulot Nomi
            </Label>
            <Input
              aria-label="Mahsulot nomi"
              value={productForm.name}
              onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
              className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm focus:border-primary/40"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">
              <Barcode className="h-3 w-3" /> Shtrix Kod
            </Label>
            <Input
              aria-label="Shtrix kod"
              value={productForm.barcode}
              onChange={(e) => setProductForm((prev) => ({ ...prev, barcode: e.target.value }))}
              className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm focus:border-primary/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">
                <Scale className="h-3 w-3" /> Soni
              </Label>
              <Input
                type="number"
                aria-label="Soni"
                value={productForm.quantity}
                onChange={(e) => setProductForm((prev) => ({ ...prev, quantity: e.target.value }))}
                className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm focus:border-primary/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Birligi</Label>
              <Select value={productForm.unit} onValueChange={(value: Product['unit']) => setProductForm((prev) => ({ ...prev, unit: value }))}>
                <SelectTrigger className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm focus:border-primary/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a1a1a] border-white/10 text-white rounded-xl">
                  <SelectItem value="bottle" className="text-[10px] font-black uppercase">BOTTLE</SelectItem>
                  <SelectItem value="box" className="text-[10px] font-black uppercase">BOX</SelectItem>
                  <SelectItem value="container" className="text-[10px] font-black uppercase">CONTAINER</SelectItem>
                  <SelectItem value="bag" className="text-[10px] font-black uppercase">BAG</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 relative">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">
                <DollarSign className="h-3 w-3" /> Olish Narxi
              </Label>
              <Input
                type="number"
                aria-label="Olish narxi"
                value={productForm.purchasePrice}
                onChange={(e) => setProductForm((prev) => ({ ...prev, purchasePrice: e.target.value }))}
                className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm focus:border-primary/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">
                <DollarSign className="h-3 w-3" /> Sotish Narxi
              </Label>
              <Input
                type="number"
                aria-label="Sotish narxi"
                value={productForm.sellingPrice}
                onChange={(e) => setProductForm((prev) => ({ ...prev, sellingPrice: e.target.value }))}
                className="h-12 bg-[#051111] border-white/5 rounded-xl font-bold px-4 text-sm focus:border-primary/40"
              />
            </div>

            {profitMargin && (
              <div className="absolute -bottom-6 right-0 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                <TrendingUp className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">FOYDA: {profitMargin}%</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-8">
          <Button disabled={isSaving} onClick={onSave} className="w-full h-14 bg-primary text-black font-black uppercase tracking-[0.3em] rounded-2xl shadow-[0_12px_40px_rgba(0,255,255,0.4)] hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-3">
            {editingProduct ? 'YANGILASH' : 'SAQLASH'} <ChevronRight className="h-5 w-5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
