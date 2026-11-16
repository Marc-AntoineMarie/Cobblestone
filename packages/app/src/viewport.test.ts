import { describe, expect, it } from 'vitest';
import { isIos, viewportContent } from './viewport';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36';
const BASE = 'width=device-width, initial-scale=1.0, viewport-fit=cover';

describe('viewport', () => {
  it('recognises iPhone, and iPad presenting itself as a Mac with a touch screen', () => {
    expect(isIos(IPHONE, 5)).toBe(true);
    expect(isIos(IPAD, 5)).toBe(true);
    expect(isIos(IPAD, 0)).toBe(false);
    expect(isIos(ANDROID, 5)).toBe(false);
  });

  it('adds maximum-scale=1 on iOS only, once', () => {
    expect(viewportContent(BASE, IPHONE, 5)).toBe(`${BASE}, maximum-scale=1`);
    expect(viewportContent(`${BASE}, maximum-scale=3`, IPHONE, 5)).toBe(`${BASE}, maximum-scale=1`);
    expect(viewportContent(viewportContent(BASE, IPHONE, 5), IPHONE, 5)).toBe(`${BASE}, maximum-scale=1`);
    expect(viewportContent(BASE, ANDROID, 5)).toBe(BASE);
  });
});
