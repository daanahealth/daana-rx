import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reports - DaanaRX',
  description: 'View analytics and reports for your clinic\'s medication inventory.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
