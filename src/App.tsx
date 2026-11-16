import React, { useEffect, useState } from 'react';
import { VacationProvider, useVacation } from './context/VacationContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { IdeasPoolView } from './components/IdeasPoolView';
import { ScheduleView, QuickAddModal } from './components/ScheduleView';
import { WeekOverviewView } from './components/WeekOverviewView';
import { MealsView } from './components/MealsView';
import { PollsView, TasksView, BudgetView } from './components/PollsAndTasksView';
import { RightCalendarPanel } from './components/RightCalendarPanel';
import { MapCockpitPanel } from './components/MapCockpitPanel';
import { NewTripModal } from './components/NewTripModal';
import { AccessAndWelcomeGate } from './components/AccessAndWelcomeGate';
import {
  Sparkles,
  Plus,
  RotateCcw,
  Cloud,
  Undo2,
  X,
  CheckCircle2,
  Info,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { ToastType } from './types/vacation';

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('[contenteditable="true"]'));
}

function getGridColumnsClass(
  sidebarCollapsed: boolean,
  calendarCollapsed: boolean,
  mapOpen: boolean
): string {
  if (!mapOpen) {
    if (sidebarCollapsed && calendarCollapsed) {
      return 'lg:grid-cols-[72px_minmax(0,1fr)_58px]';
    }
    if (sidebarCollapsed && !calendarCollapsed) {
      return 'lg:grid-cols-[72px_minmax(0,1fr)_310px]';
    }
    if (!sidebarCollapsed && calendarCollapsed) {
      return 'lg:grid-cols-[240px_minmax(0,1fr)_58px]';
    }
    return 'lg:grid-cols-[240px_minmax(0,1fr)_310px]';
  }

  if (sidebarCollapsed && calendarCollapsed) {
    return 'lg:grid-cols-[72px_minmax(0,1fr)_380px] xl:grid-cols-[72px_minmax(0,1fr)_410px] 2xl:grid-cols-[72px_minmax(0,1fr)_410px_58px]';
  }
  if (sidebarCollapsed && !calendarCollapsed) {
    return 'lg:grid-cols-[72px_minmax(0,1fr)_380px] xl:grid-cols-[72px_minmax(0,1fr)_410px] 2xl:grid-cols-[72px_minmax(0,1fr)_410px_300px]';
  }
  if (!sidebarCollapsed && calendarCollapsed) {
    return 'lg:grid-cols-[240px_minmax(0,1fr)_380px] xl:grid-cols-[240px_minmax(0,1fr)_410px] 2xl:grid-cols-[240px_minmax(0,1fr)_410px_58px]';
  }
  return 'lg:grid-cols-[240px_minmax(0,1fr)_380px] xl:grid-cols-[240px_minmax(0,1fr)_410px] 2xl:grid-cols-[240px_minmax(0,1fr)_410px_300px]';
}

const TOAST_STYLES: Record<
  ToastType,
  { border: string; icon: React.FC<{ className?: string }>; iconColor: string }
> = {
  success: {
    border: 'border-[#6E7F5E]/40',
    icon: CheckCircle2,
    iconColor: 'text-[#4E5F40]',
  },
  info: {
    border: 'border-[#2A7B88]/40',
    icon: Info,
    iconColor: 'text-[#2A7B88]',
  },
  warning: {
    border: 'border-[#D9822B]/40',
    icon: AlertTriangle,
    iconColor: 'text-[#D9822B]',
  },
  error: {
    border: 'border-rose-500/40',
    icon: AlertCircle,
    iconColor: 'text-rose-600',
  },
};

const AppShell: React.FC = () => {
  const {
    trip,
    activeTab,
    selectedDay,
    setSelectedDay,
    isUnlocked,
    isWelcomeOpen,
    isNewTripModalOpen,
    isQuickAddOpen,
    setIsNewTripModalOpen,
    setIsQuickAddOpen,
    resetDemoTrip,
    isSyncing,
    mapOpen,
    setMapOpen,
    toasts,
    dismissToast,
    undoLastDelete,
  } = useVacation();

  const [spotlightTrigger, setSpotlightTrigger] = useState(0);
  const [escapeTrigger, setEscapeTrigger] = useState(0);
  const [mobileCalendarOpen, setMobileCalendarOpen] = useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vo_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vo_calendar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vo_sidebar_collapsed', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const toggleCalendar = () => {
    setIsCalendarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vo_calendar_collapsed', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // Global Keyboard Shortcuts: Cmd/Ctrl+K, N, ArrowLeft/ArrowRight, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isUnlocked) return;

      if (e.key === 'Escape') {
        setEscapeTrigger((c) => c + 1);
        if (mobileCalendarOpen && !isNewTripModalOpen && !isQuickAddOpen) {
          setMobileCalendarOpen(false);
          return;
        }
        if (
          typeof window !== 'undefined' &&
          window.innerWidth < 1024 &&
          mapOpen &&
          !isNewTripModalOpen &&
          !isQuickAddOpen
        ) {
          setMapOpen(false);
        }
        return;
      }

      if (isWelcomeOpen || isNewTripModalOpen || isQuickAddOpen) return;

      // Cmd/Ctrl + K opens Spotlight Search
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.altKey &&
        e.key.toLowerCase() === 'k'
      ) {
        e.preventDefault();
        setSpotlightTrigger((c) => c + 1);
        return;
      }

      // Remaining shortcuts only outside inputs and open modal dialogs
      if (isEditableElement(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsQuickAddOpen(true);
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedDay(Math.max(1, selectedDay - 1));
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedDay(Math.min(trip.totalDays || 1, selectedDay + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isUnlocked,
    isWelcomeOpen,
    isNewTripModalOpen,
    isQuickAddOpen,
    mapOpen,
    mobileCalendarOpen,
    selectedDay,
    trip.totalDays,
    setMapOpen,
    setIsQuickAddOpen,
    setSelectedDay,
  ]);

  const isNetlifyPublicHost =
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('.netlify.app');

  const gridColumnsClass = getGridColumnsClass(
    isSidebarCollapsed,
    isCalendarCollapsed,
    mapOpen
  );

  const renderMainContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'ideas':
        return <IdeasPoolView />;
      case 'schedule':
        return <ScheduleView />;
      case 'week':
        return <WeekOverviewView />;
      case 'meals':
        return <MealsView />;
      case 'polls':
        return <PollsView />;
      case 'tasks':
        return <TasksView />;
      case 'budget':
        return <BudgetView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <>
      <AccessAndWelcomeGate>
        <div
          className={`surface-canvas relative min-h-[100dvh] w-full max-w-full overflow-x-clip p-2 sm:p-4 md:p-5 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] sm:pt-4 md:pt-5 ${
            isNetlifyPublicHost
              ? 'pb-[calc(9.5rem+env(safe-area-inset-bottom,0px))] sm:pb-16 md:pb-16'
              : 'pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:pb-14 md:pb-14'
          } text-[#1F1B18] font-sans`}
        >
          {/* Subtle Ambient Warm Glow Blobs */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#C85A38]/8 rounded-full blur-3xl" />
            <div className="absolute top-1/4 -right-32 w-[28rem] h-[28rem] bg-[#6E7F5E]/8 rounded-full blur-3xl" />
            <div className="absolute -bottom-32 left-1/4 w-[28rem] h-[28rem] bg-[#2A7B88]/7 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#D9822B]/8 rounded-full blur-3xl" />
          </div>

          {/* Testmodus Banner (Ultra-compact single row on <sm) */}
          {trip.isDemo && (
            <div className="surface-glass relative z-10 w-full max-w-[1680px] mx-auto mb-2 sm:mb-3 rounded-2xl px-2.5 py-1.5 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2 border border-[#D9822B]/30">
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs md:text-sm min-w-0 flex-1">
                <span className="inline-flex items-center gap-1 bg-[#D9822B]/15 border border-[#D9822B]/35 text-[#9E5A14] font-bold px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs shrink-0">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="sm:hidden">Demo</span>
                  <span className="hidden sm:inline">Testmodus</span>
                </span>
                <span className="text-[#1F1B18] font-medium truncate">
                  <strong>{trip.title}</strong>
                  <span className="hidden md:inline text-[#6B6259]">
                    {' '}
                    (Beispielwerte zum Ausprobieren)
                  </span>
                </span>
                {isSyncing && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#2A7B88] ml-1 shrink-0">
                    <Cloud className="w-3 h-3 animate-pulse" /> Speichert…
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={resetDemoTrip}
                  className="min-h-[38px] sm:min-h-0 inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold bg-[#F3ECE1] hover:bg-[#E6DDD1] border border-[#DDD2C3] text-[#1F1B18] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors cursor-pointer"
                  title="Alle Beispielwerte von Mallorca 2026 auf Anfang zurücksetzen"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#D9822B]" />
                  <span className="sm:hidden">Reset</span>
                  <span className="hidden sm:inline">Reset Demo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewTripModalOpen(true)}
                  className="min-h-[38px] sm:min-h-0 inline-flex items-center gap-1 text-[11px] sm:text-xs font-extrabold bg-[#C85A38] hover:bg-[#B54B2B] text-white px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full transition-colors cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="sm:hidden">Eigener</span>
                  <span className="hidden sm:inline">Eigenen Urlaub erstellen</span>
                </button>
              </div>
            </div>
          )}

          {/* Main Dashboard Shell (1-col Phone, 72px-rail Tablet sm..lg, Multi-pane Desktop lg+) */}
          <div
            className={`bg-white/90 border border-[#E6DDD1] shadow-[0_10px_30px_-12px_rgba(31,27,24,0.10)] relative z-10 w-full max-w-[1680px] mx-auto rounded-[24px] sm:rounded-[28px] md:rounded-[34px] p-2 sm:p-4 md:p-5 grid grid-cols-1 sm:grid-cols-[72px_minmax(0,1fr)] ${gridColumnsClass} gap-3 sm:gap-4 lg:gap-5 min-h-[calc(100dvh-7rem)] sm:min-h-[calc(100dvh-2.5rem)] transition-all duration-200`}
          >
            {/* Left Navigation Column (Phone Bottom Nav/Sheet + Tablet 72px Rail + Desktop Collapsible Sidebar) */}
            <Sidebar
              collapsed={isSidebarCollapsed}
              onToggleCollapse={toggleSidebar}
              onOpenMobileCalendar={() => setMobileCalendarOpen(true)}
            />

            {/* Center Main Content Column (.main-pane enables CSS Container Queries) */}
            <main className="main-pane flex flex-col gap-3 sm:gap-4 min-w-0 w-full">
              <TopBar
                spotlightTrigger={spotlightTrigger}
                escapeTrigger={escapeTrigger}
                onOpenMobileCalendar={() => setMobileCalendarOpen(true)}
              />
              <div className="flex-1 min-w-0">{renderMainContent()}</div>
            </main>

            {/* Expandable Map-First Split Cockpit (Desktop Split-Screen / <lg Full 100dvh Overlay) */}
            {mapOpen && (
              <div
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) {
                    setMapOpen(false);
                  }
                }}
                className="fixed inset-0 z-50 bg-[#1F1B18]/45 backdrop-blur-sm p-0 pb-safe sm:p-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom,0px))] flex flex-col lg:static lg:inset-auto lg:z-auto lg:bg-transparent lg:backdrop-blur-none lg:p-0 lg:pb-0 lg:block min-w-0"
              >
                <div className="h-[100dvh] sm:h-full w-full lg:h-[calc(100dvh-5.25rem)] lg:sticky lg:top-5">
                  <MapCockpitPanel />
                </div>
              </div>
            )}

            {/* Right Calendar & Timeline Column (Desktop >=lg when !mapOpen, or >=2xl when mapOpen) */}
            <div className={mapOpen ? 'hidden 2xl:block min-w-0' : 'hidden lg:block min-w-0'}>
              <RightCalendarPanel
                collapsed={isCalendarCollapsed}
                onToggleCollapse={toggleCalendar}
              />
            </div>
          </div>

          {/* Calendar Bottom Sheet / Drawer (<lg always, and lg..xl when mapOpen hides docked calendar) */}
          {mobileCalendarOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Kalender und Tagesablauf"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                  setMobileCalendarOpen(false);
                }
              }}
              className={`${
                mapOpen ? '2xl:hidden' : 'lg:hidden'
              } fixed inset-0 z-50 bg-[#1F1B18]/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4`}
            >
              <div className="mobile-sheet w-full sm:max-w-lg max-h-[90dvh] h-[88dvh] sm:h-auto sm:max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-[28px] overflow-hidden shadow-2xl pb-safe bg-[#FAF7F2] border-t sm:border border-[#DDD2C3]">
                <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-[#FAF7F2] shrink-0">
                  <div className="w-10 h-1 rounded-full bg-[#DDD2C3]" />
                </div>
                <RightCalendarPanel
                  collapsed={false}
                  onCloseSheet={() => setMobileCalendarOpen(false)}
                />
              </div>
            </div>
          )}

          <QuickAddModal />
        </div>
      </AccessAndWelcomeGate>

      {/* Rendered outside AccessAndWelcomeGate so Welcome Gate stays open if user cancels */}
      <NewTripModal />

      {/* Global Toast & 5s Undo Viewport */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className={`fixed ${
            isNetlifyPublicHost
              ? 'bottom-[calc(8.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-16'
              : 'bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-14'
          } right-3 sm:right-5 z-[70] flex flex-col gap-2 w-[calc(100vw-1.5rem)] max-w-sm pointer-events-none`}
        >
          {toasts.map((toast) => {
            const meta = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
            const Icon = meta.icon;
            return (
              <div
                key={toast.id}
                role="status"
                className={`surface-glass-elevated pointer-events-auto rounded-2xl px-3.5 py-2.5 sm:py-3 border ${meta.border} flex items-center justify-between gap-2 animate-fade-in`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Icon className={`w-4 h-4 shrink-0 ${meta.iconColor}`} />
                  <span className="text-xs font-semibold text-[#1F1B18] leading-snug break-words">
                    {toast.message}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {toast.canUndo && (
                    <button
                      type="button"
                      onClick={undoLastDelete}
                      className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1 px-3 sm:px-2.5 py-2 sm:py-1 rounded-full bg-[#C85A38] hover:bg-[#B54B2B] text-white text-xs sm:text-[11px] font-extrabold transition-colors cursor-pointer"
                    >
                      <Undo2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      <span>Rückgängig</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    aria-label="Hinweis schließen"
                    className="w-11 h-11 sm:w-7 sm:h-7 rounded-full hover:bg-[#E6DDD1] text-[#6B6259] hover:text-[#1F1B18] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export function App() {
  return (
    <VacationProvider>
      <AppShell />
    </VacationProvider>
  );
}

export default App;
