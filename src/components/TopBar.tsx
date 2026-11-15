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
  Cloud,
  HardDrive,
  Link2,
  CalendarDays,
  ChevronDown,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import { formatCurrency } from '../utils/vacationHelpers';

interface TopBarProps {
  spotlightTrigger?: number;
  escapeTrigger?: number;
  onOpenMobileCalendar?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  spotlightTrigger = 0,
  escapeTrigger = 0,
  onOpenMobileCalendar,
}) => {
  const {
    trip,
    currentUser,
    selectedDay,
    setCurrentUserById,
    addTraveler,
    setActiveTab,
    setSelectedDay,
    setSelectedActivityId,
    setIsWelcomeOpen,
    setSearchTarget,
    mapOpen,
    setMapOpen,
    setAccessKey,
    lockApp,
    getInviteUrl,
    showToast,
    isSyncing,
    isLocalMode,
  } = useVacation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isTravelerSheetOpen, setIsTravelerSheetOpen] = useState(false);
  const [isAddingTraveler, setIsAddingTraveler] = useState(false);
  const [newTravelerName, setNewTravelerName] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [newAccessKeyInput, setNewAccessKeyInput] = useState('');

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
    setIsMobileSearchOpen(true);
    setIsSearchOpen(true);
    setIsSecurityOpen(false);
    setIsTravelerSheetOpen(false);
    window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 10);
  }, [spotlightTrigger]);

  // Respond to Escape trigger from App shell
  useEffect(() => {
    if (escapeTrigger === 0) return;
    setIsSearchOpen(false);
    setIsMobileSearchOpen(false);
    setIsSecurityOpen(false);
    setIsTravelerSheetOpen(false);
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
    setIsTravelerSheetOpen(false);
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
    setIsMobileSearchOpen(false);
    searchInputRef.current?.blur();
  };

  return (
    <header className="mb-1 flex flex-col gap-2.5 sm:gap-3 min-w-0">
      {/* PHONE (< sm): Single Compact ~52-56px Header Bar */}
      <div className="sm:hidden flex items-center justify-between gap-2 min-h-[52px] bg-[#FAF7F2]/90 border border-[#E6DDD1] rounded-2xl px-2.5 py-1 shadow-sm">
        <button
          type="button"
          onClick={() => setIsWelcomeOpen(true)}
          title="Urlaub wechseln"
          className="flex items-center gap-2 min-w-0 flex-1 min-h-[44px] text-left cursor-pointer rounded-xl px-1 active:bg-[#F3ECE1] transition-colors"
        >
          <span className="w-8 h-8 rounded-xl bg-[#C85A38] text-white flex items-center justify-center font-black text-xs tracking-tight shrink-0 shadow-sm">
            VO
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-extrabold text-[#1F1B18] truncate leading-tight">
              {trip.title}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-[#6B6259] truncate">
              <span className="font-mono tabular-nums font-bold text-[#C85A38]">
                Tag {selectedDay}/{trip.totalDays}
              </span>
              <span className="text-[#DDD2C3]">·</span>
              <span className="truncate">{trip.destination}</span>
              {isSyncing && (
                <Cloud className="w-3 h-3 text-[#2A7B88] animate-pulse shrink-0 ml-0.5" />
              )}
            </span>
          </span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {/* 1. Spotlight Search Toggle (>=44px) */}
          <button
            type="button"
            onClick={() => {
              const next = !isMobileSearchOpen;
              setIsMobileSearchOpen(next);
              setIsSearchOpen(next);
              if (next) {
                window.setTimeout(() => {
                  searchInputRef.current?.focus();
                }, 20);
              }
            }}
            aria-label={isMobileSearchOpen ? 'Suche schließen' : 'Suche öffnen'}
            aria-expanded={isMobileSearchOpen}
            className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
              isMobileSearchOpen
                ? 'bg-[#C85A38] text-white border-[#C85A38] shadow-sm'
                : 'bg-white hover:bg-[#F3ECE1] border-[#DDD2C3] text-[#1F1B18]'
            }`}
          >
            {isMobileSearchOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Search className="w-4 h-4 text-[#C85A38]" />
            )}
          </button>

          {/* 2. Calendar Sheet Button (>=44px) */}
          <button
            type="button"
            onClick={() => onOpenMobileCalendar?.()}
            aria-label="Kalender & Ablauf öffnen"
            className="w-11 h-11 rounded-full bg-white hover:bg-[#F3ECE1] border border-[#DDD2C3] text-[#1F1B18] flex items-center justify-center transition-colors cursor-pointer"
          >
            <CalendarDays className="w-4 h-4 text-[#2A7B88]" />
          </button>

          {/* 3. Active Traveler Chip (>=44px, opens viewport-clamped sheet) */}
          <button
            type="button"
            onClick={() => setIsTravelerSheetOpen(true)}
            aria-label={`Aktiver Reisender: ${currentUser.name}. Profil & Sicherheit öffnen`}
            aria-expanded={isTravelerSheetOpen}
            className="min-w-[44px] min-h-[44px] pl-1.5 pr-2 rounded-full bg-white hover:bg-[#F3ECE1] border border-[#DDD2C3] flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-[#1F1B18] border border-black/10 shrink-0"
              style={{ backgroundColor: currentUser.color }}
            >
              {currentUser.initials}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#6B6259] shrink-0" />
          </button>
        </div>
      </div>

      {/* Row 1: Spotlight Search (always shown on sm+, expandable on <sm) + Desktop/Tablet Controls */}
      <div
        className={`${
          isMobileSearchOpen ? 'flex' : 'hidden sm:flex'
        } flex-col md:flex-row md:items-center justify-between gap-2.5 min-w-0`}
      >
        {/* Centered Spotlight Search Bar */}
        <div
          ref={searchContainerRef}
          className="relative flex-1 max-w-xl w-full md:mx-auto xl:mx-0 min-w-0"
        >
          <div
            className={`flex items-center gap-2 rounded-full px-3.5 sm:px-4 py-2 min-h-[44px] sm:min-h-0 border transition-all ${
              isSearchOpen
                ? 'bg-white border-[#C85A38]/55 shadow-md ring-2 ring-[#C85A38]/15'
                : 'bg-[#FAF7F2]/90 hover:bg-white border-[#DDD2C3] shadow-sm'
            } backdrop-blur-xl`}
          >
            <Search className="w-4 h-4 text-[#C85A38] shrink-0" />
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
              className="bg-transparent text-xs sm:text-sm text-[#1F1B18] placeholder-[#8C8277] focus:outline-none flex-1 min-w-0"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                aria-label="Suchtext löschen"
                className="w-8 h-8 sm:w-6 sm:h-6 rounded-full hover:bg-[#F3ECE1] text-[#6B6259] hover:text-[#1F1B18] flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 font-mono tabular-nums text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F3ECE1] border border-[#DDD2C3] text-[#6B6259] shrink-0">
                ⌘K
              </kbd>
            )}
          </div>

          {/* Opaque Light Search Dropdown */}
          {showDropdown && (
            <div
              role="listbox"
              aria-label="Suchergebnisse"
              className="absolute left-0 right-0 top-full mt-2 bg-white/[0.98] backdrop-blur-2xl rounded-3xl shadow-2xl border border-[#DDD2C3] p-3.5 z-50 max-h-[65vh] overflow-y-auto text-[#1F1B18]"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E6DDD1] px-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B6259]">
                  Treffer{' '}
                  <span className="font-mono tabular-nums text-[#C85A38]">
                    ({totalMatches})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={closeSearch}
                  className="text-[11px] font-bold text-[#6B6259] hover:text-[#1F1B18] cursor-pointer"
                >
                  ESC schließen
                </button>
              </div>

              {totalMatches === 0 ? (
                <p className="text-xs text-[#6B6259] py-5 text-center">
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
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl hover:bg-[#FAF7F2] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#1F1B18] truncate">
                          {act.title}
                        </p>
                        <p className="text-[11px] text-[#6B6259] truncate mt-0.5">
                          <span className="font-mono tabular-nums text-[#C85A38] font-semibold">
                            Tag {act.dayNumber} · {act.timeSlot}
                          </span>
                          {act.location ? ` · ${act.location}` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#C85A38]/12 border border-[#C85A38]/30 text-[#9E3F22] shrink-0">
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
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl hover:bg-[#FAF7F2] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#1F1B18] truncate">
                          {meal.title}
                        </p>
                        <p className="text-[11px] text-[#6B6259] truncate mt-0.5">
                          <span className="font-mono tabular-nums text-[#4E5F40] font-semibold">
                            Tag {meal.dayNumber} · {meal.time}
                          </span>
                          {meal.locationOrRecipe ? ` · ${meal.locationOrRecipe}` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#6E7F5E]/14 border border-[#6E7F5E]/30 text-[#4E5F40] shrink-0">
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
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl hover:bg-[#FAF7F2] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#1F1B18] truncate">
                          {idea.title}
                        </p>
                        <p className="text-[11px] text-[#6B6259] truncate mt-0.5">
                          {idea.location || idea.description}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#D9822B]/14 border border-[#D9822B]/30 text-[#9E5A14] shrink-0">
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
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl hover:bg-[#FAF7F2] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#1F1B18] truncate">
                          {poll.question}
                        </p>
                        {(matchedOptionText || poll.isClosed) && (
                          <p className="text-[11px] text-[#6B6259] truncate mt-0.5">
                            {matchedOptionText
                              ? `Option: ${matchedOptionText}`
                              : 'Abgeschlossene Abstimmung'}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#D9822B]/14 border border-[#D9822B]/30 text-[#9E5A14] shrink-0">
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
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl hover:bg-[#FAF7F2] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#1F1B18] truncate">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-[11px] text-[#6B6259] truncate mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#2A7B88]/12 border border-[#2A7B88]/30 text-[#1F5E68] shrink-0">
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
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl hover:bg-[#FAF7F2] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#1F1B18] truncate">
                          {exp.title}
                        </p>
                        <p className="font-mono tabular-nums text-[11px] text-[#6B6259] truncate mt-0.5">
                          {formatCurrency(exp.amount, trip.currency)}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#6E7F5E]/14 border border-[#6E7F5E]/30 text-[#4E5F40] shrink-0">
                        Ausgabe
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Controls (Tablet sm+ & Desktop lg+): Sync Indicator + Calendar Sheet + Map Toggle + Invite + Security + Switch Trip */}
        <div className="hidden sm:flex flex-wrap items-center justify-end gap-2 min-w-0 max-w-full w-full md:w-auto">
          {/* Cloud / Local Sync Status */}
          <span
            title={
              isSyncing
                ? 'Änderungen werden in der Cloud gespeichert'
                : isLocalMode
                ? 'Lokaler Browser-Modus aktiv'
                : 'Cloud-Sync aktiv'
            }
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#FAF7F2] border border-[#E6DDD1] text-[11px] font-semibold text-[#6B6259]"
          >
            {isSyncing ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-[#2A7B88] animate-pulse" />
                <span className="text-[#1F5E68]">Speichert…</span>
              </>
            ) : isLocalMode ? (
              <>
                <HardDrive className="w-3.5 h-3.5 text-[#6B6259]" />
                <span>Lokal</span>
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 text-[#4E5F40]" />
                <span>Synced</span>
              </>
            )}
          </span>

          {/* Calendar Sheet Toggle (Tablet sm..lg always, and lg..xl when mapOpen hides right calendar column) */}
          {onOpenMobileCalendar && (
            <button
              type="button"
              onClick={onOpenMobileCalendar}
              title="Kalender & Tagesablauf öffnen"
              aria-label="Kalender & Tagesablauf öffnen"
              className={`${
                mapOpen ? '2xl:hidden' : 'lg:hidden'
              } inline-flex items-center gap-1.5 bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#DDD2C3] text-[#1F1B18] text-xs font-bold px-3 py-2 min-h-[40px] lg:min-h-0 rounded-full transition-colors cursor-pointer`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-[#2A7B88]" />
              <span>Kalender</span>
            </button>
          )}

          {/* Map Cockpit Toggle (Tablet sm..lg & Desktop lg+) */}
          <button
            type="button"
            onClick={() => setMapOpen(!mapOpen)}
            aria-pressed={mapOpen}
            className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-2 min-h-[40px] lg:min-h-0 rounded-full border transition-all cursor-pointer ${
              mapOpen
                ? 'bg-[#2A7B88] text-white border-[#2A7B88] shadow-sm'
                : 'bg-[#2A7B88]/10 hover:bg-[#2A7B88]/18 text-[#1F5E68] border-[#2A7B88]/30'
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
            className="inline-flex items-center gap-1.5 bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#DDD2C3] text-[#1F1B18] text-xs font-bold px-3 py-2 min-h-[40px] lg:min-h-0 rounded-full transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#4E5F40]" />
                <span className="text-[#4E5F40]">Link kopiert!</span>
              </>
            ) : (
              <>
                <Link2 className="w-3.5 h-3.5 text-[#2A7B88]" />
                <span className="hidden md:inline">Privater Link</span>
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
              className={`w-10 h-10 lg:w-9 lg:h-9 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                isSecurityOpen
                  ? 'bg-[#D9822B]/18 border-[#D9822B]/45 text-[#9E5A14]'
                  : 'bg-[#FAF7F2] hover:bg-[#F3ECE1] border-[#DDD2C3] text-[#6B6259] hover:text-[#1F1B18]'
              }`}
            >
              <Shield className="w-4 h-4" />
            </button>

            {isSecurityOpen && (
              <div
                role="dialog"
                aria-label="Sicherheitseinstellungen"
                className="absolute right-0 top-full mt-2 w-[min(19rem,calc(100vw-2rem))] bg-white/[0.98] backdrop-blur-2xl rounded-3xl border border-[#DDD2C3] shadow-2xl p-4 z-50 space-y-3.5 text-[#1F1B18]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#E6DDD1]">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#1F1B18]">
                    <KeyRound className="w-3.5 h-3.5 text-[#D9822B]" />
                    Zugangsschutz
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSecurityOpen(false)}
                    aria-label="Schließen"
                    className="text-[#6B6259] hover:text-[#1F1B18] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <form onSubmit={handleUpdateAccessKey} className="space-y-2">
                  <label
                    htmlFor="topbar-new-access-key"
                    className="block text-[11px] font-bold text-[#1F1B18]"
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
                      className="surface-input flex-1 min-w-0 rounded-xl px-3 py-2 text-xs font-semibold"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-xl bg-[#C85A38] hover:bg-[#B54B2B] text-white text-xs font-extrabold transition-colors cursor-pointer shrink-0"
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
                  className="w-full py-2 px-3 rounded-full bg-rose-500/10 hover:bg-rose-500/18 border border-rose-500/30 text-rose-700 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
            className="inline-flex items-center gap-1.5 bg-[#F3ECE1] hover:bg-[#E6DDD1] border border-[#DDD2C3] text-[#1F1B18] text-xs font-bold px-3.5 py-2 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#D9822B]" />
            <span>Urlaub wechseln</span>
          </button>
        </div>
      </div>

      {/* Row 2 (Tablet sm+ & Desktop lg+): "Ich bin:" Traveler Pills */}
      <div className="hidden sm:flex items-center gap-2 min-w-0 w-full">
        <div className="flex items-center flex-nowrap gap-1.5 bg-[#FAF7F2]/90 backdrop-blur-xl rounded-full p-1.5 border border-[#E6DDD1] w-auto max-w-full overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-[#6B6259] pl-2 pr-1 shrink-0">
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
                    ? 'bg-[#C85A38] text-white font-extrabold shadow-sm'
                    : 'bg-white text-[#6B6259] hover:bg-[#F3ECE1] hover:text-[#1F1B18] border border-[#E6DDD1] font-medium'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-[#1F1B18] shrink-0"
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
              className="w-7 h-7 rounded-full bg-white hover:bg-[#F3ECE1] border border-[#DDD2C3] text-[#6B6259] hover:text-[#C85A38] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          ) : (
            <form
              onSubmit={handleAddTravelerSubmit}
              className="inline-flex items-center gap-1 bg-white rounded-full pl-2.5 pr-1 py-0.5 border border-[#C85A38]/45 shrink-0"
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
                className="text-xs text-[#1F1B18] placeholder-[#8C8277] bg-transparent focus:outline-none w-24"
              />
              <button
                type="submit"
                aria-label="Name speichern"
                className="w-5 h-5 rounded-full bg-[#C85A38] text-white flex items-center justify-center cursor-pointer"
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
                className="w-5 h-5 rounded-full bg-[#F3ECE1] text-[#6B6259] flex items-center justify-center cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* PHONE (< sm): Safe Viewport-Clamped Traveler & Security Bottom Sheet */}
      {isTravelerSheetOpen && (
        <div
          className="sm:hidden fixed inset-0 z-50 flex items-end p-0"
          role="dialog"
          aria-modal="true"
          aria-label="Reisende & Sicherheit"
        >
          <div
            className="fixed inset-0 bg-[#1F1B18]/45 backdrop-blur-sm"
            onClick={() => setIsTravelerSheetOpen(false)}
          />
          <div className="mobile-sheet relative z-10 w-full max-h-[88dvh] bg-white/[0.98] backdrop-blur-2xl rounded-t-3xl border-t border-[#DDD2C3] px-4 pt-2.5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] overflow-y-auto shadow-2xl space-y-4 text-[#1F1B18]">
            <div className="w-10 h-1 rounded-full bg-[#DDD2C3] mx-auto shrink-0" />

            <div className="flex items-center justify-between pb-2 border-b border-[#E6DDD1]">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-[#1F1B18] border border-black/10 shrink-0"
                  style={{ backgroundColor: currentUser.color }}
                >
                  {currentUser.initials}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-[#1F1B18] truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-[11px] text-[#6B6259] flex items-center gap-1">
                    {isSyncing ? (
                      <>
                        <Cloud className="w-3 h-3 text-[#2A7B88] animate-pulse" />
                        <span>Speichert…</span>
                      </>
                    ) : isLocalMode ? (
                      <>
                        <HardDrive className="w-3 h-3" />
                        <span>Lokaler Modus</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-3 h-3 text-[#4E5F40]" />
                        <span>Cloud-Sync aktiv</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTravelerSheetOpen(false)}
                aria-label="Schließen"
                className="w-11 h-11 rounded-full bg-[#F3ECE1] hover:bg-[#E6DDD1] text-[#1F1B18] flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Traveler Switcher */}
            <div className="space-y-2">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#6B6259]">
                Ich bin:
              </span>
              <div className="flex flex-wrap gap-2">
                {trip.travelers.map((traveler) => {
                  const isSelected = traveler.id === currentUser.id;
                  return (
                    <button
                      key={traveler.id}
                      type="button"
                      onClick={() => setCurrentUserById(traveler.id)}
                      className={`min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs transition-all cursor-pointer max-w-full ${
                        isSelected
                          ? 'bg-[#C85A38] text-white font-extrabold shadow-sm'
                          : 'bg-[#FAF7F2] text-[#1F1B18] hover:bg-[#F3ECE1] border border-[#E6DDD1] font-semibold'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-[#1F1B18] shrink-0"
                        style={{ backgroundColor: traveler.color }}
                      >
                        {traveler.initials}
                      </span>
                      <span className="truncate">{traveler.name}</span>
                    </button>
                  );
                })}
              </div>

              {!isAddingTraveler ? (
                <button
                  type="button"
                  onClick={() => setIsAddingTraveler(true)}
                  className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-dashed border-[#DDD2C3] text-xs font-bold text-[#6B6259] cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-[#C85A38]" />
                  <span>Mitreisende/n hinzufügen</span>
                </button>
              ) : (
                <form
                  onSubmit={handleAddTravelerSubmit}
                  className="flex items-center gap-2 bg-[#FAF7F2] rounded-2xl p-2 border border-[#C85A38]/45"
                >
                  <input
                    type="text"
                    value={newTravelerName}
                    onChange={(e) => setNewTravelerName(e.target.value)}
                    placeholder="Name eingeben..."
                    autoFocus
                    className="surface-input flex-1 min-w-0 min-h-[44px] rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                  <button
                    type="submit"
                    aria-label="Name speichern"
                    className="w-11 h-11 rounded-xl bg-[#C85A38] text-white flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Abbrechen"
                    onClick={() => {
                      setIsAddingTraveler(false);
                      setNewTravelerName('');
                    }}
                    className="w-11 h-11 rounded-xl bg-[#F3ECE1] text-[#6B6259] flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

            {/* Trip & Invite Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E6DDD1]">
              <button
                type="button"
                onClick={() => {
                  setIsTravelerSheetOpen(false);
                  setIsWelcomeOpen(true);
                }}
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 bg-[#F3ECE1] hover:bg-[#E6DDD1] border border-[#DDD2C3] text-[#1F1B18] text-xs font-bold px-3 py-2 rounded-full transition-colors cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-[#D9822B] shrink-0" />
                <span className="truncate">Urlaub wechseln</span>
              </button>

              <button
                type="button"
                onClick={handleCopyPrivateLink}
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#DDD2C3] text-[#1F1B18] text-xs font-bold px-3 py-2 rounded-full transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#4E5F40] shrink-0" />
                    <span className="text-[#4E5F40] truncate">Kopiert!</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5 text-[#2A7B88] shrink-0" />
                    <span className="truncate">Privater Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Security Section (safe viewport-clamped) */}
            <div className="pt-2 border-t border-[#E6DDD1] space-y-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#1F1B18]">
                <KeyRound className="w-3.5 h-3.5 text-[#D9822B]" />
                Zugangsschutz
              </span>

              <form onSubmit={handleUpdateAccessKey} className="space-y-2">
                <label
                  htmlFor="mobile-new-access-key"
                  className="block text-[11px] font-bold text-[#1F1B18]"
                >
                  Passwort ändern
                </label>
                <div className="flex gap-2">
                  <input
                    id="mobile-new-access-key"
                    type="password"
                    value={newAccessKeyInput}
                    onChange={(e) => setNewAccessKeyInput(e.target.value)}
                    placeholder="Neuer Code..."
                    className="surface-input flex-1 min-w-0 min-h-[44px] rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                  <button
                    type="submit"
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#C85A38] hover:bg-[#B54B2B] text-white text-xs font-extrabold transition-colors cursor-pointer shrink-0"
                  >
                    Setzen
                  </button>
                </div>
              </form>

              <button
                type="button"
                onClick={() => {
                  setIsTravelerSheetOpen(false);
                  lockApp();
                }}
                className="w-full min-h-[44px] py-2.5 px-3 rounded-full bg-rose-500/10 hover:bg-rose-500/18 border border-rose-500/30 text-rose-700 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>App jetzt sperren</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default TopBar;
