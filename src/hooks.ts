import { useContext, useSyncExternalStore } from 'react';
import type { Flag, FlagValue, GreenFlagsClient } from '@greenflags/client';

import { GreenFlagsContext, type GreenFlagsContextValue } from './provider.js';

function useGreenFlagsContext(): GreenFlagsContextValue {
  const ctx = useContext(GreenFlagsContext);
  if (ctx === null) {
    throw new Error(
      'GreenFlags hooks must be used inside a <GreenFlagsProvider>.',
    );
  }
  return ctx;
}

function useSnapshot(): Record<string, Flag> {
  const { store } = useGreenFlagsContext();
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}

/**
 * The evaluated value of one flag. Re-renders on every successful refresh.
 * Fail-open: returns `defaultValue` while the snapshot is empty or the flag
 * doesn't exist — never throws for missing flags.
 *
 * ```tsx
 * const enabled = useFlag('new-checkout', false);
 * const theme = useFlag<string>('theme', 'light');
 * ```
 */
export function useFlag<T extends FlagValue>(
  key: string,
  defaultValue: T,
): FlagValue | T {
  const snapshot = useSnapshot();
  const flag = snapshot[key];
  return flag === undefined ? defaultValue : flag.value;
}

/**
 * The whole evaluated snapshot, keyed by flag key. Re-renders on every
 * successful refresh.
 */
export function useFlags(): Record<string, Flag> {
  return useSnapshot();
}

/**
 * Escape hatch to the underlying client (e.g. to call `refresh()` manually
 * or `setCoordinates()` for geofenced flags).
 */
export function useGreenFlagsClient(): GreenFlagsClient {
  return useGreenFlagsContext().client;
}
