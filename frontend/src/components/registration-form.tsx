"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  MailCheck,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { PasswordTool } from '@/components/password-tool';
import {
  ApiError,
  registerRequest,
  resendRegistrationOtpRequest,
  verifyRegistrationOtpRequest,
} from '@/lib/api';

const registrationSchema = z.object({
  username: z.string().min(3, 'Ism kamida 3 ta belgidan iborat bo\'lishi kerak'),
  email: z.string().email('Email manzil noto\'g\'ri'),
  phoneNumber: z.string().min(9, 'Telefon raqami noto\'g\'ri'),
  password: z.string().min(8, 'Parol kamida 8 ta belgidan iborat bo\'lishi kerak'),
  confirmPassword: z.string(),
  terms: z.boolean().refine((value) => value === true, {
    message: 'Shartlarga rozilik bildirishingiz kerak',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Parollar mos kelmadi",
  path: ['confirmPassword'],
});

type RegistrationValues = z.infer<typeof registrationSchema>;
type RegistrationStep = 'form' | 'verify';

export function RegistrationForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<RegistrationStep>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  const form = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  });

  async function onSubmit(values: RegistrationValues) {
    setIsSubmitting(true);

    try {
      const response = await registerRequest({
        name: values.username.trim(),
        email: values.email.trim().toLowerCase(),
        phone_number: values.phoneNumber.trim(),
        password: values.password,
      });

      if (response.requires_verification === false) {
        toast({
          title: "Muvaffaqiyatli ro'yxatdan o'tildi",
          description: "Hisobingiz faollashtirildi. Tizimga kirishingiz mumkin.",
        });
        router.push('/login');
      } else {
        setPendingEmail(response.email);
        setOtp('');
        setStep('verify');

        toast({
          title: "OTP yuborildi",
          description: "Ro'yxatdan o'tishni yakunlash uchun emailingizga yuborilgan 6 xonali kodni kiriting.",
        });
      }
    } catch (error) {
      const description = error instanceof ApiError
        ? error.status === 503
          ? error.message
          : error.status >= 500
            ? "Serverda vaqtinchalik xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring."
            : error.message
        : error instanceof Error
          ? error.message
          : "So'rov bajarilmadi.";

      toast({
        variant: "destructive",
        title: "Ro'yxatdan o'tishda xatolik",
        description,
      });
    } finally {
      setIsSubmitting(false);
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
      await verifyRegistrationOtpRequest(pendingEmail, otp.trim());

      toast({
        title: 'Email tasdiqlandi',
        description: "Hisobingiz faollashtirildi. Endi tizimga kirishingiz mumkin.",
      });

      router.push('/login');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'OTP tasdiqlanmadi',
        description: error instanceof Error ? error.message : 'OTP tasdiqlash amalga oshmadi.',
      });
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function handleResendOtp() {
    try {
      setIsResendingOtp(true);
      await resendRegistrationOtpRequest(pendingEmail);

      toast({
        title: 'OTP qayta yuborildi',
        description: 'Yangi tasdiqlash kodi emailingizga yuborildi.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'OTP qayta yuborilmadi',
        description: error instanceof Error ? error.message : 'So‘rov bajarilmadi.',
      });
    } finally {
      setIsResendingOtp(false);
    }
  }

  const handleSelectSuggestion = (password: string) => {
    form.setValue('password', password, { shouldValidate: true });
    form.setValue('confirmPassword', password, { shouldValidate: true });
    toast({
      title: 'AI parol biriktirildi',
      description: "Xavfsiz parol muvaffaqiyatli o'rnatildi.",
    });
  };

  if (step === 'verify') {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
            <MailCheck className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">
              Emailni tasdiqlang
            </h2>
            <p className="text-sm font-medium leading-relaxed text-white/60">
              <span className="text-white">{pendingEmail}</span> manziliga yuborilgan 6 xonali kodni kiriting.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
            <p className="text-xs font-medium leading-relaxed text-white/70">
              Email tasdiqlanmaguncha hisob faol bo‘lmaydi. OTP muddati 10 daqiqa.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="registration-otp" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">
            OTP kodi
          </FormLabel>
          <Input
            id="registration-otp"
            name="otp"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D+/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className="h-14 border-white/5 bg-[#051111]/60 text-center text-2xl font-black tracking-[0.5em] text-white focus:border-primary/40 focus:ring-primary/5 rounded-xl transition-all"
          />
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            onClick={handleVerifyOtp}
            disabled={isVerifyingOtp}
            className="w-full h-16 bg-primary text-black font-black text-xs uppercase tracking-[0.3em] hover:bg-primary/90 transition-all active:scale-[0.98] shadow-[0_12px_40px_rgba(0,255,255,0.3)] rounded-2xl flex items-center justify-center gap-3"
          >
            {isVerifyingOtp ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                TASDIQLANMOQDA...
              </>
            ) : (
              <>
                TASDIQLASH <CheckCircle2 className="h-5 w-5" />
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleResendOtp}
            disabled={isResendingOtp}
            className="w-full h-14 rounded-2xl border-primary/20 bg-transparent font-black text-xs uppercase tracking-[0.25em] text-primary hover:bg-primary/10"
          >
            {isResendingOtp ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                YUBORILMOQDA...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                OTP NI QAYTA YUBORISH
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep('form')}
            className="w-full text-xs font-black uppercase tracking-[0.2em] text-white/50 hover:bg-transparent hover:text-white"
          >
            Ma’lumotlarni tahrirlash
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-5">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel htmlFor="register-name" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">
                  Foydalanuvchi ismi
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="register-name"
                      aria-label="Foydalanuvchi ismi"
                      autoComplete="name"
                      className="h-14 pl-12 border-white/5 bg-[#051111]/60 text-white font-bold focus:border-primary/40 focus:ring-primary/5 rounded-xl transition-all"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-[10px] font-black uppercase text-destructive tracking-widest" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel htmlFor="register-email" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">
                  Email
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <MailCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="register-email"
                      type="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      aria-label="Email"
                      className="h-14 pl-12 border-white/5 bg-[#051111]/60 text-white font-bold focus:border-primary/40 focus:ring-primary/5 rounded-xl transition-all"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-[10px] font-black uppercase text-destructive tracking-widest" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel htmlFor="register-phone" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">
                  Telefon raqami
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="register-phone"
                      aria-label="Telefon raqami"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      className="h-14 pl-12 border-white/5 bg-[#051111]/60 text-white font-bold focus:border-primary/40 focus:ring-primary/5 rounded-xl transition-all"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-[10px] font-black uppercase text-destructive tracking-widest" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <FormLabel htmlFor="register-password" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                    Parol
                  </FormLabel>
                </div>
                <FormControl>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      spellCheck={false}
                      aria-label="Parol"
                      className="h-14 pl-12 pr-12 border-white/5 bg-[#051111]/60 text-white font-bold focus:border-primary/40 focus:ring-primary/5 rounded-xl transition-all"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-[10px] font-black uppercase text-destructive tracking-widest" />

                <PasswordTool
                  passwordValue={field.value}
                  onSelectSuggestion={handleSelectSuggestion}
                />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel htmlFor="register-password-confirmation" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">
                  Parolni tasdiqlash
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="register-password-confirmation"
                      type="password"
                      autoComplete="new-password"
                      spellCheck={false}
                      aria-label="Parolni tasdiqlash"
                      className="h-14 pl-12 border-white/5 bg-[#051111]/60 text-white font-bold focus:border-primary/40 focus:ring-primary/5 rounded-xl transition-all"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-[10px] font-black uppercase text-destructive tracking-widest" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="terms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 bg-white/5 p-4 rounded-xl border border-white/5">
              <FormControl>
                <Checkbox
                  id="register-terms"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="h-5 w-5 border-white/10 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </FormControl>
              <FormLabel htmlFor="register-terms" className="text-[10px] font-bold text-white/40 leading-relaxed uppercase tracking-widest">
                Men <span className="text-primary hover:underline cursor-pointer">Foydalanish shartlariga</span> va Maxfiylik siyosatiga roziman
              </FormLabel>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full h-16 bg-primary text-black font-black text-xs uppercase tracking-[0.3em] hover:bg-primary/90 transition-all active:scale-[0.98] shadow-[0_12px_40px_rgba(0,255,255,0.3)] rounded-2xl flex items-center justify-center gap-3"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              YUBORILMOQDA...
            </>
          ) : (
            <>
              RO'YXATDAN O'TISH <CheckCircle2 className="h-5 w-5" />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
