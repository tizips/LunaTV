import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { checkForUpdates, type UpdateStatus } from '@/lib/version_check';

import { favoritesQueryOptions } from './useFavoritesQuery';
import { playRecordsQueryOptions } from './usePlayRecordsQuery';

// ─── Emby Config Types ──────────────────────────────────────────────────────

export interface EmbySource {
  key: string;
  name: string;
  enabled: boolean;
  ServerURL: string;
  ApiKey?: string;
  Username?: string;
  Password?: string;
  removeEmbyPrefix?: boolean;
  appendMediaSourceId?: boolean;
  transcodeMp4?: boolean;
  proxyPlay?: boolean;
}

export interface EmbyConfig {
  sources: EmbySource[];
}

// ─── Emby Config Query Options (reusable key, type-safe) ─────────────────────

export const embyConfigQueryOptions = queryOptions({
  queryKey: ['user', 'emby-config'] as const,
  queryFn: async (): Promise<EmbyConfig> => {
    const res = await fetch('/api/user/emby-config');
    const data = await res.json();
    if (data.success && data.config) {
      return data.config as EmbyConfig;
    }
    return { sources: [] };
  },
  staleTime: 5 * 60 * 1000, // 5 minutes - config rarely changes
  gcTime: 30 * 60 * 1000,
});

/**
 * Fetch user Emby config
 * Only fetches when isSettingsOpen - use enabled option at call site
 */
export function useEmbyConfigQuery(enabled: boolean) {
  return useQuery({
    ...embyConfigQueryOptions,
    enabled,
  });
}

/**
 * Save Emby config mutation
 * Invalidates emby-config query on success so ModernNav etc. refresh
 */
export function useSaveEmbyConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: EmbyConfig) => {
      const res = await fetch('/api/user/emby-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || '保存失败');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: embyConfigQueryOptions.queryKey,
      });
    },
  });
}

/**
 * Query options for watch room config
 */
const watchRoomConfigOptions = () =>
  queryOptions({
    queryKey: ['watchRoomConfig'],
    queryFn: async () => {
      const response = await fetch('/api/watch-room/config');
      const config = await response.json();
      return config.enabled === true;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - config rarely changes
    gcTime: 30 * 60 * 1000,
  });

/**
 * Fetch watch room config
 */
export function useWatchRoomConfigQuery() {
  return useQuery(watchRoomConfigOptions());
}

/**
 * Query options for server config
 */
const serverConfigOptions = () =>
  queryOptions({
    queryKey: ['serverConfig'],
    queryFn: async () => {
      const response = await fetch('/api/server-config');
      if (response.ok) {
        const config = await response.json();
        return { downloadEnabled: config.DownloadEnabled ?? true };
      }
      return { downloadEnabled: true };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  });

/**
 * Fetch server config (download enabled, etc.)
 */
export function useServerConfigQuery() {
  return useQuery(serverConfigOptions());
}

/**
 * Query options for version check
 */
const versionCheckOptions = () =>
  queryOptions<UpdateStatus>({
    queryKey: ['versionCheck'],
    queryFn: () => checkForUpdates(),
    staleTime: 30 * 60 * 1000, // 30 minutes - no need to check frequently
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

/**
 * Check for version updates
 */
export function useVersionCheckQuery() {
  return useQuery(versionCheckOptions());
}

interface UsePlayRecordsQueryOptions {
  enabled: boolean;
  enableFilter: boolean;
  minProgress: number;
  maxProgress: number;
}

/**
 * Fetch play records with filtering
 */
export function usePlayRecordsQuery({
  enabled,
  enableFilter,
  minProgress,
  maxProgress,
}: UsePlayRecordsQueryOptions) {
  return useQuery({
    ...playRecordsQueryOptions,
    select: (records) => {
      const recordsArray = Object.entries(records).map(([key, record]) => ({
        ...record,
        key,
      }));

      const validPlayRecords = recordsArray.filter((record) => {
        const progress =
          record.total_time === 0
            ? 0
            : (record.play_time / record.total_time) * 100;

        if (record.play_time < 120) return false;
        if (!enableFilter) return true;

        return progress >= minProgress && progress <= maxProgress;
      });

      return validPlayRecords
        .sort((a, b) => b.save_time - a.save_time)
        .slice(0, 12);
    },
    enabled,
  });
}

interface UseFavoritesQueryOptions {
  enabled: boolean;
}

/**
 * Fetch favorites list
 * 复用基础的 favoritesQueryOptions，使用 select 转换为数组格式
 * 避免重复请求 /api/favorites
 */
export function useFavoritesQuery({ enabled }: UseFavoritesQueryOptions) {
  return useQuery({
    ...favoritesQueryOptions,
    select: (data) => {
      const favoritesArray = Object.entries(data).map(([key, favorite]) => ({
        ...favorite,
        key,
      }));
      // Sort by save time descending
      return favoritesArray.sort((a, b) => b.save_time - a.save_time);
    },
    enabled,
  });
}

/**
 * Change password mutation
 * Based on TanStack Query useMutation pattern from source code
 */
export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '修改密码失败');
      }

      return data;
    },
  });
}

/**
 * Invalidate play records and favorites queries
 * Useful when external events update data
 */
export function useInvalidateUserMenuData() {
  const queryClient = useQueryClient();

  return {
    invalidatePlayRecords: () => {
      queryClient.invalidateQueries({ queryKey: ['playRecords'] });
    },
    invalidateFavorites: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['playRecords'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  };
}
