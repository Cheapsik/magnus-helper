import "@testing-library/jest-dom";
import { beforeEach } from "vitest";
import { clearStorageCache } from "@/lib/storage";

// Snapshots live at module scope, so they would otherwise survive the
// localStorage.clear() that individual suites do between tests.
beforeEach(() => clearStorageCache());

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
