import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './app.js';

describe('App', () => {
  it('renders the three cockpit regions', () => {
    render(<App />);
    for (const name of ['Navigation', 'Manuscript', 'Inspector']) {
      expect(screen.getByRole('region', { name })).toBeTruthy();
    }
  });
});
