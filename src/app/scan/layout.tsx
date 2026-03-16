import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scan - DaanaRX',
  description: 'Quickly look up medications by scanning their QR code.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
