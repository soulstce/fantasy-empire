import type { ReactNode } from 'react';
import '../globals.css';
import { AppProviders } from '@/components/providers';

export const metadata = {
  title: 'Fantasy Empire Field Tool',
  description: 'A fantasy RTS + RPG field command interface with base building, fog of war, and real-time combat.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
