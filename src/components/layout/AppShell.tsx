'use client';

import { useCallback, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { logout } from '../../store/authSlice';
import { useAuth } from '../../hooks/useAuth';
import { ClinicSwitcher } from '../ClinicSwitcher';
import { AppInitializer } from '../AppInitializer';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NavBadge } from '@/components/composed/NavBadge';
import { navItemsForRole, isNavActive, type NavItem, type NavBadgeKey } from '@/lib/navigation';
import { isReadOnlyRole } from '@/lib/roles';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, LogOut, Menu, Loader2, ShoppingCart, User as UserIcon } from 'lucide-react';

/**
 * AppShell — sidebar (≥ md) / left sheet (< md), 56px top bar, content column.
 * Navigation is role-aware via src/lib/navigation.ts. Badge counts are passed
 * in by whoever owns the data (the request queue lane wires `pendingRequests`).
 */
interface AppShellProps {
  children: React.ReactNode;
  /** Live counts rendered as NavBadges, keyed by NavItem.badge. */
  badges?: Partial<Record<NavBadgeKey, number>>;
}

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-sm font-semibold text-primary-foreground',
        className
      )}
    >
      D
    </span>
  );
}

function BrandHeader() {
  return (
    <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
      <BrandMark />
      <span className="text-base font-semibold tracking-tight text-foreground">DaanaRX</span>
    </div>
  );
}

function NavLink({
  item,
  isActive,
  badge,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  badge?: number;
  onNavigate: (href: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.href)}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex h-9 w-full items-center gap-2.5 rounded-sm px-2.5 text-sm font-medium',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-card hover:text-foreground'
      )}
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1 text-left">{item.label}</span>
      {item.badge ? <NavBadge count={badge} label={`${item.label.toLowerCase()} pending`} /> : null}
    </button>
  );
}

function SidebarBody({
  navItems,
  pathname,
  badges,
  onNavigate,
}: {
  navItems: NavItem[];
  pathname: string;
  badges?: Partial<Record<NavBadgeKey, number>>;
  onNavigate: (href: string) => void;
}) {
  return (
    <ScrollArea className="flex-1 px-3 py-3">
      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={isNavActive(item.href, pathname)}
            badge={item.badge ? badges?.[item.badge] : undefined}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </ScrollArea>
  );
}

function UserAvatar({ username }: { username: string | undefined }) {
  const initials = (username || 'U').trim().slice(0, 2).toUpperCase();
  return (
    <Avatar className="h-7 w-7">
      <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

function roleLabel(role: string | undefined): string {
  switch (role) {
    case 'superadmin':
      return 'Superadmin';
    case 'admin':
      return 'Admin';
    case 'employee':
      return 'Employee';
    case 'provider':
      return 'Provider';
    default:
      return 'Member';
  }
}

function AccountMenu({
  username,
  role,
  align,
  side,
  showSettings,
  onAccount,
  onSettings,
  onLogout,
  trigger,
}: {
  username: string | undefined;
  role: string | undefined;
  align: 'start' | 'end';
  side?: 'top' | 'bottom';
  showSettings: boolean;
  onAccount: () => void;
  onSettings: () => void;
  onLogout: () => void;
  trigger: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-56 shadow-overlay">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">{username || 'User'}</span>
          <span className="text-xs font-normal text-muted-foreground">{roleLabel(role)}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onAccount}>
          <UserIcon className="h-4 w-4" /> My account
        </DropdownMenuItem>
        {showSettings ? (
          <DropdownMenuItem onSelect={onSettings}>
            <Settings className="h-4 w-4" /> Settings
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout} className="text-danger focus:text-danger">
          <LogOut className="h-4 w-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children, badges }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const cartItemCount = useSelector((state: RootState) => state.cart.items.length);
  const { isAuthenticated, hasHydrated } = useAuth();

  const handleLogout = useCallback(() => {
    dispatch(logout(undefined));
    router.push('/auth/signin');
  }, [dispatch, router]);

  const handleNavigation = useCallback(
    (href: string) => {
      router.push(href);
      setMobileOpen(false);
    },
    [router]
  );

  const handleAccount = useCallback(() => router.push('/account'), [router]);
  const handleSettings = useCallback(() => router.push('/settings'), [router]);
  const handleViewCart = useCallback(() => router.push('/cart'), [router]);

  const role = user?.userRole;
  const navItems = navItemsForRole(role);
  const isSuperadmin = role === 'superadmin';
  const showCart = !isReadOnlyRole(role);

  if (!hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const sidebarFooter = (
    <div className="border-t border-sidebar-border p-2">
      <AccountMenu
        username={user?.username}
        role={role}
        align="start"
        side="top"
        showSettings={isSuperadmin}
        onAccount={() => {
          setMobileOpen(false);
          handleAccount();
        }}
        onSettings={() => {
          setMobileOpen(false);
          handleSettings();
        }}
        onLogout={() => {
          setMobileOpen(false);
          handleLogout();
        }}
        trigger={
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left hover:bg-card"
          >
            <UserAvatar username={user?.username} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-foreground">
                {user?.username || 'User'}
              </span>
              <span className="truncate text-xs text-muted-foreground">{roleLabel(role)}</span>
            </span>
          </button>
        }
      />
    </div>
  );

  return (
    <AppInitializer>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
          <BrandHeader />
          <SidebarBody
            navItems={navItems}
            pathname={pathname}
            badges={badges}
            onNavigate={handleNavigation}
          />
          {sidebarFooter}
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-4 lg:px-6">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-sidebar p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex h-full flex-col">
                  <BrandHeader />
                  <SidebarBody
                    navItems={navItems}
                    pathname={pathname}
                    badges={badges}
                    onNavigate={handleNavigation}
                  />
                  {sidebarFooter}
                </div>
              </SheetContent>
            </Sheet>

            {/* Mobile wordmark */}
            <div className="flex items-center gap-2 md:hidden">
              <BrandMark />
              <span className="text-base font-semibold tracking-tight">DaanaRX</span>
            </div>

            <div className="hidden md:block">
              <ClinicSwitcher />
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              {showCart ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewCart}
                  className="relative gap-2"
                  aria-label={cartItemCount > 0 ? `View cart, ${cartItemCount} items` : 'View cart'}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden sm:inline">Cart</span>
                  <NavBadge count={cartItemCount} label="items in cart" tone="primary" />
                </Button>
              ) : null}

              <AccountMenu
                username={user?.username}
                role={role}
                align="end"
                showSettings={isSuperadmin}
                onAccount={handleAccount}
                onSettings={handleSettings}
                onLogout={handleLogout}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open account menu"
                    className="rounded-full"
                  >
                    <UserAvatar username={user?.username} />
                  </Button>
                }
              />
            </div>
          </header>

          {/* Mobile clinic switcher row */}
          <div className="border-b border-border bg-card px-3 py-1.5 md:hidden">
            <ClinicSwitcher />
          </div>

          <main className="flex-1 overflow-auto">
            <div className="container-responsive pb-24 pt-5 sm:pt-6 lg:pt-8">{children}</div>
          </main>
        </div>
      </div>
    </AppInitializer>
  );
}
