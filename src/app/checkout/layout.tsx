import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Check Out - DaanaRX',
  description: 'Search and dispense medications from your clinic\'s inventory.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
