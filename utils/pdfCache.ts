const MEMORY_CACHE = new Map<string, string>();
const STORAGE_PREFIX = 'outmail:pdf:';
const MAX_LOCAL_STORAGE_BYTES = 5 * 1024 * 1024; // 5 MB safety cap per file

const getStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Local storage unavailable for PDF cache', error);
    return null;
  }
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });

const buildStorageKey = (key: string) => `${STORAGE_PREFIX}${key}`;

export const storePdfInCache = async (key: string, file: File): Promise<string> => {
  const dataUrl = await readFileAsDataUrl(file);
  MEMORY_CACHE.set(key, dataUrl);

  const storage = getStorage();
  if (storage && file.size <= MAX_LOCAL_STORAGE_BYTES) {
    try {
      storage.setItem(buildStorageKey(key), dataUrl);
    } catch (error) {
      console.warn('Failed to store PDF in local storage cache', error);
    }
  }

  return dataUrl;
};

export const hydratePdfCache = (key: string, dataUrl: string) => {
  MEMORY_CACHE.set(key, dataUrl);
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(buildStorageKey(key), dataUrl);
    } catch (error) {
      console.warn('Failed to persist hydrated PDF cache entry', error);
    }
  }
};

export const getCachedPdf = (key?: string | null): string | null => {
  if (!key) return null;
  if (MEMORY_CACHE.has(key)) {
    return MEMORY_CACHE.get(key) || null;
  }
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  const stored = storage.getItem(buildStorageKey(key));
  if (stored) {
    MEMORY_CACHE.set(key, stored);
  }
  return stored || null;
};

export const removePdfFromCache = (key?: string | null) => {
  if (!key) return;
  MEMORY_CACHE.delete(key);
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(buildStorageKey(key));
    } catch (error) {
      console.warn('Failed to remove PDF from local storage cache', error);
    }
  }
};

export const ensureCachedPdf = (key: string | undefined, fallbackUrl?: string) => {
  if (!key || !fallbackUrl) {
    return;
  }
  if (!MEMORY_CACHE.has(key)) {
    MEMORY_CACHE.set(key, fallbackUrl);
  }
};

