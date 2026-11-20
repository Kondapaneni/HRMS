import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { memoryQueryClient } from '../query/memoryClient.js';
import { getRemoteRetention } from '../query/retentionPolicy.js';

/**
 * Mounted-view requests use TanStack Query. Most sensitive HRMS data remains
 * fresh per mount; only explicitly allowlisted reference views may retain
 * safe results temporarily in memory. Nothing persists to browser storage.
 * - Reload notifications reach only currently mounted views.
 * - Auth logout aborts and clears mounted private views immediately.
 *
 * This is intentionally separate from route/code preloading. It is NOT a
 * persisted or shared query layer.
 */
const mountedViews = new Set();
const listeners = new Set();
const resetListeners = new Set();
let sessionEpoch = 0;
let mountedViewSerial = 0;
const EMPTY_REMOTE_VALUE = Object.freeze({ kind: 'hrms-undefined-remote-result' });
const unpack = value => value === EMPTY_REMOTE_VALUE ? undefined : value;

const asParts = value => Array.isArray(value) ? value : value == null ? [] : [value];
const matches = (viewParts, prefix) => {
  const requested = asParts(prefix);
  return requested.length <= viewParts.length &&
    requested.every((part, i) => JSON.stringify(part) === JSON.stringify(viewParts[i]));
};
const emit = () => {
  for (const listener of [...listeners]) {
    try { listener(); } catch { /* listeners must not break request completion */ }
  }
};

const controller = Object.freeze({
  refresh(filter = {}) {
    const prefix = Array.isArray(filter) ? filter : filter?.scope;
    // Mutations must also invalidate safe references from pages not mounted.
    const invalidated = memoryQueryClient.invalidateQueries({
      predicate: query => query.meta?.hrmsRetained === true &&
        matches(query.meta.scope, prefix),
      refetchType: 'none',
    });
    const refreshed = Promise.all([...mountedViews]
      .filter(view => matches(view.scope, prefix))
      .map(view => view.reload()));
    return Promise.all([invalidated, refreshed]).then(() => undefined);
  },
  peek(scope) {
    return [...mountedViews].find(view => matches(view.scope, scope) &&
      matches(asParts(scope), view.scope))?.read();
  },
  update(scope, value) {
    for (const view of [...mountedViews]) {
      if (matches(view.scope, scope) && matches(asParts(scope), view.scope)) {
        view.update(value);
      }
    }
    emit();
  },
  cancel(filter = {}) {
    const prefix = Array.isArray(filter) ? filter : filter?.scope;
    for (const view of [...mountedViews]) {
      if (matches(view.scope, prefix)) view.cancel();
    }
    return Promise.resolve();
  },
  reset() {
    sessionEpoch += 1;
    for (const view of [...mountedViews]) view.reset();
    for (const listener of [...resetListeners]) listener();
    emit();
  },
  getState(scope) {
    return [...mountedViews].find(view => matches(view.scope, scope) &&
      matches(asParts(scope), view.scope))?.state();
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
});

export function useRefreshControl() {
  return controller;
}

/**
 * TanStack Query owns the lifecycle of all mounted HRMS read views. Private,
 * live data normally uses unique mount keys, staleTime 0 and gcTime 0.
 * Only the reviewed holiday scopes reuse data across mounts, with short TTLs.
 *
 * The legacy controller surface is retained for existing page mutation
 * handlers, so migration does not change route workflows or their security
 * assumptions. Branch references and published job listings use separately
 * audited reference queries.
 */
export function useRemoteData(options) {
  const { scope = [], pollEveryMs = false,
    reloadOnFocus = true, reloadInBackground = false } = options;
  const when = options.when ?? options.enabled ?? true;
  const scopeId = JSON.stringify(scope);
  const retention = getRemoteRetention(scope);
  const viewId = useRef(null);
  if (viewId.current === null) viewId.current = ++mountedViewSerial;
  const latestOptions = useRef(options);
  latestOptions.current = options;
  const [blockedAfterReset, setBlockedAfterReset] = useState(false);
  const [deniedError, setDeniedError] = useState(null);
  const queryClient = useQueryClient();
  const active = Boolean(when && !blockedAfterReset && !deniedError);
  const activeRef = useRef(active);
  activeRef.current = active;

  // The epoch changes synchronously before a logout or account transition.
  // A key never identifies two different mounted views or session epochs.
  const queryKey = retention
    ? ['hrms', 'retained-read', 'v1', sessionEpoch, scopeId]
    : ['hrms', 'mounted-read', 'v1', sessionEpoch, viewId.current, scopeId];
  const queryId = JSON.stringify(queryKey);

  const query = useQuery({
    queryKey,
    enabled: active,
    staleTime: retention?.staleTime ?? 0,
    gcTime: retention?.gcTime ?? 0,
    meta: retention ? { hrmsRetained: true, scope: asParts(scope) } : undefined,
    retry: false,
    networkMode: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: retention ? true : 'always',
    queryFn: async ({ signal }) => {
      const epoch = sessionEpoch;
      try {
        const loaded = await latestOptions.current.load({
          signal, scope: latestOptions.current.scope,
        });
        // An in-flight reply must not resurrect data after auth reset.
        if (epoch !== sessionEpoch || signal.aborted) {
          throw new Error('Request invalidated by session transition');
        }
        // React Query disallows undefined as a successful response.
        return loaded === undefined ? EMPTY_REMOTE_VALUE : loaded;
      } catch (error) {
        if (epoch === sessionEpoch && !signal.aborted &&
            [401, 403].includes(error?.response?.status)) {
          // A revoked view must never display its earlier successful result.
          // Remove that payload before the denied query is disabled.
          queryClient.setQueryData(queryKey, EMPTY_REMOTE_VALUE);
          setDeniedError(error);
          latestOptions.current.onError?.(error);
        }
        throw error;
      }
    },
  });

  const getData = useCallback(() => {
    const current = queryClient.getQueryState(queryKey);
    if (deniedError || current?.status === 'error') return undefined;
    return unpack(current?.data);
  }, [queryClient, queryId, deniedError]);
  const refetchRef = useRef(query.refetch);
  refetchRef.current = query.refetch;

  const reload = useCallback(async () => {
    if (!activeRef.current) return { data: getData(), error: deniedError };
    const result = await refetchRef.current({ cancelRefetch: true });
    return { data: unpack(result.data), error: result.error };
  }, [getData, deniedError]);

  const cancel = useCallback(() => {
    void queryClient.cancelQueries({ queryKey, exact: true });
  }, [queryClient, queryId]);

  const update = useCallback(value => {
    if (!activeRef.current) return;
    queryClient.setQueryData(queryKey, previous => {
      const current = unpack(previous);
      const next = typeof value === 'function' ? value(current) : value;
      return next === undefined ? EMPTY_REMOTE_VALUE : next;
    });
    emit();
  }, [queryClient, queryId]);

  const reset = useCallback(() => {
    // Never permit the mounted page to refetch during/after account logout.
    activeRef.current = false;
    setBlockedAfterReset(true);
    cancel();
    queryClient.removeQueries({ queryKey, exact: true });
  }, [cancel, queryClient, queryId]);

  const value = active && !query.isError ? unpack(query.data) : undefined;
  const visibleDenial = blockedAfterReset ? null : deniedError;
  const visibleState = {
    ...query,
    data: value,
    error: visibleDenial || (active ? query.error : null),
    status: blockedAfterReset ? 'pending' : visibleDenial ? 'error' : when ? query.status : 'idle',
    isPending: blockedAfterReset ? true : visibleDenial ? false : when ? query.isPending : false,
    isLoading: active && query.isLoading,
    isFetching: active && query.isFetching,
    isError: Boolean(visibleDenial) || (active && query.isError),
    isSuccess: active && query.isSuccess,
    refetch: reload,
  };
  const stateRef = useRef(visibleState);
  stateRef.current = visibleState;

  useEffect(() => {
    const view = {
      scope: asParts(scope), reload, cancel, update,
      read: getData, state: () => stateRef.current, reset,
    };
    mountedViews.add(view);
    return () => {
      mountedViews.delete(view);
      cancel();
    };
  }, [scopeId, reload, cancel, update, getData, reset]);

  // TanStack Query v5 removed onSuccess/onError from useQuery. Preserve
  // the existing page callback contract, once per completed request.
  const callbackRef = useRef({ success: '', error: '' });
  useEffect(() => {
    if (!active) return;
    if (query.isSuccess && query.dataUpdatedAt) {
      const stamp = queryId + ':' + query.dataUpdatedAt;
      if (callbackRef.current.success !== stamp) {
        callbackRef.current.success = stamp;
        latestOptions.current.onSuccess?.(unpack(query.data));
      }
    }
    if (query.isError && query.errorUpdatedAt) {
      const stamp = queryId + ':' + query.errorUpdatedAt;
      if (callbackRef.current.error !== stamp) {
        callbackRef.current.error = stamp;
        latestOptions.current.onError?.(query.error);
      }
    }
    emit();
  }, [active, queryId, query.isSuccess, query.isError,
    query.dataUpdatedAt, query.errorUpdatedAt]);

  useEffect(() => {
    if (!reloadOnFocus) return;
    const onFocus = () => {
      if (document.visibilityState !== 'visible' || !activeRef.current) return;
      const state = queryClient.getQueryState(queryKey);
      // A focus event and visibilitychange may fire together. Never send
      // duplicate authorized GETs while the same view is already fetching.
      if (state?.fetchStatus === 'fetching') return;
      // Retained reference data follows its real TTL on window focus.
      // Explicit invalidation bypasses freshness immediately.
      if (retention && state?.dataUpdatedAt && !state.isInvalidated &&
          Date.now() - state.dataUpdatedAt < retention.staleTime) return;
      void reload();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [reloadOnFocus, reload, queryClient, queryId, retention?.staleTime]);

  useEffect(() => {
    if (!pollEveryMs || !active) return;
    const ms = typeof pollEveryMs === 'number' ? pollEveryMs : 0;
    if (ms < 1000) return;
    const timer = setInterval(() => {
      if (reloadInBackground || document.visibilityState === 'visible') {
        void reload();
      }
    }, ms);
    return () => clearInterval(timer);
  }, [pollEveryMs, active, reload, reloadInBackground]);

  return visibleState;
}

export function useRemoteTask(options) {
  const latest = useRef(options);
  latest.current = options;
  // Route mutation execution through TanStack Query without globally retaining
  // private mutation results or changing legacy callback / epoch semantics.
  const mutation = useMutation({
    mutationFn: variables => latest.current.run(variables),
    retry: false,
    gcTime: 0,
    networkMode: 'always',
  });
  const runMutation = mutation.mutateAsync;
  const [state, setState] = useState({
    data: undefined, error: null, isPending: false, isLoading: false,
    status: 'idle',
  });
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const clear = () => {
      if (mounted.current) setState({
        data: undefined, error: null, isPending: false, isLoading: false,
        status: 'idle',
      });
    };
    resetListeners.add(clear);
    return () => {
      mounted.current = false;
      resetListeners.delete(clear);
    };
  }, []);
  const mutateAsync = useCallback(async (variables, perCall = {}) => {
    const startedInEpoch = sessionEpoch;
    if (mounted.current) setState(s => ({
      ...s, isPending: true, isLoading: true, error: null, status: 'pending',
    }));
    let context, result, failure;
    try {
      context = await latest.current.onMutate?.(variables);
      result = await runMutation(variables);
      if (startedInEpoch !== sessionEpoch) return undefined;
      // Even an off-screen reference must be stale after a successful mutation.
      await memoryQueryClient.invalidateQueries({
        predicate: query => query.meta?.hrmsRetained === true ||
          query.meta?.hrmsPublishedJobs === true,
        refetchType: 'none',
      });
      await latest.current.onSuccess?.(result, variables, context);
      await perCall.onSuccess?.(result, variables, context);
      if (mounted.current) setState({
        data: result, error: null, isPending: false, isLoading: false,
        status: 'success',
      });
      return result;
    } catch (error) {
      if (startedInEpoch !== sessionEpoch) throw error;
      failure = error;
      await latest.current.onError?.(error, variables, context);
      await perCall.onError?.(error, variables, context);
      if (mounted.current) setState(s => ({
        ...s, error, isPending: false, isLoading: false, status: 'error',
      }));
      throw error;
    } finally {
      if (startedInEpoch === sessionEpoch) {
        await latest.current.onSettled?.(result, failure, variables, context);
        await perCall.onSettled?.(result, failure, variables, context);
      }
    }
  }, [runMutation]);
  const mutate = useCallback((variables, perCall) => {
    void mutateAsync(variables, perCall).catch(() => {
      // Promise rejection is delivered by mutateAsync or onError callbacks.
    });
  }, [mutateAsync]);
  const reset = useCallback(() => {
    mutation.reset();
    setState({ data: undefined, error: null, isPending: false, isLoading: false,
      status: 'idle' });
  }, [mutation]);
  return { ...state, mutate, mutateAsync, reset };
}
