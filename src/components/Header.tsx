import React from 'react';
import { Wrench, Plus, LogOut, Database, Car, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { createAdminLog } from '../lib/adminSession';

interface HeaderProps {
  username: string;
  totalRecords: number;
  oilOverMonthCount: number;
  onOpenNewModal: () => void;
  onOpenExportModal: () => void;
  onLogout: () => void;
  onOpenOverdueOilModal?: () => void;
  onOpenAnalyticsModal?: () => void;
  onOpenAdminModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  username,
  totalRecords,
  oilOverMonthCount,
  onOpenNewModal,
  onOpenExportModal,
  onLogout,
  onOpenOverdueOilModal,
  onOpenAnalyticsModal,
  onOpenAdminModal,
}) => {
  const handleOpenOverdue = async () => {
    await createAdminLog("Tugma Bosildi", "Moy almashtirish vaqti o'tganlar oynasi ochildi", username);
    onOpenOverdueOilModal?.();
  };

  const handleOpenAnalytics = async () => {
    await createAdminLog("Tugma Bosildi", "Analitika va Excel hisoboti oynasi ochildi", username);
    onOpenAnalyticsModal?.();
  };

  const handleOpenNew = async () => {
    await createAdminLog("Tugma Bosildi", "Yangi xizmat qo'shish formasi ochildi", username);
    onOpenNewModal();
  };

  const handleOpenExport = async () => {
    await createAdminLog("Tugma Bosildi", "Baza zaxirasini yuklash/eksport oynasi ochildi", username);
    onOpenExportModal();
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-xl">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20 border border-blue-400/30">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Daewoo Buloqboshi
              </h1>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                Auto Servis
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Mijozlar Bazasi
            </p>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="hidden lg:flex items-center gap-3 text-xs">
          {username !== 'daewoobuloqboshi' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
              <Car className="w-4 h-4 text-blue-400" />
              <span>Jami Mijozlar: <strong className="text-white font-bold">{totalRecords} ta</strong></span>
            </div>
          )}

          <button
            onClick={handleOpenOverdue}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 transition-all cursor-pointer"
            title="Moy almashtirish vaqti kelgan mijozlar ro'yxatini ko'rish"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>Vaqti kelganlar: <strong className="text-amber-400 font-bold">{oilOverMonthCount}</strong></span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Admin Panel Button ONLY for admindw */}
          {username === 'admindw' && onOpenAdminModal && (
            <button
              onClick={onOpenAdminModal}
              title="Super Admin Boshqaruv Markazi"
              className="p-2 sm:px-3 sm:py-2 bg-purple-950/80 hover:bg-purple-900 text-purple-200 font-extrabold text-xs rounded-xl border border-purple-600/80 flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-purple-950/50 animate-pulse"
            >
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Admin Paneli 🛡️</span>
            </button>
          )}

          {/* Analytics & Excel Modal Button - Hidden for daewoobuloqboshi */}
          {username !== 'daewoobuloqboshi' && (
            <button
              onClick={handleOpenAnalytics}
              title="Analitika, Mijozlar hisoboti va Excel eksport"
              className="p-2 sm:px-3 sm:py-2 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-700/60 flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-950/50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Analitika & Excel 📊</span>
            </button>
          )}

          {/* New Record Button */}
          <button
            onClick={handleOpenNew}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Yozuv Qo'shish</span>
          </button>


          {/* User badge & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 justify-end">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> {username}
              </span>
            </div>
            <button
              onClick={onLogout}
              title="Tizimdan Chiqish"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
