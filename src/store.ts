import type { Flag, GreenFlagsClient } from '@greenflags/client';

/**
 * Bridges the client's subscribe callback to React's useSyncExternalStore,
 * which requires a STABLE snapshot reference between change notifications —
 * client.getSnapshot() builds a fresh object per call, so calling it directly
 * from getSnapshot() would re-render forever.
 * Internal — not part of the public surface.
 */
export interface FlagsStore {
  subscribe(onStoreChange: () => void): () => void;
  getSnapshot(): Record<string, Flag>;
  dispose(): void;
}

export function createFlagsStore(client: GreenFlagsClient): FlagsStore {
  let snapshot = client.getSnapshot();
  const listeners = new Set<() => void>();

  const unsubscribe = client.subscribe((next) => {
    snapshot = next;
    for (const listener of listeners) {
      listener();
    }
  });

  return {
    subscribe(onStoreChange) {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    getSnapshot() {
      return snapshot;
    },
    dispose() {
      unsubscribe();
      listeners.clear();
    },
  };
}
