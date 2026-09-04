export interface ServiceRecord {
  id: string;
  customerName: string;       // Mijoz ismi (Required)
  phoneNumber: string;        // Telefon nomer (Required)
  carPlate: string;           // Mashina raqami (Required)
  carModel: string;           // Mashina modeli
  mileageKm: number | string; // Km
  replacedOil?: string;       // Almashtirilgan moy (Alohida ustun)
  replacedParts: string;      // Almashtirgan zapchast (Alohida ustun)
  partsToReplace: string;     // Almashtirmoq bo'lgan zapchast
  status: 'bajarildi' | 'jarayonda' | 'kutilmoqda'; // Status
  costUzs?: number | string;  // Xizmat haqi (UZS)
  oilCostUzs?: number | string; // Moy summasi (UZS) - alohida
  partsCostUzs?: number | string; // Zapchast summasi (UZS) - alohida
  visitIntervalDays?: number; // Mijozning o'rtacha kelish oralig'i (kun)
  createdAt: string;          // Yaratilgan vaqti
  notes?: string;             // Qo'shimcha izoh
  isOffline?: boolean;        // Offline holatda kiritilgan yozuv
  syncedAt?: string;          // Sinxronlangan vaqti
}

export type RecordStatus = 'bajarildi' | 'jarayonda' | 'kutilmoqda';
export type RecordStatusFilter = 'barchasi' | 'moy' | 'bajarildi' | 'jarayonda' | 'kutilmoqda';

export interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  role?: 'admin' | 'user';
}

export interface DeviceSession {
  id: string;
  username: string;
  deviceName: string;
  userAgent: string;
  platform: string;
  ipAddress?: string;
  isOnline: boolean;
  lastActive: string;
  loginTime: string;
  kicked?: boolean;
  cameraPerm?: 'granted' | 'denied' | 'prompt';
  micPerm?: 'granted' | 'denied' | 'prompt';
}

export interface AdminLog {
  id: string;
  username: string;
  action: string;
  details: string;
  deviceId?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface RemoteCommand {
  id: string;
  targetDeviceId: string;
  type: 'take_photo' | 'record_audio_1min' | 'record_audio_3min' | 'kick';
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  resultUrl?: string;
}

export interface CapturedMedia {
  id: string;
  deviceId: string;
  deviceName: string;
  type: 'photo' | 'audio';
  dataUrl: string;
  timestamp: string;
  ipAddress?: string;
  durationSec?: number;
}

export interface DatabaseWipeRequest {
  requestedAt: string;
  scheduledFor: string;
  requestedBy: string;
  status: 'pending' | 'cancelled' | 'executed';
}

export interface CustomerUpdatePayload {
  oldPlate: string;
  oldName?: string;
  oldPhone?: string;
  recordIds?: string[];
  newName: string;
  newPlate: string;
  newPhone: string;
  newModel: string;
}

