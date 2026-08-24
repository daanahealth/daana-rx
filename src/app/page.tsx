import type { Metadata } from 'next';
import { HomeScreen } from '@/features/home/HomeScreen';

export const metadata: Metadata = {
  title: 'DaanaRX',
  description: "FEFO-powered medication search across your clinic's active inventory.",
};

export default function Page() {
  return <HomeScreen />;
}
