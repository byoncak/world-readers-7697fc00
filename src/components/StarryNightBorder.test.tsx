import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import StarryNightBorder from './StarryNightBorder';

/**
 * Guards for the Starry Night fixes:
 *  - Variant color plumbing (indigo/rose/emerald/gold) reaches star / glint / speckle fills.
 *  - Constellation layout is stable across rerenders of the same instance.
 *  - Two independently-mounted instances receive DIFFERENT layouts (per-mount seed).
 *  - `sm` renders fewer, boldened stars and no secondary/speckle noise.
 */

const paletteHexByVariant: Record<string, string[]> = {
  // Primary star fills we expect to see per palette (from VARIANT_PALETTES).
  indigo: ['#eef2ff', '#c7d2fe'],
  rose:   ['#fff1f2', '#fda4af'],
  emerald:['#ecfdf5', '#6ee7b7'],
  gold:   ['#fffbeb', '#fcd34d'],
};

const collectFills = (root: HTMLElement) =>
  Array.from(root.querySelectorAll('[fill]'))
    .map((n) => (n.getAttribute('fill') || '').toLowerCase())
    .filter(Boolean);

describe('StarryNightBorder — variant color plumbing (large / profile avatar)', () => {
  for (const [variant, expected] of Object.entries(paletteHexByVariant)) {
    it(`variant "${variant}" paints stars from its palette at lg`, () => {
      const { container } = render(
        <StarryNightBorder size="lg" variantKey={variant}>
          <div />
        </StarryNightBorder>,
      );
      const fills = collectFills(container);
      for (const hex of expected) {
        expect(fills).toContain(hex.toLowerCase());
      }
      // Cross-variant leakage: indigo star fills must NOT appear on non-indigo variants.
      if (variant !== 'indigo') {
        expect(fills).not.toContain('#eef2ff');
        expect(fills).not.toContain('#c7d2fe');
      }
    });
  }
});

describe('StarryNightBorder — constellation seeding', () => {
  const snapshot = (root: HTMLElement) =>
    Array.from(root.querySelectorAll('circle,ellipse'))
      .map((n) => `${n.tagName}:${n.getAttribute('cx') ?? ''},${n.getAttribute('cy') ?? ''},${n.getAttribute('r') ?? n.getAttribute('rx') ?? ''}`)
      .join('|');

  it('is stable across rerenders of the same instance', () => {
    const { container, rerender } = render(
      <StarryNightBorder size="lg" variantKey="rose">
        <div />
      </StarryNightBorder>,
    );
    const before = snapshot(container);
    rerender(
      <StarryNightBorder size="lg" variantKey="rose">
        <div />
      </StarryNightBorder>,
    );
    const after = snapshot(container);
    expect(after).toBe(before);
  });

  it('two independently-mounted instances differ', () => {
    const a = render(
      <StarryNightBorder size="lg" variantKey="indigo">
        <div />
      </StarryNightBorder>,
    );
    const b = render(
      <StarryNightBorder size="lg" variantKey="indigo">
        <div />
      </StarryNightBorder>,
    );
    // Compare only <g class="starry-twinkle"> nodes so speckle ordering doesn't dominate.
    const layoutOf = (root: HTMLElement) =>
      Array.from(root.querySelectorAll('g.starry-twinkle circle'))
        .map((n) => `${n.getAttribute('cx')},${n.getAttribute('cy')},${n.getAttribute('r')}`)
        .join('|');
    expect(layoutOf(a.container)).not.toEqual('');
    expect(layoutOf(b.container)).not.toEqual('');
    expect(layoutOf(a.container)).not.toEqual(layoutOf(b.container));
  });
});

describe('StarryNightBorder — small size curation', () => {
  it('sm renders no secondary/speckle groups', () => {
    const { container } = render(
      <StarryNightBorder size="sm" variantKey="gold">
        <div />
      </StarryNightBorder>,
    );
    // Secondary stars use the .starry-twinkle-soft class; sm should have none.
    expect(container.querySelectorAll('.starry-twinkle-soft').length).toBe(0);
    // Speckle group opens at opacity 0.6 — none at sm.
    expect(container.querySelectorAll('g[opacity="0.6"]').length).toBe(0);
    // Still has the primary twinkle group.
    expect(container.querySelectorAll('.starry-twinkle').length).toBeGreaterThan(0);
  });

  it('preview mode drops secondary/speckles at md', () => {
    const { container } = render(
      <StarryNightBorder size="md" variantKey="emerald" preview>
        <div />
      </StarryNightBorder>,
    );
    expect(container.querySelectorAll('.starry-twinkle-soft').length).toBe(0);
  });
});
