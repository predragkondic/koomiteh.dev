import type { Me } from '@/api/authApi';
import { isStaffRole } from '@/lib/userRole';

export type AppNavMode = 'frontend' | 'admin';

export type NavLabelNs = 'common' | 'admin';

export interface NavLinkItem {
  kind: 'link';
  key: string;
  labelKey: string;
  labelNs: NavLabelNs;
  to: string;
  isActive: (pathname: string) => boolean;
  /** Desktop sidebar only; omitted on mobile bottom nav. */
  children?: NavLinkItem[];
}

export interface NavLogoutItem {
  kind: 'logout';
  key: string;
  labelKey: string;
  labelNs: NavLabelNs;
}

export type NavItem = NavLinkItem | NavLogoutItem;

export function getAppNavMode(pathname: string): AppNavMode {
  return pathname.startsWith('/admin') ? 'admin' : 'frontend';
}

function matchPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function buildFrontendNavItems(user: Me | null | undefined): NavItem[] {
  const items: NavItem[] = [

  ];

    if (user && isStaffRole(user.role)) {
    items.push({
      kind: 'link',
      key: 'admin',
      labelKey: 'title',
      labelNs: 'admin',
      to: '/admin',
      isActive: (pathname) => matchPrefix(pathname, '/admin'),
    });
  }
  items.push(    {
      kind: 'link',
      key: 'posts',
      labelKey: 'nav.posts',
      labelNs: 'common',
      to: '/post',
      isActive: (pathname) => matchPrefix(pathname, '/post'),
    },);

  if (user) {
    items.push({
      kind: 'link',
      key: 'profile',
      labelKey: 'nav.profile',
      labelNs: 'common',
      to: '/me',
      isActive: (pathname) => pathname === '/me',
      children: [
        {
          kind: 'link',
          key: 'favorites',
          labelKey: 'nav.favorited',
          labelNs: 'common',
          to: '/me/favorites',
          isActive: (pathname) => matchPrefix(pathname, '/me/favorites'),
        },
        {
          kind: 'link',
          key: 'settings',
          labelKey: 'nav.settings',
          labelNs: 'common',
          to: '/me/settings',
          isActive: (pathname) => matchPrefix(pathname, '/me/settings'),
        },
      ],
    });
  }



  if (user) {
    items.push({
      kind: 'logout',
      key: 'logout',
      labelKey: 'auth.logout',
      labelNs: 'common',
    });
  }

  return items;
}

export function buildAdminNavItems(): NavItem[] {
  return [
    {
      kind: 'link',
      key: 'exit',
      labelKey: 'nav.exitToFrontend',
      labelNs: 'admin',
      to: '/post',
      isActive: () => false,
    },
    {
      kind: 'link',
      key: 'posts',
      labelKey: 'nav.posts',
      labelNs: 'admin',
      to: '/admin',
      isActive: (pathname) =>
        pathname === '/admin' ||
        (pathname.startsWith('/admin/') && !pathname.startsWith('/admin/users')),
    },
    {
      kind: 'link',
      key: 'users',
      labelKey: 'nav.users',
      labelNs: 'admin',
      to: '/admin/users',
      isActive: (pathname) => matchPrefix(pathname, '/admin/users'),
    },
  ];
}

/** Flat list for mobile bottom navigation (no submenu children). */
export function flattenNavItemsForMobile(items: NavItem[]): NavItem[] {
  const flat: NavItem[] = [];
  for (const item of items) {
    if (item.kind === 'logout') {
      flat.push(item);
    } else if (item.children?.length) {
      flat.push({ ...item, children: undefined });
    } else {
      flat.push(item);
    }
  }
  return flat;
}

export function buildNavItems(
  mode: AppNavMode,
  user: Me | null | undefined,
): NavItem[] {
  if (mode === 'admin' && user && isStaffRole(user.role)) {
    return buildAdminNavItems();
  }
  return buildFrontendNavItems(user);
}
