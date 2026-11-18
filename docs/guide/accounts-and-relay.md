# The relay and the accounts (`apps/relay`)

The relay is a meeting point, not a store. Two devices of one vault that cannot see each other on a
local network announce the same tag there, get a link, and talk over it — already encrypted end to
end. The relay passes frames. It cannot read a note, and the only thing it ever holds is a sealed
deposit for a device that was offline (below).

Everything runs in one Node process: a WebSocket server for the relay and an HTTP API for the
accounts, behind a proxy that gives it HTTPS/WSS. Deployment: [../RELAIS.md](../RELAIS.md).

## The relay protocol (`relay.ts`)

```
Client → relay (text)   hello {device, token?}
                        listen | unlisten | watch | unwatch {tag}
                        search
                        connect {req, to, tag} · close {link}
                        deposit {for}            (next binary frame is the payload)
Relay → client (text)   welcome {id} · account {signedIn}
                        found {tag, address, device}
                        linked {req, link} · refused {req}
                        incoming {link, tag} · closed {link}
                        deposited {from}         (next binary frame is the payload)
Both ways (binary)      4 bytes of link id, then the frame
```

- **`listen`** announces a tag; **`watch`** hears about a tag without announcing it. A device is
  only ever told about tags it listens for or watches.
- **`connect`** is refused unless the target is really listening for that tag, which keeps a client
  from opening links at random.
- The tag `account` is special: it is rewritten server-side to `account-of-<account id>`, and only
  a device whose session token belongs to **that very device** gets it. No one can listen for
  another account's tag.
- Limits: 64 MB per frame, 32 connections per address, 64 links and 64 tags per client, a daily
  traffic cap (30 GB by default) counted per account or per address — an abuse guard, not a quota.
  A dead connection is dropped by a 30-second heartbeat.

### Store-and-forward

`deposit {for}` followed by a binary frame leaves a payload for one device: in practice the whole
CRDT state of a vault, sealed for that device's public key (X25519 ephemeral + AES-256-GCM, see
`packages/sync/src/crypto.ts`). The relay keeps it **in memory**, one entry per (recipient, sender),
for `RELAY_STORE_HOURS` (48 by default; `0` disables the feature), and delivers it when the
recipient connects — immediately if it is already connected. Expired entries are swept hourly, and
everything is lost on restart.

What this means: the relay does hold an encrypted copy of a vault's state for up to two days. It
cannot open it, and neither can anyone who takes the server's memory without the recipient's secret
key. It is the price of "my laptop was off when my phone wrote".

## Accounts (`accounts.ts`, `api.ts`)

Accounts are **optional**. Their only job is to let a person's devices find each other without
typing a pairing code every time, from anywhere.

- Password: scrypt (N = 2¹⁵, r = 8, p = 1), a random salt per account, only the result stored,
  compared in constant time.
- Session: a random 32-byte token, given once to the device; only its SHA-256 is kept, so a stolen
  copy of the file opens no session. A session lasts a year and belongs to one device.
- E-mail codes (verification, password reset): six digits, stored hashed, valid 15 minutes, five
  tries. Mail goes out over SMTP (`mail.ts`, Brevo in production); with no `SMTP_HOST` configured,
  codes are written to the log — which is fine for a relay you run for yourself.
- Repeated failures from an address, or against one account, are slowed down.
- Everything lives in **one JSON file**, written atomically (`DATA_DIR/accounts.json`).

HTTP API, JSON in and out, token in `Authorization: Bearer`, open to every origin because the web
app may be served from anywhere (no cookie is used, so nothing rides along):

```
POST /api/signup {email, password}          POST /api/verify {email, code, device}
POST /api/login {email, password, device}   POST /api/forgot {email}
POST /api/reset {email, code, password}     GET  /api/me
POST /api/logout                            POST /api/delete {password}
DELETE /api/devices/<deviceId>
GET  /health → ok
```

The client side is `packages/app/src/account.ts` (the calls and the stored session) and
`ui/AccountSettings.tsx`.

### What an account does _not_ give

Signing in does **not** give access to the notes. A device trusted by none asks an already-trusted
device to let it in; both show a six-digit check computed from the two devices' keys, and the user
compares them (`packages/sync/src/account-link.ts`). A server that tried to slip in a device of its
own would produce a different check. Only then is the device trusted, and only then does it receive
the vaults offered to the account — per vault, by an explicit switch. So e-mail and password alone,
stolen, are not enough to read anything.

## What the server knows

| It sees                                                                       | It does not see                                           |
| ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| IP addresses, connection times                                                | note content, file names, vault names                     |
| device ids (16 hex) and, with an account, device names, kinds and public keys | the pairing code (only a hash of its first three symbols) |
| tags (a hash of a vault's sync id)                                            | which vault a tag belongs to                              |
| the size and timing of encrypted frames                                       | anything inside them                                      |
| account e-mail addresses, hashed passwords and tokens                         | the notes of those accounts                               |

See [security.md](security.md) for what follows from that, including metadata.

## Configuration and deployment

`apps/relay/src/main.ts` reads: `PORT` (8787), `HOST`, `DATA_DIR`, `DAILY_CAP_GB` (30),
`RELAY_STORE_HOURS` (48), and the SMTP variables. `deploy/relay/` holds the Docker Compose file
(the container publishes on `127.0.0.1:8787` only) and the nginx site that proxies the subdomain to
it with the WebSocket headers; `deploy/web/` holds the nginx site for the web app. The
`Déployer` GitHub workflow rebuilds the web app, rsyncs it to the VPS and restarts the relay's
container on every push to `main`.
