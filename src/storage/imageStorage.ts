/**
 * Local-only IndexedDB image storage.
 * Keeps user images securely in browser storage without any server uploads.
 */

const DB_NAME = 'sahasra_single_db';
const DB_VERSION = 1;
const STORE_NAME = 'cached_images';
const KEY_CURRENT_IMAGE = 'current_active_image';

export interface StoredImageRecord {
  id: string;
  blob: Blob;
  name: string;
  type: string;
  width: number;
  height: number;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves an image to local IndexedDB.
 */
export async function saveActiveImage(
  blob: Blob,
  name: string,
  width: number,
  height: number
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredImageRecord = {
        id: KEY_CURRENT_IMAGE,
        blob,
        name,
        type: blob.type,
        width,
        height,
        timestamp: Date.now(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save image to IndexedDB:', err);
  }
}

/**
 * Loads the active image from local IndexedDB.
 */
export async function loadActiveImage(): Promise<StoredImageRecord | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_CURRENT_IMAGE);
      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to load image from IndexedDB:', err);
    return null;
  }
}

/**
 * Clears the active image from local IndexedDB.
 */
export async function clearActiveImage(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(KEY_CURRENT_IMAGE);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to clear active image from IndexedDB:', err);
  }
}
