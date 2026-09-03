import React, { useMemo } from 'react';
import { ServiceRecord } from '../types';
import { getOverdueOilCustomers } from '../lib/oilUtils';
import { Droplet, AlertTriangle } from 'lucide-react';

interface StatsBarProps {
  records: ServiceRecord[];
  onOpenOverdueOilModal?: () => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({ records, onOpenOverdueOilModal }) => {
  // Moy almashtirganiga 30 kundan oshgan noyob mijozlar soni
  const oilOverOneMonthCount = useMemo(() => {
    return getOverdueOilCustomers(records).length;
  }, [records]);

  return (
    <div className="w-full">
      {/* Moy almashtirish vaqti kelganlar tahlil kartasi */}
      <div
        onClick={onOpenOverdueOilModal}
        className="bg-slate-900 border border-amber-500/30 hover:border-amber-500/70 hover:bg-slate-850 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl cursor-pointer transition-all group relative overflow-hidden"
        title="Moy almashtirish vaqti kelgan barcha mijozlar ro'yxatini ko'rish"
      >
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 group-hover:bg-amber-500/30 transition-all shrink-0 shadow-inner">
            <Droplet className="w-7 h-7 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider block">
                Moy Almashtirish Vaqti Kelganlar
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/80 text-[10px] font-bold">
                <AlertTriangle className="w-3 h-3 text-amber-400" /> Tahlil
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-amber-300 font-mono">
                {oilOverOneMonthCount}
              </span>
              <span className="text-sm text-slate-300 font-bold">ta mijoz</span>
              <span className="text-xs text-slate-400 font-normal hidden md:inline ml-2">
                (Belgilangan muddat yoki 30 kundan oshganlar)
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenOverdueOilModal) onOpenOverdueOilModal();
          }}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer group-hover:scale-105"
        >
          <span>Ko'rish 👁️</span>
        </button>
      </div>
    </div>
  );
};


