import { useCallback, useRef, useSyncExternalStore } from "react";
import {
  getSnapshot,
  resolveStorageKey,
  subscribe,
  writeJson,
  type StorageOptions,
} from "@/lib/storage";

export type UseLocalStorageOptions<T> = StorageOptions<T>;

/**
 * Campaign-scoped persistent state.
 *
 * Every instance pointing at the same key shares one value: writes from
 * another component, from imperative code in `@/lib/storage`, or from another
 * browser tab all land here.
 *
 * `initialValue` is only a fallback for a key that has never been written; the
 * first instance to read a missing key decides what the others see.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageOptions<T>,
): [T, (value: T | ((prev: T) => T)) => void] {
  // Call sites pass these inline, so their identity changes every render —
  // keep them in a ref and key the memos off the resolved storage key instead.
  const latest = useRef({ initialValue, options });
  latest.current = { initialValue, options };

  const storageKey = resolveStorageKey(key, options);

  const subscribeToKey = useCallback(
    (listener: () => void) => subscribe(key, listener, latest.current.options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storageKey],
  );

  const read = useCallback(
    () => getSnapshot(key, latest.current.initialValue, latest.current.options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storageKey],
  );

  const storedValue = useSyncExternalStore(subscribeToKey, read, read);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      const { initialValue: fallback, options: opts } = latest.current;
      const prev = getSnapshot(key, fallback, opts);
      const next = value instanceof Function ? value(prev) : value;
      writeJson(key, next, opts);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storageKey],
  );

  return [storedValue, setValue];
}
