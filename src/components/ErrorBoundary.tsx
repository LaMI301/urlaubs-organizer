import React, { Component } from 'react';
import { AlertTriangle, RotateCcw, Trash2, RefreshCw, ShieldAlert } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  confirmStorageReset: boolean;
}

const APP_LOCAL_STORAGE_KEYS = [
  'vacayly_saved_trips_v1',
  'vacayly_active_trip_id_v1',
  'vacayly_current_user_id_v1',
  'vacation_organizer_access_key_v1',
  'vacation_organizer_unlocked_v1',
  'vo_geo_cache_v1',
  'vo_sidebar_collapsed',
  'vo_calendar_collapsed',
  'vo_show_bento_cards',
];

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      confirmStorageReset: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unbekannter Render-Fehler',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Vacation Organizer ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleRetryRender = (): void => {
    this.setState({
      hasError: false,
      errorMessage: '',
      confirmStorageReset: false,
    });
  };

  private handleSafeStorageReset = (): void => {
    try {
      APP_LOCAL_STORAGE_KEYS.forEach((key) => {
        window.localStorage?.removeItem(key);
      });
      window.sessionStorage?.removeItem('vacation_organizer_welcome_done_v1');
    } catch {
      // Ignore storage permission errors during recovery
    }
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="aurora-canvas min-h-screen w-full flex items-center justify-center p-4 sm:p-6 text-slate-100 relative overflow-hidden">
        {/* Ambient Midnight Aurora Glows */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-28 -left-24 w-80 h-80 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="absolute bottom-0 -right-24 w-96 h-96 rounded-full bg-violet-500/15 blur-3xl" />
        </div>

        <div
          role="alert"
          className="aurora-glass-elevated relative z-10 w-full max-w-lg rounded-[28px] p-6 sm:p-8 space-y-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-400/30 text-rose-300 flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(244,63,94,0.2)]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                <ShieldAlert className="w-3 h-3" />
                Schutzmodus aktiv
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-100 mt-1.5">
                Etwas ist schiefgelaufen
              </h1>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                Die Ansicht konnte gerade nicht sauber dargestellt werden. Deine gespeicherten
                Urlaubsdaten bleiben dabei geschützt.
              </p>
            </div>
          </div>

          {this.state.errorMessage && (
            <div className="rounded-2xl bg-[#0B0E14]/80 border border-white/10 p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Fehlerdetails
              </p>
              <p className="font-mono tabular-nums text-xs text-rose-300 break-words max-h-28 overflow-y-auto">
                {this.state.errorMessage}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={this.handleReload}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-cyan-400 hover:bg-cyan-300 text-[#0B0E14] font-extrabold text-sm shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>App neu laden</span>
            </button>

            <button
              type="button"
              onClick={this.handleRetryRender}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-slate-100 font-bold text-sm transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-cyan-300" />
              <span>Erneut versuchen</span>
            </button>
          </div>

          <div className="pt-4 border-t border-white/10">
            {!this.state.confirmStorageReset ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs text-slate-400">
                  Tritt der Fehler dauerhaft wegen beschädigter lokaler Daten auf?
                </span>
                <button
                  type="button"
                  onClick={() => this.setState({ confirmStorageReset: true })}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 self-start sm:self-auto cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Lokalen Cache zurücksetzen</span>
                </button>
              </div>
            ) : (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-400/25 p-3.5 space-y-3">
                <p className="text-xs text-rose-200 leading-relaxed">
                  Achtung: Dabei werden lokal zwischengespeicherte Reisen und Einstellungen in diesem
                  Browser entfernt und die App frisch geladen.
                </p>
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => this.setState({ confirmStorageReset: false })}
                    className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={this.handleSafeStorageReset}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-500 hover:bg-rose-400 text-white text-xs font-extrabold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ja, sicher zurücksetzen</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
