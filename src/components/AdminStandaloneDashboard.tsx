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
  Database
} from 'lucide-react';
import { DeviceSession, AdminLog, ServiceRecord } from '../types';
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
  deleteRecordFromCloud,
  clearAllRecordsFromCloud
} from '../lib/firebase';
import { AdminRecordsManager } from './AdminRecordsManager';

interface AdminStandaloneDashboardProps {
  username: string;
  onLogout: () => void;
  records?: ServiceRecord[];
  onSaveRecord?: (record: ServiceRecord) => Promise<void> | void;
  onDeleteRecord?: (id: string) => Promise<void> | void;
  onClearAllRecords?: () => Promise<void> | void;
}

export const AdminStandaloneDashboard: React.FC<AdminStandaloneDashboardProps> = ({
  username,
  onLogout,
  records: initialRecords,
  onSaveRecord: propSaveRecord,
  onDeleteRecord: propDeleteRecord,
  onClearAllRecords: propClearAllRecords,
}) => {
  const [activeTab, setActiveTab] = useState<'records' | 'sessions' | 'logs'>('records');

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
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Super Admin Markazi
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-extrabold text-[10px] border border-purple-500/30">
                  admindw 🔑
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Faol seanslar va tizim kirish loglari monitoringi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-purple-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{username}</span>
            </div>

            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/80 text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <LogOut className="w-4 h-4" />
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
      <main className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8 pb-16 flex-1 w-full space-y-6 my-2 sm:my-4">
        {/* Navigation Tabs */}
        <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800 flex items-center gap-2 overflow-x-auto shadow-lg">
          <button
            onClick={() => setActiveTab('records')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'records'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>📋 Xizmatlar & Mijozlar Bazasi ({records.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'sessions'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>📱 Faol daewoobuloqboshi Seanslari ({sortedSessions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>📊 Tizim va Kirish Loglari ({filteredLogs.length})</span>
          </button>
        </div>

        {/* TAB 0: All Service Records & Customers Management */}
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Monitoring:</span>
                <span className="px-3 py-1 rounded-xl bg-purple-950/80 border border-purple-800/80 text-purple-300 text-xs font-extrabold flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Faqat daewoobuloqboshi seanslari ({sortedSessions.length})</span>
                </span>
              </div>

              <span className="text-purple-400 font-bold font-mono text-xs">
                {sortedSessions.length} ta faol seans ko'rsatilmoqda
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sortedSessions.length === 0 ? (
                <div className="col-span-full p-12 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
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
                      className={`p-5 rounded-2xl border transition-all space-y-4 ${
                        isMe
                          ? 'bg-purple-950/30 border-purple-500/40 shadow-xl shadow-purple-950/20'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-3 h-3 rounded-full ${
                                isOnlineNow ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
                              }`}
                            />
                            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                              {s.deviceName}
                              {isMe && (
                                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] border border-purple-500/30 font-mono">
                                  Sizning qurilma
                                </span>
                              )}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 font-mono">
                            Foydalanuvchi: <strong className="text-purple-300">{s.username}</strong> • Platforma: {s.platform}
                          </p>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            isOnlineNow
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-slate-950 text-slate-500 border-slate-800'
                          }`}
                        >
                          {isOnlineNow ? '🟢 Online' : '⚪ Offline / Chiqqan'}
                        </span>
                      </div>

                      {/* Technical Details */}
                      <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono">
                        <div>
                          <span className="text-slate-500 block text-[10px]">IP Manzil:</span>
                          <span className="text-purple-300 font-bold">{s.ipAddress || 'Mavjud emas'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Kirgan vaqti:</span>
                          <span className="text-slate-300">
                            {new Date(s.loginTime).toLocaleTimeString('uz-UZ')} ({new Date(s.loginTime).toLocaleDateString('uz-UZ')})
                          </span>
                        </div>
                      </div>

                      {/* Action Button - ONLY Kick */}
                      <div className="pt-1 flex items-center justify-end">
                        <button
                          onClick={() => handleKickSession(s)}
                          className="w-full py-2.5 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800/80 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:shadow-red-950/50"
                          title="Ushbu telefondan akkauntni majburiy chiqarib yuborish"
                        >
                          <LogOut className="w-4 h-4 text-red-400" />
                          <span>🚪 Qurilmani Tizimdan Chiqarib Yuborish</span>
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Loglar, harakat, IP yoki matn bo'yicha qidiruv..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto">
                <span className="px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-800/80 text-purple-300 text-xs font-extrabold flex items-center gap-1.5 shrink-0">
                  <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>daewoobuloqboshi loglari</span>
                </span>

                <span className="text-xs text-slate-400">Davr:</span>
                <select
                  value={logPeriod}
                  onChange={(e) => setLogPeriod(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-purple-300 font-bold focus:outline-none"
                >
                  <option value="all">Barcha vaqtlardagi loglar</option>
                  <option value="today">Bugungi loglar</option>
                  <option value="this_month">Shu oygi loglar</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 max-h-[600px] overflow-y-auto shadow-xl">
              {filteredLogs.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs">
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
                      className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition-all shadow-sm"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-md font-extrabold text-[11px] border ${badgeColor}`}>
                            {log.action}
                          </span>
                          <span className="font-bold text-white flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                            {log.username}
                          </span>
                          {log.ipAddress && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                              IP: {log.ipAddress}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-200 text-xs font-medium leading-relaxed">{log.details}</p>
                      </div>

                      <div className="text-right font-mono text-[11px] text-slate-400 shrink-0 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
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
      </main>
    </div>
  );
};
