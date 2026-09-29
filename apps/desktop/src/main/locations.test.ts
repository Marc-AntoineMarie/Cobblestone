import { describe, expect, it } from 'vitest';
import { locationProblem } from './locations';

const context = { home: '/home/zera', appData: '/home/zera/.config/Cobblestone' };

describe('locationProblem', () => {
  it('accepts an ordinary folder', () => {
    expect(locationProblem('/home/zera/Documents/Notes', context)).toBeNull();
    expect(locationProblem('/mnt/usb/Notes', context)).toBeNull();
  });

  it('refuses the app data folder and anything inside it', () => {
    expect(locationProblem('/home/zera/.config/Cobblestone', context)).toBe('app-data-folder');
    expect(locationProblem('/home/zera/.config/Cobblestone/Vault', context)).toBe('app-data-folder');
  });

  it('refuses the home folder and the root of a drive', () => {
    expect(locationProblem('/home/zera', context)).toBe('too-broad');
    expect(locationProblem('/home/zera/', context)).toBe('too-broad');
    expect(locationProblem('/', context)).toBe('too-broad');
  });

  it('refuses the folder that contained a lost vault', () => {
    const lost = { ...context, previous: '/home/zera/Documents/MonCoffre-test' };
    expect(locationProblem('/home/zera/Documents', lost)).toBe('vault-parent');
    expect(locationProblem('/home/zera/Documents/MonCoffre-renamed', lost)).toBeNull();
    expect(locationProblem('/home/zera/Documents/MonCoffre-test', lost)).toBeNull();
  });

  it('refuses a folder that is already another vault', () => {
    expect(locationProblem('/home/zera/Documents/temporary', { ...context, others: ['/home/zera/Documents/temporary'] })).toBe(
      'other-vault',
    );
  });
});
