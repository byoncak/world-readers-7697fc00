import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock the equipped-frame hook so we can drive UserAvatar by animation_class.
vi.mock('@/hooks/useEquippedFrame', () => ({
  useEquippedFrame: vi.fn(),
  parseInlineStyle: () => ({}),
  invalidateFrameCache: () => {},
}));

// Stub sentinel components so we can assert on the rendered mapping without
// pulling in DOM heavy SVG/mixblend layers.
vi.mock('@/components/StarryNightBorder', () => ({
  default: ({ children, variantKey }: any) => (
    <div data-testid="frame-starry" data-variant={variantKey || ''}>{children}</div>
  ),
}));
vi.mock('@/components/ElectricBorder', () => ({
  default: ({ children, variantKey }: any) => (
    <div data-testid="frame-electric" data-variant={variantKey || ''}>{children}</div>
  ),
}));
vi.mock('@/components/ChromeBorder', () => ({
  default: ({ children }: any) => <div data-testid="frame-chrome">{children}</div>,
}));
vi.mock('@/components/HolographicBorder', () => ({
  default: ({ children }: any) => <div data-testid="frame-holo">{children}</div>,
}));
vi.mock('@/components/DarkMagicBorder', () => ({
  default: ({ children }: any) => <div data-testid="frame-dark-magic">{children}</div>,
}));

import UserAvatar from '@/components/UserAvatar';
import { useEquippedFrame } from '@/hooks/useEquippedFrame';

const renderAvatar = () =>
  render(
    <MemoryRouter>
      <UserAvatar userId="u1" avatarUrl={null} displayName="A" linkToProfile={false} />
    </MemoryRouter>,
  );

describe('UserAvatar frame mapping', () => {
  beforeEach(() => vi.clearAllMocks());

  const cases: Array<[string, string, string?]> = [
    ['animate-starry-twinkle', 'frame-starry', 'gold'],
    ['animate-electric-border', 'frame-electric', 'voltage'],
    ['animate-chrome-ring', 'frame-chrome'],
    ['animate-holographic-ring', 'frame-holo'],
    ['animate-dark-magic', 'frame-dark-magic'],
  ];

  for (const [animation_class, testid, variant] of cases) {
    it(`routes ${animation_class} to <${testid}>`, () => {
      (useEquippedFrame as any).mockReturnValue({
        border_style: '',
        animation_class,
        variant_key: variant,
      });
      const { getByTestId } = renderAvatar();
      const el = getByTestId(testid);
      expect(el).toBeInTheDocument();
      if (variant) expect(el.getAttribute('data-variant')).toBe(variant);
    });
  }

  it('renders no legendary frame when frame is null', () => {
    (useEquippedFrame as any).mockReturnValue(null);
    const { queryByTestId } = renderAvatar();
    expect(queryByTestId('frame-starry')).toBeNull();
    expect(queryByTestId('frame-electric')).toBeNull();
    expect(queryByTestId('frame-chrome')).toBeNull();
    expect(queryByTestId('frame-holo')).toBeNull();
    expect(queryByTestId('frame-dark-magic')).toBeNull();
  });
});
