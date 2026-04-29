import React from 'react';
import { Gamepad2 } from 'lucide-react';

export function KivoLogo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
        <Gamepad2 className="h-5 w-5 text-primary" />
      </div>
      <span className="font-headline font-black text-base tracking-widest text-white uppercase">
        KIVO <span className="text-primary">GAME CLUB</span>
      </span>
    </div>
  );
}
