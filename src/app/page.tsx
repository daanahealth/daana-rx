import type { Metadata } from 'next';
import { HomeClient } from '@/components/home/HomeClient';
import { RoleSwitch } from '@/features/provider/RoleSwitch';
import { ProviderHomeScreen } from '@/features/provider/ProviderHomeScreen';

export const metadata: Metadata = {
  title: 'DaanaRX',
  description: "FEFO-powered medication search across your clinic's active inventory.",
};

export default function Page() {
  return (
    <RoleSwitch provider={<ProviderHomeScreen />}>
      <HomeClient />
    </RoleSwitch>
  );
}
