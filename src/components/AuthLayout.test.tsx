import { describe, it, expect } from 'vitest';
import { buildAuthNext } from './AuthLayout';

describe('buildAuthNext', () => {
  it('preserves same-origin path and search', () => {
    expect(buildAuthNext('/c/abc/admin', '?tab=members')).toBe('/c/abc/admin?tab=members');
  });

  it('rejects protocol-relative paths', () => {
    expect(buildAuthNext('//evil.com', '')).toBe('/');
  });

  it('rejects non-absolute paths', () => {
    expect(buildAuthNext('evil', '')).toBe('/');
  });

  it('returns "/" for root', () => {
    expect(buildAuthNext('/', '')).toBe('/');
  });
});
