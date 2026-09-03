import * as React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught React ErrorBoundary exception:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCacheAndReload = () => {
    try {
      localStorage.removeItem('daewoo_nargiz_records_v1');
      localStorage.removeItem('daewoo_nargiz_auth_state_v1');
    } catch (e) {
      console.warn('Failed to clear localStorage', e);
    }
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 bg-red-950/80 border border-red-800 text-red-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white">Tizimda Kutilmagan Xatolik Yuz Berdi</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dastur xavfsiz holatda to'xtatildi. Ma'lumotlaringiz Firestore bulutida saqlangan va yo'qolmagan.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-950 rounded-xl border border-red-900/50 text-left overflow-x-auto max-h-32 text-[11px] font-mono text-red-300">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Sahifani Qayta Yuklash</span>
              </button>

              <button
                onClick={this.handleClearCacheAndReload}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Lokal Keshlarni Tozalash va Kirish</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
