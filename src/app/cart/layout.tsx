import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cart - DaanaRX',
  description: 'Review and complete your medication checkout.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
