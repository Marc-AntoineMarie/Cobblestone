/**
 * iOS Safari zooms in when a field under 16 px takes focus or on a double tap, and keeps that zoom
 * from one screen to the next since the app never reloads. maximum-scale=1 stops those automatic
 * zooms; iOS still lets the user pinch to zoom. Other systems keep the viewport as it is, because
 * there maximum-scale would also forbid pinching.
 */
export function isIos(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  // iPadOS presents itself as a Mac, but a Mac has no touch screen.
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

/** The viewport content to use on this device: unchanged, or with maximum-scale=1 on iOS. */
export function viewportContent(content: string, userAgent: string, maxTouchPoints: number): string {
  if (!isIos(userAgent, maxTouchPoints)) return content;
  const parts = content
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && !/^maximum-scale\s*=/.test(p));
  return [...parts, 'maximum-scale=1'].join(', ');
}

/** Applies viewportContent to the page's viewport meta, if there is one. */
export function lockIosAutoZoom(doc: Document = document, nav: Navigator = navigator) {
  const meta = doc.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) return;
  meta.content = viewportContent(meta.content, nav.userAgent, nav.maxTouchPoints ?? 0);
}
