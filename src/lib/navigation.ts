/**
 * Role-aware navigation model. Pure data so the shell and tests share it.
 *
 * Roles (mirrors the backend): superadmin (full), admin, employee (cart +
 * approval), provider (read-only + request). Providers never see check-in,
 * reports, or settings; superadmins get the request queue.
 */
import {
  Home,
  PackageCheck,
  PackageMinus,
  Package,
  FileText,
  Settings,
  Inbox,
  ClipboardList,
} from 'lucide-react';
import { isReadOnlyRole } from './roles';

export type NavBadgeKey = 'pendingRequests';

export interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  /** Which live count (if any) renders as a badge on this item. */
  badge?: NavBadgeKey;
}

export function navItemsForRole(role: string | null | undefined): NavItem[] {
  if (isReadOnlyRole(role)) {
    return [
      { icon: Home, label: 'Home', href: '/' },
      { icon: Package, label: 'Inventory', href: '/inventory' },
      { icon: ClipboardList, label: 'My Requests', href: '/requests' },
    ];
  }

  const items: NavItem[] = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: PackageCheck, label: 'Check In', href: '/checkin' },
    { icon: PackageMinus, label: 'Check Out', href: '/checkout' },
    { icon: Package, label: 'Inventory', href: '/inventory' },
    { icon: FileText, label: 'Reports', href: '/reports' },
  ];

  if (role === 'superadmin') {
    items.push({ icon: Inbox, label: 'Requests', href: '/requests', badge: 'pendingRequests' });
  }
  if (role === 'admin' || role === 'superadmin') {
    items.push({ icon: Settings, label: 'Settings', href: '/settings' });
  }
  return items;
}

export function isNavActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
