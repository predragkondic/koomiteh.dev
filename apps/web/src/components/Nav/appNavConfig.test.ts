import { describe, expect, it } from 'vitest';
import type { Me } from '@/api/authApi';
import {
  buildAdminNavItems,
  buildFrontendNavItems,
  buildNavItems,
  flattenNavItemsForMobile,
  getAppNavMode,
} from './appNavConfig';

const USER: Me = {
  id: 'u1',
  githubLogin: 'alice',
  displayName: 'Alice',
  avatarUrl: null,
  role: 'user',
};

const ADMIN: Me = {
  ...USER,
  id: 'u2',
  githubLogin: 'root',
  displayName: 'Root',
  role: 'admin',
};

const SUPERADMIN: Me = {
  ...ADMIN,
  role: 'superadmin',
};

describe('getAppNavMode', () => {
  it('returns admin under /admin', () => {
    expect(getAppNavMode('/admin')).toBe('admin');
    expect(getAppNavMode('/admin/users')).toBe('admin');
  });

  it('returns frontend elsewhere', () => {
    expect(getAppNavMode('/post')).toBe('frontend');
    expect(getAppNavMode('/me/favorites')).toBe('frontend');
  });
});

describe('buildFrontendNavItems', () => {
  it('includes only Posts when anonymous', () => {
    const keys = buildFrontendNavItems(null).map((i) => i.key);
    expect(keys).toEqual(['posts']);
  });

  it('includes Profile submenu and Logout when signed in', () => {
    const items = buildFrontendNavItems(USER);
    const keys = items.map((i) => i.key);
    expect(keys).toEqual(['posts', 'profile', 'logout']);
    const profile = items.find((i) => i.key === 'profile');
    expect(profile?.kind).toBe('link');
    if (profile?.kind === 'link') {
      expect(profile.children?.map((c) => c.key)).toEqual([
        'favorites',
        'settings',
      ]);
      expect(profile.isActive('/me')).toBe(true);
      expect(profile.isActive('/me/settings')).toBe(false);
      expect(profile.isActive('/me/favorites')).toBe(false);
    }
  });

  it('includes Admin for admin and superadmin', () => {
    expect(
      buildFrontendNavItems(ADMIN).map((i) => i.key),
    ).toContain('admin');
    expect(
      buildFrontendNavItems(SUPERADMIN).map((i) => i.key),
    ).toContain('admin');
  });
});

describe('buildAdminNavItems', () => {
  it('lists Posts, Users, and exit to frontend', () => {
    const items = buildAdminNavItems();
    expect(items.map((i) => i.key)).toEqual(['exit', 'posts', 'users']);
    const exit = items.find((i) => i.key === 'exit');
    expect(exit?.kind).toBe('link');
    if (exit?.kind === 'link') expect(exit.to).toBe('/post');
  });
});

describe('buildNavItems', () => {
  it('falls back to frontend nav for non-staff users on /admin paths', () => {
    const keys = buildNavItems('admin', USER).map((i) => i.key);
    expect(keys).not.toContain('users');
    expect(keys).not.toContain('exit');
  });

  it('falls back to frontend nav for anonymous visitors on /admin paths', () => {
    const keys = buildNavItems('admin', null).map((i) => i.key);
    expect(keys).not.toContain('users');
    expect(keys).not.toContain('exit');
  });

  it('returns admin nav for staff in admin mode', () => {
    expect(buildNavItems('admin', ADMIN).map((i) => i.key)).toEqual([
      'exit',
      'posts',
      'users',
    ]);
  });
});

describe('flattenNavItemsForMobile', () => {
  it('drops profile submenu children', () => {
    const flat = flattenNavItemsForMobile(buildFrontendNavItems(USER));
    const profile = flat.find((i) => i.key === 'profile');
    expect(profile?.kind).toBe('link');
    if (profile?.kind === 'link') expect(profile.children).toBeUndefined();
  });
});
