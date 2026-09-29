/** Keyboard shortcut; `mod` is Cmd on macOS and Ctrl elsewhere. */
export interface Hotkey {
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** `KeyboardEvent.key`, lowercase for letters ("p", "enter", "arrowleft", ","). */
  key: string;
}

export interface Command {
  id: string;
  name: string;
  /** Grouping shown in the command palette ("Note", "Navigation"...). */
  section?: string;
  hotkeys?: Hotkey[];
  /** Hidden from the palette and inactive when it returns false. */
  when?: () => boolean;
  run: () => void | Promise<void>;
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** "Mod+Shift+P" -> Hotkey */
export function parseHotkey(spec: string): Hotkey {
  const parts = spec.split('+').map((p) => p.trim());
  const key = parts.pop()!.toLowerCase();
  const mods = new Set(parts.map((p) => p.toLowerCase()));
  return { key, mod: mods.has('mod'), shift: mods.has('shift'), alt: mods.has('alt') };
}

export function hotkeyLabel(hotkey: Hotkey): string {
  const names: Record<string, string> = {
    arrowleft: '←',
    arrowright: '→',
    arrowup: '↑',
    arrowdown: '↓',
    enter: '↵',
    escape: 'Esc',
    backspace: '⌫',
    ' ': 'Space',
  };
  const key = names[hotkey.key] ?? (hotkey.key.length === 1 ? hotkey.key.toUpperCase() : hotkey.key);
  const parts: string[] = [];
  if (hotkey.mod) parts.push(isMac ? '⌘' : 'Ctrl');
  if (hotkey.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (hotkey.shift) parts.push(isMac ? '⇧' : 'Shift');
  parts.push(key);
  return isMac ? parts.join('') : parts.join('+');
}

export function matchesHotkey(event: KeyboardEvent, hotkey: Hotkey): boolean {
  const mod = isMac ? event.metaKey : event.ctrlKey;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
  // With Shift, some layouts change the key ("," -> "<"); compare the physical key for letters and digits too.
  const code = event.code.startsWith('Key') ? event.code.slice(3).toLowerCase() : event.code.startsWith('Digit') ? event.code.slice(5) : null;
  return (
    !!hotkey.mod === mod &&
    !!hotkey.shift === event.shiftKey &&
    !!hotkey.alt === event.altKey &&
    (key === hotkey.key || code === hotkey.key)
  );
}

export class CommandRegistry {
  private commands = new Map<string, Command>();
  private listeners = new Set<() => void>();

  register(command: Command): () => void {
    this.commands.set(command.id, command);
    this.changed();
    return () => {
      if (this.commands.get(command.id) === command) {
        this.commands.delete(command.id);
        this.changed();
      }
    };
  }

  get(id: string): Command | undefined {
    return this.commands.get(id);
  }

  /** Commands currently available, alphabetically. */
  list(): Command[] {
    return [...this.commands.values()].filter((c) => !c.when || c.when()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async run(id: string): Promise<boolean> {
    const command = this.commands.get(id);
    if (!command || (command.when && !command.when())) return false;
    await command.run();
    return true;
  }

  /** Runs the command bound to this key event, if any. */
  handleKeydown(event: KeyboardEvent): boolean {
    for (const command of this.commands.values()) {
      if (!command.hotkeys?.some((h) => matchesHotkey(event, h))) continue;
      if (command.when && !command.when()) continue;
      event.preventDefault();
      event.stopPropagation();
      void command.run();
      return true;
    }
    return false;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private changed() {
    for (const listener of this.listeners) listener();
  }
}
