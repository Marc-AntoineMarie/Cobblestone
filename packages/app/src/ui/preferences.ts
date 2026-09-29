import { createContext, useContext } from 'react';
import { DEFAULT_PREFERENCES, type Preferences } from '../settings';

export interface PreferencesValue {
  preferences: Preferences;
  update: (patch: Partial<Preferences>) => void;
  /** Resolved paper stock. */
  paper: 'day' | 'night';
}

export const PreferencesContext = createContext<PreferencesValue>({
  preferences: DEFAULT_PREFERENCES,
  update: () => undefined,
  paper: 'day',
});

export const usePreferences = () => useContext(PreferencesContext);
