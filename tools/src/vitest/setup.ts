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
