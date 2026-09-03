import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Wifi, WifiOff, RefreshCw, Share, HelpCircle, Info } from 'lucide-react';

interface PWAInstallBarProps {
  isOnline: boolean;
  offlineRecordsCount: number;
  onSyncAll: () => void;
}

export const PWAInstallBar: React.FC<PWAInstallBarProps> = ({
  isOnline,
  offlineRecordsCount,
  onSyncAll,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showPWAInfo, setShowPWAInfo] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIphoneOrIpad = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIphoneOrIpad);

    // Capture PWA install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(!showIOSGuide);
    }
  };

  return (
    <div className="bg-slate-900/95 border-b border-slate-800 text-xs py-2.5 shadow-inner">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        {/* Network & Offline Status */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isOnline ? (
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-800/60">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>Internet: Online 🟢</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-400 font-bold bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-800 animate-pulse">
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Internet Yo'q: Offline Rejim 🔴</span>
            </div>
          )}

          {/* Unsynced Records Alert */}
          {offlineRecordsCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/40 flex items-center gap-1">
                ⚡ {offlineRecordsCount} ta offline yozuv
              </span>
              <button
                onClick={onSyncAll}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer ${
                  isOnline
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-amber-900/80 hover:bg-amber-800 text-amber-200 border border-amber-700'
                }`}
                title={isOnline ? "Sinxronlash" : "Internet yo'q (Offline rejim)"}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${!isOnline ? 'text-amber-400' : 'animate-spin-slow'}`} />
                <span>{isOnline ? "Sinxronlash 🟢" : "Sinxronlash (Offline) ⚠️"}</span>
              </button>
            </div>
          )}

          {/* Info Button explaining PWA storage & sync */}
          <button
            onClick={() => setShowPWAInfo(true)}
            className="text-slate-400 hover:text-blue-300 flex items-center gap-1 text-[11px] font-medium underline underline-offset-2 ml-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>PWA & Baza Haqida</span>
          </button>
        </div>

        {/* PWA Install Button for Android / iOS */}
        {!isInstalled && (
          <div className="flex items-center gap-2">
            {(deferredPrompt || isIOS) && (
              <button
                onClick={handleInstallPWA}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer transition-all"
              >
                <Smartphone className="w-4 h-4 text-blue-200" />
                <span>Ilovani Telefoningizga O'rnatish</span>
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* PWA Storage & Sync Explanation Modal */}
        {showPWAInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 text-slate-200">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">PWA va Veb-sayt Sinxronlash Haqida</h3>
                  <p className="text-xs text-slate-400">Mobil ilova va xotira ishlashi</p>
                </div>
              </div>

              <div className="text-xs space-y-2.5 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <p>
                  📱 <strong>Nega telefon PWA ilovasida qo'shilganlar offlaynda saqlanadi?</strong><br />
                  PWA ilovangiz internet bo'lmagan holatda ham (garaj yoki servislarda) to'liq ishlashi uchun barcha ma'lumotlarni bevosita telefoningiz xotirasiga saqlaydi.
                </p>
                <p>
                  🔴 <strong>Offline rejimda "Sinxronlash" bosilsa:</strong><br />
                  Agar hali ham internetingiz o'chiq bo'lsa, tizim <strong>"Offline"</strong> holatini saqlab turadi va ma'lumot o'chib ketmaydi.
                </p>
                <p>
                  🟢 <strong>Internet (Online) bo'lganda:</strong><br />
                  Internet ulangan zahoti barcha offline yozuvlar avtomatik sinxronlanadi va "Sinxronlash" tugmasini bosib tasdiqlashingiz mumkin!
                </p>
                <p>
                  💻 <strong>Boshqa kompyuterga ma'lumot o'tkazish:</strong><br />
                  Telefoningizdagi ma'lumotlarni kompyuterga ko'chirish uchun menyudagi <strong>"Baza Zaxirasi" (JSON Export)</strong> orqali 1 soniyada yuklab olishingiz mumkin.
                </p>
              </div>

              <button
                onClick={() => setShowPWAInfo(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Tushundim
              </button>
            </div>
          </div>
        )}

        {/* iOS Instruction Modal / Banner */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto">
                <Share className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">iPhone / iPad ga O'rnatish:</h3>
              <ol className="text-xs text-slate-300 text-left space-y-2 list-decimal list-inside bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <li>Safari brauzerida pastdagi <strong>Ulashish (Share 📤)</strong> tugmasini bosing.</li>
                <li>Menyudan <strong>"Bosh ekranga qo'shish" (Add to Home Screen ➕)</strong> bo'limini tanlang.</li>
                <li>Yuqoridagi <strong>"Qo'shish"</strong> tugmasini bosing va ilovadan offline foydalaning!</li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Tushundim
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

