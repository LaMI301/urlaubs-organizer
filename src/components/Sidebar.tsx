import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  Menu,
  X,
  KeyRound,
  Shield,
  Map as MapIcon,
  Link2,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import { NavigationTab } from '../types/vacation';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenMobileCalendar?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggleCollapse,
  onOpenMobileCalendar,
}) => {
  const {
    trip,
    activeTab,
    setActiveTab,
    setIsNewTripModalOpen,
    setIsWelcomeOpen,
    getInviteUrl,
    lockApp,
    setAccessKey,
    showToast,
    mapOpen,
    setMapOpen,
  } = useVacation();

  const [copiedPrivateLink, setCopiedPrivateLink] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  // Close mobile drawer on Escape
  useEffect(() => {
    if (!isMobileDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileDrawerOpen]);

  const openPollsCount = trip.polls.filter((p) => !p.isClosed).length;
  const openTasksCount = trip.tasks.filter((t) => !t.completed).length;

  const handleCopyInviteLink = async () => {
    const url = getInviteUrl();
    if (!url) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const el = document.createElement('textarea');
        el.value = url;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedPrivateLink(true);
      showToast('Privater Einladungslink (#access) kopiert', 'success', {
        durationMs: 2500,
      });
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedPrivateLink(false);
        copyTimerRef.current = null;
      }, 2500);
    } catch {
      showToast('Link konnte nicht in die Zwischenablage kopiert werden', 'warning');
    }
  };

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newPasswordInput.trim();
    if (!cleaned) {
      showToast('Bitte gib ein neues Zugangspasswort ein', 'warning');
      return;
    }
    setAccessKey(cleaned);
    setNewPasswordInput('');
    setIsEditingPassword(false);
  };

  const navItems: {
    id: NavigationTab;
    label: string;
    shortLabel: string;
    icon: React.FC<{ className?: string }>;
    badge?: string | number;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      shortLabel: 'Start',
      icon: LayoutGrid,
    },
    {
      id: 'ideas',
      label: 'Ideen-Pool',
      shortLabel: 'Ideen',
      icon: Lightbulb,
      badge: trip.ideas?.length ? trip.ideas.length : undefined,
    },
    {
      id: 'schedule',
      label: 'Tagesplaner',
      shortLabel: 'Plan',
      icon: CalendarRange,
      badge: `${trip.totalDays}T`,
    },
    {
      id: 'week',
      label: 'Wochenplan',
      shortLabel: 'Woche',
      icon: CalendarDays,
    },
    {
      id: 'meals',
      label: 'Essensplan',
      shortLabel: 'Essen',
      icon: UtensilsCrossed,
      badge: trip.meals.length > 0 ? trip.meals.length : undefined,
    },
    {
      id: 'polls',
      label: 'Abstimmungen',
      shortLabel: 'Polls',
      icon: Vote,
      badge: openPollsCount > 0 ? openPollsCount : undefined,
    },
    {
      id: 'tasks',
      label: 'Checkliste',
      shortLabel: 'To-Dos',
      icon: CheckSquare,
      badge: openTasksCount > 0 ? openTasksCount : undefined,
    },
    {
      id: 'budget',
      label: 'Reisekasse',
      shortLabel: 'Kasse',
      icon: Wallet,
    },
  ];

  const primaryBottomTabs: NavigationTab[] = ['dashboard', 'schedule', 'ideas'];
  const moreSheetItems: {
    id: NavigationTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string | number;
  }[] = [
    {
      id: 'week',
      label: 'Wochenübersicht',
      icon: CalendarDays,
    },
    {
      id: 'meals',
      label: 'Essen & Kulinarik',
      icon: UtensilsCrossed,
      badge: trip.meals.length > 0 ? trip.meals.length : undefined,
    },
    {
      id: 'polls',
      label: 'Abstimmungen',
      icon: Vote,
      badge: openPollsCount > 0 ? openPollsCount : undefined,
    },
    {
      id: 'tasks',
      label: 'Packliste & Equipment',
      icon: CheckSquare,
      badge: openTasksCount > 0 ? openTasksCount : undefined,
    },
    {
      id: 'budget',
      label: 'Reisekasse & Budget',
      icon: Wallet,
    },
  ];
  const secondaryCount = openPollsCount + openTasksCount;

  const handleNavigateMobile = (tab: NavigationTab) => {
    setActiveTab(tab);
    setMapOpen(false);
    setIsMobileDrawerOpen(false);
  };

  const isNetlifyPublicHost =
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('.netlify.app');

  const mobileBottomUi = (
    <>
      {/* 1. PHONE (< sm): Fixed Bottom Thumb-Zone Navigation (lifted above Netlify Free badge on *.netlify.app) */}
      <nav
        aria-label="Mobile Hauptnavigation"
        className={`sm:hidden fixed z-40 bg-white/[0.96] backdrop-blur-2xl border-[#E6DDD1] px-1.5 pt-1.5 ${
          isNetlifyPublicHost
            ? 'bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] inset-x-2 rounded-2xl border pb-1.5 shadow-[0_8px_28px_rgba(31,27,24,0.14)]'
            : 'bottom-0 inset-x-0 border-t pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] shadow-[0_-8px_24px_rgba(31,27,24,0.08)]'
        }`}
      >
        <div className="max-w-lg mx-auto grid grid-cols-5 gap-1">
          {primaryBottomTabs.map((tabId) => {
            const item = navItems.find((n) => n.id === tabId)!;
            const Icon = item.icon;
            const isActive = !mapOpen && activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigateMobile(item.id)}
                className={`relative min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C85A38]/12 text-[#9E3F22]'
                    : 'text-[#6B6259] hover:text-[#1F1B18]'
                }`}
              >
                <div className="relative">
                  <Icon className="w-[18px] h-[18px]" />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2.5 font-mono tabular-nums text-[9px] font-extrabold px-1 rounded-full bg-[#C85A38] text-white leading-tight">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold mt-0.5 truncate max-w-full">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}

          {/* Tab 4: Karte (toggles mapOpen) */}
          <button
            type="button"
            onClick={() => {
              setIsMobileDrawerOpen(false);
              setMapOpen(!mapOpen);
            }}
            aria-pressed={mapOpen}
            className={`relative min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all cursor-pointer ${
              mapOpen
                ? 'bg-[#2A7B88]/14 text-[#1F5E68]'
                : 'text-[#6B6259] hover:text-[#1F1B18]'
            }`}
          >
            <MapIcon className="w-[18px] h-[18px]" />
            <span className="text-[10px] font-bold mt-0.5 truncate max-w-full">
              Karte
            </span>
          </button>

          {/* Tab 5: Mehr (opens Mobile Bottom Sheet) */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            aria-expanded={isMobileDrawerOpen}
            className={`relative min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all cursor-pointer ${
              (!mapOpen && !primaryBottomTabs.includes(activeTab)) ||
              isMobileDrawerOpen
                ? 'bg-[#C85A38]/12 text-[#9E3F22]'
                : 'text-[#6B6259] hover:text-[#1F1B18]'
            }`}
          >
            <div className="relative">
              <Menu className="w-[18px] h-[18px]" />
              {secondaryCount > 0 && (
                <span className="absolute -top-1.5 -right-2 font-mono tabular-nums text-[9px] font-extrabold px-1 rounded-full bg-[#D9822B] text-white leading-tight">
                  {secondaryCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold mt-0.5">Mehr</span>
          </button>
        </div>
      </nav>

      {/* 2. PHONE (< sm): "Mehr" Mobile Bottom Sheet */}
      {isMobileDrawerOpen && (
        <div
          className="sm:hidden fixed inset-0 z-50 flex items-end p-0"
          role="dialog"
          aria-modal="true"
          aria-label="Weitere Bereiche & Einstellungen"
        >
          <div
            className="fixed inset-0 bg-[#1F1B18]/45 backdrop-blur-sm"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div
            className={`mobile-sheet relative z-10 w-full max-h-[88dvh] bg-white/[0.98] backdrop-blur-2xl border-t border-[#DDD2C3] rounded-t-3xl px-4 pt-2.5 ${
              isNetlifyPublicHost
                ? 'pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]'
                : 'pb-[calc(1rem+env(safe-area-inset-bottom,0px))]'
            } flex flex-col overflow-y-auto shadow-2xl text-[#1F1B18]`}
          >
            <div className="w-10 h-1 rounded-full bg-[#DDD2C3] mx-auto mb-3 shrink-0" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E6DDD1]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#C85A38] text-white flex items-center justify-center font-black text-sm shrink-0">
                  VO
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-[#1F1B18] truncate">
                    {trip.title}
                  </p>
                  <p className="text-[11px] text-[#6B6259] truncate">
                    {trip.destination} · {trip.totalDays} Tage
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                aria-label="Menü schließen"
                className="w-11 h-11 rounded-full bg-[#F3ECE1] hover:bg-[#E6DDD1] text-[#1F1B18] flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Secondary Views + Calendar Open */}
            <nav className="py-3 space-y-1.5">
              {moreSheetItems.map((item) => {
                const Icon = item.icon;
                const isActive = !mapOpen && activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigateMobile(item.id)}
                    className={`w-full min-h-[48px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#C85A38]/12 text-[#9E3F22] font-bold border border-[#C85A38]/30'
                        : 'bg-[#FAF7F2] text-[#1F1B18] hover:bg-[#F3ECE1] border border-[#E6DDD1] font-semibold'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#C85A38]' : 'text-[#6B6259]'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span
                        className={`font-mono tabular-nums text-[11px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          isActive
                            ? 'bg-[#C85A38] text-white'
                            : 'bg-white border border-[#E6DDD1] text-[#6B6259]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {onOpenMobileCalendar && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setMapOpen(false);
                    onOpenMobileCalendar();
                  }}
                  className="w-full min-h-[48px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm bg-[#2A7B88]/10 hover:bg-[#2A7B88]/16 text-[#1F5E68] border border-[#2A7B88]/30 font-bold transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <CalendarIcon className="w-4 h-4 shrink-0 text-[#2A7B88]" />
                    <span className="truncate">Kalender öffnen</span>
                  </span>
                  <span className="font-mono tabular-nums text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-white/80 border border-[#2A7B88]/25">
                    {trip.totalDays}T
                  </span>
                </button>
              )}
            </nav>

            {/* Trip-Wechsel & Sicherheit */}
            <div className="pt-3 border-t border-[#E6DDD1] space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsNewTripModalOpen(true);
                  }}
                  className="min-h-[44px] py-2 px-3 flex items-center justify-center gap-1.5 rounded-full bg-[#C85A38] hover:bg-[#B54B2B] text-white font-extrabold text-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                  <span className="truncate">Neuer Urlaub</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsWelcomeOpen(true);
                  }}
                  className="min-h-[44px] py-2 px-3 flex items-center justify-center gap-1.5 rounded-full bg-[#F3ECE1] hover:bg-[#E6DDD1] border border-[#DDD2C3] text-[#1F1B18] font-bold text-xs transition-all cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-[#D9822B] shrink-0" />
                  <span className="truncate">Trip-Wechsel</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="w-full min-h-[44px] py-2 px-3 flex items-center justify-center gap-2 rounded-full bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#DDD2C3] text-[#1F1B18] font-semibold text-xs transition-all cursor-pointer"
              >
                {copiedPrivateLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#4E5F40]" />
                    <span className="text-[#4E5F40] font-bold">
                      Einladungslink kopiert!
                    </span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5 text-[#2A7B88]" />
                    <span>Privaten Einladungslink kopieren</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingPassword((prev) => !prev)}
                  className="min-h-[44px] py-2 px-2.5 flex items-center justify-center gap-1.5 rounded-full bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#DDD2C3] text-[#1F1B18] text-xs font-semibold cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#D9822B]" />
                  <span>Passwort</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    lockApp();
                  }}
                  className="min-h-[44px] py-2 px-2.5 flex items-center justify-center gap-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/18 border border-rose-500/25 text-rose-700 text-xs font-bold cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>App sperren</span>
                </button>
              </div>

              {isEditingPassword && (
                <form
                  onSubmit={handlePasswordSave}
                  className="pt-2 space-y-2 bg-[#FAF7F2] rounded-2xl p-3 border border-[#E6DDD1]"
                >
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B6259]">
                    Neuer Zugangscode
                  </label>
                  <input
                    type="password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Neues Passwort..."
                    className="surface-input w-full min-h-[44px] rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingPassword(false)}
                      className="min-h-[44px] px-3 py-1.5 rounded-full bg-[#F3ECE1] text-xs font-semibold text-[#6B6259] cursor-pointer"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="min-h-[44px] px-4 py-1.5 rounded-full bg-[#C85A38] text-white text-xs font-extrabold cursor-pointer"
                    >
                      Speichern
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {typeof document !== 'undefined'
        ? createPortal(mobileBottomUi, document.body)
        : mobileBottomUi}

      {/* 3. TABLET (sm..lg: slim 72px Left Icon Rail) & DESKTOP (lg+: collapsible 240px / 72px) */}
      <aside
        aria-label="Seitenleiste"
        className={`hidden sm:flex surface-glass rounded-[24px] lg:rounded-[28px] p-3 items-center ${
          collapsed ? 'lg:p-3 lg:items-center' : 'lg:p-4 lg:items-stretch'
        } flex-col justify-between h-full select-none transition-all duration-200`}
      >
        {/* Top: Brand Logo & Active Trip Chip */}
        <div
          className={`w-full flex flex-col items-center ${
            collapsed ? '' : 'lg:block'
          }`}
        >
          <div
            className={`flex items-center flex-col gap-3 pb-4 ${
              collapsed ? '' : 'lg:flex-row lg:justify-between lg:px-1 lg:pt-1 lg:pb-5'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer min-w-0"
              title="Vacation Organizer"
            >
              <div className="w-10 h-10 lg:w-9 lg:h-9 rounded-xl bg-[#C85A38] text-white flex items-center justify-center font-black text-sm tracking-tight shadow-sm group-hover:scale-105 transition-transform shrink-0">
                VO
              </div>
              {!collapsed && (
                <div className="hidden lg:block min-w-0">
                  <span className="text-base font-extrabold tracking-tight text-[#1F1B18] leading-tight block truncate">
                    Vacation Organizer
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6B6259] block">
                    Reiseplaner
                  </span>
                </div>
              )}
            </button>

            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title={collapsed ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen'}
                aria-label={
                  collapsed ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen'
                }
                className="hidden lg:flex w-7 h-7 rounded-full bg-[#F3ECE1] hover:bg-[#E6DDD1] border border-[#DDD2C3] text-[#6B6259] hover:text-[#1F1B18] items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                {collapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Active Trip Mini Card (Desktop expanded only) */}
          {!collapsed && (
            <div className="hidden lg:block bg-[#FAF7F2] border border-[#E6DDD1] rounded-2xl p-3.5 mb-5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2A7B88]/12 text-[#1F5E68] border border-[#2A7B88]/25">
                  <Compass className="w-3 h-3" />
                  {trip.isDemo ? 'Testmodus' : 'Aktive Reise'}
                </span>
                <span className="font-mono tabular-nums text-[11px] text-[#6B6259] font-semibold">
                  {trip.totalDays}T
                </span>
              </div>
              <p
                className="font-bold text-sm text-[#1F1B18] truncate"
                title={trip.title}
              >
                {trip.title}
              </p>
              <p className="text-xs text-[#6B6259] truncate mt-0.5">
                {trip.destination}
              </p>
            </div>
          )}

          {/* Main Navigation */}
          <nav
            aria-label="Hauptnavigation"
            className={`space-y-1.5 lg:space-y-1 w-full flex flex-col items-center ${
              collapsed ? '' : 'lg:block'
            }`}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  className={`${
                    collapsed
                      ? 'w-11 h-11 justify-center px-0'
                      : 'w-11 h-11 justify-center px-0 lg:w-full lg:h-auto lg:justify-between lg:px-3 lg:py-2.5'
                  } flex items-center rounded-2xl text-sm font-medium transition-all duration-150 group relative cursor-pointer ${
                    isActive
                      ? 'bg-[#C85A38]/12 text-[#9E3F22] font-semibold border border-[#C85A38]/30'
                      : 'text-[#6B6259] hover:text-[#1F1B18] hover:bg-[#F3ECE1]/80 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {!collapsed &&
                      (isActive ? (
                        <span className="hidden lg:inline-block w-1.5 h-1.5 rounded-full bg-[#C85A38] shrink-0" />
                      ) : (
                        <span className="hidden lg:inline-block w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-[#DDD2C3] transition-colors shrink-0" />
                      ))}
                    <Icon
                      className={`w-[18px] h-[18px] lg:w-4 lg:h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-[#C85A38]'
                          : 'text-[#6B6259] group-hover:text-[#1F1B18]'
                      }`}
                    />
                    {!collapsed && (
                      <span className="hidden lg:inline truncate">{item.label}</span>
                    )}
                  </div>

                  {/* Rail mini badge (shown on sm..lg always, and on lg+ when collapsed) */}
                  {item.badge !== undefined && (
                    <span
                      className={`${
                        collapsed ? 'flex' : 'flex lg:hidden'
                      } absolute -top-1 -right-1 font-mono tabular-nums text-[9px] font-extrabold px-1 min-w-[16px] h-4 rounded-full bg-[#C85A38] text-white items-center justify-center shadow-sm`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {!collapsed && item.badge !== undefined && (
                    <span
                      className={`hidden lg:inline-block font-mono tabular-nums text-[11px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        isActive
                          ? 'bg-[#C85A38] text-white'
                          : 'bg-[#F3ECE1] text-[#6B6259]'
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

        {/* Bottom: Clean Actions & Security */}
        <div
          className={`pt-4 mt-4 border-t border-[#E6DDD1] space-y-2 w-full flex flex-col items-center ${
            collapsed ? '' : 'lg:block'
          }`}
        >
          <button
            type="button"
            onClick={() => setIsNewTripModalOpen(true)}
            title="Neuen Urlaub erstellen"
            aria-label="Neuen Urlaub erstellen"
            className={`${
              collapsed ? 'w-11 h-11 p-0' : 'w-11 h-11 p-0 lg:w-full lg:h-auto lg:py-2.5 lg:px-3'
            } flex items-center justify-center gap-2 rounded-full bg-[#C85A38] hover:bg-[#B54B2B] text-white font-extrabold text-xs active:scale-[0.99] transition-all shadow-sm cursor-pointer`}
          >
            <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
            {!collapsed && (
              <span className="hidden lg:inline truncate">Neuen Urlaub erstellen</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsWelcomeOpen(true)}
            title="Urlaub / Nutzer wechseln"
            aria-label="Urlaub / Nutzer wechseln"
            className={`${
              collapsed ? 'w-11 h-11 p-0' : 'w-11 h-11 p-0 lg:w-full lg:h-auto lg:py-2 lg:px-3'
            } flex items-center justify-center gap-2 rounded-full bg-[#F3ECE1] hover:bg-[#E6DDD1] border border-[#DDD2C3] text-[#1F1B18] font-semibold text-xs transition-all cursor-pointer`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#D9822B] shrink-0" />
            {!collapsed && (
              <span className="hidden lg:inline truncate">Urlaub wechseln</span>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopyInviteLink}
            className={`${
              collapsed ? 'w-11 h-11 p-0' : 'w-11 h-11 p-0 lg:w-full lg:h-auto lg:py-2 lg:px-3'
            } flex items-center justify-center gap-2 rounded-full bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#1F1B18] font-medium text-[11px] border border-[#DDD2C3] transition-all cursor-pointer`}
            title="Direktlink mit Zugangscode kopieren"
            aria-label="Direktlink mit Zugangscode kopieren"
          >
            {copiedPrivateLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#4E5F40] shrink-0" />
                {!collapsed && (
                  <span className="hidden lg:inline text-[#4E5F40] font-bold truncate">
                    Link kopiert!
                  </span>
                )}
              </>
            ) : (
              <>
                <Link2 className="w-3.5 h-3.5 text-[#2A7B88] shrink-0" />
                {!collapsed && (
                  <span className="hidden lg:inline truncate">Privater Link</span>
                )}
              </>
            )}
          </button>

          {/* Security Quick Row */}
          <button
            type="button"
            onClick={lockApp}
            title="App sperren"
            aria-label="App sperren"
            className={`${
              collapsed ? 'flex' : 'flex lg:hidden'
            } w-11 h-11 items-center justify-center rounded-full bg-rose-500/10 hover:bg-rose-500/18 border border-rose-500/25 text-rose-700 transition-colors cursor-pointer`}
          >
            <Lock className="w-3.5 h-3.5" />
          </button>

          {!collapsed && (
            <div className="hidden lg:block space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingPassword((prev) => !prev)}
                  title="Zugangspasswort ändern"
                  className="py-1.5 px-2 flex items-center justify-center gap-1 rounded-full bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#DDD2C3] text-[#1F1B18] text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  <Shield className="w-3 h-3 text-[#D9822B] shrink-0" />
                  <span className="truncate">Passwort</span>
                </button>
                <button
                  type="button"
                  onClick={lockApp}
                  title="App sperren"
                  className="py-1.5 px-2 flex items-center justify-center gap-1 rounded-full bg-rose-500/10 hover:bg-rose-500/18 border border-rose-500/25 text-rose-700 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  <Lock className="w-3 h-3 shrink-0" />
                  <span className="truncate">Sperren</span>
                </button>
              </div>

              {isEditingPassword && (
                <form
                  onSubmit={handlePasswordSave}
                  className="bg-[#FAF7F2] rounded-2xl p-2.5 border border-[#E6DDD1] space-y-2"
                >
                  <input
                    type="password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Neuer Code..."
                    className="surface-input w-full rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingPassword(false)}
                      className="px-2 py-1 rounded-full bg-[#F3ECE1] text-[10px] font-semibold text-[#6B6259] cursor-pointer"
                    >
                      Abbr.
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-full bg-[#C85A38] text-white text-[10px] font-extrabold cursor-pointer"
                    >
                      OK
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
