"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { logout } from "../../store/authSlice";
import { useAuth } from "../../hooks/useAuth";
import { ClinicSwitcher } from "../ClinicSwitcher";
import { AppInitializer } from "../AppInitializer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  PackageCheck,
  PackageMinus,
  Package,
  FileText,
  Settings,
  LogOut,
  Menu,
  Loader2,
  ShoppingCart,
  User as UserIcon,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

function NavLink({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate: (href: string) => void;
}) {
  const handleClick = useCallback(() => {
    onNavigate(item.href);
  }, [item.href, onNavigate]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium",
        "transition-all duration-200 ease-out",
        isActive
          ? "bg-primary text-primary-foreground shadow-soft"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {isActive && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary-foreground/70"
        />
      )}
      <item.icon
        className={cn(
          "h-5 w-5 transition-transform duration-200",
          isActive ? "scale-105" : "group-hover:scale-110"
        )}
      />
      <span className="flex-1 text-left">{item.label}</span>
    </button>
  );
}

function SidebarBody({
  navItems,
  pathname,
  onNavigate,
}: {
  navItems: NavItem[];
  pathname: string;
  onNavigate: (href: string) => void;
}) {
  return (
    <ScrollArea className="flex-1 px-4 py-4">
      <div className="space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/")
            }
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

function BrandHeader() {
  return (
    <div className="flex h-16 items-center border-b border-border/60 px-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
          <span className="text-base font-bold">D</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight">
            DaanaRX
          </span>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Medication tracking
          </span>
        </div>
      </div>
    </div>
  );
}

function UserAvatar({ username }: { username: string | undefined }) {
  const initials = (username || "U").trim().slice(0, 2).toUpperCase();
  return (
    <Avatar className="h-8 w-8">
      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

function SidebarFooter({
  username,
  role,
  onAccount,
  onLogout,
}: {
  username: string | undefined;
  role: string | undefined;
  onAccount: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="mt-auto border-t border-border/60 p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left",
              "transition-colors duration-200 hover:bg-accent/60"
            )}
          >
            <UserAvatar username={username} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">
                {username || "User"}
              </span>
              <span className="truncate text-xs capitalize text-muted-foreground">
                {role || "member"}
              </span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">{username || "User"}</span>
            <span className="text-xs font-normal capitalize text-muted-foreground">
              {role || "member"}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onAccount}>
            <UserIcon className="h-4 w-4" /> My account
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onLogout} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const cartItemCount = useSelector(
    (state: RootState) => state.cart.items.length
  );
  const { isAuthenticated, hasHydrated } = useAuth();

  const handleLogout = useCallback(() => {
    dispatch(logout(undefined));
    router.push("/auth/signin");
  }, [dispatch, router]);

  const handleNavigation = useCallback(
    (href: string) => {
      router.push(href);
      setMobileOpen(false);
    },
    [router]
  );

  const handleAccount = useCallback(() => {
    router.push("/account");
  }, [router]);

  const handleViewCart = useCallback(() => {
    router.push("/cart");
  }, [router]);

  // Spec order: Home, Check In, Check Out, Inventory, Reports, Settings.
  // Settings is only shown to admins/superadmins.
  const navItems: NavItem[] = useMemo(() => {
    const base: NavItem[] = [
      { icon: Home, label: "Home", href: "/" },
      { icon: PackageCheck, label: "Check In", href: "/checkin" },
      { icon: PackageMinus, label: "Check Out", href: "/checkout" },
      { icon: Package, label: "Inventory", href: "/inventory" },
      { icon: FileText, label: "Reports", href: "/reports" },
    ];

    if (user?.userRole === "admin" || user?.userRole === "superadmin") {
      base.push({ icon: Settings, label: "Settings", href: "/settings" });
    }

    return base;
  }, [user?.userRole]);

  if (!hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const isSuperadmin = user?.userRole === "superadmin";

  return (
    <AppInitializer>
      <div className="flex h-screen overflow-hidden bg-muted/30 antialiased">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden w-64 shrink-0 flex-col border-r border-border/60",
            "bg-card/70 backdrop-blur-xl",
            "md:flex"
          )}
        >
          <BrandHeader />
          <SidebarBody
            navItems={navItems}
            pathname={pathname}
            onNavigate={handleNavigation}
          />
          <SidebarFooter
            username={user?.username}
            role={user?.userRole}
            onAccount={handleAccount}
            onLogout={handleLogout}
          />
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Liquid-glass header */}
          <header
            className={cn(
              "sticky top-0 z-40 flex h-16 items-center gap-3 px-4 lg:px-6",
              "border-b border-border/50",
              "bg-background/60 backdrop-blur-xl backdrop-saturate-150",
              "shadow-soft"
            )}
          >
            {/* Mobile menu trigger */}
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
              <SheetContent
                side="left"
                className="w-72 p-0 bg-card/95 backdrop-blur-xl"
              >
                <div className="flex h-full flex-col">
                  <BrandHeader />
                  <SidebarBody
                    navItems={navItems}
                    pathname={pathname}
                    onNavigate={handleNavigation}
                  />
                  <SidebarFooter
                    username={user?.username}
                    role={user?.userRole}
                    onAccount={() => {
                      setMobileOpen(false);
                      handleAccount();
                    }}
                    onLogout={() => {
                      setMobileOpen(false);
                      handleLogout();
                    }}
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Mobile wordmark */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
                <span className="text-sm font-bold">D</span>
              </div>
              <span className="text-base font-semibold">DaanaRX</span>
            </div>

            <div className="hidden md:block">
              <ClinicSwitcher />
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* View Cart */}
              <Button
                variant="outline"
                onClick={handleViewCart}
                className="relative gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">View Cart</span>
                {cartItemCount > 0 && (
                  <span
                    className={cn(
                      "absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center",
                      "rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-soft"
                    )}
                    aria-label={`${cartItemCount} items in cart`}
                  >
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                )}
              </Button>

              {/* Account dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open account menu"
                    className="rounded-full"
                  >
                    <UserAvatar username={user?.username} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">
                      {user?.username || "User"}
                    </span>
                    <span className="text-xs font-normal capitalize text-muted-foreground">
                      {user?.userRole || "member"}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleAccount}>
                    <UserIcon className="h-4 w-4" /> My account
                  </DropdownMenuItem>
                  {isSuperadmin && (
                    <DropdownMenuItem
                      onSelect={() => router.push("/settings")}
                    >
                      <Settings className="h-4 w-4" /> Settings
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={handleLogout}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Mobile clinic switcher row (compact, below header) */}
          <div className="md:hidden border-b border-border/40 bg-background/40 px-4 py-2 backdrop-blur">
            <ClinicSwitcher />
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-auto bg-background">
            <div className="container-responsive pb-24 pt-6 sm:pt-8 lg:pt-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AppInitializer>
  );
}
