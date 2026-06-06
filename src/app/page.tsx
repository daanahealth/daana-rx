import type { Metadata } from 'next';
import { HomeClient } from '@/components/home/HomeClient';

export const metadata: Metadata = {
  title: 'DaanaRX',
  description:
    "FEFO-powered medication search across your clinic's active inventory.",
};

export default function Page() {
  return <HomeClient />;
}
