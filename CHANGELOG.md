# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/). Versioning: [SemVer](https://semver.org/) (while in `0.x`, a MINOR release may include breaking changes; strict semver applies from `1.0.0` onward).

## [0.2.0] - 2026-07-18

### Changed
- Peer dependency raised to `@greenflags/client >= 0.5.0` to inherit percentage rollout and multivariate evaluation. No React-side API change: create the client with `createClient({ url, apiToken, user })` and switch identity at runtime with `client.setUser(userKey)` — hooks read the evaluated snapshot as always.

## [0.1.0] - 2026-07-10

### Added
- Initial release: React bindings over `@greenflags/client` (peer dependency, `>=0.2.0`).
- `<GreenFlagsProvider client refreshOnMount pollIntervalMs>` — owns the client lifecycle: optional initial `refresh()` on mount (default on, fail-open), opt-in polling tied to mount/unmount, store teardown.
- `useFlag(key, defaultValue)` — evaluated value of one flag via `useSyncExternalStore`; re-renders only when the snapshot refreshes; fail-open to `defaultValue`.
- `useFlags()` — the whole evaluated snapshot.
- `useGreenFlagsClient()` — escape hatch to the underlying client (`refresh`, `setCoordinates`, …).
- Internal snapshot store bridging `client.subscribe` to React's stable-snapshot requirement (a fresh `getSnapshot()` object per render would loop).
