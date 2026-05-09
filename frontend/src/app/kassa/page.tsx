'use client';

import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useDashboard, Product } from '@/context/dashboard-context';
import { 
  Search, 
  ShoppingCart, 
  Package, 
  Barcode, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getWarehouseUnitLabel } from '@/lib/warehouse-units';

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Naqd' },
  { value: 'terminal', label: 'Terminal' },
  { value: 'click', label: 'Click' },
  { value: 'payme', label: 'Payme' },
] as const;

export default function KassaPOSPage() {
  const { companies, currentUser, completeCheckoutSale, isCheckingAuth } = useDashboard();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'terminal' | 'click' | 'payme'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Barcha mahsulotlarni bitta listga yig'ish
  const allProducts = useMemo(() => {
    return companies.flatMap(c => c.products);
  }, [companies]);

  // Qidiruv natijalari
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return allProducts;
    const term = searchTerm.toLowerCase();
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.barcode.toLowerCase().includes(term)
    );
  }, [allProducts, searchTerm]);

  const getProductStock = (productId: string) => {
    return allProducts.find((product) => product.id === productId)?.quantity ?? 0;
  };

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      toast({
        variant: 'destructive',
        title: "Mahsulot tugagan",
        description: `${product.name} omborda qolmagan.`,
      });
      return;
    }

    const currentQty = cart.find((item) => item.product.id === product.id)?.qty ?? 0;

    if (currentQty >= product.quantity) {
      toast({
        variant: 'destructive',
        title: "Ombor cheklovi",
        description: `${product.name} uchun yetarli qoldiq yo'q.`,
      });
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, qty: item.qty + 1 } 
            : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQty = (productId: string, delta: number) => {
    if (delta > 0) {
      const currentQty = cart.find((item) => item.product.id === productId)?.qty ?? 0;
      const stock = getProductStock(productId);

      if (currentQty >= stock) {
        const productName = cart.find((item) => item.product.id === productId)?.product.name ?? 'Mahsulot';
        toast({
          variant: 'destructive',
          title: "Ombor cheklovi",
          description: `${productName} uchun yetarli qoldiq yo'q.`,
        });
        return;
      }
    }

    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, curr) => acc + (curr.product.sellingPrice * curr.qty), 0);
  }, [cart]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    try {
      setIsSubmitting(true);
      await completeCheckoutSale({
        items: cart.map((item) => ({
          warehouseId: item.product.backendId,
          quantity: item.qty,
        })),
        paymentMethod,
      });

      toast({
        title: "Sotuv yakunlandi",
        description: `${cartTotal.toLocaleString()} UZS ${PAYMENT_METHOD_OPTIONS.find((option) => option.value === paymentMethod)?.label?.toLowerCase()} orqali qabul qilindi.`,
      });
      setCart([]);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: "Sotuv yakunlanmadi",
        description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingAuth) return null;

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] animate-in fade-in duration-500">
        
        {/* Chap tomon: Mahsulotlar Grid */}
        <div className="flex-1 flex flex-col space-y-6">
          <header className="bg-[#0a1a1a]/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/40" />
              <Input 
                aria-label="Kassa mahsulot qidiruvi"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 pl-12 bg-[#051111] border-white/5 text-sm font-bold text-white rounded-xl focus:border-primary/40 focus:ring-0"
              />
            </div>
            <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <Barcode className="h-6 w-6 text-primary" />
            </div>
          </header>

          <ScrollArea className="flex-1 pr-4">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20 py-20">
                <Package className="h-16 w-16" />
                <p className="text-xs font-black uppercase tracking-widest">MAHSULOT TOPILMADI</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <div 
                    key={product.id}
                    onClick={() => product.quantity > 0 && addToCart(product)}
                    className={`bg-[#0a1f1f]/60 border border-white/5 rounded-2xl p-4 space-y-4 transition-all group shadow-xl relative overflow-hidden ${
                      product.quantity > 0 ? 'hover:border-primary/40 cursor-pointer' : 'cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className="space-y-1">
                      <h3 className="text-[11px] font-black text-white uppercase tracking-tight line-clamp-2">{product.name}</h3>
                      <p className="text-[9px] font-black text-primary/40 uppercase tracking-widest">{product.manufacturer}</p>
                      <p className="text-[9px] font-black text-white/25 tracking-widest">{product.barcode}</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                       <p className="text-sm font-black text-primary">{product.sellingPrice.toLocaleString()} <span className="text-[8px] opacity-50">UZS</span></p>
                       <Badge variant="outline" className="border-white/10 text-[8px] font-black text-white/40">
                         Qoldi: {product.quantity} {getWarehouseUnitLabel(product.unit)}
                       </Badge>
                    </div>

                    <p className="text-[9px] font-black text-white/30">
                      Birligi: {getWarehouseUnitLabel(product.unit)}
                    </p>
                    
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <div className="h-6 w-6 rounded-full bg-primary text-black flex items-center justify-center">
                          <Plus className="h-3 w-3" />
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* O'ng tomon: Savatcha (Checkout) */}
        <div className="w-full lg:w-[400px] flex flex-col bg-[#0a1a1a]/60 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-md shadow-2xl">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0d1f1f]/40">
             <div className="flex items-center gap-3">
               <ShoppingCart className="h-5 w-5 text-primary" />
               <h2 className="text-sm font-black text-white uppercase tracking-widest">SAVATCHA</h2>
             </div>
             <Badge className="bg-primary text-black font-black px-2.5">{cart.length}</Badge>
          </div>

          <ScrollArea className="flex-1 p-6">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20 py-10">
                <ShoppingCart className="h-12 w-12" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">SAVATCHA BO'SH</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.product.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3 group">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5 max-w-[200px]">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-tight truncate">{item.product.name}</h4>
                        <p className="text-[9px] font-black text-primary/40">{item.product.sellingPrice.toLocaleString()} UZS</p>
                        <p className="text-[9px] font-black text-white/25">
                          {getWarehouseUnitLabel(item.product.unit)}
                        </p>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-white/20 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3 bg-[#051111] rounded-lg border border-white/5 p-1">
                          <button onClick={() => updateQty(item.product.id, -1)} className="h-6 w-6 flex items-center justify-center hover:bg-white/5 rounded-md text-white/40">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-black text-white w-6 text-center">{item.qty}</span>
                          <button onClick={() => updateQty(item.product.id, 1)} className="h-6 w-6 flex items-center justify-center hover:bg-white/5 rounded-md text-primary">
                            <Plus className="h-3 w-3" />
                          </button>
                       </div>
                       <p className="text-xs font-black text-white">{(item.product.sellingPrice * item.qty).toLocaleString()} UZS</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-8 bg-[#051111]/80 border-t border-white/5 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">To'lov usuli</Label>
                <Select value={paymentMethod} onValueChange={(value: 'cash' | 'terminal' | 'click' | 'payme') => setPaymentMethod(value)}>
                  <SelectTrigger className="h-11 rounded-xl border-white/5 bg-[#0a1a1a] text-[10px] font-black uppercase text-white/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-white/10 bg-[#0a1a1a] text-white">
                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-[10px] font-black uppercase">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Kassir</Label>
                <div className="flex h-11 items-center rounded-xl border border-white/5 bg-[#0a1a1a] px-4 text-[10px] font-black uppercase text-white/70">
                  {currentUser?.name ?? "Noma'lum"}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                <span>ORALIQ JAMI:</span>
                <span>{cartTotal.toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between items-end border-t border-white/5 pt-3">
                 <span className="text-[11px] font-black text-primary uppercase tracking-[0.3em]">JAMI TO'LOV:</span>
                 <span className="text-3xl font-black text-white tracking-tighter">{cartTotal.toLocaleString()} <span className="text-[10px] text-white/20">UZS</span></span>
              </div>
            </div>

            <Button 
              onClick={handleCheckout}
              disabled={cart.length === 0 || isSubmitting}
              className="w-full h-16 bg-primary text-black font-black uppercase tracking-[0.3em] rounded-2xl shadow-[0_12px_40px_rgba(0,255,255,0.3)] hover:bg-primary/90 transition-all flex items-center justify-center gap-3 text-xs"
            >
              {isSubmitting ? 'SOTUV SAQLANMOQDA' : 'SOTUVNI YAKUNLASH'} <CheckCircle2 className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center justify-center gap-3 opacity-20">
               <div className="h-1 w-1 rounded-full bg-primary" />
               <span className="text-[8px] font-black text-white uppercase tracking-[0.5em]">KIVO POS TERMINAL ACTIVE</span>
               <div className="h-1 w-1 rounded-full bg-primary" />
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
