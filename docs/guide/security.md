# Security model

What Cobblestone protects, from whom, and where it is currently weak. This is the document to read
before touching storage, rendering, the IPC bridge or sync — and the one to update when any of them
changes. How to report a vulnerability: [../../SECURITY.md](../../SECURITY.md).

## What we promise

1. A note — opened, embedded, shared or arriving from another device — **can never run code**.
2. Nothing leaves the device without the user asking. No telemetry, no silent upload.
3. What travels between devices is **encrypted end to end**; no server can read a note.
4. The desktop renderer reaches only the folders of the vaults opened in its own window.
5. A vault stays a plain folder of files: no lock-in, nothing that a backup cannot restore.

## Trust boundaries

| Boundary                         | Who is on the far side                                      | What holds                                                                                                                                                                                                                                |
| -------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Note content → DOM               | anything the vault holds, including a shared or synced note | `sanitize` (DOMPurify) on every path, HTML and SVG; see [editor-and-rendering.md](editor-and-rendering.md)                                                                                                                                |
| Renderer → file system (desktop) | the sandboxed window                                        | `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, one preload bridge, `fs:call` restricted to a fixed method list and to adapters registered for that window; `NodeFsAdapter.resolve` refuses paths escaping the vault |
| Web page → files                 | the browser                                                 | File System Access permission (re-asked each session) or OPFS, scoped to the app's origin                                                                                                                                                 |
| Device → device                  | the other device                                            | 3DH session keys, each side proving its key; AES-256-GCM frames with counter nonces                                                                                                                                                       |
| Device → new device              | whoever typed the code                                      | CPace on the nine-symbol code: one guess per attempt, three tries, five minutes                                                                                                                                                           |
| Device → relay                   | the server operator, and anyone who takes the server        | the relay only ever handles tags, link ids and sealed frames                                                                                                                                                                              |
| Device → account server          | the same                                                    | a token for its own device; trusting a new device needs a six-digit check compared by the user                                                                                                                                            |

## Cryptographic inventory

| Use                          | Primitive                              | Where                                |
| ---------------------------- | -------------------------------------- | ------------------------------------ |
| Device identity              | X25519                                 | `sync/src/identity.ts`               |
| Session keys                 | 3DH (X25519 ×4) + HKDF-like derivation | `sync/src/session.ts`, `crypto.ts`   |
| Frames                       | AES-256-GCM, counter nonce             | `sync/src/channel.ts`, `crypto.ts`   |
| Pairing                      | CPace on ristretto255                  | `sync/src/pairing.ts`                |
| Deposits (store-and-forward) | ephemeral X25519 + AES-256-GCM         | `sync/src/crypto.ts` (`sealDeposit`) |
| Hashes, tags, blob ids       | SHA-256                                | `@noble/hashes`                      |
| Account passwords            | scrypt (N = 2¹⁵, r = 8, p = 1)         | `apps/relay/src/accounts.ts`         |
| Tokens and e-mail codes      | random bytes, stored as SHA-256        | same                                 |

Primitives come from `@noble/curves` and `@noble/hashes` (audited) plus Web Crypto for AES-GCM.
We write protocols, not primitives: no hand-rolled cipher, ever.

## Threats, and where we stand

**The relay operator, or someone who seizes the server.** Cannot read notes. Learns metadata: IP
addresses, device ids, which tags meet which, when, and how much data flows. Holds sealed deposits
for up to 48 h that it cannot open. A malicious relay can refuse service, or lie about who is
listening — which is why a session proves keys and a new account device needs the user's six-digit
comparison.

**Someone on the same local network.** Sees UDP announcements of opaque tags and TCP frames it
cannot read. Cannot join a vault without being paired.

**Someone watching a pairing.** Learns nothing about the code (CPace); gets one guess per attempt.

**Someone with the user's machine, unlocked.** Reads everything: the vault is plain files, and the
device's secret sync key is in plain form in the host's storage (`storage.json` on the desktop,
IndexedDB on the web). Mitigation is the operating system's — full-disk encryption, a locked
session. On a borrowed machine, "forget this vault" deletes a browser-stored vault outright.

**A malicious note.** The main danger for the web app, where the vault and the device key live in
the same origin: an XSS there reads both. Hence rule 1 and the sanitising discipline. The recette's
security section (`tests/recette/28-securite.spec.ts`) exercises it.

**A compromised account password.** Not enough to read notes: a new device must still be let in by
a trusted one, with the check compared by the user.

**A dependency.** `npm audit --omit=dev --audit-level=high` runs in CI on every push.

## Known gaps

Tracked in `contribution/IDEES.md`; listed here so nobody rediscovers them as surprises.

- **No security headers on the web app.** `deploy/web/cobblestone.nginx.conf` sends no
  `Content-Security-Policy`, no HSTS, no `X-Content-Type-Options`, no `frame-ancestors`. The
  desktop renderer has a CSP meta; the web host has nothing equivalent. This is the gap with the
  worst consequences, because the origin holds the vault and the device key.
- **Keys at rest are not encrypted.** The device secret key sits in IndexedDB (web) or
  `storage.json` (desktop) in the clear. A passphrase-wrapped key store, or the OS keychain, is the
  fix; it has to survive a browser having no keychain.
- **No `navigator.storage.persist()`.** A browser-stored vault can be evicted under storage
  pressure: data loss, not disclosure.
- **Deposits reveal size and timing.** The relay sees how large a vault's state is and when devices
  exchange. No padding or cover traffic.
- **No version history yet**, so a destructive sync (a device that deletes everything) propagates.
  `.trash/` softens it; real history is on the roadmap.

## Rules for contributors

- Never write to `.obsidian/`.
- Every path that comes from outside goes through `normalizePath` and, on a host, through the
  adapter's own resolution. Never build a file path by string concatenation.
- Everything that reaches the DOM from a note is sanitised, in the function that produces it.
- No new IPC channel without a check on which window and which vault it may touch, and a fixed list
  of allowed operations.
- A secret never goes into the vault: not the device key, not a token. Vault files travel.
- A change to a protocol message is a compatibility question: an older device will send the old
  shape. Say in the journal entry what happens then.
- A security fix comes with its recette line and, if it is user-visible, a note in the release.
