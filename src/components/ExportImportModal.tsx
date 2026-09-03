import React from 'react';
import { ServiceRecord } from '../types';
import { X, Download, Upload, FileSpreadsheet, RefreshCw, AlertCircle } from 'lucide-react';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ServiceRecord[];
  onImportRecords: (records: ServiceRecord[]) => void;
  onResetToDemo: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  records,
  onImportRecords,
  onResetToDemo,
}) => {
  if (!isOpen) return null;

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `daewoo_nargiz_baza_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export CSV for Excel
  const handleExportCSV = () => {
    const headers = ["ID", "Mijoz Ismi", "Telefon Nomer", "Mashina Raqami", "Mashina Modeli", "Km", "Almashtirilgan Zapchast", "Almashtirmoq Bo'lgan Zapchast", "Holati", "Summa (UZS)", "Sana"];
    const rows = records.map(r => [
      r.id,
      `"${r.customerName.replace(/"/g, '""')}"`,
      `"${r.phoneNumber}"`,
      `"${r.carPlate}"`,
      `"${r.carModel || ''}"`,
      r.mileageKm || '',
      `"${(r.replacedParts || '').replace(/"/g, '""')}"`,
      `"${(r.partsToReplace || '').replace(/"/g, '""')}"`,
      r.status,
      r.costUzs || 0,
      `"${r.createdAt}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `daewoo_nargiz_excel_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Import JSON File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            onImportRecords(parsed);
            alert("Baza muvaffaqiyatli yuklandi!");
            onClose();
          } else {
            alert("Fayl formati noto'g'ri. JSON massiv bo'lishi kerak.");
          }
        } catch (err) {
          alert("Faylni o'qishda xatolik yuz berdi!");
        }
      };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <span>Ma'lumotlar Bazasi Zaxirasi va Eksport</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-sm">
          {/* Export section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              1. Baza Ma'lumotlarini Saqlab Olish (Eksport)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleExportCSV}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-950/20 text-slate-200 hover:text-white flex items-center gap-3 transition-all cursor-pointer group"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <div className="font-semibold text-xs">Excel / CSV ga Yuklash</div>
                  <div className="text-[10px] text-slate-400">Jadval ko'rinishida</div>
                </div>
              </button>

              <button
                onClick={handleExportJSON}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/20 text-slate-200 hover:text-white flex items-center gap-3 transition-all cursor-pointer group"
              >
                <Download className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <div className="font-semibold text-xs">JSON Backup Fayl</div>
                  <div className="text-[10px] text-slate-400">To'liq zaxira nushasi</div>
                </div>
              </button>
            </div>
          </div>

          {/* Import section */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              2. Zaxira Faylidan Tiklash (Import)
            </h3>
            <label className="block p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 hover:bg-slate-950 hover:border-blue-500 text-center cursor-pointer transition-colors">
              <Upload className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <span className="text-xs font-semibold text-slate-200 block">
                JSON Zaxira Faylini Tanglang
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                Kompaniyaning saqlangan faylini qayta tiklaydi
              </span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Clear Database */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Barcha mijoz va xizmat ma'lumotlarini o'chirish</span>
            </div>
            <button
              onClick={() => {
                if (confirm("Rostdan ham barcha kiritilgan mijoz va xizmat ma'lumotlarini butunlay o'chirib tashlamoqchimisiz?")) {
                  onResetToDemo();
                  onClose();
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/50 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Bazani Tozalash</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
