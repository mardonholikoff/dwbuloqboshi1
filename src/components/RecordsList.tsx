import React, { useState, useMemo, useEffect } from 'react';
import { ServiceRecord, RecordStatusFilter } from '../types';
import { RecordCard } from './RecordCard';
import { CustomerCrmSection } from './CustomerCrmSection';
import { createAdminLog } from '../lib/adminSession';
import { checkIsOilRecord, getDaysAgo } from '../lib/oilUtils';
import {
  Search,
  Filter,
  LayoutGrid,
  Table,
  Plus,
  AlertCircle,
  Printer,
  Edit2,
  Trash2,
  Download,
  Clock,
  Sparkles,
  Droplet,
  Maximize2,
  Calendar,
  X,
  Eye,
  EyeOff,
  Users
} from 'lucide-react';

interface RecordsListProps {
  records: ServiceRecord[];
  onEdit: (record: ServiceRecord) => void;
  onDelete: (id: string) => void;
  onPrint: (record: ServiceRecord) => void;
  onOpenNewModal: () => void;
  onSelectCustomer?: (carPlate: string, customerName?: string) => void;
  onSyncRecord?: (id: string) => void;
  onSyncAllOffline?: () => void;
  onOpenAnalyticsModal?: () => void;
  onUpdateCustomerInfo?: (oldPlate: string, newPlate: string, newPhone: string, newModel: string) => void;
  username?: string;
}

// Helper: check if record is from today
const isTodayRecord = (dateStr: string) => {
  const d = new Date(dateStr);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
};

// Helper: get separate oil and parts strings for display
const getOilAndParts = (record: ServiceRecord) => {
  let oilStr = (record.replacedOil || '').trim();
  let partsStr = (record.replacedParts || '').trim();

  if (!oilStr && partsStr) {
    const lower = partsStr.toLowerCase();
    if (lower.startsWith('moy almashtirildi:') || lower.startsWith('zapchast sotildi:')) {
      const splitArr = partsStr.split(/:\s*/);
      if (splitArr.length > 1) {
        if (lower.includes('moy')) {
          oilStr = splitArr[1];
          partsStr = '';
        }
      }
    } else {
      const oilBrands = ['shell', 'castrol', 'mannol', 'zic', 'lukoil', 'kixx', 'mobil', 'chevrolet', 'hyundai', 'total', '5w-', '10w-', '0w-'];
      const segments = partsStr.split(/,\s*/);
      const oilSegs: string[] = [];
      const partSegs: string[] = [];

      segments.forEach((seg) => {
        const segLower = seg.toLowerCase();
        if (oilBrands.some((b) => segLower.includes(b)) && !segLower.includes('filtr') && !segLower.includes('kolodka')) {
          oilSegs.push(seg);
        } else {
          partSegs.push(seg);
        }
      });

      if (oilSegs.length > 0) {
        oilStr = oilSegs.join(', ');
        partsStr = partSegs.join(', ');
      }
    }
  }

  return {
    oil: oilStr || (record.replacedParts?.toLowerCase().includes('moy') ? 'Moy almashtirildi' : '—'),
    parts: partsStr || '—',
  };
};

export const RecordsList: React.FC<RecordsListProps> = ({
  records,
  onEdit,
  onDelete,
  onPrint,
  onOpenNewModal,
  onSelectCustomer,
  onSyncRecord,
  onSyncAllOffline,
  onOpenAnalyticsModal,
  onUpdateCustomerInfo,
  username = 'daewoobuloqboshi',
}) => {
  const isAdmin = username === 'admindw' || username === 'dwadmin';
  const [activeMainTab, setActiveMainTab] = useState<'crm' | 'records'>(isAdmin ? 'crm' : 'records');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RecordStatusFilter>('barchasi');
  const [dateScope, setDateScope] = useState<'today' | 'all'>('today'); // Default to TODAY only as requested
  const [isFullTableModalOpen, setIsFullTableModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table'); // Default to Excel Table View
  const [sortBy, setSortBy] = useState<'oldest_oil' | 'newest_oil' | 'newest' | 'oldest' | 'mileage_desc' | 'mileage_asc'>('newest');
  // Revealing today's records for daewoobuloqboshi (starts blurred)
  const [isRevealed, setIsRevealed] = useState<boolean>(username !== 'daewoobuloqboshi');

  // Debounced search logger
  useEffect(() => {
    if (!searchTerm.trim()) return;
    const timer = setTimeout(() => {
      createAdminLog(
        "Qidiruv Yozildi",
        `Foydalanuvchi qidiruvga matn yozdi: "${searchTerm}"`,
        username
      );
    }, 1200);
    return () => clearTimeout(timer);
  }, [searchTerm, username]);

  // Log status filter selection
  const handleFilterSelect = (filterId: RecordStatusFilter, filterLabel: string) => {
    setStatusFilter(filterId);
    createAdminLog("Filter Bosildi", `Filtr tanlandi: ${filterLabel}`, username);
  };

  // Log sort selection
  const handleSortChange = (newSort: any) => {
    setSortBy(newSort);
    createAdminLog("Saralash O'zgartirildi", `Saralash kodi: ${newSort}`, username);
  };

  // Log view mode change
  const handleViewModeChange = (mode: 'table' | 'grid') => {
    setViewMode(mode);
    createAdminLog("Ko'rinish Rejimi O'zgartirildi", `Rejim: ${mode === 'table' ? 'Excel Jadval' : 'Kartalar'}`, username);
  };

  // Count unique customers for CRM tab
  const uniqueCustomersCount = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const key = (r.carPlate || '').toUpperCase().trim() || (r.phoneNumber || '').trim();
      if (key) set.add(key);
    });
    return set.size;
  }, [records]);

  // Filtered and sorted list
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        // Date Scope Filter: Today vs All
        if (dateScope === 'today' && !isTodayRecord(r.createdAt)) {
          return false;
        }

        // Filter by Oil Change / Status
        if (statusFilter === 'moy') {
          if (!checkIsOilRecord(r)) return false;
        } else if (statusFilter !== 'barchasi' && r.status !== statusFilter) {
          return false;
        }

        // Search term filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const matchName = r.customerName.toLowerCase().includes(q);
          const matchPhone = r.phoneNumber.toLowerCase().includes(q);
          const matchPlate = r.carPlate.toLowerCase().includes(q);
          const matchModel = r.carModel.toLowerCase().includes(q);
          const matchReplaced = r.replacedParts.toLowerCase().includes(q);
          const matchToReplace = r.partsToReplace.toLowerCase().includes(q);
          const matchNotes = (r.notes || '').toLowerCase().includes(q);

          return matchName || matchPhone || matchPlate || matchModel || matchReplaced || matchToReplace || matchNotes;
        }

        return true;
      })
      .sort((a, b) => {
        const isOilA = checkIsOilRecord(a);
        const isOilB = checkIsOilRecord(b);

        if (sortBy === 'oldest_oil') {
          if (isOilA && !isOilB) return -1;
          if (!isOilA && isOilB) return 1;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortBy === 'newest_oil') {
          if (isOilA && !isOilB) return -1;
          if (!isOilA && isOilB) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortBy === 'mileage_desc') {
          return (Number(b.mileageKm) || 0) - (Number(a.mileageKm) || 0);
        } else if (sortBy === 'mileage_asc') {
          return (Number(a.mileageKm) || 0) - (Number(b.mileageKm) || 0);
        }
        return 0;
      });
  }, [records, searchTerm, statusFilter, dateScope, sortBy]);

  // Statistics calculation for filtered items
  const stats = useMemo(() => {
    const totalCost = filteredRecords.reduce((sum, r) => sum + (Number(r.costUzs) || 0), 0);
    const oilCount = filteredRecords.filter(checkIsOilRecord).length;
    const totalKm = filteredRecords.reduce((sum, r) => sum + (Number(r.mileageKm) || 0), 0);
    const avgKm = filteredRecords.length > 0 ? Math.round(totalKm / filteredRecords.length) : 0;

    return { totalCost, oilCount, avgKm };
  }, [filteredRecords]);

  // Download Excel CSV helper
  const handleDownloadExcel = async () => {
    await createAdminLog(
      "Excel Yuklab Olindi",
      `Jami ${filteredRecords.length} ta servis yozuvi CSV/Excel formatida yuklab olindi`,
      username
    );

    const headers = [
      '№',
      'Mijoz Ismi',
      'Telefon Nomer',
      'Mashina Raqami',
      'Mashina Modeli',
      'Yurgan Masofasi (Km)',
      'Almashtirilgan Moy',
      'Almashtirilgan Zapchast',
      'Almashtirilishi Kerak',
      'Xizmat Haqi (UZS)',
      'Servis Sanasi',
      'Almashtirilganiga (Kun)',
      'Xizmat Holati',
      'Qo\'shimcha Izoh'
    ];

    const rows = filteredRecords.map((r, index) => {
      const days = getDaysAgo(r.createdAt);
      const { oil, parts } = getOilAndParts(r);
      const dateFormatted = `${new Date(r.createdAt).toLocaleDateString('uz-UZ')} ${new Date(r.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`;
      return [
        index + 1,
        `"${r.customerName.replace(/"/g, '""')}"`,
        `"${r.phoneNumber.replace(/"/g, '""')}"`,
        `"${r.carPlate.replace(/"/g, '""')}"`,
        `"${r.carModel.replace(/"/g, '""')}"`,
        r.mileageKm || 0,
        `"${oil.replace(/"/g, '""')}"`,
        `"${parts.replace(/"/g, '""')}"`,
        `"${(r.partsToReplace || '').replace(/"/g, '""')}"`,
        r.costUzs || 0,
        `"${dateFormatted}"`,
        days,
        `"${r.status === 'bajarildi' ? 'Bajarildi' : r.status === 'jarayonda' ? 'Jarayonda' : 'Zapchast Kutilmoqda'}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Daewoo_Nargiz_Servis_Excel_Jadvali_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Excel Table view
  const handlePrintTable = async () => {
    await createAdminLog("Jadval Chop Etildi", "Xizmatlar jadvali print qilindi", username);
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* TOP PRIMARY NAVIGATION: YAGONA MIJOZLAR CRM VS XIZMATLAR RO'YXATI (Faqat Admin uchun) */}
      {isAdmin && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setActiveMainTab('crm');
                createAdminLog("CRM Bo'limiga O'tildi", "Yagona mijozlar CRM jadvali ochildi", username);
              }}
              className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'crm'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-blue-400" />
              <span>Mijozlar CRM ({uniqueCustomersCount})</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                Takrorsiz
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMainTab('records');
                createAdminLog("Xizmatlar Tarixiga O'tildi", "Xizmatlar ro'yxati ochildi", username);
              }}
              className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'records'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Xizmatlar Tarixi ({records.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium px-2">
            {activeMainTab === 'crm' ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Yagona mijozlar bazasi • .xlsx eksport • Shaxsiy chuqur tahlil</span>
              </span>
            ) : (
              <span>Barcha avtomobillarga ko'rsatilgan xizmatlar tarixi</span>
            )}
          </div>
        </div>
      )}

      {isAdmin && activeMainTab === 'crm' ? (
        <CustomerCrmSection
          records={records}
          username={username}
          onSelectCustomerForHistory={onSelectCustomer}
          onEditRecord={onEdit}
          onPrintRecord={onPrint}
          onOpenNewModal={onOpenNewModal}
          onUpdateCustomerInfo={onUpdateCustomerInfo}
        />
      ) : (
        <>
          {/* Search & Filter Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ism, telefon, davlat raqami, model, moy yoki zapchast bo'yicha qidirish..."
              className="w-full pl-10 pr-16 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-white"
              >
                Tozalash
              </button>
            )}
          </div>

          {/* View Mode Controls */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            {/* View Toggle: Excel Table / Cards */}
            <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl shrink-0">
              <button
                onClick={() => handleViewModeChange('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Excel Tartibida Jadval"
              >
                <Table className="w-4 h-4" />
                <span>Jadval</span>
              </button>

              <button
                onClick={() => handleViewModeChange('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Karta ko'rinishi"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Kartalar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Display Area */}
      {filteredRecords.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Mos keladigan ma'lumot topilmadi</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {statusFilter === 'moy'
                ? "Moy almashtirilgan yozuvlar topilmadi yoki qidiruv so'rovingizga mos emas."
                : "Qidiruv parametrlarini o'zgartiring yoki yangi xizmat yozuvini qo'shing."}
            </p>
          </div>
          <button
            onClick={onOpenNewModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Yozuv Kiritish</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Card Grid View */
        <div className="space-y-4">
          {username === 'daewoobuloqboshi' && !isRevealed && (
            <div className="p-4 bg-slate-900/95 border border-blue-500/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <EyeOff className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Bugungi yozuvlar xiralashtirilgan
                  </h4>
                  <p className="text-xs text-slate-400">
                    Ma&apos;lumotlarni ko&apos;rish uchun &quot;Ko&apos;rish 👁️&quot; tugmasini bosing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRevealed(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Eye className="w-4 h-4" />
                <span>Ko&apos;rish 👁️</span>
              </button>
            </div>
          )}

          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 ${!isRevealed ? 'filter blur-md select-none pointer-events-none transition-all duration-300' : 'transition-all duration-300'}`}>
            {filteredRecords.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onEdit={onEdit}
                onDelete={onDelete}
                onPrint={onPrint}
                onSelectCustomer={onSelectCustomer}
                onSyncRecord={onSyncRecord}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Excel Tartibida Jadval (Excel Spreadsheet View) */
        <div className="space-y-3">
          {/* Blur notification banner for daewoobuloqboshi */}
          {username === 'daewoobuloqboshi' && !isRevealed && (
            <div className="p-4 bg-slate-900/95 border border-blue-500/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <EyeOff className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Bugungi yozuvlar xiralashtirilgan
                  </h4>
                  <p className="text-xs text-slate-400">
                    Ma&apos;lumotlarni ko&apos;rish uchun &quot;Ko&apos;rish 👁️&quot; tugmasini bosing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRevealed(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Eye className="w-4 h-4" />
                <span>Ko&apos;rish 👁️</span>
              </button>
            </div>
          )}

          {/* Excel Toolbar & Summary Header */}
          <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-2xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
                <Table className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Excel Tartibidagi Servis Jadvali</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                    {filteredRecords.length} ta yozuv
                  </span>
                </div>
                <p className="text-xs text-emerald-300/80 mt-0.5">
                  Mijoz ustiga bossangiz pastki xizmatlar tarixi ochiladi • Excel qora chegarali grid tartibida
                </p>
              </div>
            </div>

            {/* Scope Switcher & Full Screen Table Modal Button */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
              {/* Date Scope Filter Buttons */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setDateScope('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    dateScope === 'today'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                  title="Faqat bugun qilingan ishlarni ko'rsatish"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Bugungi Ishlar</span>
                </button>

                <button
                  onClick={() => setDateScope('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    dateScope === 'all'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                  title="Barcha vaqtlardagi to'liq tarixni ko'rsatish"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Barcha Ishlar</span>
                </button>
              </div>

              {/* Toggle Reveal / Blur Button for daewoobuloqboshi */}
              {username === 'daewoobuloqboshi' && (
                <button
                  type="button"
                  onClick={() => setIsRevealed(!isRevealed)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                    isRevealed
                      ? 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                  }`}
                  title={isRevealed ? "Yozuvlarni yashirish/xiralashtirish" : "Bugungi yozuvlarni ko'rish"}
                >
                  {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{isRevealed ? "Yashirish" : "Ko'rish 👁️"}</span>
                </button>
              )}

              {/* Alohida Ekran Analytics & Full Table Modal Button - Hidden for daewoobuloqboshi */}
              {username !== 'daewoobuloqboshi' && (
                <button
                  onClick={() => onOpenAnalyticsModal ? onOpenAnalyticsModal() : setIsFullTableModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Tahlillar, mijozlar statistikasi va to'liq jadval analitikasi"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>To&apos;liq Jadval & Analitika 📊</span>
                </button>
              )}

              {/* Actions: Download Excel CSV / Print - Excel hidden for daewoobuloqboshi */}
              {username !== 'daewoobuloqboshi' && (
                <button
                  onClick={handleDownloadExcel}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Barcha ma'lumotlarni Excel fayli (.csv) holatida yuklab olish"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Excel</span>
                </button>
              )}

              <button
                onClick={handlePrintTable}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Jadvalni chop etish"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Chop etish</span>
              </button>
            </div>
          </div>

          {/* Mobile Swipe Hint Banner */}
          <div className="block lg:hidden text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 px-3.5 py-2 rounded-xl border border-emerald-800/60 flex items-center justify-between shadow-sm">
            <span>📱 Jadvalni to'liq va o'ng qismlarini ko'rish uchun chapga/o'ngga suring</span>
            <span className="text-[10px] bg-emerald-900/80 px-2 py-0.5 rounded-lg text-emerald-200 border border-emerald-700 font-mono font-bold shrink-0">↔ Scroll</span>
          </div>

          {/* Excel Spreadsheet Table Container with Crisp Black/Dark Borders */}
          <div className="bg-slate-950 border-2 border-slate-700/90 rounded-2xl overflow-hidden shadow-2xl overflow-x-auto print:border-black">
            <table className="w-full text-left border-collapse min-w-[1000px] font-sans text-xs border-slate-700">
              {/* Excel Table Header Row */}
              <thead>
                <tr className="bg-slate-950 border-b-2 border-slate-700 text-[11px] font-bold text-slate-200 uppercase tracking-wider">
                  <th className="py-3.5 px-3 text-center border-r border-slate-700 w-12 bg-slate-950">№</th>
                  <th className="py-3.5 px-4 border-r border-slate-700 min-w-[180px]">Mijoz & Mashina (Tarix 📋)</th>
                  <th className="py-3.5 px-3 border-r border-slate-700 whitespace-nowrap text-center">Telefon</th>
                  <th className="py-3.5 px-3 border-r border-slate-700 text-center whitespace-nowrap">Yurgan (Km)</th>
                  <th className="py-3.5 px-4 border-r border-slate-700 min-w-[170px] text-amber-400">Almashtirilgan Moy 🛢️</th>
                  <th className="py-3.5 px-4 border-r border-slate-700 min-w-[180px] text-emerald-400">Almashtirilgan Zapchast ⚙️</th>
                  <th className="py-3.5 px-4 border-r border-slate-700 min-w-[160px] text-amber-300">Almashtirilishi Kerak ⚠️</th>
                  <th className="py-3.5 px-3 border-r border-slate-700 text-right whitespace-nowrap">Xizmat (UZS)</th>
                  <th className="py-3.5 px-3 border-r border-slate-700 text-center whitespace-nowrap">Almashtirilgan Sana / Moy</th>
                  <th className="py-3.5 px-3 border-r border-slate-700 text-center whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap print:hidden">Amallar</th>
                </tr>
              </thead>

              {/* Table Rows */}
              <tbody className={`divide-y divide-slate-700/80 text-slate-200 font-normal ${!isRevealed ? 'filter blur-md select-none pointer-events-none transition-all duration-300' : 'transition-all duration-300'}`}>
                {filteredRecords.map((record, index) => {
                  const isOil = checkIsOilRecord(record);
                  const daysAgo = getDaysAgo(record.createdAt);
                  const isUrgentOil = isOil && daysAgo >= 60; // Over 60 days old oil change
                  const { oil, parts } = getOilAndParts(record);

                  return (
                    <tr
                      key={record.id}
                      className={`transition-colors border-b border-slate-700/80 ${
                        record.isOffline
                          ? 'bg-amber-950/30 hover:bg-amber-950/40'
                          : isUrgentOil
                          ? 'bg-amber-950/20 hover:bg-amber-950/30'
                          : index % 2 === 0
                          ? 'bg-slate-900'
                          : 'bg-slate-950/70'
                      } hover:bg-slate-800/60`}
                    >
                      {/* Row Index Number */}
                      <td className="py-3.5 px-3 text-center border-r border-slate-700 font-mono text-slate-400 font-bold bg-slate-950/60">
                        {index + 1}
                      </td>

                      {/* Customer Name & Car Plate - CLICKABLE FOR HISTORY */}
                      <td className="py-3.5 px-4 border-r border-slate-700">
                        <button
                          onClick={() => onSelectCustomer && onSelectCustomer(record.carPlate, record.customerName)}
                          className="text-left w-full group cursor-pointer"
                          title="Mijoz xizmatlar tarixini ko'rish uchun bosing"
                        >
                          <div className="font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                            <span className="underline underline-offset-2 decoration-blue-500/40">{record.customerName}</span>
                            {isOil && (
                              <span className="text-[10px] text-amber-400" title="Moy almashtirish xizmati">
                                🛢️
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950 text-blue-400 border border-slate-700 whitespace-nowrap group-hover:border-blue-500">
                              {record.carPlate}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium truncate max-w-[120px]">
                              {record.carModel}
                            </span>
                          </div>
                        </button>
                      </td>

                      {/* Phone Number */}
                      <td className="py-3.5 px-3 border-r border-slate-700 whitespace-nowrap text-center font-mono">
                        <a
                          href={`tel:${record.phoneNumber.replace(/\s+/g, '')}`}
                          className="text-blue-400 hover:text-blue-300 font-medium"
                        >
                          {record.phoneNumber}
                        </a>
                      </td>

                      {/* Mileage Km */}
                      <td className="py-3.5 px-3 border-r border-slate-700 text-center whitespace-nowrap font-mono font-bold text-slate-100">
                        {record.mileageKm ? `${Number(record.mileageKm).toLocaleString('uz-UZ')} km` : '—'}
                      </td>

                      {/* Replaced Oil Column */}
                      <td className="py-3.5 px-4 border-r border-slate-700">
                        <div className="font-semibold text-amber-300 leading-snug">
                          {oil}
                        </div>
                      </td>

                      {/* Replaced Parts Column */}
                      <td className="py-3.5 px-4 border-r border-slate-700">
                        <div className="font-medium text-emerald-300 leading-snug">
                          {parts}
                        </div>
                        {record.notes && (
                          <div className="text-[10px] text-slate-400 mt-0.5 italic">
                            Izoh: {record.notes}
                          </div>
                        )}
                      </td>

                      {/* Parts to Replace */}
                      <td className="py-3.5 px-4 border-r border-slate-700">
                        <div className="font-medium text-amber-300 leading-snug">
                          {record.partsToReplace || '—'}
                        </div>
                      </td>

                      {/* Service Cost */}
                      <td className="py-3.5 px-3 border-r border-slate-700 text-right whitespace-nowrap font-mono font-bold text-white">
                        {record.costUzs ? `${Number(record.costUzs).toLocaleString('uz-UZ')} so'm` : '0 so\'m'}
                      </td>

                      {/* Date & Oil Change Timing / Offline Badge */}
                      <td className="py-3.5 px-3 border-r border-slate-700 whitespace-nowrap">
                        <div className="text-slate-300 font-medium text-[11px]">
                          {new Date(record.createdAt).toLocaleDateString('uz-UZ')}
                        </div>

                        {record.isOffline ? (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950 border border-amber-700 text-amber-300 text-[10px] font-bold">
                              ⚡ Offline
                            </span>
                            {onSyncRecord && (
                              <button
                                onClick={() => onSyncRecord(record.id)}
                                className="px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold transition-all cursor-pointer"
                                title="Sinxronlash"
                              >
                                🔄
                              </button>
                            )}
                          </div>
                        ) : isOil ? (
                          <div className="mt-1">
                            {isUrgentOil ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-950/80 border border-red-700/80 text-red-300 text-[10px] font-bold">
                                ⚠️ {daysAgo} kun oldin (Almashtirish vaqti kelgan!)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[10px] font-semibold">
                                🛢️ {daysAgo} kun oldin
                              </span>
                            )}
                          </div>
                        ) : null}
                      </td>

                      {/* Service Status */}
                      <td className="py-3.5 px-3 border-r border-slate-700 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            record.status === 'bajarildi'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : record.status === 'jarayonda'
                              ? 'bg-blue-950 text-blue-300 border-blue-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}
                        >
                          {record.status === 'bajarildi'
                            ? 'Bajarildi'
                            : record.status === 'jarayonda'
                            ? 'Jarayonda'
                            : 'Zapchast Kutilmoqda'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap print:hidden">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onPrint(record)}
                            title="Chek chiqarish"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEdit(record)}
                            title="Tahrirlash"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-300 hover:bg-blue-900/40 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(record.id)}
                            title="O'chirish"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-900/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Excel Table Footer Summary Row */}
              <tfoot>
                <tr className="bg-slate-950 border-t-2 border-slate-700 text-xs font-bold text-white">
                  {username === 'daewoobuloqboshi' ? (
                    <td colSpan={11} className="py-3.5 px-4 text-slate-400 text-center uppercase tracking-wider font-semibold">
                      Jadvalda jami {filteredRecords.length} ta xizmat ko&apos;rsatilgan
                    </td>
                  ) : (
                    <>
                      <td colSpan={7} className="py-3.5 px-4 border-r border-slate-700 text-emerald-400 uppercase tracking-wider text-right">
                        JAMI SUMMA ({filteredRecords.length} TA XIZMAT):
                      </td>
                      <td className="py-3.5 px-3 border-r border-slate-700 text-right font-mono text-emerald-300 text-sm font-extrabold">
                        {stats.totalCost.toLocaleString('uz-UZ')} so&apos;m
                      </td>
                      <td colSpan={3} className="py-3.5 px-3 text-slate-400 font-normal italic text-center">
                        &quot;Daewoo Nargiz Auto Servis&quot; rasmiy jadvali
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
        </>
      )}

      {/* Full-Screen Table Modal (Alohida Ekran) */}
      {isFullTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col p-2 sm:p-6 overflow-hidden">
          {/* Modal Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-t-2xl p-4 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Table className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>To'liq Servis Jadvali (Alohida Ekran)</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30 text-xs font-mono font-bold">
                    {records.length} ta umumiy yozuv
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Barcha vaqtlardagi to'liq hisob va mijozlar bazasi
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadExcel}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button
                onClick={handlePrintTable}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Chop etish</span>
              </button>
              <button
                onClick={() => setIsFullTableModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Yopish"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Table Body */}
          <div className="flex-1 bg-slate-950 border-x border-b border-slate-800 rounded-b-2xl overflow-auto p-2 sm:p-4 shadow-2xl">
            <table className="w-full text-left border-collapse min-w-[1000px] font-sans text-xs border border-slate-700">
              <thead>
                <tr className="bg-slate-900 border-b-2 border-slate-700 text-[11px] font-bold text-slate-200 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center border-r border-slate-700 w-12 bg-slate-900">№</th>
                  <th className="py-3 px-4 border-r border-slate-700 min-w-[180px]">Mijoz & Mashina</th>
                  <th className="py-3 px-3 border-r border-slate-700 text-center whitespace-nowrap">Telefon</th>
                  <th className="py-3 px-3 border-r border-slate-700 text-center whitespace-nowrap">Yurgan (Km)</th>
                  <th className="py-3 px-4 border-r border-slate-700 min-w-[170px] text-amber-400">Almashtirilgan Moy 🛢️</th>
                  <th className="py-3 px-4 border-r border-slate-700 min-w-[180px] text-emerald-400">Almashtirilgan Zapchast ⚙️</th>
                  <th className="py-3 px-4 border-r border-slate-700 min-w-[160px] text-amber-300">Almashtirilishi Kerak</th>
                  <th className="py-3 px-3 border-r border-slate-700 text-right whitespace-nowrap">Xizmat (UZS)</th>
                  <th className="py-3 px-3 border-r border-slate-700 text-center whitespace-nowrap">Sana / Moy</th>
                  <th className="py-3 px-3 border-r border-slate-700 text-center whitespace-nowrap">Status</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Amallar</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-700 text-slate-200">
                {records.map((record, index) => {
                  const isOil = checkIsOilRecord(record);
                  const { oil, parts } = getOilAndParts(record);
                  return (
                    <tr
                      key={record.id}
                      className={`transition-colors border-b border-slate-700 ${
                        index % 2 === 0 ? 'bg-slate-900/90' : 'bg-slate-950'
                      } hover:bg-slate-800`}
                    >
                      <td className="py-3 px-3 text-center border-r border-slate-700 font-mono text-slate-400 font-bold">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-700">
                        <button
                          onClick={() => {
                            setIsFullTableModalOpen(false);
                            onSelectCustomer && onSelectCustomer(record.carPlate, record.customerName);
                          }}
                          className="text-left group cursor-pointer"
                        >
                          <div className="font-bold text-white group-hover:text-blue-400 flex items-center gap-1.5">
                            <span className="underline underline-offset-2 decoration-blue-500/40">{record.customerName}</span>
                            {isOil && <span className="text-[10px] text-amber-400">🛢️</span>}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono bg-slate-800 text-slate-200 px-1.5 py-0.2 rounded border border-slate-700">
                              {record.carPlate}
                            </span>
                            <span>• {record.carModel}</span>
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-3 border-r border-slate-700 text-center font-mono text-slate-300">
                        {record.phoneNumber || '-'}
                      </td>
                      <td className="py-3 px-3 border-r border-slate-700 text-center font-mono text-blue-300 font-bold">
                        {record.mileageKm ? `${Number(record.mileageKm).toLocaleString('uz-UZ')} km` : '-'}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-700 font-semibold text-amber-300">
                        {oil}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-700 font-medium text-emerald-300">
                        {parts}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-700 text-amber-300">
                        {record.partsToReplace || '-'}
                      </td>
                      <td className="py-3 px-3 border-r border-slate-700 text-right font-mono font-bold text-emerald-400">
                        {record.costUzs ? `${Number(record.costUzs).toLocaleString('uz-UZ')} so'm` : "0 so'm"}
                      </td>
                      <td className="py-3 px-3 border-r border-slate-700 text-center whitespace-nowrap text-[11px] text-slate-300">
                        <div>{new Date(record.createdAt).toLocaleDateString('uz-UZ')}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(record.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3 px-3 border-r border-slate-700 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            record.status === 'bajarildi'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                              : record.status === 'jarayonda'
                              ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                              : 'bg-amber-950/80 text-amber-300 border-amber-800'
                          }`}
                        >
                          {record.status === 'bajarildi' ? 'Bajarildi' : record.status === 'jarayonda' ? 'Jarayonda' : 'Kutilmoqda'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setIsFullTableModalOpen(false);
                              onPrint(record);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setIsFullTableModalOpen(false);
                              onEdit(record);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-300 hover:bg-blue-900/40 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className="bg-slate-900 border-t-2 border-slate-700 text-xs font-bold text-white">
                  <td colSpan={7} className="py-3.5 px-4 border-r border-slate-700 text-emerald-400 uppercase tracking-wider text-right">
                    JAMI SUMMA ({records.length} TA XIZMAT):
                  </td>
                  <td className="py-3.5 px-3 border-r border-slate-700 text-right font-mono text-emerald-300 text-sm font-extrabold">
                    {records.reduce((sum, r) => sum + (Number(r.costUzs) || 0), 0).toLocaleString('uz-UZ')} so&apos;m
                  </td>
                  <td colSpan={3} className="py-3.5 px-3 text-slate-400 font-normal italic text-center">
                    "Daewoo Nargiz Auto Servis" to'liq hisob bazasi
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

