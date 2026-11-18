# One vault on several devices (`packages/sync`)

The goal and its order of priority: **devices of one person sync directly, with no server holding
their notes.** A server (`apps/relay`) exists only to introduce devices that cannot see each other,
and it never sees anything but encrypted bytes.

## The CRDT (`model.ts`)

One Yjs document per vault: a map of entries by a **stable id that survives renames**.

- A **text** entry (`md`, `markdown`, `canvas`, `txt`, `css`, `json`, `csv`, `base`, `yaml`, `yml`)
  holds its content as a `Y.Text`, merged character by character.
- A **binary** entry holds the SHA-256 of its bytes; the bytes themselves are fetched by hash from a
  device that has them.
- A **folder** entry exists so empty folders travel too.
- A deleted entry stays as a **tombstone**, so an old copy cannot resurrect a file.
- Two live entries on one path are settled identically on every device: the smallest id keeps the
  name; an identical copy is merged; a different one is renamed `Name (conflit abcd).md`.
- The document also lists the vault's **devices** by public key (a removed device stays listed and
  is refused) and the vault's `syncId`.

## Files stay the truth (`vault-sync.ts`)

`VaultSync` keeps the vault and the CRDT in step, both ways.

- A local edit (in the app or from another program) becomes a CRDT change — a text edit becomes the
  smallest diff, not a whole-file replacement.
- What other devices changed is written back **through the `Vault`**, so the app shows it like any
  other change. Writes happen in three passes: deletions, then moves (a file leaves before another
  takes its place; a cycle of swapped names goes through a free name), then contents.
- It recognises the **echo of its own writes** (expected texts, renames and deletions) so a write
  does not come back as a change. An expectation that never echoes lapses, so a later real change
  to the same text is not mistaken for it.
- Per-vault options: paths kept local (never sent or received), attachments off, a maximum
  attachment size. Entries it could not write (full disk) are remembered with the reason and tried
  again.
- The CRDT is saved in `.cobblestone/sync/vault.bin` (`AdapterSyncStore`), inside the vault, so it
  travels with the folder. On start, whatever changed on disk meanwhile is taken in.

## Devices, sessions, pairing

- **Identity** (`identity.ts`): each device has an X25519 key pair; its id is derived from the
  public key, so a device cannot claim another's. The **secret half lives in the host's storage,
  never in the vault** — a copied vault folder carries no secret.
- **Session** (`session.ts`): two paired devices agree on keys with a 3DH exchange (as in Signal's
  X3DH): each brings its long-term key and a fresh one, so only those two devices can read the
  session and a recorded session stays unreadable if a device key leaks later. Each side proves its
  key before any data flows. Frames are AES-256-GCM with a counter nonce: a replayed, dropped or
  reordered frame ends the link (`channel.ts`).
- **Pairing** (`pairing.ts`): a nine-symbol code, shown on the device that has the vault and typed
  on the other. **The code never travels.** Both sides run CPace — a password-authenticated key
  exchange on ristretto255 — in which the code picks the group generator: a watcher or the relay
  learns nothing, an impostor gets one guess per attempt. The guest then sends its public key, the
  user accepts it, and the vault flows on the same encrypted link. Primitives come from
  `@noble/curves` and `@noble/hashes`.
- **Protocol** (`protocol.ts`): `hello` with a state vector, `update`, `blob-request` / `blob` /
  `blob-missing` for attachments by hash, `presence` for cursors, `account` between devices of one
  account. A `SyncChannel` is transport-agnostic; `channelPair()` joins two devices in memory for
  the tests.

## Finding each other (`network.ts`, `node.ts`)

A `Network` is the whole of what a transport must offer: announce a **tag**, hear who else announces
it, connect, and (for a relay) watch a tag without announcing it. A tag reveals nothing: a vault's
tag is a hash of its `syncId`, a pairing's tag a hash of the **first three symbols** of the code —
enough for the relay to bring the right two devices together, useless for guessing the code.

`SyncNode` runs one device's part for one vault: it keeps `VaultSync` going, announces the vault's
tag, opens one session per device found (the same one kept on both sides), closes the session of a
removed device, and hosts pairings (five minutes, three wrong codes). `receiveVault` is the other
side of a pairing.

Transports:

- **Local network** (`apps/desktop/src/main/lan.ts`): the Electron main process announces tags by
  UDP multicast and carries links over TCP (length-prefixed frames, the first naming the tag). It
  moves encrypted bytes only, and refuses unknown tags, slow greetings and oversized frames.
  Windows reach it through IPC, only for their own links.
- **Relay** (`relay.ts` here, `apps/relay` there): a WebSocket, usable from a browser, Electron or
  Node. It reconnects by itself and re-announces what the device listens for. A socket the system
  put to sleep (a phone locked, a tab left aside) often comes back open but deaf: nothing arrives
  and no close is reported. `wake()` drops a socket nothing has been heard on for over a minute —
  the relay pings every 30 s — and connects again at once; the app calls it whenever the device
  comes back (`visibilitychange`, `focus`, `online`, `pageshow`), which is what makes a phone pick
  the others up again instead of looking connected and receiving nothing. This is how the web
  app syncs at all, and how two desktops on different networks meet.
- `NetworkSet` joins both; the relay's address is a per-device setting (default
  `sync.cobblestone.marc-antoinemarie.com`, see [accounts-and-relay.md](accounts-and-relay.md)).

### Store-and-forward

When a peer is not connected, a device can **deposit** for it: the full CRDT state, sealed for that
one device with an ephemeral X25519 key and AES-256-GCM (`sealDeposit` in `crypto.ts`). The relay
holds the sealed blob in memory, up to 48 hours by default, and hands it over when the device shows
up. Only the target device's secret key opens it; the relay cannot read it, and it is lost when the
relay restarts. This is the one case where a copy of the vault's state — encrypted, for one
recipient — sits briefly on a server.

## In the app (`packages/app/src/sync.ts`)

`SyncController`, one per open vault, is what the interface talks to. It keeps, **in the host's
storage and never in the vault**: the device's key pair and name, the vaults this device syncs
(`syncId`, whether paused, which devices it knew, per-vault options), the account's trusted devices,
and the relay settings. Keeping the known devices outside the vault means a lost
`.cobblestone/sync/` does not strand the device.

- `SyncState` drives the interface: whether this host can sync, whether this vault syncs, the
  devices and their status, attachments on their way, files that could not be written, pairing
  state.
- `BackgroundSyncManager` syncs every vault offered to the account while the app is open, even those
  not currently open, using `Platform.openVaultSilent` (so: desktop folders and browser-stored
  vaults; a picked folder on the web cannot sync in the background because the browser would need
  to ask for permission). The foreground session takes over through `release()`.
- Interface: Settings › Sync, the add-device dialog (`ui/PairingDialog.tsx`), "Receive a vault" on
  the start screen (`ui/ReceiveVault.tsx`), the vault offers of an account (`ui/AccountOffers.tsx`),
  the status bar (`ui/SyncStatus.tsx`), and the devices on a note (`ui/NotePresenceList.tsx`).

## Writing together

`packages/app/src/editor/collab.ts` connects the editor to the note's `Y.Text`: each keystroke goes
into the shared text at once, remote changes arrive as CodeMirror changes, and the file is still
saved (the engine recognises those saves as its own).

`LiveBinding` keeps the editor on the shared text the note has **now**. It binds as soon as that
text exists (sync starting, a new note getting its entry), and moves to another one if the note's
entry changes. The editor asks it again at every outside change of the file (`followShared`): a
change is taken from the file only while no shared text exists. An editor left on a text nobody
writes any more would miss what the others type, then send its stale text back over it. A change
taken from the file before binding does not count as typing; only real typing made before the
shared text existed wins when they meet. Cursors travel as `presence` messages with
relative positions, and are forgotten when a link ends. Each device gets one of five inks.

## Testing sync

Everything here is covered by unit tests that join devices in memory: `channelPair()` and
`bytePair()` for links, `MemoryNetworkHub` for a network, `MemoryAdapter` for the files. That is why
`packages/sync` has no DOM and no Node dependency either. The end-to-end section is
`tests/recette/31-synchronisation.spec.ts`.
