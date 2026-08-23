import { navItemsForRole, isNavActive } from '../navigation';

const hrefs = (role: string | undefined) => navItemsForRole(role).map((i) => i.href);

describe('navItemsForRole (Provider spec §4 role matrix)', () => {
  it('gives providers Home / Inventory / My Requests and nothing else', () => {
    expect(hrefs('provider')).toEqual(['/', '/inventory', '/requests']);
    expect(navItemsForRole('provider').map((i) => i.label)).toEqual([
      'Home',
      'Inventory',
      'My Requests',
    ]);
  });

  it('gives superadmins the queue with a badge, plus settings', () => {
    const items = navItemsForRole('superadmin');
    expect(items.map((i) => i.href)).toEqual([
      '/',
      '/checkin',
      '/checkout',
      '/inventory',
      '/reports',
      '/requests',
      '/settings',
    ]);
    expect(items.find((i) => i.href === '/requests')?.badge).toBe('pendingRequests');
  });

  it('gives admins settings but not the request queue', () => {
    expect(hrefs('admin')).toContain('/settings');
    expect(hrefs('admin')).not.toContain('/requests');
  });

  it('gives employees the operational pages only', () => {
    expect(hrefs('employee')).toEqual(['/', '/checkin', '/checkout', '/inventory', '/reports']);
  });

  it('treats an unknown/missing role as a non-provider without settings', () => {
    expect(hrefs(undefined)).toEqual(['/', '/checkin', '/checkout', '/inventory', '/reports']);
  });
});

describe('isNavActive', () => {
  it('matches home exactly and sections by prefix', () => {
    expect(isNavActive('/', '/')).toBe(true);
    expect(isNavActive('/', '/inventory')).toBe(false);
    expect(isNavActive('/inventory', '/inventory')).toBe(true);
    expect(isNavActive('/inventory', '/inventory/abc')).toBe(true);
    expect(isNavActive('/inventory', '/inventory-report')).toBe(false);
  });
});
