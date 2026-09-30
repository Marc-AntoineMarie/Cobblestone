import { createContext, useContext } from 'react';
import { DEFAULT_PREFERENCES, type Preferences } from '../settings';
import { BUILT_IN_THEMES, type Theme } from '../themes';

export interface PreferencesValue {
  preferences: Preferences;
  update: (patch: Partial<Preferences>) => void;
  /** Resolved paper stock. */
  paper: 'day' | 'night';
  /** The theme printed on it. */
  theme: Theme;
}

export const PreferencesContext = createContext<PreferencesValue>({
  preferences: DEFAULT_PREFERENCES,
  update: () => undefined,
  paper: 'day',
  theme: BUILT_IN_THEMES[0]!,
});

export const usePreferences = () => useContext(PreferencesContext);
