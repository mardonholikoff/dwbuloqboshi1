import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { ServiceRecord, RecordStatusFilter } from '../types';
import { createAdminLog } from '../lib/adminSession';
import {
  X,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Car,
  Droplet,
  Wrench,
  TrendingUp,
  Award,
  ChevronRight,
  Phone,
  Printer,
  Edit2,
  Clock,
  Sparkles,
  FileSpreadsheet,
  PieChart,
  Users
} from 'lucide-react';

interface FullAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ServiceRecord[];
  onSelectCustomer: (carPlate: string, customerName?: string) => void;
  onEditRecord: (record: ServiceRecord) => void;
  onPrintRecord: (record: ServiceRecord) => void;
  onOpenNewModal: () => void;
  onUpdateCustomerInfo?: (oldPlate: string, newPlate: string, newPhone: string, newModel: string) => void;
  username?: string;
}

type DatePeriodOption = 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom' | 'all';

// Helper: Extract oil and parts cleanly from record
const parseOilAndParts = (record: ServiceRecord) => {
  let oilStr = (record.replacedOil || '').trim();
  let partsStr = (record.replacedParts || '').trim();

  if (!oilStr && partsStr) {
    const lower = partsStr.toLowerCase();
    const oilBrands = ['shell', 'castrol', 'mannol', 'zic', 'lukoil', 'kixx', 'mobil', 'chevrolet', 'hyundai', 'total', '5w-', '10w-', '0w-', '4t', 'oil', 'moy'];
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

  return {
    oilName: oilStr || (record.replacedParts?.toLowerCase().includes('moy') ? 'Moy almashtirildi' : '—'),
    partsName: partsStr || '—',
  };
};

export const FullAnalyticsModal: React.FC<FullAnalyticsModalProps> = ({
  isOpen,
  onClose,
  records,
  onSelectCustomer,
  onEditRecord,
  onPrintRecord,
  onOpenNewModal,
  onUpdateCustomerInfo,
  username = 'daewoobuloqboshi',
}) => {
  const [activeTab, setActiveTab] = useState<'table' | 'customers' | 'rankings'>('table');

  useEffect(() => {
    if (isOpen) {
      createAdminLog(
        "Analitika Paneli Ko'rildi",
        "Kengaytirilgan analitika va Excel hisobotlar oynasi ochildi",
        username
      );
    }
  }, [isOpen, username]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [datePeriod, setDatePeriod] = useState<DatePeriodOption>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOilBrand, setSelectedOilBrand] = useState<string>('all');
  const [selectedCarModel, setSelectedCarModel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<RecordStatusFilter>('barchasi');
  const [selectedPartFilter, setSelectedPartFilter] = useState<string>('all');

  // Customer Info Edit Modal State
  const [editingCustomer, setEditingCustomer] = useState<{
    oldPlate: string;
    customerName: string;
    phoneNumber: string;
    carPlate: string;
    carModel: string;
  } | null>(null);

  const handleSaveCustomerInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    if (onUpdateCustomerInfo) {
      onUpdateCustomerInfo(
        editingCustomer.oldPlate,
        editingCustomer.carPlate,
        editingCustomer.phoneNumber,
        editingCustomer.carModel
      );
    }
    setEditingCustomer(null);
  };
  const availableOilBrands = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const { oilName } = parseOilAndParts(r);
      if (oilName && oilName !== '—') {
        const lower = oilName.toLowerCase();
        if (lower.includes('shell')) set.add('Shell');
        else if (lower.includes('castrol')) set.add('Castrol');
        else if (lower.includes('mannol')) set.add('Mannol');
        else if (lower.includes('zic')) set.add('ZIC');
        else if (lower.includes('kixx')) set.add('Kixx');
        else if (lower.includes('lukoil')) set.add('Lukoil');
        else if (lower.includes('mobil')) set.add('Mobil');
        else if (lower.includes('chevrolet')) set.add('Chevrolet');
        else if (lower.includes('hyundai')) set.add('Hyundai');
        else if (lower.includes('total')) set.add('Total');
        else set.add(oilName.split(' ')[0]);
      }
    });
    return Array.from(set).sort();
  }, [records]);

  // Available Car Models extracted dynamically
  const availableCarModels = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.carModel?.trim()) {
        set.add(r.carModel.trim());
      }
    });
    return Array.from(set).sort();
  }, [records]);

  // Date Filtering logic
  const filteredRecords = useMemo(() => {
    const now = new Date();

    return records.filter((r) => {
      const rDate = new Date(r.createdAt);

      // 1. Date Period Filter
      if (datePeriod === 'today') {
        if (
          rDate.getFullYear() !== now.getFullYear() ||
          rDate.getMonth() !== now.getMonth() ||
          rDate.getDate() !== now.getDate()
        ) {
          return false;
        }
      } else if (datePeriod === 'this_week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (rDate < oneWeekAgo) return false;
      } else if (datePeriod === 'this_month') {
        if (rDate.getFullYear() !== now.getFullYear() || rDate.getMonth() !== now.getMonth()) {
          return false;
        }
      } else if (datePeriod === 'this_year') {
        if (rDate.getFullYear() !== now.getFullYear()) return false;
      } else if (datePeriod === 'custom') {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (rDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (rDate > end) return false;
        }
      }

      // 2. Status Filter
      if (selectedStatus !== 'barchasi' && r.status !== selectedStatus) {
        return false;
      }

      // 3. Car Model Filter
      if (selectedCarModel !== 'all') {
        if ((r.carModel || '').toLowerCase() !== selectedCarModel.toLowerCase()) {
          return false;
        }
      }

      // 4. Oil Brand Filter
      const { oilName, partsName } = parseOilAndParts(r);
      if (selectedOilBrand !== 'all') {
        if (!oilName.toLowerCase().includes(selectedOilBrand.toLowerCase())) {
          return false;
        }
      }

      // 5. Spare Part Filter
      if (selectedPartFilter !== 'all') {
        if (!partsName.toLowerCase().includes(selectedPartFilter.toLowerCase())) {
          return false;
        }
      }

      // 6. Search Term Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = r.customerName.toLowerCase().includes(q);
        const matchPhone = r.phoneNumber.toLowerCase().includes(q);
        const matchPlate = r.carPlate.toLowerCase().includes(q);
        const matchModel = (r.carModel || '').toLowerCase().includes(q);
        const matchOil = oilName.toLowerCase().includes(q);
        const matchParts = partsName.toLowerCase().includes(q);
        const matchNotes = (r.notes || '').toLowerCase().includes(q);
        return matchName || matchPhone || matchPlate || matchModel || matchOil || matchParts || matchNotes;
      }

      return true;
    });
  }, [
    records,
    datePeriod,
    startDate,
    endDate,
    selectedStatus,
    selectedCarModel,
    selectedOilBrand,
    selectedPartFilter,
    searchTerm,
  ]);

  // Grouping records by customer (carPlate)
  const customerGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        plate: string;
        customerName: string;
        phoneNumber: string;
        carModel: string;
        records: ServiceRecord[];
        totalCost: number;
        lastServiceDate: string;
        lastMileage: string | number;
      }
    >();

    filteredRecords.forEach((r) => {
      const plate = (r.carPlate || 'NO-PLATE').toUpperCase().trim();
      if (!map.has(plate)) {
        map.set(plate, {
          plate,
          customerName: r.customerName,
          phoneNumber: r.phoneNumber,
          carModel: r.carModel || '',
          records: [],
          totalCost: 0,
          lastServiceDate: r.createdAt,
          lastMileage: r.mileageKm || '',
        });
      }

      const group = map.get(plate)!;
      group.records.push(r);
      group.totalCost += Number(r.costUzs) || 0;

      // Keep latest service date
      if (new Date(r.createdAt) > new Date(group.lastServiceDate)) {
        group.lastServiceDate = r.createdAt;
        group.customerName = r.customerName; // update name if changed
        group.phoneNumber = r.phoneNumber;
        group.carModel = r.carModel || group.carModel;
        if (r.mileageKm) group.lastMileage = r.mileageKm;
      }
    });

    const list = Array.from(map.values());
    // Sort customers by highest expenditure or service count
    list.sort((a, b) => b.totalCost - a.totalCost || b.records.length - a.records.length);

    return list;
  }, [filteredRecords]);

  // Top Oil Brands Rankings
  const topOilsRanking = useMemo(() => {
    const counts = new Map<string, { count: number; totalRev: number }>();

    filteredRecords.forEach((r) => {
      const { oilName } = parseOilAndParts(r);
      if (oilName && oilName !== '—') {
        const normalized = oilName.trim();
        const current = counts.get(normalized) || { count: 0, totalRev: 0 };
        current.count += 1;
        current.totalRev += Number(r.costUzs) || 0;
        counts.set(normalized, current);
      }
    });

    return Array.from(counts.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  // Top Spare Parts Rankings
  const topPartsRanking = useMemo(() => {
    const counts = new Map<string, { count: number }>();

    filteredRecords.forEach((r) => {
      const { partsName } = parseOilAndParts(r);
      if (partsName && partsName !== '—') {
        const items = partsName.split(/,\s*/);
        items.forEach((item) => {
          const trimmed = item.trim();
          if (trimmed.length > 1) {
            const current = counts.get(trimmed) || { count: 0 };
            current.count += 1;
            counts.set(trimmed, current);
          }
        });
      }
    });

    return Array.from(counts.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  // Total summary numbers
  const totalRevenue = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (Number(r.costUzs) || 0), 0);
  }, [filteredRecords]);

  // Export to Excel (.xlsx) using XLSX library
  const exportToExcel = (type: 'all_filtered' | 'customer_summary' | 'top_products') => {
    const wb = XLSX.utils.book_new();

    if (type === 'all_filtered') {
      const dataRows = filteredRecords.map((r, idx) => {
        const { oilName, partsName } = parseOilAndParts(r);
        return {
          '№': idx + 1,
          'Sana': new Date(r.createdAt).toLocaleDateString('uz-UZ') + ' ' + new Date(r.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
          'Mijoz Ismi': r.customerName,
          'Telefon Nomeri': r.phoneNumber,
          'Mashina Raqami': r.carPlate,
          'Mashina Rusumi': r.carModel || '—',
          'Bosgan Masofasi (km)': r.mileageKm || '—',
          'Almashtirilgan Moy': oilName,
          'Almashtirilgan Zapchastlar': partsName,
          'Bajarilishi Kerak Zapchastlar': r.partsToReplace || '—',
          'Summa (UZS)': Number(r.costUzs) || 0,
          'Status': r.status,
          'Izoh': r.notes || '—',
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataRows);
      XLSX.utils.book_append_sheet(wb, ws, "Xizmatlar_Jadvali");
    } else if (type === 'customer_summary') {
      const customerRows = customerGroups.map((c, idx) => ({
        '№': idx + 1,
        'Mijoz Ismi': c.customerName,
        'Mashina Raqami': c.plate,
        'Mashina Rusumi': c.carModel || '—',
        'Telefon Nomeri': c.phoneNumber,
        'Xizmatlar Soni': c.records.length,
        'Umumiy Sarflangan Summa (UZS)': c.totalCost,
        'Oxirgi Xizmat Sanasi': new Date(c.lastServiceDate).toLocaleDateString('uz-UZ'),
        'Oxirgi Masofasi (km)': c.lastMileage || '—',
      }));

      const ws = XLSX.utils.json_to_sheet(customerRows);
      XLSX.utils.book_append_sheet(wb, ws, "Mijozlar_Hisoboti");
    } else if (type === 'top_products') {
      const oilRows = topOilsRanking.map((o, i) => ({
        "Orin": i + 1,
        "Moy Nomi": o.name,
        "Almashtirishlar Soni": o.count,
        "Tushum Summasi (UZS)": o.totalRev,
      }));

      const partsRows = topPartsRanking.map((p, i) => ({
        "Orin": i + 1,
        "Zapchast Nomi": p.name,
        "Sotilgan/Almashtirilgan Soni": p.count,
      }));

      const wsOil = XLSX.utils.json_to_sheet(oilRows);
      const wsParts = XLSX.utils.json_to_sheet(partsRows);

      XLSX.utils.book_append_sheet(wb, wsOil, "Top_Moylar");
      XLSX.utils.book_append_sheet(wb, wsParts, "Top_Zapchastlar");
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `daewoo_nargiz_${type}_${dateStr}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl my-auto overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Kengaytirilgan Mijozlar Bazasining Analitika Jadvali
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-extrabold text-xs border border-blue-500/30">
                  Excel Rejim 📊
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Barcha mijozlar, davriy xizmatlar, top moy/zapchastlar tahlili hamda Excel (.xlsx) hisobotlari
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={() => exportToExcel('all_filtered')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Filtrlangan ma'lumotlarni Excel fayliga (.xlsx) ko'chirish"
            >
              <Download className="w-4 h-4" />
              <span>Excel (.xlsx) Yuklash</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex items-center gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('table')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'table'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>📋 Barcha Xizmatlar Jadvali ({filteredRecords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'customers'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>👤 Mijozlar Kesimida ({customerGroups.length} ta mijoz)</span>
          </button>

          <button
            onClick={() => setActiveTab('rankings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'rankings'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Award className="w-4 h-4 text-amber-300" />
            <span>🏆 Top Moy & Zapchastlar Analitikasi</span>
          </button>
        </div>

        {/* Global Filter Bar */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-3 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Quick Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Mijoz ismi, telefon, davlat raqami, moy..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Period Filter */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
              <select
                value={datePeriod}
                onChange={(e) => setDatePeriod(e.target.value as DatePeriodOption)}
                className="w-full bg-transparent text-xs text-white font-semibold focus:outline-none px-2 cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">📅 Barcha Davrlar</option>
                <option value="today" className="bg-slate-900 text-white">Bugun</option>
                <option value="this_week" className="bg-slate-900 text-white">Shu Hafta (7 kun)</option>
                <option value="this_month" className="bg-slate-900 text-white">Shu Oy</option>
                <option value="this_year" className="bg-slate-900 text-white">Shu Yil</option>
                <option value="custom" className="bg-slate-900 text-white">Oraliq (Sana Tanlash)</option>
              </select>
            </div>

            {/* Oil Brand Filter */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
              <Droplet className="w-4 h-4 text-amber-400 ml-1.5 shrink-0" />
              <select
                value={selectedOilBrand}
                onChange={(e) => setSelectedOilBrand(e.target.value)}
                className="w-full bg-transparent text-xs text-amber-300 font-semibold focus:outline-none px-1.5 cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">🛢️ Barcha Moy Markalari</option>
                {availableOilBrands.map((brand) => (
                  <option key={brand} value={brand} className="bg-slate-900 text-amber-300">
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            {/* Car Model Filter */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
              <Car className="w-4 h-4 text-blue-400 ml-1.5 shrink-0" />
              <select
                value={selectedCarModel}
                onChange={(e) => setSelectedCarModel(e.target.value)}
                className="w-full bg-transparent text-xs text-blue-300 font-semibold focus:outline-none px-1.5 cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">🚗 Barcha Mashina Rusumlari</option>
                {availableCarModels.map((model) => (
                  <option key={model} value={model} className="bg-slate-900 text-blue-300">
                    {model}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Date Range Picker inputs if 'custom' selected */}
          {datePeriod === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 pt-1 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold">Sana Oralig'i:</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
                <span className="text-slate-500">—</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
            </div>
          )}

          {/* Filter Status Summary pill */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
            <div className="flex items-center gap-3">
              <span>Topildi: <strong className="text-white">{filteredRecords.length} ta yozuv</strong></span>
              <span>• Mijozlar: <strong className="text-blue-400">{customerGroups.length} ta</strong></span>
              <span>• Jami tushum: <strong className="text-emerald-400 font-mono font-bold">{totalRevenue.toLocaleString('uz-UZ')} UZS</strong></span>
            </div>

            <button
              onClick={() => {
                setSearchTerm('');
                setDatePeriod('all');
                setStartDate('');
                setEndDate('');
                setSelectedOilBrand('all');
                setSelectedCarModel('all');
                setSelectedStatus('barchasi');
                setSelectedPartFilter('all');
              }}
              className="text-slate-500 hover:text-amber-400 text-[11px] underline cursor-pointer"
            >
              Filtrlarni Tozalash
            </button>
          </div>
        </div>

        {/* Tab 1: Detailed Records Excel Spreadsheet Table */}
        {activeTab === 'table' && (
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1100px] text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b-2 border-slate-800 text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center border-r border-slate-800 w-12">№</th>
                    <th className="py-3 px-4 border-r border-slate-800 min-w-[180px]">Mijoz & Mashina</th>
                    <th className="py-3 px-3 border-r border-slate-800 text-center whitespace-nowrap">Telefon</th>
                    <th className="py-3 px-3 border-r border-slate-800 text-center whitespace-nowrap">Masofa (km)</th>
                    <th className="py-3 px-4 border-r border-slate-800 min-w-[180px] text-amber-400">Almashtirilgan Moy 🛢️</th>
                    <th className="py-3 px-4 border-r border-slate-800 min-w-[180px] text-emerald-400">Almashtirilgan Zapchast ⚙️</th>
                    <th className="py-3 px-3 border-r border-slate-800 text-right whitespace-nowrap">Xizmat (UZS)</th>
                    <th className="py-3 px-3 border-r border-slate-800 text-center whitespace-nowrap">Xizmat Sanasi</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Amallar</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        Tanlangan filtrlar bo'yicha yozuvlar topilmadi.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r, idx) => {
                      const { oilName, partsName } = parseOilAndParts(r);

                      return (
                        <tr key={r.id} className="hover:bg-slate-850/80 transition-colors border-b border-slate-800/60">
                          <td className="py-3 px-3 text-center border-r border-slate-800 font-mono text-slate-500 font-bold">
                            {idx + 1}
                          </td>

                          {/* Customer & Car Plate Clickable */}
                          <td className="py-3 px-4 border-r border-slate-800">
                            <button
                              onClick={() => onSelectCustomer(r.carPlate, r.customerName)}
                              className="text-left w-full group cursor-pointer"
                            >
                              <div className="font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                                <span className="underline underline-offset-2 decoration-blue-500/40">{r.customerName}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-blue-400 border border-slate-700">
                                  {r.carPlate}
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {r.carModel}
                                </span>
                              </div>
                            </button>
                          </td>

                          {/* Phone */}
                          <td className="py-3 px-3 border-r border-slate-800 text-center font-mono">
                            <a href={`tel:${r.phoneNumber.replace(/\s+/g, '')}`} className="text-blue-400 hover:underline">
                              {r.phoneNumber}
                            </a>
                          </td>

                          {/* Mileage */}
                          <td className="py-3 px-3 border-r border-slate-800 text-center font-mono font-semibold">
                            {r.mileageKm ? `${Number(r.mileageKm).toLocaleString('uz-UZ')} km` : '—'}
                          </td>

                          {/* Replaced Oil */}
                          <td className="py-3 px-4 border-r border-slate-800 text-amber-300 font-medium">
                            {oilName}
                          </td>

                          {/* Replaced Parts */}
                          <td className="py-3 px-4 border-r border-slate-800 text-emerald-300 font-medium">
                            {partsName}
                          </td>

                          {/* Cost */}
                          <td className="py-3 px-3 border-r border-slate-800 text-right font-mono font-bold text-slate-100">
                            {Number(r.costUzs).toLocaleString('uz-UZ')} so'm
                          </td>

                          {/* Service Date */}
                          <td className="py-3 px-3 border-r border-slate-800 text-center font-mono text-slate-400 text-[11px]">
                            {new Date(r.createdAt).toLocaleDateString('uz-UZ')}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => onPrintRecord(r)}
                                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg cursor-pointer"
                                title="Chek chop etish"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onEditRecord(r)}
                                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-blue-400 rounded-lg cursor-pointer"
                                title="Tahrirlash"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Customer Grouping Breakdown */}
        {activeTab === 'customers' && (
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs text-slate-400">
                Har bir mijoz bo'yicha umumiy xizmatlar va sarflangan mablag'lar statistikasi:
              </span>
              <button
                onClick={() => exportToExcel('customer_summary')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Mijozlar Excel Hisoboti (.xlsx)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {customerGroups.map((c, i) => (
                <div
                  key={c.plate}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-blue-500/40 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-blue-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                          #{i + 1}
                        </span>
                        <h3 className="text-sm font-extrabold text-white group-hover:text-blue-300">
                          {c.customerName}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-slate-900 text-blue-400 font-mono font-bold text-xs rounded border border-slate-800">
                          {c.plate}
                        </span>
                        <span className="text-xs text-slate-400">{c.carModel}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block text-[10px]">Jami Xizmat:</span>
                      <strong className="text-blue-400 font-mono text-sm">{c.records.length} marta</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Umumiy Xarajat:</span>
                      <strong className="text-emerald-400 font-mono font-bold">
                        {c.totalCost.toLocaleString('uz-UZ')} UZS
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Oxirgi Kelgan:</span>
                      <strong className="text-slate-200 font-mono">
                        {new Date(c.lastServiceDate).toLocaleDateString('uz-UZ')}
                      </strong>
                    </div>
                  </div>

                  {/* Customer Card Actions */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={() =>
                        setEditingCustomer({
                          oldPlate: c.plate,
                          customerName: c.customerName,
                          phoneNumber: c.phoneNumber || '',
                          carPlate: c.plate,
                          carModel: c.carModel || '',
                        })
                      }
                      className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl border border-slate-800 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                      title="Mijoz telefon raqami, mashina raqami va modelini tahrirlash"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Tahrirlash</span>
                    </button>
                    <button
                      onClick={() => onSelectCustomer(c.plate, c.customerName)}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-blue-300 font-bold text-xs rounded-xl border border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <span>Xizmatlar Tarixi</span>
                      <ChevronRight className="w-4 h-4 text-blue-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Top Moy & Zapchast Analytics */}
        {activeTab === 'rankings' && (
          <div className="p-4 overflow-y-auto flex-1 space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs text-slate-400">
                Eng ko'p ishlatilgan va xarid qilingan moylar va ehtiyot qismlar statistikasi:
              </span>
              <button
                onClick={() => exportToExcel('top_products')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Top Moy/Zapchastlar Excel (.xlsx)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Oils Ranking Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Droplet className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-extrabold text-white">Eng Ko'p Almashtirilgan Moy Markalari</h3>
                </div>

                <div className="space-y-2.5">
                  {topOilsRanking.length === 0 ? (
                    <p className="text-slate-500 text-xs">Moy almashtirish ma'lumotlari topilmadi.</p>
                  ) : (
                    topOilsRanking.slice(0, 10).map((oil, idx) => {
                      const maxCount = topOilsRanking[0].count || 1;
                      const percentage = Math.round((oil.count / maxCount) * 100);

                      return (
                        <div key={oil.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-amber-300 flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-mono flex items-center justify-center font-bold">
                                #{idx + 1}
                              </span>
                              {oil.name}
                            </span>
                            <span className="font-mono font-bold text-white">
                              {oil.count} marta <span className="text-slate-500 font-normal">({oil.totalRev.toLocaleString('uz-UZ')} UZS)</span>
                            </span>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Top Spare Parts Ranking Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Wrench className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-extrabold text-white">Eng Ko'p Almashtirilgan Ehtiyot Qismlar (Zapchastlar)</h3>
                </div>

                <div className="space-y-2.5">
                  {topPartsRanking.length === 0 ? (
                    <p className="text-slate-500 text-xs">Zapchast ma'lumotlari topilmadi.</p>
                  ) : (
                    topPartsRanking.slice(0, 10).map((part, idx) => {
                      const maxCount = topPartsRanking[0].count || 1;
                      const percentage = Math.round((part.count / maxCount) * 100);

                      return (
                        <div key={part.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-300 flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-mono flex items-center justify-center font-bold">
                                #{idx + 1}
                              </span>
                              {part.name}
                            </span>
                            <span className="font-mono font-bold text-white">
                              {part.count} marta
                            </span>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">🟢 Excel Fayllar (.xlsx)</span>
            <span>tayyor va avtomatik shakllantiriladi.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl cursor-pointer"
          >
            Yopish
          </button>
        </div>
      </div>

      {/* Customer Info Edit Modal Overlay */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-extrabold text-white">
                  Mijoz Ma'lumotlarini Tahrirlash
                </h3>
              </div>
              <button
                onClick={() => setEditingCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerInfo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Mijoz Ismi (O'zgarmaydi)
                </label>
                <input
                  type="text"
                  disabled
                  value={editingCustomer.customerName}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-400 rounded-xl text-sm cursor-not-allowed opacity-80"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Telefon Raqami <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingCustomer.phoneNumber}
                  onChange={(e) =>
                    setEditingCustomer({ ...editingCustomer, phoneNumber: e.target.value })
                  }
                  placeholder="+998 90 123 45 67"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mashina Raqami <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingCustomer.carPlate}
                  onChange={(e) =>
                    setEditingCustomer({ ...editingCustomer, carPlate: e.target.value.toUpperCase() })
                  }
                  placeholder="01 A 777 AA"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl text-sm font-mono uppercase focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mashina Modeli
                </label>
                <input
                  type="text"
                  value={editingCustomer.carModel}
                  onChange={(e) =>
                    setEditingCustomer({ ...editingCustomer, carModel: e.target.value })
                  }
                  placeholder="Gentra 1.5, Cobalt..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl cursor-pointer shadow-lg shadow-amber-600/30"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
