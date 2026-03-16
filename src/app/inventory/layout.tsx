import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inventory - DaanaRX',
  description: 'Browse and manage all medications in your clinic\'s inventory.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
