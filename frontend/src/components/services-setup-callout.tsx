'use client';

import Link from 'next/link';
import { ArrowRight, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SERVICES_SETUP_MESSAGE_EN, SERVICES_SETUP_MESSAGE_UZ } from '@/lib/service-setup';

export function ServicesSetupCallout({
  actionLabel = "Xizmatlarga o'tish",
  className = '',
}: {
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl border border-primary/20 bg-primary/5 p-5 shadow-xl ${className}`.trim()}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-[#051111]">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/70">Services First</p>
            <p className="text-sm font-black text-white">{SERVICES_SETUP_MESSAGE_EN}</p>
            <p className="text-[11px] leading-relaxed text-white/70">{SERVICES_SETUP_MESSAGE_UZ}</p>
          </div>
        </div>

        <Button asChild className="h-11 rounded-2xl bg-primary text-[10px] font-black uppercase tracking-[0.2em] text-black hover:bg-primary/90">
          <Link href="/xizmatlar">
            {actionLabel} <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
