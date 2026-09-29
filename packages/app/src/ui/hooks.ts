import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { StoreApi } from 'zustand/vanilla';
import type { Session } from '../session';

export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession outside of a vault');
  return session;
}

/** Subscribes to a slice of a vanilla zustand store. */
export function useStore<S, T>(store: StoreApi<S>, selector: (state: S) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

/**
 * A counter that increases whenever files or the link index change, so
 * components reading the vault re-render. Updates are batched per frame.
 */
export function useVaultRevision(): number {
  const session = useSession();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let frame = 0;
    const bump = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setRevision((r) => r + 1);
      });
    };
    const offs = [
      session.vault.on('create', bump),
      session.vault.on('delete', bump),
      session.vault.on('rename', bump),
      session.vault.cache.on('resolved', bump),
      session.vault.cache.on('changed', bump),
    ];
    return () => {
      cancelAnimationFrame(frame);
      offs.forEach((off) => off());
    };
  }, [session]);
  return revision;
}

/** Re-renders only when the given note changes. */
export function useNoteRevision(path: string | null): number {
  const session = useSession();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!path) return;
    const bump = () => setRevision((r) => r + 1);
    const offs = [
      session.vault.cache.on('changed', (p) => p === path && bump()),
      session.vault.cache.on('resolved', (sources) => bump()),
    ];
    return () => offs.forEach((off) => off());
  }, [session, path]);
  return revision;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    list.addEventListener('change', onChange);
    onChange();
    return () => list.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** Calls `handler` on clicks outside the returned ref's element. */
export function useOutsideClick<T extends HTMLElement>(handler: () => void, active = true) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!active) return;
    const onDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) handler();
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [handler, active]);
  return ref;
}
