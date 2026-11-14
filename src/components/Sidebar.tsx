import React, { useEffect, useRef, useState } from 'react';
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
    selectedDay,
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

  const primaryBottomTabs: NavigationTab[] = ['dashboard', 'schedule', 'ideas', 'budget'];
  const secondaryCount = openPollsCount + openTasksCount;

  const handleNavigateMobile = (tab: NavigationTab) => {
    setActiveTab(tab);
    setIsMobileDrawerOpen(false);
  };

  return (
    <>
      {/* 1. MOBILE (< lg): Compact Top Bar (NO 640px block above content!) */}
      <div className="lg:hidden aurora-glass rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-[#0B0E14] flex items-center justify-center font-black text-xs tracking-tight shrink-0 shadow-[0_0_16px_rgba(34,211,238,0.3)] cursor-pointer"
            title="Dashboard"
          >
            VO
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-slate-100 truncate">
              {trip.title}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="truncate">{trip.destination}</span>
              <span className="text-slate-600">·</span>
              <span className="font-mono tabular-nums text-cyan-300 font-bold shrink-0">
                Tag {selectedDay}/{trip.totalDays}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setMapOpen(!mapOpen)}
            aria-label={mapOpen ? 'Karte schließen' : 'Karte öffnen'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
              mapOpen
                ? 'bg-cyan-400 text-[#0B0E14] border-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.35)]'
                : 'bg-white/[0.06] text-cyan-300 border-cyan-400/25 hover:bg-white/[0.12]'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Karte</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            aria-label="Menü öffnen"
            className="relative w-9 h-9 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Menu className="w-4 h-4" />
            {secondaryCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-[#0B0E14]" />
            )}
          </button>
        </div>
      </div>

      {/* 2. MOBILE (< lg): Sticky Bottom Tab Bar */}
      <nav
        aria-label="Mobile Hauptnavigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0B0E14]/92 backdrop-blur-2xl border-t border-white/12 px-2 py-1.5 shadow-[0_-12px_32px_rgba(0,0,0,0.65)]"
      >
        <div className="max-w-lg mx-auto grid grid-cols-5 gap-1">
          {primaryBottomTabs.map((tabId) => {
            const item = navItems.find((n) => n.id === tabId)!;
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white/[0.12] text-cyan-300'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2.5 font-mono tabular-nums text-[9px] font-extrabold px-1 rounded-full bg-cyan-400 text-[#0B0E14] leading-tight">
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

          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer ${
              !primaryBottomTabs.includes(activeTab) || isMobileDrawerOpen
                ? 'bg-white/[0.12] text-cyan-300'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <div className="relative">
              <Menu className="w-4 h-4" />
              {secondaryCount > 0 && (
                <span className="absolute -top-1 -right-1.5 font-mono tabular-nums text-[9px] font-extrabold px-1 rounded-full bg-amber-400 text-[#0B0E14] leading-tight">
                  {secondaryCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold mt-0.5">Mehr</span>
          </button>
        </div>
      </nav>

      {/* 3. MOBILE (< lg): Slide-Over Navigation & Security Drawer */}
      {isMobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigationsmenü"
        >
          <div
            className="fixed inset-0 bg-[#06080D]/75 backdrop-blur-sm"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative z-10 w-[86vw] max-w-[320px] h-full bg-[#131823]/[0.98] backdrop-blur-2xl border-r border-white/15 p-5 flex flex-col justify-between overflow-y-auto shadow-2xl">
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-[#0B0E14] flex items-center justify-center font-black text-sm shrink-0">
                    VO
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-100 truncate">
                      Vacation Organizer
                    </p>
                    <p className="text-[10px] text-cyan-300 font-semibold uppercase tracking-wider">
                      Midnight Aurora
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  aria-label="Menü schließen"
                  className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Active Trip Card */}
              <div className="aurora-glass-elevated rounded-2xl p-3.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-400/15 text-cyan-300 border border-cyan-400/25">
                    <Compass className="w-3 h-3" />
                    {trip.isDemo ? 'Testmodus' : 'Aktive Reise'}
                  </span>
                  <span className="font-mono tabular-nums text-[11px] text-slate-400 font-semibold">
                    {trip.totalDays} Tage
                  </span>
                </div>
                <p className="text-sm font-extrabold text-slate-100 truncate">
                  {trip.title}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {trip.destination}
                </p>
              </div>

              {/* All 8 Navigation Tabs */}
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigateMobile(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white/[0.12] text-slate-100 font-bold border border-cyan-400/30 shadow-[0_0_18px_rgba(34,211,238,0.12)]'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-cyan-300' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.badge !== undefined && (
                        <span
                          className={`font-mono tabular-nums text-[11px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                            isActive
                              ? 'bg-cyan-400 text-[#0B0E14]'
                              : 'bg-white/10 text-slate-300'
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

            {/* Bottom Actions */}
            <div className="pt-5 mt-5 border-t border-white/10 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  setIsNewTripModalOpen(true);
                }}
                className="w-full py-2.5 px-3 flex items-center justify-center gap-2 rounded-full bg-cyan-400 hover:bg-cyan-300 text-[#0B0E14] font-extrabold text-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Neuen Urlaub erstellen</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  setIsWelcomeOpen(true);
                }}
                className="w-full py-2.5 px-3 flex items-center justify-center gap-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-slate-100 font-semibold text-xs transition-all cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-300" />
                <span>Urlaub / Nutzer wechseln</span>
              </button>

              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="w-full py-2 px-3 flex items-center justify-center gap-2 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-200 font-semibold text-xs transition-all cursor-pointer"
              >
                {copiedPrivateLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-bold">
                      Einladungslink kopiert!
                    </span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Privater Link kopieren</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingPassword((prev) => !prev)}
                  className="py-2 px-2.5 flex items-center justify-center gap-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 text-[11px] font-semibold cursor-pointer"
                >
                  <KeyRound className="w-3 h-3 text-amber-300" />
                  <span>Passwort</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    lockApp();
                  }}
                  className="py-2 px-2.5 flex items-center justify-center gap-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-200 text-[11px] font-bold cursor-pointer"
                >
                  <Lock className="w-3 h-3" />
                  <span>App sperren</span>
                </button>
              </div>

              {isEditingPassword && (
                <form
                  onSubmit={handlePasswordSave}
                  className="pt-2 space-y-2 bg-[#0B0E14]/70 rounded-2xl p-3 border border-white/10"
                >
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Neuer Zugangscode
                  </label>
                  <input
                    type="password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Neues Passwort..."
                    className="aurora-input w-full rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingPassword(false)}
                      className="px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-slate-300 cursor-pointer"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-full bg-cyan-400 text-[#0B0E14] text-[11px] font-extrabold cursor-pointer"
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

      {/* 4. DESKTOP (>= lg): Collapsible Dark-Glass Icon-Rail (72px / 240px) */}
      <aside
        aria-label="Desktop Seitenleiste"
        className={`hidden lg:flex aurora-glass rounded-[28px] ${
          collapsed ? 'p-3 items-center' : 'p-4'
        } flex-col justify-between h-full select-none transition-all duration-200`}
      >
        {/* Top: Brand Logo & Active Trip Chip */}
        <div className={collapsed ? 'w-full flex flex-col items-center' : 'w-full'}>
          <div
            className={`flex items-center ${
              collapsed ? 'flex-col gap-3 pb-4' : 'justify-between px-1 pt-1 pb-5'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer min-w-0"
              title="Vacation Organizer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-[#0B0E14] flex items-center justify-center font-black text-sm tracking-tight shadow-[0_0_20px_rgba(34,211,238,0.3)] group-hover:scale-105 transition-transform shrink-0">
                VO
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <span className="text-base font-extrabold tracking-tight text-slate-100 leading-tight block truncate">
                    Vacation Organizer
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300/80 block">
                    Aurora Cockpit
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
                className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/10 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
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
            <div className="aurora-glass-elevated rounded-2xl p-3.5 mb-5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-400/15 text-cyan-300 border border-cyan-400/25">
                  <Compass className="w-3 h-3" />
                  {trip.isDemo ? 'Testmodus' : 'Aktive Reise'}
                </span>
                <span className="font-mono tabular-nums text-[11px] text-slate-400 font-semibold">
                  {trip.totalDays}T
                </span>
              </div>
              <p
                className="font-bold text-sm text-slate-100 truncate"
                title={trip.title}
              >
                {trip.title}
              </p>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {trip.destination}
              </p>
            </div>
          )}

          {/* Main Navigation */}
          <nav
            aria-label="Hauptnavigation"
            className={`space-y-1 ${collapsed ? 'w-full flex flex-col items-center' : ''}`}
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
                  className={`${
                    collapsed
                      ? 'w-11 h-11 justify-center px-0'
                      : 'w-full justify-between px-3 py-2.5'
                  } flex items-center rounded-2xl text-sm font-medium transition-all duration-150 group relative cursor-pointer ${
                    isActive
                      ? 'bg-white/[0.12] text-slate-100 font-semibold border border-cyan-400/25 shadow-[0_0_20px_rgba(34,211,238,0.12)]'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {!collapsed &&
                      (isActive ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22D3EE] shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-white/25 transition-colors shrink-0" />
                      ))}
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-cyan-300'
                          : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {/* Collapsed mini badge */}
                  {collapsed && item.badge !== undefined && (
                    <span className="absolute -top-1 -right-1 font-mono tabular-nums text-[9px] font-extrabold px-1 min-w-[16px] h-4 rounded-full bg-cyan-400 text-[#0B0E14] flex items-center justify-center shadow-sm">
                      {item.badge}
                    </span>
                  )}

                  {!collapsed && item.badge !== undefined && (
                    <span
                      className={`font-mono tabular-nums text-[11px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        isActive
                          ? 'bg-cyan-400 text-[#0B0E14]'
                          : 'bg-white/[0.08] text-slate-300'
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
          className={`pt-4 mt-4 border-t border-white/10 space-y-2 ${
            collapsed ? 'w-full flex flex-col items-center' : 'w-full'
          }`}
        >
          <button
            type="button"
            onClick={() => setIsNewTripModalOpen(true)}
            title="Neuen Urlaub erstellen"
            className={`${
              collapsed ? 'w-10 h-10 p-0' : 'w-full py-2.5 px-3'
            } flex items-center justify-center gap-2 rounded-full bg-cyan-400 hover:bg-cyan-300 text-[#0B0E14] font-extrabold text-xs active:scale-[0.99] transition-all shadow-[0_0_18px_rgba(34,211,238,0.28)] cursor-pointer`}
          >
            <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
            {!collapsed && <span className="truncate">Neuen Urlaub erstellen</span>}
          </button>

          <button
            type="button"
            onClick={() => setIsWelcomeOpen(true)}
            title="Urlaub / Nutzer wechseln"
            className={`${
              collapsed ? 'w-10 h-10 p-0' : 'w-full py-2 px-3'
            } flex items-center justify-center gap-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-slate-100 font-semibold text-xs transition-all cursor-pointer`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            {!collapsed && <span className="truncate">Urlaub wechseln</span>}
          </button>

          <button
            type="button"
            onClick={handleCopyInviteLink}
            className={`${
              collapsed ? 'w-10 h-10 p-0' : 'w-full py-2 px-3'
            } flex items-center justify-center gap-2 rounded-full bg-white/[0.03] hover:bg-white/[0.09] text-slate-300 hover:text-slate-100 font-medium text-[11px] border border-white/10 transition-all cursor-pointer`}
            title="Direktlink mit Zugangscode kopieren"
          >
            {copiedPrivateLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {!collapsed && (
                  <span className="text-emerald-300 font-bold truncate">
                    Link kopiert!
                  </span>
                )}
              </>
            ) : (
              <>
                <Link2 className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                {!collapsed && <span className="truncate">Privater Link</span>}
              </>
            )}
          </button>

          {/* Security Quick Row */}
          {collapsed ? (
            <button
              type="button"
              onClick={lockApp}
              title="App sperren"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/25 text-rose-300 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingPassword((prev) => !prev)}
                  title="Zugangspasswort ändern"
                  className="py-1.5 px-2 flex items-center justify-center gap-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  <Shield className="w-3 h-3 text-amber-300 shrink-0" />
                  <span className="truncate">Passwort</span>
                </button>
                <button
                  type="button"
                  onClick={lockApp}
                  title="App sperren"
                  className="py-1.5 px-2 flex items-center justify-center gap-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/25 text-rose-200 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  <Lock className="w-3 h-3 shrink-0" />
                  <span className="truncate">Sperren</span>
                </button>
              </div>

              {isEditingPassword && (
                <form
                  onSubmit={handlePasswordSave}
                  className="bg-[#0B0E14]/80 rounded-2xl p-2.5 border border-white/10 space-y-2"
                >
                  <input
                    type="password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Neuer Code..."
                    className="aurora-input w-full rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingPassword(false)}
                      className="px-2 py-1 rounded-full bg-white/10 text-[10px] font-semibold text-slate-300 cursor-pointer"
                    >
                      Abbr.
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-full bg-cyan-400 text-[#0B0E14] text-[10px] font-extrabold cursor-pointer"
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
