function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.get(String(key)) ?? null;
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },
    removeItem(key: string) {
      data.delete(String(key));
    },
    setItem(key: string, value: string) {
      data.set(String(key), String(value));
    },
  };
}

function ensureStorage(target: typeof globalThis) {
  try {
    Object.defineProperty(target, 'localStorage', {
      configurable: true,
      value: memoryStorage(),
    });
  } catch {
    // Some environments may expose a non-configurable storage implementation.
  }
}

ensureStorage(globalThis);
if (typeof window !== 'undefined') ensureStorage(window as unknown as typeof globalThis);
