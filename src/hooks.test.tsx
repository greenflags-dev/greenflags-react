import { act, cleanup, render, screen } from '@testing-library/react';
import type { Flag, GreenFlagsClient } from '@greenflags/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);

import { GreenFlagsProvider } from './provider.js';
import { useFlag, useFlags, useGreenFlagsClient } from './hooks.js';

interface FakeClient extends GreenFlagsClient {
  /** Test helper: replaces the snapshot and notifies subscribers. */
  emit(flags: Flag[]): void;
  refreshCalls: number;
  pollingIntervals: number[];
  stopCalls: number;
}

function createFakeClient(initial: Flag[] = []): FakeClient {
  let snapshot: Record<string, Flag> = Object.fromEntries(
    initial.map((f) => [f.key, f]),
  );
  const listeners = new Set<(s: Record<string, Flag>) => void>();

  const fake: FakeClient = {
    refreshCalls: 0,
    pollingIntervals: [],
    stopCalls: 0,
    async refresh() {
      fake.refreshCalls += 1;
    },
    getSnapshot: () => ({ ...snapshot }),
    getAllFlags: () => Object.values(snapshot),
    getFlag: (key, defaultValue) => snapshot[key]?.value ?? defaultValue,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    startPolling(intervalMs) {
      fake.pollingIntervals.push(intervalMs);
    },
    stop() {
      fake.stopCalls += 1;
    },
    setCoordinates() {},
    setUser() {},
    emit(flags) {
      snapshot = Object.fromEntries(flags.map((f) => [f.key, f]));
      const copy = { ...snapshot };
      for (const fn of listeners) {
        fn(copy);
      }
    },
  };
  return fake;
}

function FlagProbe({ flagKey }: { flagKey: string }) {
  const value = useFlag(flagKey, 'default-value');
  return <span data-testid="value">{String(value)}</span>;
}

describe('useFlag', () => {
  it('returns the default before data arrives and the value after a refresh', () => {
    const client = createFakeClient();
    render(
      <GreenFlagsProvider client={client} refreshOnMount={false}>
        <FlagProbe flagKey="banner" />
      </GreenFlagsProvider>,
    );

    expect(screen.getByTestId('value').textContent).toBe('default-value');

    act(() => {
      client.emit([{ key: 'banner', type: 'string', value: 'hello' }]);
    });

    expect(screen.getByTestId('value').textContent).toBe('hello');
  });

  it('re-renders when a later refresh changes the value', () => {
    const client = createFakeClient([
      { key: 'on', type: 'boolean', value: true },
    ]);
    render(
      <GreenFlagsProvider client={client} refreshOnMount={false}>
        <FlagProbe flagKey="on" />
      </GreenFlagsProvider>,
    );
    expect(screen.getByTestId('value').textContent).toBe('true');

    act(() => {
      client.emit([{ key: 'on', type: 'boolean', value: false }]);
    });
    expect(screen.getByTestId('value').textContent).toBe('false');
  });

  it('throws a clear error when used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<FlagProbe flagKey="x" />)).toThrow(
      /inside a <GreenFlagsProvider>/,
    );
    spy.mockRestore();
  });
});

describe('useFlags', () => {
  it('exposes the whole snapshot', () => {
    const client = createFakeClient([
      { key: 'a', type: 'boolean', value: true },
      { key: 'b', type: 'number', value: 7 },
    ]);

    function Probe() {
      const flags = useFlags();
      return <span data-testid="count">{Object.keys(flags).length}</span>;
    }

    render(
      <GreenFlagsProvider client={client} refreshOnMount={false}>
        <Probe />
      </GreenFlagsProvider>,
    );
    expect(screen.getByTestId('count').textContent).toBe('2');
  });
});

describe('GreenFlagsProvider', () => {
  it('refreshes on mount by default', () => {
    const client = createFakeClient();
    render(
      <GreenFlagsProvider client={client}>
        <div />
      </GreenFlagsProvider>,
    );
    expect(client.refreshCalls).toBe(1);
  });

  it('does not refresh on mount when disabled', () => {
    const client = createFakeClient();
    render(
      <GreenFlagsProvider client={client} refreshOnMount={false}>
        <div />
      </GreenFlagsProvider>,
    );
    expect(client.refreshCalls).toBe(0);
  });

  it('starts polling when pollIntervalMs is set and stops it on unmount', () => {
    const client = createFakeClient();
    const { unmount } = render(
      <GreenFlagsProvider
        client={client}
        refreshOnMount={false}
        pollIntervalMs={60_000}
      >
        <div />
      </GreenFlagsProvider>,
    );
    expect(client.pollingIntervals).toEqual([60_000]);
    expect(client.stopCalls).toBe(0);

    unmount();
    expect(client.stopCalls).toBe(1);
  });

  it('exposes the client via useGreenFlagsClient', () => {
    const client = createFakeClient();

    function Probe() {
      const fromHook = useGreenFlagsClient();
      return <span data-testid="same">{String(fromHook === client)}</span>;
    }

    render(
      <GreenFlagsProvider client={client} refreshOnMount={false}>
        <Probe />
      </GreenFlagsProvider>,
    );
    expect(screen.getByTestId('same').textContent).toBe('true');
  });
});
