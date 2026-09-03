import { describe, expect, it } from 'vitest';
import { cockpitSizes } from './sizes.js';

describe('cockpitSizes', () => {
  it('every size carries a unit', () => {
    for (const value of Object.values(cockpitSizes)) {
      expect(value).toMatch(/^\d+(\.\d+)?(%|px)$/);
    }
  });
});
