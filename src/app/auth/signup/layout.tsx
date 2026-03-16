import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - DaanaRX',
  description: 'Create a DaanaRX account to start tracking your clinic\'s medication inventory.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
