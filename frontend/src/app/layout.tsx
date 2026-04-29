import type {Metadata} from 'next';
import './globals.css';
import { DashboardProvider } from '@/context/dashboard-context';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Kivo Gaming Hub',
  description: 'The ultimate gaming management platform for game clubs.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen gaming-gradient-bg">
        <DashboardProvider>
          {children}
          <Toaster />
        </DashboardProvider>
      </body>
    </html>
  );
}
