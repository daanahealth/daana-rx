import type { Metadata } from 'next';
import HomeClient from './home-client';

export const metadata: Metadata = {
  title: 'Dashboard - DaanaRX',
  description: 'Overview of your clinic\'s medication inventory.',
};

export default function Page() {
  return <HomeClient />;
}
