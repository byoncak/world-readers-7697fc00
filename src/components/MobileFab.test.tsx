import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MobileFab from './MobileFab';

describe('MobileFab', () => {
  it('portals outside transformed or clipped ancestors so fixed positioning uses the viewport', () => {
    const { container } = render(
      <div className="overflow-hidden animate-page-in" style={{ transform: 'translateY(10px)' }}>
        <MobileFab label="Add item">+</MobileFab>
      </div>,
    );

    const fab = screen.getByRole('button', { name: 'Add item' });

    expect(fab).toHaveClass('mobile-fab');
    expect(fab.parentElement).toBe(document.body);
    expect(container).not.toContainElement(fab);
  });

  it('does not render when hidden', () => {
    render(
      <MobileFab label="Add item" hidden>
        +
      </MobileFab>,
    );

    expect(screen.queryByRole('button', { name: 'Add item' })).not.toBeInTheDocument();
  });
});