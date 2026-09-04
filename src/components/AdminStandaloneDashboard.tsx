import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Smartphone,
  LogOut,
  Search,
  FileText,
  Zap,
  Clock,
  UserCheck,
  Database,
  Users
} from 'lucide-react';
import { DeviceSession, AdminLog, ServiceRecord, CustomerUpdatePayload } from '../types';
import {
  subscribeToSessions,
  subscribeToAdminLogs,
  kickDeviceSession,
  sendRemoteCommand,
  createAdminLog,
  getOrCreateDeviceId
} from '../lib/adminSession';
import {
  subscribeToRecords,
  saveRecordToCloud,
  batchUpdateRecordsInCloud,
  deleteRecordFromCloud,
  clearAllRecordsFromCloud
} from '../lib/firebase';
import { AdminRecordsManager } from './AdminRecordsManager';
import { CustomerCrmSection } from './CustomerCrmSection';

interface AdminStandaloneDashboardProps {
  username: string;
  onLogout: () => void;
  records?: ServiceRecord[];
  onSaveRecord?: (record: ServiceRecord) => Promise<void> | void;
  onDeleteRecord?: (id: string) => Promise<void> | void;
  onClearAllRecords?: () => Promise<void> | void;
  onUpdateCustomerInfo?: (payload: CustomerUpdatePayload) => Promise<void> | void;
}

export const AdminStandaloneDashboard: React.FC<AdminStandaloneDashboardProps> = ({
  username,
  onLogout,
  records: initialRecords,
  onSaveRecord: propSaveRecord,
  onDeleteRecord: propDeleteRecord,
  onClearAllRecords: propClearAllRecords,
  onUpdateCustomerInfo: propUpdateCustomerInfo,
}) => {
  const [activeTab, setActiveTab] = useState<'crm' | 'records' | 'sessions' | 'logs'>('crm');

  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [records, setRecords] = useState<ServiceRecord[]>(initialRecords || []);

  const [searchTerm, setSearchTerm] = useState('');
  const [logPeriod, setLogPeriod] = useState<'today' | 'this_month' | 'all'>('all');
  const [logUserFilter, setLogUserFilter] = useState<'daewoobuloqboshi' | 'all'>('daewoobuloqboshi');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const myDeviceId = getOrCreateDeviceId();

  const showToast = (msg: string, _type?: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Subscriptions
  useEffect(() => {
    const unsubSessions = subscribeToSessions((list) => setSessions(list));
    const unsubLogs = subscribeToAdminLogs((list) => setLogs(list));
    const unsubRecords = subscribeToRecords((list) => setRecords(list));

    return () => {
      unsubSessions();
      unsubLogs();
      unsubRecords();
    };
  }, []);

  // Record actions
  const handleSaveRecord = async (rec: ServiceRecord) => {
    if (propSaveRecord) {
      await propSaveRecord(rec);
    } else {
      await saveRecordToCloud(rec);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (propDeleteRecord) {
      await propDeleteRecord(id);
    } else {
      await deleteRecordFromCloud(id);
    }
  };

  const handleClearAllRecords = async () => {
    if (propClearAllRecords) {
      await propClearAllRecords();
    } else {
      await clearAllRecordsFromCloud();
    }
  };

  // Update customer info handler (Global system & all historical visits)
  const handleUpdateCustomerInfo = async (payload: CustomerUpdatePayload) => {
    if (propUpdateCustomerInfo) {
      await propUpdateCustomerInfo(payload);
    } else {
      const cleanOldPlate = (payload.oldPlate || '').toUpperCase().trim().replace(/[\s\-_]/g, '');
      const cleanOldPhone = (payload.oldPhone || '').trim().replace(/[\s\-_+]/g, '');
      const cleanOldName = (payload.oldName || '').trim().toLowerCase();

      const cleanNewName = payload.newName.trim();
      const cleanNewPlate = payload.newPlate.toUpperCase().trim();
      const cleanNewPhone = payload.newPhone.trim();
      const cleanNewModel = payload.newModel.trim();

      const recordIdSet = new Set<string>(payload.recordIds || []);

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

      await batchUpdateRecordsInCloud(recordsToSync);

      showToast(`Mijoz (${cleanNewName || cleanNewPlate}) ma'lumotlari barcha ${recordsToSync.length} ta xizmat tarixida muvaffaqiyatli yangilandi!`);
      await createAdminLog(
        "Mijoz Ma'lumotlari Butun Bazada Yangilandi",
        `Mijoz: "${payload.oldName || payload.oldPlate}" -> "${cleanNewName}", Avto: ${payload.oldPlate} -> ${cleanNewPlate}, Tel: ${cleanNewPhone}. Jami ${recordsToSync.length} ta oldingi xizmat yozuvlari birdek yangilandi`,
        username
      );
    }
  };

  // Unique customers count for CRM tab badge
  const uniqueCustomersCount = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const key = (r.carPlate || '').toUpperCase().trim() || (r.phoneNumber || '').trim();
      if (key) set.add(key);
    });
    return set.size;
  }, [records]);

  // Kick session
  const handleKickSession = async (session: DeviceSession) => {
    if (session.id === myDeviceId) {
      if (!confirm("O'zingizning hozirgi seansingizni chiqarib yubormoqchimisiz?")) return;
    } else {
      if (!confirm(`${session.deviceName} (${session.username}) qurilmasini tizimdan chiqarib yuborasizmi?`)) return;
    }

    await kickDeviceSession(session.id);
    await sendRemoteCommand(session.id, 'kick');
    await createAdminLog(
      "Qurilma Tizimdan Chiqarildi",
      `${session.deviceName} (${session.username}) IP: ${session.ipAddress || 'noma\'lum'} majburiy chiqarildi`,
      username
    );
    showToast(`🚪 ${session.deviceName} qurilmasi tizimdan chiqarib yuborildi!`);

    if (session.id === myDeviceId) {
      onLogout();
    }
  };

  // Filtering Logs - STRICTLY FOR DAEWOONARGIZ
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const u = (log.username || '').toLowerCase();
      if (u === 'admindw' || u === 'dwadmin' || u === 'admin') return false;

      const date = new Date(log.timestamp);
      const now = new Date();

      if (logPeriod === 'today') {
        if (
          date.getFullYear() !== now.getFullYear() ||
          date.getMonth() !== now.getMonth() ||
          date.getDate() !== now.getDate()
        ) {
          return false;
        }
      } else if (logPeriod === 'this_month') {
        if (date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth()) {
          return false;
        }
      }

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          (log.username || '').toLowerCase().includes(q) ||
          (log.action || '').toLowerCase().includes(q) ||
          (log.details || '').toLowerCase().includes(q) ||
          (log.ipAddress || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [logs, logUserFilter, logPeriod, searchTerm]);

  // Filter & Sort Active Sessions - STRICTLY FOR DAEWOOBULOQBOSHI ONLY
  const sortedSessions = useMemo(() => {
    const filtered = sessions.filter((s) => s.username === 'daewoobuloqboshi');

    return filtered.sort((a, b) => {
      const aMs = a.lastActive ? new Date(a.lastActive).getTime() : 0;
      const bMs = b.lastActive ? new Date(b.lastActive).getTime() : 0;
      const aOnline = Boolean(a.isOnline) && !a.kicked && (Date.now() - aMs < 180000);
      const bOnline = Boolean(b.isOnline) && !b.kicked && (Date.now() - bMs < 180000);

      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      return bMs - aMs;
    });
  }, [sessions]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {/* Top Navbar */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 shadow-2xl">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30 shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight leading-tight truncate">
                  Super Admin Markazi
                </h1>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-extrabold text-[9px] sm:text-[10px] border border-purple-500/30 shrink-0 leading-none">
                  admindw 🔑
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 leading-tight truncate">
                Yagona CRM, xizmatlar va xavfsizlik nazorati
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-purple-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{username}</span>
            </div>

            <button
              onClick={onLogout}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-950/80 hover:bg-red-900 active:bg-red-950 text-red-300 border border-red-800/80 text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0"
              title="Tizimdan chiqish"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      {/* Alert toast notification */}
      {toastMessage && (
        <div className="bg-purple-900/90 border-b border-purple-700 text-purple-100 text-xs px-4 py-2.5 font-bold flex items-center justify-center gap-2 animate-bounce">
          <Zap className="w-4 h-4 text-purple-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-16 flex-1 w-full space-y-4 sm:space-y-6">
        {/* Navigation Tabs - Compact, Responsive Grid (NO HORIZONTAL SCROLL ON ANY SCREEN) */}
        <div className="bg-slate-900 p-1.5 sm:p-2 rounded-2xl border border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 shadow-xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab('crm');
              createAdminLog("CRM Bo'limiga O'tildi", "Yagona mijozlar CRM jadvali ochildi", username);
            }}
            className={`w-full py-2.5 px-2.5 sm:px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
              activeTab === 'crm'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/30'
                : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Users className={`w-4 h-4 shrink-0 ${activeTab === 'crm' ? 'text-white' : 'text-purple-400'}`} />
              <span className="truncate">Mijozlar CRM</span>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                activeTab === 'crm' ? 'bg-white/20 text-white' : 'bg-slate-800 text-purple-300'
              }`}
            >
              {uniqueCustomersCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('records')}
            className={`w-full py-2.5 px-2.5 sm:px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
              activeTab === 'records'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/30'
                : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Database className={`w-4 h-4 shrink-0 ${activeTab === 'records' ? 'text-white' : 'text-blue-400'}`} />
              <span className="truncate">Xizmatlar Bazasi</span>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                activeTab === 'records' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {records.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={`w-full py-2.5 px-2.5 sm:px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
              activeTab === 'sessions'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/30'
                : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Smartphone className={`w-4 h-4 shrink-0 ${activeTab === 'sessions' ? 'text-white' : 'text-emerald-400'}`} />
              <span className="truncate">Faol Seanslar</span>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                activeTab === 'sessions' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {sortedSessions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`w-full py-2.5 px-2.5 sm:px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/30'
                : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <FileText className={`w-4 h-4 shrink-0 ${activeTab === 'logs' ? 'text-white' : 'text-amber-400'}`} />
              <span className="truncate">Tizim Loglari</span>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                activeTab === 'logs' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {filteredLogs.length}
            </span>
          </button>
        </div>

        {/* Informative Context Bar (Compact & Clean on Mobile) */}
        <div className="px-3 py-2 bg-slate-900/60 border border-slate-800/70 rounded-xl flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
            <span className="truncate">
              {activeTab === 'crm' && "👥 Takrorlanmas mijozlar bazasi • Chuqur tahlil va .xlsx eksport"}
              {activeTab === 'records' && "📋 Barcha xizmat yozuvlari • Chek chiqarish va tahrirlash"}
              {activeTab === 'sessions' && "📱 Faol daewoobuloqboshi xodim seanslari monitoringi"}
              {activeTab === 'logs' && "📊 Tizim harakatlari va xavfsizlik loglari xronologiyasi"}
            </span>
          </div>
          <span className="text-[10px] font-mono text-purple-400 shrink-0 ml-2 hidden sm:inline">
            admindw nazorati
          </span>
        </div>

        {/* TAB 0: Yagona Mijozlar CRM Markazi */}
        {activeTab === 'crm' && (
          <CustomerCrmSection
            records={records}
            username={username}
            onSelectCustomerForHistory={(plate, name) => {
              setActiveTab('records');
              showToast(`${name || plate} bo'yicha barcha xizmatlar ochildi`);
            }}
            onEditRecord={handleSaveRecord}
            onUpdateCustomerInfo={handleUpdateCustomerInfo}
          />
        )}

        {/* TAB 1: All Service Records & Customers Management */}
        {activeTab === 'records' && (
          <AdminRecordsManager
            records={records}
            currentUsername={username}
            onSaveRecord={handleSaveRecord}
            onDeleteRecord={handleDeleteRecord}
            onClearAllRecords={handleClearAllRecords}
          />
        )}

        {/* TAB 1: Active Devices */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400 font-semibold">Monitoring:</span>
                <span className="px-2.5 py-1 rounded-xl bg-purple-950/80 border border-purple-800/80 text-purple-300 text-xs font-extrabold flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Faqat daewoobuloqboshi seanslari ({sortedSessions.length})</span>
                </span>
              </div>

              <span className="text-purple-400 font-bold font-mono text-xs">
                {sortedSessions.length} ta seans aniqlandi
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {sortedSessions.length === 0 ? (
                <div className="col-span-full p-10 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800 text-xs">
                  Hozircha daewoobuloqboshi foydalanuvchisi uchun faol seanslar topilmadi.
                </div>
              ) : (
                sortedSessions.map((s) => {
                  const isMe = s.id === myDeviceId;
                  const lastActiveMs = s.lastActive ? new Date(s.lastActive).getTime() : 0;
                  const isRecent = Date.now() - lastActiveMs < 3 * 60 * 1000;
                  const isOnlineNow = Boolean(s.isOnline) && !s.kicked && isRecent;

                  return (
                    <div
                      key={s.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
                        isMe
                          ? 'bg-purple-950/30 border-purple-500/40 shadow-xl shadow-purple-950/20'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                isOnlineNow ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
                              }`}
                            />
                            <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5 truncate">
                              <span>{s.deviceName}</span>
                              {isMe && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] border border-purple-500/30 font-mono">
                                  Sizning qurilma
                                </span>
                              )}
                            </h3>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-400 mt-1 font-mono truncate">
                            Foydalanuvchi: <strong className="text-purple-300">{s.username}</strong> • Platforma: {s.platform}
                          </p>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${
                            isOnlineNow
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-slate-950 text-slate-500 border-slate-800'
                          }`}
                        >
                          {isOnlineNow ? '🟢 Online' : '⚪ Chiqqan'}
                        </span>
                      </div>

                      {/* Technical Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-950 p-2.5 sm:p-3 rounded-xl border border-slate-800/80 font-mono">
                        <div>
                          <span className="text-slate-500 block text-[10px]">IP Manzil:</span>
                          <span className="text-purple-300 font-bold break-all">{s.ipAddress || 'Mavjud emas'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Kirgan vaqti:</span>
                          <span className="text-slate-300 text-[11px]">
                            {new Date(s.loginTime).toLocaleTimeString('uz-UZ')} ({new Date(s.loginTime).toLocaleDateString('uz-UZ')})
                          </span>
                        </div>
                      </div>

                      {/* Action Button - ONLY Kick */}
                      <div className="pt-1">
                        <button
                          onClick={() => handleKickSession(s)}
                          className="w-full py-2 bg-red-950/90 hover:bg-red-900 active:bg-red-950 text-red-300 border border-red-800/80 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
                          title="Ushbu telefondan akkauntni majburiy chiqarib yuborish"
                        >
                          <LogOut className="w-3.5 h-3.5 text-red-400" />
                          <span>Qurilmani Tizimdan Chiqarish</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Logs */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800 shadow-md">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Loglar, harakat yoki IP qidiruv..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <span className="px-2.5 py-1.5 rounded-xl bg-purple-950/80 border border-purple-800/80 text-purple-300 text-xs font-bold flex items-center gap-1.5 shrink-0">
                  <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden sm:inline">daewoobuloqboshi</span>
                </span>

                <select
                  value={logPeriod}
                  onChange={(e) => setLogPeriod(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-purple-300 font-bold focus:outline-none cursor-pointer flex-1 sm:flex-initial"
                >
                  <option value="all">Barcha loglar</option>
                  <option value="today">Bugungi loglar</option>
                  <option value="this_month">Shu oygi loglar</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-2.5 max-h-[600px] overflow-y-auto shadow-xl">
              {filteredLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Hech qanday tizim loglari topilmadi.
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const act = (log.action || '').toLowerCase();
                  let badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
                  if (act.includes('chiq') || act.includes('o\'chir') || act.includes('delete')) {
                    badgeColor = 'bg-red-500/20 text-red-300 border-red-500/30';
                  } else if (act.includes('qo\'sh') || act.includes('saqla') || act.includes('kiril')) {
                    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                  } else if (act.includes('yangilan') || act.includes('o\'zgartir')) {
                    badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                  }

                  return (
                    <div
                      key={log.id}
                      className="p-3 sm:p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 hover:border-slate-700 transition-all shadow-sm"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] sm:text-[11px] border ${badgeColor}`}>
                            {log.action}
                          </span>
                          <span className="font-bold text-white flex items-center gap-1 text-[11px]">
                            <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                            {log.username}
                          </span>
                          {log.ipAddress && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                              IP: {log.ipAddress}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-200 text-xs font-medium leading-relaxed break-words">{log.details}</p>
                      </div>

                      <div className="text-right font-mono text-[10px] sm:text-[11px] text-slate-400 shrink-0 bg-slate-900 px-2.5 py-1 sm:py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5 self-end sm:self-center">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <span>
                          {new Date(log.timestamp).toLocaleDateString('uz-UZ')} {new Date(log.timestamp).toLocaleTimeString('uz-UZ')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Informational System Status Footer */}
        <footer className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Daewoo Buloqboshi • Super Admin Markazi</span>
          </div>
          <div className="font-mono text-[10px] text-slate-500">
            Cloud Firestore: <strong className="text-purple-400">dwbuloqboshi1</strong> • Shifrlangan va himoyalangan
          </div>
        </footer>
      </main>
    </div>
  );
};
