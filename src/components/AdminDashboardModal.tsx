import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Shield,
  Smartphone,
  Search,
  FileText,
  Zap,
  Clock,
  UserCheck,
  LogOut,
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
import { AdminRecordsManager } from './AdminRecordsManager';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  records: ServiceRecord[];
  onSaveRecord?: (record: ServiceRecord) => Promise<void> | void;
  onDeleteRecord?: (id: string) => Promise<void> | void;
  onClearAllRecords?: () => Promise<void> | void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  currentUsername,
  records,
  onSaveRecord,
  onDeleteRecord,
  onClearAllRecords,
}) => {
  const [activeTab, setActiveTab] = useState<'records' | 'sessions' | 'logs'>('records');

  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);

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
    if (!isOpen) return;

    const unsubSessions = subscribeToSessions((list) => setSessions(list));
    const unsubLogs = subscribeToAdminLogs((list) => setLogs(list));

    return () => {
      unsubSessions();
      unsubLogs();
    };
  }, [isOpen]);

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
      `${session.deviceName} (${session.username}) majburiy chiqarildi`,
      currentUsername
    );
    showToast(`🚪 ${session.deviceName} qurilmasi tizimdan chiqarib yuborildi!`);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl my-auto overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Super Admin Boshqaruv Markazi
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-extrabold text-xs border border-purple-500/30">
                  admindw 🔑
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Faol seanslar va tizim kirish loglari monitoringi
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast alert popup */}
        {toastMessage && (
          <div className="bg-purple-900/90 border-b border-purple-700 text-purple-100 text-xs px-4 py-2 font-bold flex items-center justify-center gap-2 animate-bounce">
            <Zap className="w-4 h-4 text-purple-300" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab Buttons */}
        <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex items-center gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('records')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'records'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>📋 Xizmatlar & Mijozlar Bazasi ({records ? records.length : 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'sessions'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>📱 Faol daewoobuloqboshi Seanslari ({sortedSessions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>📊 Tizim va Kirish Loglari ({filteredLogs.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 0: All Records & Customers Management */}
          {activeTab === 'records' && (
            <AdminRecordsManager
              records={records || []}
              currentUsername={currentUsername}
              onSaveRecord={onSaveRecord || (() => {})}
              onDeleteRecord={onDeleteRecord || (() => {})}
              onClearAllRecords={onClearAllRecords || (() => {})}
            />
          )}

          {/* TAB 1: Active Device Sessions */}
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
                  {sortedSessions.length} ta faol seans
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sortedSessions.length === 0 ? (
                  <div className="col-span-2 p-8 text-center text-slate-500">
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
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          isMe
                            ? 'bg-purple-950/40 border-purple-500/40 shadow-lg shadow-purple-900/10'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  isOnlineNow ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
                                }`}
                              />
                              <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
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

                          <div className="text-right shrink-0">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                isOnlineNow
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : 'bg-slate-900 text-slate-400 border-slate-800'
                              }`}
                            >
                              {isOnlineNow ? '🟢 Online' : '⚪ Offline / Chiqqan'}
                            </span>
                          </div>
                        </div>

                        {/* Session details */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 font-mono">
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

                        {/* Action button - ONLY Kick */}
                        <div className="pt-1 flex items-center justify-end">
                          <button
                            onClick={() => handleKickSession(s)}
                            className="w-full py-2 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800/80 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:shadow-red-950/50"
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

          {/* TAB 2: Activity Logs */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Loglar, harakat, IP yoki matn bo'yicha qidiruv..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                  <span className="px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-800/80 text-purple-300 text-xs font-extrabold flex items-center gap-1.5 shrink-0">
                    <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>daewoobuloqboshi loglari</span>
                  </span>

                  <span className="text-xs text-slate-400">Davr:</span>
                  <select
                    value={logPeriod}
                    onChange={(e) => setLogPeriod(e.target.value as any)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-purple-300 font-bold focus:outline-none"
                  >
                    <option value="all">Barcha vaqtlardagi loglar</option>
                    <option value="today">Bugungi loglar</option>
                    <option value="this_month">Shu oygi loglar</option>
                  </select>
                </div>
              </div>

              {/* Log List */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5 max-h-[550px] overflow-y-auto">
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
                        className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition-all shadow-sm"
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

                        <div className="text-right font-mono text-[11px] text-slate-400 shrink-0 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
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
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="text-purple-400 font-bold">
            🛡️ Daewoo Nargiz Super Admin paneli
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl cursor-pointer"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
