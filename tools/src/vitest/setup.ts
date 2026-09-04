/**
 * Shared Vitest setup. jsdom has no ResizeObserver; react-resizable-panels
 * constructs one at mount. A no-op stub is enough for render-level tests.
 */
class ResizeObserverStub {
  observe(): void {
    /* jsdom stub: nothing to measure */
  }
  unobserve(): void {
    /* jsdom stub */
  }
  disconnect(): void {
    /* jsdom stub */
  }
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
}

/**
 * jsdom implements neither pointer capture nor scrollIntoView; Radix menus call
 * all four on open and on item focus, and a missing method throws mid-render.
 * No-ops are enough: the tests assert roles, focus, and state, not scrolling.
 */
const proto = Element.prototype as unknown as Record<string, unknown>;
for (const method of ['scrollIntoView', 'hasPointerCapture', 'setPointerCapture', 'releasePointerCapture']) {
  if (typeof proto[method] !== 'function') {
    proto[method] = method === 'hasPointerCapture' ? () => false : () => undefined;
  }
}
