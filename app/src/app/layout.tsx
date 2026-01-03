import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Agente Administrativo 2025',
  description: 'Portal de Gestão Administrativa Moderno - Transformando a administração predial com design 2025',
  keywords: ['admin', 'gestão', 'condomínio', 'dashboard', 'moderno', '2025'],
  authors: [{ name: 'Agente Administrativo' }],
  creator: 'Agente Administrativo',
  publisher: 'Agente Administrativo',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    title: 'Agente Administrativo 2025',
    description: 'Portal de Gestão Administrativa Moderno',
    siteName: 'Agente Administrativo',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased overflow-x-hidden',
          inter.variable
        )}
        suppressHydrationWarning={true}
      >
        <ThemeProvider
          defaultTheme="system"
          storageKey="agente-admin-theme"
          enableSystem
        >
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
