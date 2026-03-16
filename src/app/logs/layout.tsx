import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Logs - DaanaRX',
  description: 'View transaction history and audit logs for your clinic\'s inventory.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
