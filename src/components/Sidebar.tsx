import React from 'react';
import {
  LayoutGrid,
  CalendarRange,
  UtensilsCrossed,
  Vote,
  CheckSquare,
  Wallet,
  Plus,
  Sparkles,
  RotateCcw,
  Compass,
  ChevronsLeft,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import { NavigationTab } from '../types/vacation';

export const Sidebar: React.FC = () => {
  const {
    trip,
    savedTrips,
    activeTab,
    setActiveTab,
    setIsNewTripModalOpen,
    setIsQuickAddOpen,
    switchToDemoTrip,
    resetDemoTrip,
    switchTrip,
    isSyncing,
  } = useVacation();

  const openPollsCount = trip.polls.filter((p) => !p.isClosed).length;
  const openTasksCount = trip.tasks.filter((t) => !t.completed).length;

  const navItems: {
    id: NavigationTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string | number;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutGrid,
    },
    {
      id: 'schedule',
      label: 'Tagesplaner',
      icon: CalendarRange,
      badge: `${trip.totalDays}d`,
    },
    {
      id: 'meals',
      label: 'Essensplan',
      icon: UtensilsCrossed,
      badge: trip.meals.length,
    },
    {
      id: 'polls',
      label: 'Abstimmungen',
      icon: Vote,
      badge: openPollsCount > 0 ? openPollsCount : undefined,
    },
    {
      id: 'tasks',
      label: 'Checkliste',
      icon: CheckSquare,
      badge: openTasksCount > 0 ? openTasksCount : undefined,
    },
    {
      id: 'budget',
      label: 'Reisekasse',
      icon: Wallet,
    },
  ];

  return (
    <aside className="bg-[#141416] text-white rounded-[28px] p-5 flex flex-col justify-between h-full min-h-[640px] shadow-xl select-none">
      {/* Top: Brand Logo & Active Trip Chip */}
      <div>
        <div className="flex items-center justify-between px-2 pt-1 pb-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-xl bg-[#F4DF7B] text-[#141416] flex items-center justify-center font-black text-lg tracking-tighter shadow-sm group-hover:rotate-6 transition-transform">
              v.
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white">
              vacayly
            </span>
          </button>

          <button
            onClick={() => setIsQuickAddOpen(true)}
            title="Schnell-Vorschlag hinzufügen"
            className="w-8 h-8 rounded-full bg-[#F4DF7B] text-[#141416] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-sm"
          >
            <ChevronsLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>

        {/* Active Trip Mini Card */}
        <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-3.5 mb-6">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F4DF7B]/20 text-[#F4DF7B]">
              <Compass className="w-3 h-3" />
              {trip.isDemo ? 'Testmodus' : 'Eigene Reise'}
            </span>
            <span className="text-[11px] text-white/50 font-medium">
              {trip.totalDays} Tage
            </span>
          </div>
          <p className="font-bold text-sm text-white truncate" title={trip.title}>
            {trip.title}
          </p>
          <p className="text-xs text-white/60 truncate mt-0.5">
            {trip.destination}
          </p>
        </div>

        {/* Main Navigation */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-medium transition-all duration-150 group relative ${
                  isActive
                    ? 'bg-white/12 text-white font-semibold shadow-sm'
                    : 'text-white/55 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isActive ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F4DF7B] shadow-[0_0_8px_#F4DF7B]" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-white/20 transition-colors" />
                  )}
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? 'text-[#F4DF7B]'
                        : 'text-white/55 group-hover:text-white/80'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                      isActive
                        ? 'bg-[#F4DF7B] text-[#141416]'
                        : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Trip Switcher & Demo Controls */}
      <div className="pt-6 border-t border-white/10 space-y-3">
        {/* Saved Trips List */}
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
              Urlaube ({savedTrips.length})
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-white/40">
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-[#F4DF7B]" />
                  Sync...
                </>
              ) : (
                <>
                  <Cloud className="w-3 h-3 text-[#A9B882]" />
                  Gespeichert
                </>
              )}
            </span>
          </div>

          <div className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
            {savedTrips.map((t) => {
              const isCurrent = t.id === trip.id;
              return (
                <button
                  key={t.id}
                  onClick={() => switchTrip(t.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left ${
                    isCurrent
                      ? 'bg-[#E8C2E8]/20 text-[#E8C2E8] border border-[#E8C2E8]/30 font-semibold'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        t.isDemo ? 'bg-[#F4DF7B]' : 'bg-[#C5D1F5]'
                      }`}
                    />
                    <span className="truncate">{t.title}</span>
                  </div>
                  <span className="text-[10px] opacity-60 shrink-0 ml-1">
                    {t.totalDays}T
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => setIsNewTripModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-full bg-[#F4DF7B] text-[#141416] font-bold text-xs hover:bg-[#f7e794] active:scale-[0.99] transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Neuen Urlaub planen</span>
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={switchToDemoTrip}
              title="Mallorca Demo-Urlaub öffnen"
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-full text-[11px] font-medium transition-all border ${
                trip.isDemo
                  ? 'bg-white/10 text-white border-white/20'
                  : 'bg-transparent text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F4DF7B] shrink-0" />
              <span className="truncate">Testmodus</span>
            </button>

            <button
              onClick={resetDemoTrip}
              title="Demo-Beispieldaten auf Originalzustand zurücksetzen"
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-full text-[11px] font-medium bg-transparent text-white/70 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#E8C2E8] shrink-0" />
              <span className="truncate">Reset Demo</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
