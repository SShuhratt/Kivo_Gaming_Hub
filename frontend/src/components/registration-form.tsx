"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Phone, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
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
import { registerRequest } from '@/lib/api';

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
  path: ["confirmPassword"],
});

type RegistrationValues = z.infer<typeof registrationSchema>;

export function RegistrationForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      await registerRequest({
        name: values.username.trim(),
        gmail: values.email.trim().toLowerCase(),
        phone_number: values.phoneNumber.trim(),
        password: values.password,
      });

      toast({
        title: "Muvaffaqiyatli ro'yxatdan o'tdingiz!",
        description: "Sizning hisobingiz yaratildi. Endi tizimga kirishingiz mumkin.",
      });

      router.push('/login');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Ro'yxatdan o'tishda xatolik",
        description: error instanceof Error ? error.message : "So'rov bajarilmadi.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleSelectSuggestion = (password: string) => {
    form.setValue('password', password, { shouldValidate: true });
    form.setValue('confirmPassword', password, { shouldValidate: true });
    toast({
      title: "AI Parol biriktirildi",
      description: "Xavfsiz parol muvaffaqiyatli o'rnatildi.",
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-5">
          {/* FOYDALANUVCHI ISMI */}
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">
                  Foydalanuvchi ismi
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    <Input 
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

          {/* TELEFON RAQAMI */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">
                  Email
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    <Input 
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

          {/* TELEFON RAQAMI */}
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">
                  Telefon raqami
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    <Input 
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

          {/* PAROL */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <div className="flex items-center justify-between px-1">
                   <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                     Parol
                   </FormLabel>
                </div>
                <FormControl>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    <Input 
                      type={showPassword ? "text" : "password"}
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
                
                {/* AI Password Tool Integration */}
                <PasswordTool 
                  passwordValue={field.value} 
                  onSelectSuggestion={handleSelectSuggestion} 
                />
              </FormItem>
            )}
          />

          {/* PAROLNI TASDIQLASH */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">
                  Parolni tasdiqlash
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    <Input 
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

        {/* TERMS */}
        <FormField
          control={form.control}
          name="terms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 bg-white/5 p-4 rounded-xl border border-white/5">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="h-5 w-5 border-white/10 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </FormControl>
              <FormLabel className="text-[10px] font-bold text-white/40 leading-relaxed uppercase tracking-widest">
                Men <span className="text-primary hover:underline cursor-pointer">Foydalanish shartlariga</span> va Maxfiylik siyosatiga roziman
              </FormLabel>
            </FormItem>
          )}
        />

        {/* SUBMIT BUTTON */}
        <Button 
          type="submit" 
          className="w-full h-16 bg-primary text-black font-black text-xs uppercase tracking-[0.3em] hover:bg-primary/90 transition-all active:scale-[0.98] shadow-[0_12px_40px_rgba(0,255,255,0.3)] rounded-2xl flex items-center justify-center gap-3" 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              YARATILMOQDA...
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
