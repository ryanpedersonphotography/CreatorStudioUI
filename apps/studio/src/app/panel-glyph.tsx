import { useId } from 'react';
import type { RegionSide } from './studio-regions.js';

export interface PanelGlyphProps {
  /** The edge of the cockpit the region sits on. */
  side: RegionSide;
  /** True while the region is shown: the segment is filled; hidden leaves it outlined. */
  filled: boolean;
  className?: string;
}

/*
 * The 16-unit glyph the View menu and, later, the shelf's toggles share: the
 * cockpit's rounded outline with one edge marked as a strip four units deep.
 * All geometry is in the SVG's own units and the box is a spacing class, so
 * nothing here names a pixel. The segment is drawn first and clipped to the frame's
 * rounding, the divider next, the frame last so its stroke is never covered.
 */
const FRAME = { x: 1.5, y: 1.5, size: 13, radius: 2 } as const;
const DEPTH = 4;
const STROKE = 1.5;

function segmentBox(side: RegionSide) {
  const { x, y, size } = FRAME;
  switch (side) {
    case 'left':
      return { x, y, width: DEPTH, height: size };
    case 'right':
      return { x: x + size - DEPTH, y, width: DEPTH, height: size };
    case 'top':
      return { x, y, width: size, height: DEPTH };
    case 'bottom':
      return { x, y: y + size - DEPTH, width: size, height: DEPTH };
  }
}

function divider(side: RegionSide) {
  const { x, y, size } = FRAME;
  switch (side) {
    case 'left':
      return { x1: x + DEPTH, y1: y, x2: x + DEPTH, y2: y + size };
    case 'right':
      return { x1: x + size - DEPTH, y1: y, x2: x + size - DEPTH, y2: y + size };
    case 'top':
      return { x1: x, y1: y + DEPTH, x2: x + size, y2: y + DEPTH };
    case 'bottom':
      return { x1: x, y1: y + size - DEPTH, x2: x + size, y2: y + size - DEPTH };
  }
}

/** The panel glyph: the cockpit's outline with the region's edge marked, filled while the region is shown. */
export function PanelGlyph({ side, filled, className }: PanelGlyphProps) {
  const clip = useId();
  return (
    <svg
      data-glyph="panel"
      data-side={side}
      data-filled={filled}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      className={['size-4', className].filter(Boolean).join(' ')}
    >
      <defs>
        <clipPath id={clip}>
          <rect x={FRAME.x} y={FRAME.y} width={FRAME.size} height={FRAME.size} rx={FRAME.radius} />
        </clipPath>
      </defs>
      <rect data-glyph="segment" {...segmentBox(side)} fill={filled ? 'currentColor' : 'none'} clipPath={`url(#${clip})`} />
      <line {...divider(side)} stroke="currentColor" strokeWidth={STROKE} />
      <rect data-glyph="frame" x={FRAME.x} y={FRAME.y} width={FRAME.size} height={FRAME.size} rx={FRAME.radius} fill="none" stroke="currentColor" strokeWidth={STROKE} />
    </svg>
  );
}
