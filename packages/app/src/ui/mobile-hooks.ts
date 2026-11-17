import { useEffect, useRef, useState } from 'react';

/**
 * Long press on touch screens (iOS sends no contextmenu event), and right click elsewhere.
 * The click that ends a long press is swallowed.
 */
export function useLongPress(onLong: (point: { x: number; y: number }) => void, delay = 450) {
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const cancel = () => {
    window.clearTimeout(timer.current);
    start.current = null;
  };
  return {
    onPointerDown: (e: React.PointerEvent) => {
      fired.current = false;
      const point = { x: e.clientX, y: e.clientY };
      start.current = point;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        fired.current = true;
        start.current = null;
        onLong(point);
      }, delay);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = start.current;
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 10) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if (fired.current) return;
      cancel();
      fired.current = true;
      onLong({ x: e.clientX, y: e.clientY });
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (!fired.current) return;
      fired.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };
}

/**
 * Follows the part of the screen the keyboard leaves free (iOS shrinks the visual viewport, not the
 * page): sets --vvh, --vv-top and --keyboard on the root, and tells whether the keyboard is up.
 */
export function useVisualViewport(): boolean {
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const update = () => {
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--vvh', `${vv.height}px`);
      root.style.setProperty('--vv-top', `${vv.offsetTop}px`);
      root.style.setProperty('--keyboard', `${covered}px`);
      setKeyboard(covered > 120);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      root.style.removeProperty('--vvh');
      root.style.removeProperty('--vv-top');
      root.style.removeProperty('--keyboard');
    };
  }, []);
  return keyboard;
}

/** Installed on the home screen (no browser bar, so no browser back gesture). */
export function isStandalone(): boolean {
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true
  );
}
