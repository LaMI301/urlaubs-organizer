import React from 'react';
import { VacationProvider, useVacation } from './context/VacationContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { IdeasPoolView } from './components/IdeasPoolView';
import { ScheduleView, QuickAddModal } from './components/ScheduleView';
import { MealsView } from './components/MealsView';
import { PollsView, TasksView, BudgetView } from './components/PollsAndTasksView';
import { RightCalendarPanel } from './components/RightCalendarPanel';
import { NewTripModal } from './components/NewTripModal';
import { AccessAndWelcomeGate } from './components/AccessAndWelcomeGate';
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
      case 'ideas':
        return <IdeasPoolView />;
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
    <AccessAndWelcomeGate>
      <div className="relative min-h-screen bg-gradient-to-br from-[#F6F1E9] via-[#EFE6DC] to-[#F5ECE2] p-3 md:p-5 text-[#141416] font-sans overflow-x-hidden">
        {/* Soft Colorful Ambient Glass Glows in Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#F4DF7B]/30 rounded-full blur-3xl" />
          <div className="absolute top-1/4 -right-32 w-[30rem] h-[30rem] bg-[#E8C2E8]/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 left-1/4 w-[28rem] h-[28rem] bg-[#C5D1F5]/30 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-[#A9B882]/20 rounded-full blur-3xl" />
        </div>

        {/* Sleek Top Testmodus Banner */}
        {trip.isDemo && (
          <div className="relative z-10 max-w-[1600px] mx-auto mb-3 bg-[#141416]/90 backdrop-blur-xl text-white rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg border border-white/10">
            <div className="flex items-center gap-2.5 text-xs md:text-sm">
              <span className="inline-flex items-center gap-1.5 bg-[#F4DF7B] text-[#141416] font-bold px-2.5 py-0.5 rounded-full text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                Testmodus
              </span>
              <span className="text-white/90 font-medium">
                <strong>{trip.title}</strong> (Beispielwerte zum Ausprobieren)
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
                Reset Demo
              </button>
              <button
                onClick={() => setIsNewTripModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#E8C2E8] hover:bg-[#dfaee0] text-[#141416] px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Eigenen Urlaub erstellen
              </button>
            </div>
          </div>
        )}

        {/* Inner Rounded Glassy Dashboard Container */}
        <div className="relative z-10 max-w-[1600px] mx-auto bg-white/65 backdrop-blur-2xl rounded-[36px] shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-white/70 p-3 md:p-5 grid grid-cols-1 lg:grid-cols-[240px_1fr_330px] gap-6 min-h-[calc(100vh-2.5rem)]">
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
    </AccessAndWelcomeGate>
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
