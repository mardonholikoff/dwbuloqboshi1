import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  query,
  orderBy,
  Firestore,
  Unsubscribe
} from 'firebase/firestore';
import firebaseConfigFile from '../../firebase-applet-config.json';
import { ServiceRecord, DatabaseWipeRequest } from '../types';

// Safely resolve configuration from import.meta.env or firebase-applet-config.json
const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : ({} as any);

const resolvedConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfigFile.projectId || '',
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfigFile.appId || '',
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfigFile.apiKey || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigFile.authDomain || '',
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || firebaseConfigFile.firestoreDatabaseId || '(default)',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigFile.storageBucket || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigFile.messagingSenderId || '',
};

export const isFirebaseConfigured = Boolean(
  resolvedConfig.apiKey &&
  resolvedConfig.projectId &&
  resolvedConfig.apiKey !== 'MY_FIREBASE_API_KEY'
);

let app: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(resolvedConfig);
    const dbId = resolvedConfig.firestoreDatabaseId && resolvedConfig.firestoreDatabaseId !== '(default)'
      ? resolvedConfig.firestoreDatabaseId
      : '(default)';
    firestoreDb = getFirestore(app, dbId);
  } catch (err) {
    console.warn('Firebase initialization error, falling back to offline mode:', err);
    firestoreDb = null;
  }
} else {
  console.info('Firebase keys not configured or removed. Running in offline-first mode.');
}

export const db = firestoreDb;

const RECORDS_COLLECTION = 'service_records';
const CATALOG_DOC_ID = 'catalog_items';

/**
 * Timeout helper to prevent any cloud promise from hanging indefinitely
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs = 5000, fallbackValue: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), timeoutMs)),
  ]);
}

/**
 * Real-time listener for all service records in Firestore with immediate local fallback.
 */
export function subscribeToRecords(
  onData: (records: ServiceRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  // 1. Immediately emit locally cached records so the user never sees an empty screen in offline/PWA mode
  try {
    const local = localStorage.getItem('daewoo_nargiz_records_v1');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        onData(parsed);
      }
    }
  } catch {}

  if (!db) {
    return () => {};
  }

  try {
    const recordsRef = collection(db, RECORDS_COLLECTION);
    const q = query(recordsRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const cloudRecords: ServiceRecord[] = [];
        snapshot.forEach((docSnap) => {
          cloudRecords.push(docSnap.data() as ServiceRecord);
        });

        // Merge with any offline pending items in localStorage
        try {
          const localSaved = localStorage.getItem('daewoo_nargiz_records_v1');
          const localList: ServiceRecord[] = localSaved ? JSON.parse(localSaved) : [];
          const unsyncedOffline = localList.filter(
            (lr) => lr.isOffline && !cloudRecords.some((cr) => cr.id === lr.id)
          );
          const merged = [...unsyncedOffline, ...cloudRecords];
          merged.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          // Save merged copy to localStorage for seamless offline restarts
          localStorage.setItem('daewoo_nargiz_records_v1', JSON.stringify(merged));
          onData(merged);
        } catch {
          onData(cloudRecords);
        }
      },
      (err) => {
        console.warn('Firestore subscription status (running in offline mode):', err.message);
        // On network failure or offline, make sure local records are served
        try {
          const local = localStorage.getItem('daewoo_nargiz_records_v1');
          if (local) {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed)) onData(parsed);
          }
        } catch {}
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    console.warn('Failed to attach Firestore listener:', err);
    return () => {};
  }
}

/**
 * Helper to strip any undefined values from record object before sending to Firestore
 */
function sanitizeRecordForFirestore(record: ServiceRecord): Record<string, any> {
  const sanitized: Record<string, any> = {};
  Object.entries(record).forEach(([key, value]) => {
    if (value !== undefined) {
      sanitized[key] = value;
    } else {
      sanitized[key] = '';
    }
  });
  return sanitized;
}

/**
 * Save or update a single record in Firestore
 */
export async function saveRecordToCloud(record: ServiceRecord): Promise<boolean> {
  if (!db) return false;

  const savePromise = (async () => {
    try {
      const docRef = doc(db, RECORDS_COLLECTION, record.id);
      const cloudRecord = sanitizeRecordForFirestore({
        ...record,
        isOffline: false,
        syncedAt: new Date().toISOString(),
      });
      await setDoc(docRef, cloudRecord, { merge: true });
      return true;
    } catch (err) {
      console.warn('Failed to save record to Firestore:', err);
      return false;
    }
  })();

  return withTimeout(savePromise, 4000, false);
}

/**
 * Delete a record from Firestore
 */
export async function deleteRecordFromCloud(recordId: string): Promise<boolean> {
  if (!db) return true;

  const deletePromise = (async () => {
    try {
      const docRef = doc(db, RECORDS_COLLECTION, recordId);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.warn('Failed to delete record from Firestore:', err);
      return false;
    }
  })();

  return withTimeout(deletePromise, 4000, true);
}

/**
 * Delete ALL service records from Firestore
 */
export async function clearAllRecordsFromCloud(): Promise<boolean> {
  if (!db) return true;

  const clearPromise = (async () => {
    try {
      const recordsRef = collection(db, RECORDS_COLLECTION);
      const snapshot = await getDocs(recordsRef);
      const batch = writeBatch(db);
      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      return true;
    } catch (err) {
      console.warn('Failed to clear records from Firestore:', err);
      return false;
    }
  })();

  return withTimeout(clearPromise, 4000, true);
}

/**
 * Batch sync offline records to Firestore
 */
export async function syncOfflineRecordsToCloud(records: ServiceRecord[]): Promise<ServiceRecord[]> {
  const offlineRecords = records.filter((r) => r.isOffline);
  if (offlineRecords.length === 0 || !db) return records;

  try {
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    offlineRecords.forEach((record) => {
      const docRef = doc(db, RECORDS_COLLECTION, record.id);
      const cloudRecord = sanitizeRecordForFirestore({
        ...record,
        isOffline: false,
        syncedAt: nowIso,
      });
      batch.set(docRef, cloudRecord, { merge: true });
    });

    await withTimeout(batch.commit(), 5000, null);

    return records.map((r) =>
      r.isOffline ? { ...r, isOffline: false, syncedAt: nowIso } : r
    );
  } catch (err) {
    console.warn('Failed batch sync to Firestore:', err);
    return records;
  }
}

/**
 * Batch update multiple records in Firestore (e.g. when customer info changes across all previous visits)
 */
export async function batchUpdateRecordsInCloud(recordsToUpdate: ServiceRecord[]): Promise<boolean> {
  if (!db || recordsToUpdate.length === 0) return true;

  const updatePromise = (async () => {
    try {
      const nowIso = new Date().toISOString();
      const chunkSize = 400; // Keep safely below Firestore 500 limit
      for (let i = 0; i < recordsToUpdate.length; i += chunkSize) {
        const chunk = recordsToUpdate.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((rec) => {
          const docRef = doc(db, RECORDS_COLLECTION, rec.id);
          const sanitized = sanitizeRecordForFirestore({
            ...rec,
            isOffline: false,
            syncedAt: nowIso,
          });
          batch.set(docRef, sanitized, { merge: true });
        });
        await batch.commit();
      }
      return true;
    } catch (err) {
      console.warn('Failed batch update records in Firestore:', err);
      return false;
    }
  })();

  return withTimeout(updatePromise, 8000, false);
}

/**
 * Catalog item management (Custom Oil types & Spare Parts)
 */
export interface CatalogData {
  customOils: string[];
  customParts: string[];
}

export function subscribeToCatalog(onData: (catalog: CatalogData) => void): Unsubscribe {
  if (!db) {
    try {
      const local = localStorage.getItem('dw_custom_catalog');
      if (local) onData(JSON.parse(local));
      else onData({ customOils: [], customParts: [] });
    } catch {
      onData({ customOils: [], customParts: [] });
    }
    return () => {};
  }

  try {
    const docRef = doc(db, 'app_settings', CATALOG_DOC_ID);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          onData({
            customOils: Array.isArray(data.customOils) ? data.customOils : [],
            customParts: Array.isArray(data.customParts) ? data.customParts : [],
          });
        } else {
          onData({ customOils: [], customParts: [] });
        }
      },
      (err) => {
        console.warn('Catalog subscription error:', err);
        try {
          const local = localStorage.getItem('dw_custom_catalog');
          if (local) onData(JSON.parse(local));
          else onData({ customOils: [], customParts: [] });
        } catch {
          onData({ customOils: [], customParts: [] });
        }
      }
    );
  } catch {
    return () => {};
  }
}

export async function saveCatalogToCloud(catalog: CatalogData): Promise<boolean> {
  try {
    localStorage.setItem('dw_custom_catalog', JSON.stringify(catalog));
  } catch {}

  if (!db) return true;

  try {
    const docRef = doc(db, 'app_settings', CATALOG_DOC_ID);
    await withTimeout(setDoc(docRef, catalog, { merge: true }), 4000, null);
    return true;
  } catch (err) {
    console.warn('Save catalog error:', err);
    return false;
  }
}

/**
 * Seed initial records into Firestore if cloud is completely empty
 */
export async function seedCloudIfEmpty(initialRecords: ServiceRecord[]): Promise<void> {
  if (!db) return;
  try {
    const batch = writeBatch(db);
    initialRecords.forEach((record) => {
      const docRef = doc(db, RECORDS_COLLECTION, record.id);
      batch.set(docRef, { ...record, isOffline: false }, { merge: true });
    });
    await withTimeout(batch.commit(), 5000, null);
  } catch (err) {
    console.warn('Failed to seed cloud database:', err);
  }
}

const WIPE_REQUEST_DOC_ID = 'wipe_request';
const LOCAL_STORAGE_WIPE_KEY = 'dw_wipe_request_state';

/**
 * Real-time listener for database wipe request (1 hour delayed deletion)
 */
export function subscribeToWipeRequest(onData: (request: DatabaseWipeRequest | null) => void): Unsubscribe {
  // 1. Initial emit from localStorage
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_WIPE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      onData(parsed);
    } else {
      onData(null);
    }
  } catch {
    onData(null);
  }

  if (!db) {
    return () => {};
  }

  try {
    const docRef = doc(db, 'app_settings', WIPE_REQUEST_DOC_ID);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as DatabaseWipeRequest;
          if (data && data.status === 'pending') {
            try {
              localStorage.setItem(LOCAL_STORAGE_WIPE_KEY, JSON.stringify(data));
            } catch {}
            onData(data);
          } else {
            try {
              localStorage.removeItem(LOCAL_STORAGE_WIPE_KEY);
            } catch {}
            onData(null);
          }
        } else {
          try {
            localStorage.removeItem(LOCAL_STORAGE_WIPE_KEY);
          } catch {}
          onData(null);
        }
      },
      (err) => {
        console.warn('Wipe request subscription error:', err);
        try {
          const local = localStorage.getItem(LOCAL_STORAGE_WIPE_KEY);
          if (local) onData(JSON.parse(local));
          else onData(null);
        } catch {
          onData(null);
        }
      }
    );
  } catch (err) {
    console.warn('Failed to attach wipe request listener:', err);
    return () => {};
  }
}

/**
 * Start a 1-hour database wipe request
 */
export async function startDatabaseWipeRequest(requestedBy: string = 'admindw'): Promise<DatabaseWipeRequest> {
  const now = new Date();
  const scheduledTime = new Date(now.getTime() + 60 * 60 * 1000); // exactly 1 hour (3600000 ms)

  const wipeReq: DatabaseWipeRequest = {
    requestedAt: now.toISOString(),
    scheduledFor: scheduledTime.toISOString(),
    requestedBy,
    status: 'pending',
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_WIPE_KEY, JSON.stringify(wipeReq));
  } catch {}

  if (db) {
    try {
      const docRef = doc(db, 'app_settings', WIPE_REQUEST_DOC_ID);
      await withTimeout(setDoc(docRef, wipeReq), 4000, null);
    } catch (err) {
      console.warn('Failed to save wipe request in cloud:', err);
    }
  }

  return wipeReq;
}

/**
 * Cancel a pending database wipe request
 */
export async function cancelDatabaseWipeRequest(): Promise<boolean> {
  try {
    localStorage.removeItem(LOCAL_STORAGE_WIPE_KEY);
  } catch {}

  if (db) {
    try {
      const docRef = doc(db, 'app_settings', WIPE_REQUEST_DOC_ID);
      await withTimeout(deleteDoc(docRef), 4000, null);
    } catch (err) {
      console.warn('Failed to delete wipe request from cloud:', err);
    }
  }

  return true;
}

/**
 * Execute actual wipe after 1-hour delay confirmed
 */
export async function executeDatabaseWipe(): Promise<boolean> {
  // 1. Cancel/delete wipe request doc
  await cancelDatabaseWipeRequest();

  // 2. Clear cloud records
  const result = await clearAllRecordsFromCloud();

  // 3. Clear local storage records
  try {
    localStorage.removeItem('daewoo_nargiz_records_v1');
  } catch {}

  return result;
}

