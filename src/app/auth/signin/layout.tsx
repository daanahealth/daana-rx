import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - DaanaRX',
  description: 'Sign in to your DaanaRX account to manage clinic medication inventory.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
