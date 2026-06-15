import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Nav from '@/components/nav';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: 'WC2026 Picks',
  description: 'World Cup 2026 prediction game — pick scores, earn points, win glory.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <Nav />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">{children}</main>
        <footer className="text-center text-xs text-muted-foreground py-4">
          WC2026 Picks · Built for the beautiful game
        </footer>
      </body>
    </html>
  );
}
