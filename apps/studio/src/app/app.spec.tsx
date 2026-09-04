import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './app.js';

describe('App', () => {
  it('renders the five cockpit regions as landmarks, the top shelf included', () => {
    render(<App />);
    for (const name of ['Top shelf', 'Navigation', 'Manuscript', 'Context shelf', 'Inspector']) {
      expect(screen.getByRole('region', { name })).toBeTruthy();
    }
    expect(document.getElementById('top')?.contains(screen.getByRole('region', { name: 'Top shelf' }))).toBe(true);
  });

  it('gives the top shelf a pressed button per collapsible region, the shelf included, named by its visible text', () => {
    render(<App />);
    for (const name of ['Top shelf', 'Navigation', 'Context shelf', 'Inspector']) {
      const button = screen.getByRole('button', { name });
      expect(button.textContent).toBe(name);
      expect(button.getAttribute('aria-pressed')).toBe('true');
    }
  });

  it('names every operable separator and leaves the static shelf edge nameless', () => {
    render(<App />);
    const separators = screen.getAllByRole('separator');
    const operable = separators.filter((s) => s.hasAttribute('tabindex'));
    expect(operable.map((s) => s.getAttribute('aria-label')).sort()).toEqual([
      'Resize context shelf',
      'Resize inspector',
      'Resize navigation',
    ]);
    const stationary = separators.filter((s) => !s.hasAttribute('tabindex'));
    expect(stationary).toHaveLength(1);
    expect(stationary[0].getAttribute('aria-label')).toBeNull();
  });
});
