import type { Metadata } from 'next';
import { RoleSwitch } from '@/features/provider/RoleSwitch';
import { ProviderInventoryScreen } from '@/features/provider/ProviderInventoryScreen';

export const metadata: Metadata = {
  title: 'Inventory - DaanaRX',
  description: "Browse and manage all medications in your clinic's inventory.",
};

// Providers get the medication-level read-only screen; every other role
// falls through to the staff inventory page (owned by another lane).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <RoleSwitch provider={<ProviderInventoryScreen />}>{children}</RoleSwitch>;
}
