import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Car,
  Droplet,
  Wrench,
  Users,
  BarChart3,
  PieChart,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Award,
  Activity,
  ArrowUpRight,
  Layers,
  Percent,
  CheckCircle2,
  Calendar,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { ServiceRecord } from '../types';

export interface ActiveFilterBadge {
  label: string;
  value: string;
  color?: 'purple' | 'amber' | 'blue' | 'emerald' | 'rose' | 'slate';
}

interface BusinessAnalyticsDashboardProps {
  records: ServiceRecord[];
  allRecordsCount?: number;
  title?: string;
  defaultExpanded?: boolean;
  activeFilters?: ActiveFilterBadge[];
}

export const BusinessAnalyticsDashboard: React.FC<BusinessAnalyticsDashboardProps> = ({
  records,
  allRecordsCount = 0,
  title = "Biznes Tahlil va Asosiy Ko'rsatkichlar (Dashboard)",
  defaultExpanded = true,
  activeFilters = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [revenueDisplayMode, setRevenueDisplayMode] = useState<'total' | 'pure_oil' | 'pure_parts'>('total');

  // Total records across database for relative comparison
  const totalDbCount = allRecordsCount > 0 ? allRecordsCount : records.length;
  const filteredRatioPct = totalDbCount > 0 ? Math.round((records.length / totalDbCount) * 100) : 100;

  // Core calculations based strictly on the currently filtered records
  const stats = useMemo(() => {
    const totalRecords = records.length;
    if (totalRecords === 0) {
      return {
        totalRevenue: 0,
        pureOilRevenue: 0,
        purePartsRevenue: 0,
        mixedRevenue: 0,
        deductedParts: 0,
        deductedOil: 0,
        avgTicket: 0,
        avgTicketOil: 0,
        avgTicketParts: 0,
        totalServices: 0,
        uniqueCars: 0,
        uniqueCustomers: 0,
        oilServicesCount: 0,
        partsServicesCount: 0,
        bothServicesCount: 0,
        oilOnlyCount: 0,
        partsOnlyCount: 0,
        oilPct: 0,
        partsPct: 0,
        bothPct: 0,
        repeatCustomersCount: 0,
        repeatCustomersPct: 0,
        topOils: [],
        topParts: [],
        topCarModels: [],
        dailyTrend: [],
        topSpenders: [],
        maxDay: null,
      };
    }

    let totalRevenue = 0;
    let pureOilRevenue = 0;
    let purePartsRevenue = 0;
    let mixedRevenue = 0;
    let deductedParts = 0;
    let deductedOil = 0;

    let recordsWithCostCount = 0;
    let oilRecordsWithCostCount = 0;
    let partsRecordsWithCostCount = 0;

    const carPlatesMap = new Map<string, number>();
    const customerMap = new Map<string, { name: string; plate: string; count: number; spent: number }>();
    const oilsMap = new Map<string, number>();
    const partsMap = new Map<string, number>();
    const carModelsMap = new Map<string, number>();
    const dailyMap = new Map<string, { count: number; revenue: number }>();

    let oilServicesCount = 0;
    let partsServicesCount = 0;
    let bothServicesCount = 0;
    let oilOnlyCount = 0;
    let partsOnlyCount = 0;

    records.forEach((rec) => {
      // Cost
      const cost = typeof rec.costUzs === 'number' 
        ? rec.costUzs 
        : parseFloat(String(rec.costUzs || '0').replace(/[^0-9.]/g, '')) || 0;
      
      const hasOil = Boolean(rec.replacedOil && rec.replacedOil.trim());
      const hasParts = Boolean(
        (rec.replacedParts && rec.replacedParts.trim()) ||
        (rec.partsToReplace && rec.partsToReplace.trim())
      );

      // Explicit cost splits if defined
      const explicitOilCost = rec.oilCostUzs !== undefined && rec.oilCostUzs !== '' 
        ? Number(rec.oilCostUzs) 
        : undefined;
      const explicitPartsCost = rec.partsCostUzs !== undefined && rec.partsCostUzs !== '' 
        ? Number(rec.partsCostUzs) 
        : undefined;

      if (cost > 0) {
        totalRevenue += cost;
        recordsWithCostCount++;

        if (hasOil && !hasParts) {
          // Pure oil
          pureOilRevenue += cost;
          oilRecordsWithCostCount++;
        } else if (!hasOil && hasParts) {
          // Pure parts
          purePartsRevenue += cost;
          partsRecordsWithCostCount++;
        } else if (hasOil && hasParts) {
          // Mixed service (both oil and parts)
          mixedRevenue += cost;
          
          let oilShare = 0;
          let partsShare = 0;

          if (explicitOilCost !== undefined && explicitPartsCost !== undefined) {
            oilShare = explicitOilCost;
            partsShare = explicitPartsCost;
          } else if (explicitOilCost !== undefined) {
            oilShare = explicitOilCost;
            partsShare = Math.max(0, cost - explicitOilCost);
          } else if (explicitPartsCost !== undefined) {
            partsShare = explicitPartsCost;
            oilShare = Math.max(0, cost - explicitPartsCost);
          } else {
            // Standard estimation: 60% oil, 40% parts
            oilShare = Math.round(cost * 0.6);
            partsShare = cost - oilShare;
          }

          pureOilRevenue += oilShare;
          purePartsRevenue += partsShare;
          deductedParts += partsShare;
          deductedOil += oilShare;

          if (oilShare > 0) oilRecordsWithCostCount++;
          if (partsShare > 0) partsRecordsWithCostCount++;
        }
      }

      // Unique cars & customers
      const plate = (rec.carPlate || 'NOMA\'LUM').trim().toUpperCase();
      carPlatesMap.set(plate, (carPlatesMap.get(plate) || 0) + 1);

      const custKey = rec.phoneNumber ? rec.phoneNumber.trim() : plate;
      const existingCust = customerMap.get(custKey) || {
        name: rec.customerName || 'Mijoz',
        plate,
        count: 0,
        spent: 0,
      };
      existingCust.count += 1;
      existingCust.spent += cost;
      customerMap.set(custKey, existingCust);

      // Service types counts
      if (hasOil) oilServicesCount++;
      if (hasParts) partsServicesCount++;
      if (hasOil && hasParts) bothServicesCount++;
      if (hasOil && !hasParts) oilOnlyCount++;
      if (!hasOil && hasParts) partsOnlyCount++;

      // Oils breakdown
      if (rec.replacedOil && rec.replacedOil.trim()) {
        const oilTokens = rec.replacedOil
          .split(/[,;\n+]/)
          .map((s) => s.trim())
          .filter(Boolean);
        
        if (oilTokens.length > 0) {
          oilTokens.forEach((token) => {
            oilsMap.set(token, (oilsMap.get(token) || 0) + 1);
          });
        } else {
          const raw = rec.replacedOil.trim();
          oilsMap.set(raw, (oilsMap.get(raw) || 0) + 1);
        }
      }

      // Parts breakdown
      const partsString = `${rec.replacedParts || ''} ${rec.partsToReplace || ''}`.trim();
      if (partsString) {
        const partTokens = partsString
          .split(/[,;\n+]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 1);

        partTokens.forEach((token) => {
          partsMap.set(token, (partsMap.get(token) || 0) + 1);
        });
      }

      // Car models breakdown
      const carModel = (rec.carModel || 'Boshqa').trim();
      if (carModel) {
        carModelsMap.set(carModel, (carModelsMap.get(carModel) || 0) + 1);
      }

      // Daily trend (by date YYYY-MM-DD)
      if (rec.createdAt) {
        const dateKey = rec.createdAt.slice(0, 10);
        const dayStat = dailyMap.get(dateKey) || { count: 0, revenue: 0 };
        dayStat.count += 1;
        dayStat.revenue += cost;
        dailyMap.set(dateKey, dayStat);
      }
    });

    const uniqueCars = carPlatesMap.size;
    const uniqueCustomers = customerMap.size;

    // Repeat customers (visited > 1 time)
    let repeatCust = 0;
    customerMap.forEach((c) => {
      if (c.count > 1) repeatCust++;
    });

    const avgTicket = recordsWithCostCount > 0 ? Math.round(totalRevenue / recordsWithCostCount) : 0;
    const avgTicketOil = oilRecordsWithCostCount > 0 ? Math.round(pureOilRevenue / oilRecordsWithCostCount) : 0;
    const avgTicketParts = partsRecordsWithCostCount > 0 ? Math.round(purePartsRevenue / partsRecordsWithCostCount) : 0;

    const oilPct = totalRecords > 0 ? Math.round((oilServicesCount / totalRecords) * 100) : 0;
    const partsPct = totalRecords > 0 ? Math.round((partsServicesCount / totalRecords) * 100) : 0;
    const bothPct = totalRecords > 0 ? Math.round((bothServicesCount / totalRecords) * 100) : 0;
    const repeatCustomersPct = uniqueCustomers > 0 ? Math.round((repeatCust / uniqueCustomers) * 100) : 0;

    // Top Oils sorted
    const topOils = Array.from(oilsMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / totalRecords) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Top Parts sorted
    const topParts = Array.from(partsMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / totalRecords) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Top Car Models sorted
    const topCarModels = Array.from(carModelsMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / totalRecords) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Top 5 Customers by spent
    const topSpenders = Array.from(customerMap.values())
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);

    // Daily trend (sorted chronologically)
    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10);

    // Find most active day in this filtered slice
    let maxDay: { date: string; count: number; revenue: number } | null = null;
    dailyMap.forEach((data, date) => {
      if (!maxDay || data.count > maxDay.count) {
        maxDay = { date, count: data.count, revenue: data.revenue };
      }
    });

    return {
      totalRevenue,
      pureOilRevenue,
      purePartsRevenue,
      mixedRevenue,
      deductedParts,
      deductedOil,
      avgTicket,
      avgTicketOil,
      avgTicketParts,
      totalServices: totalRecords,
      uniqueCars,
      uniqueCustomers,
      oilServicesCount,
      partsServicesCount,
      bothServicesCount,
      oilOnlyCount,
      partsOnlyCount,
      oilPct,
      partsPct,
      bothPct,
      repeatCustomersCount: repeatCust,
      repeatCustomersPct,
      topOils,
      topParts,
      topCarModels,
      dailyTrend,
      topSpenders,
      maxDay,
    };
  }, [records]);

  if (records.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center text-slate-400 text-xs space-y-2">
        <div className="flex items-center justify-center gap-2 text-slate-300 font-bold">
          <Filter className="w-4 h-4 text-purple-400" />
          <span>Tanlangan filtrlar bo'yicha tahliliy ma'lumotlar topilmadi</span>
        </div>
        <p className="text-[11px] text-slate-500">
          Filtr parametrlarini o'zgartirib yoki tozalab qayta urinib ko'ring.
        </p>
      </div>
    );
  }

  const badgeColorClasses = {
    purple: 'bg-purple-950/60 text-purple-300 border-purple-700/50',
    amber: 'bg-amber-950/60 text-amber-300 border-amber-700/50',
    blue: 'bg-blue-950/60 text-blue-300 border-blue-700/50',
    emerald: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50',
    rose: 'bg-rose-950/60 text-rose-300 border-rose-700/50',
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-purple-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 transition-all">
      {/* Dashboard Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-purple-600/30 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
                {title}
              </h3>
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Jonli Tahlil</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tanlangan filtrlar bo'yicha: <strong className="text-purple-300 font-mono">{stats.totalServices} ta</strong> xizmat ({filteredRatioPct}% jami bazadan), <strong className="text-blue-300 font-mono">{stats.uniqueCars} ta</strong> avto
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 text-purple-400" />
                <span>Yig'ish</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 text-purple-400" />
                <span>Tahlilni Ko'rish</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Filter Badges Bar (Shows user exactly which filters are shaping this dashboard) */}
      {activeFilters.length > 0 && (
        <div className="p-2.5 bg-slate-950/70 border border-purple-900/40 rounded-xl flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[11px] mr-1">
            <Filter className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Aktiv Filtrlar:</span>
          </div>
          {activeFilters.map((badge, idx) => {
            const colorClass = badgeColorClasses[badge.color || 'purple'];
            return (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${colorClass}`}
              >
                <span className="opacity-70">{badge.label}:</span>
                <span className="font-bold">{badge.value}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Main Collapsible Dashboard Content */}
      {isExpanded && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Revenue Isolation & Deduction Mode Selector (Sof Tushum Rejimi) */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Tushum Tahlili Rejimi:</span>
              </span>
              <span className="text-[11px] text-slate-500">
                (Aralash xizmatlardan ikkinchi qismni avtomatik ajratib hisoblash)
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setRevenueDisplayMode('total')}
                className={`px-3 py-1 rounded-md font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  revenueDisplayMode === 'total'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>🌟 Jami Tushum</span>
                <span className="opacity-80 text-[10px]">({stats.totalRevenue.toLocaleString()})</span>
              </button>

              <button
                type="button"
                onClick={() => setRevenueDisplayMode('pure_oil')}
                className={`px-3 py-1 rounded-md font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  revenueDisplayMode === 'pure_oil'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Aralash xizmatlardan zapchast summasini olib tashlab, faqat sof moy tushumini hisoblaydi"
              >
                <Droplet className="w-3 h-3 text-amber-300" />
                <span>🛢️ Sof Moy Tushumi</span>
                <span className="opacity-80 text-[10px]">({stats.pureOilRevenue.toLocaleString()})</span>
              </button>

              <button
                type="button"
                onClick={() => setRevenueDisplayMode('pure_parts')}
                className={`px-3 py-1 rounded-md font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  revenueDisplayMode === 'pure_parts'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Aralash xizmatlardan moy summasini olib tashlab, faqat sof zapchast tushumini hisoblaydi"
              >
                <Wrench className="w-3 h-3 text-blue-300" />
                <span>🔧 Sof Zapchast Tushumi</span>
                <span className="opacity-80 text-[10px]">({stats.purePartsRevenue.toLocaleString()})</span>
              </button>
            </div>
          </div>

          {/* 5 Main Key KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Tushum Card (Adaptive based on revenueDisplayMode) */}
            <div className={`p-3.5 bg-slate-950/80 rounded-xl border shadow-sm relative overflow-hidden group transition-all ${
              revenueDisplayMode === 'pure_oil' 
                ? 'border-amber-500/50 hover:border-amber-500' 
                : revenueDisplayMode === 'pure_parts'
                ? 'border-blue-500/50 hover:border-blue-500'
                : 'border-emerald-500/30 hover:border-emerald-500/60'
            }`}>
              <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-xl -mr-6 -mt-6 ${
                revenueDisplayMode === 'pure_oil' ? 'bg-amber-500/10' : revenueDisplayMode === 'pure_parts' ? 'bg-blue-500/10' : 'bg-emerald-500/10'
              }`}></div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  revenueDisplayMode === 'pure_oil' ? 'text-amber-400' : revenueDisplayMode === 'pure_parts' ? 'text-blue-400' : 'text-emerald-400'
                }`}>
                  {revenueDisplayMode === 'pure_oil' ? 'Sof Moy Tushumi' : revenueDisplayMode === 'pure_parts' ? 'Sof Zapchast Tushumi' : 'Filtrlangan Tushum'}
                </span>
                <DollarSign className={`w-4 h-4 ${
                  revenueDisplayMode === 'pure_oil' ? 'text-amber-400' : revenueDisplayMode === 'pure_parts' ? 'text-blue-400' : 'text-emerald-400'
                }`} />
              </div>
              <div className="text-base sm:text-lg font-black text-white font-mono truncate">
                {(revenueDisplayMode === 'pure_oil' 
                  ? stats.pureOilRevenue 
                  : revenueDisplayMode === 'pure_parts' 
                  ? stats.purePartsRevenue 
                  : stats.totalRevenue).toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-400">so'm</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400 flex items-center gap-1">
                <span>O'rtacha chek:</span>
                <span className={`font-bold ${
                  revenueDisplayMode === 'pure_oil' ? 'text-amber-300' : revenueDisplayMode === 'pure_parts' ? 'text-blue-300' : 'text-emerald-300'
                }`}>
                  {(revenueDisplayMode === 'pure_oil' 
                    ? stats.avgTicketOil 
                    : revenueDisplayMode === 'pure_parts' 
                    ? stats.avgTicketParts 
                    : stats.avgTicket).toLocaleString()} so'm
                </span>
              </div>
              {revenueDisplayMode === 'pure_oil' && stats.deductedParts > 0 && (
                <div className="mt-1 text-[9px] text-amber-400/80 font-medium">
                  ✂️ Zapchastlar chegirildi: -{stats.deductedParts.toLocaleString()} so'm
                </div>
              )}
              {revenueDisplayMode === 'pure_parts' && stats.deductedOil > 0 && (
                <div className="mt-1 text-[9px] text-blue-400/80 font-medium">
                  ✂️ Moylar chegirildi: -{stats.deductedOil.toLocaleString()} so'm
                </div>
              )}
            </div>

            {/* 2. Xizmatlar & Mashinalar */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-blue-500/30 shadow-sm relative overflow-hidden group hover:border-blue-500/60 transition-all">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl -mr-6 -mt-6"></div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Xizmatlar / Avto</span>
                <Car className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-base sm:text-lg font-black text-white font-mono">
                {stats.totalServices} <span className="text-xs font-normal text-slate-400">ta</span> / {stats.uniqueCars} <span className="text-xs font-normal text-slate-400">avto</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400 flex items-center gap-1">
                <span>Mijozlar:</span>
                <span className="font-bold text-blue-300">{stats.uniqueCustomers} ta</span>
              </div>
            </div>

            {/* 3. Moy Almashtirishlar */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-amber-500/30 shadow-sm relative overflow-hidden group hover:border-amber-500/60 transition-all">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl -mr-6 -mt-6"></div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Moy Almashtirish</span>
                <Droplet className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-base sm:text-lg font-black text-white font-mono">
                {stats.oilServicesCount} <span className="text-xs font-normal text-slate-400">ta</span>
                <span className="ml-1.5 text-xs text-amber-400 font-bold">({stats.oilPct}%)</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400 truncate">
                Top: <span className="font-bold text-amber-300">{stats.topOils[0]?.name || "Kiritilmagan"}</span>
              </div>
            </div>

            {/* 4. Zapchast & Ishlar */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-cyan-500/30 shadow-sm relative overflow-hidden group hover:border-cyan-500/60 transition-all">
              <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl -mr-6 -mt-6"></div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Zapchast & Ishlar</span>
                <Wrench className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-base sm:text-lg font-black text-white font-mono">
                {stats.partsServicesCount} <span className="text-xs font-normal text-slate-400">ta</span>
                <span className="ml-1.5 text-xs text-cyan-400 font-bold">({stats.partsPct}%)</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400 truncate">
                Top: <span className="font-bold text-cyan-300">{stats.topParts[0]?.name || "Kiritilmagan"}</span>
              </div>
            </div>

            {/* 5. Mijozlar Sadoqati */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-purple-500/30 shadow-sm relative overflow-hidden group hover:border-purple-500/60 transition-all col-span-2 sm:col-span-1">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full blur-xl -mr-6 -mt-6"></div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Doimiy Mijozlar</span>
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-base sm:text-lg font-black text-white font-mono">
                {stats.repeatCustomersCount} <span className="text-xs font-normal text-slate-400">ta</span>
                <span className="ml-1.5 text-xs text-purple-400 font-bold">({stats.repeatCustomersPct}%)</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400">
                2+ marta tashrif buyurganlar
              </div>
            </div>
          </div>

          {/* Service Composition & Structure Bar */}
          <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-purple-400" />
                <span>Xizmatlar Strukturasi Taqsimoti (Filtrlangan to'plam bo'yicha)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium font-mono">
                Jami: {stats.totalServices} ta xizmat
              </span>
            </div>

            {/* Multi-segmented visual bar */}
            <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
              <div
                style={{ width: `${stats.oilOnlyCount > 0 ? (stats.oilOnlyCount / stats.totalServices) * 100 : 0}%` }}
                className="bg-amber-500 hover:bg-amber-400 transition-all duration-300"
                title={`Faqat Moy: ${stats.oilOnlyCount} ta (${Math.round((stats.oilOnlyCount / stats.totalServices) * 100)}%)`}
              />
              <div
                style={{ width: `${stats.bothServicesCount > 0 ? (stats.bothServicesCount / stats.totalServices) * 100 : 0}%` }}
                className="bg-emerald-500 hover:bg-emerald-400 transition-all duration-300"
                title={`Moy + Zapchast: ${stats.bothServicesCount} ta (${Math.round((stats.bothServicesCount / stats.totalServices) * 100)}%)`}
              />
              <div
                style={{ width: `${stats.partsOnlyCount > 0 ? (stats.partsOnlyCount / stats.totalServices) * 100 : 0}%` }}
                className="bg-blue-500 hover:bg-blue-400 transition-all duration-300"
                title={`Faqat Zapchast: ${stats.partsOnlyCount} ta (${Math.round((stats.partsOnlyCount / stats.totalServices) * 100)}%)`}
              />
            </div>

            {/* Legends */}
            <div className="flex flex-wrap items-center gap-4 text-[11px] pt-1">
              <div className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                <span>Faqat Moy: <strong>{stats.oilOnlyCount} ta</strong> ({stats.totalServices > 0 ? Math.round((stats.oilOnlyCount / stats.totalServices) * 100) : 0}%)</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span>Moy + Zapchast: <strong>{stats.bothServicesCount} ta</strong> ({stats.totalServices > 0 ? Math.round((stats.bothServicesCount / stats.totalServices) * 100) : 0}%)</span>
              </div>
              <div className="flex items-center gap-1.5 text-blue-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
                <span>Faqat Zapchast: <strong>{stats.partsOnlyCount} ta</strong> ({stats.totalServices > 0 ? Math.round((stats.partsOnlyCount / stats.totalServices) * 100) : 0}%)</span>
              </div>
            </div>
          </div>

          {/* Quick Business Executive Summary (Xulosa) */}
          <div className="p-3.5 bg-purple-950/20 border border-purple-800/50 rounded-xl text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-purple-300 font-bold">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Filtr Bo'yicha Xulosa:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
              <span>
                Yetakchi moy: <strong className="text-amber-300">{stats.topOils[0]?.name || 'Noma\'lum'}</strong>
              </span>
              <span>•</span>
              <span>
                Yetakchi model: <strong className="text-indigo-300">{stats.topCarModels[0]?.name || 'Noma\'lum'}</strong>
              </span>
              <span>•</span>
              <span>
                Doimiy mijozlar ulushi: <strong className="text-emerald-300">{stats.repeatCustomersPct}%</strong>
              </span>
              {stats.maxDay && (
                <>
                  <span>•</span>
                  <span>
                    Eng faol kun: <strong className="text-purple-300">{stats.maxDay.date}</strong> ({stats.maxDay.count} ta)
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

