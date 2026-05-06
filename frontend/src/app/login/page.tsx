'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useDashboard } from '@/context/dashboard-context';
import { 
  Lock, 
  Phone, 
  Eye, 
  EyeOff,
  LogIn, 
  Gamepad2, 
  Facebook,
  Globe,
  Instagram,
  Loader2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { login, isAuthenticated, isCheckingAuth } = useDashboard();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (!isCheckingAuth && isAuthenticated) {
      router.replace('/asosiy');
    }
  }, [isAuthenticated, isCheckingAuth, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(phoneNumber, password);
      toast({
        title: "Muvaffaqiyatli!",
        description: "Kivo Hub boshqaruv paneliga muvaffaqiyatli kirdingiz.",
      });
      router.replace('/asosiy');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kirishda xatolik!",
        description: error instanceof Error ? error.message : "Telefon raqami yoki parol noto'g'ri kiritildi.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 md:p-8 gaming-gradient-bg font-body overflow-y-auto">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-xl border border-white/5 bg-[#0d1515] shadow-2xl flex-col md:flex-row min-h-[500px] md:h-[650px]">
        
        {/* Chap tomon: Brending (Mobilda pastda yoki yashirin bo'lishi mumkin, lekin biz uni chiroyli saqlaymiz) */}
        <div className="relative hidden w-full md:w-1/2 flex-col items-center justify-center bg-[#080c0c]/50 p-8 md:p-12 text-center md:flex border-b md:border-b-0 md:border-r border-white/5">
          <div className="z-10 space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary/5 border border-primary/20 shadow-[0_0_20px_rgba(0,255,255,0.15)]">
              <Gamepad2 className="h-8 w-8 text-primary" />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-2 uppercase">
                KIVO <span className="text-primary bg-primary/10 px-2 rounded">HUB</span>
              </h1>
              <p className="mx-auto max-w-[280px] text-xs md:text-sm font-medium leading-relaxed text-muted-foreground/80">
                Zamonaviy o'yin arenalari uchun mukammal boshqaruv markazi.
              </p>
            </div>

            <div className="mt-4 md:mt-8 space-y-3 md:space-y-4">
              <div className="p-3 md:p-4 bg-primary/5 border border-primary/10 rounded-xl text-left">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <p className="text-[9px] md:text-[10px] text-primary font-black uppercase tracking-widest">Real hisob bilan kiring</p>
                </div>
                <p className="text-[10px] md:text-xs text-white/80 font-medium">
                  Ro'yxatdan o'tishda ishlatgan telefon raqamingiz va parolingiz bilan tizimga kiring.
                </p>
              </div>
              <div className="p-3 md:p-4 bg-primary/5 border border-primary/10 rounded-xl text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-[9px] md:text-[10px] text-primary font-black uppercase tracking-widest">Telefon formati</p>
                </div>
                <p className="text-[10px] md:text-xs text-white/80 font-medium">
                  `+998 90 123 45 67` yoki `998901234567` ko'rinishida kiritsangiz ham tizim bir xil qabul qiladi.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* O'ng tomon: Login Formasi */}
        <div className="flex w-full flex-col justify-center bg-[#111a1a] p-6 md:p-12 lg:p-16 md:w-1/2">
          <div className="max-w-md mx-auto w-full space-y-6 md:space-y-8">
            <div className="space-y-2 text-center md:text-left">
              <div className="md:hidden mx-auto mb-4 h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                <Gamepad2 className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase">Xush Kelibsiz</h2>
              <p className="text-xs md:text-sm text-muted-foreground/60 font-medium">Klub boshqaruv paneliga kiring</p>
            </div>

            <form className="space-y-5 md:space-y-6" onSubmit={handleLogin}>
              <div className="space-y-4 md:space-y-5">
                {/* Telefon raqami */}
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Telefon</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input 
                      type="tel" 
                      aria-label="Telefon"
                      name="phone_number"
                      autoComplete="tel"
                      inputMode="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="h-12 md:h-14 border-white/5 bg-[#080c0c] pl-12 text-white font-bold focus:border-primary/50 focus:ring-primary/10 transition-all rounded-xl text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Parol */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Parol</label>
                    <Link href="/forgot-password" className="text-[9px] md:text-[10px] text-primary hover:underline font-black uppercase tracking-tight">
                      Unutdingizmi?
                    </Link>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input 
                      type={showPassword ? "text" : "password"}
                      aria-label="Parol"
                      name="password"
                      autoComplete="current-password"
                      spellCheck={false}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 md:h-14 border-white/5 bg-[#080c0c] pl-12 pr-12 text-white font-bold focus:border-primary/50 focus:ring-primary/10 transition-all rounded-xl text-sm"
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Tizimda qolish */}
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" className="h-4 w-4 border-white/10 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                <label htmlFor="remember" className="text-[10px] md:text-xs font-medium text-muted-foreground/60 cursor-pointer">
                  Tizimda qolish
                </label>
              </div>

              {/* Kirish tugmasi */}
              <Button 
                type="submit" 
                disabled={isLoading}
                className="h-12 md:h-14 w-full bg-primary font-black text-black hover:bg-primary/90 shadow-[0_4px_20px_rgba(0,255,255,0.2)] transition-all active:scale-[0.98] rounded-xl uppercase tracking-[0.2em] text-xs md:text-sm"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>KIRISH <LogIn className="ml-2 h-5 w-5" /></>
                )}
              </Button>
            </form>

            <div className="text-center text-[10px] md:text-xs">
              <span className="text-muted-foreground/50 font-medium">Hisobingiz yo'qmi? </span>
              <Link href="/register" className="font-black text-primary hover:underline uppercase tracking-tight">
                Ro'yxatdan o'ting
              </Link>
            </div>

            {/* Pastki ijtimoiy piktogrammalar */}
            <div className="flex items-center justify-center gap-6 pt-2 md:pt-4 opacity-30">
              <Instagram className="h-4 w-4 cursor-pointer hover:text-primary transition-colors" />
              <Globe className="h-4 w-4 cursor-pointer hover:text-primary transition-colors" />
              <Facebook className="h-4 w-4 cursor-pointer hover:text-primary transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
