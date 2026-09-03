import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Search,
  Trash2,
  Edit3,
  Calendar,
  Phone,
  Wrench,
  Droplet,
  DollarSign,
  AlertTriangle,
  Clock,
  X,
  Save,
  Database,
  Filter,
  FileSpreadsheet,
  Users,
  Layers,
  ShieldAlert,
  ArrowUpDown,
  Sparkles,
  ChevronDown,
  Check,
  RotateCcw
} from 'lucide-react';
import { ServiceRecord, RecordStatus, DatabaseWipeRequest } from '../types';
import { createAdminLog } from '../lib/adminSession';
import {
  subscribeToWipeRequest,
  startDatabaseWipeRequest,
  cancelDatabaseWipeRequest,
  executeDatabaseWipe,
} from '../lib/firebase';
import { BusinessAnalyticsDashboard } from './BusinessAnalyticsDashboard';

interface MultiSelectFilterProps {
  label: string;
  icon: React.ReactNode;
  items: Array<{ name: string; count: number }>;
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  theme: 'amber' | 'blue' | 'emerald';
}

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  icon,
  items,
  selectedValues,
  onChange,
  placeholder = "Tanlang...",
  theme,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase().trim())
    );
  }, [items, search]);

  const toggleItem = (name: string) => {
    if (selectedValues.includes(name)) {
      onChange(selectedValues.filter((v) => v !== name));
    } else {
      onChange([...selectedValues, name]);
    }
  };

  const selectAll = () => {
    const newItems = Array.from(new Set([...selectedValues, ...filteredItems.map((i) => i.name)]));
    onChange(newItems);
  };

  const clearAll = () => {
    onChange([]);
  };

  // Color theme configurations
  const themeStyles = {
    amber: {
      border: 'border-amber-500/40',
      activeBorder: 'border-amber-400',
      bg: 'bg-amber-950/40',
      text: 'text-amber-300',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      chip: 'bg-amber-500/20 text-amber-200 border-amber-500/40 hover:bg-amber-500/30',
      checkbox: 'accent-amber-500',
      highlight: 'text-amber-400',
      btnHover: 'hover:bg-amber-500/20',
    },
    blue: {
      border: 'border-blue-500/40',
      activeBorder: 'border-blue-400',
      bg: 'bg-blue-950/40',
      text: 'text-blue-300',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      chip: 'bg-blue-500/20 text-blue-200 border-blue-500/40 hover:bg-blue-500/30',
      checkbox: 'accent-blue-500',
      highlight: 'text-blue-400',
      btnHover: 'hover:bg-blue-500/20',
    },
    emerald: {
      border: 'border-emerald-500/40',
      activeBorder: 'border-emerald-400',
      bg: 'bg-emerald-950/40',
      text: 'text-emerald-300',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      chip: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/30',
      checkbox: 'accent-emerald-500',
      highlight: 'text-emerald-400',
      btnHover: 'hover:bg-emerald-500/20',
    },
  }[theme];

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger button */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex-1 min-w-[220px] flex items-center justify-between gap-2 px-3 py-2 bg-slate-950 border ${
            selectedValues.length > 0 ? themeStyles.activeBorder : themeStyles.border
          } hover:border-slate-500 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm`}
        >
          <div className="flex items-center gap-2 truncate">
            {icon}
            <span className="text-slate-300 shrink-0">{label}:</span>
            {selectedValues.length === 0 ? (
              <span className="text-slate-400 font-normal truncate">
                Barchasi ({items.length} xil mavjud)
              </span>
            ) : (
              <span className={`font-bold truncate ${themeStyles.text}`}>
                {selectedValues.length === 1
                  ? selectedValues[0]
                  : `${selectedValues.length} ta tanlandi`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {selectedValues.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${themeStyles.badge}`}>
                {selectedValues.length}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {selectedValues.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${themeStyles.badge} hover:bg-opacity-40`}
            title="Barcha tanlovlarni tozalash"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tozalash</span>
          </button>
        )}
      </div>

      {/* Selected Chips row */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {selectedValues.map((val) => (
            <span
              key={val}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${themeStyles.chip} shadow-sm animate-in fade-in duration-150`}
            >
              <span>{val}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(val);
                }}
                className="hover:text-red-400 hover:bg-black/20 rounded p-0.5 cursor-pointer transition-colors"
                title="O'chirish"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Floating Dropdown Modal/Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-slate-900/98 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-2.5 max-h-[340px] flex flex-col space-y-2">
          {/* Search bar inside dropdown */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ro'yxatdan qidirish..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-slate-500 placeholder-slate-500"
              autoFocus
            />
          </div>

          {/* Quick Actions (Select All / Clear) */}
          <div className="flex items-center justify-between text-[11px] px-1 py-0.5 text-slate-400 border-b border-slate-800 pb-1.5">
            <span className="font-semibold">{filteredItems.length} xil topildi</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="hover:text-emerald-400 text-slate-300 font-semibold cursor-pointer transition-colors"
              >
                Hammasini tanlash
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={clearAll}
                className="hover:text-red-400 text-slate-300 font-semibold cursor-pointer transition-colors"
              >
                Tozalash
              </button>
            </div>
          </div>

          {/* Scrollable list with checkboxes */}
          <div className="overflow-y-auto space-y-1 max-h-[200px] pr-1">
            {filteredItems.length === 0 ? (
              <div className="py-5 text-center text-slate-500 text-xs">
                Hech qanday mos yozuv topilmadi
              </div>
            ) : (
              filteredItems.map((item) => {
                const isChecked = selectedValues.includes(item.name);
                return (
                  <label
                    key={item.name}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isChecked
                        ? `${themeStyles.bg} ${themeStyles.text} font-bold border border-${theme === 'amber' ? 'amber-500/30' : theme === 'blue' ? 'blue-500/30' : 'emerald-500/30'}`
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleItem(item.name)}
                        className={`w-4 h-4 rounded border-slate-700 ${themeStyles.checkbox} cursor-pointer`}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-normal bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
                      {item.count} ta
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {/* Bottom Done button */}
          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {selectedValues.length} ta tanlangan
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg cursor-pointer transition-colors"
            >
              Tayyor
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface AdminRecordsManagerProps {
  records: ServiceRecord[];
  currentUsername: string;
  onSaveRecord: (record: ServiceRecord) => Promise<void> | void;
  onDeleteRecord: (id: string) => Promise<void> | void;
  onClearAllRecords: () => Promise<void> | void;
}

export const AdminRecordsManager: React.FC<AdminRecordsManagerProps> = ({
  records,
  currentUsername,
  onSaveRecord,
  onDeleteRecord,
  onClearAllRecords,
}) => {
  // Main view section: 'services' (Ko'rsatilgan xizmatlar) or 'customers' (Mijozlar)
  const [activeSection, setActiveSection] = useState<'services' | 'customers'>('services');

  // 1-Hour Delayed Wipe Request State
  const [wipeRequest, setWipeRequest] = useState<DatabaseWipeRequest | null>(null);
  const [remainingTimeSec, setRemainingTimeSec] = useState<number>(0);
  const [showInitiateWipeModal, setShowInitiateWipeModal] = useState(false);
  const [showFinalWipeModal, setShowFinalWipeModal] = useState(false);
  const [isWipeActionLoading, setIsWipeActionLoading] = useState(false);

  // Edit record state
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
  const [editForm, setEditForm] = useState<Partial<ServiceRecord>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Single record delete state
  const [recordToDelete, setRecordToDelete] = useState<ServiceRecord | null>(null);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Subscribe to real-time Wipe Request
  useEffect(() => {
    const unsub = subscribeToWipeRequest((req) => {
      setWipeRequest(req);
    });
    return () => unsub();
  }, []);

  // Timer countdown ticker for wipe request
  useEffect(() => {
    if (!wipeRequest || wipeRequest.status !== 'pending') {
      setRemainingTimeSec(0);
      return;
    }

    const calculateRemaining = () => {
      const scheduledMs = new Date(wipeRequest.scheduledFor).getTime();
      const diffSec = Math.max(0, Math.floor((scheduledMs - Date.now()) / 1000));
      setRemainingTimeSec(diffSec);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [wipeRequest]);

  // Handle Initiating 1-Hour Wipe Delay
  const handleStartWipeDelay = async () => {
    setIsWipeActionLoading(true);
    try {
      const req = await startDatabaseWipeRequest(currentUsername);
      setWipeRequest(req);
      setShowInitiateWipeModal(false);
      await createAdminLog(
        "Bazani O'chirish So'rovi Boshlandi (1 Soatlik)",
        `Super Admin "${currentUsername}" tomonidan barcha bazani o'chirish uchun 1 soatlik xavfsizlik vaqti boshlandi. Tugash vaqti: ${new Date(req.scheduledFor).toLocaleTimeString('uz-UZ')}`,
        currentUsername
      );
      showToast("⏳ 1 soatlik xavfsizlik vaqti boshlandi! 1 soat ichida istalgan payt bekor qilishingiz mumkin.");
    } catch (e) {
      console.error(e);
      showToast("Xatolik yuz berdi!");
    } finally {
      setIsWipeActionLoading(false);
    }
  };

  // Handle Cancelling 1-Hour Wipe Delay
  const handleCancelWipeDelay = async () => {
    setIsWipeActionLoading(true);
    try {
      await cancelDatabaseWipeRequest();
      setWipeRequest(null);
      await createAdminLog(
        "Bazani O'chirish So'rovi Bekor Qilindi",
        `Super Admin "${currentUsername}" tomonidan bazani o'chirish jarayoni bekor qilindi`,
        currentUsername
      );
      showToast("✅ Baza o'chirish so'rovi muvaffaqiyatli bekor qilindi. Ma'lumotlar saqlab qolindi.");
    } catch (e) {
      console.error(e);
      showToast("Bekor qilishda xatolik!");
    } finally {
      setIsWipeActionLoading(false);
    }
  };

  // Handle Final Confirmed Wipe after 1 hour has elapsed
  const handleFinalConfirmWipe = async () => {
    setIsWipeActionLoading(true);
    try {
      await executeDatabaseWipe();
      if (onClearAllRecords) {
        await onClearAllRecords();
      }
      setWipeRequest(null);
      setShowFinalWipeModal(false);
      await createAdminLog(
        "Bazani Butunlay Tozalash (Yakuniy Tasdiqlandi)",
        `1 soatlik kutilish muddati yakunlangach, Super Admin "${currentUsername}" tomonidan barcha mijozlar va xizmat yozuvlari butunlay o'chirib yuborildi`,
        currentUsername
      );
      showToast("🔥 Barcha xizmat yozuvlari va mijozlar bazasi to'liq tozalandi!");
    } catch (e) {
      console.error(e);
      showToast("Bazani tozalashda xatolik yuz berdi!");
    } finally {
      setIsWipeActionLoading(false);
    }
  };

  // Total revenue & stats
  const totalRevenue = useMemo(() => {
    return records.reduce((sum, r) => sum + (Number(r.costUzs) || 0), 0);
  }, [records]);

  // Extract Unique Oils from database records with counts
  const availableOils = useMemo(() => {
    const counts = new Map<string, number>();
    records.forEach((r) => {
      const oil = r.replacedOil?.trim();
      if (oil) {
        counts.set(oil, (counts.get(oil) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [records]);

  // Extract Unique Parts / Services from database records with counts
  const availableParts = useMemo(() => {
    const counts = new Map<string, number>();
    records.forEach((r) => {
      const partsStr = r.replacedParts?.trim();
      if (partsStr) {
        const parts = partsStr.split(/[,;\n\r]+/).map((p) => p.trim()).filter(Boolean);
        parts.forEach((p) => {
          counts.set(p, (counts.get(p) || 0) + 1);
        });
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [records]);

  // ==========================================
  // SHARED & SYNCHRONIZED FILTER STATE (FOR SERVICES & CUSTOMERS)
  // ==========================================
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<
    'all' | 'oil_all' | 'oil_only' | 'oil_mixed' | 'parts_all' | 'parts_only' | 'parts_mixed' | 'oil_and_parts'
  >('all');
  const [selectedOils, setSelectedOils] = useState<string[]>([]);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sort & Customer-specific loyalty filters
  const [serviceSortBy, setServiceSortBy] = useState<'newest' | 'oldest'>('newest');
  const [customerVisitFilter, setCustomerVisitFilter] = useState<'all' | '1' | '2_to_4' | '5_plus'>('all');
  const [customerSortBy, setCustomerSortBy] = useState<'total_spent' | 'visit_count' | 'last_visit' | 'name'>('total_spent');

  // Deduction toggle states (Pure Oil / Pure Parts)
  const [deductPartsForOil, setDeductPartsForOil] = useState<boolean>(false);
  const [deductOilForParts, setDeductOilForParts] = useState<boolean>(false);

  // Backward-compatible aliases
  const serviceSearch = searchTerm;
  const setServiceSearch = setSearchTerm;
  const customerSearch = searchTerm;
  const setCustomerSearch = setSearchTerm;
  const customerServiceTypeFilter = serviceTypeFilter;
  const setCustomerServiceTypeFilter = setServiceTypeFilter;
  const serviceSelectedOils = selectedOils;
  const setServiceSelectedOils = setSelectedOils;
  const customerSelectedOils = selectedOils;
  const setCustomerSelectedOils = setSelectedOils;
  const serviceSelectedParts = selectedParts;
  const setServiceSelectedParts = setSelectedParts;
  const customerSelectedParts = selectedParts;
  const setCustomerSelectedParts = setSelectedParts;
  const serviceDateFilter = dateFilter;
  const setServiceDateFilter = setDateFilter;
  const customerDateFilter = dateFilter;
  const setCustomerDateFilter = setDateFilter;
  const serviceStartDate = startDate;
  const setServiceStartDate = setStartDate;
  const customerStartDate = startDate;
  const setCustomerStartDate = setStartDate;
  const serviceEndDate = endDate;
  const setServiceEndDate = setEndDate;
  const customerEndDate = endDate;
  const setCustomerEndDate = setEndDate;

  // Is an oil-oriented filter currently active?
  const isOilFilterActive =
    serviceTypeFilter === 'oil_all' ||
    serviceTypeFilter === 'oil_only' ||
    serviceTypeFilter === 'oil_mixed' ||
    selectedOils.length > 0;

  // Is a parts-oriented filter currently active?
  const isPartsFilterActive =
    serviceTypeFilter === 'parts_all' ||
    serviceTypeFilter === 'parts_only' ||
    serviceTypeFilter === 'parts_mixed' ||
    selectedParts.length > 0;

  // Is any service filter active?
  const isAnyServiceFilterActive =
    serviceTypeFilter !== 'all' ||
    selectedOils.length > 0 ||
    selectedParts.length > 0 ||
    dateFilter !== 'all' ||
    Boolean(searchTerm.trim()) ||
    deductPartsForOil ||
    deductOilForParts;

  // Reset all active filters
  const handleResetAllFilters = () => {
    setSearchTerm('');
    setServiceTypeFilter('all');
    setSelectedOils([]);
    setSelectedParts([]);
    setDateFilter('all');
    setStartDate('');
    setEndDate('');
    setDeductPartsForOil(false);
    setDeductOilForParts(false);
    setCustomerVisitFilter('all');
    showToast("🔄 Barcha filtrlar tozalandi!");
  };

  // Predicate: check whether a record matches the active service filters
  const matchesServiceFilters = (record: ServiceRecord) => {
    // 1. Service Type filter: Moy / Zapchast / Moy+Zapchast / Sof / Aralash
    const hasOil = Boolean(record.replacedOil && record.replacedOil.trim());
    const hasParts = Boolean(
      (record.replacedParts && record.replacedParts.trim()) ||
      (record.partsToReplace && record.partsToReplace.trim())
    );

    if (serviceTypeFilter === 'oil_all') {
      if (!hasOil) return false;
    } else if (serviceTypeFilter === 'oil_only') {
      if (!hasOil || hasParts) return false;
    } else if (serviceTypeFilter === 'oil_mixed') {
      if (!hasOil || !hasParts) return false;
    } else if (serviceTypeFilter === 'parts_all') {
      if (!hasParts) return false;
    } else if (serviceTypeFilter === 'parts_only') {
      if (!hasParts || hasOil) return false;
    } else if (serviceTypeFilter === 'parts_mixed') {
      if (!hasParts || !hasOil) return false;
    } else if (serviceTypeFilter === 'oil_and_parts') {
      if (!hasOil || !hasParts) return false;
    }

    // 2. Specific Oils filter (Multi-selection)
    if (selectedOils.length > 0) {
      const recOil = (record.replacedOil || '').toLowerCase();
      const matchesAnyOil = selectedOils.some((oil) =>
        recOil.includes(oil.toLowerCase().trim())
      );
      if (!matchesAnyOil) return false;
    }

    // 3. Specific Parts filter (Multi-selection)
    if (selectedParts.length > 0) {
      const recPart = `${record.replacedParts || ''} ${record.partsToReplace || ''}`.toLowerCase();
      const matchesAnyPart = selectedParts.some((part) =>
        recPart.includes(part.toLowerCase().trim())
      );
      if (!matchesAnyPart) return false;
    }

    // 4. Date filter
    if (dateFilter !== 'all') {
      const recDate = new Date(record.createdAt);
      const now = new Date();

      if (dateFilter === 'today') {
        if (
          recDate.getFullYear() !== now.getFullYear() ||
          recDate.getMonth() !== now.getMonth() ||
          recDate.getDate() !== now.getDate()
        ) {
          return false;
        }
      } else if (dateFilter === 'this_week') {
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay() || 7;
        startOfWeek.setDate(startOfWeek.getDate() - day + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        if (recDate < startOfWeek) return false;
      } else if (dateFilter === 'this_month') {
        if (recDate.getFullYear() !== now.getFullYear() || recDate.getMonth() !== now.getMonth()) {
          return false;
        }
      } else if (dateFilter === 'this_year') {
        if (recDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      } else if (dateFilter === 'custom') {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (recDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (recDate > end) return false;
        }
      }
    }

    // 5. Search term filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const customer = (record.customerName || '').toLowerCase();
      const plate = (record.carPlate || '').toLowerCase();
      const model = (record.carModel || '').toLowerCase();
      const phone = (record.phoneNumber || '').toLowerCase();
      const oil = (record.replacedOil || '').toLowerCase();
      const parts = (record.replacedParts || '').toLowerCase();
      const toReplace = (record.partsToReplace || '').toLowerCase();
      const notes = (record.notes || '').toLowerCase();
      const cost = String(record.costUzs || '');

      const matches =
        customer.includes(term) ||
        plate.includes(term) ||
        model.includes(term) ||
        phone.includes(term) ||
        oil.includes(term) ||
        parts.includes(term) ||
        toReplace.includes(term) ||
        notes.includes(term) ||
        cost.includes(term);

      if (!matches) return false;
    }

    return true;
  };

  // Helper: calculate effective cost of a record considering active deduction settings
  const getEffectiveRecordCost = (r: ServiceRecord) => {
    const cost = Number(r.costUzs || 0);
    const hasOil = Boolean(r.replacedOil && r.replacedOil.trim());
    const hasParts = Boolean(
      (r.replacedParts && r.replacedParts.trim()) ||
      (r.partsToReplace && r.partsToReplace.trim())
    );

    if (hasOil && hasParts) {
      const explicitOil = r.oilCostUzs !== undefined && r.oilCostUzs !== '' ? Number(r.oilCostUzs) : undefined;
      const explicitParts = r.partsCostUzs !== undefined && r.partsCostUzs !== '' ? Number(r.partsCostUzs) : undefined;

      let oilShare = 0;
      let partsShare = 0;

      if (explicitOil !== undefined && explicitParts !== undefined) {
        oilShare = explicitOil;
        partsShare = explicitParts;
      } else if (explicitOil !== undefined) {
        oilShare = explicitOil;
        partsShare = Math.max(0, cost - explicitOil);
      } else if (explicitParts !== undefined) {
        partsShare = explicitParts;
        oilShare = Math.max(0, cost - explicitParts);
      } else {
        oilShare = Math.round(cost * 0.6);
        partsShare = cost - oilShare;
      }

      if (deductPartsForOil && isOilFilterActive) {
        return oilShare;
      }
      if (deductOilForParts && isPartsFilterActive) {
        return partsShare;
      }
    }

    return cost;
  };

  // Filtered Services list
  const filteredServices = useMemo(() => {
    return records
      .filter(matchesServiceFilters)
      .sort((a, b) => {
        if (serviceSortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (serviceSortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return 0;
      });
  }, [
    records,
    serviceTypeFilter,
    selectedOils,
    selectedParts,
    dateFilter,
    startDate,
    endDate,
    searchTerm,
    serviceSortBy,
  ]);

  // Deduction & Pure stats calculation for filtered services
  const servicePureStats = useMemo(() => {
    let totalGrossRevenue = 0;
    let pureOilPortionTotal = 0;
    let purePartsPortionTotal = 0;
    let deductedPartsTotal = 0;
    let deductedOilTotal = 0;

    let pureOilCount = 0;
    let purePartsCount = 0;
    let mixedCount = 0;

    filteredServices.forEach((r) => {
      const cost = Number(r.costUzs || 0);
      totalGrossRevenue += cost;

      const hasOil = Boolean(r.replacedOil && r.replacedOil.trim());
      const hasParts = Boolean(
        (r.replacedParts && r.replacedParts.trim()) ||
        (r.partsToReplace && r.partsToReplace.trim())
      );

      const explicitOil = r.oilCostUzs !== undefined && r.oilCostUzs !== '' ? Number(r.oilCostUzs) : undefined;
      const explicitParts = r.partsCostUzs !== undefined && r.partsCostUzs !== '' ? Number(r.partsCostUzs) : undefined;

      if (hasOil && !hasParts) {
        pureOilCount++;
        pureOilPortionTotal += cost;
      } else if (!hasOil && hasParts) {
        purePartsCount++;
        purePartsPortionTotal += cost;
      } else if (hasOil && hasParts) {
        mixedCount++;
        let oilShare = 0;
        let partsShare = 0;

        if (explicitOil !== undefined && explicitParts !== undefined) {
          oilShare = explicitOil;
          partsShare = explicitParts;
        } else if (explicitOil !== undefined) {
          oilShare = explicitOil;
          partsShare = Math.max(0, cost - explicitOil);
        } else if (explicitParts !== undefined) {
          partsShare = explicitParts;
          oilShare = Math.max(0, cost - explicitParts);
        } else {
          oilShare = Math.round(cost * 0.6);
          partsShare = cost - oilShare;
        }

        pureOilPortionTotal += oilShare;
        purePartsPortionTotal += partsShare;
        deductedPartsTotal += partsShare;
        deductedOilTotal += oilShare;
      }
    });

    return {
      totalGrossRevenue,
      pureOilPortionTotal,
      purePartsPortionTotal,
      deductedPartsTotal,
      deductedOilTotal,
      pureOilCount,
      purePartsCount,
      mixedCount,
    };
  }, [filteredServices]);

  // Active filter items for Services tab (for dynamic dashboard & badges)
  const serviceActiveFiltersSummary = useMemo(() => {
    const activeItems: { label: string; value: string; color?: 'purple' | 'amber' | 'blue' | 'emerald' | 'rose' | 'slate' }[] = [];

    if (dateFilter !== 'all') {
      let dateText = '';
      if (dateFilter === 'today') dateText = 'Bugun';
      else if (dateFilter === 'this_week') dateText = 'Shu hafta';
      else if (dateFilter === 'this_month') dateText = 'Shu oy';
      else if (dateFilter === 'this_year') dateText = 'Shu yil';
      else if (dateFilter === 'custom') {
        dateText = `${startDate || '...'} — ${endDate || '...'}`;
      }
      activeItems.push({ label: 'Vaqt', value: dateText, color: 'purple' });
    }

    if (serviceTypeFilter !== 'all') {
      let typeText = '';
      if (serviceTypeFilter === 'oil_all') typeText = 'Barcha Moyli Xizmatlar';
      else if (serviceTypeFilter === 'oil_only') typeText = 'Faqat Sof Moy';
      else if (serviceTypeFilter === 'oil_mixed') typeText = 'Aralash Moy+Zapchast';
      else if (serviceTypeFilter === 'parts_all') typeText = 'Barcha Zapchastli Xizmatlar';
      else if (serviceTypeFilter === 'parts_only') typeText = 'Faqat Sof Zapchast';
      else if (serviceTypeFilter === 'parts_mixed') typeText = 'Aralash Zapchast+Moy';
      else if (serviceTypeFilter === 'oil_and_parts') typeText = 'Moy + Zapchast';
      activeItems.push({ label: 'Xizmat turi', value: typeText, color: 'emerald' });
    }

    if (deductPartsForOil && isOilFilterActive) {
      activeItems.push({
        label: 'Chegirma',
        value: `Zapchastlar olib tashlangan (-${servicePureStats.deductedPartsTotal.toLocaleString()} so'm)`,
        color: 'amber',
      });
    }

    if (deductOilForParts && isPartsFilterActive) {
      activeItems.push({
        label: 'Chegirma',
        value: `Moylar olib tashlangan (-${servicePureStats.deductedOilTotal.toLocaleString()} so'm)`,
        color: 'blue',
      });
    }

    if (selectedOils.length > 0) {
      activeItems.push({
        label: `Moylar (${selectedOils.length})`,
        value: selectedOils.join(', '),
        color: 'amber',
      });
    }

    if (selectedParts.length > 0) {
      activeItems.push({
        label: `Zapchastlar (${selectedParts.length})`,
        value: selectedParts.join(', '),
        color: 'blue',
      });
    }

    if (searchTerm.trim()) {
      activeItems.push({
        label: 'Qidiruv',
        value: `"${searchTerm.trim()}"`,
        color: 'rose',
      });
    }

    return activeItems;
  }, [
    dateFilter,
    startDate,
    endDate,
    serviceTypeFilter,
    deductPartsForOil,
    deductOilForParts,
    isOilFilterActive,
    isPartsFilterActive,
    servicePureStats.deductedPartsTotal,
    servicePureStats.deductedOilTotal,
    selectedOils,
    selectedParts,
    searchTerm,
  ]);

  // Export Services to Excel
  const handleExportServicesExcel = () => {
    const wb = XLSX.utils.book_new();

    const dataRows = filteredServices.map((r, idx) => ({
      '№': idx + 1,
      'Sana va Vaqt': new Date(r.createdAt).toLocaleString('uz-UZ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      'Mijoz Ismi': r.customerName,
      'Telefon Nomeri': r.phoneNumber,
      'Mashina Raqami': r.carPlate,
      'Mashina Rusumi': r.carModel || '—',
      'Bosgan Masofasi (km)': r.mileageKm || '—',
      'Almashtirilgan Moy': r.replacedOil || '—',
      'Bajarilgan Ishlar / Zapchastlar': r.replacedParts || '—',
      'Kelgusida Almashtirilishi Kerak': r.partsToReplace || '—',
      'Xizmat Narxi (UZS)': Number(r.costUzs) || 0,
      'Qo\'shimcha Izoh': r.notes || '—',
    }));

    const ws = XLSX.utils.json_to_sheet(dataRows);
    XLSX.utils.book_append_sheet(wb, ws, "Xizmatlar_Hisoboti");

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `daewoo_nargiz_xizmatlar_${dateStr}.xlsx`);
    showToast("📥 Ko'rsatilgan xizmatlar Excel (.xlsx) fayli yuklab olindi!");
  };

  // ==========================================
  // 2. CUSTOMERS (MIJOZLAR) AGGREGATION & FILTERING
  // ==========================================

  // Aggregate Unique Customers (All-time customer base)
  const customerList = useMemo(() => {
    const map = new Map<
      string,
      {
        plate: string;
        customerName: string;
        phoneNumber: string;
        carModel: string;
        totalVisits: number;
        allTimeSpent: number;
        lastVisitDate: string;
        lastMileage: string | number;
        lastOil: string;
        lastParts: string;
        records: ServiceRecord[];
      }
    >();

    records.forEach((r) => {
      const plate = (r.carPlate || 'NOMALUM').toUpperCase().trim();
      if (!map.has(plate)) {
        map.set(plate, {
          plate,
          customerName: r.customerName,
          phoneNumber: r.phoneNumber,
          carModel: r.carModel || '',
          totalVisits: 0,
          allTimeSpent: 0,
          lastVisitDate: r.createdAt,
          lastMileage: r.mileageKm || '',
          lastOil: r.replacedOil || '',
          lastParts: r.replacedParts || '',
          records: [],
        });
      }

      const c = map.get(plate)!;
      c.records.push(r);
      c.totalVisits += 1;
      c.allTimeSpent += Number(r.costUzs) || 0;

      if (new Date(r.createdAt) >= new Date(c.lastVisitDate)) {
        c.lastVisitDate = r.createdAt;
        c.customerName = r.customerName || c.customerName;
        c.phoneNumber = r.phoneNumber || c.phoneNumber;
        c.carModel = r.carModel || c.carModel;
        c.lastMileage = r.mileageKm || c.lastMileage;
        c.lastOil = r.replacedOil || c.lastOil;
        c.lastParts = r.replacedParts || c.lastParts;
      }
    });

    return Array.from(map.values());
  }, [records]);

  // Filtered Customers: applies matching filters from provided services
  const filteredCustomers = useMemo(() => {
    return customerList
      .map((c) => {
        // Find matching records for this customer based on active service filters
        const matchingRecords = c.records.filter(matchesServiceFilters);
        const matchingVisits = matchingRecords.length;

        // Calculate matching spent taking deduction into account
        const matchingSpent = matchingRecords.reduce(
          (sum, r) => sum + getEffectiveRecordCost(r),
          0
        );

        // Extract latest matching visit information
        const sortedMatching = [...matchingRecords].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const matchingLast = sortedMatching[0];

        return {
          ...c,
          matchingRecords,
          matchingVisits,
          matchingSpent,
          matchingLastDate: matchingLast ? matchingLast.createdAt : c.lastVisitDate,
          matchingLastMileage: matchingLast ? matchingLast.mileageKm || '' : c.lastMileage,
          matchingLastOil: matchingLast ? matchingLast.replacedOil || '' : c.lastOil,
          matchingLastParts: matchingLast ? matchingLast.replacedParts || '' : c.lastParts,
          totalSpent: isAnyServiceFilterActive ? matchingSpent : c.allTimeSpent,
        };
      })
      .filter((c) => {
        // 1. If any service filter is active, only include customers who have matching records!
        if (isAnyServiceFilterActive && c.matchingVisits === 0) {
          return false;
        }

        // 2. Customer Visit count loyalty filter
        if (customerVisitFilter === '1' && c.totalVisits !== 1) return false;
        if (customerVisitFilter === '2_to_4' && (c.totalVisits < 2 || c.totalVisits > 4)) return false;
        if (customerVisitFilter === '5_plus' && c.totalVisits < 5) return false;

        return true;
      })
      .sort((a, b) => {
        if (customerSortBy === 'total_spent') {
          const spentA = isAnyServiceFilterActive ? a.matchingSpent : a.allTimeSpent;
          const spentB = isAnyServiceFilterActive ? b.matchingSpent : b.allTimeSpent;
          return spentB - spentA;
        }
        if (customerSortBy === 'visit_count') {
          const visitsA = isAnyServiceFilterActive ? a.matchingVisits : a.totalVisits;
          const visitsB = isAnyServiceFilterActive ? b.matchingVisits : b.totalVisits;
          return visitsB - visitsA;
        }
        if (customerSortBy === 'last_visit') {
          const dateA = new Date(isAnyServiceFilterActive ? a.matchingLastDate : a.lastVisitDate).getTime();
          const dateB = new Date(isAnyServiceFilterActive ? b.matchingLastDate : b.lastVisitDate).getTime();
          return dateB - dateA;
        }
        if (customerSortBy === 'name') {
          return a.customerName.localeCompare(b.customerName);
        }
        return 0;
      });
  }, [
    customerList,
    serviceTypeFilter,
    selectedOils,
    selectedParts,
    dateFilter,
    startDate,
    endDate,
    searchTerm,
    deductPartsForOil,
    deductOilForParts,
    isOilFilterActive,
    isPartsFilterActive,
    customerVisitFilter,
    customerSortBy,
    isAnyServiceFilterActive,
  ]);

  // Filtered customer records matching active filters for analytics dashboard
  const customerFilteredRecords = useMemo(() => {
    return filteredCustomers.flatMap((c) =>
      isAnyServiceFilterActive ? c.matchingRecords : c.records
    );
  }, [filteredCustomers, isAnyServiceFilterActive]);

  // Total customer expenditure for display
  const totalCustomersDisplaySpent = useMemo(() => {
    return filteredCustomers.reduce(
      (sum, c) => sum + (isAnyServiceFilterActive ? c.matchingSpent : c.allTimeSpent),
      0
    );
  }, [filteredCustomers, isAnyServiceFilterActive]);

  // Active filter items for Customers tab (for dynamic dashboard & badges)
  const customerActiveFiltersSummary = useMemo(() => {
    const activeItems: { label: string; value: string; color?: 'purple' | 'amber' | 'blue' | 'emerald' | 'rose' | 'slate' }[] = [];

    if (dateFilter !== 'all') {
      let dateText = '';
      if (dateFilter === 'today') dateText = 'Bugun';
      else if (dateFilter === 'this_week') dateText = 'Shu hafta';
      else if (dateFilter === 'this_month') dateText = 'Shu oy';
      else if (dateFilter === 'this_year') dateText = 'Shu yil';
      else if (dateFilter === 'custom') {
        dateText = `${startDate || '...'} — ${endDate || '...'}`;
      }
      activeItems.push({ label: 'Tashrif vaqti', value: dateText, color: 'purple' });
    }

    if (serviceTypeFilter !== 'all') {
      let typeText = '';
      if (serviceTypeFilter === 'oil_all') typeText = 'Barcha Moyli Xizmatlar';
      else if (serviceTypeFilter === 'oil_only') typeText = 'Faqat Sof Moy';
      else if (serviceTypeFilter === 'oil_mixed') typeText = 'Aralash Moy+Zapchast';
      else if (serviceTypeFilter === 'parts_all') typeText = 'Barcha Zapchastli Xizmatlar';
      else if (serviceTypeFilter === 'parts_only') typeText = 'Faqat Sof Zapchast';
      else if (serviceTypeFilter === 'parts_mixed') typeText = 'Aralash Zapchast+Moy';
      else if (serviceTypeFilter === 'oil_and_parts') typeText = 'Moy + Zapchast';
      activeItems.push({ label: 'Xizmat turi', value: typeText, color: 'emerald' });
    }

    if (deductPartsForOil && isOilFilterActive) {
      activeItems.push({
        label: 'Chegirma',
        value: `Zapchastlar olib tashlangan (-${servicePureStats.deductedPartsTotal.toLocaleString()} so'm)`,
        color: 'amber',
      });
    }

    if (deductOilForParts && isPartsFilterActive) {
      activeItems.push({
        label: 'Chegirma',
        value: `Moylar olib tashlangan (-${servicePureStats.deductedOilTotal.toLocaleString()} so'm)`,
        color: 'blue',
      });
    }

    if (selectedOils.length > 0) {
      activeItems.push({
        label: `Moylar (${selectedOils.length})`,
        value: selectedOils.join(', '),
        color: 'amber',
      });
    }

    if (selectedParts.length > 0) {
      activeItems.push({
        label: `Zapchastlar (${selectedParts.length})`,
        value: selectedParts.join(', '),
        color: 'blue',
      });
    }

    if (customerVisitFilter !== 'all') {
      let vText = '';
      if (customerVisitFilter === '1') vText = '1 marta (Yangi)';
      else if (customerVisitFilter === '2_to_4') vText = '2-4 marta';
      else if (customerVisitFilter === '5_plus') vText = '5+ marta (VIP)';
      activeItems.push({ label: 'Tashriflar soni', value: vText, color: 'purple' });
    }

    if (searchTerm.trim()) {
      activeItems.push({
        label: 'Qidiruv',
        value: `"${searchTerm.trim()}"`,
        color: 'rose',
      });
    }

    return activeItems;
  }, [
    dateFilter,
    startDate,
    endDate,
    serviceTypeFilter,
    deductPartsForOil,
    deductOilForParts,
    isOilFilterActive,
    isPartsFilterActive,
    servicePureStats.deductedPartsTotal,
    servicePureStats.deductedOilTotal,
    selectedOils,
    selectedParts,
    customerVisitFilter,
    searchTerm,
  ]);

  // Export Customers to Excel
  const handleExportCustomersExcel = () => {
    const wb = XLSX.utils.book_new();

    const dataRows = filteredCustomers.map((c, idx) => ({
      '№': idx + 1,
      'Mijoz Ismi': c.customerName,
      'Telefon Nomeri': c.phoneNumber,
      'Mashina Davlat Raqami': c.plate,
      'Mashina Rusumi': c.carModel || '—',
      'Filtr Bo\'yicha Xizmatlar Soni': isAnyServiceFilterActive ? c.matchingVisits : c.totalVisits,
      'Filtr Bo\'yicha Sarflangan (UZS)': isAnyServiceFilterActive ? c.matchingSpent : c.allTimeSpent,
      'Jami Barcha Tashriflar Soni': c.totalVisits,
      'Jami Barcha Sarflangan Mablag\' (UZS)': c.allTimeSpent,
      'Oxirgi Tashrif Sanasi': new Date(isAnyServiceFilterActive ? c.matchingLastDate : c.lastVisitDate).toLocaleDateString('uz-UZ') + ' ' + new Date(isAnyServiceFilterActive ? c.matchingLastDate : c.lastVisitDate).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      'Oxirgi Masofasi (km)': (isAnyServiceFilterActive ? c.matchingLastMileage : c.lastMileage) || '—',
      'Oxirgi Almashtirilgan Moy': (isAnyServiceFilterActive ? c.matchingLastOil : c.lastOil) || '—',
      'Oxirgi Bajarilgan Ishlar / Zapchastlar': (isAnyServiceFilterActive ? c.matchingLastParts : c.lastParts) || '—',
    }));

    const ws = XLSX.utils.json_to_sheet(dataRows);
    XLSX.utils.book_append_sheet(wb, ws, "Mijozlar_Royxati");

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `daewoo_nargiz_mijozlar_${dateStr}.xlsx`);
    showToast("📥 Mijozlar ro'yxati Excel (.xlsx) fayli muvaffaqiyatli yuklab olindi!");
  };

  // Edit Submission Handler
  const handleStartEdit = (record: ServiceRecord) => {
    setEditingRecord(record);
    let dateStr = '';
    try {
      const d = new Date(record.createdAt);
      if (!isNaN(d.getTime())) {
        dateStr = d.toISOString().slice(0, 16);
      }
    } catch {
      dateStr = new Date().toISOString().slice(0, 16);
    }

    setEditForm({
      ...record,
      createdAt: dateStr || record.createdAt,
    });
  };

  const handleSaveEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !editForm.customerName || !editForm.carPlate) return;

    setIsSaving(true);
    try {
      let finalCreatedAt = editForm.createdAt;
      if (editForm.createdAt && editForm.createdAt.length === 16) {
        finalCreatedAt = new Date(editForm.createdAt).toISOString();
      }

      const updated: ServiceRecord = {
        id: editingRecord.id,
        customerName: (editForm.customerName || '').trim(),
        phoneNumber: (editForm.phoneNumber || '').trim(),
        carPlate: (editForm.carPlate || '').toUpperCase().trim(),
        carModel: (editForm.carModel || '').trim(),
        mileageKm: editForm.mileageKm ? Number(editForm.mileageKm) : 0,
        replacedOil: (editForm.replacedOil || '').trim(),
        replacedParts: (editForm.replacedParts || '').trim(),
        partsToReplace: (editForm.partsToReplace || '').trim(),
        status: (editForm.status as RecordStatus) || 'bajarildi',
        costUzs: editForm.costUzs ? Number(editForm.costUzs) : 0,
        notes: (editForm.notes || '').trim(),
        createdAt: finalCreatedAt || editingRecord.createdAt,
        isOffline: false,
        syncedAt: new Date().toISOString(),
      };

      await onSaveRecord(updated);

      await createAdminLog(
        "Super Admin Xizmatni Tahrirladi",
        `Mijoz: ${updated.customerName}, Avto: ${updated.carPlate}, Summa: ${updated.costUzs.toLocaleString()} so'm`,
        currentUsername
      );

      showToast(`✅ "${updated.customerName}" xizmat ma'lumotlari yangilandi!`);
      setEditingRecord(null);
    } catch (err) {
      console.error(err);
      showToast("❌ Saqlashda xatolik yuz berdi!");
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm Single Record Delete
  const handleConfirmSingleDelete = async () => {
    if (!recordToDelete) return;
    try {
      await onDeleteRecord(recordToDelete.id);
      await createAdminLog(
        "Super Admin Xizmatni O'chirdi",
        `Mijoz: ${recordToDelete.customerName}, Avto: ${recordToDelete.carPlate} yozuvi o'chirildi`,
        currentUsername
      );
      showToast(`🗑️ "${recordToDelete.customerName}" yozuvi bazadan o'chirildi.`);
      setRecordToDelete(null);
    } catch (err) {
      console.error(err);
      showToast("❌ O'chirishda xatolik yuz berdi!");
    }
  };

  // Helper formatting for seconds remaining
  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isPendingWipe = Boolean(wipeRequest && wipeRequest.status === 'pending');
  const isWipeReady = isPendingWipe && remainingTimeSec <= 0;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-purple-500/80 text-purple-200 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold animate-bounce flex items-center gap-2 backdrop-blur-md">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1-HOUR DELAYED WIPE ACTIVE WARNING BANNER */}
      {isPendingWipe && (
        <div
          className={`p-5 rounded-2xl border transition-all shadow-2xl ${
            isWipeReady
              ? 'bg-red-950/90 border-red-500 text-white animate-pulse'
              : 'bg-amber-950/80 border-amber-500/80 text-amber-100'
          }`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-3 rounded-xl shrink-0 ${
                  isWipeReady ? 'bg-red-600 text-white' : 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black">
                    {isWipeReady
                      ? "🚨 1 SOAT KUTILGAN VAQT TUGADI: BAZANI O'CHIRISH TAYYOR!"
                      : "⏳ BAZANI TO'LIQ O'CHIRISH JARAYONI BOSHLANDI (1 SOAT KUTILMOQDA)"}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-950 text-xs font-mono font-extrabold border border-amber-500/40">
                    {isWipeReady ? "Vaqt yakunlandi" : `Qolgan vaqt: ${formatTimer(remainingTimeSec)}`}
                  </span>
                </div>
                <p className="text-xs opacity-90 leading-relaxed">
                  {isWipeReady
                    ? "1 soatlik xavfsizlik vaqti tugadi. Bazadagi barcha ma'lumotlarni o'chirish uchun yakuniy tasdiqlang."
                    : "1 soat ichida istalgan payt bekor qilishingiz mumkin. 1 soat o'tgach yana bir bor yakuniy tasdiqlash so'raladi."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={handleCancelWipeDelay}
                disabled={isWipeActionLoading}
                className="flex-1 md:flex-initial px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md"
              >
                ❌ Bekor Qilish
              </button>

              {isWipeReady && (
                <button
                  type="button"
                  onClick={() => setShowFinalWipeModal(true)}
                  disabled={isWipeActionLoading}
                  className="flex-1 md:flex-initial px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-xl shadow-red-900/50 border border-red-400/40 animate-bounce"
                >
                  🔥 Yakuniy Tasdiqlash & O'chirish
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOP STATS CARDS & DATABASE MANAGEMENT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-purple-950/80 border border-purple-800/80 text-purple-400 rounded-xl">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold">Jami Xizmatlar</div>
            <div className="text-xl font-extrabold text-white mt-0.5">{records.length} ta yozuv</div>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold">Jami Tushum</div>
            <div className="text-lg font-extrabold text-emerald-400 mt-0.5">
              {totalRevenue.toLocaleString()} so'm
            </div>
          </div>
        </div>

        {/* Database Clear with 1-Hour Safe Delay */}
        <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-2xl shadow-sm flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-red-300 font-extrabold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Baza Boshqaruvi</span>
            </div>
            <div className="text-[11px] text-red-400/80 mt-0.5 font-medium">
              1 soatlik xavfsizlik himoyasi
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isPendingWipe) {
                if (isWipeReady) setShowFinalWipeModal(true);
                else handleCancelWipeDelay();
              } else {
                setShowInitiateWipeModal(true);
              }
            }}
            disabled={records.length === 0 && !isPendingWipe}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shrink-0 ${
              records.length === 0 && !isPendingWipe
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : isPendingWipe
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg border border-amber-400/40 cursor-pointer animate-pulse'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40 border border-red-400/30 cursor-pointer active:scale-95'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>{isPendingWipe ? (isWipeReady ? "Yakuniy O'chirish" : "O'chirishni Bekor Qilish") : "Bazani Tozalash"}</span>
          </button>
        </div>
      </div>

      {/* SECTION TABS: MIJOZLAR (ALOHIDA) & KO'RSATILGAN XIZMATLAR (ALOHIDA) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-2xl border border-slate-800 shadow-lg">
        <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveSection('services')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              activeSection === 'services'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Ko'rsatilgan Xizmatlar ({filteredServices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('customers')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              activeSection === 'customers'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Mijozlar Ro'yxati ({filteredCustomers.length})</span>
          </button>
        </div>

        {/* Excel Export Button for the Active Section */}
        {activeSection === 'services' ? (
          <button
            type="button"
            onClick={handleExportServicesExcel}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-950 border border-emerald-500/30 active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Xizmatlarni Excel (.xlsx) ga yuklash</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleExportCustomersExcel}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-950 border border-emerald-500/30 active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Mijozlarni Excel (.xlsx) ga yuklash</span>
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* 1. KO'RSATILGAN XIZMATLAR BO'LIMI (SERVICES SECTION) */}
      {/* ======================================================== */}
      {activeSection === 'services' && (
        <div className="space-y-4">
          {/* Services Filter Bar */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3.5 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  placeholder="Qidiruv: Mijoz ismi, Avto raqami, Model, Telefon, Moy, Zapchast..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                {serviceSearch && (
                  <button
                    onClick={() => setServiceSearch('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Service Type Filter (Moy / Zapchast / Moy+Zapchast / Sof / Aralash) */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <Filter className="w-3.5 h-3.5 text-purple-400" />
                  <select
                    value={serviceTypeFilter}
                    onChange={(e) => setServiceTypeFilter(e.target.value as any)}
                    className="bg-transparent text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900 text-slate-200">Barcha Xizmatlar</option>
                    <option value="oil_all" className="bg-slate-900 text-amber-300">🛢️ Barcha Moy xizmatlari (Sof + Aralash)</option>
                    <option value="oil_only" className="bg-slate-900 text-amber-400 font-bold">🛢️ Faqat Sof Moy (Zapchastsiz)</option>
                    <option value="oil_mixed" className="bg-slate-900 text-amber-200">⚡ Aralash Xizmatlar (Moy + Zapchast)</option>
                    <option value="parts_all" className="bg-slate-900 text-blue-300">🔧 Barcha Zapchast xizmatlari (Sof + Aralash)</option>
                    <option value="parts_only" className="bg-slate-900 text-blue-400 font-bold">🔧 Faqat Sof Zapchast (Moysiz)</option>
                    <option value="parts_mixed" className="bg-slate-900 text-blue-200">⚡ Aralash Xizmatlar (Zapchast + Moy)</option>
                    <option value="oil_and_parts" className="bg-slate-900 text-emerald-300">✨ Moy + Zapchast (Ikkalasi birga)</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <select
                    value={serviceDateFilter}
                    onChange={(e) => setServiceDateFilter(e.target.value as any)}
                    className="bg-transparent text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900 text-slate-200">Barcha Sanalar</option>
                    <option value="today" className="bg-slate-900 text-slate-200">Bugungi Xizmatlar</option>
                    <option value="this_week" className="bg-slate-900 text-slate-200">Shu Hafta</option>
                    <option value="this_month" className="bg-slate-900 text-slate-200">Shu Oy</option>
                    <option value="this_year" className="bg-slate-900 text-slate-200">Shu Yil</option>
                    <option value="custom" className="bg-slate-900 text-purple-300">Aniq Sana Oralig'i</option>
                  </select>
                </div>

                {/* Sort (Only newest and oldest) */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />
                  <select
                    value={serviceSortBy}
                    onChange={(e) => setServiceSortBy(e.target.value as any)}
                    className="bg-transparent text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="newest" className="bg-slate-900 text-slate-200">Eng Yangilar</option>
                    <option value="oldest" className="bg-slate-900 text-slate-200">Eng Eskilar</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Specific Oil & Parts Sub-Filters for Services */}
            {(isOilFilterActive || serviceTypeFilter === 'all') && (
              <div className="p-3 bg-amber-950/20 rounded-xl border border-amber-800/40 text-xs">
                <MultiSelectFilter
                  label="Kiritilgan Moy Turlari (Bir nechta tanlash mumkin)"
                  icon={<Droplet className="w-4 h-4 text-amber-400 shrink-0" />}
                  items={availableOils}
                  selectedValues={serviceSelectedOils}
                  onChange={setServiceSelectedOils}
                  placeholder="Moy turini tanlang..."
                  theme="amber"
                />
              </div>
            )}

            {(isPartsFilterActive || serviceTypeFilter === 'all') && (
              <div className="p-3 bg-blue-950/20 rounded-xl border border-blue-800/40 text-xs">
                <MultiSelectFilter
                  label="Kiritilgan Zapchast / Ishlar (Bir nechta tanlash mumkin)"
                  icon={<Wrench className="w-4 h-4 text-blue-400 shrink-0" />}
                  items={availableParts}
                  selectedValues={serviceSelectedParts}
                  onChange={setServiceSelectedParts}
                  placeholder="Zapchast yoki ishni tanlang..."
                  theme="blue"
                />
              </div>
            )}

            {/* Custom Date Range Pickers */}
            {serviceDateFilter === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-950 rounded-xl border border-purple-900/40 text-xs">
                <span className="text-slate-400 font-semibold">Oraliq:</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Dan:</span>
                  <input
                    type="date"
                    value={serviceStartDate}
                    onChange={(e) => setServiceStartDate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Gacha:</span>
                  <input
                    type="date"
                    value={serviceEndDate}
                    onChange={(e) => setServiceEndDate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Pure vs Mixed Deduction Interactive Control Banner */}
            {isOilFilterActive && servicePureStats.mixedCount > 0 && (
              <div className="p-3.5 bg-amber-950/40 border border-amber-600/50 rounded-xl space-y-2.5 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 rounded-lg flex items-center gap-1">
                      <Droplet className="w-3.5 h-3.5 text-amber-400" />
                      <span>Moy Xizmatlari Tahlili:</span>
                    </span>
                    <span className="text-slate-300 font-semibold text-[11px]">
                      Sof Moy: <strong className="text-amber-300 font-mono">{servicePureStats.pureOilCount} ta</strong> | Aralash (Zapchast ham bor): <strong className="text-amber-200 font-mono">{servicePureStats.mixedCount} ta</strong>
                    </span>
                  </div>

                  {/* Quick sub-segment buttons */}
                  <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-amber-900/50 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setServiceTypeFilter('oil_all')}
                      className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                        serviceTypeFilter === 'oil_all' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Barchasi ({servicePureStats.pureOilCount + servicePureStats.mixedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceTypeFilter('oil_only')}
                      className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                        serviceTypeFilter === 'oil_only' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Faqat Sof Moy ({servicePureStats.pureOilCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceTypeFilter('oil_mixed')}
                      className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                        serviceTypeFilter === 'oil_mixed' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Aralash ({servicePureStats.mixedCount})
                    </button>
                  </div>
                </div>

                {/* Deduction Toggle Box */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-amber-800/40 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <span className="text-slate-400 text-[11px]">Jami ko'rsatilgan tushum:</span>{' '}
                      <strong className="text-slate-200 font-mono">{servicePureStats.totalGrossRevenue.toLocaleString()} so'm</strong>
                    </div>
                    <span className="text-slate-600">•</span>
                    <div>
                      <span className="text-amber-400 text-[11px]">Sof Moy tushumi:</span>{' '}
                      <strong className="text-amber-300 font-mono">{servicePureStats.pureOilPortionTotal.toLocaleString()} so'm</strong>
                    </div>
                    <span className="text-slate-600">•</span>
                    <div>
                      <span className="text-slate-400 text-[11px]">Zapchastlar qismi:</span>{' '}
                      <strong className="text-red-400 font-mono">-{servicePureStats.deductedPartsTotal.toLocaleString()} so'm</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeductPartsForOil(!deductPartsForOil)}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-all border shadow-sm ${
                      deductPartsForOil
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black ring-2 ring-amber-400/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-700/60'
                    }`}
                  >
                    <span>✂️</span>
                    <span>{deductPartsForOil ? "Zapchastlar summasi olib tashlandi (Sof Moy faol)" : "Zapchastlar summasini olib tashlash (Sof Moy)"}</span>
                  </button>
                </div>
              </div>
            )}

            {isPartsFilterActive && servicePureStats.mixedCount > 0 && (
              <div className="p-3.5 bg-blue-950/40 border border-blue-600/50 rounded-xl space-y-2.5 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 rounded-lg flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-blue-400" />
                      <span>Zapchast Xizmatlari Tahlili:</span>
                    </span>
                    <span className="text-slate-300 font-semibold text-[11px]">
                      Sof Zapchast: <strong className="text-blue-300 font-mono">{servicePureStats.purePartsCount} ta</strong> | Aralash (Moy ham bor): <strong className="text-blue-200 font-mono">{servicePureStats.mixedCount} ta</strong>
                    </span>
                  </div>

                  {/* Quick sub-segment buttons */}
                  <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-blue-900/50 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setServiceTypeFilter('parts_all')}
                      className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                        serviceTypeFilter === 'parts_all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Barchasi ({servicePureStats.purePartsCount + servicePureStats.mixedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceTypeFilter('parts_only')}
                      className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                        serviceTypeFilter === 'parts_only' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Faqat Sof Zapchast ({servicePureStats.purePartsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceTypeFilter('parts_mixed')}
                      className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                        serviceTypeFilter === 'parts_mixed' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Aralash ({servicePureStats.mixedCount})
                    </button>
                  </div>
                </div>

                {/* Deduction Toggle Box */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-blue-800/40 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <span className="text-slate-400 text-[11px]">Jami ko'rsatilgan tushum:</span>{' '}
                      <strong className="text-slate-200 font-mono">{servicePureStats.totalGrossRevenue.toLocaleString()} so'm</strong>
                    </div>
                    <span className="text-slate-600">•</span>
                    <div>
                      <span className="text-blue-400 text-[11px]">Sof Zapchast tushumi:</span>{' '}
                      <strong className="text-blue-300 font-mono">{servicePureStats.purePartsPortionTotal.toLocaleString()} so'm</strong>
                    </div>
                    <span className="text-slate-600">•</span>
                    <div>
                      <span className="text-slate-400 text-[11px]">Moylar qismi:</span>{' '}
                      <strong className="text-red-400 font-mono">-{servicePureStats.deductedOilTotal.toLocaleString()} so'm</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeductOilForParts(!deductOilForParts)}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-all border shadow-sm ${
                      deductOilForParts
                        ? 'bg-blue-500 text-slate-950 border-blue-400 font-black ring-2 ring-blue-400/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-blue-300 border-blue-700/60'
                    }`}
                  >
                    <span>✂️</span>
                    <span>{deductOilForParts ? "Moylar summasi olib tashlandi (Sof Zapchast faol)" : "Moylar summasini olib tashlash (Sof Zapchast)"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Indicator info & Reset button */}
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between pt-1 border-t border-slate-800/60">
              <span>
                Ko'rsatilmoqda: <strong className="text-purple-300">{filteredServices.length} ta</strong> / Jami: {records.length} ta xizmat
              </span>
              <span className="text-purple-400 font-semibold">
                (Super Admin uchun to'liq tahrirlash va o'chirish imkoniyati mavjud)
              </span>
            </div>

            {/* Active filters chips & Reset button for Services */}
            {isAnyServiceFilterActive && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs animate-fadeIn">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-500 font-medium text-[11px]">Faol filtrlar:</span>
                  {serviceActiveFiltersSummary.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-purple-950/70 border border-purple-800/60 text-purple-300 rounded-lg text-[11px] font-medium"
                    >
                      {item.label}: <strong className="font-semibold text-white">{item.value}</strong>
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Filtrlarni tozalash</span>
                </button>
              </div>
            )}
          </div>

          {/* Business Analytics & Dashboard for Filtered Services */}
          {filteredServices.length > 0 && (
            <BusinessAnalyticsDashboard
              records={filteredServices}
              allRecordsCount={records.length}
              title="Xizmatlar Bo'yicha Biznes Tahlil (Dashboard)"
              defaultExpanded={true}
              activeFilters={serviceActiveFiltersSummary}
            />
          )}

          {/* Services Cards List */}
          {filteredServices.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-3">
              <Database className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
              <h3 className="text-base font-bold text-slate-300">Xizmat yozuvlari topilmadi</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Qidiruv yoki filtr mezonlariga mos keladigan xizmatlar mavjud emas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredServices.map((record) => {
                const formattedDate = new Date(record.createdAt).toLocaleString('uz-UZ', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const hasOil = Boolean(record.replacedOil && record.replacedOil.trim());
                const hasParts = Boolean(
                  (record.replacedParts && record.replacedParts.trim()) ||
                  (record.partsToReplace && record.partsToReplace.trim())
                );
                const isMixed = hasOil && hasParts;
                const cost = Number(record.costUzs || 0);

                const explicitOil = record.oilCostUzs !== undefined && record.oilCostUzs !== '' ? Number(record.oilCostUzs) : undefined;
                const explicitParts = record.partsCostUzs !== undefined && record.partsCostUzs !== '' ? Number(record.partsCostUzs) : undefined;

                let oilShare = 0;
                let partsShare = 0;

                if (isMixed) {
                  if (explicitOil !== undefined && explicitParts !== undefined) {
                    oilShare = explicitOil;
                    partsShare = explicitParts;
                  } else if (explicitOil !== undefined) {
                    oilShare = explicitOil;
                    partsShare = Math.max(0, cost - explicitOil);
                  } else if (explicitParts !== undefined) {
                    partsShare = explicitParts;
                    oilShare = Math.max(0, cost - explicitParts);
                  } else {
                    oilShare = Math.round(cost * 0.6);
                    partsShare = cost - oilShare;
                  }
                }

                return (
                  <div
                    key={record.id}
                    className={`p-4 bg-slate-900/90 border rounded-2xl transition-all shadow-md space-y-3 ${
                      isMixed
                        ? 'border-purple-500/40 hover:border-purple-400 bg-gradient-to-r from-slate-900 via-slate-900 to-purple-950/20'
                        : hasOil
                        ? 'border-slate-800 hover:border-amber-500/40'
                        : 'border-slate-800 hover:border-blue-500/40'
                    }`}
                  >
                    {/* Top Row: Plate, Customer Name, Date, Service Type Badge & Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-sm font-extrabold text-amber-300 tracking-wider shadow-inner shrink-0">
                          {record.carPlate}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-extrabold text-white">{record.customerName}</span>
                            {record.carModel && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                                {record.carModel}
                              </span>
                            )}
                            {isMixed ? (
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold">
                                ⚡ Aralash: Moy + Zapchast
                              </span>
                            ) : hasOil ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                🛢️ Sof Moy
                              </span>
                            ) : hasParts ? (
                              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                                🔧 Sof Zapchast
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            {record.phoneNumber && (
                              <a
                                href={`tel:${record.phoneNumber}`}
                                className="text-blue-400 hover:underline flex items-center gap-1 font-mono"
                              >
                                <Phone className="w-3 h-3" />
                                {record.phoneNumber}
                              </a>
                            )}
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {formattedDate}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(record)}
                          className="p-2 bg-slate-800 hover:bg-purple-900/80 text-purple-300 border border-slate-700 hover:border-purple-600 rounded-xl transition-all cursor-pointer shadow-sm"
                          title="Tahrirlash"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setRecordToDelete(record)}
                          className="p-2 bg-slate-800 hover:bg-red-900/80 text-red-400 border border-slate-700 hover:border-red-600 rounded-xl transition-all cursor-pointer shadow-sm"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Middle Details: Mileage, Oil, Parts, Cost */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                      {/* Mileage */}
                      <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
                        <div className="text-slate-500 font-medium">Bosib o'tgan masofasi:</div>
                        <div className="font-mono font-bold text-slate-200 mt-0.5">
                          {record.mileageKm ? `${Number(record.mileageKm).toLocaleString()} km` : '—'}
                        </div>
                      </div>

                      {/* Oil */}
                      <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
                        <div className="text-slate-500 font-medium flex items-center gap-1">
                          <Droplet className="w-3 h-3 text-amber-400" />
                          <span>Almashtirilgan Moy:</span>
                        </div>
                        <div className="font-semibold text-amber-200 mt-0.5 truncate">
                          {record.replacedOil || '—'}
                        </div>
                      </div>

                      {/* Parts */}
                      <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
                        <div className="text-slate-500 font-medium flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-blue-400" />
                          <span>Almashtirilgan Zapchastlar:</span>
                        </div>
                        <div className="font-semibold text-blue-200 mt-0.5 truncate">
                          {record.replacedParts || '—'}
                        </div>
                      </div>

                      {/* Cost */}
                      <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
                        <div className="text-slate-500 font-medium flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-emerald-400" />
                          <span>Xizmat Narxi:</span>
                        </div>
                        <div className="font-mono font-extrabold text-emerald-400 text-sm mt-0.5">
                          {record.costUzs ? `${Number(record.costUzs).toLocaleString()} so'm` : '0 so\'m'}
                        </div>
                      </div>
                    </div>

                    {/* Mixed Service Breakdown Panel & Deduction Highlights */}
                    {isMixed && (
                      <div className="p-2.5 bg-slate-950/90 rounded-xl border border-purple-900/50 space-y-1.5 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <span className="text-purple-300 font-bold flex items-center gap-1">
                            <span>⚖️ Summa taqsimoti:</span>
                            {explicitOil !== undefined || explicitParts !== undefined ? (
                              <span className="text-emerald-400 font-semibold">(Aniq belgilangan)</span>
                            ) : (
                              <span className="text-slate-400 font-normal">(Standart 60/40 nisbat)</span>
                            )}
                          </span>
                          <div className="flex items-center gap-3 font-mono">
                            <span className="text-amber-300">🛢️ Moy: <strong>{oilShare.toLocaleString()} so'm</strong></span>
                            <span className="text-slate-600">|</span>
                            <span className="text-blue-300">🔧 Zapchast: <strong>{partsShare.toLocaleString()} so'm</strong></span>
                          </div>
                        </div>

                        {/* If in Oil Filter & Deducting parts */}
                        {deductPartsForOil && isOilFilterActive && (
                          <div className="text-[11px] text-amber-300 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-800/40 flex items-center justify-between">
                            <span>✂️ Zapchast summasi (-{partsShare.toLocaleString()} so'm) olib tashlandi</span>
                            <span className="font-bold">Sof Moy qismi: {oilShare.toLocaleString()} so'm</span>
                          </div>
                        )}

                        {/* If in Parts Filter & Deducting oil */}
                        {deductOilForParts && isPartsFilterActive && (
                          <div className="text-[11px] text-blue-300 bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-800/40 flex items-center justify-between">
                            <span>✂️ Moy summasi (-{oilShare.toLocaleString()} so'm) olib tashlandi</span>
                            <span className="font-bold">Sof Zapchast qismi: {partsShare.toLocaleString()} so'm</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Additional Notes or Next Parts */}
                    {(record.partsToReplace || record.notes) && (
                      <div className="pt-2 border-t border-slate-800/60 text-xs text-slate-400 space-y-1">
                        {record.partsToReplace && (
                          <div>
                            <span className="text-amber-400/90 font-semibold">Keyingi almashtiriladigan:</span>{' '}
                            <span>{record.partsToReplace}</span>
                          </div>
                        )}
                        {record.notes && (
                          <div>
                            <span className="text-slate-500 font-semibold">Izoh:</span> {record.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MIJOZLAR RO'YXATI BO'LIMI (CUSTOMERS SECTION) */}
      {/* ======================================================== */}
      {activeSection === 'customers' && (
        <div className="space-y-4">
          {/* Customers Filter Bar */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3.5 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Mijoz qidiruvi: Ism, Mashina raqami, Telefon, Avto rusumi, Moy, Zapchast..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Service Type Filter (Shared with Services) */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <Filter className="w-3.5 h-3.5 text-purple-400" />
                  <select
                    value={serviceTypeFilter}
                    onChange={(e) => setServiceTypeFilter(e.target.value as any)}
                    className="bg-transparent text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900 text-slate-200">Barcha Xizmat Turlari</option>
                    <option value="oil_all" className="bg-slate-900 text-amber-300">🛢️ Barcha Moy xizmatlari (Sof + Aralash)</option>
                    <option value="oil_only" className="bg-slate-900 text-amber-400 font-bold">🛢️ Faqat Sof Moy (Zapchastsiz)</option>
                    <option value="oil_mixed" className="bg-slate-900 text-amber-200">⚡ Aralash Xizmatlar (Moy + Zapchast)</option>
                    <option value="parts_all" className="bg-slate-900 text-blue-300">🔧 Barcha Zapchast xizmatlari (Sof + Aralash)</option>
                    <option value="parts_only" className="bg-slate-900 text-blue-400 font-bold">🔧 Faqat Sof Zapchast (Moysiz)</option>
                    <option value="parts_mixed" className="bg-slate-900 text-blue-200">⚡ Aralash Xizmatlar (Zapchast + Moy)</option>
                    <option value="oil_and_parts" className="bg-slate-900 text-emerald-300">✨ Moy + Zapchast (Ikkalasi birga)</option>
                  </select>
                </div>

                {/* Visit Count Filter */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <select
                    value={customerVisitFilter}
                    onChange={(e) => setCustomerVisitFilter(e.target.value as any)}
                    className="bg-transparent text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900 text-slate-200">Barcha Tashriflar</option>
                    <option value="1" className="bg-slate-900 text-slate-200">1 ta tashrif</option>
                    <option value="2_to_4" className="bg-slate-900 text-slate-200">2 - 4 ta tashrif</option>
                    <option value="5_plus" className="bg-slate-900 text-purple-400">5+ ta doimiy mijozlar</option>
                  </select>
                </div>

                {/* Date Filter (Shared with Services) */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="bg-transparent text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900 text-slate-200">Barcha Vaqtlar</option>
                    <option value="today" className="bg-slate-900 text-slate-200">Bugun Kelganlar</option>
                    <option value="this_week" className="bg-slate-900 text-slate-200">Shu Hafta Kelganlar</option>
                    <option value="this_month" className="bg-slate-900 text-slate-200">Shu Oy Kelganlar</option>
                    <option value="this_year" className="bg-slate-900 text-slate-200">Shu Yil Kelganlar</option>
                    <option value="custom" className="bg-slate-900 text-purple-300">Aniq Sana Oralig'i</option>
                  </select>
                </div>

                {/* Sort */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />
                  <select
                    value={customerSortBy}
                    onChange={(e) => setCustomerSortBy(e.target.value as any)}
                    className="bg-transparent text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="total_spent" className="bg-slate-900 text-slate-200">Sarflangan Mablag'</option>
                    <option value="visit_count" className="bg-slate-900 text-slate-200">Tashriflar Soni</option>
                    <option value="last_visit" className="bg-slate-900 text-slate-200">Oxirgi Tashrif Sanasi</option>
                    <option value="name" className="bg-slate-900 text-slate-200">Ism Bo'yicha (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Specific Oil Sub-Filter for Customers */}
            {(isOilFilterActive || serviceTypeFilter === 'all') && (
              <div className="p-3 bg-amber-950/20 rounded-xl border border-amber-800/40 text-xs">
                <MultiSelectFilter
                  label="Kiritilgan Moy Turlari Bo'yicha Mijozlar (Bir nechta tanlash mumkin)"
                  icon={<Droplet className="w-4 h-4 text-amber-400 shrink-0" />}
                  items={availableOils}
                  selectedValues={selectedOils}
                  onChange={setSelectedOils}
                  placeholder="Moy turini tanlang..."
                  theme="amber"
                />
              </div>
            )}

            {/* Specific Parts Sub-Filter for Customers */}
            {(isPartsFilterActive || serviceTypeFilter === 'all') && (
              <div className="p-3 bg-blue-950/20 rounded-xl border border-blue-800/40 text-xs">
                <MultiSelectFilter
                  label="Kiritilgan Zapchast / Ishlar Bo'yicha Mijozlar (Bir nechta tanlash mumkin)"
                  icon={<Wrench className="w-4 h-4 text-blue-400 shrink-0" />}
                  items={availableParts}
                  selectedValues={selectedParts}
                  onChange={setSelectedParts}
                  placeholder="Zapchast yoki ishni tanlang..."
                  theme="blue"
                />
              </div>
            )}

            {/* Custom Date Range Pickers for Customers */}
            {dateFilter === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-950 rounded-xl border border-purple-900/40 text-xs">
                <span className="text-slate-400 font-semibold">Tashrif Oralig'i:</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Dan:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Gacha:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Pure vs Mixed Deduction Interactive Control Banner (For Customers) */}
            {isOilFilterActive && servicePureStats.mixedCount > 0 && (
              <div className="p-3.5 bg-amber-950/40 border border-amber-600/50 rounded-xl space-y-2.5 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 rounded-lg flex items-center gap-1">
                      <Droplet className="w-3.5 h-3.5 text-amber-400" />
                      <span>Moy Bo'yicha Mijozlar Tahlili:</span>
                    </span>
                    <span className="text-slate-300 font-semibold text-[11px]">
                      Sof Moy: <strong className="text-amber-300 font-mono">{servicePureStats.pureOilCount} ta</strong> | Aralash (Zapchast ham bor): <strong className="text-amber-200 font-mono">{servicePureStats.mixedCount} ta</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeductPartsForOil(!deductPartsForOil)}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-all border shadow-sm ${
                      deductPartsForOil
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black ring-2 ring-amber-400/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-700/60'
                    }`}
                  >
                    <span>✂️</span>
                    <span>{deductPartsForOil ? "Zapchastlar summasi olib tashlandi (Sof Moy faol)" : "Zapchastlar summasini olib tashlash (Sof Moy)"}</span>
                  </button>
                </div>
              </div>
            )}

            {isPartsFilterActive && servicePureStats.mixedCount > 0 && (
              <div className="p-3.5 bg-blue-950/40 border border-blue-600/50 rounded-xl space-y-2.5 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 rounded-lg flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-blue-400" />
                      <span>Zapchast Bo'yicha Mijozlar Tahlili:</span>
                    </span>
                    <span className="text-slate-300 font-semibold text-[11px]">
                      Sof Zapchast: <strong className="text-blue-300 font-mono">{servicePureStats.purePartsCount} ta</strong> | Aralash (Moy ham bor): <strong className="text-blue-200 font-mono">{servicePureStats.mixedCount} ta</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeductOilForParts(!deductOilForParts)}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-all border shadow-sm ${
                      deductOilForParts
                        ? 'bg-blue-500 text-slate-950 border-blue-400 font-black ring-2 ring-blue-400/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-blue-300 border-blue-700/60'
                    }`}
                  >
                    <span>✂️</span>
                    <span>{deductOilForParts ? "Moylar summasi olib tashlandi (Sof Zapchast faol)" : "Moylar summasini olib tashlash (Sof Zapchast)"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Indicator */}
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between pt-1 border-t border-slate-800/60">
              <span>
                Ko'rsatilmoqda: <strong className="text-purple-300">{filteredCustomers.length} ta</strong> / Jami: {customerList.length} ta mijoz
              </span>
              <span className="text-emerald-400 font-semibold">
                {isAnyServiceFilterActive ? "Filtr bo'yicha mijozlar sarfi:" : "Jami mijozlar sarfi:"}{' '}
                {filteredCustomers.reduce((s, c) => s + (isAnyServiceFilterActive ? c.matchingSpent : c.allTimeSpent), 0).toLocaleString()} so'm
              </span>
            </div>

            {/* Active filters chips & Reset button for Customers */}
            {isAnyServiceFilterActive && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs animate-fadeIn">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-500 font-medium text-[11px]">Faol xizmat filtrlari:</span>
                  {customerActiveFiltersSummary.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-purple-950/70 border border-purple-800/60 text-purple-300 rounded-lg text-[11px] font-medium"
                    >
                      {item.label}: <strong className="font-semibold text-white">{item.value}</strong>
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Filtrlarni tozalash</span>
                </button>
              </div>
            )}
          </div>

          {/* Business Analytics & Dashboard for Filtered Customers */}
          {customerFilteredRecords.length > 0 && (
            <BusinessAnalyticsDashboard
              records={customerFilteredRecords}
              allRecordsCount={records.length}
              title="Mijozlar va Xizmatlar Biznes Tahlili (Dashboard)"
              defaultExpanded={true}
              activeFilters={customerActiveFiltersSummary}
            />
          )}

          {/* Customers Cards / Table */}
          {filteredCustomers.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-3">
              <Users className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
              <h3 className="text-base font-bold text-slate-300">Mijozlar topilmadi</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Qidiruv yoki tanlangan filtr mezonlariga mos keladigan mijozlar mavjud emas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredCustomers.map((customer) => {
                const effectiveLastDate = new Date(isAnyServiceFilterActive ? customer.matchingLastDate : customer.lastVisitDate).toLocaleDateString('uz-UZ', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                });

                const effectiveOil = isAnyServiceFilterActive ? customer.matchingLastOil : customer.lastOil;
                const effectiveMileage = isAnyServiceFilterActive ? customer.matchingLastMileage : customer.lastMileage;
                const effectiveParts = isAnyServiceFilterActive ? customer.matchingLastParts : customer.lastParts;
                const effectiveSpent = isAnyServiceFilterActive ? customer.matchingSpent : customer.allTimeSpent;

                return (
                  <div
                    key={customer.plate}
                    className="p-4 bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 rounded-2xl transition-all shadow-md space-y-3"
                  >
                    {/* Header: Plate, Customer Name, Visit Count */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-sm font-extrabold text-amber-300 tracking-wider shadow-inner shrink-0">
                          {customer.plate}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">{customer.customerName}</h4>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            {customer.carModel && (
                              <span className="font-semibold text-slate-300">{customer.carModel}</span>
                            )}
                            {customer.phoneNumber && (
                              <>
                                <span>•</span>
                                <a
                                  href={`tel:${customer.phoneNumber}`}
                                  className="text-blue-400 hover:underline font-mono"
                                >
                                  {customer.phoneNumber}
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="px-2.5 py-1 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800 font-extrabold text-xs">
                          {isAnyServiceFilterActive
                            ? `${customer.matchingVisits} ta mos xizmat`
                            : `${customer.totalVisits} ta tashrif`}
                        </span>
                        {isAnyServiceFilterActive && customer.matchingVisits !== customer.totalVisits && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            Jami: {customer.totalVisits} ta
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats details */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
                        <div className="text-slate-500 font-medium flex items-center justify-between">
                          <span>{isAnyServiceFilterActive ? "Filtr Bo'yicha Sarf:" : "Jami Sarflangan:"}</span>
                          {deductPartsForOil && isOilFilterActive && (
                            <span className="text-[10px] text-amber-400 font-bold">Sof Moy</span>
                          )}
                          {deductOilForParts && isPartsFilterActive && (
                            <span className="text-[10px] text-blue-400 font-bold">Sof Zapchast</span>
                          )}
                        </div>
                        <div className="font-mono font-extrabold text-emerald-400 text-sm mt-0.5">
                          {effectiveSpent.toLocaleString()} so'm
                        </div>
                        {isAnyServiceFilterActive && customer.matchingSpent !== customer.allTimeSpent && (
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                            Barcha davr: {customer.allTimeSpent.toLocaleString()} so'm
                          </div>
                        )}
                      </div>

                      <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
                        <div className="text-slate-500 font-medium">
                          {isAnyServiceFilterActive ? "Oxirgi Mos Xizmat:" : "Oxirgi Tashrif:"}
                        </div>
                        <div className="font-mono font-bold text-slate-200 mt-0.5">
                          {effectiveLastDate}
                        </div>
                      </div>
                    </div>

                    {/* Last Service Info: Oil & Parts */}
                    <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/50 text-xs space-y-1">
                      {effectiveOil && (
                        <div className="flex items-center gap-1.5 text-amber-200/90 truncate">
                          <Droplet className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-slate-500">Moy:</span>
                          <span className="font-semibold">{effectiveOil}</span>
                          {effectiveMileage && (
                            <span className="text-slate-400 font-mono">({effectiveMileage} km)</span>
                          )}
                        </div>
                      )}
                      {effectiveParts && (
                        <div className="flex items-center gap-1.5 text-blue-200/90 truncate">
                          <Wrench className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-slate-500">Zapchast:</span>
                          <span className="font-semibold truncate">{effectiveParts}</span>
                        </div>
                      )}
                      {!effectiveOil && !effectiveParts && (
                        <div className="text-slate-600 italic text-[11px]">
                          Moy yoki zapchast ma'lumoti kiritilmagan
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: INITIATE 1-HOUR DATABASE WIPE DELAY */}
      {/* ======================================================== */}
      {showInitiateWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-red-500/50 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 rounded-2xl bg-red-950 border border-red-800 text-red-400">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Bazani Tozalash (1 Soatlik Xavfsizlik Rejimi)</h3>
                <p className="text-xs text-red-300">daewoobuloqboshi barcha xizmat yozuvlari uchun</p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-3 leading-relaxed">
              <p>
                ⚠️ <strong>Xavfsizlik qoidasi:</strong> Bazani o'chirish tugmasi bosilganda ma'lumotlar darhol o'chmaydi.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
                <li>
                  Tugma bosilgandan so'ng <strong>1 soatlik xavfsizlik vaqti</strong> boshlanadi.
                </li>
                <li>
                  1 soat ichida istalgan paytda <strong>"Bekor qilish"</strong> tugmasini bosib o'chirishni to'xtatishingiz mumkin.
                </li>
                <li>
                  1 soat tugagach, tizim <strong>yana bir bor yakuniy tasdiqlash</strong> so'raydi va shundagina baza butunlay o'chiriladi.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowInitiateWipeModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Orqaga
              </button>

              <button
                type="button"
                onClick={handleStartWipeDelay}
                disabled={isWipeActionLoading}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-red-900/50 flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                <span>1 Soatlik O'chirish Vaqtini Boshlash</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: FINAL CONFIRMATION AFTER 1 HOUR ELAPSED */}
      {/* ======================================================== */}
      {showFinalWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border-2 border-red-600 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-3.5 rounded-2xl bg-red-950 border border-red-700 text-red-400 animate-bounce">
                <Trash2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">YAKUNIY TASDIQLASH: Bazani Butunlay O'chirish</h3>
                <p className="text-xs text-red-400 font-bold">1 soatlik xavfsizlik vaqti yakunlandi</p>
              </div>
            </div>

            <div className="p-4 bg-red-950/40 rounded-2xl border border-red-900/60 text-xs text-red-200 space-y-2 leading-relaxed">
              <p className="font-bold text-sm text-red-300">
                Haqiqatan ham barcha ({records.length} ta) xizmat yozuvlari va mijozlar tarixini o'chirib yuborasizmi?
              </p>
              <p className="text-slate-400">
                Ushbu amalni orqaga qaytarib bo'lmaydi. Barcha ma'lumotlar bulutli bazadan hamda qurilma xotirasidan o'chib ketadi.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelWipeDelay}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                Yo'q, Bekor Qilish
              </button>

              <button
                type="button"
                onClick={handleFinalConfirmWipe}
                disabled={isWipeActionLoading}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black transition-all cursor-pointer shadow-xl shadow-red-900/70 border border-red-400/40"
              >
                {isWipeActionLoading ? "O'chirilmoqda..." : "HA, BUTUNLAY O'CHIRILSIN"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: EDIT RECORD (SUPER ADMIN) */}
      {/* ======================================================== */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-purple-950 border border-purple-800 text-purple-400 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Xizmat Ma'lumotlarini Tahrirlash</h3>
                  <p className="text-xs text-slate-400">Super Admin uchun to'liq tahrirlash imkoniyati</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Customer Name */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mijoz Ismi *</label>
                  <input
                    type="text"
                    required
                    value={editForm.customerName || ''}
                    onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Car Plate */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Avtomobil Raqami *</label>
                  <input
                    type="text"
                    required
                    value={editForm.carPlate || ''}
                    onChange={(e) => setEditForm({ ...editForm, carPlate: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono uppercase focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Telefon Nomeri</label>
                  <input
                    type="text"
                    value={editForm.phoneNumber || ''}
                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Car Model */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mashina Rusumi (Model)</label>
                  <input
                    type="text"
                    value={editForm.carModel || ''}
                    onChange={(e) => setEditForm({ ...editForm, carModel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Mileage */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bosgan Masofasi (km)</label>
                  <input
                    type="number"
                    value={editForm.mileageKm || ''}
                    onChange={(e) => setEditForm({ ...editForm, mileageKm: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Cost */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Xizmat Narxi (UZS)</label>
                  <input
                    type="number"
                    value={editForm.costUzs || ''}
                    onChange={(e) => setEditForm({ ...editForm, costUzs: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Xizmat Holati</label>
                  <select
                    value={editForm.status || 'bajarildi'}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as RecordStatus })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="bajarildi">✅ Bajarildi</option>
                    <option value="jarayonda">⏳ Jarayonda</option>
                    <option value="kutilmoqda">⚠️ Kutilmoqda</option>
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Sana va Vaqt</label>
                  <input
                    type="datetime-local"
                    value={editForm.createdAt || ''}
                    onChange={(e) => setEditForm({ ...editForm, createdAt: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Replaced Oil */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Almashtirilgan Moy</label>
                <input
                  type="text"
                  value={editForm.replacedOil || ''}
                  onChange={(e) => setEditForm({ ...editForm, replacedOil: e.target.value })}
                  placeholder="Masalan: Shell Helix HX8 5W-40 (4 litr)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Replaced Parts */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Almashtirilgan Zapchastlar / Ishlar</label>
                <input
                  type="text"
                  value={editForm.replacedParts || ''}
                  onChange={(e) => setEditForm({ ...editForm, replacedParts: e.target.value })}
                  placeholder="Masalan: Moy filtr, Havo filtr, Old kolodka..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Parts to Replace */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Kelgusida Almashtiriladigan Zapchastlar</label>
                <input
                  type="text"
                  value={editForm.partsToReplace || ''}
                  onChange={(e) => setEditForm({ ...editForm, partsToReplace: e.target.value })}
                  placeholder="Masalan: Svecha, Remen..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Qo'shimcha Izoh</label>
                <textarea
                  rows={2}
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Bekor Qilish
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold transition-all cursor-pointer shadow-lg shadow-purple-900/50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "Saqlanmoqda..." : "O'zgarishlarni Saqlash"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: DELETE SINGLE RECORD CONFIRMATION */}
      {/* ======================================================== */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-red-500/50 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 rounded-2xl bg-red-950 border border-red-800 text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Yozuvni O'chirish</h3>
                <p className="text-xs text-slate-400">{recordToDelete.carPlate} ({recordToDelete.customerName})</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ushbu xizmat yozuvini bazadan butunlay o'chirib yuborishni tasdiqlaysizmi?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Bekor Qilish
              </button>

              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black cursor-pointer shadow-lg shadow-red-900/40"
              >
                Ha, O'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
