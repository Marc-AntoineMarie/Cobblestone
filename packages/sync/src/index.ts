export {
  applyTextDiff,
  conflictPath,
  hashBytes,
  kindOf,
  newId,
  VaultDoc,
  type DeviceRecord,
  type Entry,
  type EntryKind,
} from './model';
export { bytePair, plainChannel, secureChannel, SyncRefusal, type ByteChannel, type RefusalCode } from './channel';
export {
  createIdentity,
  deviceIdOf,
  publicInfo,
  readDevice,
  type DeviceIdentity,
  type DeviceInfo,
  type DeviceKind,
} from './identity';
export { acceptSession, openSession, type Session, type SessionOptions } from './session';
export {
  CODE_LENGTH,
  formatCode,
  hostPairing,
  joinPairing,
  pairingCode,
  readCode,
  type GuestOptions,
  type HostOptions,
  type VaultTicket,
} from './pairing';
export { channelPair, decodeMessage, encodeMessage, type SyncChannel, type SyncMessage } from './protocol';
export { AdapterSyncStore, VaultSync, type SyncStore } from './vault-sync';
