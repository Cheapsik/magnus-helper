import { useState, useCallback } from "react";
import { getStorageKey } from "@/lib/campaignStorage";

export type UseLocalStorageOptions<T> = {
  revive?: (parsed: unknown) => T;
  /**
   * Set for device/UI-level preferences (theme, sidebar width, Gracz/MG mode...)
   * that are shared across all campaigns instead of being isolated per campaign.
   */
  global?: boolean;
};

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageOptions<T>,
): [T, (value: T | ((prev: T) => T)) => void] {
  const storageKey = options?.global ? key : getStorageKey(key);

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(storageKey);
      if (!item) return initialValue;
      const parsed = JSON.parse(item);
      return options?.revive ? options.revive(parsed) : (parsed as T);
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {

        }
        return next;
      });
    },
    [storageKey]
  );

  return [storedValue, setValue];
}
