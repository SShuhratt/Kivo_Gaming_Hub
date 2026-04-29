'use client';

import React from 'react';
import Link from 'next/link';
import { RegistrationForm } from '@/components/registration-form';
import { KivoLogo } from '@/components/ui/logo';
import { Gamepad2, ArrowLeft, ShieldCheck, Zap } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#051111] text-white selection:bg-primary/30 font-body relative overflow-y-auto gaming-gradient-bg">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between p-6 md:px-12 z-10">
        <KivoLogo />
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">SISTEMA HOLATI</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#00ffff]" />
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">HIMOYALANGAN</span>
            </div>
          </div>
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/5 border border-primary/20">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 py-12 md:py-20 z-10">
        <div className="w-full max-w-[500px] space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="space-y-4 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
               <div className="h-1 w-12 bg-primary/40 rounded-full" />
               <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">YANGI HISOB YARATISH</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none uppercase text-white">
              QO'SHILING VA <br /> <span className="text-primary">G'ALABA</span> QOZONING
            </h1>
            <p className="text-sm md:text-base text-muted-foreground/60 max-w-sm leading-relaxed font-medium">
              Kivo Hub platformasida ro'yxatdan o'ting va o'yin arenalarini professional tarzda boshqarishni boshlang.
            </p>
          </div>

          <div className="bg-[#0a1a1a]/40 border border-white/5 p-8 rounded-[32px] backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <RegistrationForm />
          </div>

          <div className="flex justify-center pb-8">
            <Link 
              href="/login" 
              className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-primary/40 hover:text-primary transition-all group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Tizimga kirish sahifasiga qaytish
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-10 text-center opacity-20 mt-auto">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground">
          © 2024 KIVO HUB MANAGEMENT SYSTEM. BARCHA HUQUQLAR HIMOYALANGAN.
        </p>
      </footer>
    </div>
  );
}
