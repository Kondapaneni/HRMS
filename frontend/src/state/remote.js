import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Mounted-view request state. There is deliberately NO data cache:
 * - Every mounting view loads its own fresh server data.
 * - No data is retained when a view unmounts, in browser storage, or across users.
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
    return Promise.all([...mountedViews].filter(view => matches(view.scope, prefix))
      .map(view => view.reload())).then(() => undefined);
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

export function useRemoteData(options) {
  const { scope = [], pollEveryMs = false,
    reloadOnFocus = true, reloadInBackground = false } = options;
  const when = options.when ?? options.enabled ?? true;
  const scopeId = JSON.stringify(scope);
  const latestOptions = useRef(options);
  latestOptions.current = options;
  const [state, setState] = useState({
    scopeId, data: undefined, error: null, status: 'pending',
    isLoading: Boolean(when), isPending: true, isFetching: false,
  });
  const dataRef = useRef(undefined);
  const stateRef = useRef(state);
  const requestRef = useRef({ counter: 0, abort: null, active: false });

  const change = useCallback(next => {
    stateRef.current = { ...stateRef.current, ...next };
    setState(stateRef.current);
    emit();
  }, []);

  const cancel = useCallback(() => {
    requestRef.current.counter += 1;
    requestRef.current.abort?.abort();
    requestRef.current.abort = null;
  }, []);

  const update = useCallback(value => {
    const updated = typeof value === 'function' ? value(dataRef.current) : value;
    dataRef.current = updated;
    change({ data: updated, error: null, status: 'success',
      isPending: false, isLoading: false, isFetching: false });
  }, [change]);

  const reload = useCallback(async () => {
    if (!requestRef.current.active || (latestOptions.current.when ?? latestOptions.current.enabled ?? true) === false) {
      return { data: dataRef.current };
    }
    cancel();
    const serial = requestRef.current.counter;
    const epoch = sessionEpoch;
    const abort = new AbortController();
    requestRef.current.abort = abort;
    change({ isFetching: true, isLoading: dataRef.current === undefined,
      isPending: dataRef.current === undefined, error: null,
      status: dataRef.current === undefined ? 'pending' : 'success' });
    try {
      const loaded = await latestOptions.current.load({
        signal: abort.signal, scope: latestOptions.current.scope,
      });
      if (requestRef.current.counter !== serial || epoch !== sessionEpoch ||
          !requestRef.current.active) return { data: undefined };
      dataRef.current = loaded;
      change({ data: loaded, isFetching: false, isLoading: false,
        isPending: false, status: 'success', error: null });
      latestOptions.current.onSuccess?.(loaded);
      return { data: loaded };
    } catch (error) {
      if (requestRef.current.counter !== serial || epoch !== sessionEpoch ||
          !requestRef.current.active) return { data: undefined };
      change({ isFetching: false, isLoading: false, isPending: false,
        status: 'error', error });
      latestOptions.current.onError?.(error);
      return { data: undefined, error };
    } finally {
      if (requestRef.current.counter === serial) requestRef.current.abort = null;
    }
  }, [cancel, change]);

  useEffect(() => {
    // A route remount or changed scope never inherits another view's response.
    dataRef.current = undefined;
    change({ scopeId, data: undefined, error: null, isFetching: false,
      isLoading: Boolean(when), isPending: true, status: 'pending' });
    requestRef.current.active = true;
    const view = {
      scope: asParts(scope),
      reload, cancel, update,
      read: () => dataRef.current,
      state: () => stateRef.current,
      reset: () => {
        cancel();
        dataRef.current = undefined;
        change({ data: undefined, error: null, status: 'pending',
          isPending: true, isFetching: false, isLoading: false });
      },
    };
    mountedViews.add(view);
    if (when) void reload();
    else change({ isLoading: false, isPending: false, status: 'idle' });
    const focus = () => {
      if (reloadOnFocus && document.visibilityState === 'visible' && when) {
        void reload();
      }
    };
    if (reloadOnFocus) {
      window.addEventListener('focus', focus);
      document.addEventListener('visibilitychange', focus);
    }
    return () => {
      mountedViews.delete(view);
      requestRef.current.active = false;
      cancel();
      if (reloadOnFocus) {
        window.removeEventListener('focus', focus);
        document.removeEventListener('visibilitychange', focus);
      }
    };
  }, [scopeId, when, reload, cancel, change, update, reloadOnFocus]);

  useEffect(() => {
    if (!pollEveryMs || !when) return;
    const ms = typeof pollEveryMs === 'number' ? pollEveryMs : 0;
    if (ms < 1000) return;
    const timer = setInterval(() => {
      if (reloadInBackground || document.visibilityState === 'visible') void reload();
    }, ms);
    return () => clearInterval(timer);
  }, [pollEveryMs, when, reload, reloadInBackground]);

  // A changed identity/scope must never render the prior view's private response
  // even for one render before the new effect starts its fresh request.
  const visible = state.scopeId === scopeId ? state : {
    data: undefined, error: null, status: when ? 'pending' : 'idle',
    isLoading: Boolean(when), isPending: Boolean(when), isFetching: false,
  };
  return { ...visible, refetch: reload };
}

export function useRemoteTask(options) {
  const latest = useRef(options);
  latest.current = options;
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
      result = await latest.current.run(variables);
      if (startedInEpoch !== sessionEpoch) return undefined;
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
  }, []);
  const mutate = useCallback((variables, perCall) => {
    void mutateAsync(variables, perCall).catch(() => {
      // Promise rejection is delivered by mutateAsync or onError callbacks.
    });
  }, [mutateAsync]);
  const reset = useCallback(() => {
    setState({ data: undefined, error: null, isPending: false, isLoading: false,
      status: 'idle' });
  }, []);
  return { ...state, mutate, mutateAsync, reset };
}
