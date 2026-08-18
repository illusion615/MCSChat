# MCSChat D2E Local Router

Local Node.js Router for exposing the existing Copilot Studio New Agent `/agenticruntime/3p` D2E stream through a third-party REST/SSE API.

## Boundary

- Uses one controlled Entra user's delegated Power Platform token.
- Third-party callers never receive or acquire a Power Platform token.
- S2S/app-only is not implemented or configured.
- Listens only on `127.0.0.1`; it is not a production internet gateway.
- The MCSChat browser application remains a no-npm, no-build project; npm is confined to this directory.

## Runtime

```text
Caller API key
    -> Router caller authentication
    -> opaque conversation mapping
    -> MSAL acquireTokenSilent
    -> Copilot Studio D2E Activity SSE
    -> stage / answer / final / error SSE
```

Token cache and conversation state are stored under `.local-state/`. The MSAL cache is encrypted with AES-256-GCM, and state writes use private mode-600 files plus atomic rename.

## Commands

```bash
npm install
npm test
npm run check
npm run start:local
npm run verify:local
```

Copy `.env.example` to `.env.local`, fill the four `LOCAL_*` secrets, keep the file mode 600, then run `npm run start:local`. The first administrator authorization uses `POST /admin/auth/start`; subsequent restarts recover the encrypted MSAL cache and call `acquireTokenSilent`.

For a fake upstream contract and UI check:

```bash
node scripts/fakeRouterServer.js
```

Then open `http://127.0.0.1:8090/prototype` and use the fake server's non-secret key.

## Configuration

Secret values are read only from `.env.local` and are not stored in `.env.example`:

- `entra-client-secret`
- `msal-cache-encryption-key`
- `prototype-api-key`
- `admin-session-signing-key`

The browser page gets a loopback-only signed HttpOnly session from `/local/bootstrap`; it does not need to expose the prototype API key in JavaScript. Connect performs the readiness check and creates an opaque conversation before enabling the composer. Turns append to that conversation's visible history, while New conversation starts a replacement conversation and clears the chat surface.

## HTTP Surface

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/healthz` | Process liveness |
| `GET` | `/readyz` | Delegated identity readiness |
| `POST` | `/local/bootstrap` | Create the loopback-only browser session |
| `POST` | `/admin/auth/start` | Administrator authorization-code start; requires `X-Admin-Key` |
| `GET` | `/admin/auth/callback` | Entra callback and encrypted cache persistence |
| `GET` | `/prototype` | Router streaming verification page |
| `POST` | `/v1/conversations` | Create opaque conversation |
| `POST` | `/v1/conversations/{id}/turns` | Stream normalized SSE turn |
| `DELETE` | `/v1/conversations/{id}` | Close conversation mapping |

## Validation

`npm test` covers:

- New Agent replay reduction
- late/out-of-order chunk suppression
- final deduplication
- SSE framing
- cache encryption and tamper rejection
- local atomic ETag conflict behavior
- conversation ownership, locking, and duplicate turn rejection
- fake upstream REST/SSE end-to-end behavior

The real local verification completed against the configured New Agent with silent cache recovery, normalized SSE, matching final text, and invalid-key rejection. Redacted evidence is written to the ignored `evidence/local-router-live.json` file.
