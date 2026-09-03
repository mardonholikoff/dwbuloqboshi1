import React, { useState, useEffect, useMemo } from 'react';
import { ServiceRecord } from '../types';
import { subscribeToCatalog } from '../lib/firebase';
import { X, Save, Car, User, Phone, Gauge, Wrench, AlertCircle, Sparkles, DollarSign, Search, CheckCircle2, History, Droplet, ShoppingBag, Calendar, Clock, ChevronDown, ChevronUp, Check, Edit3 } from 'lucide-react';

interface RecordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<ServiceRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => void;
  initialData?: ServiceRecord | null;
  existingRecords?: ServiceRecord[];
}

const POPULAR_CAR_MODELS = [
  'Gentra 1.5',
  'Cobalt LTZ',
  'Nexia 3',
  'Damas DLX',
  'Matiz Best',
  'Tracker Turbo',
  'Malibu 2 Turbo',
  'Onix Premier',
  'Lacetti 1.8',
  'Spark 1.2',
];

const POPULAR_OILS = [
  'Shell Helix Ultra 5W-30',
  'Castrol EDGE 5W-30',
  'Mannol Classic 10W-40',
  'ZIC X7 5W-30',
  'Lukoil Genesis 5W-40',
  'Kixx G1 5W-30',
  'Mobil 1 ESP 5W-30',
  'Chevrolet Genuine 5W-30',
  'Hyundai XTeer 10W-40',
  'Total Quartz 5W-40',
];

const POPULAR_PARTS = [
  'Moy filtri & Havo filtri',
  'Salonnoy filtr',
  'Svecha (Aramatsiyalangan)',
  'Tormoz kolodkasi (Oldi)',
  'Tormoz kolodkasi (Orqa)',
  'Remen GRM + Rolik',
  'Pompa (Suv nasosi)',
  'Antifriz (G12+)',
  'Akkumulyator (60Ah)',
  'Sharovoy opora',
  'Amortizator',
];

const POPULAR_RECOMMENDATIONS = [
  'Keyingi safar moy va filtr almashtirish',
  'Tormoz kolodkalarini yangilash',
  'GRM remenini almashtirish',
  'Antifriz tizimini yuvish',
  'Svechalarni almashtirish',
  'Amortizator almashtirish',
  'Xodovoy sozlash',
  'Rulevoy tyaga yangilash',
  'Akkumulyatorni almashtirish',
];

export const RecordFormModal: React.FC<RecordFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingRecords = [],
}) => {
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [carModel, setCarModel] = useState('');
  const [mileageKm, setMileageKm] = useState<string | number>('');
  const [replacedOil, setReplacedOil] = useState('');
  const [replacedParts, setReplacedParts] = useState('');
  const [partsToReplace, setPartsToReplace] = useState('');
  const [status, setStatus] = useState<'bajarildi' | 'jarayonda' | 'kutilmoqda'>('bajarildi');
  const [costUzs, setCostUzs] = useState<string | number>('');
  const [oilCostUzs, setOilCostUzs] = useState<string | number>('');
  const [partsCostUzs, setPartsCostUzs] = useState<string | number>('');
  const [showCostSplit, setShowCostSplit] = useState<boolean>(false);
  const [notes, setNotes] = useState('');
  const [selectedExistingCustomer, setSelectedExistingCustomer] = useState<string>('');
  const [existingCustomerInfo, setExistingCustomerInfo] = useState<ServiceRecord | null>(null);

  // Service return interval (o'rtacha kelish oralig'i - ixtiyoriy)
  const [visitIntervalDays, setVisitIntervalDays] = useState<number | ''>('');
  const [isCustomInterval, setIsCustomInterval] = useState<boolean>(false);
  const [customIntervalInput, setCustomIntervalInput] = useState<string>('');

  // Service type selections: Moy almashtirildi, Zapchast sotildi, or both
  const [isOilChanged, setIsOilChanged] = useState<boolean>(true);
  const [isPartSold, setIsPartSold] = useState<boolean>(false);
  
  // Custom Service Date state
  const [useCustomDate, setUseCustomDate] = useState<boolean>(false);
  const [customDate, setCustomDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Real-time custom catalog items (from Firestore/admin)
  const [customCatalog, setCustomCatalog] = useState<{ customOils: string[]; customParts: string[] }>({
    customOils: [],
    customParts: [],
  });

  useEffect(() => {
    const unsub = subscribeToCatalog((data) => {
      setCustomCatalog(data);
    });
    return () => unsub();
  }, []);

  // Dropdown states for scrollable selection
  const [isOilDropdownOpen, setIsOilDropdownOpen] = useState<boolean>(false);
  const [isPartsDropdownOpen, setIsPartsDropdownOpen] = useState<boolean>(false);
  const [isRecDropdownOpen, setIsRecDropdownOpen] = useState<boolean>(false);
  const [oilSearchFilter, setOilSearchFilter] = useState<string>('');
  const [partsSearchFilter, setPartsSearchFilter] = useState<string>('');
  const [oilLimitNotice, setOilLimitNotice] = useState<string>('');

  const combinedOils = useMemo(() => {
    const list = [...POPULAR_OILS, ...(customCatalog.customOils || [])];
    return Array.from(new Set(list.map((s) => s.trim()))).filter(Boolean);
  }, [customCatalog.customOils]);

  const combinedParts = useMemo(() => {
    const list = [...POPULAR_PARTS, ...(customCatalog.customParts || [])];
    return Array.from(new Set(list.map((s) => s.trim()))).filter(Boolean);
  }, [customCatalog.customParts]);

  const filteredOilsList = useMemo(() => {
    if (!oilSearchFilter.trim()) return combinedOils;
    return combinedOils.filter((oil) =>
      oil.toLowerCase().includes(oilSearchFilter.toLowerCase())
    );
  }, [combinedOils, oilSearchFilter]);

  const filteredPartsList = useMemo(() => {
    if (!partsSearchFilter.trim()) return combinedParts;
    return combinedParts.filter((part) =>
      part.toLowerCase().includes(partsSearchFilter.toLowerCase())
    );
  }, [combinedParts, partsSearchFilter]);

  // Selected oils list from input
  const selectedOilsArray = useMemo(() => {
    return replacedOil.split(',').map((s) => s.trim()).filter(Boolean);
  }, [replacedOil]);

  // Customer's previous full service history when carPlate or customer is selected
  const customerPastHistory = useMemo(() => {
    const cleanPlate = carPlate.trim().toUpperCase().replace(/[\s\-_]/g, '');
    if (!cleanPlate) return [];
    return (existingRecords || [])
      .filter((r) => {
        const p = (r.carPlate || '').toUpperCase().replace(/[\s\-_]/g, '');
        return p === cleanPlate && (!initialData || r.id !== initialData.id);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [carPlate, existingRecords, initialData]);

  // Helper to toggle item in replacedOil (Max 2 items)
  const handleToggleOil = (item: string) => {
    setReplacedOil((prev) => {
      const parts = prev.split(',').map((s) => s.trim()).filter(Boolean);
      const existsIndex = parts.findIndex((p) => p.toLowerCase() === item.toLowerCase());
      if (existsIndex >= 0) {
        parts.splice(existsIndex, 1);
        setOilLimitNotice('');
        return parts.join(', ');
      } else {
        if (parts.length >= 2) {
          setOilLimitNotice("Ko'pi bilan 2 xil moy tanlash mumkin! Boshqa moy tanlash uchun avval tanlangandan birini o'chiring.");
          return prev;
        }
        parts.push(item);
        setOilLimitNotice('');
        return parts.join(', ');
      }
    });
    if (errors.replacedOil) {
      setErrors((e) => ({ ...e, replacedOil: '' }));
    }
  };

  // Helper to toggle item in replacedParts
  const handleTogglePart = (item: string) => {
    setReplacedParts((prev) => {
      const parts = prev.split(',').map((s) => s.trim()).filter(Boolean);
      const existsIndex = parts.findIndex((p) => p.toLowerCase() === item.toLowerCase());
      if (existsIndex >= 0) {
        parts.splice(existsIndex, 1);
        return parts.join(', ');
      } else {
        parts.push(item);
        return parts.join(', ');
      }
    });
    if (errors.replacedParts) {
      setErrors((e) => ({ ...e, replacedParts: '' }));
    }
  };

  // Helper to append item to partsToReplace
  const handleAppendToReplace = (item: string) => {
    setPartsToReplace((prev) => {
      if (!prev.trim()) return item;
      if (prev.toLowerCase().includes(item.toLowerCase())) return prev;
      return `${prev}, ${item}`;
    });
  };

  // Get unique customers list from existing records
  const uniqueCustomers = useMemo(() => {
    const map = new Map<string, ServiceRecord>();
    existingRecords.forEach((r) => {
      const key = r.carPlate.toUpperCase();
      if (!map.has(key)) {
        map.set(key, r);
      }
    });
    return Array.from(map.values());
  }, [existingRecords]);

  useEffect(() => {
    if (initialData) {
      setCustomerName(initialData.customerName || '');
      setPhoneNumber(initialData.phoneNumber || '');
      setCarPlate(initialData.carPlate || '');
      setCarModel(initialData.carModel || '');
      setMileageKm(initialData.mileageKm || '');
      setReplacedOil(initialData.replacedOil || '');
      setReplacedParts(initialData.replacedParts || '');
      setPartsToReplace(initialData.partsToReplace || '');
      setStatus(initialData.status || 'bajarildi');
      setCostUzs(initialData.costUzs || '');
      setOilCostUzs(initialData.oilCostUzs || '');
      setPartsCostUzs(initialData.partsCostUzs || '');
      setShowCostSplit(Boolean(initialData.oilCostUzs || initialData.partsCostUzs));
      setNotes(initialData.notes || '');
      setSelectedExistingCustomer('');
      setExistingCustomerInfo(null);

      // Restore visit interval
      setVisitIntervalDays(initialData.visitIntervalDays || '');
      if (initialData.visitIntervalDays && ![7, 14, 21, 30, 60, 90].includes(initialData.visitIntervalDays)) {
        setIsCustomInterval(true);
        setCustomIntervalInput(String(initialData.visitIntervalDays));
      } else {
        setIsCustomInterval(false);
        setCustomIntervalInput('');
      }

      const oilText = (initialData.replacedOil || '').toLowerCase();
      const partsText = (initialData.replacedParts || '').toLowerCase();
      setIsOilChanged(Boolean(oilText) || partsText.includes('moy') || partsText.includes('oil'));
      setIsPartSold(Boolean(partsText) || partsText.includes('zapchast') || partsText.includes('sotildi'));

      if (initialData.createdAt) {
        setCustomDate(new Date(initialData.createdAt).toISOString().split('T')[0]);
        setUseCustomDate(true);
      } else {
        setCustomDate(new Date().toISOString().split('T')[0]);
        setUseCustomDate(false);
      }
    } else {
      // Reset defaults - start completely empty for strict explicit user selection/typing
      setCustomerName('');
      setPhoneNumber('+998 ');
      setCarPlate('');
      setCarModel('');
      setMileageKm('');
      setReplacedOil('');
      setReplacedParts('');
      setPartsToReplace('');
      setStatus('bajarildi');
      setCostUzs('');
      setOilCostUzs('');
      setPartsCostUzs('');
      setShowCostSplit(false);
      setNotes('');
      setSelectedExistingCustomer('');
      setExistingCustomerInfo(null);
      setVisitIntervalDays('');
      setIsCustomInterval(false);
      setCustomIntervalInput('');
      setIsOilChanged(true);
      setIsPartSold(false);
      setCustomDate(new Date().toISOString().split('T')[0]);
      setUseCustomDate(false);
    }
    setIsOilDropdownOpen(false);
    setIsPartsDropdownOpen(false);
    setIsRecDropdownOpen(false);
    setOilSearchFilter('');
    setPartsSearchFilter('');
    setOilLimitNotice('');
    setErrors({});
  }, [initialData, isOpen]);

  // Handle selecting an existing customer
  const handleSelectExistingCustomer = (plate: string) => {
    setSelectedExistingCustomer(plate);
    if (!plate) {
      setExistingCustomerInfo(null);
      return;
    }

    const found = existingRecords.find((r) => r.carPlate.toUpperCase() === plate.toUpperCase());
    if (found) {
      setCustomerName(found.customerName);
      setPhoneNumber(found.phoneNumber);
      setCarPlate(found.carPlate);
      setCarModel(found.carModel);
      setExistingCustomerInfo(found);

      // Pre-fill parts to replace if customer had pending recommendations
      if (found.partsToReplace && !partsToReplace) {
        setPartsToReplace(found.partsToReplace);
      }

      // Pre-fill return interval if customer previously had it
      const prevIntervalRecord = existingRecords.find(
        (r) => r.carPlate.toUpperCase() === plate.toUpperCase() && r.visitIntervalDays
      );
      if (prevIntervalRecord?.visitIntervalDays) {
        setVisitIntervalDays(prevIntervalRecord.visitIntervalDays);
        if (![7, 14, 21, 30, 60, 90].includes(prevIntervalRecord.visitIntervalDays)) {
          setIsCustomInterval(true);
          setCustomIntervalInput(String(prevIntervalRecord.visitIntervalDays));
        } else {
          setIsCustomInterval(false);
          setCustomIntervalInput('');
        }
      }
    }
  };

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!customerName.trim()) {
      newErrors.customerName = 'Mijoz ismi majburiy!';
    }
    if (!phoneNumber.trim() || phoneNumber.trim() === '+998') {
      newErrors.phoneNumber = 'Telefon nomeri majburiy!';
    }
    if (!carPlate.trim()) {
      newErrors.carPlate = 'Mashina raqami (nomeri) majburiy!';
    }
    // Strict validation for Oil and Spare Parts: No auto-fill defaults!
    if (!isOilChanged && !isPartSold) {
      newErrors.serviceType = "Moy almashtirish yoki Zapchast sotishdan kamida birini tanlang!";
    }

    // Km is required ONLY IF oil was changed. If only parts were sold, mileage is optional!
    if (isOilChanged) {
      if (!mileageKm || Number(mileageKm) <= 0) {
        newErrors.mileageKm = "Moy almashtirilganda bosib o'tilgan masofa (Km) majburiy!";
      }
    }

    // Cost validation based on service selection (oil, parts, or both)
    if (isOilChanged && !isPartSold) {
      if (!oilCostUzs || Number(oilCostUzs) <= 0) {
        newErrors.oilCostUzs = "Moy almashtirish narxi (summasi) majburiy!";
      }
    } else if (!isOilChanged && isPartSold) {
      if (!partsCostUzs || Number(partsCostUzs) <= 0) {
        newErrors.partsCostUzs = "Zapchast narxi (summasi) majburiy!";
      }
    } else if (isOilChanged && isPartSold) {
      if (!oilCostUzs || Number(oilCostUzs) <= 0) {
        newErrors.oilCostUzs = "Moy narxi majburiy!";
      }
      if (!partsCostUzs || Number(partsCostUzs) <= 0) {
        newErrors.partsCostUzs = "Zapchast narxi majburiy!";
      }
    }

    if (isOilChanged && !replacedOil.trim()) {
      newErrors.replacedOil = "Moy almashtirildi tanlandi! Pastdagi katalogdan bittasini bosing yoki qo'lda turini yozing.";
    }

    if (isPartSold && !replacedParts.trim()) {
      newErrors.replacedParts = "Zapchast sotildi tanlandi! Pastdagi katalogdan bittasini bosing yoki qo'lda zapchast nomini yozing.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const finalOil = isOilChanged ? replacedOil.trim() : '';
    const finalParts = isPartSold ? replacedParts.trim() : '';

    let finalCreatedAt: string | undefined = undefined;
    if (useCustomDate && customDate) {
      try {
        const [yStr, mStr, dStr] = customDate.split('-');
        const year = Number(yStr);
        const month = Number(mStr);
        const day = Number(dStr);
        const now = new Date();
        const parsed = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
        if (!isNaN(parsed.getTime())) {
          finalCreatedAt = parsed.toISOString();
        } else {
          finalCreatedAt = new Date().toISOString();
        }
      } catch {
        finalCreatedAt = new Date().toISOString();
      }
    } else if (initialData?.createdAt) {
      finalCreatedAt = initialData.createdAt;
    } else {
      finalCreatedAt = new Date().toISOString();
    }

    // Calculate split cost and total values
    let finalOilCost = isOilChanged && oilCostUzs ? Number(oilCostUzs) : undefined;
    let finalPartsCost = isPartSold && partsCostUzs ? Number(partsCostUzs) : undefined;
    let totalCost = 0;

    if (isOilChanged && !isPartSold) {
      totalCost = Number(oilCostUzs) || 0;
      finalPartsCost = 0;
    } else if (!isOilChanged && isPartSold) {
      totalCost = Number(partsCostUzs) || 0;
      finalOilCost = 0;
    } else if (isOilChanged && isPartSold) {
      totalCost = (Number(oilCostUzs) || 0) + (Number(partsCostUzs) || 0);
    }

    onSave({
      id: initialData?.id,
      createdAt: finalCreatedAt,
      customerName: initialData ? initialData.customerName : customerName.trim(),
      phoneNumber: phoneNumber.trim(),
      carPlate: carPlate.trim().toUpperCase(),
      carModel: carModel.trim() || 'Gentra 1.5',
      mileageKm: mileageKm ? Number(mileageKm) : '',
      replacedOil: finalOil,
      replacedParts: finalParts,
      partsToReplace: partsToReplace.trim(),
      status,
      costUzs: totalCost,
      oilCostUzs: finalOilCost,
      partsCostUzs: finalPartsCost,
      visitIntervalDays: visitIntervalDays ? Number(visitIntervalDays) : undefined,
      notes: notes.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {initialData ? "Yozuvni Tahrirlash" : "Yangi Xizmat Yozuvini Qo'shish"}
              </h2>
              <p className="text-xs text-slate-400">
                Mijoz va avtomobil zapchast ma'lumotlarini kiritish
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Section: Select from Existing Customers */}
          {!initialData && uniqueCustomers.length > 0 && (
            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/60 space-y-2">
              <label className="block text-xs font-semibold text-blue-300 flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-400" />
                <span>Eski mijozlardan avto-to'ldirish (Ixtiyoriy):</span>
              </label>
              <select
                value={selectedExistingCustomer}
                onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">-- Bazadagi eski mijozni tanlang... --</option>
                {uniqueCustomers.map((cust) => (
                  <option key={cust.id} value={cust.carPlate}>
                    🚗 {cust.carPlate} - {cust.customerName} ({cust.carModel})
                  </option>
                ))}
              </select>

              {existingCustomerInfo && (
                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>{existingCustomerInfo.customerName}</strong> ({existingCustomerInfo.carPlate}) ma'lumotlari avto-to'ldirildi! Oxirgi kilometraj: {existingCustomerInfo.mileageKm || 0} km.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Section: Service Date Selection (Avtomatik yoki Maxsus/O'tgan sana) */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-200">Xizmat Ko'rsatilgan Kuni:</span>
                <span className="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-slate-900 text-indigo-300 border border-slate-800">
                  {useCustomDate && customDate ? customDate : "Bugungi sana (Avtomatik)"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const nextVal = !useCustomDate;
                  setUseCustomDate(nextVal);
                  if (nextVal && !customDate) {
                    setCustomDate(new Date().toISOString().split('T')[0]);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  useCustomDate
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                <span>{useCustomDate ? "📅 Maxsus sana tanlandi" : "🗓️ Boshqa/O'tgan sanani tanlash"}</span>
              </button>
            </div>

            {useCustomDate && (
              <div className="pt-2.5 border-t border-slate-800/80 space-y-2.5 animate-fadeIn">
                <label className="block text-xs font-medium text-indigo-300 flex items-center justify-between">
                  <span>Xizmat ko'rsatilgan kunni kalendardan tanlang:</span>
                  <span className="text-[10px] text-slate-400 font-normal font-mono">O'tgan kunlar uchun hisobotga yoziladi</span>
                </label>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="date"
                    value={customDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="p-2.5 bg-slate-900 border border-indigo-500/70 rounded-xl text-sm text-indigo-200 font-mono focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all cursor-pointer"
                  />

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCustomDate(new Date().toISOString().split('T')[0])}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        customDate === new Date().toISOString().split('T')[0]
                          ? 'bg-indigo-600 text-white font-bold border-indigo-400'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      Bugun
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        setCustomDate(d.toISOString().split('T')[0]);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                    >
                      Kecha
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 2);
                        setCustomDate(d.toISOString().split('T')[0]);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                    >
                      2 kun oldin
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 7);
                        setCustomDate(d.toISOString().split('T')[0]);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                    >
                      1 xafta oldin
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Required Client Info */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-4">
            {initialData && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  🔒 <strong>Mijoz ismi qulflangan:</strong> Tahrirlashda faqat mijoz ismini o'zgartirib bo'lmaydi. Telefon raqam, mashina raqami, modeli hamda bajarilgan xizmatlarni istalgan vaqtda o'zgartirishingiz mumkin.
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
              <User className="w-4 h-4" />
              <span>Mijoz va Avto Ma'lumotlari (Majburiy maydonlar)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mijoz Ismi (Mandatory - Locked on Edit) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mijoz Ismi <span className="text-red-400 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    disabled={Boolean(initialData)}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Masalan: Alisher Qodirov"
                    className={`w-full pl-9 pr-3 py-2.5 ${
                      initialData
                        ? 'bg-slate-950 text-slate-400 border-slate-800 cursor-not-allowed opacity-75'
                        : 'bg-slate-900 border-slate-700 text-white focus:outline-none focus:border-blue-500'
                    } ${errors.customerName ? 'border-red-500' : ''} rounded-xl text-sm transition-all`}
                  />
                </div>
                {errors.customerName && (
                  <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.customerName}
                  </p>
                )}
              </div>

              {/* Telefon Nomer (Editable anytime) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Telefon Nomer <span className="text-red-400 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className={`w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-blue-500 ${
                      errors.phoneNumber ? 'border-red-500' : ''
                    } rounded-xl text-sm transition-all`}
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.phoneNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Mashina Raqami (Editable anytime) */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mashina Raqami <span className="text-red-400 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={carPlate}
                  onChange={(e) => setCarPlate(e.target.value.toUpperCase())}
                  placeholder="01 A 777 AA"
                  className={`w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-white font-mono uppercase focus:outline-none focus:border-blue-500 ${
                    errors.carPlate ? 'border-red-500' : ''
                  } rounded-xl text-sm transition-all`}
                />
                {errors.carPlate && (
                  <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.carPlate}
                  </p>
                )}
              </div>

              {/* Mashina Modeli (Editable anytime) */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mashina Modeli
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Car className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={carModel}
                    onChange={(e) => setCarModel(e.target.value)}
                    placeholder="Masalan: Gentra 1.5, Cobalt LTZ"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-blue-500 rounded-xl text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Quick Car Model Chips */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1.5">Tezkor tanlash:</span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_CAR_MODELS.map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => setCarModel(model)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                      carModel === model
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {model}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Technical Details (KM, Replaced Parts, Parts to Replace) */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              <Gauge className="w-4 h-4" />
              <span>Xizmat va Zapchastlar Ma'lumoti</span>
            </div>

            {/* Service Category Selection (Moy almashtirildi, Zapchast sotildi, or both) */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Xizmat Turi (Kamida birini tanlang):</span> <span className="text-red-400 font-bold">*</span>
                </span>
                <span className="text-[10px] text-blue-400 font-normal">Moy yoki Zapchast xizmati</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOilChanged(!isOilChanged);
                    if (errors.serviceType) setErrors((e) => ({ ...e, serviceType: '' }));
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isOilChanged
                      ? 'bg-amber-950/80 border-amber-600 text-amber-300 shadow-md shadow-amber-900/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="text-base">🛢️</span>
                  <span>Moy Almashtirildi</span>
                  {isOilChanged && <CheckCircle2 className="w-4 h-4 text-amber-400 ml-auto" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPartSold(!isPartSold);
                    if (errors.serviceType) setErrors((e) => ({ ...e, serviceType: '' }));
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isPartSold
                      ? 'bg-blue-950/80 border-blue-600 text-blue-300 shadow-md shadow-blue-900/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="text-base">⚙️</span>
                  <span>Zapchast Sotildi</span>
                  {isPartSold && <CheckCircle2 className="w-4 h-4 text-blue-400 ml-auto" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOilChanged(true);
                    setIsPartSold(true);
                    if (errors.serviceType) setErrors((e) => ({ ...e, serviceType: '' }));
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isOilChanged && isPartSold
                      ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 shadow-md shadow-emerald-900/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="text-base">⚡</span>
                  <span>Ikkalasi Ham</span>
                  {isOilChanged && isPartSold && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />}
                </button>
              </div>

              {errors.serviceType && (
                <p className="text-xs text-red-400 flex items-center gap-1 font-semibold pt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.serviceType}
                </p>
              )}
            </div>

            {/* Km & Service Cost Section - Dynamic based on service selection */}
            <div className="space-y-3">
              {/* Only Oil Changed */}
              {isOilChanged && !isPartSold && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Km - Mandatory */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>
                        Bosib o'tilgan masofa (Km) <span className="text-red-400 font-bold">*</span>
                      </span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Gauge className="w-4 h-4" />
                      </div>
                      <input
                        type="number"
                        value={mileageKm}
                        onChange={(e) => {
                          setMileageKm(e.target.value);
                          if (errors.mileageKm) setErrors((err) => ({ ...err, mileageKm: '' }));
                        }}
                        placeholder="Masalan: 125000"
                        className={`w-full pl-9 pr-12 py-2.5 bg-slate-900 border ${
                          errors.mileageKm ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-700'
                        } rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition-all`}
                      />
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-500 font-medium">
                        km
                      </span>
                    </div>
                    {errors.mileageKm && (
                      <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.mileageKm}
                      </p>
                    )}
                  </div>

                  {/* Oil Cost - Mandatory */}
                  <div>
                    <label className="block text-xs font-medium text-amber-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Droplet className="w-3.5 h-3.5 text-amber-400" />
                        <span>Moy Almashtirish Narxi (UZS) <span className="text-red-400 font-bold">*</span></span>
                      </span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-500/70">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <input
                        type="number"
                        required
                        value={oilCostUzs}
                        onChange={(e) => {
                          setOilCostUzs(e.target.value);
                          setCostUzs(e.target.value);
                          if (errors.oilCostUzs) setErrors((err) => ({ ...err, oilCostUzs: '' }));
                        }}
                        placeholder="Masalan: 320000"
                        className={`w-full pl-9 pr-14 py-2.5 bg-slate-900 border ${
                          errors.oilCostUzs ? 'border-red-500 ring-1 ring-red-500' : 'border-amber-800/60'
                        } rounded-xl text-sm text-amber-100 focus:outline-none focus:border-amber-500 transition-all`}
                      />
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-500">
                        so'm
                      </span>
                    </div>
                    {errors.oilCostUzs && (
                      <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.oilCostUzs}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Only Parts Sold */}
              {!isOilChanged && isPartSold && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Km - Optional */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Bosib o'tilgan masofa (Km) <span className="text-blue-400/80 font-normal text-[11px]">(Ixtiyoriy)</span></span>
                      <span className="text-[10px] text-blue-400 font-normal">Zapchast uchun shart emas</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Gauge className="w-4 h-4" />
                      </div>
                      <input
                        type="number"
                        value={mileageKm}
                        onChange={(e) => {
                          setMileageKm(e.target.value);
                          if (errors.mileageKm) setErrors((err) => ({ ...err, mileageKm: '' }));
                        }}
                        placeholder="Ixtiyoriy (masalan: 125000)"
                        className="w-full pl-9 pr-12 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                      />
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-500 font-medium">
                        km
                      </span>
                    </div>
                  </div>

                  {/* Parts Cost - Mandatory */}
                  <div>
                    <label className="block text-xs font-medium text-blue-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Wrench className="w-3.5 h-3.5 text-blue-400" />
                        <span>Zapchast Narxi / Summasi (UZS) <span className="text-red-400 font-bold">*</span></span>
                      </span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-500/70">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <input
                        type="number"
                        required
                        value={partsCostUzs}
                        onChange={(e) => {
                          setPartsCostUzs(e.target.value);
                          setCostUzs(e.target.value);
                          if (errors.partsCostUzs) setErrors((err) => ({ ...err, partsCostUzs: '' }));
                        }}
                        placeholder="Masalan: 150000"
                        className={`w-full pl-9 pr-14 py-2.5 bg-slate-900 border ${
                          errors.partsCostUzs ? 'border-red-500 ring-1 ring-red-500' : 'border-blue-800/60'
                        } rounded-xl text-sm text-blue-100 focus:outline-none focus:border-blue-500 transition-all`}
                      />
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-500">
                        so'm
                      </span>
                    </div>
                    {errors.partsCostUzs && (
                      <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.partsCostUzs}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Both Oil and Parts Selected */}
              {isOilChanged && isPartSold && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Km - Mandatory because oil is changed */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>
                          Bosib o'tilgan masofa <span className="text-red-400 font-bold">*</span>
                        </span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <Gauge className="w-4 h-4" />
                        </div>
                        <input
                          type="number"
                          value={mileageKm}
                          onChange={(e) => {
                            setMileageKm(e.target.value);
                            if (errors.mileageKm) setErrors((err) => ({ ...err, mileageKm: '' }));
                          }}
                          placeholder="Masalan: 125000"
                          className={`w-full pl-9 pr-10 py-2 bg-slate-900 border ${
                            errors.mileageKm ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-700'
                          } rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition-all`}
                        />
                        <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs text-slate-500">
                          km
                        </span>
                      </div>
                      {errors.mileageKm && (
                        <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.mileageKm}
                        </p>
                      )}
                    </div>

                    {/* Moy Narxi - Mandatory */}
                    <div>
                      <label className="block text-xs font-medium text-amber-300 mb-1.5 flex items-center gap-1">
                        <Droplet className="w-3.5 h-3.5 text-amber-400" />
                        <span>Moy narxi (UZS) <span className="text-red-400 font-bold">*</span></span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          value={oilCostUzs}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOilCostUzs(val);
                            setCostUzs((Number(val) || 0) + (Number(partsCostUzs) || 0));
                            if (errors.oilCostUzs) setErrors((err) => ({ ...err, oilCostUzs: '' }));
                          }}
                          placeholder="Moy narxi"
                          className={`w-full px-3 py-2 bg-slate-900 border ${
                            errors.oilCostUzs ? 'border-red-500 ring-1 ring-red-500' : 'border-amber-800/60'
                          } rounded-xl text-sm text-amber-100 focus:outline-none focus:border-amber-500 transition-all`}
                        />
                      </div>
                      {errors.oilCostUzs && (
                        <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.oilCostUzs}
                        </p>
                      )}
                    </div>

                    {/* Zapchast Narxi - Mandatory */}
                    <div>
                      <label className="block text-xs font-medium text-blue-300 mb-1.5 flex items-center gap-1">
                        <Wrench className="w-3.5 h-3.5 text-blue-400" />
                        <span>Zapchast narxi (UZS) <span className="text-red-400 font-bold">*</span></span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          value={partsCostUzs}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPartsCostUzs(val);
                            setCostUzs((Number(oilCostUzs) || 0) + (Number(val) || 0));
                            if (errors.partsCostUzs) setErrors((err) => ({ ...err, partsCostUzs: '' }));
                          }}
                          placeholder="Zapchast narxi"
                          className={`w-full px-3 py-2 bg-slate-900 border ${
                            errors.partsCostUzs ? 'border-red-500 ring-1 ring-red-500' : 'border-blue-800/60'
                          } rounded-xl text-sm text-blue-100 focus:outline-none focus:border-blue-500 transition-all`}
                        />
                      </div>
                      {errors.partsCostUzs && (
                        <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.partsCostUzs}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Summary cost calculation badge */}
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Jami hisoblangan xizmat summasi:</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {((Number(oilCostUzs) || 0) + (Number(partsCostUzs) || 0)).toLocaleString('uz-UZ')} so'm
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Almashtirilgan Moy */}
            {isOilChanged && (
              <div className="space-y-2 p-3.5 rounded-2xl bg-amber-950/20 border border-amber-800/40 relative">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Droplet className="w-4 h-4 text-amber-400" />
                      <span>Almashtirilgan Moy</span> <span className="text-red-400 font-bold">*</span>
                    </label>
                    <span className="text-[11px] text-amber-400/80 font-normal">
                      Qo'lda yozing yoki ro'yxatdan tanlang
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {replacedOil && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplacedOil('');
                          setOilLimitNotice('');
                        }}
                        className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                        title="Tozalash"
                      >
                        Tozalash ✕
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsOilDropdownOpen(!isOilDropdownOpen);
                        setIsPartsDropdownOpen(false);
                        setIsRecDropdownOpen(false);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-xl border flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                        isOilDropdownOpen
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-amber-950/60 hover:bg-amber-900 text-amber-200 border-amber-800/80'
                      }`}
                    >
                      <span>📋 Ro'yxatdan tanlash ({selectedOilsArray.length}/2)</span>
                      {isOilDropdownOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Input field with keyboard typing support */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Edit3 className="w-4 h-4 text-amber-400/70" />
                  </div>
                  <input
                    type="text"
                    value={replacedOil}
                    onChange={(e) => {
                      setReplacedOil(e.target.value);
                      if (errors.replacedOil) setErrors((err) => ({ ...err, replacedOil: '' }));
                    }}
                    placeholder="Qo'lda yozing (masalan: Castrol 5W-40, ZIC X7) yoki o'ngdagi ro'yxatdan tanlang..."
                    className={`w-full pl-9 pr-10 py-2.5 bg-slate-900 border ${
                      errors.replacedOil ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-700 focus:border-amber-500'
                    } rounded-xl text-sm text-amber-200 placeholder-slate-500 focus:outline-none transition-all font-medium`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsOilDropdownOpen(!isOilDropdownOpen);
                      setIsPartsDropdownOpen(false);
                      setIsRecDropdownOpen(false);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-amber-400 hover:text-amber-300 cursor-pointer"
                    title="Moylar ro'yxatini ochish/yopish"
                  >
                    {isOilDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span>💡 Klaviaturada erkin qo'lda yozishingiz yoki o'ngdagi <b>«Ro'yxatdan tanlash»</b> tugmasidan foydalanishingiz mumkin</span>
                  {replacedOil && <span className="text-amber-400 font-mono font-bold">Kiritildi</span>}
                </div>

                {errors.replacedOil && (
                  <p className="mt-1 text-xs text-red-400 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.replacedOil}
                  </p>
                )}

                {/* Scrollable Dropdown Menu for Oils */}
                {isOilDropdownOpen && (
                  <div className="p-2.5 bg-slate-900 border border-amber-500/50 rounded-2xl shadow-2xl space-y-2 z-20 animate-fadeIn">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
                        <input
                          type="text"
                          value={oilSearchFilter}
                          onChange={(e) => setOilSearchFilter(e.target.value)}
                          placeholder="Moy nomini qidirish (Castrol, Mannol, 5W-30...)"
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                          autoFocus
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsOilDropdownOpen(false)}
                        className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        Yopish ✕
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
                      <span>Pastga scroll qilib tanlang (ko'pi bilan 2 xil):</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {selectedOilsArray.length}/2 tanlandi
                      </span>
                    </div>

                    {/* Notice if trying to pick 3rd */}
                    {oilLimitNotice && (
                      <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2 animate-fadeIn">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="font-medium">{oilLimitNotice}</span>
                      </div>
                    )}

                    {/* The scrollable list */}
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-800/60">
                      {filteredOilsList.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-500">
                          Moy topilmadi. Qidiruvni tozalang yoki yuqoridagi maydonga o'zingiz yozing.
                        </div>
                      ) : (
                        filteredOilsList.map((oil) => {
                          const isSelected = selectedOilsArray.some((o) => o.toLowerCase() === oil.toLowerCase());
                          const isLimitReached = selectedOilsArray.length >= 2 && !isSelected;
                          return (
                            <div
                              key={oil}
                              onClick={() => {
                                handleToggleOil(oil);
                              }}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                                  : isLimitReached
                                  ? 'opacity-40 hover:opacity-75 hover:bg-slate-800/50 text-slate-400'
                                  : 'hover:bg-amber-950/40 text-slate-200 hover:text-amber-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Droplet className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-amber-400'}`} />
                                <span>{oil}</span>
                              </div>
                              {isSelected ? (
                                <span className="flex items-center gap-1 text-[11px] font-bold">
                                  <Check className="w-4 h-4" /> Tanlangan
                                </span>
                              ) : isLimitReached ? (
                                <span className="text-[10px] text-slate-500 italic">
                                  2 ta to'lgan
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-500 opacity-60 hover:opacity-100">
                                  + Tanlash
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">
                        {selectedOilsArray.length === 2 ? "✓ 2 xil moy tanlandi" : "Yana moy tanlashingiz mumkin"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsOilDropdownOpen(false)}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                      >
                        Tayyor (Yopish)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Almashtirilgan Zapchastlar */}
            {isPartSold && (
              <div className="space-y-2 p-3.5 rounded-2xl bg-blue-950/20 border border-blue-800/40 relative">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-blue-400" />
                      <span>Sotilgan / Almashtirilgan Zapchast</span> <span className="text-red-400 font-bold">*</span>
                    </label>
                    <span className="text-[11px] text-blue-300/80 font-normal">
                      Qo'lda yozing yoki ro'yxatdan tanlang
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {replacedParts && (
                      <button
                        type="button"
                        onClick={() => setReplacedParts('')}
                        className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                        title="Tozalash"
                      >
                        Tozalash ✕
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsPartsDropdownOpen(!isPartsDropdownOpen);
                        setIsOilDropdownOpen(false);
                        setIsRecDropdownOpen(false);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-xl border flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                        isPartsDropdownOpen
                          ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/20'
                          : 'bg-blue-950/60 hover:bg-blue-900 text-blue-200 border-blue-800/80'
                      }`}
                    >
                      <span>📋 Ro'yxatdan tanlash ({combinedParts.length})</span>
                      {isPartsDropdownOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={2}
                    value={replacedParts}
                    onChange={(e) => {
                      setReplacedParts(e.target.value);
                      if (errors.replacedParts) setErrors((err) => ({ ...err, replacedParts: '' }));
                    }}
                    placeholder="Qo'lda yozing (masalan: Moy filter, Havo filter, Old kolodka) yoki o'ngdagi ro'yxatdan tanlang..."
                    className={`w-full p-2.5 bg-slate-900 border ${
                      errors.replacedParts ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-700 focus:border-blue-500'
                    } rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all font-medium`}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span>💡 Klaviaturada erkin qo'lda yozishingiz yoki o'ngdagi <b>«Ro'yxatdan tanlash»</b> tugmasidan foydalanishingiz mumkin</span>
                  {replacedParts && <span className="text-blue-400 font-mono font-bold">Kiritildi</span>}
                </div>

                {errors.replacedParts && (
                  <p className="mt-1 text-xs text-red-400 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.replacedParts}
                  </p>
                )}

                {/* Scrollable Dropdown Menu for Spare Parts */}
                {isPartsDropdownOpen && (
                  <div className="p-2.5 bg-slate-900 border border-blue-500/50 rounded-2xl shadow-2xl space-y-2 z-20 animate-fadeIn">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
                        <input
                          type="text"
                          value={partsSearchFilter}
                          onChange={(e) => setPartsSearchFilter(e.target.value)}
                          placeholder="Zapchast nomini qidirish (filter, kolodka, svecha...)"
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-blue-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          autoFocus
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPartsDropdownOpen(false)}
                        className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        Yopish ✕
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
                      <span>Pastga scroll qilib kerakli zapchastlarni tanlang:</span>
                      <span className="font-mono text-blue-400 font-bold">{filteredPartsList.length} ta zapchast</span>
                    </div>

                    {/* The scrollable list */}
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-800/60">
                      {filteredPartsList.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-500">
                          Zapchast topilmadi. Qidiruvni tozalang yoki yuqoridagi maydonga o'zingiz yozing.
                        </div>
                      ) : (
                        filteredPartsList.map((part) => {
                          const isSelected = replacedParts.toLowerCase().includes(part.toLowerCase());
                          return (
                            <div
                              key={part}
                              onClick={() => {
                                handleTogglePart(part);
                              }}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                                  : 'hover:bg-blue-950/40 text-slate-200 hover:text-blue-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Wrench className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-blue-400'}`} />
                                <span>{part}</span>
                              </div>
                              {isSelected ? (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-white">
                                  <Check className="w-4 h-4" /> Tanlangan
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-500 opacity-60 hover:opacity-100">
                                  + Qo'shish
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsPartsDropdownOpen(false)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
                      >
                        Tayyor (Yopish)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tavsiya va Rejadagi Zapchastlar */}
            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tavsiya va Rejadagi Zapchastlar (Ixtiyoriy)</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsRecDropdownOpen(!isRecDropdownOpen);
                    setIsOilDropdownOpen(false);
                    setIsPartsDropdownOpen(false);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-xl border flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                    isRecDropdownOpen
                      ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/20'
                      : 'bg-amber-950/50 hover:bg-amber-900/80 text-amber-300 border-amber-800/70'
                  }`}
                >
                  <span>Tavsiyalar ro'yxatidan tanlash ▾</span>
                  {isRecDropdownOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {isRecDropdownOpen && (
                <div className="p-2.5 bg-slate-900 border border-amber-600/50 rounded-2xl shadow-2xl space-y-2 z-20 animate-fadeIn">
                  <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
                    <span>Pastga scroll qilib tavsiya qilinadigan ishni bosing:</span>
                    <button
                      type="button"
                      onClick={() => setIsRecDropdownOpen(false)}
                      className="px-2 py-0.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors cursor-pointer"
                    >
                      Yopish ✕
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-800/60">
                    {POPULAR_RECOMMENDATIONS.map((rec) => {
                      const isSelected = partsToReplace.toLowerCase().includes(rec.toLowerCase());
                      return (
                        <div
                          key={rec}
                          onClick={() => handleAppendToReplace(rec)}
                          className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-500/30 text-amber-200 font-semibold'
                              : 'hover:bg-amber-950/40 text-slate-300 hover:text-amber-200'
                          }`}
                        >
                          <span>{rec}</span>
                          <span className="text-[11px] text-amber-400 font-bold">{isSelected ? '✓ Qo\'shilgan' : '+ Qo\'shish'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <textarea
                rows={2}
                value={partsToReplace}
                onChange={(e) => setPartsToReplace(e.target.value)}
                placeholder="Masalan: Orqa amortizator, Remen GRM (130,000 km da), Dinamo podshipnik"
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>

            {/* Qo'shimcha Izoh (Ixtiyoriy) */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Qo'shimcha Izoh (Ixtiyoriy)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Kafolat muddati yoki usta eslatmasi"
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            {/* O'rtacha Kelish Oralig'i (Ixtiyoriy: 1 hafta, 2 hafta, 3 hafta, 1 oy, 2 oy, 3 oy yoki qo'lda kun) */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800/90 rounded-2xl space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Mijozning O'rtacha Kelish Oralig'i (Ixtiyoriy):</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {visitIntervalDays ? (
                    <span className="text-emerald-400 font-bold">{visitIntervalDays} kundan oshganda vaqti kelgan deb hisoblanadi</span>
                  ) : (
                    'Standart: 30 kun'
                  )}
                </span>
              </div>

              {/* Interval Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { days: 7, label: "1 haftada bir (7 kun)" },
                  { days: 14, label: "2 haftada bir (14 kun)" },
                  { days: 21, label: "3 haftada bir (21 kun)" },
                  { days: 30, label: "1 oyda bir (30 kun)" },
                  { days: 60, label: "2 oyda bir (60 kun)" },
                  { days: 90, label: "3 oyda bir (90 kun)" },
                ].map((preset) => {
                  const isSelected = !isCustomInterval && visitIntervalDays === preset.days;
                  return (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setVisitIntervalDays('');
                        } else {
                          setIsCustomInterval(false);
                          setVisitIntervalDays(preset.days);
                          setCustomIntervalInput('');
                        }
                      }}
                      className={`text-xs px-2.5 py-1.5 rounded-xl border font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-md shadow-blue-600/30'
                          : 'bg-slate-900 border-slate-750 text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}

                {/* Custom Days Input Toggle Button */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !isCustomInterval;
                    setIsCustomInterval(next);
                    if (next && customIntervalInput) {
                      setVisitIntervalDays(Number(customIntervalInput));
                    }
                  }}
                  className={`text-xs px-2.5 py-1.5 rounded-xl border font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    isCustomInterval
                      ? 'bg-indigo-600 border-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900 border-slate-750 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>✏️ Qo'lda kun kiritish</span>
                </button>

                {visitIntervalDays !== '' && (
                  <button
                    type="button"
                    onClick={() => {
                      setVisitIntervalDays('');
                      setIsCustomInterval(false);
                      setCustomIntervalInput('');
                    }}
                    className="text-[11px] px-2 py-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-all cursor-pointer ml-auto"
                    title="Oraliqni tozalash"
                  >
                    Tozalash ✕
                  </button>
                )}
              </div>

              {/* Custom Interval Input */}
              {isCustomInterval && (
                <div className="flex items-center gap-2 pt-1 animate-fadeIn">
                  <span className="text-xs text-indigo-300 font-medium">Kunlar soni:</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={customIntervalInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomIntervalInput(val);
                      setVisitIntervalDays(val ? Number(val) : '');
                    }}
                    placeholder="Masalan: 45"
                    className="w-32 px-3 py-1.5 bg-slate-900 border border-indigo-500/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-indigo-300 font-medium">kun</span>
                  <span className="text-[11px] text-slate-500">
                    (Mijoz necha kunda bir moy almashtirishga kelishi kutiladi)
                  </span>
                </div>
              )}
            </div>

            {/* Selected Existing Customer Service History (Pastda Barcha Tarixi) */}
            {customerPastHistory.length > 0 && (
              <div className="p-4 bg-slate-950/90 border border-blue-900/60 rounded-2xl space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                      <History className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Mijozning Barcha Xizmatlar Tarixi:</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold border border-blue-500/30">
                          {customerPastHistory.length} ta xizmat
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Tanlangan avtomobil uchun bazada mavjud barcha yozuvlar
                      </p>
                    </div>
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-800/80">
                  {customerPastHistory.map((h, i) => (
                    <div key={h.id || i} className="pt-2 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-200 flex items-center gap-2">
                          <span className="font-mono text-slate-500">#{i + 1}</span>
                          <span className="text-white font-medium">{new Date(h.createdAt).toLocaleDateString('uz-UZ')}</span>
                          {h.mileageKm ? (
                            <span className="font-mono text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                              {Number(h.mileageKm).toLocaleString('uz-UZ')} km
                            </span>
                          ) : null}
                          {h.visitIntervalDays ? (
                            <span className="text-[10px] text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/50">
                              Oraliq: {h.visitIntervalDays} kun
                            </span>
                          ) : null}
                        </span>
                        <span className="font-mono font-bold text-emerald-400">
                          {h.costUzs ? `${Number(h.costUzs).toLocaleString('uz-UZ')} so'm` : '0 so\'m'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Quyilgan Moy:</span>
                          <span className="text-amber-300 font-medium">{h.replacedOil || '—'}</span>
                          {h.oilCostUzs ? (
                            <span className="text-[10px] text-amber-400/80 block font-mono">
                              ({Number(h.oilCostUzs).toLocaleString('uz-UZ')} so'm)
                            </span>
                          ) : null}
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">O'rnatilgan Zapchast:</span>
                          <span className="text-blue-300 font-medium">{h.replacedParts || '—'}</span>
                          {h.partsCostUzs ? (
                            <span className="text-[10px] text-blue-400/80 block font-mono">
                              ({Number(h.partsCostUzs).toLocaleString('uz-UZ')} so'm)
                            </span>
                          ) : null}
                        </div>
                        {h.partsToReplace && (
                          <div className="col-span-full pt-1 border-t border-slate-800/50">
                            <span className="text-amber-400 text-[10px] block font-semibold">Tavsiya qilingan zapchast:</span>
                            <span className="text-amber-300">{h.partsToReplace}</span>
                          </div>
                        )}
                        {h.notes && (
                          <div className="col-span-full text-slate-400 italic text-[10px]">
                            Izoh: {h.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{initialData ? "Saqlash" : "Bazaga Qo'shish"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

