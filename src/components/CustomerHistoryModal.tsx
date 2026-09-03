import React, { useEffect } from 'react';
import { ServiceRecord } from '../types';
import { X, User, Phone, Car, Gauge, Wrench, Calendar, DollarSign, Printer, Plus, Edit2, Clock, CheckCircle2, AlertTriangle, Droplet } from 'lucide-react';
import { createAdminLog } from '../lib/adminSession';

interface CustomerHistoryModalProps {
  customerPlate: string | null;
  customerName?: string;
  records: ServiceRecord[];
  isOpen: boolean;
  onClose: () => void;
  onNewServiceForCustomer: (record: ServiceRecord) => void;
  onEditRecord: (record: ServiceRecord) => void;
  onPrintRecord: (record: ServiceRecord) => void;
  username?: string;
}

export const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  customerPlate,
  customerName,
  records,
  isOpen,
  onClose,
  onNewServiceForCustomer,
  onEditRecord,
  onPrintRecord,
  username = 'daewoobuloqboshi',
}) => {
  useEffect(() => {
    if (isOpen && customerPlate) {
      createAdminLog(
        "Mijoz Tarixi Ko'rildi",
        `Avto raqam: ${customerPlate}${customerName ? `, Ism: ${customerName}` : ''} bo'yicha mijoz xizmatlar tarixi ochildi`,
        username
      );
    }
  }, [isOpen, customerPlate, customerName, username]);

  if (!isOpen || !customerPlate) return null;

  // Filter all records for this car plate or customer name
  const customerRecords = records.filter(
    (r) =>
      r.carPlate.toUpperCase() === customerPlate.toUpperCase() ||
      (customerName && r.customerName.toLowerCase() === customerName.toLowerCase())
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const latestRecord = customerRecords[0];
  if (!latestRecord) return null;

  // Stats for this customer
  const totalSpent = customerRecords.reduce((sum, r) => sum + (Number(r.costUzs) || 0), 0);
  const totalVisits = customerRecords.length;
  const oilRecords = customerRecords.filter((r) => {
    const text = `${r.replacedParts} ${r.partsToReplace} ${r.notes || ''}`.toLowerCase();
    return text.includes('moy') || text.includes('oil') || text.includes('yog');
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header Bar */}
        <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-600/20 text-blue-400 font-mono text-xs font-bold border border-blue-500/30">
                {latestRecord.carPlate}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-medium">
                {latestRecord.carModel}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 pt-1">
              <User className="w-5 h-5 text-blue-400" />
              <span>{latestRecord.customerName}</span>
            </h2>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <a
                href={`tel:${latestRecord.phoneNumber.replace(/\s+/g, '')}`}
                className="flex items-center gap-1.5 text-blue-400 hover:underline font-mono font-semibold"
              >
                <Phone className="w-3.5 h-3.5" />
                {latestRecord.phoneNumber}
              </a>
              <span className="text-slate-600">•</span>
              <span>Jami servislar: <strong className="text-white">{totalVisits} ta</strong></span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Stats Cards */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Stat 1: Total Spent */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Jami Xarajat</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  {totalSpent.toLocaleString('uz-UZ')} so'm
                </span>
              </div>
            </div>

            {/* Stat 2: Latest Mileage */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 font-bold">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Oxirgi Kilometraj</span>
                <span className="text-sm font-bold text-white font-mono">
                  {latestRecord.mileageKm ? `${Number(latestRecord.mileageKm).toLocaleString('uz-UZ')} km` : '—'}
                </span>
              </div>
            </div>

            {/* Stat 3: Oil changes count */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 font-bold">
                <Droplet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Moy Servislari</span>
                <span className="text-sm font-bold text-amber-300 font-mono">
                  {oilRecords.length} marta
                </span>
              </div>
            </div>
          </div>

          {/* New Service Button for this Customer */}
          <div className="flex items-center justify-between p-4 bg-blue-950/40 border border-blue-800/60 rounded-2xl">
            <div className="flex items-center gap-2 text-xs text-blue-200">
              <Wrench className="w-4 h-4 text-blue-400" />
              <span>Shu mijoz ({latestRecord.carPlate}) uchun yangi xizmat qo'shish:</span>
            </div>
            <button
              onClick={() => onNewServiceForCustomer(latestRecord)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi Xizmat Qo'shish</span>
            </button>
          </div>

          {/* Service History Timeline */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Mijozning Barcha Servis Tarixi ({customerRecords.length})</span>
            </h3>

            <div className="space-y-3">
              {customerRecords.map((rec, index) => {
                const dateStr = new Date(rec.createdAt).toLocaleDateString('uz-UZ', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={rec.id}
                    className="p-4 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all space-y-3 relative group"
                  >
                    {/* Top Row: Date & Status */}
                    <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span className="font-medium text-slate-300">{dateStr}</span>
                        {index === 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-bold">
                            Eng so'nggi
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            rec.status === 'bajarildi'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : rec.status === 'jarayonda'
                              ? 'bg-blue-950 text-blue-300 border-blue-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}
                        >
                          {rec.status === 'bajarildi'
                            ? 'Bajarildi'
                            : rec.status === 'jarayonda'
                            ? 'Jarayonda'
                            : 'Zapchast Kutilmoqda'}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onPrintRecord(rec)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Chek chiqarish"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditRecord(rec)}
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-300 hover:bg-blue-900/40"
                            title="Tahrirlash"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Middle Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-0.5">Yurgan masofasi:</span>
                        <span className="font-mono font-bold text-white text-sm">
                          {rec.mileageKm ? `${Number(rec.mileageKm).toLocaleString('uz-UZ')} km` : '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-400 block mb-0.5">Xizmat haqi:</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {rec.costUzs ? `${Number(rec.costUzs).toLocaleString('uz-UZ')} so'm` : '0 so\'m'}
                        </span>
                      </div>
                    </div>

                    {/* Replaced & Recommended Parts */}
                    <div className="space-y-1.5 text-xs">
                      {rec.replacedOil && (
                        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-900/50 text-amber-200">
                          <strong className="text-amber-400 block text-[11px] flex items-center gap-1">
                            <span>🛢️ Almashtirilgan moy:</span>
                          </strong>
                          <span>{rec.replacedOil}</span>
                        </div>
                      )}

                      {rec.replacedParts && (
                        <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-900/50 text-emerald-200">
                          <strong className="text-emerald-400 block text-[11px] flex items-center gap-1">
                            <span>⚙️ Almashtirilgan zapchastlar:</span>
                          </strong>
                          <span>{rec.replacedParts}</span>
                        </div>
                      )}

                      {rec.partsToReplace && (
                        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-900/50 text-amber-200">
                          <strong className="text-amber-400 block text-[11px]">
                            ⚠️ Almashtirilishi tavsiya etilgan:
                          </strong>
                          <span>{rec.partsToReplace}</span>
                        </div>
                      )}

                      {rec.notes && (
                        <div className="text-[11px] text-slate-400 italic pt-1">
                          Izoh: {rec.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
