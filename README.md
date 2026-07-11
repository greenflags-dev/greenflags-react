# @greenflags/react

Official React bindings for **GreenFlags feature flags**: a provider and hooks (`useFlag`, `useFlags`) built on top of [`@greenflags/client`](https://www.npmjs.com/package/@greenflags/client).

Same billing-safe model as the core SDK: one network call fetches the whole environment, every hook read is served from memory, and your components re-render automatically when flags refresh.

> **Status:** `0.1.0`, published on npm. Full changelog in [`CHANGELOG.md`](./CHANGELOG.md).

```sh
npm install @greenflags/client @greenflags/react
```

---

## Table of Contents

- [Why it exists](#why-it-exists)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Usage Guide](#usage-guide)
- [API Reference](#api-reference)
- [SSR & the `apiToken`](#ssr--the-apitoken)
- [React Native](#react-native)
- [Error Handling](#error-handling)
- [Billing Model](#billing-model)
- [Development](#development)
- [Versioning](#versioning)

---

## Why it exists

`@greenflags/client` is framework-agnostic: it gives you a snapshot and a `subscribe` callback, but wiring that into React correctly (stable snapshots for `useSyncExternalStore`, cleanup on unmount, polling tied to the component lifecycle) is boilerplate every app would repeat — and easy to get subtly wrong.

`@greenflags/react` is that wiring, done once:

- `<GreenFlagsProvider>` owns the client lifecycle: initial `refresh()`, opt-in polling, teardown.
- `useFlag(key, default)` re-renders your component when — and only when — flags actually refresh.
- Reads are always local: **hooks never trigger network requests.**

## Requirements

- **React 18+** (uses `useSyncExternalStore`).
- **`@greenflags/client` 0.2+** as a peer dependency — you create the client, the provider consumes it.
- ESM only, same as the core SDK.

## Quick Start

```tsx
import { createClient } from '@greenflags/client';
import { GreenFlagsProvider, useFlag } from '@greenflags/react';

const client = createClient({
  url: 'https://app.greenflags.dev',
  apiToken: process.env.GREENFLAGS_API_TOKEN!, // server-side — see SSR notes
});

function Checkout() {
  const newCheckout = useFlag('new-checkout', false);
  return newCheckout ? <NewCheckout /> : <LegacyCheckout />;
}

export function App() {
  return (
    <GreenFlagsProvider client={client}>
      <Checkout />
    </GreenFlagsProvider>
  );
}
```

On mount the provider performs one `refresh()` (1 billable request). Until it resolves, `useFlag` returns your `defaultValue` — the app renders immediately, fail-open.

## Usage Guide

```tsx
import { GreenFlagsProvider, useFlag, useFlags, useGreenFlagsClient } from '@greenflags/react';

// 1. Provider at the root. Polling is opt-in:
<GreenFlagsProvider client={client} pollIntervalMs={60_000}>
  <App />
</GreenFlagsProvider>

// 2. Read one flag — re-renders on refresh, never fetches:
const theme = useFlag<string>('theme', 'light');
const limit = useFlag<number>('rate-limit', 100);

// 3. Read everything:
const flags = useFlags(); // Record<string, Flag>

// 4. Escape hatch — manual refresh, geofence coordinates, etc.:
const gf = useGreenFlagsClient();
await gf.refresh();
gf.setCoordinates({ latitude: 19.4326, longitude: -99.1332 });
```

### Ground rules

- `useFlag` **never throws for missing flags** — it returns `defaultValue` until data arrives or when the key doesn't exist.
- Hooks **must** be used inside `<GreenFlagsProvider>` — otherwise they throw a descriptive error.
- Create the `client` **once** (module scope or `useMemo`) — a new client on every render would re-subscribe and re-fetch.
- Geofenced flags follow the core SDK's evaluation: set coordinates via `useGreenFlagsClient().setCoordinates(...)`; the evaluated values flow into the hooks on the next refresh.

## API Reference

### `<GreenFlagsProvider>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `client` | `GreenFlagsClient` | required | Client created with `createClient` from `@greenflags/client`. |
| `refreshOnMount` | `boolean` | `true` | Fetch the initial snapshot on mount (1 billable request). Disable if you refresh manually or hydrate server-side. |
| `pollIntervalMs` | `number` | off | Starts `client.startPolling(...)` on mount, stops on unmount. Every tick = 1 billable request. |

### Hooks

| Hook | Signature | Description |
|---|---|---|
| `useFlag` | `<T extends FlagValue>(key: string, defaultValue: T): FlagValue \| T` | Evaluated value of one flag. Re-renders on refresh. Fail-open with `defaultValue`. |
| `useFlags` | `(): Record<string, Flag>` | The whole evaluated snapshot. Re-renders on refresh. |
| `useGreenFlagsClient` | `(): GreenFlagsClient` | The underlying client, for `refresh()`, `setCoordinates()`, etc. |

## SSR & the `apiToken`

The `apiToken` is a secret: **don't embed it in the browser bundle** (no `NEXT_PUBLIC_` / `VITE_` prefixes). Two safe patterns:

1. **Server-rendered apps (Next.js App Router, Remix):** read flags server-side with `@greenflags/client` and pass the resolved values down as props. Use `@greenflags/react` only in trees where the token can live safely (internal tools, authenticated dashboards where the token is delivered per-user, or a proxy endpoint).
2. **Proxy pattern for public SPAs:** expose your own `/api/flags` endpoint that calls GreenFlags with the server-side token, and point `createClient({ url })` at your proxy. The SDK only needs the same response envelope.

For internal apps where the token's exposure is acceptable, create a **dedicated token with a monthly quota** (dashboard → API Tokens) so any leak is capped and instantly revocable.

## React Native

`@greenflags/client` runs on React Native (global `fetch` is available), so these hooks work in RN/Expo out of the box — same mobile-token advice as above: dedicated token + quota.

## Error Handling

The provider's automatic `refresh()` and polling ticks are **fail-open**: a failed request never throws into your component tree — the previous snapshot (or your defaults) stays rendered. To observe failures, refresh manually:

```tsx
const gf = useGreenFlagsClient();
try {
  await gf.refresh();
} catch (err) {
  // GreenFlagsError with .code / .status — see @greenflags/client docs
}
```

## Billing Model

Identical to the core SDK: only `refresh()` (mount, manual, or polling tick) makes a request; every 2xx counts as one billable read. Hook reads are free. `pollIntervalMs={60_000}` ≈ 43,200 reads/month per running app instance — size your interval accordingly.

## Development

```sh
cd sdks/react
npm install
npm run typecheck
npm test       # vitest + Testing Library (jsdom)
npm run build  # tsc → dist/
```

## Versioning

Semver, while in `0.x`: `MINOR` can include API changes, `PATCH` are fixes. Version-by-version detail in [`CHANGELOG.md`](./CHANGELOG.md).

## Related

- [`@greenflags/client`](https://www.npmjs.com/package/@greenflags/client) — the core SDK this package wraps
- [`greenflags`](https://pub.dev/packages/greenflags) — Dart/Flutter SDK
- [`@greenflags/mcp`](https://www.npmjs.com/package/@greenflags/mcp) — MCP server for AI agents
- [API reference](https://greenflags.dev/docs/)
