import { describe, expect, it } from 'vitest';
import { nextStatus } from './updates';

describe('nextStatus', () => {
  it('is checking while a check is in flight', () => {
    expect(nextStatus({ type: 'checking' })).toEqual({ kind: 'checking' });
  });

  it('starts downloading once a newer version is found', () => {
    expect(nextStatus({ type: 'available', version: '1.2.0' })).toEqual({ kind: 'downloading', version: '1.2.0' });
  });

  it('is up to date when no newer version is found', () => {
    expect(nextStatus({ type: 'not-available', version: '1.1.0' })).toEqual({ kind: 'up-to-date', version: '1.1.0' });
  });

  it('is ready once the download finishes', () => {
    expect(nextStatus({ type: 'downloaded', version: '1.2.0' })).toEqual({ kind: 'ready', version: '1.2.0' });
  });

  it('is an error when the check fails', () => {
    expect(nextStatus({ type: 'error' })).toEqual({ kind: 'error' });
  });
});
