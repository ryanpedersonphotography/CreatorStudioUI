import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './app.js';

describe('App', () => {
  it('renders the five cockpit regions', () => {
    render(<App />);
    for (const name of ['Navigation', 'Manuscript', 'Context', 'Inspector']) {
      expect(screen.getByRole('region', { name })).toBeTruthy();
    }
    expect(screen.getByRole('toolbar', { name: 'Studio toolbar' })).toBeTruthy();
  });

  it('gives the toolbar a toggle per hideable region, all shown at first', () => {
    render(<App />);
    for (const label of ['navigation', 'context shelf', 'inspector']) {
      expect(screen.getByRole('button', { name: `Toggle ${label}` }).getAttribute('aria-pressed')).toBe('true');
    }
  });

  it('names every separator so assistive tech can tell them apart', () => {
    render(<App />);
    expect(screen.getAllByRole('separator').map((s) => s.getAttribute('aria-label')).sort()).toEqual([
      'Resize context shelf',
      'Resize inspector',
      'Resize navigation',
    ]);
  });
});
