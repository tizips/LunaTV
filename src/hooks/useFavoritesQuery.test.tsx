import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

import { useIsFavoritedQuery } from './useFavoritesQuery';
import { useIsRemindedQuery } from './useRemindersQuery';
import { useFavoritesQuery as useUserMenuFavoritesQuery } from './useUserMenuQueries';

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

describe('status queries', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shares a single /api/favorites request across item status queries', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ 'douban+1': { title: 'A' } }),
    });

    global.fetch = fetchMock as typeof fetch;

    const wrapper = createWrapper();

    const first = renderHook(() => useIsFavoritedQuery('douban', '1'), {
      wrapper,
    });
    const second = renderHook(() => useIsFavoritedQuery('douban', '2'), {
      wrapper,
    });

    await waitFor(() => {
      expect(first.result.current.isSuccess).toBe(true);
      expect(second.result.current.isSuccess).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/favorites');
  });

  it('shares a single /api/reminders request across item status queries', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ 'douban+1': { title: 'A' } }),
    });

    global.fetch = fetchMock as typeof fetch;

    const wrapper = createWrapper();

    const first = renderHook(() => useIsRemindedQuery('douban', '1'), {
      wrapper,
    });
    const second = renderHook(() => useIsRemindedQuery('douban', '2'), {
      wrapper,
    });

    await waitFor(() => {
      expect(first.result.current.isSuccess).toBe(true);
      expect(second.result.current.isSuccess).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/reminders');
  });

  it('shares /api/favorites between the menu list and status queries', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        'douban+1': {
          title: 'A',
          save_time: 1,
        },
      }),
    });

    global.fetch = fetchMock as typeof fetch;

    const wrapper = createWrapper();

    const menuQuery = renderHook(
      () => useUserMenuFavoritesQuery({ enabled: true }),
      { wrapper },
    );
    const statusQuery = renderHook(() => useIsFavoritedQuery('douban', '1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(menuQuery.result.current.isSuccess).toBe(true);
      expect(statusQuery.result.current.isSuccess).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/favorites');
  });
});
