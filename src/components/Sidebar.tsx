import React, { useState } from 'react';
import {
  LayoutGrid,
  CalendarRange,
  CalendarDays,
  UtensilsCrossed,
  Vote,
  CheckSquare,
  Wallet,
  Plus,
  Compass,
  Lock,
  Check,
  ArrowLeftRight,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import { NavigationTab } from '../types/vacation';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggleCollapse,
}) => {
  const {
    trip,
    activeTab,
    setActiveTab,
    setIsNewTripModalOpen,
    setIsWelcomeOpen,
    accessKey,
  } = useVacation();

  const [copiedPrivateLink, setCopiedPrivateLink] = useState(false);

  const openPollsCount = trip.polls.filter((p) => !p.isClosed).length;
  const openTasksCount = trip.tasks.filter((t) => !t.completed).length;

  const handleCopyInviteLink = () => {
    const url = `${window.location.origin}${window.location.pathname}`;
    navigator.clipboard?.writeText(url);
    setCopiedPrivateLink(true);
    setTimeout(() => setCopiedPrivateLink(false), 2500);
  };

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
      id: 'ideas',
      label: 'Ideen-Pool',
      icon: Lightbulb,
      badge: trip.ideas?.length ? trip.ideas.length : undefined,
    },
    {
      id: 'schedule',
      label: 'Tagesplaner',
      icon: CalendarRange,
      badge: `${trip.totalDays}T`,
    },
    {
      id: 'week',
      label: 'Wochenplan',
      icon: CalendarDays,
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
    <aside
      className={`bg-[#141416]/95 backdrop-blur-2xl text-white rounded-[30px] ${
        collapsed ? 'p-3 items-center' : 'p-5'
      } flex flex-col justify-between h-full min-h-[640px] shadow-2xl border border-white/10 select-none transition-all duration-200`}
    >
      {/* Top: Brand Logo & Active Trip Chip */}
      <div className={collapsed ? 'w-full flex flex-col items-center' : ''}>
        <div
          className={`flex items-center ${
            collapsed ? 'flex-col gap-3 pb-4' : 'justify-between px-1 pt-1 pb-6'
          }`}
        >
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
            title="Vacation Organizer"
          >
            <div className="w-9 h-9 rounded-xl bg-[#F4DF7B] text-[#141416] flex items-center justify-center font-black text-sm tracking-tight shadow-sm group-hover:rotate-6 transition-transform shrink-0">
              VO
            </div>
            {!collapsed && (
              <span className="text-lg font-extrabold tracking-tight text-white leading-tight">
                Vacation Organizer
              </span>
            )}
          </button>

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title={collapsed ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen'}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/75 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Active Trip Mini Card */}
        {!collapsed && (
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#F4DF7B]/20 text-[#F4DF7B]">
                <Compass className="w-3 h-3" />
                {trip.isDemo ? 'Testmodus' : 'Aktive Reise'}
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
        )}

        {/* Main Navigation */}
        <nav className={`space-y-1.5 ${collapsed ? 'w-full flex flex-col items-center' : ''}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`${
                  collapsed
                    ? 'w-11 h-11 justify-center px-0'
                    : 'w-full justify-between px-3.5 py-3'
                } flex items-center rounded-2xl text-sm font-medium transition-all duration-150 group relative cursor-pointer ${
                  isActive
                    ? 'bg-white/12 text-white font-semibold shadow-sm'
                    : 'text-white/55 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  {!collapsed &&
                    (isActive ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F4DF7B] shadow-[0_0_8px_#F4DF7B]" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-white/20 transition-colors" />
                    ))}
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? 'text-[#F4DF7B]'
                        : 'text-white/55 group-hover:text-white/80'
                    }`}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </div>

                {!collapsed && item.badge !== undefined && (
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

      {/* Bottom: Clean Actions */}
      <div
        className={`pt-6 border-t border-white/10 space-y-2.5 ${
          collapsed ? 'w-full flex flex-col items-center' : ''
        }`}
      >
        <button
          onClick={() => setIsNewTripModalOpen(true)}
          title="Neuen Urlaub erstellen"
          className={`${
            collapsed ? 'w-10 h-10 p-0' : 'w-full py-2.5 px-3'
          } flex items-center justify-center gap-2 rounded-full bg-[#F4DF7B] text-[#141416] font-bold text-xs hover:bg-[#f7e794] active:scale-[0.99] transition-all shadow-sm cursor-pointer`}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          {!collapsed && <span>Neuen Urlaub erstellen</span>}
        </button>

        <button
          onClick={() => setIsWelcomeOpen(true)}
          title="Urlaub / Nutzer wechseln"
          className={`${
            collapsed ? 'w-10 h-10 p-0' : 'w-full py-2.5 px-3'
          } flex items-center justify-center gap-2 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-all cursor-pointer`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-[#E8C2E8]" />
          {!collapsed && <span>Urlaub / Nutzer wechseln</span>}
        </button>

        <button
          onClick={handleCopyInviteLink}
          className={`${
            collapsed ? 'w-10 h-10 p-0' : 'w-full py-2 px-3'
          } flex items-center justify-center gap-2 rounded-full bg-transparent hover:bg-white/10 text-white/70 hover:text-white font-medium text-[11px] border border-white/10 transition-all cursor-pointer`}
          title="Direktlink mit Zugangscode kopieren"
        >
          {copiedPrivateLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#A9B882]" />
              {!collapsed && (
                <span className="text-[#A9B882] font-bold">
                  Einladungslink kopiert!
                </span>
              )}
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 text-[#F4DF7B]" />
              {!collapsed && <span>🔒 Privaten Link kopieren</span>}
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
