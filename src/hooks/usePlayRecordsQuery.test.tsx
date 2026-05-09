import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

import { useContinueWatchingQuery } from './useContinueWatchingQueries';
import { usePlayRecordsQuery } from './useUserMenuQueries';
import { useWatchingUpdatesQuery } from './useWatchingUpdates';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('play records queries', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shares one /api/playrecords request across homepage consumers', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        'douban+1': {
          title: 'A',
          save_time: 1,
          play_time: 120,
          total_time: 240,
          total_episodes: 12,
          index: 1,
        },
      }),
    });

    global.fetch = fetchMock as typeof fetch;

    const wrapper = createWrapper();

    const menuQuery = renderHook(
      () =>
        usePlayRecordsQuery({
          enabled: true,
          enableFilter: false,
          minProgress: 0,
          maxProgress: 100,
        }),
      { wrapper },
    );
    const continueWatchingQuery = renderHook(() => useContinueWatchingQuery(), {
      wrapper,
    });

    await waitFor(() => {
      expect(menuQuery.result.current.isSuccess).toBe(true);
      expect(continueWatchingQuery.result.current.isSuccess).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/playrecords');
  });

  it('shares one /api/playrecords request with watching updates', async () => {
    const fetchMock = jest
      .fn()
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url === '/api/playrecords') {
          return {
            ok: true,
            json: async () => ({
              'douban+1': {
                title: 'A',
                save_time: 1,
                play_time: 120,
                total_time: 240,
                total_episodes: 12,
                index: 1,
              },
            }),
          } as Response;
        }

        if (url === '/api/reminders') {
          return {
            ok: true,
            json: async () => ({}),
          } as Response;
        }

        if (url === '/api/sources') {
          return {
            ok: true,
            json: async () => [],
          } as Response;
        }

        if (url.startsWith('/api/detail')) {
          return {
            ok: true,
            json: async () => ({ episodes: [] }),
          } as Response;
        }

        throw new Error(`Unexpected fetch: ${url}`);
      });

    global.fetch = fetchMock as typeof fetch;

    const wrapper = createWrapper();

    const menuQuery = renderHook(
      () =>
        usePlayRecordsQuery({
          enabled: true,
          enableFilter: false,
          minProgress: 0,
          maxProgress: 100,
        }),
      { wrapper },
    );
    const watchingUpdatesQuery = renderHook(
      () => useWatchingUpdatesQuery({ enabled: true }),
      { wrapper },
    );

    await waitFor(() => {
      expect(menuQuery.result.current.isSuccess).toBe(true);
      expect(watchingUpdatesQuery.result.current.isSuccess).toBe(true);
    });

    expect(
      fetchMock.mock.calls.filter(([url]) => url === '/api/playrecords'),
    ).toHaveLength(1);
  });
});
