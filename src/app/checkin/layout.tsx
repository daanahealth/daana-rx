import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Check In - DaanaRX',
  description: 'Add new medications to your clinic\'s inventory.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
