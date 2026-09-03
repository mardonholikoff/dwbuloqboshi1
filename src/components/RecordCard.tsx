import React from 'react';
import { ServiceRecord } from '../types';
import { User, Phone, Car, Gauge, Wrench, AlertTriangle, Printer, Edit2, Trash2, Calendar, CheckCircle2, Clock } from 'lucide-react';

interface RecordCardProps {
  record: ServiceRecord;
  onEdit: (record: ServiceRecord) => void;
  onDelete: (id: string) => void;
  onPrint: (record: ServiceRecord) => void;
  onSelectCustomer?: (carPlate: string, customerName: string) => void;
  onSyncRecord?: (id: string) => void;
}

export const RecordCard: React.FC<RecordCardProps> = ({
  record,
  onEdit,
  onDelete,
  onPrint,
  onSelectCustomer,
  onSyncRecord,
}) => {
  const getStatusBadge = (status: ServiceRecord['status']) => {
    switch (status) {
      case 'bajarildi':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Bajarildi
          </span>
        );
      case 'jarayonda':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-800">
            <Clock className="w-3.5 h-3.5 animate-spin" /> Jarayonda
          </span>
        );
      case 'kutilmoqda':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" /> Zapchast Kutilmoqda
          </span>
        );
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition-all duration-200 hover:shadow-xl flex flex-col justify-between space-y-4">
      {/* Offline Badge if applicable */}
      {record.isOffline && (
        <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-700 text-amber-200 text-xs flex items-center justify-between gap-2 shadow-sm">
          <span className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Offline kiritilgan yozuv</span>
          </span>
          {onSyncRecord && (
            <button
              onClick={() => onSyncRecord(record.id)}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-all cursor-pointer shadow"
            >
              Sinxronlash 🔄
            </button>
          )}
        </div>
      )}

      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {/* License plate stylized badge - Clickable for history */}
          <button
            onClick={() => onSelectCustomer && onSelectCustomer(record.carPlate, record.customerName)}
            title="Mijoz xizmatlar tarixini ko'rish"
            className="bg-slate-950 border-2 border-slate-700 hover:border-blue-500 px-3 py-1 rounded-lg text-sm font-extrabold font-mono text-white tracking-widest shadow-inner flex items-center gap-1.5 transition-all cursor-pointer group"
          >
            <Car className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="underline underline-offset-2 decoration-blue-500/50">{record.carPlate}</span>
          </button>
          <div>
            <span className="text-sm font-bold text-white block">
              {record.carModel || 'Noma\'lum Model'}
            </span>
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3 text-slate-500" />
              {formatDate(record.createdAt)}
            </span>
          </div>
        </div>

        <div>
          {getStatusBadge(record.status)}
        </div>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
        {/* Customer Name - Clickable for History */}
        <button
          onClick={() => onSelectCustomer && onSelectCustomer(record.carPlate, record.customerName)}
          title="Mijoz tarixini ko'rish"
          className="p-2.5 rounded-xl bg-slate-950/50 hover:bg-slate-950 border border-slate-800/80 hover:border-blue-500/50 flex items-center gap-2.5 text-left transition-all cursor-pointer group"
        >
          <div className="p-2 rounded-lg bg-blue-950/60 text-blue-400 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <User className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[10px] text-slate-400 block font-medium uppercase">Mijoz Ismi (Tarix 📋)</span>
            <span className="font-bold text-white truncate block group-hover:text-blue-300">{record.customerName}</span>
          </div>
        </button>

        {/* Phone Number */}
        <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-950/60 text-indigo-400 shrink-0">
            <Phone className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[10px] text-slate-400 block font-medium uppercase">Telefon Nomer</span>
            <a
              href={`tel:${record.phoneNumber.replace(/\s+/g, '')}`}
              className="font-semibold text-blue-400 hover:underline truncate block"
            >
              {record.phoneNumber}
            </a>
          </div>
        </div>
      </div>

      {/* Mileage display */}
      <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800">
        <span className="text-slate-400 flex items-center gap-1.5 font-medium">
          <Gauge className="w-4 h-4 text-emerald-400" />
          <span>Bosib o'tilgan masofa (Km):</span>
        </span>
        <span className="font-bold text-slate-100 font-mono">
          {record.mileageKm ? `${Number(record.mileageKm).toLocaleString('uz-UZ')} km` : '—'}
        </span>
      </div>

      {/* Replaced Parts (Almashtirgan zapchast) */}
      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 space-y-1">
        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 text-emerald-400" />
          <span>Almashtirilgan Zapchastlar:</span>
        </span>
        <p className="text-xs text-slate-200 leading-relaxed font-medium">
          {record.replacedParts || <span className="text-slate-500 italic">Kiritilmagan</span>}
        </p>
      </div>

      {/* Parts to Replace (Almashtirmoq bo'lgan zapchast) */}
      <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 space-y-1">
        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Almashtirmoq bo'lgan Zapchastlar:</span>
        </span>
        <p className="text-xs text-slate-200 leading-relaxed font-medium">
          {record.partsToReplace || <span className="text-slate-500 italic">Mavjud emas</span>}
        </p>
      </div>

      {/* Footer & Action buttons */}
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
        <div className="text-xs">
          <span className="text-slate-400 block text-[10px]">Xizmat haqi:</span>
          <span className="font-extrabold text-emerald-400 text-sm">
            {record.costUzs ? `${Number(record.costUzs).toLocaleString('uz-UZ')} UZS` : 'Kelishilgan'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPrint(record)}
            title="Chekni chop etish"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(record)}
            title="Tahrirlash"
            className="p-2 rounded-lg bg-slate-800 hover:bg-blue-900/50 text-slate-300 hover:text-blue-300 transition-colors cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(record.id)}
            title="O'chirish"
            className="p-2 rounded-lg bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-red-300 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
