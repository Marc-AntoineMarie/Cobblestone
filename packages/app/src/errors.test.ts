import { beforeEach, describe, expect, it } from 'vitest';
import { appErrorCode, describeError, isVaultMissing } from './errors';
import { setLanguage } from './i18n';

beforeEach(() => setLanguage('fr'));

const ipc = (method: string, message: string) => new Error(`Error invoking remote method '${method}': Error: ${message}`);

describe('describeError', () => {
  it('turns system codes into a sentence', () => {
    const error = ipc('vaults:open', "ENOENT: no such file or directory, access '/home/zera/MonCoffre-test'");
    expect(describeError(error)).toBe('le fichier ou le dossier est introuvable.');
    expect(describeError(Object.assign(new Error('x'), { code: 'EACCES' }))).toBe('le système refuse l’accès à cet emplacement.');
  });

  it('reads the codes of the desktop app', () => {
    const error = ipc('vaults:open', 'cobblestone:vault-missing');
    expect(appErrorCode(error)).toBe('vault-missing');
    expect(isVaultMissing(error)).toBe(true);
    expect(describeError(error)).toMatch(/renommé, déplacé ou supprimé/);
  });

  it('reads browser errors', () => {
    const error = new DOMException('A requested file or directory could not be found', 'NotFoundError');
    expect(isVaultMissing(error)).toBe(true);
    expect(describeError(new DOMException('quota', 'QuotaExceededError'))).toBe('il n’y a plus assez de place pour enregistrer.');
  });

  it('keeps other messages, without the IPC wrapper', () => {
    expect(describeError(ipc('fs:call', 'Path escapes the vault: ../x'))).toBe('Path escapes the vault: ../x');
    expect(describeError('plain')).toBe('plain');
    expect(isVaultMissing(new Error('ENOENT'))).toBe(false);
  });
});
