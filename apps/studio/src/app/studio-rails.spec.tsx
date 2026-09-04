import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Cockpit, type PanelToggle } from '@creator-studio/shell';
import { Rail, Strip } from './studio-rails.js';

function fakeToggle(): PanelToggle {
  return { collapsed: true, collapse: vi.fn(() => false), expand: vi.fn(() => true), toggle: vi.fn(() => true), panelProps: {} };
}

describe('rails and strips', () => {
  it('a rail expands its own region through a button named for it', () => {
    const nav = fakeToggle();
    render(
      <Cockpit.Regions regions={{ nav }}>
        <Rail region="nav" title="Navigation" />
      </Cockpit.Regions>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Expand navigation' }));
    expect(nav.expand).toHaveBeenCalledTimes(1);
    expect(nav.collapse).not.toHaveBeenCalled();
  });

  it('a strip does the same for a shelf', () => {
    const top = fakeToggle();
    render(
      <Cockpit.Regions regions={{ top }}>
        <Strip region="top" title="Top shelf" />
      </Cockpit.Regions>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Expand top shelf' }));
    expect(top.expand).toHaveBeenCalledTimes(1);
  });
});
