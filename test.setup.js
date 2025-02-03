import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest'

// without chrome.runtime.id webextension-polyfill won't work
globalThis.chrome = { runtime: { id: 'test-id' } };

vi.mock('webextension-polyfill', () => {
  return {
    default: {
      scripting: {
        executeScript: vi.fn()
      },
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn(),
        }
      },
      tabs: {
        query: vi.fn()
      }
    }
  };
});
