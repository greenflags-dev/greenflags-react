import { createContext, useEffect, useMemo, type ReactNode } from 'react';
import type { GreenFlagsClient } from '@greenflags/client';

import { createFlagsStore, type FlagsStore } from './store.js';

export interface GreenFlagsContextValue {
  client: GreenFlagsClient;
  store: FlagsStore;
}

export const GreenFlagsContext = createContext<GreenFlagsContextValue | null>(
  null,
);

export interface GreenFlagsProviderProps {
  /** A client created with `createClient` from `@greenflags/client`. */
  client: GreenFlagsClient;
  /**
   * Fetch the initial snapshot on mount (1 billable request). Defaults to
   * true. Set to false when you already called `client.refresh()` yourself
   * (e.g. server-side) or want full manual control.
   */
  refreshOnMount?: boolean;
  /**
   * When set, starts `client.startPolling(pollIntervalMs)` on mount and stops
   * it on unmount. Every tick is 1 billable request. Off by default.
   */
  pollIntervalMs?: number;
  children: ReactNode;
}

/**
 * Provides a GreenFlags client to the `useFlag` / `useFlags` hooks.
 *
 * ```tsx
 * const client = createClient({ url, apiToken });
 * <GreenFlagsProvider client={client} pollIntervalMs={60_000}>
 *   <App />
 * </GreenFlagsProvider>
 * ```
 */
export function GreenFlagsProvider({
  client,
  refreshOnMount = true,
  pollIntervalMs,
  children,
}: GreenFlagsProviderProps) {
  const value = useMemo<GreenFlagsContextValue>(
    () => ({ client, store: createFlagsStore(client) }),
    [client],
  );

  useEffect(() => {
    return () => {
      value.store.dispose();
    };
  }, [value]);

  useEffect(() => {
    if (refreshOnMount) {
      client.refresh().catch(() => {
        // Fail-open: the app keeps rendering with defaults; a later refresh
        // or polling tick can still succeed.
      });
    }
  }, [client, refreshOnMount]);

  useEffect(() => {
    if (pollIntervalMs === undefined) {
      return;
    }
    client.startPolling(pollIntervalMs);
    return () => {
      client.stop();
    };
  }, [client, pollIntervalMs]);

  return (
    <GreenFlagsContext.Provider value={value}>
      {children}
    </GreenFlagsContext.Provider>
  );
}
