import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useOutsideClick, useSession, useStore } from './hooks';

export function ContextMenu() {
  const session = useSession();
  const menu = useStore(session.ui, (s) => s.menu);
  const close = () => session.ui.setState({ menu: null });
  const ref = useOutsideClick<HTMLDivElement>(close, !!menu);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [focus, setFocus] = useState(0);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  // Keep the menu on screen.
  useLayoutEffect(() => {
    if (!menu || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPosition({
      x: Math.max(8, Math.min(menu.x, window.innerWidth - rect.width - 8)),
      y: Math.max(8, Math.min(menu.y, window.innerHeight - rect.height - 8)),
    });
    setFocus(0);
  }, [menu, ref]);

  useEffect(() => {
    if (menu) items.current[focus]?.focus();
  }, [menu, focus]);

  if (!menu) return null;
  return (
    <div
      ref={ref}
      className="menu"
      role="menu"
      style={{ left: position.x, top: position.y }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowDown') setFocus((i) => (i + 1) % menu.items.length);
        else if (e.key === 'ArrowUp') setFocus((i) => (i - 1 + menu.items.length) % menu.items.length);
        else return;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {menu.items.map((item, i) => (
        <div key={i} role="none">
          {item.separatorBefore && <hr />}
          <button
            ref={(el) => {
              items.current[i] = el;
            }}
            role="menuitem"
            className={`menu-item${item.danger ? ' is-danger' : ''}`}
            onClick={() => {
              close();
              item.run();
            }}
          >
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}
