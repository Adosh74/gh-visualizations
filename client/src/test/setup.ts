import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

/*
 * Recharts sizes its ResponsiveContainer from a ResizeObserver and the
 * element's own box. jsdom reports 0×0 and never fires an observer, so without
 * this the charts render an empty container and every chart assertion fails on
 * a chart that is actually fine.
 */
const WIDTH = 640;
const HEIGHT = 320;

for (const [property, value] of [
  ['clientWidth', WIDTH],
  ['offsetWidth', WIDTH],
  ['clientHeight', HEIGHT],
  ['offsetHeight', HEIGHT],
] as const) {
  Object.defineProperty(globalThis.HTMLElement.prototype, property, {
    configurable: true,
    value,
  });
}

globalThis.Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
  return {
    width: WIDTH,
    height: HEIGHT,
    top: 0,
    left: 0,
    right: WIDTH,
    bottom: HEIGHT,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
};

globalThis.ResizeObserver = class ResizeObserver {
  constructor(private callback: ResizeObserverCallback) {}

  observe(target: Element) {
    // Report the size straight away — nothing else ever will under jsdom.
    this.callback(
      [{ target, contentRect: { width: WIDTH, height: HEIGHT } } as ResizeObserverEntry],
      this as unknown as globalThis.ResizeObserver,
    );
  }

  unobserve() {}
  disconnect() {}
};
