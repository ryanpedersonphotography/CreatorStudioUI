import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PanelGlyph } from './panel-glyph.js';
import type { RegionSide } from './studio-regions.js';

function segmentOf(side: RegionSide, filled = true) {
  const { container } = render(<PanelGlyph side={side} filled={filled} />);
  const svg = container.querySelector('svg')!;
  const segment = svg.querySelector<SVGRectElement>('[data-glyph="segment"]')!;
  const box = ['x', 'y', 'width', 'height'].map((a) => Number(segment.getAttribute(a)));
  return { svg, segment, box };
}

describe('PanelGlyph', () => {
  it('marks the segment on the edge it is given, a strip four units deep along a thirteen-unit frame', () => {
    expect(segmentOf('left').box).toEqual([1.5, 1.5, 4, 13]);
    expect(segmentOf('right').box).toEqual([10.5, 1.5, 4, 13]);
    expect(segmentOf('top').box).toEqual([1.5, 1.5, 13, 4]);
    expect(segmentOf('bottom').box).toEqual([1.5, 10.5, 13, 4]);
  });

  it('fills the segment in the current ink when shown and leaves it open when hidden; the frame stays on top', () => {
    const shown = segmentOf('left', true);
    expect(shown.segment.getAttribute('fill')).toBe('currentColor');
    expect(shown.svg.lastElementChild?.getAttribute('data-glyph')).toBe('frame');
    expect(segmentOf('left', false).segment.getAttribute('fill')).toBe('none');
  });

  it('is decoration: hidden from assistive tech and named by the side for tests and skins', () => {
    const { svg } = segmentOf('bottom');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('data-side')).toBe('bottom');
    expect(svg.getAttribute('data-filled')).toBe('true');
  });
});
