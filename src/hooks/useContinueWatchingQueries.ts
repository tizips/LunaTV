import { queryOptions, useQuery } from '@tanstack/react-query';

import { playRecordsQueryOptions } from './usePlayRecordsQuery';
import { useWatchingUpdatesQuery as useWatchingUpdates } from './useWatchingUpdates';

// BRANCH-PROTECTED: preserve this file's logic in future merges unless the owner approves changes.

/**
 * Query options for continue watching records
 */
const continueWatchingOptions = () =>
  queryOptions({
    ...playRecordsQueryOptions,
    select: (allRecords) => {
      const recordsArray = Object.entries(allRecords).map(
        ([key, record]: [string, any]) => ({
          ...record,
          key,
        }),
      );
      // Sort by save_time descending (newest first)
      return recordsArray.sort((a, b) => b.save_time - a.save_time);
    },
  });

/**
 * Fetch all play records sorted by save_time
 * Based on TanStack Query useQuery with event-driven invalidation
 */
export function useContinueWatchingQuery() {
  return useQuery(continueWatchingOptions());
}

/**
 * Fetch watching updates (new episodes detection)
 * Uses the new TanStack Query implementation
 */
export function useWatchingUpdatesQuery(options?: { enabled?: boolean }) {
  return useWatchingUpdates(options);
}
