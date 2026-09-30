import { createContext, useContext, type ReactNode } from 'react';
import { fold } from './fuzzy';

/** What is typed in the settings' search field: rows that do not match it are left out. */
export const SettingsQuery = createContext('');

function matches(query: string, texts: (string | undefined)[]): boolean {
  if (!query.trim()) return true;
  const q = fold(query.trim());
  return texts.some((text) => text !== undefined && fold(text).includes(q));
}

/** One setting: its label and hint on the left, its control on the right. */
export function Row({
  label,
  hint,
  htmlFor,
  keywords,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  /** More words the search finds this setting by. */
  keywords?: string;
  children: ReactNode;
}) {
  const query = useContext(SettingsQuery);
  if (!matches(query, [label, hint, keywords])) return null;
  return (
    <div className="setting">
      <div className="setting-text">
        <label htmlFor={htmlFor}>{label}</label>
        {hint && <p>{hint}</p>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

/** A group of settings larger than a row (the theme cards, the colours), found by its title and keywords. */
export function Block({
  title,
  keywords,
  actions,
  children,
}: {
  title: string;
  keywords?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const query = useContext(SettingsQuery);
  if (!matches(query, [title, keywords])) return null;
  return (
    <div className="setting-block">
      <div className="setting-block-head">
        <h3 className="label">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function Toggle({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  /** Name for a switch with no label element of its own. */
  label?: string;
}) {
  return (
    <button id={id} role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)}>
      <span className="switch-knob" />
    </button>
  );
}

/** A row of mutually exclusive options, the chosen one printed as a plate. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          role="radio"
          aria-checked={option.value === value}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
