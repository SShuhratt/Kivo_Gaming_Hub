'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { KivoLogo } from '@/components/ui/logo';
import { useToast } from '@/hooks/use-toast';
import {
  forgotPasswordResetRequest,
  forgotPasswordSendOtpRequest,
  forgotPasswordVerifyOtpRequest,
} from '@/lib/api';

type Step = 'email' | 'otp' | 'reset' | 'success';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResendCooldown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const passwordStrength = useMemo(() => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  }, [password]);

  async function handleSendOtp(event: React.FormEvent) {
    event.preventDefault();

    try {
      setIsSendingOtp(true);
      await forgotPasswordSendOtpRequest(email.trim().toLowerCase());

      setStep('otp');
      setOtp('');
      setResendCooldown(60);

      toast({
        title: 'OTP yuborildi',
        description: 'Parolni tiklash kodi emailingizga yuborildi.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'OTP yuborilmadi',
        description: error instanceof Error ? error.message : 'So‘rov bajarilmadi.',
      });
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    if (otp.trim().length !== 6) {
      toast({
        variant: 'destructive',
        title: 'OTP noto‘g‘ri',
        description: '6 xonali OTP kodni kiriting.',
      });
      return;
    }

    try {
      setIsVerifyingOtp(true);
      await forgotPasswordVerifyOtpRequest(email.trim().toLowerCase(), otp.trim());

      setStep('reset');

      toast({
        title: 'OTP tasdiqlandi',
        description: 'Endi yangi parolni o‘rnatishingiz mumkin.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'OTP tasdiqlanmadi',
        description: error instanceof Error ? error.message : 'Kod tasdiqlanmadi.',
      });
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function handleResendOtp() {
    try {
      setIsSendingOtp(true);
      await forgotPasswordSendOtpRequest(email.trim().toLowerCase());
      setResendCooldown(60);
      setOtp('');

      toast({
        title: 'OTP qayta yuborildi',
        description: 'Yangi kod emailingizga yuborildi. Eski kod endi ishlamaydi.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'OTP qayta yuborilmadi',
        description: error instanceof Error ? error.message : 'So‘rov bajarilmadi.',
      });
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent) {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Parollar mos emas',
        description: 'Yangi parol va uning tasdig‘i bir xil bo‘lishi kerak.',
      });
      return;
    }

    try {
      setIsResettingPassword(true);
      await forgotPasswordResetRequest(
        email.trim().toLowerCase(),
        otp.trim(),
        password,
        confirmPassword,
      );

      setStep('success');

      toast({
        title: 'Parol yangilandi',
        description: 'Yangi parol bilan tizimga kirishingiz mumkin.',
      });

      window.setTimeout(() => {
        router.push('/login');
      }, 1200);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Parol yangilanmadi',
        description: error instanceof Error ? error.message : 'So‘rov bajarilmadi.',
      });
    } finally {
      setIsResettingPassword(false);
    }
  }

  const strengthLabel = ['Juda kuchsiz', 'Kuchsiz', "O'rtacha", 'Kuchli', 'Mukammal'][passwordStrength] ?? 'Juda kuchsiz';

  return (
    <div className="min-h-screen bg-[#051111] text-white font-body selection:bg-primary/30">
      <header className="flex items-center justify-between p-6 md:px-12">
        <KivoLogo />
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary/70 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Login
        </Link>
      </header>

      <main className="flex min-h-[calc(100vh-96px)] items-center justify-center px-6 pb-12">
        <div className="w-full max-w-[560px] rounded-[32px] border border-white/5 bg-[#0a1f1f]/80 p-8 md:p-10 shadow-2xl backdrop-blur-sm">
          <div className="space-y-4">
            <div className="h-1 w-12 rounded-full bg-primary/40" />
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
              {step === 'success' ? 'Parol yangilandi' : 'Parolni tiklash'}
            </h1>
            <p className="max-w-md text-sm font-medium leading-relaxed text-white/60">
              {step === 'email' && 'Email manzilingizni kiriting. Gmail orqali yuborilgan OTP bilan parolingizni tiklaysiz.'}
              {step === 'otp' && 'Emailingizga yuborilgan 6 xonali OTP kodni kiriting.'}
              {step === 'reset' && 'OTP tasdiqlandi. Endi yangi parolni kiriting.'}
              {step === 'success' && 'Jarayon yakunlandi. Siz login sahifasiga yo‘naltirilasiz.'}
            </p>
          </div>

          {step !== 'success' && (
            <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                <p className="text-xs font-medium leading-relaxed text-white/70">
                  OTP kodi 10 daqiqa amal qiladi va faqat bir maqsad uchun ishlatiladi. Kodni boshqa hech kimga bermang.
                </p>
              </div>
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label htmlFor="forgot-password-email" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                  <Input
                    id="forgot-password-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-14 rounded-xl border-white/5 bg-[#051111]/60 pl-12 text-white font-bold focus:border-primary/40 focus:ring-primary/5"
                    placeholder="you@gmail.com"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSendingOtp}
                className="h-14 w-full rounded-2xl bg-primary font-black text-black uppercase tracking-[0.25em] hover:bg-primary/90"
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    YUBORILMOQDA...
                  </>
                ) : (
                  <>
                    OTP YUBORISH <MailCheck className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <div className="mt-8 space-y-5">
              <div className="space-y-2">
                <label htmlFor="forgot-password-otp" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  OTP kodi
                </label>
                <Input
                  id="forgot-password-otp"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D+/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="h-14 rounded-xl border-white/5 bg-[#051111]/60 text-center text-2xl font-black tracking-[0.5em] text-white focus:border-primary/40 focus:ring-primary/5"
                />
              </div>

              <Button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp}
                className="h-14 w-full rounded-2xl bg-primary font-black text-black uppercase tracking-[0.25em] hover:bg-primary/90"
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    TASDIQLANMOQDA...
                  </>
                ) : (
                  <>
                    OTP NI TASDIQLASH <CheckCircle2 className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleResendOtp}
                disabled={isSendingOtp || resendCooldown > 0}
                className="h-12 w-full rounded-2xl border-primary/20 bg-transparent font-black text-primary uppercase tracking-[0.2em] hover:bg-primary/10"
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    QAYTA YUBORILMOQDA...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {resendCooldown > 0 ? `QAYTA YUBORISH (${resendCooldown}s)` : 'OTP NI QAYTA YUBORISH'}
                  </>
                )}
              </Button>
            </div>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="mt-8 space-y-5">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label htmlFor="forgot-password-new-password" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                    Yangi parol
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                    <Input
                      id="forgot-password-new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      className="h-14 rounded-xl border-white/5 bg-[#051111]/60 pl-12 pr-12 text-white font-bold focus:border-primary/40 focus:ring-primary/5"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-primary"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="forgot-password-confirm-password" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                    Parolni tasdiqlash
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                    <Input
                      id="forgot-password-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      className="h-14 rounded-xl border-white/5 bg-[#051111]/60 pl-12 pr-12 text-white font-bold focus:border-primary/40 focus:ring-primary/5"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-primary"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                  <span>Parol kuchi</span>
                  <span className="text-primary">{strengthLabel}</span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 rounded-full ${index < passwordStrength ? 'bg-primary' : 'bg-white/10'}`}
                    />
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isResettingPassword}
                className="h-14 w-full rounded-2xl bg-primary font-black text-black uppercase tracking-[0.25em] hover:bg-primary/90"
              >
                {isResettingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    SAQLANMOQDA...
                  </>
                ) : (
                  'YANGI PAROLNI SAQLASH'
                )}
              </Button>
            </form>
          )}

          {step === 'success' && (
            <div className="mt-8 flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="text-sm font-medium leading-relaxed text-white/70">
                Parolingiz muvaffaqiyatli yangilandi. Login sahifasiga o‘tyapmiz.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
