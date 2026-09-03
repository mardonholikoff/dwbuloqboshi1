import React from 'react';
import { ServiceRecord } from '../types';
import { X, Printer, Wrench, Calendar, Phone, User, Car, Gauge, CheckCircle2, AlertTriangle } from 'lucide-react';
import { createAdminLog } from '../lib/adminSession';

interface PrintReceiptModalProps {
  record: ServiceRecord | null;
  onClose: () => void;
  username?: string;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({ record, onClose, username = 'daewoobuloqboshi' }) => {
  if (!record) return null;

  const handlePrint = async () => {
    await createAdminLog(
      "Kvitansiya Chop Etildi",
      `Mijoz: ${record.customerName}, Avto: ${record.carPlate}, Summa: ${record.costUzs.toLocaleString()} so'm kvitansiya print qilindi`,
      username
    );
    window.print();
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('uz-UZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-slate-900 my-8">
        {/* Screen Header (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Printer className="w-4 h-4 text-blue-400" />
            <span>Xizmat Qabul Cheki va Hujjat</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Chop Etish (Print)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Content Area (Print Target) */}
        <div className="p-6 sm:p-8 space-y-6 print:p-6 bg-slate-900 print:bg-white text-slate-100 print:text-slate-900">
          {/* Shop Brand Header */}
          <div className="text-center pb-6 border-b border-slate-800 print:border-slate-300">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 print:bg-slate-100 print:text-slate-800 mb-2 border border-blue-500/30 print:border-slate-300">
              <Wrench className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-extrabold text-white print:text-slate-900 uppercase tracking-tight">
              Daewoo Buloqboshi Auto Servis
            </h1>
            <p className="text-xs text-slate-400 print:text-slate-600 mt-1 font-medium">
              Sifatli Avto Ta'mirlash va Original Zapchastlar Markazi
            </p>
            <div className="mt-3 inline-block px-3 py-1 rounded-full bg-slate-800 print:bg-slate-100 text-slate-300 print:text-slate-700 text-[11px] font-mono border border-slate-700 print:border-slate-300">
              Chek №: {record.id.replace('rec-', 'DBS-')}
            </div>
          </div>

          {/* Client & Car Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 text-xs sm:text-sm">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 print:text-slate-500 block mb-0.5">MIJOZ ISMI</span>
              <div className="font-bold text-white print:text-slate-900 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400 print:text-slate-600" />
                <span>{record.customerName}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 print:text-slate-500 block mb-0.5">TELEFON NOMER</span>
              <div className="font-semibold text-slate-200 print:text-slate-800 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-400 print:text-slate-600" />
                <span>{record.phoneNumber}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 print:text-slate-500 block mb-0.5">MASHINA RAQAMI</span>
              <div className="font-mono font-bold text-blue-400 print:text-slate-900 bg-slate-900 print:bg-slate-200 px-2.5 py-0.5 rounded inline-block border border-slate-700 print:border-slate-300">
                {record.carPlate}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 print:text-slate-500 block mb-0.5">MASHINA MODELI</span>
              <div className="font-medium text-slate-200 print:text-slate-800 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-blue-400 print:text-slate-600" />
                <span>{record.carModel || 'Körsatilmagan'}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 print:text-slate-500 block mb-0.5">BOSIB O'TILGAN MASOFA (KM)</span>
              <div className="font-medium text-slate-200 print:text-slate-800 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-blue-400 print:text-slate-600" />
                <span>{record.mileageKm ? `${Number(record.mileageKm).toLocaleString('uz-UZ')} km` : '—'}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 print:text-slate-500 block mb-0.5">XIZMAT SANI VA VAQTI</span>
              <div className="font-medium text-slate-300 print:text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400 print:text-slate-600" />
                <span className="text-xs">{formatDate(record.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Detailed Work & Parts */}
          <div className="space-y-4 text-xs sm:text-sm">
            {/* Replaced parts */}
            <div className="p-4 rounded-xl bg-slate-950/40 print:bg-slate-50 border border-emerald-900/40 print:border-slate-300">
              <div className="flex items-center gap-1.5 text-emerald-400 print:text-slate-900 font-bold mb-2 text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 print:text-slate-700" />
                <span>Almashtirilgan Zapchastlar va Bajarilgan Ishlar</span>
              </div>
              <p className="text-slate-200 print:text-slate-800 leading-relaxed font-medium">
                {record.replacedParts || 'Xizmat xabari kiritilmagan.'}
              </p>
            </div>

            {/* Parts to replace */}
            <div className="p-4 rounded-xl bg-slate-950/40 print:bg-slate-50 border border-amber-900/40 print:border-slate-300">
              <div className="flex items-center gap-1.5 text-amber-400 print:text-slate-900 font-bold mb-2 text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-500 print:text-slate-700" />
                <span>Almashtirmoq bo'lgan Zapchastlar (Tavsiyalar)</span>
              </div>
              <p className="text-slate-200 print:text-slate-800 leading-relaxed font-medium">
                {record.partsToReplace || 'Tavsiya qilingan zapchastlar yo\'q.'}
              </p>
            </div>

            {/* Notes */}
            {record.notes && (
              <div className="p-3 rounded-lg bg-slate-950/30 print:bg-slate-100 text-slate-400 print:text-slate-600 italic text-xs">
                Eslatma: {record.notes}
              </div>
            )}
          </div>

          {/* Pricing & Signatures */}
          <div className="pt-4 border-t border-slate-800 print:border-slate-300 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 print:text-slate-600 block">Jami Xizmat Summasi:</span>
              <span className="text-lg font-extrabold text-emerald-400 print:text-slate-900">
                {record.costUzs ? `${Number(record.costUzs).toLocaleString('uz-UZ')} UZS` : 'Kelishilgan'}
              </span>
            </div>

            <div className="text-right text-xs text-slate-400 print:text-slate-700">
              <p className="font-semibold text-slate-300 print:text-slate-900">Daewoo Nargiz Usta Imzosi:</p>
              <div className="mt-4 border-b border-dashed border-slate-600 print:border-slate-400 w-32 ml-auto" />
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center text-[10px] text-slate-500 print:text-slate-500 pt-2 border-t border-slate-800 print:border-slate-200">
            Tashrifingiz uchun rahmat! Daewoo Nargiz Avtoservis xavfsiz yo'llar tilaydi.
          </div>
        </div>
      </div>
    </div>
  );
};
