'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/context/dashboard-context';

export default function RootPage() {
  const router = useRouter();
  const { isCheckingAuth, isAuthenticated } = useDashboard();

  useEffect(() => {
    if (isCheckingAuth) {
      return;
    }

    if (!isAuthenticated) {
      router.replace('/login');
    } else {
      router.replace('/asosiy');
    }
  }, [isAuthenticated, isCheckingAuth, router]);

  return null;
}
