import React, { useState, useEffect } from 'react';
import { ServiceRecord, AuthState, CustomerUpdatePayload } from './types';
import { INITIAL_RECORDS } from './data/initialData';
import { LoginForm } from './components/LoginForm';
import { Header } from './components/Header';
import { PWAInstallBar } from './components/PWAInstallBar';
import { StatsBar } from './components/StatsBar';
import { RecordsList } from './components/RecordsList';
import { RecordFormModal } from './components/RecordFormModal';
import { CustomerHistoryModal } from './components/CustomerHistoryModal';
import { PrintReceiptModal } from './components/PrintReceiptModal';
import { ExportImportModal } from './components/ExportImportModal';
import { OverdueOilModal } from './components/OverdueOilModal';
import { FullAnalyticsModal } from './components/FullAnalyticsModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { AdminStandaloneDashboard } from './components/AdminStandaloneDashboard';
import { Wrench, Check, AlertCircle, Plus } from 'lucide-react';
import {
  subscribeToRecords,
  saveRecordToCloud,
  batchUpdateRecordsInCloud,
  deleteRecordFromCloud,
  clearAllRecordsFromCloud,
  syncOfflineRecordsToCloud,
} from './lib/firebase';
import {
  updateSessionHeartbeat,
  subscribeToPendingCommands,
  subscribeToMySession,
  updateCommandStatus,
  getOrCreateDeviceId,
  createAdminLog,
  setSessionOffline,
  clearSessionKick,
} from './lib/adminSession';
import { getOverdueOilCustomers } from './lib/oilUtils';

const STORAGE_KEY_AUTH = 'daewoo_nargiz_auth_state_v1';
const STORAGE_KEY_RECORDS = 'daewoo_nargiz_records_v1';

export default function App() {
  // Auth state
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return { isAuthenticated: false, username: null };
  });

  // Online / Offline network state
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);

  // Records database state
  const [records, setRecords] = useState<ServiceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
  const [printingRecord, setPrintingRecord] = useState<ServiceRecord | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isOverdueOilModalOpen, setIsOverdueOilModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Active Device Session Heartbeat & Realtime Kick Monitor
  useEffect(() => {
    if (!auth.isAuthenticated) return;

    const currentUsername = auth.username || 'daewoobuloqboshi';
    const myDeviceId = getOrCreateDeviceId();

    // Register active heartbeat immediately upon page load/mount
    updateSessionHeartbeat(currentUsername);

    // Heartbeat every 10 seconds
    const interval = setInterval(() => {
      updateSessionHeartbeat(auth.username || 'daewoobuloqboshi');
    }, 10000);

    // Listen to my own session doc for kicked status
    let isKickedTriggered = false;
    const unsubMySession = subscribeToMySession(myDeviceId, () => {
      if (isKickedTriggered) return;
      isKickedTriggered = true;
      try { alert("Sizning qurilmangiz admin tomonidan majburiy chiqarib yuborildi!"); } catch {}
      handleLogout();
    });

    // Listen to pending remote commands for this device (e.g. kick)
    const unsubCmds = subscribeToPendingCommands(myDeviceId, async (cmd) => {
      if (cmd.type === 'kick') {
        if (!isKickedTriggered) {
          isKickedTriggered = true;
          try { alert("Sizning qurilmangiz admin tomonidan majburiy chiqarib yuborildi!"); } catch {}
          handleLogout();
        }
        await updateCommandStatus(cmd.id, 'completed');
      }
    });

    return () => {
      clearInterval(interval);
      unsubMySession();
      unsubCmds();
    };
  }, [auth]);

  // Customer history view state
  const [selectedCustomerPlate, setSelectedCustomerPlate] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | undefined>(undefined);

  // Real-time Firestore Cloud Subscription & Initial auto-sync
  useEffect(() => {
    let isSubscribed = true;

    // Initial auto-sync if we are online and have pending offline records
    if (navigator.onLine) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
        if (saved) {
          const current: ServiceRecord[] = JSON.parse(saved);
          const offlineItems = current.filter((r) => r.isOffline);
          if (offlineItems.length > 0) {
            syncOfflineRecordsToCloud(current)
              .then((synced) => {
                if (isSubscribed) {
                  setRecords(synced);
                }
              })
              .catch(() => {});
          }
        }
      } catch {}
    }

    const unsubscribe = subscribeToRecords(
      (cloudRecords) => {
        if (!isSubscribed) return;

        setRecords((localRecords) => {
          const unsyncedLocal = localRecords.filter(
            (lr) => lr.isOffline && !cloudRecords.some((cr) => cr.id === lr.id)
          );
          const combined = [...unsyncedLocal, ...cloudRecords];
          // Sort by createdAt descending
          combined.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          return combined;
        });
      },
      (err) => {
        console.warn('Firestore sync status:', err.message);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  // Handle Online / Offline network changes and auto sync
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      showToast("🟢 Internet ulandi! Bulutli baza bilan bog'lanmoqda...", 'success');

      // Sync any offline records to Firestore automatically
      try {
        const currentSaved = localStorage.getItem(STORAGE_KEY_RECORDS);
        const currentRecords: ServiceRecord[] = currentSaved ? JSON.parse(currentSaved) : records;
        const offlineList = currentRecords.filter((r) => r.isOffline);

        if (offlineList.length > 0) {
          const syncedList = await syncOfflineRecordsToCloud(currentRecords);
          setRecords(syncedList);
          showToast(`🟢 ${offlineList.length} ta offline yozuv avtomatik bulutli bazaga sinxronlandi!`, 'success');
        }
      } catch (e) {
        console.error('Auto sync error:', e);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast("🔴 Internet uzildi: Offline rejim. Ma'lumotlar qurilma xotirasida saqlanadi.", 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cross-tab and cross-PWA real-time sync on the same browser/device
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_RECORDS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setRecords(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorage);
    };
  }, [records]);

  // Save auth to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(auth));
    } catch (e) {
      console.error('Failed to save auth state:', e);
    }
  }, [auth]);

  // Save records to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save records state:', e);
    }
  }, [records]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Login handler
  const handleLoginSuccess = (username: string) => {
    try {
      localStorage.setItem('dw_login_time', new Date().toISOString());
    } catch {}
    setAuth({ isAuthenticated: true, username });
    showToast(`Xush kelibsiz, ${username}! Tizimga muvaffaqiyatli kirdingiz.`, 'success');

    // Run background device heartbeat and audit logging asynchronously
    const myDeviceId = getOrCreateDeviceId();
    clearSessionKick(myDeviceId).catch(() => {});
    createAdminLog(
      "Tizimga Kirildi (Login)",
      `Foydalanuvchi "${username}" tizimga kirdi`,
      username
    ).catch(() => {});
  };

  // Logout handler
  const handleLogout = () => {
    const activeUser = auth.username || 'daewoobuloqboshi';
    const myDeviceId = getOrCreateDeviceId();
    setSessionOffline(myDeviceId).catch(() => {});

    setAuth({ isAuthenticated: false, username: null });
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    } catch {}
    showToast('Tizimdan chiqildi.', 'info');
    createAdminLog("Tizimdan Chiqildi", `Foydalanuvchi "${activeUser}" tizimdan chiqdi`, activeUser).catch(() => {});
  };

  // Save/Create Record
  const handleSaveRecord = async (
    recordData: Omit<ServiceRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ) => {
    const isNowOffline = !navigator.onLine;
    const currentUser = auth.username || 'daewoobuloqboshi';

    if (recordData.id) {
      // Edit existing
      const existing = records.find((r) => r.id === recordData.id);
      const updatedRecord: ServiceRecord = {
        id: recordData.id,
        createdAt: recordData.createdAt || existing?.createdAt || new Date().toISOString(),
        customerName: recordData.customerName || '',
        phoneNumber: recordData.phoneNumber || '',
        carPlate: recordData.carPlate || '',
        carModel: recordData.carModel || '',
        mileageKm: recordData.mileageKm ? Number(recordData.mileageKm) : 0,
        replacedOil: recordData.replacedOil || '',
        replacedParts: recordData.replacedParts || '',
        partsToReplace: recordData.partsToReplace || '',
        status: recordData.status || 'bajarildi',
        costUzs: recordData.costUzs ? Number(recordData.costUzs) : 0,
        oilCostUzs: recordData.oilCostUzs !== undefined && recordData.oilCostUzs !== '' ? Number(recordData.oilCostUzs) : undefined,
        partsCostUzs: recordData.partsCostUzs !== undefined && recordData.partsCostUzs !== '' ? Number(recordData.partsCostUzs) : undefined,
        visitIntervalDays: recordData.visitIntervalDays ? Number(recordData.visitIntervalDays) : undefined,
        notes: recordData.notes || '',
        isOffline: isNowOffline,
        syncedAt: isNowOffline ? '' : new Date().toISOString(),
      };

      setRecords((prev) => {
        const next = prev.map((item) => (item.id === recordData.id ? updatedRecord : item));
        try {
          localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(next));
        } catch {}
        return next;
      });

      if (!isNowOffline) {
        saveRecordToCloud(updatedRecord);
        showToast(`${recordData.customerName} uchun ma'lumotlar yangilandi va bulutga saqlandi!`, 'success');
      } else {
        showToast(`⚡ Offline rejimda yangilandi (${recordData.carPlate}). Online bo'lganda sinxronlanadi.`, 'info');
      }

      await createAdminLog(
        "Xizmat Tahrirlandi",
        `Mijoz: ${updatedRecord.customerName}, Avto: ${updatedRecord.carPlate}, Summa: ${updatedRecord.costUzs.toLocaleString()} so'm, Ishlar: ${updatedRecord.replacedParts}`,
        currentUser
      );
    } else {
      // Create new
      const generatedId = `rec-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newRecord: ServiceRecord = {
        id: generatedId,
        createdAt: recordData.createdAt || new Date().toISOString(),
        customerName: recordData.customerName || '',
        phoneNumber: recordData.phoneNumber || '',
        carPlate: recordData.carPlate || '',
        carModel: recordData.carModel || '',
        mileageKm: recordData.mileageKm ? Number(recordData.mileageKm) : 0,
        replacedOil: recordData.replacedOil || '',
        replacedParts: recordData.replacedParts || '',
        partsToReplace: recordData.partsToReplace || '',
        status: recordData.status || 'bajarildi',
        costUzs: recordData.costUzs ? Number(recordData.costUzs) : 0,
        oilCostUzs: recordData.oilCostUzs !== undefined && recordData.oilCostUzs !== '' ? Number(recordData.oilCostUzs) : undefined,
        partsCostUzs: recordData.partsCostUzs !== undefined && recordData.partsCostUzs !== '' ? Number(recordData.partsCostUzs) : undefined,
        visitIntervalDays: recordData.visitIntervalDays ? Number(recordData.visitIntervalDays) : undefined,
        notes: recordData.notes || '',
        isOffline: isNowOffline,
        syncedAt: isNowOffline ? '' : new Date().toISOString(),
      };

      setRecords((prev) => {
        const next = [newRecord, ...prev];
        try {
          localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(next));
        } catch {}
        return next;
      });

      if (isNowOffline) {
        showToast(`⚡ Offline rejimda saqlandi (${recordData.carPlate}). Online bo'lganda sinxronlanadi.`, 'info');
      } else {
        saveRecordToCloud(newRecord).then((ok) => {
          if (!ok) {
            setRecords((prev) => prev.map((r) => (r.id === generatedId ? { ...r, isOffline: true } : r)));
            showToast(`⚠️ Tarmoq xatosi: Yozuv qurilmada offline saqlandi (${recordData.carPlate}).`, 'info');
          }
        });
        showToast(`Yangi xizmat yozuvi bulutli bazaga qo'shildi! (${recordData.carPlate})`, 'success');
      }

      await createAdminLog(
        "Yangi Xizmat Qo'shildi",
        `Mijoz: ${newRecord.customerName}, Avto: ${newRecord.carPlate}, Summa: ${newRecord.costUzs.toLocaleString()} so'm, Bajarilgan: ${newRecord.replacedParts || newRecord.replacedOil || 'almashtirish'}`,
        currentUser
      );
    }
  };

  // Sync single offline record
  const handleSyncRecord = async (id: string) => {
    if (!navigator.onLine) {
      showToast("🔴 Hali ham internet yo'q (Offline)! Sinxronlash faqat internet bog'langanda bajariladi.", 'error');
      return;
    }

    const target = records.find((r) => r.id === id);
    if (!target) return;

    const syncedRecord = { ...target, isOffline: false, syncedAt: new Date().toISOString() };
    const success = await saveRecordToCloud(syncedRecord);

    if (success) {
      setRecords((prev) => prev.map((r) => (r.id === id ? syncedRecord : r)));
      showToast('🟢 Xizmat yozuvi muvaffaqiyatli bulutga sinxronlandi!', 'success');
    } else {
      showToast('❌ Sinxronlashda xatolik yuz berdi. Internetni tekshiring.', 'error');
    }
  };

  // Sync all offline records
  const handleSyncAllOffline = async () => {
    const offlineCount = records.filter((r) => r.isOffline).length;
    if (offlineCount === 0) {
      showToast('Barcha yozuvlar allaqachon sinxronlangan!', 'info');
      return;
    }

    if (!navigator.onLine) {
      showToast(
        `🔴 Hali ham offline rejimdasiz! ${offlineCount} ta yozuv saqlandi. Faqat internet (Online) bo'lganda sinxronlanadi.`,
        'error'
      );
      return;
    }

    try {
      const syncedRecords = await syncOfflineRecordsToCloud(records);
      setRecords(syncedRecords);
      showToast(`🟢 Barcha ${offlineCount} ta offline yozuvlar muvaffaqiyatli bulutga sinxronlandi!`, 'success');
    } catch {
      showToast('❌ Sinxronlashda xatolik yuz berdi.', 'error');
    }
  };

  // Delete record
  const handleDeleteRecord = async (id: string) => {
    const target = records.find((r) => r.id === id);
    const currentUser = auth.username || 'daewoobuloqboshi';
    if (confirm(`Rostdan ham "${target?.customerName || 'Mijoz'}" yozuvini bazadan o'chirmoqchimisiz?`)) {
      setRecords((prev) => prev.filter((r) => r.id !== id));
      if (navigator.onLine) {
        deleteRecordFromCloud(id);
      }
      showToast("Yozuv bazadan o'chirildi.", 'error');
      await createAdminLog(
        "Xizmat O'chirildi",
        `Mijoz: ${target?.customerName || 'Noma\'lum'}, Avto: ${target?.carPlate || 'Noma\'lum'} yozuvi bazadan o'chirib tashlandi`,
        currentUser
      );
    }
  };

  // Open Edit modal - Only allow editing records created TODAY
  const handleOpenEdit = (record: ServiceRecord) => {
    if (!record || !record.createdAt) return;

    const recordDate = new Date(record.createdAt);
    const today = new Date();
    const isToday =
      recordDate.getFullYear() === today.getFullYear() &&
      recordDate.getMonth() === today.getMonth() &&
      recordDate.getDate() === today.getDate();

    if (!isToday) {
      showToast(
        "⚠️ Faqat bugungi kunda kiritilgan xizmat yozuvlarini tahrirlash mumkin! Avvalgi kunlar yozuvlarini o'zgartirib bo'lmaydi.",
        'error'
      );
      return;
    }

    setEditingRecord(record);
    setIsFormModalOpen(true);
  };

  // Update Customer Info (Name, Plate, Phone, Model) across the entire system and all historical records
  const handleUpdateCustomerInfo = async (
    payloadOrOldPlate: CustomerUpdatePayload | string,
    legacyNewPlate?: string,
    legacyNewPhone?: string,
    legacyNewModel?: string,
    legacyNewName?: string
  ) => {
    let oldPlate = '';
    let oldName = '';
    let oldPhone = '';
    let recordIds: string[] | undefined = undefined;
    let newName = '';
    let newPlate = '';
    let newPhone = '';
    let newModel = '';

    if (typeof payloadOrOldPlate === 'string') {
      oldPlate = payloadOrOldPlate;
      newPlate = legacyNewPlate || '';
      newPhone = legacyNewPhone || '';
      newModel = legacyNewModel || '';
      newName = legacyNewName || '';
    } else if (payloadOrOldPlate) {
      oldPlate = payloadOrOldPlate.oldPlate || '';
      oldName = payloadOrOldPlate.oldName || '';
      oldPhone = payloadOrOldPlate.oldPhone || '';
      recordIds = payloadOrOldPlate.recordIds;
      newName = payloadOrOldPlate.newName || '';
      newPlate = payloadOrOldPlate.newPlate || '';
      newPhone = payloadOrOldPlate.newPhone || '';
      newModel = payloadOrOldPlate.newModel || '';
    }

    const cleanOldPlate = oldPlate.toUpperCase().trim().replace(/[\s\-_]/g, '');
    const cleanOldPhone = oldPhone.trim().replace(/[\s\-_+]/g, '');
    const cleanOldName = oldName.trim().toLowerCase();

    const cleanNewName = newName.trim();
    const cleanNewPlate = newPlate.toUpperCase().trim();
    const cleanNewPhone = newPhone.trim();
    const cleanNewModel = newModel.trim();

    const recordIdSet = new Set<string>(recordIds || []);

    const updatedRecords = records.map((r) => {
      const rPlate = (r.carPlate || '').toUpperCase().trim().replace(/[\s\-_]/g, '');
      const rPhone = (r.phoneNumber || '').trim().replace(/[\s\-_+]/g, '');
      const rName = (r.customerName || '').trim().toLowerCase();

      const isMatch =
        recordIdSet.has(r.id) ||
        (cleanOldPlate && rPlate === cleanOldPlate) ||
        (cleanOldPhone && cleanOldPhone.length >= 7 && rPhone === cleanOldPhone) ||
        (cleanOldName && rName === cleanOldName && (!cleanOldPlate || rPlate === cleanOldPlate));

      if (isMatch) {
        return {
          ...r,
          customerName: cleanNewName || r.customerName,
          carPlate: cleanNewPlate || r.carPlate,
          phoneNumber: cleanNewPhone || r.phoneNumber,
          carModel: cleanNewModel || r.carModel,
        };
      }
      return r;
    });

    setRecords(updatedRecords);
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(updatedRecords));
    } catch {
      // ignore
    }

    const recordsToSync = updatedRecords.filter((r) => {
      const rPlate = (r.carPlate || '').toUpperCase().trim().replace(/[\s\-_]/g, '');
      const rPhone = (r.phoneNumber || '').trim().replace(/[\s\-_+]/g, '');
      const rName = (r.customerName || '').trim().toLowerCase();
      return (
        recordIdSet.has(r.id) ||
        (cleanNewPlate && rPlate === cleanNewPlate.replace(/[\s\-_]/g, '')) ||
        (cleanNewPhone && rPhone === cleanNewPhone.replace(/[\s\-_+]/g, '')) ||
        (cleanNewName && rName === cleanNewName.toLowerCase())
      );
    });

    if (navigator.onLine && recordsToSync.length > 0) {
      await batchUpdateRecordsInCloud(recordsToSync);
    }

    showToast(
      `Mijoz (${cleanNewName || cleanNewPlate}) ma'lumotlari barcha ${recordsToSync.length} ta xizmat tarixida muvaffaqiyatli yangilandi!`,
      'success'
    );
    await createAdminLog(
      "Mijoz Ma'lumotlari Butun Bazada Yangilandi",
      `Mijoz: "${oldName || oldPlate}" -> "${cleanNewName}", Avto: "${oldPlate}" -> "${cleanNewPlate}", Tel: "${cleanNewPhone}". Jami ${recordsToSync.length} ta xizmat yozuvlari birdek yangilandi`,
      auth.username || 'daewoobuloqboshi'
    );
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingRecord(null);
    setIsFormModalOpen(true);
  };

  // Open Customer History
  const handleSelectCustomer = (carPlate: string, customerName?: string) => {
    setSelectedCustomerPlate(carPlate);
    setSelectedCustomerName(customerName);
  };

  // Open New service for customer from history modal
  const handleNewServiceForCustomerFromModal = (latestRec: ServiceRecord) => {
    setSelectedCustomerPlate(null);
    setEditingRecord(null);
    setIsFormModalOpen(true);
  };

  // Reset / Clear database
  const handleResetToDemo = async () => {
    setRecords([]);
    try {
      localStorage.removeItem(STORAGE_KEY_RECORDS);
    } catch {}
    if (navigator.onLine) {
      await clearAllRecordsFromCloud();
    }
    showToast("Barcha mijoz va xizmat ma'lumotlari to'liq tozalandi.", 'info');
  };

  // Import JSON records
  const handleImportRecords = (newRecords: ServiceRecord[]) => {
    setRecords(newRecords);
    showToast(`${newRecords.length} ta yozuv muvaffaqiyatli import qilindi!`, 'success');
  };

  // If not authenticated, show strict Login Form
  if (!auth.isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  // Dedicated Standalone Super Admin Dashboard for admindw
  if (auth.username === 'admindw') {
    return (
      <AdminStandaloneDashboard
        username={auth.username}
        onLogout={handleLogout}
        records={records}
        onSaveRecord={handleSaveRecord}
        onDeleteRecord={handleDeleteRecord}
        onClearAllRecords={handleResetToDemo}
        onUpdateCustomerInfo={handleUpdateCustomerInfo}
      />
    );
  }

  const oilOverMonthCount = getOverdueOilCustomers(records).length;

  const offlineRecordsCount = records.filter((r) => r.isOffline).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white pb-16 relative">
      {/* Toast Notification Floating */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-semibold backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-red-950/90 border-red-800 text-red-200'
                : 'bg-blue-950/90 border-blue-800 text-blue-200'
            }`}
          >
            {toast.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <Header
        username={auth.username || 'daewoobuloqboshi'}
        totalRecords={records.length}
        oilOverMonthCount={oilOverMonthCount}
        onOpenNewModal={handleOpenCreate}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onLogout={handleLogout}
        onOpenOverdueOilModal={() => setIsOverdueOilModalOpen(true)}
        onOpenAnalyticsModal={() => setIsAnalyticsModalOpen(true)}
      />

      {/* PWA & Network Online/Offline Sync Bar */}
      <PWAInstallBar
        isOnline={isOnline}
        offlineRecordsCount={offlineRecordsCount}
        onSyncAll={handleSyncAllOffline}
      />

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8 pb-16 space-y-6 my-2 sm:my-4">
        {/* Statistics Bar */}
        <StatsBar
          records={records}
          onOpenOverdueOilModal={() => setIsOverdueOilModalOpen(true)}
        />

        {/* Database Records Table & Search */}
        <RecordsList
          records={records}
          username={auth.username || 'daewoobuloqboshi'}
          onEdit={handleOpenEdit}
          onDelete={handleDeleteRecord}
          onPrint={(rec) => setPrintingRecord(rec)}
          onOpenNewModal={handleOpenCreate}
          onSelectCustomer={handleSelectCustomer}
          onSyncRecord={handleSyncRecord}
          onSyncAllOffline={handleSyncAllOffline}
          onOpenAnalyticsModal={() => setIsAnalyticsModalOpen(true)}
          onUpdateCustomerInfo={handleUpdateCustomerInfo}
        />
      </main>

      {/* Modal: Full Analytics & Customer Breakdown with Excel Export */}
      <FullAnalyticsModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
        records={records}
        onUpdateCustomerInfo={handleUpdateCustomerInfo}
        onSelectCustomer={(plate, name) => {
          setIsAnalyticsModalOpen(false);
          handleSelectCustomer(plate, name);
        }}
        onEditRecord={(rec) => {
          setIsAnalyticsModalOpen(false);
          handleOpenEdit(rec);
        }}
        onPrintRecord={(rec) => {
          setIsAnalyticsModalOpen(false);
          setPrintingRecord(rec);
        }}
        onOpenNewModal={() => {
          setIsAnalyticsModalOpen(false);
          handleOpenCreate();
        }}
      />

      {/* Modal: Overdue Oil Change Customers */}
      <OverdueOilModal
        isOpen={isOverdueOilModalOpen}
        onClose={() => setIsOverdueOilModalOpen(false)}
        records={records}
        onSelectCustomer={handleSelectCustomer}
        onNewServiceForCustomer={(plate, name) => {
          setSelectedCustomerPlate(null);
          setEditingRecord(null);
          setIsFormModalOpen(true);
        }}
      />

      {/* Modal: Customer History Timeline */}
      <CustomerHistoryModal
        isOpen={Boolean(selectedCustomerPlate)}
        customerPlate={selectedCustomerPlate}
        customerName={selectedCustomerName}
        records={records}
        onClose={() => setSelectedCustomerPlate(null)}
        onNewServiceForCustomer={handleNewServiceForCustomerFromModal}
        onEditRecord={handleOpenEdit}
        onPrintRecord={(rec) => setPrintingRecord(rec)}
      />

      {/* Modal: New / Edit Service Record */}
      <RecordFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveRecord}
        initialData={editingRecord}
        existingRecords={records}
      />

      {/* Modal: Print Receipt Sheet */}
      <PrintReceiptModal
        record={printingRecord}
        onClose={() => setPrintingRecord(null)}
      />

      {/* Modal: Export / Backup / Import */}
      <ExportImportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        records={records}
        onImportRecords={handleImportRecords}
        onResetToDemo={handleResetToDemo}
      />

      {/* Modal: Super Admin Dashboard */}
      <AdminDashboardModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentUsername={auth.username || ''}
        records={records}
        onSaveRecord={handleSaveRecord}
        onDeleteRecord={handleDeleteRecord}
        onClearAllRecords={handleResetToDemo}
      />

      {/* Mobile Floating Action Button (FAB) for Instant Service Addition */}
      <div className="sm:hidden fixed bottom-5 right-5 z-40">
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 active:from-blue-700 active:to-indigo-700 text-white font-bold text-xs rounded-full shadow-2xl shadow-blue-500/50 border border-blue-400/40 cursor-pointer active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 text-white" />
          <span>+ Yangi Yozuv</span>
        </button>
      </div>
    </div>
  );
}

