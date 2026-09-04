import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { ServiceRecord } from '../types';
import { createAdminLog } from '../lib/adminSession';
import {
  Users,
  Search,
  Download,
  Calendar,
  Phone,
  Car,
  Droplet,
  Wrench,
  DollarSign,
  Clock,
  ChevronRight,
  Filter,
  CheckCircle2,
  TrendingUp,
  Award,
  ArrowUpDown,
  Printer,
  Edit2,
  Plus,
  RefreshCw,
  X,
  ExternalLink,
  Tag,
  ChevronDown
} from 'lucide-react';

interface CustomerCrmSectionProps {
  records: ServiceRecord[];
  username?: string;
  onSelectCustomerForHistory?: (carPlate: string, customerName?: string) => void;
  onEditRecord?: (record: ServiceRecord) => void;
  onPrintRecord?: (record: ServiceRecord) => void;
  onOpenNewModal?: () => void;
  onUpdateCustomerInfo?: (oldPlate: string, newPlate: string, newPhone: string, newModel: string) => void;
}

export interface UniqueCustomerSummary {
  key: string;
  plate: string;
  customerName: string;
  phoneNumber: string;
  carModel: string;
  totalVisits: number;
  allTimeSpent: number;
  allTimeOilSpent: number;
  allTimePartsSpent: number;
  allTimeLaborSpent: number;
  firstVisitDate: string;
  lastVisitDate: string;
  lastMileage: number | string;
  topOil: { name: string; brand: string; count: number; spent: number } | null;
  topPart: { name: string; count: number; spent: number } | null;
  records: ServiceRecord[];
}

export type CrmDatePeriod = 'all' | 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom';

// Known Oil Brands list for smart recognition
const KNOWN_OIL_BRANDS = [
  'Shell',
  'Castrol',
  'Mannol',
  'ZIC',
  'Kixx',
  'Lukoil',
  'Mobil',
  'Chevrolet',
  'Hyundai',
  'Total',
  'GM',
  'Ravenol',
  'Motul',
  'Champion',
  'Rolf',
  'Sintec',
  'Bardahl',
  'Liqui Moly',
  'Fanfaro',
  'Rosneft'
];

// Helper to detect brand from oil string
export const extractOilBrand = (oilStr: string): string => {
  if (!oilStr || oilStr === '—') return 'Boshqa';
  const lower = oilStr.toLowerCase();
  for (const brand of KNOWN_OIL_BRANDS) {
    if (lower.includes(brand.toLowerCase())) {
      return brand;
    }
  }
  const firstWord = oilStr.trim().split(/[\s\-]/)[0];
  return firstWord.length > 2 ? firstWord : 'Boshqa';
};

// Helper to parse oil and parts from a record cleanly
export const extractRecordDetails = (r: ServiceRecord) => {
  let oilStr = (r.replacedOil || '').trim();
  let partsStr = (r.replacedParts || '').trim();

  // If replacedOil is empty, try extracting from replacedParts
  if (!oilStr && partsStr) {
    const partsLower = partsStr.toLowerCase();
    const oilKeywords = ['shell', 'castrol', 'mannol', 'zic', 'lukoil', 'kixx', 'mobil', 'chevrolet', 'hyundai', 'total', '5w-', '10w-', '0w-', '4t', 'oil', 'moy'];
    const segments = partsStr.split(/,\s*/);
    const oilSegments: string[] = [];
    const restSegments: string[] = [];

    segments.forEach((seg) => {
      const segLower = seg.toLowerCase();
      if (oilKeywords.some((kw) => segLower.includes(kw)) && !segLower.includes('filtr') && !segLower.includes('kolodka')) {
        oilSegments.push(seg);
      } else {
        restSegments.push(seg);
      }
    });

    if (oilSegments.length > 0) {
      oilStr = oilSegments.join(', ');
      partsStr = restSegments.join(', ');
    }
  }

  // Cost calculations
  const laborCost = Number(r.costUzs) || 0;
  const oilCost = Number(r.oilCostUzs) || 0;
  const partsCost = Number(r.partsCostUzs) || 0;

  let totalCost = 0;
  if (oilCost > 0 || partsCost > 0) {
    totalCost = laborCost + oilCost + partsCost;
  } else {
    totalCost = laborCost;
  }

  return {
    oilStr: oilStr || (r.replacedParts?.toLowerCase().includes('moy') ? 'Moy almashtirildi' : '—'),
    partsStr: partsStr || '—',
    oilCost,
    partsCost,
    laborCost,
    totalCost,
  };
};

export const CustomerCrmSection: React.FC<CustomerCrmSectionProps> = ({
  records,
  username = 'admindw',
  onSelectCustomerForHistory,
  onEditRecord,
  onPrintRecord,
  onOpenNewModal,
  onUpdateCustomerInfo,
}) => {
  // Main Search and Sort
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'visits_desc' | 'spent_desc' | 'date_desc' | 'name_asc'>('visits_desc');

  // Drill-down selected customer for deep CRM view
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null);

  // Drill-down customer period filter
  const [customerPeriod, setCustomerPeriod] = useState<CrmDatePeriod>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Drill-down specific oil brand & parts filter
  const [selectedOilBrandFilter, setSelectedOilBrandFilter] = useState<string>('all');
  const [selectedPartFilter, setSelectedPartFilter] = useState<string>('all');

  // Customer Info Quick Edit Modal State
  const [editingCustomer, setEditingCustomer] = useState<{
    oldPlate: string;
    customerName: string;
    phoneNumber: string;
    carPlate: string;
    carModel: string;
  } | null>(null);

  // 1. Group records into unique, non-duplicated customers
  const uniqueCustomersList = useMemo<UniqueCustomerSummary[]>(() => {
    const customerMap = new Map<string, ServiceRecord[]>();

    records.forEach((r) => {
      // Primary key: cleaned carPlate, or phone number, or lower-cased customer name
      const cleanPlate = (r.carPlate || '').trim().toUpperCase().replace(/[\s\-_]/g, '');
      const cleanPhone = (r.phoneNumber || '').trim().replace(/[\s\-_+]/g, '');
      const cleanName = (r.customerName || '').trim().toLowerCase();

      const key = cleanPlate || cleanPhone || cleanName || 'unknown';

      if (!customerMap.has(key)) {
        customerMap.set(key, []);
      }
      customerMap.get(key)!.push(r);
    });

    const summaries: UniqueCustomerSummary[] = [];

    customerMap.forEach((custRecords, key) => {
      // Sort descending by date
      const sortedRecords = [...custRecords].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const latest = sortedRecords[0];
      const oldest = sortedRecords[sortedRecords.length - 1];

      // Cost aggregation
      let allTimeSpent = 0;
      let allTimeOilSpent = 0;
      let allTimePartsSpent = 0;
      let allTimeLaborSpent = 0;

      // Track favorite oils and parts
      const oilCounter = new Map<string, { count: number; spent: number; brand: string }>();
      const partsCounter = new Map<string, { count: number; spent: number }>();

      sortedRecords.forEach((r) => {
        const { oilStr, partsStr, oilCost, partsCost, laborCost, totalCost } = extractRecordDetails(r);
        allTimeSpent += totalCost;
        allTimeOilSpent += oilCost;
        allTimePartsSpent += partsCost;
        allTimeLaborSpent += laborCost;

        // Count oil
        if (oilStr && oilStr !== '—') {
          const brand = extractOilBrand(oilStr);
          const current = oilCounter.get(oilStr) || { count: 0, spent: 0, brand };
          current.count += 1;
          current.spent += oilCost;
          oilCounter.set(oilStr, current);
        }

        // Count parts
        if (partsStr && partsStr !== '—') {
          const partsArray = partsStr.split(/,\s*/);
          partsArray.forEach((p) => {
            const trimmed = p.trim();
            if (trimmed) {
              const current = partsCounter.get(trimmed) || { count: 0, spent: 0 };
              current.count += 1;
              current.spent += Math.round(partsCost / (partsArray.length || 1));
              partsCounter.set(trimmed, current);
            }
          });
        }
      });

      // Find top oil
      let topOil: { name: string; brand: string; count: number; spent: number } | null = null;
      let maxOilCount = 0;
      oilCounter.forEach((data, name) => {
        if (data.count > maxOilCount) {
          maxOilCount = data.count;
          topOil = { name, brand: data.brand, count: data.count, spent: data.spent };
        }
      });

      // Find top part
      let topPart: { name: string; count: number; spent: number } | null = null;
      let maxPartCount = 0;
      partsCounter.forEach((data, name) => {
        if (data.count > maxPartCount) {
          maxPartCount = data.count;
          topPart = { name, count: data.count, spent: data.spent };
        }
      });

      summaries.push({
        key,
        plate: latest.carPlate || '—',
        customerName: latest.customerName || 'Noma\'lum',
        phoneNumber: latest.phoneNumber || '—',
        carModel: latest.carModel || '—',
        totalVisits: sortedRecords.length,
        allTimeSpent,
        allTimeOilSpent,
        allTimePartsSpent,
        allTimeLaborSpent,
        firstVisitDate: oldest.createdAt,
        lastVisitDate: latest.createdAt,
        lastMileage: latest.mileageKm || '—',
        topOil,
        topPart,
        records: sortedRecords,
      });
    });

    return summaries;
  }, [records]);

  // 2. Filter & Sort Unique Customers
  const filteredCustomers = useMemo(() => {
    let result = uniqueCustomersList;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((c) => {
        const matchName = c.customerName.toLowerCase().includes(q);
        const matchPhone = c.phoneNumber.toLowerCase().includes(q);
        const matchPlate = c.plate.toLowerCase().includes(q);
        const matchModel = c.carModel.toLowerCase().includes(q);
        const matchOil = c.topOil?.name.toLowerCase().includes(q);
        const matchPart = c.topPart?.name.toLowerCase().includes(q);
        return matchName || matchPhone || matchPlate || matchModel || matchOil || matchPart;
      });
    }

    return result.sort((a, b) => {
      if (sortBy === 'visits_desc') {
        return b.totalVisits - a.totalVisits;
      } else if (sortBy === 'spent_desc') {
        return b.allTimeSpent - a.allTimeSpent;
      } else if (sortBy === 'date_desc') {
        return new Date(b.lastVisitDate).getTime() - new Date(a.lastVisitDate).getTime();
      } else if (sortBy === 'name_asc') {
        return a.customerName.localeCompare(b.customerName, 'uz');
      }
      return 0;
    });
  }, [uniqueCustomersList, searchTerm, sortBy]);

  // Selected customer object
  const activeCustomer = useMemo(() => {
    if (!selectedCustomerKey) return null;
    return uniqueCustomersList.find((c) => c.key === selectedCustomerKey) || null;
  }, [uniqueCustomersList, selectedCustomerKey]);

  // Drill-down: Available oil brands and parts for the selected customer
  const activeCustomerOilBrands = useMemo(() => {
    if (!activeCustomer) return [];
    const brandsSet = new Set<string>();
    activeCustomer.records.forEach((r) => {
      const { oilStr } = extractRecordDetails(r);
      if (oilStr && oilStr !== '—') {
        brandsSet.add(extractOilBrand(oilStr));
      }
    });
    return Array.from(brandsSet).sort();
  }, [activeCustomer]);

  const activeCustomerPartsList = useMemo(() => {
    if (!activeCustomer) return [];
    const partsSet = new Set<string>();
    activeCustomer.records.forEach((r) => {
      const { partsStr } = extractRecordDetails(r);
      if (partsStr && partsStr !== '—') {
        partsStr.split(/,\s*/).forEach((p) => {
          if (p.trim()) partsSet.add(p.trim());
        });
      }
    });
    return Array.from(partsSet).sort();
  }, [activeCustomer]);

  // Drill-down: Filtered records of active customer based on period and oil/parts filters
  const activeCustomerFilteredRecords = useMemo(() => {
    if (!activeCustomer) return [];
    const now = new Date();

    return activeCustomer.records.filter((r) => {
      const rDate = new Date(r.createdAt);

      // Period Filter
      if (customerPeriod === 'today') {
        if (
          rDate.getFullYear() !== now.getFullYear() ||
          rDate.getMonth() !== now.getMonth() ||
          rDate.getDate() !== now.getDate()
        ) {
          return false;
        }
      } else if (customerPeriod === 'this_week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (rDate < oneWeekAgo) return false;
      } else if (customerPeriod === 'this_month') {
        if (rDate.getFullYear() !== now.getFullYear() || rDate.getMonth() !== now.getMonth()) {
          return false;
        }
      } else if (customerPeriod === 'this_year') {
        if (rDate.getFullYear() !== now.getFullYear()) return false;
      } else if (customerPeriod === 'custom') {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          if (rDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (rDate > end) return false;
        }
      }

      // Oil Brand Filter
      const { oilStr, partsStr } = extractRecordDetails(r);
      if (selectedOilBrandFilter !== 'all') {
        const brand = extractOilBrand(oilStr);
        if (brand.toLowerCase() !== selectedOilBrandFilter.toLowerCase()) {
          return false;
        }
      }

      // Spare Part Filter
      if (selectedPartFilter !== 'all') {
        if (!partsStr.toLowerCase().includes(selectedPartFilter.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [activeCustomer, customerPeriod, customStartDate, customEndDate, selectedOilBrandFilter, selectedPartFilter]);

  // Active customer metrics for the selected period
  const activeCustomerPeriodMetrics = useMemo(() => {
    if (!activeCustomer) return null;

    let periodSpent = 0;
    let periodOilSpent = 0;
    let periodPartsSpent = 0;
    let periodLaborSpent = 0;

    const oilCounter = new Map<string, { count: number; spent: number; brand: string }>();
    const partsCounter = new Map<string, { count: number; spent: number }>();

    activeCustomerFilteredRecords.forEach((r) => {
      const { oilStr, partsStr, oilCost, partsCost, laborCost, totalCost } = extractRecordDetails(r);
      periodSpent += totalCost;
      periodOilSpent += oilCost;
      periodPartsSpent += partsCost;
      periodLaborSpent += laborCost;

      if (oilStr && oilStr !== '—') {
        const brand = extractOilBrand(oilStr);
        const curr = oilCounter.get(oilStr) || { count: 0, spent: 0, brand };
        curr.count += 1;
        curr.spent += oilCost;
        oilCounter.set(oilStr, curr);
      }

      if (partsStr && partsStr !== '—') {
        const partsArr = partsStr.split(/,\s*/);
        partsArr.forEach((p) => {
          const trimmed = p.trim();
          if (trimmed) {
            const curr = partsCounter.get(trimmed) || { count: 0, spent: 0 };
            curr.count += 1;
            curr.spent += Math.round(partsCost / (partsArr.length || 1));
            partsCounter.set(trimmed, curr);
          }
        });
      }
    });

    let topOilName = '—';
    let topOilCount = 0;
    let topOilSpent = 0;
    oilCounter.forEach((data, name) => {
      if (data.count > topOilCount) {
        topOilCount = data.count;
        topOilName = name;
        topOilSpent = data.spent;
      }
    });

    let topPartName = '—';
    let topPartCount = 0;
    let topPartSpent = 0;
    partsCounter.forEach((data, name) => {
      if (data.count > topPartCount) {
        topPartCount = data.count;
        topPartName = name;
        topPartSpent = data.spent;
      }
    });

    return {
      visitsCount: activeCustomerFilteredRecords.length,
      periodSpent,
      periodOilSpent,
      periodPartsSpent,
      periodLaborSpent,
      topOilName,
      topOilCount,
      topOilSpent,
      topPartName,
      topPartCount,
      topPartSpent,
      oilsBreakdown: Array.from(oilCounter.entries()).map(([name, data]) => ({ name, ...data })),
      partsBreakdown: Array.from(partsCounter.entries()).map(([name, data]) => ({ name, ...data })),
    };
  }, [activeCustomer, activeCustomerFilteredRecords]);

  // EXPORT: All Unique Customers to Excel (.xlsx)
  const handleExportAllCustomersExcel = async () => {
    await createAdminLog(
      "Mijozlar CRM Excelga Yuklandi",
      `Jami ${filteredCustomers.length} ta yagona mijoz ma'lumoti Excel (.xlsx) fayliga yuklab olindi`,
      username
    );

    const wb = XLSX.utils.book_new();

    const dataRows = filteredCustomers.map((c, idx) => ({
      '№': idx + 1,
      'Mijoz Ismi': c.customerName,
      'Telefon Nomeri': c.phoneNumber,
      'Mashina Davlat Raqami': c.plate,
      'Mashina Modeli': c.carModel || '—',
      'Jami Tashriflar Soni': c.totalVisits,
      'Jami Sarflangan Mablag\' (UZS)': c.allTimeSpent,
      'Moyga Sarflangan (UZS)': c.allTimeOilSpent,
      'Zapchastga Sarflangan (UZS)': c.allTimePartsSpent,
      'Xizmat Haqiga Sarflangan (UZS)': c.allTimeLaborSpent,
      'Eng Ko\'p Quygan Moyi': c.topOil ? `${c.topOil.name} (${c.topOil.count} marta)` : '—',
      'Eng Ko\'p Olgan Zapchasti': c.topPart ? `${c.topPart.name} (${c.topPart.count} marta)` : '—',
      'Oxirgi Tashrif Sanasi': new Date(c.lastVisitDate).toLocaleDateString('uz-UZ'),
      'Oxirgi Yurgan Masofasi (km)': c.lastMileage || '—',
      'Birinchi Kelgan Sanasi': new Date(c.firstVisitDate).toLocaleDateString('uz-UZ'),
    }));

    const ws = XLSX.utils.json_to_sheet(dataRows);
    XLSX.utils.book_append_sheet(wb, ws, "Yagona_Mijozlar_CRM");

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `daewoo_buloqboshi_crm_mijozlar_${dateStr}.xlsx`);
  };

  // EXPORT: Single Selected Customer Detailed Dossier (.xlsx)
  const handleExportSingleCustomerExcel = async () => {
    if (!activeCustomer || !activeCustomerPeriodMetrics) return;

    await createAdminLog(
      "Mijoz Shaxsiy Excel Yuklandi",
      `Mijoz ${activeCustomer.customerName} (${activeCustomer.plate}) ning to'liq hisoboti Excel (.xlsx) ga yuklandi`,
      username
    );

    const wb = XLSX.utils.book_new();

    // Sheet 1: General Info & KPI
    const infoRows = [
      { 'Ko\'rsatkich': 'Mijoz Ismi', 'Qiymat': activeCustomer.customerName },
      { 'Ko\'rsatkich': 'Telefon Raqami', 'Qiymat': activeCustomer.phoneNumber },
      { 'Ko\'rsatkich': 'Mashina Davlat Raqami', 'Qiymat': activeCustomer.plate },
      { 'Ko\'rsatkich': 'Mashina Rusumi / Modeli', 'Qiymat': activeCustomer.carModel },
      { 'Ko\'rsatkich': 'Tanlangan Hisobot Davri', 'Qiymat': customerPeriod === 'all' ? 'Butun davr (Barchasi)' : customerPeriod },
      { 'Ko\'rsatkich': 'Davrdagi Tashriflar Soni', 'Qiymat': `${activeCustomerPeriodMetrics.visitsCount} marta` },
      { 'Ko\'rsatkich': 'Umumiy Barcha Tashriflar Soni', 'Qiymat': `${activeCustomer.totalVisits} marta` },
      { 'Ko\'rsatkich': 'Davrdagi Jami Sarflangan Mablag\' (UZS)', 'Qiymat': activeCustomerPeriodMetrics.periodSpent },
      { 'Ko\'rsatkich': 'Davrda Moyga Sarflangan (UZS)', 'Qiymat': activeCustomerPeriodMetrics.periodOilSpent },
      { 'Ko\'rsatkich': 'Davrda Zapchastga Sarflangan (UZS)', 'Qiymat': activeCustomerPeriodMetrics.periodPartsSpent },
      { 'Ko\'rsatkich': 'Davrda Xizmat Haqiga Sarflangan (UZS)', 'Qiymat': activeCustomerPeriodMetrics.periodLaborSpent },
      { 'Ko\'rsatkich': 'Eng Ko\'p Quygan Moyi', 'Qiymat': `${activeCustomerPeriodMetrics.topOilName} (${activeCustomerPeriodMetrics.topOilCount} marta)` },
      { 'Ko\'rsatkich': 'Eng Ko\'p Olgan Zapchasti', 'Qiymat': `${activeCustomerPeriodMetrics.topPartName} (${activeCustomerPeriodMetrics.topPartCount} marta)` },
      { 'Ko\'rsatkich': 'Birinchi Tashrif Sanasi', 'Qiymat': new Date(activeCustomer.firstVisitDate).toLocaleDateString('uz-UZ') },
      { 'Ko\'rsatkich': 'Oxirgi Tashrif Sanasi', 'Qiymat': new Date(activeCustomer.lastVisitDate).toLocaleDateString('uz-UZ') },
    ];
    const wsInfo = XLSX.utils.json_to_sheet(infoRows);
    XLSX.utils.book_append_sheet(wb, wsInfo, "Mijoz_Anketasi");

    // Sheet 2: Visit History Records
    const visitsRows = activeCustomerFilteredRecords.map((r, idx) => {
      const { oilStr, partsStr, oilCost, partsCost, laborCost, totalCost } = extractRecordDetails(r);
      return {
        '№': idx + 1,
        'Xizmat Sanasi': new Date(r.createdAt).toLocaleDateString('uz-UZ') + ' ' + new Date(r.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        'Yurgan Masofasi (km)': r.mileageKm || '—',
        'Almashtirilgan Moy': oilStr,
        'Moy Narxi (UZS)': oilCost,
        'Almashtirilgan Zapchast': partsStr,
        'Zapchast Narxi (UZS)': partsCost,
        'Xizmat Haqi (UZS)': laborCost,
        'Jami To\'langan Summa (UZS)': totalCost,
        'Xizmat Holati': r.status,
        'Qo\'shimcha Izoh': r.notes || '',
      };
    });
    const wsVisits = XLSX.utils.json_to_sheet(visitsRows);
    XLSX.utils.book_append_sheet(wb, wsVisits, "Tashriflar_Tarixi");

    // Sheet 3: Oils Breakdown
    if (activeCustomerPeriodMetrics.oilsBreakdown.length > 0) {
      const oilsRows = activeCustomerPeriodMetrics.oilsBreakdown.map((o, idx) => ({
        '№': idx + 1,
        'Moy Nomi': o.name,
        'Moy Brendi': o.brand,
        'Quyilganlar Soni': o.count,
        'Jami Sarflangan Mablag\' (UZS)': o.spent,
      }));
      const wsOils = XLSX.utils.json_to_sheet(oilsRows);
      XLSX.utils.book_append_sheet(wb, wsOils, "Moylar_Statistikasi");
    }

    // Sheet 4: Parts Breakdown
    if (activeCustomerPeriodMetrics.partsBreakdown.length > 0) {
      const partsRows = activeCustomerPeriodMetrics.partsBreakdown.map((p, idx) => ({
        '№': idx + 1,
        'Zapchast Nomi': p.name,
        'Olinganlar Soni': p.count,
        'Jami Sarflangan Mablag\' (UZS)': p.spent,
      }));
      const wsParts = XLSX.utils.json_to_sheet(partsRows);
      XLSX.utils.book_append_sheet(wb, wsParts, "Zapchastlar_Statistikasi");
    }

    const cleanName = activeCustomer.customerName.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanPlate = activeCustomer.plate.replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `mijoz_${cleanName}_${cleanPlate}_${dateStr}.xlsx`);
  };

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

  return (
    <div className="space-y-6">
      {/* If a customer is selected, show deep drill-down analytics; otherwise show unique customers table */}
      {activeCustomer && activeCustomerPeriodMetrics ? (
        /* ========================================================================= */
        /* DETAILED DRILL-DOWN CUSTOMER CRM VIEW                                     */
        /* ========================================================================= */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 animate-fadeIn">
          {/* Top Bar with Navigation & Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedCustomerKey(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <span>← Barcha Mijozlarga Qaytish</span>
              </button>

              <div className="h-4 w-px bg-slate-800 hidden sm:block" />

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 font-mono text-xs font-extrabold border border-blue-500/30">
                  {activeCustomer.plate}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold">
                  {activeCustomer.carModel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() =>
                  setEditingCustomer({
                    oldPlate: activeCustomer.plate,
                    customerName: activeCustomer.customerName,
                    phoneNumber: activeCustomer.phoneNumber,
                    carPlate: activeCustomer.plate,
                    carModel: activeCustomer.carModel,
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Mijoz ma'lumotlarini tahrirlash"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Tahrirlash</span>
              </button>

              <button
                onClick={handleExportSingleCustomerExcel}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                title="Ushbu mijozning to'liq hisobotini Excel (.xlsx) da yuklab olish"
              >
                <Download className="w-4 h-4" />
                <span>Mijoz Hisoboti (.xlsx) Yuklash</span>
              </button>
            </div>
          </div>

          {/* Customer Profile Banner */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {activeCustomer.customerName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                  Faol Mijoz
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium">
                <a
                  href={`tel:${activeCustomer.phoneNumber.replace(/\s+/g, '')}`}
                  className="flex items-center gap-1.5 text-blue-400 hover:underline font-mono font-semibold"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{activeCustomer.phoneNumber}</span>
                </a>
                <span className="text-slate-700">•</span>
                <span className="flex items-center gap-1">
                  <Car className="w-3.5 h-3.5 text-slate-500" />
                  <span>Model: <strong className="text-slate-200">{activeCustomer.carModel}</strong></span>
                </span>
                <span className="text-slate-700">•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Birinchi tashrif: <strong className="text-slate-200">{new Date(activeCustomer.firstVisitDate).toLocaleDateString('uz-UZ')}</strong></span>
                </span>
                <span className="text-slate-700">•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Oxirgi tashrif: <strong className="text-white">{new Date(activeCustomer.lastVisitDate).toLocaleDateString('uz-UZ')}</strong></span>
                </span>
              </div>
            </div>

            {/* Quick All-time summary chips */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0">
              <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Jami Tashriflar</span>
                <span className="text-base sm:text-lg font-mono font-black text-blue-400">{activeCustomer.totalVisits} marta</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Butun Davrda Sarflangan</span>
                <span className="text-base sm:text-lg font-mono font-black text-emerald-400">
                  {activeCustomer.allTimeSpent.toLocaleString('uz-UZ')} UZS
                </span>
              </div>
            </div>
          </div>

          {/* Period Filter Toolbar */}
          <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white">Tahlil Davrini Tanlang:</span>
              </div>

              {/* Period Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'Barchasi (Butun davr)' },
                  { id: 'today', label: 'Bugun' },
                  { id: 'this_week', label: 'Oxirgi 7 kun' },
                  { id: 'this_month', label: 'Shu oy' },
                  { id: 'this_year', label: 'Shu yil' },
                  { id: 'custom', label: 'Ixtiyoriy sana' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setCustomerPeriod(p.id as CrmDatePeriod)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      customerPeriod === p.id
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Inputs */}
            {customerPeriod === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Boshlanish:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Tugash:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                {(customStartDate || customEndDate) && (
                  <button
                    onClick={() => {
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Tozalash
                  </button>
                )}
              </div>
            )}
          </div>

          {/* KPI METRIC CARDS for Selected Period */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* 1. Tashriflar soni */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold">Tashriflar Soni</span>
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black font-mono text-white">
                {activeCustomerPeriodMetrics.visitsCount} <span className="text-xs font-normal text-slate-400">marta</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Jami butun davrda: {activeCustomer.totalVisits} marta
              </p>
            </div>

            {/* 2. Jami Ishlatgan Puli */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold">Jami Sarflangan Pul</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400">
                {activeCustomerPeriodMetrics.periodSpent.toLocaleString('uz-UZ')} <span className="text-xs font-normal text-slate-400">UZS</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Barcha vaqtlarda: {activeCustomer.allTimeSpent.toLocaleString('uz-UZ')} UZS
              </p>
            </div>

            {/* 3. Eng ko'p quygan moyi */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold">Eng Ko'p Quygan Moyi</span>
                <Droplet className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-sm font-black text-amber-300 truncate" title={activeCustomerPeriodMetrics.topOilName}>
                {activeCustomerPeriodMetrics.topOilName}
              </div>
              <p className="text-[11px] text-slate-400">
                {activeCustomerPeriodMetrics.topOilCount > 0 ? (
                  <>
                    <strong className="text-amber-400">{activeCustomerPeriodMetrics.topOilCount} marta</strong> quyilgan
                  </>
                ) : (
                  'Moy quyilmagan'
                )}
              </p>
            </div>

            {/* 4. Eng ko'p olgan zapchasti */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold">Eng Ko'p Olgan Zapchasti</span>
                <Wrench className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-sm font-black text-indigo-300 truncate" title={activeCustomerPeriodMetrics.topPartName}>
                {activeCustomerPeriodMetrics.topPartName}
              </div>
              <p className="text-[11px] text-slate-400">
                {activeCustomerPeriodMetrics.topPartCount > 0 ? (
                  <>
                    <strong className="text-indigo-400">{activeCustomerPeriodMetrics.topPartCount} marta</strong> olingan
                  </>
                ) : (
                  'Zapchast olinmagan'
                )}
              </p>
            </div>
          </div>

          {/* MONEY BREAKDOWN: Moyga, Zapchastga, Ish haqiga ALOHIDA */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Tanlangan Davrda Sarflangan Mablag'lar Bo'linmasi (Alohida):</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Moyga */}
              <div className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-300 font-bold flex items-center gap-1">
                    <Droplet className="w-3.5 h-3.5 text-amber-400" />
                    <span>Moyga Sarflangan:</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {activeCustomerPeriodMetrics.periodSpent > 0
                      ? `${Math.round((activeCustomerPeriodMetrics.periodOilSpent / activeCustomerPeriodMetrics.periodSpent) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="text-lg font-black font-mono text-amber-400">
                  {activeCustomerPeriodMetrics.periodOilSpent.toLocaleString('uz-UZ')} <span className="text-xs text-slate-400 font-normal">UZS</span>
                </div>
              </div>

              {/* Zapchastga */}
              <div className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-indigo-300 font-bold flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Zapchastlarga Sarflangan:</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {activeCustomerPeriodMetrics.periodSpent > 0
                      ? `${Math.round((activeCustomerPeriodMetrics.periodPartsSpent / activeCustomerPeriodMetrics.periodSpent) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="text-lg font-black font-mono text-indigo-400">
                  {activeCustomerPeriodMetrics.periodPartsSpent.toLocaleString('uz-UZ')} <span className="text-xs text-slate-400 font-normal">UZS</span>
                </div>
              </div>

              {/* Xizmat haqiga */}
              <div className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-300 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Xizmat Haqiga (Ish haqi):</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {activeCustomerPeriodMetrics.periodSpent > 0
                      ? `${Math.round((activeCustomerPeriodMetrics.periodLaborSpent / activeCustomerPeriodMetrics.periodSpent) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="text-lg font-black font-mono text-blue-400">
                  {activeCustomerPeriodMetrics.periodLaborSpent.toLocaleString('uz-UZ')} <span className="text-xs text-slate-400 font-normal">UZS</span>
                </div>
              </div>
            </div>
          </div>

          {/* DRILL-DOWN FILTERS: MOY BRENDLARI VA ZAPCHASTLAR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Moy Brendlari bo'yicha filter */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white">Moy Brendlari Bo'yicha Tanlash:</h4>
                </div>
                {selectedOilBrandFilter !== 'all' && (
                  <button
                    onClick={() => setSelectedOilBrandFilter('all')}
                    className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                  >
                    Barchasini ko'rsatish
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedOilBrandFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedOilBrandFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Barcha Moylar ({activeCustomer.records.length})
                </button>
                {activeCustomerOilBrands.map((b) => (
                  <button
                    key={b}
                    onClick={() => setSelectedOilBrandFilter(b)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedOilBrandFilter === b
                        ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                        : 'bg-slate-900 text-amber-300/80 hover:text-amber-200 border border-slate-800'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>

              {selectedOilBrandFilter !== 'all' && (
                <div className="text-[11px] text-amber-300/90 bg-amber-950/40 p-2.5 rounded-xl border border-amber-900/50">
                  Faqat <strong className="text-amber-200">{selectedOilBrandFilter}</strong> brendi bo'yicha
                  xizmatlar va sarflangan mablag'lar ko'rsatilmoqda.
                </div>
              )}
            </div>

            {/* Zapchastlar bo'yicha filter */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white">Zapchastlar Bo'yicha Tanlash:</h4>
                </div>
                {selectedPartFilter !== 'all' && (
                  <button
                    onClick={() => setSelectedPartFilter('all')}
                    className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
                  >
                    Barchasini ko'rsatish
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                <button
                  onClick={() => setSelectedPartFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedPartFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-md font-extrabold'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Barcha Zapchastlar
                </button>
                {activeCustomerPartsList.map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPartFilter(p)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedPartFilter === p
                        ? 'bg-indigo-600 text-white shadow-md font-extrabold'
                        : 'bg-slate-900 text-indigo-300/80 hover:text-indigo-200 border border-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {selectedPartFilter !== 'all' && (
                <div className="text-[11px] text-indigo-300/90 bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-900/50">
                  Faqat <strong className="text-indigo-200">{selectedPartFilter}</strong> zapchasti bo'yicha
                  xizmatlar ko'rsatilmoqda.
                </div>
              )}
            </div>
          </div>

          {/* CUSTOMER VISIT HISTORY TABLE (Filtered) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <span>Filtrlangan Tashriflar Tarixi</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 text-xs font-mono font-bold">
                  {activeCustomerFilteredRecords.length} ta tashrif
                </span>
              </h3>
            </div>

            {activeCustomerFilteredRecords.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                Tanlangan davr va filtrlar bo'yicha xizmat yozuvlari topilmadi.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 shadow-xl bg-slate-950">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                      <th className="py-3 px-3 w-10 text-center">№</th>
                      <th className="py-3 px-3">Sana & Vaqt</th>
                      <th className="py-3 px-3">Masofa (Km)</th>
                      <th className="py-3 px-3">Almashtirilgan Moy</th>
                      <th className="py-3 px-3">Moy Narxi</th>
                      <th className="py-3 px-3">Almashtirilgan Zapchast</th>
                      <th className="py-3 px-3">Zapchast Narxi</th>
                      <th className="py-3 px-3">Xizmat Haqi</th>
                      <th className="py-3 px-3">Jami Summa</th>
                      <th className="py-3 px-3 text-center">Holat</th>
                      <th className="py-3 px-3 text-center">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {activeCustomerFilteredRecords.map((r, idx) => {
                      const { oilStr, partsStr, oilCost, partsCost, laborCost, totalCost } = extractRecordDetails(r);
                      return (
                        <tr key={r.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-3 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                            {new Date(r.createdAt).toLocaleDateString('uz-UZ')}
                            <span className="text-[10px] text-slate-500 block">
                              {new Date(r.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-white whitespace-nowrap">
                            {r.mileageKm ? `${Number(r.mileageKm).toLocaleString('uz-UZ')} km` : '—'}
                          </td>
                          <td className="py-3 px-3 text-amber-300 font-semibold max-w-[180px] truncate" title={oilStr}>
                            {oilStr}
                          </td>
                          <td className="py-3 px-3 font-mono text-amber-400 font-bold whitespace-nowrap">
                            {oilCost > 0 ? `${oilCost.toLocaleString('uz-UZ')} UZS` : '—'}
                          </td>
                          <td className="py-3 px-3 text-indigo-300 font-semibold max-w-[200px] truncate" title={partsStr}>
                            {partsStr}
                          </td>
                          <td className="py-3 px-3 font-mono text-indigo-400 font-bold whitespace-nowrap">
                            {partsCost > 0 ? `${partsCost.toLocaleString('uz-UZ')} UZS` : '—'}
                          </td>
                          <td className="py-3 px-3 font-mono text-blue-400 font-bold whitespace-nowrap">
                            {laborCost > 0 ? `${laborCost.toLocaleString('uz-UZ')} UZS` : '—'}
                          </td>
                          <td className="py-3 px-3 font-mono text-emerald-400 font-extrabold whitespace-nowrap">
                            {totalCost.toLocaleString('uz-UZ')} UZS
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.status === 'bajarildi'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : r.status === 'jarayonda'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {r.status === 'bajarildi' ? 'Bajarildi' : r.status === 'jarayonda' ? 'Jarayonda' : 'Kutilmoqda'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => onPrintRecord(r)}
                                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg cursor-pointer"
                                title="Chek chop etish"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onEditRecord(r)}
                                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-blue-400 hover:text-blue-300 rounded-lg cursor-pointer"
                                title="Tahrirlash"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900/90 text-white font-extrabold border-t-2 border-slate-700">
                      <td colSpan={4} className="py-3 px-3 text-slate-400 text-right">
                        Jadvaldagi Jami Xarajatlar:
                      </td>
                      <td className="py-3 px-3 font-mono text-amber-400">
                        {activeCustomerPeriodMetrics.periodOilSpent.toLocaleString('uz-UZ')} UZS
                      </td>
                      <td className="py-3 px-3"></td>
                      <td className="py-3 px-3 font-mono text-indigo-400">
                        {activeCustomerPeriodMetrics.periodPartsSpent.toLocaleString('uz-UZ')} UZS
                      </td>
                      <td className="py-3 px-3 font-mono text-blue-400">
                        {activeCustomerPeriodMetrics.periodLaborSpent.toLocaleString('uz-UZ')} UZS
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-400 font-black">
                        {activeCustomerPeriodMetrics.periodSpent.toLocaleString('uz-UZ')} UZS
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* MAIN CRM: UNIQUE CUSTOMERS DIRECTORY TABLE                                */
        /* ========================================================================= */
        <div className="space-y-4 animate-fadeIn">
          {/* Top Banner & Quick Metrics */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600/20 text-blue-400 text-[11px] sm:text-xs font-bold border border-blue-500/30 flex items-center gap-1.5 shrink-0">
                    <Users className="w-3.5 h-3.5" />
                    <span>Mijozlar CRM Markazi</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold shrink-0">
                    Qayta takrorlanmas yagona ro'yxat
                  </span>
                </div>
                <h2 className="text-base sm:text-xl md:text-2xl font-black text-white mt-1.5 tracking-tight">
                  Yagona Mijozlar Bazasi (Xizmatlarsiz Toza Ro'yxat)
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Har bir mijoz 1 qatorda • Ismi, telefoni, mashina raqami, tashriflar soni va shaxsiy sarf-xarajati
                </p>
              </div>

              {/* Action: Export to Excel */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={handleExportAllCustomersExcel}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                  title="Barcha mijozlar bazasini Excel (.xlsx) formatida yuklab olish"
                >
                  <Download className="w-4 h-4" />
                  <span>Mijozlar Ro'yxati (.xlsx) Yuklash</span>
                </button>
              </div>
            </div>

            {/* Quick Stat Chips */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
              <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3 sm:p-3.5">
                <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium truncate">Jami Yagona Mijozlar:</span>
                <span className="text-lg sm:text-xl font-mono font-black text-white">
                  {uniqueCustomersList.length} <span className="text-xs text-slate-500 font-normal">ta</span>
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3 sm:p-3.5">
                <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium truncate">Jami Sarflangan Mablag':</span>
                <span className="text-base sm:text-xl font-mono font-black text-emerald-400 truncate block">
                  {uniqueCustomersList.reduce((sum, c) => sum + c.allTimeSpent, 0).toLocaleString('uz-UZ')} <span className="text-[10px] sm:text-xs text-slate-400 font-normal">UZS</span>
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3 sm:p-3.5">
                <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium truncate">O'rtacha Tashrif Soni:</span>
                <span className="text-lg sm:text-xl font-mono font-black text-blue-400">
                  {uniqueCustomersList.length > 0
                    ? (records.length / uniqueCustomersList.length).toFixed(1)
                    : 0} <span className="text-xs text-slate-500 font-normal">marta</span>
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3 sm:p-3.5">
                <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium truncate">Moy Quydirganlar:</span>
                <span className="text-lg sm:text-xl font-mono font-black text-amber-400">
                  {uniqueCustomersList.filter((c) => c.topOil !== null).length} <span className="text-xs text-slate-500 font-normal">mijoz</span>
                </span>
              </div>
            </div>
          </div>

          {/* Search Bar and Sorting */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Mijoz ismi, telefon nomeri, davlat raqami yoki mashina modeli bo'yicha tezkor qidirish..."
                className="w-full pl-10 pr-20 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
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

            {/* Sort Selector */}
            <div className="flex items-center gap-2 shrink-0">
              <ArrowUpDown className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 font-semibold">Saralash:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
              >
                <option value="visits_desc">Eng ko'p tashrif (Kamayish)</option>
                <option value="spent_desc">Eng ko'p pul sarflagan</option>
                <option value="date_desc">Oxirgi kelgan sanasi bo'yicha</option>
                <option value="name_asc">Mijoz ismi (A-Z)</option>
              </select>
            </div>
          </div>

          {/* CRM Unique Customers Table */}
          {filteredCustomers.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <p className="text-base font-bold text-white">Mos keladigan mijoz topilmadi</p>
              <p className="text-xs text-slate-400">
                Qidiruv so'rovingizni o'zgartiring yoki yangi mijoz xizmatini qo'shing.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 shadow-xl bg-slate-900">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-3 w-10 text-center">№</th>
                    <th className="py-3.5 px-3">Mijoz Ismi</th>
                    <th className="py-3.5 px-3">Telefon Nomer</th>
                    <th className="py-3.5 px-3">Mashina Raqami</th>
                    <th className="py-3.5 px-3">Modeli</th>
                    <th className="py-3.5 px-3 text-center">Tashriflar</th>
                    <th className="py-3.5 px-3">Eng Ko'p Quygan Moyi</th>
                    <th className="py-3.5 px-3">Eng Ko'p Olgan Zapchasti</th>
                    <th className="py-3.5 px-3 text-right">Jami Sarflagan Puli</th>
                    <th className="py-3.5 px-3 text-center">Oxirgi Tashrif</th>
                    <th className="py-3.5 px-3 text-center">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {filteredCustomers.map((c, idx) => (
                    <tr
                      key={c.key}
                      onClick={() => setSelectedCustomerKey(c.key)}
                      className="hover:bg-slate-800/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-3 font-extrabold text-white group-hover:text-blue-300">
                        {c.customerName}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                        <a
                          href={`tel:${c.phoneNumber.replace(/\s+/g, '')}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline text-blue-400"
                        >
                          {c.phoneNumber}
                        </a>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-950 text-blue-400 font-mono font-extrabold text-xs border border-slate-800">
                          {c.plate}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                        {c.carModel}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full bg-blue-950 text-blue-300 font-mono font-black text-xs border border-blue-800">
                          {c.totalVisits} marta
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-[160px] truncate" title={c.topOil ? `${c.topOil.name} (${c.topOil.count} marta)` : '—'}>
                        {c.topOil ? (
                          <span className="text-amber-300 font-semibold flex items-center gap-1">
                            <Droplet className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">{c.topOil.name}</span>
                            <span className="text-[10px] text-amber-400/80 font-mono">({c.topOil.count}x)</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 max-w-[170px] truncate" title={c.topPart ? `${c.topPart.name} (${c.topPart.count} marta)` : '—'}>
                        {c.topPart ? (
                          <span className="text-indigo-300 font-semibold flex items-center gap-1">
                            <Wrench className="w-3 h-3 text-indigo-400 shrink-0" />
                            <span className="truncate">{c.topPart.name}</span>
                            <span className="text-[10px] text-indigo-400/80 font-mono">({c.topPart.count}x)</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-emerald-400 text-right whitespace-nowrap">
                        {c.allTimeSpent.toLocaleString('uz-UZ')} UZS
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400 whitespace-nowrap">
                        {new Date(c.lastVisitDate).toLocaleDateString('uz-UZ')}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedCustomerKey(c.key)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-bold transition-all border border-blue-500/30 flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <span>Tahlil 📊</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950 text-white font-extrabold border-t-2 border-slate-700">
                    <td colSpan={5} className="py-3.5 px-4 text-slate-400 uppercase font-bold">
                      Jami {filteredCustomers.length} ta yagona mijoz
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-blue-400 font-black">
                      {filteredCustomers.reduce((sum, c) => sum + c.totalVisits, 0)} marta
                    </td>
                    <td colSpan={2}></td>
                    <td className="py-3.5 px-3 text-right font-mono text-emerald-400 font-black">
                      {filteredCustomers.reduce((sum, c) => sum + c.allTimeSpent, 0).toLocaleString('uz-UZ')} UZS
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Quick Customer Info Edit Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white">Mijoz Anketasini Tahrirlash</h3>
              <button
                onClick={() => setEditingCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerInfo} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Mijoz Ismi:</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.customerName}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, customerName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Telefon Raqami:</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.phoneNumber}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phoneNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Mashina Davlat Raqami:</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.carPlate}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, carPlate: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-blue-400 font-bold focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Mashina Modeli / Rusumi:</label>
                <input
                  type="text"
                  value={editingCustomer.carModel}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, carModel: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Bekor Qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20"
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
