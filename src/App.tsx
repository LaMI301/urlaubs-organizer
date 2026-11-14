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
    selectedDay,
    trip.totalDays,
    setMapOpen,
    setIsQuickAddOpen,
    setSelectedDay,
  ]);

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
        <div className="surface-canvas relative min-h-screen w-full max-w-full overflow-x-clip p-2.5 sm:p-4 md:p-5 pb-24 lg:pb-5 text-[#1F1B18] font-sans">
          {/* Subtle Ambient Warm Glow Blobs */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#C85A38]/8 rounded-full blur-3xl" />
            <div className="absolute top-1/4 -right-32 w-[28rem] h-[28rem] bg-[#6E7F5E]/8 rounded-full blur-3xl" />
            <div className="absolute -bottom-32 left-1/4 w-[28rem] h-[28rem] bg-[#2A7B88]/7 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#D9822B]/8 rounded-full blur-3xl" />
          </div>

          {/* Testmodus Banner */}
          {trip.isDemo && (
            <div className="surface-glass relative z-10 w-full max-w-[1680px] mx-auto mb-3 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border border-[#D9822B]/30">
              <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm min-w-0 w-full sm:w-auto">
                <span className="inline-flex items-center gap-1.5 bg-[#D9822B]/15 border border-[#D9822B]/35 text-[#9E5A14] font-bold px-2.5 py-0.5 rounded-full text-xs shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                  Testmodus
                </span>
                <span className="text-[#1F1B18] font-medium truncate">
                  <strong>{trip.title}</strong> (Beispielwerte zum Ausprobieren)
                </span>
                {isSyncing && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#2A7B88] ml-1 shrink-0">
                    <Cloud className="w-3 h-3 animate-pulse" /> Speichert…
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={resetDemoTrip}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#F3ECE1] hover:bg-[#E6DDD1] border border-[#DDD2C3] text-[#1F1B18] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                  title="Alle Beispielwerte von Mallorca 2026 auf Anfang zurücksetzen"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#D9822B]" />
                  <span>Reset Demo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewTripModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold bg-[#C85A38] hover:bg-[#B54B2B] text-white px-3.5 py-1.5 rounded-full transition-colors cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Eigenen Urlaub erstellen</span>
                </button>
              </div>
            </div>
          )}

          {/* Main Dashboard Shell */}
          <div
            className={`surface-glass relative z-10 w-full max-w-[1680px] mx-auto rounded-[28px] md:rounded-[34px] p-2.5 sm:p-4 md:p-5 grid grid-cols-1 ${gridColumnsClass} gap-4 lg:gap-5 min-h-[calc(100vh-2.5rem)] transition-all duration-200`}
          >
            {/* Left Navigation Column (Desktop Rail + Mobile Bars/Drawer) */}
            <Sidebar
              collapsed={isSidebarCollapsed}
              onToggleCollapse={toggleSidebar}
            />

            {/* Center Main Content Column */}
            <main className="flex flex-col gap-4 min-w-0 w-full">
              <TopBar
                spotlightTrigger={spotlightTrigger}
                escapeTrigger={escapeTrigger}
              />
              <div className="flex-1 min-w-0">{renderMainContent()}</div>
            </main>

            {/* Expandable Map-First Split Cockpit (Desktop Split-Screen / Mobile Slide-Over Drawer) */}
            {mapOpen && (
              <div
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) {
                    setMapOpen(false);
                  }
                }}
                className="fixed inset-0 z-50 bg-[#1F1B18]/45 backdrop-blur-sm p-3 flex flex-col lg:static lg:inset-auto lg:z-auto lg:bg-transparent lg:backdrop-blur-none lg:p-0 lg:block min-w-0"
              >
                <div className="h-full w-full lg:h-[calc(100vh-3.5rem)] lg:sticky lg:top-5">
                  <MapCockpitPanel />
                </div>
              </div>
            )}

            {/* Right Calendar & Timeline Column */}
            <div className={mapOpen ? 'lg:hidden 2xl:block min-w-0' : 'min-w-0'}>
              <RightCalendarPanel
                collapsed={isCalendarCollapsed}
                onToggleCollapse={toggleCalendar}
              />
            </div>
          </div>

          <QuickAddModal />
        </div>
      </AccessAndWelcomeGate>

      {/* Rendered outside AccessAndWelcomeGate so Welcome Gate stays open if user cancels */}
      <NewTripModal />

      {/* Global Toast & 5s Undo Viewport */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-5 right-3 sm:right-5 z-[70] flex flex-col gap-2 w-[calc(100vw-1.5rem)] max-w-sm pointer-events-none"
        >
          {toasts.map((toast) => {
            const meta = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
            const Icon = meta.icon;
            return (
              <div
                key={toast.id}
                role="status"
                className={`surface-glass-elevated pointer-events-auto rounded-2xl px-3.5 py-3 border ${meta.border} flex items-center justify-between gap-2.5 animate-fade-in`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Icon className={`w-4 h-4 shrink-0 ${meta.iconColor}`} />
                  <span className="text-xs font-semibold text-[#1F1B18] leading-snug break-words">
                    {toast.message}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {toast.canUndo && (
                    <button
                      type="button"
                      onClick={undoLastDelete}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#C85A38] hover:bg-[#B54B2B] text-white text-[11px] font-extrabold transition-colors cursor-pointer"
                    >
                      <Undo2 className="w-3 h-3" />
                      <span>Rückgängig</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    aria-label="Hinweis schließen"
                    className="w-6 h-6 rounded-full hover:bg-[#E6DDD1] text-[#6B6259] hover:text-[#1F1B18] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
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
