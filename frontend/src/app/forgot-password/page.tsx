'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  ArrowLeft, 
  HelpCircle,
  RotateCcw,
  Lock,
  Play,
  X,
  ShieldCheck,
  TriangleAlert,
  CheckCircle2,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Bell,
  User,
  RotateCw
} from 'lucide-react';
import { KivoLogo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { forgotPasswordRequest, resetPasswordRequest, verifyOtpRequest } from '@/lib/api';

type Step = 'phone' | 'otp' | 'reset' | 'success';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isError, setIsError] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(119); // 01:59
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Parol kuchini hisoblash
  const passwordStrength = useMemo(() => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  }, [password]);

  const strengthLabel = useMemo(() => {
    switch (passwordStrength) {
      case 0: return "JUDA KUCHSIZ";
      case 1: return "KUCHSIZ";
      case 2: return "O'RTACHA";
      case 3: return "KUCHLI";
      case 4: return "MUKAMMAL";
      default: return "";
    }
  }, [passwordStrength]);

  useEffect(() => {
    if (step === 'otp' && timer > 0 && !isVerified && !isError) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, timer, isVerified, isError]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return {
      mins: mins.toString().padStart(2, '0'),
      secs: secs.toString().padStart(2, '0')
    };
  };

  const { mins, secs } = formatTime(timer);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSendingCode(true);
      await forgotPasswordRequest(phoneNumber);
      setStep('otp');
      setTimer(119);
      setIsError(false);
      setIsVerified(false);
      setOtp(['', '', '', '', '', '']);
      toast({
        title: "Kod yuborildi",
        description: "Test muhiti uchun OTP Laravel log fayliga yoziladi.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kod yuborilmadi",
        description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isVerified) return;
    const val = value.slice(-1);
    if (!/^\d*$/.test(val)) return;

    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    
    setIsError(false);

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isVerified) return;
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const enteredCode = otp.join('');

    if (enteredCode.length !== 6 || isVerifyingCode) {
      return;
    }

    try {
      setIsVerifyingCode(true);
      await verifyOtpRequest(phoneNumber, enteredCode);
      setIsError(false);
      setIsVerified(true);
      setTimeout(() => setStep('reset'), 800);
    } catch (error) {
      setIsError(true);
      setIsVerified(false);

      toast({
        variant: "destructive",
        title: "Tasdiqlashda xatolik",
        description: error instanceof Error ? error.message : "Kod tasdiqlanmadi.",
      });
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Xatolik!",
        description: "Parollar bir-biriga mos kelmadi.",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        variant: "destructive",
        title: "Xatolik!",
        description: "Parol kamida 8 ta belgidan iborat bo'lishi kerak.",
      });
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await resetPasswordRequest(phoneNumber, otp.join(''), password);

      toast({
        title: "Muvaffaqiyatli!",
        description: "Sizning parolingiz yangilandi. Kirish sahifasiga yo'naltirilmoqdasiz.",
      });

      setStep('success');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Parol yangilanmadi",
        description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setIsSendingCode(true);
      await forgotPasswordRequest(phoneNumber);
      setTimer(119);
      setIsError(false);
      setOtp(['', '', '', '', '', '']);
      toast({
        title: "Kod qayta yuborildi",
        description: "Yangi OTP ham Laravel log fayliga yozildi.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kod qayta yuborilmadi",
        description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  useEffect(() => {
    const enteredCode = otp.join('');
    if (enteredCode.length === 6) {
      void handleVerify();
    }
  }, [otp]);

  if (step === 'reset') {
    return (
      <div className="min-h-screen flex flex-col bg-[#051111] text-white font-body selection:bg-primary/30 relative">
        <header className="flex items-center justify-between p-6 md:px-12 w-full">
          <KivoLogo />
          <div className="flex items-center gap-4">
            <button className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10 transition-all">
              <Bell className="h-5 w-5" />
            </button>
            <button className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10 transition-all">
              <User className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 -mt-10">
          <div className="w-full max-w-[540px] bg-[#0a1f1f]/80 border border-white/5 rounded-3xl p-10 space-y-8 animate-in fade-in zoom-in-95 duration-500 shadow-2xl backdrop-blur-sm">
            
            <div className="space-y-4">
              <div className="h-1 w-12 bg-primary/40 rounded-full" />
              <h1 className="text-4xl font-black tracking-tight text-white uppercase leading-tight">
                Yangi parol o'rnatish
              </h1>
              <p className="text-primary/60 text-sm leading-relaxed font-medium">
                Hisobingiz xavfsizligini ta'minlash uchun kamida 8 ta belgidan iborat kuchli paroldan foydalaning.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Yangi parol
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    spellCheck={false}
                    aria-label="Yangi parol"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-16 bg-[#081414]/50 border border-primary/10 rounded-xl px-5 text-white font-bold focus:outline-none focus:border-primary/40 transition-all"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Parolni tasdiqlash
                </label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    spellCheck={false}
                    aria-label="Parolni tasdiqlash"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-16 bg-[#081414]/50 border border-primary/10 rounded-xl px-5 text-white font-bold focus:outline-none focus:border-primary/40 transition-all"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((level) => (
                    <div 
                      key={level}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-all duration-300",
                        passwordStrength >= level 
                          ? "bg-primary shadow-[0_0_10px_rgba(0,255,255,0.6)]" 
                          : "bg-white/10"
                      )}
                    />
                  ))}
                </div>
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300",
                  passwordStrength > 0 ? "text-primary" : "text-muted-foreground/40"
                )}>
                  PAROL KUCHI: {strengthLabel || "NOMA'LUM"}
                </p>
              </div>
            </div>

            <div className="space-y-6 pt-4">
              <Button 
                onClick={handleUpdatePassword}
                disabled={isUpdatingPassword}
                className="w-full h-16 bg-primary text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_0_30px_rgba(0,255,255,0.4)] hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                PAROLNI YANGILASH <RotateCw className="h-5 w-5" />
              </Button>

              <div className="text-center">
                <Link href="/login" className="text-[11px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors">
                  Bekor qilish va tizimga qaytish
                </Link>
              </div>
            </div>
          </div>
        </main>

        <footer className="p-8 text-center opacity-30 mt-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.2em]">
            © 2024 KIVO GAME CLUB MANAGEMENT SYSTEM. BARCHA HUQUQLAR HIMOYALANGAN.
          </p>
        </footer>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex flex-col bg-[#050c0c] text-white items-center justify-center p-6 text-center gaming-gradient-bg font-body">
        <div className="space-y-8 animate-in fade-in zoom-in duration-500 max-w-sm">
          <div className="mx-auto h-24 w-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_50px_rgba(0,255,255,0.15)]">
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight uppercase text-white">Muvaffaqiyatli!</h1>
            <p className="text-muted-foreground/60 text-sm leading-relaxed font-medium">
              Sizning parolingiz muvaffaqiyatli yangilandi. Endi yangi parol bilan tizimga kirishingiz mumkin.
            </p>
          </div>
          <Button asChild className="h-16 w-full bg-primary text-black font-black rounded-2xl uppercase tracking-[0.2em] hover:bg-primary/90 shadow-[0_10px_30px_rgba(0,255,255,0.2)]">
            <Link href="/login">KIRISH SAHIFASIGA O'TISH</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex flex-col bg-[#050c0c] text-white selection:bg-primary/30 font-body relative overflow-hidden gaming-gradient-bg">
        <header className="flex items-center justify-between p-6 md:p-8 z-10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg border border-primary/20 bg-primary/5">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white/90">Parolni tiklash</span>
          </div>
          <button onClick={() => setStep('phone')} className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors">
            <X className="h-5 w-5 text-primary" />
          </button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-20">
          <div className="w-full max-w-[800px] text-center space-y-12 animate-in fade-in zoom-in-95 duration-500">
            
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white uppercase">
                Tasdiqlash kodi
              </h1>
              <p className="text-primary/80 text-xs md:text-sm font-medium">
                {phoneNumber || '+998 -- --- -- --'} raqamiga yuborilgan 6 xonali kodni kiriting
              </p>
            </div>

            <div className="mx-auto flex justify-center gap-3 md:gap-5">
              {otp.map((val, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  inputMode="numeric"
                  maxLength={1}
                  value={val}
                  readOnly={isVerified}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={cn(
                    "w-10 h-16 md:w-14 md:h-20 bg-transparent border-b-2 text-3xl font-bold text-center focus:outline-none transition-all duration-200",
                    isError 
                      ? "border-destructive text-destructive" 
                      : isVerified
                        ? "border-primary text-primary"
                        : val 
                          ? "border-primary text-primary shadow-[0_4px_0_-2px_rgba(0,255,255,0.4)]" 
                          : "border-white/20 text-white focus:border-primary"
                  )}
                />
              ))}
            </div>

            {!isError && !isVerified && (
              <div className="flex items-center justify-center gap-4">
                <div className="space-y-2 text-center">
                  <div className="h-20 w-20 md:h-24 md:w-24 flex items-center justify-center rounded-2xl bg-primary/5 border border-primary/20 text-3xl font-black text-primary shadow-[0_0_30px_rgba(0,255,255,0.15)]">
                    {mins}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mt-2">Daqiqa</p>
                </div>
                <span className="text-3xl font-black text-primary mb-8">:</span>
                <div className="space-y-2 text-center">
                  <div className="h-20 w-20 md:h-24 md:w-24 flex items-center justify-center rounded-2xl bg-primary/5 border border-primary/20 text-3xl font-black text-primary shadow-[0_0_30px_rgba(0,255,255,0.15)]">
                    {secs}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mt-2">Soniya</p>
                </div>
              </div>
            )}

            {isError && (
              <div className="mx-auto w-fit px-8 py-4 rounded-2xl border border-destructive/30 bg-destructive/5 flex flex-col items-center gap-2 animate-in slide-in-from-top-4">
                <TriangleAlert className="h-8 w-8 text-destructive" />
                <span className="text-xs font-black text-destructive uppercase tracking-widest">Kod noto'g'ri kiritildi!</span>
              </div>
            )}

            {isVerified && (
              <div className="mx-auto w-fit px-8 py-4 rounded-2xl border border-primary/30 bg-primary/5 flex flex-col items-center gap-2 animate-in slide-in-from-top-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
                <span className="text-xs font-black text-primary uppercase tracking-widest">Kod to'g'ri kiritildi</span>
              </div>
            )}

            <div className="space-y-10 flex flex-col items-center">
              <Button 
                onClick={() => {
                  if (isVerified) {
                    setStep('reset');
                    return;
                  }

                  void handleVerify();
                }}
                disabled={isVerifyingCode}
                className={cn(
                  "h-16 w-full max-w-[440px] font-black text-black rounded-2xl text-base tracking-[0.2em] uppercase transition-all",
                  isVerified || (!isError && otp.join('').length === 6)
                    ? "bg-primary shadow-[0_0_50px_rgba(0,255,255,0.5)] hover:bg-primary/90" 
                    : "bg-primary/80 hover:bg-primary text-black shadow-none"
                )}
              >
                TASDIQLASH
              </Button>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => void handleResendCode()}
                  disabled={isSendingCode}
                  className="flex items-center gap-2 text-primary/40 hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest mx-auto disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Kodni qayta yuborish
                </button>
                <p className="text-[10px] text-muted-foreground/30 font-medium max-w-xs mx-auto leading-relaxed text-center">
                  Agar kod kelmasa, "Kodni qayta yuborish" tugmasini bosing.
                </p>
              </div>
            </div>
          </div>
        </main>
        
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 opacity-20">
          <div className="h-px w-24 bg-gradient-to-r from-transparent to-primary" />
          <span className="text-[9px] font-black tracking-[0.5em] text-primary uppercase">Secure Access Point</span>
          <div className="h-px w-24 bg-gradient-to-l from-transparent to-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#081414] text-white selection:bg-primary/30 font-body gaming-gradient-bg">
      <header className="flex items-center justify-between p-8 md:px-12">
        <KivoLogo />
        <button className="h-12 w-12 flex items-center justify-center rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
          <HelpCircle className="h-6 w-6 text-primary" />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-[600px] space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
          
          <div className="flex justify-start">
             <div className="relative h-16 w-16 flex items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 shadow-[0_0_20px_rgba(0,255,255,0.15)]">
                <RotateCcw className="h-8 w-8 text-primary" />
                <div className="absolute bottom-4 right-4 bg-[#081414] rounded-full p-1">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
             </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight uppercase">
              Parolni tiklash
            </h1>
            <p className="text-sm md:text-base text-muted-foreground/60 max-w-lg leading-relaxed font-medium">
              Xavotir olmang! Ro'yxatdan o'tgan telefon raqamingizni kiriting va biz sizga tiklash kodini yuboramiz.
            </p>
          </div>

          <form className="space-y-10" onSubmit={handleSendCode}>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">
                Telefon raqami
              </label>
              <div className="relative group">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                <input 
                  type="tel" 
                  name="phone_number"
                  autoComplete="tel"
                  inputMode="tel"
                  aria-label="Telefon raqami"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="h-16 w-full border border-white/5 bg-[#0d1a1a]/50 pl-14 pr-6 text-white text-lg font-bold focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/5 transition-all rounded-xl"
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={isSendingCode} className="h-16 w-full bg-primary font-black text-black hover:bg-primary/90 shadow-[0_8px_30px_rgba(0,255,255,0.3)] transition-all active:scale-[0.98] rounded-xl text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3">
              KODNI YUBORISH <Play className="h-5 w-5 fill-current" />
            </Button>
          </form>

          <div className="flex justify-center pt-4">
            <Link 
              href="/login" 
              className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-primary hover:text-primary/80 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Kirish sahifasiga qaytish
            </Link>
          </div>
        </div>
      </main>

      <footer className="p-12 text-center mt-auto opacity-30">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">
          © 2024 KIVO MANAGEMENT SYSTEM. SECURE ACCESS POINT.
        </p>
      </footer>
    </div>
  );
}
