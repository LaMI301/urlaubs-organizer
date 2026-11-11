import React from 'react';
import { VacationProvider, useVacation } from './context/VacationContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { ScheduleView, QuickAddModal } from './components/ScheduleView';
import { MealsView } from './components/MealsView';
import { PollsView, TasksView, BudgetView } from './components/PollsAndTasksView';
import { RightCalendarPanel } from './components/RightCalendarPanel';
import { NewTripModal } from './components/NewTripModal';
import { Sparkles, Plus, RotateCcw, Cloud } from 'lucide-react';

const AppShell: React.FC = () => {
  const {
    trip,
    activeTab,
    setIsNewTripModalOpen,
    resetDemoTrip,
    isSyncing,
  } = useVacation();

  const renderMainContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'schedule':
        return <ScheduleView />;
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
    <div className="min-h-screen bg-[#EFEAE2] p-3 md:p-5 text-[#141416] font-sans">
      {/* Sleek Top Testmodus Banner */}
      {trip.isDemo && (
        <div className="max-w-[1600px] mx-auto mb-3 bg-[#141416] text-white rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md border border-white/10">
          <div className="flex items-center gap-2.5 text-xs md:text-sm">
            <span className="inline-flex items-center gap-1.5 bg-[#F4DF7B] text-[#141416] font-bold px-2.5 py-0.5 rounded-full text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Testmodus
            </span>
            <span className="text-white/90 font-medium">
              🧪 Testmodus aktiv: <strong>{trip.title}</strong> (Beispielwerte zum Ausprobieren &amp; Bearbeiten)
            </span>
            {isSyncing && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#A9B882] ml-2">
                <Cloud className="w-3 h-3 animate-pulse" /> Speichert...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetDemoTrip}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              title="Alle Beispielwerte von Mallorca 2026 auf Anfang zurücksetzen"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Demo-Daten zurücksetzen
            </button>
            <button
              onClick={() => setIsNewTripModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#E8C2E8] hover:bg-[#dfaee0] text-[#141416] px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Neuen eigenen Urlaub erstellen
            </button>
          </div>
        </div>
      )}

      {/* Inner Rounded Dashboard Container ("Intelly" Bento Reference Style) */}
      <div className="max-w-[1600px] mx-auto bg-[#F9F6F0] rounded-[34px] shadow-xl border border-black/5 p-3 md:p-5 grid grid-cols-1 lg:grid-cols-[240px_1fr_340px] gap-6 min-h-[calc(100vh-2.5rem)]">
        {/* Left Navigation Column */}
        <Sidebar />

        {/* Center Main Content Column */}
        <main className="flex flex-col gap-5 min-w-0">
          <TopBar />
          <div className="flex-1 min-w-0">
            {renderMainContent()}
          </div>
        </main>

        {/* Right Calendar & Timeline Column */}
        <RightCalendarPanel />
      </div>

      {/* Modals */}
      <NewTripModal />
      <QuickAddModal />
    </div>
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
