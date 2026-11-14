import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  UserPlus,
  Check,
  X,
  Lock,
  ArrowLeftRight,
  Map as MapIcon,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  Cloud,
  HardDrive,
  Link2,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import { formatCurrency } from '../utils/vacationHelpers';

interface TopBarProps {
  spotlightTrigger?: number;
  escapeTrigger?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  spotlightTrigger = 0,
  escapeTrigger = 0,
}) => {
  const {
    trip,
    currentUser,
    setCurrentUserById,
    addTraveler,
    setActiveTab,
    setSelectedDay,
    setSelectedActivityId,
    setIsWelcomeOpen,
    setSearchTarget,
    mapOpen,
    setMapOpen,
    accessKey,
    setAccessKey,
    lockApp,
    getInviteUrl,
    showToast,
    isSyncing,
    isLocalMode,
  } = useVacation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddingTraveler, setIsAddingTraveler] = useState(false);
  const [newTravelerName, setNewTravelerName] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [newAccessKeyInput, setNewAccessKeyInput] = useState('');
  const [showCurrentKey, setShowCurrentKey] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const securityContainerRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  // Respond to Cmd/Ctrl+K trigger from App shell
  useEffect(() => {
    if (spotlightTrigger === 0) return;
    setIsSearchOpen(true);
    setIsSecurityOpen(false);
    window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 10);
  }, [spotlightTrigger]);

  // Respond to Escape trigger from App shell
  useEffect(() => {
    if (escapeTrigger === 0) return;
    setIsSearchOpen(false);
    setIsSecurityOpen(false);
    setIsAddingTraveler(false);
  }, [escapeTrigger]);

  // Click-outside closes search dropdown and security popover
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target)
      ) {
        setIsSearchOpen(false);
      }
      if (
        securityContainerRef.current &&
        !securityContainerRef.current.contains(target)
      ) {
        setIsSecurityOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const handleAddTravelerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTravelerName.trim();
    if (!trimmed) {
      showToast('Bitte gib einen Namen ein', 'warning');
      return;
    }
    const added = addTraveler(trimmed, 'Mitreisende/r');
    if (added) {
      setNewTravelerName('');
      setIsAddingTraveler(false);
    }
  };

  const handleCopyPrivateLink = async () => {
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
      setCopiedLink(true);
      showToast('Privater Einladungslink (#access) kopiert', 'success', {
        durationMs: 2500,
      });
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedLink(false);
        copyTimerRef.current = null;
      }, 2500);
    } catch {
      showToast('Link konnte nicht kopiert werden', 'warning');
    }
  };

  const handleUpdateAccessKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newAccessKeyInput.trim();
    if (!cleaned) {
      showToast('Neues Passwort darf nicht leer sein', 'warning');
      return;
    }
    setAccessKey(cleaned);
    setNewAccessKeyInput('');
    setIsSecurityOpen(false);
  };

  const clampDay = (day?: number): number => {
    if (!day || !Number.isFinite(day)) return 1;
    return Math.max(1, Math.min(Math.round(day), trip.totalDays || 1));
  };

  // Live search across ALL fields including descriptions, ShoppingNotes & poll options
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const hasSearch = trimmedQuery.length > 0;

  const matchedActivities = hasSearch
    ? trip.activities.filter(
        (a) =>
          a.title.toLowerCase().includes(trimmedQuery) ||
          a.location.toLowerCase().includes(trimmedQuery) ||
          a.description.toLowerCase().includes(trimmedQuery)
      )
    : [];

  const matchedMeals = hasSearch
    ? trip.meals.filter(
        (m) =>
          m.title.toLowerCase().includes(trimmedQuery) ||
          m.locationOrRecipe.toLowerCase().includes(trimmedQuery) ||
          m.description.toLowerCase().includes(trimmedQuery) ||
          (m.ShoppingNotes && m.ShoppingNotes.toLowerCase().includes(trimmedQuery))
      )
    : [];

  const matchedIdeas = hasSearch
    ? (trip.ideas || []).filter(
        (idea) =>
          idea.title.toLowerCase().includes(trimmedQuery) ||
          idea.description.toLowerCase().includes(trimmedQuery) ||
          (idea.location && idea.location.toLowerCase().includes(trimmedQuery))
      )
    : [];

  const matchedPolls = hasSearch
    ? trip.polls
        .map((poll): { poll: (typeof trip.polls)[number]; matchedOptionText?: string } | null => {
          const matchedOption = poll.options.find(
            (opt) =>
              opt.text.toLowerCase().includes(trimmedQuery) ||
              (opt.subtitle && opt.subtitle.toLowerCase().includes(trimmedQuery))
          );
          const matchesQuestion = poll.question
            .toLowerCase()
            .includes(trimmedQuery);
          return matchesQuestion || matchedOption
            ? { poll, matchedOptionText: matchedOption?.text }
            : null;
        })
        .filter(
          (item): item is { poll: (typeof trip.polls)[number]; matchedOptionText?: string } =>
            item !== null
        )
    : [];

  const matchedTasks = hasSearch
    ? trip.tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(trimmedQuery) ||
          (t.description && t.description.toLowerCase().includes(trimmedQuery))
      )
    : [];

  const matchedExpenses = hasSearch
    ? (trip.expenses || []).filter(
        (exp) =>
          exp.title.toLowerCase().includes(trimmedQuery) ||
          exp.category.toLowerCase().includes(trimmedQuery)
      )
    : [];

  const totalMatches =
    matchedActivities.length +
    matchedMeals.length +
    matchedIdeas.length +
    matchedPolls.length +
    matchedTasks.length +
    matchedExpenses.length;

  const showDropdown = isSearchOpen && hasSearch;

  const closeSearch = () => {
    setSearchQuery('');
    setIsSearchOpen(false);
    searchInputRef.current?.blur();
  };

  return (
    <header className="mb-1 flex flex-col gap-3 min-w-0">
      {/* Row 1: Centered Spotlight Search + Primary Cockpit & Security Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 min-w-0">
        {/* Centered Spotlight Search Bar */}
        <div
          ref={searchContainerRef}
          className="relative flex-1 max-w-xl w-full md:mx-auto xl:mx-0 min-w-0"
        >
          <div
            className={`flex items-center gap-2.5 rounded-full px-4 py-2 border transition-all ${
              isSearchOpen
                ? 'bg-[#131823]/[0.98] border-cyan-400/50 shadow-[0_0_24px_rgba(34,211,238,0.18)]'
                : 'bg-[#131823]/80 hover:bg-[#1B2232]/90 border-white/12 shadow-sm'
            } backdrop-blur-xl`}
          >
            <Search className="w-4 h-4 text-cyan-300 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isSearchOpen) setIsSearchOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  closeSearch();
                }
              }}
              placeholder="Spotlight-Suche: Orte, Essen, Ideen, Abstimmungen..."
              aria-label="Spotlight-Suche im Urlaub"
              className="bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none flex-1 min-w-0"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                aria-label="Suchtext löschen"
                className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-slate-100 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 font-mono tabular-nums text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/[0.07] border border-white/10 text-slate-300 shrink-0">
                ⌘K
              </kbd>
            )}
          </div>

          {/* Opaque Midnight Aurora Search Dropdown */}
          {showDropdown && (
            <div
              role="listbox"
              aria-label="Suchergebnisse"
              className="absolute left-0 right-0 top-full mt-2 bg-[#131823]/[0.98] backdrop-blur-2xl rounded-3xl shadow-[0_28px_70px_rgba(0,0,0,0.85)] border border-white/15 p-3.5 z-50 max-h-[65vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 px-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Treffer{' '}
                  <span className="font-mono tabular-nums text-cyan-300">
                    ({totalMatches})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={closeSearch}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-100 cursor-pointer"
                >
                  ESC schließen
                </button>
              </div>

              {totalMatches === 0 ? (
                <p className="text-xs text-slate-400 py-5 text-center">
                  Keine Einträge für „{searchQuery}“ gefunden.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {matchedActivities.map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => {
                        const day = clampDay(act.dayNumber);
                        setSelectedDay(day);
                        setSelectedActivityId(act.id);
                        setSearchTarget({
                          tab: 'schedule',
                          kind: 'activity',
                          id: act.id,
                          dayNumber: day,
                        });
                        setActiveTab('schedule');
                        closeSearch();
                      }}
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl hover:bg-white/[0.08] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-100 truncate">
                          {act.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          <span className="font-mono tabular-nums text-cyan-300">
                            Tag {act.dayNumber} · {act.timeSlot}
                          </span>
                          {act.location ? ` · ${act.location}` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 shrink-0">
                        Tagesplan
                      </span>
                    </button>
                  ))}

                  {matchedMeals.map((meal) => (
                    <button
                      key={meal.id}
                      type="button"
                      onClick={() => {
                        const day = clampDay(meal.dayNumber);
                        setSelectedDay(day);
                        setSearchTarget({
                          tab: 'meals',
                          kind: 'meal',
                          id: meal.id,
                          dayNumber: day,
                        });
                        setActiveTab('meals');
                        closeSearch();
                      }}
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl hover:bg-white/[0.08] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-100 truncate">
                          {meal.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          <span className="font-mono tabular-nums text-emerald-300">
                            Tag {meal.dayNumber} · {meal.time}
                          </span>
                          {meal.locationOrRecipe ? ` · ${meal.locationOrRecipe}` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 shrink-0">
                        Essen
                      </span>
                    </button>
                  ))}

                  {matchedIdeas.map((idea) => (
                    <button
                      key={idea.id}
                      type="button"
                      onClick={() => {
                        setSearchTarget({
                          tab: 'ideas',
                          kind: 'idea',
                          id: idea.id,
                        });
                        setActiveTab('ideas');
                        closeSearch();
                      }}
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl hover:bg-white/[0.08] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-100 truncate">
                          {idea.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {idea.location || idea.description}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-violet-400/15 border border-violet-400/30 text-violet-300 shrink-0">
                        Idee
                      </span>
                    </button>
                  ))}

                  {matchedPolls.map(({ poll, matchedOptionText }) => (
                    <button
                      key={poll.id}
                      type="button"
                      onClick={() => {
                        setSearchTarget({
                          tab: 'polls',
                          kind: 'poll',
                          id: poll.id,
                          dayNumber: poll.dayNumber,
                        });
                        setActiveTab('polls');
                        closeSearch();
                      }}
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl hover:bg-white/[0.08] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-100 truncate">
                          {poll.question}
                        </p>
                        {(matchedOptionText || poll.isClosed) && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {matchedOptionText
                              ? `Option: ${matchedOptionText}`
                              : 'Abgeschlossene Abstimmung'}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 shrink-0">
                        Umfrage
                      </span>
                    </button>
                  ))}

                  {matchedTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => {
                        setSearchTarget({
                          tab: 'tasks',
                          kind: 'task',
                          id: task.id,
                        });
                        setActiveTab('tasks');
                        closeSearch();
                      }}
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl hover:bg-white/[0.08] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-100 truncate">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-sky-400/15 border border-sky-400/30 text-sky-300 shrink-0">
                        Aufgabe
                      </span>
                    </button>
                  ))}

                  {matchedExpenses.map((exp) => (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => {
                        setSearchTarget({
                          tab: 'budget',
                          kind: 'expense',
                          id: exp.id,
                          dayNumber: exp.dayNumber,
                        });
                        setActiveTab('budget');
                        closeSearch();
                      }}
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl hover:bg-white/[0.08] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-100 truncate">
                          {exp.title}
                        </p>
                        <p className="font-mono tabular-nums text-[11px] text-slate-400 truncate mt-0.5">
                          {formatCurrency(exp.amount, trip.currency)}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 shrink-0">
                        Ausgabe
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Controls: Sync Indicator + Map Toggle + Invite + Security + Switch Trip */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 min-w-0 max-w-full w-full md:w-auto">
          {/* Cloud / Local Sync Status */}
          <span
            title={
              isSyncing
                ? 'Änderungen werden in der Cloud gespeichert'
                : isLocalMode
                ? 'Lokaler Browser-Modus aktiv'
                : 'Cloud-Sync aktiv'
            }
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-[11px] font-semibold text-slate-300"
          >
            {isSyncing ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                <span className="text-cyan-200">Speichert…</span>
              </>
            ) : isLocalMode ? (
              <>
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                <span>Lokal</span>
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>Synced</span>
              </>
            )}
          </span>

          {/* Map Cockpit Toggle (Desktop only; Mobile uses Sidebar Mobile Top Bar button) */}
          <button
            type="button"
            onClick={() => setMapOpen(!mapOpen)}
            aria-pressed={mapOpen}
            className={`hidden lg:inline-flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-2 rounded-full border transition-all cursor-pointer ${
              mapOpen
                ? 'bg-cyan-400 text-[#0B0E14] border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.35)]'
                : 'bg-white/[0.07] hover:bg-white/[0.14] text-cyan-200 border-cyan-400/30'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>{mapOpen ? 'Karte schließen' : 'Karte ausfahren'}</span>
          </button>

          {/* Private Invite Link Button */}
          <button
            type="button"
            onClick={handleCopyPrivateLink}
            title="Privaten Direktlink inkl. Zugangsschlüssel (#access) kopieren"
            className="inline-flex items-center gap-1.5 bg-white/[0.07] hover:bg-white/[0.14] border border-white/12 text-slate-100 text-xs font-bold px-3 py-2 rounded-full transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Link kopiert!</span>
              </>
            ) : (
              <>
                <Link2 className="w-3.5 h-3.5 text-cyan-300" />
                <span className="hidden sm:inline">Privater Link</span>
              </>
            )}
          </button>

          {/* Security Popover (Passwort ändern / App sperren) */}
          <div ref={securityContainerRef} className="relative">
            <button
              type="button"
              onClick={() => setIsSecurityOpen((prev) => !prev)}
              aria-expanded={isSecurityOpen}
              aria-label="Sicherheit & Zugangscode"
              title="Passwort ändern oder App sperren"
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                isSecurityOpen
                  ? 'bg-amber-400/20 border-amber-400/45 text-amber-200'
                  : 'bg-white/[0.07] hover:bg-white/[0.14] border-white/12 text-slate-300 hover:text-amber-200'
              }`}
            >
              <Shield className="w-4 h-4" />
            </button>

            {isSecurityOpen && (
              <div
                role="dialog"
                aria-label="Sicherheitseinstellungen"
                className="absolute right-0 top-full mt-2 w-72 bg-[#131823]/[0.98] backdrop-blur-2xl rounded-3xl border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.85)] p-4 z-50 space-y-3.5"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-100">
                    <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                    Zugangsschutz
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSecurityOpen(false)}
                    aria-label="Schließen"
                    className="text-slate-400 hover:text-slate-100 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="rounded-2xl bg-[#0B0E14]/80 border border-white/10 px-3 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Aktueller Code
                    </span>
                    <span className="font-mono tabular-nums text-xs font-bold text-cyan-300 truncate block">
                      {showCurrentKey ? accessKey : '••••••••'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCurrentKey((prev) => !prev)}
                    aria-label={
                      showCurrentKey ? 'Code verbergen' : 'Code anzeigen'
                    }
                    className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-slate-100 cursor-pointer"
                  >
                    {showCurrentKey ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <form onSubmit={handleUpdateAccessKey} className="space-y-2">
                  <label
                    htmlFor="topbar-new-access-key"
                    className="block text-[11px] font-bold text-slate-300"
                  >
                    Passwort ändern
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      id="topbar-new-access-key"
                      type="password"
                      value={newAccessKeyInput}
                      onChange={(e) => setNewAccessKeyInput(e.target.value)}
                      placeholder="Neuer Code..."
                      className="aurora-input flex-1 min-w-0 rounded-xl px-3 py-2 text-xs font-semibold"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#0B0E14] text-xs font-extrabold transition-colors cursor-pointer shrink-0"
                    >
                      Setzen
                    </button>
                  </div>
                </form>

                <button
                  type="button"
                  onClick={() => {
                    setIsSecurityOpen(false);
                    lockApp();
                  }}
                  className="w-full py-2 px-3 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/35 text-rose-200 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>App jetzt sperren</span>
                </button>
              </div>
            )}
          </div>

          {/* Switch Trip / User */}
          <button
            type="button"
            onClick={() => setIsWelcomeOpen(true)}
            className="inline-flex items-center gap-1.5 bg-white/[0.1] hover:bg-white/[0.16] border border-white/15 text-slate-100 text-xs font-bold px-3.5 py-2 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-300" />
            <span>Urlaub wechseln</span>
          </button>
        </div>
      </div>

      {/* Row 2: Responsive "Ich bin:" Traveler Pills (wrap/scroll cleanly on 390px) */}
      <div className="flex items-center gap-2 min-w-0 w-full">
        <div className="flex items-center flex-wrap sm:flex-nowrap gap-1.5 bg-[#131823]/80 backdrop-blur-xl rounded-2xl sm:rounded-full p-1.5 border border-white/10 w-full sm:w-auto max-w-full overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 pl-2 pr-1 shrink-0">
            Ich bin:
          </span>

          {trip.travelers.map((traveler) => {
            const isSelected = traveler.id === currentUser.id;
            return (
              <button
                key={traveler.id}
                type="button"
                onClick={() => setCurrentUserById(traveler.id)}
                title={`Als ${traveler.name} planen & abstimmen`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer shrink-0 max-w-[140px] ${
                  isSelected
                    ? 'bg-cyan-400 text-[#0B0E14] font-extrabold shadow-[0_0_14px_rgba(34,211,238,0.28)]'
                    : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.1] hover:text-slate-100 font-medium'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-[#0B0E14] shrink-0"
                  style={{ backgroundColor: traveler.color }}
                >
                  {traveler.initials}
                </span>
                <span className="truncate">{traveler.name}</span>
              </button>
            );
          })}

          {!isAddingTraveler ? (
            <button
              type="button"
              onClick={() => setIsAddingTraveler(true)}
              title="Weiteren Namen hinzufügen"
              aria-label="Weiteren Namen hinzufügen"
              className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          ) : (
            <form
              onSubmit={handleAddTravelerSubmit}
              className="inline-flex items-center gap-1 bg-[#0B0E14]/90 rounded-full pl-2.5 pr-1 py-0.5 border border-cyan-400/40 shrink-0"
            >
              <input
                type="text"
                value={newTravelerName}
                onChange={(e) => setNewTravelerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsAddingTraveler(false);
                    setNewTravelerName('');
                  }
                }}
                placeholder="Name..."
                autoFocus
                className="text-xs text-slate-100 placeholder-slate-500 bg-transparent focus:outline-none w-24"
              />
              <button
                type="submit"
                aria-label="Name speichern"
                className="w-5 h-5 rounded-full bg-cyan-400 text-[#0B0E14] flex items-center justify-center cursor-pointer"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                aria-label="Abbrechen"
                onClick={() => {
                  setIsAddingTraveler(false);
                  setNewTravelerName('');
                }}
                className="w-5 h-5 rounded-full bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
