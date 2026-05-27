import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Fantasy Empire',
  description: 'A fantasy RTS + RPG prototype with base building, villagers, fog of war, and real-time combat.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
