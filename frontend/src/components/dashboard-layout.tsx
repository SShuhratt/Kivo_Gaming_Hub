'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Monitor, 
  CreditCard, 
  Users, 
  BarChart3, 
  Settings, 
  LayoutDashboard,
  Gamepad2,
  Clock3,
  ChevronRight,
  Wrench,
  Wallet,
  Menu,
  Bell,
  ShoppingCart,
  Banknote,
  Database,
  User as UserIcon,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { KivoLogo } from '@/components/ui/logo';
import { useDashboard } from '@/context/dashboard-context';

const LiveClock = () => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('uz-UZ', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/5 min-w-[100px] justify-center shadow-[0_0_15px_rgba(0,255,255,0.05)]">
      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#00ffff]" />
      <span className="text-[11px] font-black text-primary uppercase tracking-widest font-mono">
        {time || '--:--:--'}
      </span>
    </div>
  );
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isAuthenticated, isCheckingAuth, logout } = useDashboard();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isCheckingAuth && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isCheckingAuth, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const menuItems = [
    { name: 'Asosiy', icon: LayoutDashboard, href: '/asosiy' },
    { name: 'Band qilish', icon: Wallet, href: '/band-qilish' },
    { name: 'Aktiv seanslar', icon: Clock3, href: '/aktiv-seanslar' },
    { name: 'Kassa', icon: ShoppingCart, href: '/kassa' },
    { name: 'Savdo', icon: Banknote, href: '/savdo' },
    { name: 'Xonalar', icon: Monitor, href: '/xonalar' },
    { name: 'Ombor', icon: Database, href: '/ombor' },
    { name: 'Xizmatlar', icon: Wrench, href: '/xizmatlar' },
    { name: 'Tariflar', icon: CreditCard, href: '/tariflar' },
    { name: 'Moliya', icon: Banknote, href: '/moliya' },
    { name: 'Xodimlar', icon: Users, href: '/xodimlar' },
    { name: 'Analitika', icon: BarChart3, href: '/analitika' },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col mb-6 px-2 shrink-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
              <Gamepad2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-black text-[14px] text-white leading-tight uppercase tracking-tight whitespace-nowrap">Kivo Hub</span>
              <span className="text-[8px] text-primary/70 font-bold uppercase tracking-[0.2em] leading-none whitespace-nowrap">Gaming Hub</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-2 custom-sidebar scrollbar-hide hover:scrollbar-default transition-all">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "w-full flex items-center rounded-xl transition-all duration-300 group relative overflow-hidden gap-3.5 px-4 py-3",
                isActive 
                  ? "bg-primary text-black shadow-[0_0_20px_rgba(0,255,255,0.25)]" 
                  : "text-[#667070] hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn("h-4.5 w-4.5 shrink-0", isActive ? "text-black" : "text-[#667070] group-hover:text-white")} />
              <span className="text-[13px] font-bold">{item.name}</span>
              {isActive && (
                <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-black animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 shrink-0 pt-4 border-t border-white/5">
        <button className="w-full flex items-center rounded-xl text-[#667070] hover:text-white hover:bg-white/5 transition-all gap-3.5 px-4 py-3">
          <Settings className="h-4.5 w-4.5 shrink-0" />
          <span className="text-[13px] font-bold">Sozlamalar</span>
        </button>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center rounded-xl text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-all gap-3.5 px-4 py-3"
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" />
          <span className="text-[13px] font-bold">Chiqish</span>
        </button>

        <div className="bg-[#0a1a1a]/50 border border-white/5 rounded-2xl flex items-center justify-between p-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-7 w-7 border border-primary/20 p-0.5 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black">
                {(currentUser?.name ?? 'Admin')
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-black text-white truncate uppercase">{currentUser?.name ?? 'Admin Panel'}</span>
              <span className="text-[8px] text-primary/60 font-bold uppercase tracking-widest truncate">
                {currentUser?.phoneNumber ?? 'No phone'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isCheckingAuth || !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-[#051111] text-white overflow-hidden font-body relative">
      <aside className="hidden lg:flex shrink-0 bg-[#081414] border-r border-white/5 flex-col p-4 z-20 w-[210px]">
        <SidebarContent />
      </aside>

      <main className="flex-1 flex-col relative bg-[#051111] overflow-hidden flex">
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#051111]/80 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-primary h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-[#081414] border-white/5 p-4 w-[220px]">
                <SheetHeader>
                  <SheetTitle className="sr-only">Navigatsiya menyusi</SheetTitle>
                  <SheetDescription className="sr-only">Kivo Hub boshqaruv paneli navigatsiyasi</SheetDescription>
                </SheetHeader>
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <h1 className="text-sm font-black uppercase tracking-widest text-white/90">
              {menuItems.find(m => m.href === pathname)?.name || 'Boshqaruv'}
            </h1>
            <Badge className="bg-primary/5 text-primary border-primary/10 text-[8px] font-black uppercase px-2 py-0.5 flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,255,255,0.05)]">
              <div className="h-1 w-1 rounded-full bg-primary animate-pulse shadow-[0_0_5px_#00ffff]" /> SECURE
            </Badge>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 flex items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                <Gamepad2 className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/80">
                KIVO <span className="text-primary">GAME CLUB</span>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <button className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-[#444f4f] hover:text-primary transition-all">
                  <Bell className="h-4 w-4" />
                </button>
             </div>
             <div className="h-8 w-px bg-white/10" />
             <LiveClock />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 relative custom-sidebar">
          {children}
        </div>

        <footer className="h-11 border-t border-white/5 flex items-center justify-between px-8 bg-[#051111] z-10 shrink-0">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_#00ffff]" />
                <span className="text-[8px] font-black text-[#444f4f] uppercase tracking-[0.4em]">KIVO PROTOCOL ACTIVE</span>
             </div>
          </div>
          <div className="text-[8px] font-black text-[#444f4f] uppercase tracking-[0.4em] hover:text-primary cursor-pointer transition-colors">
            © 2024 KIVO HUB v2.5.0
          </div>
        </footer>
      </main>
    </div>
  );
}
