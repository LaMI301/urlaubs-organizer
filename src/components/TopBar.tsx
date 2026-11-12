import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  UserPlus,
  Check,
  X,
  Lock,
  ArrowLeftRight,
  ChevronLeft,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';

export const TopBar: React.FC = () => {
  const {
    trip,
    currentUser,
    setCurrentUserById,
    addTraveler,
    setActiveTab,
    setSelectedDay,
    setSelectedActivityId,
    setIsWelcomeOpen,
    accessKey,
  } = useVacation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isAddingTraveler, setIsAddingTraveler] = useState(false);
  const [newTravelerName, setNewTravelerName] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const showSearchPill = isSearchExpanded || searchQuery.length > 0;

  useEffect(() => {
    if (isSearchExpanded) {
      searchInputRef.current?.focus();
    }
  }, [isSearchExpanded]);

  const handleAddTravelerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTravelerName.trim();
    if (!trimmed) return;
    addTraveler(trimmed, 'Mitreisende/r');
    setNewTravelerName('');
    setIsAddingTraveler(false);
  };

  const handleCopyPrivateLink = () => {
    const url = `${window.location.origin}${window.location.pathname}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Live search results across trip items
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const hasSearch = trimmedQuery.length > 0;

  const matchedActivities = trip.activities.filter(
    (a) =>
      a.title.toLowerCase().includes(trimmedQuery) ||
      a.location.toLowerCase().includes(trimmedQuery)
  );

  const matchedMeals = trip.meals.filter(
    (m) =>
      m.title.toLowerCase().includes(trimmedQuery) ||
      m.locationOrRecipe.toLowerCase().includes(trimmedQuery)
  );

  const matchedPolls = trip.polls.filter((p) =>
    p.question.toLowerCase().includes(trimmedQuery)
  );

  const matchedTasks = trip.tasks.filter((t) =>
    t.title.toLowerCase().includes(trimmedQuery)
  );

  const matchedIdeas = (trip.ideas || []).filter(
    (idea) =>
      idea.title.toLowerCase().includes(trimmedQuery) ||
      idea.description.toLowerCase().includes(trimmedQuery) ||
      (idea.location && idea.location.toLowerCase().includes(trimmedQuery))
  );

  const totalMatches =
    matchedActivities.length +
    matchedMeals.length +
    matchedPolls.length +
    matchedTasks.length +
    matchedIdeas.length;

  return (
    <header className="mb-2 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
      {/* Left: Collapsible Glassy Search */}
      <div className="relative flex items-center min-h-[42px]">
        {!showSearchPill ? (
          <button
            type="button"
            onClick={() => setIsSearchExpanded(true)}
            title="Suchen..."
            aria-label="Suchen..."
            className="w-10 h-10 rounded-full bg-white/75 hover:bg-white backdrop-blur-md border border-white/80 shadow-xs flex items-center justify-center text-[#141416]/75 hover:text-[#141416] transition-all cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>
        ) : (
          <div className="relative flex-1 max-w-md flex items-center gap-2 bg-white/85 backdrop-blur-xl rounded-full px-4 py-2 border border-white/90 shadow-md transition-all">
            <Search className="w-4 h-4 text-[#141416]/50 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suche im Urlaub..."
              className="bg-transparent text-sm text-[#141416] placeholder-[#141416]/45 focus:outline-none flex-1 min-w-[150px] sm:min-w-[220px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-full hover:bg-black/10 text-[#141416]/60 cursor-pointer"
                title="Suche löschen"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setIsSearchExpanded(false);
              }}
              className="p-1 rounded-full hover:bg-black/10 text-[#141416]/60 cursor-pointer"
              title="Suche einklappen"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Search Dropdown Results */}
            {hasSearch && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-black/10 p-4 z-40 max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#141416]/50">
                    Ergebnisse ({totalMatches})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchExpanded(false);
                    }}
                    className="text-xs font-semibold text-[#141416]/60 hover:text-[#141416] cursor-pointer"
                  >
                    Schließen
                  </button>
                </div>

                {totalMatches === 0 ? (
                  <p className="text-xs text-[#141416]/50 py-4 text-center">
                    Keine Einträge für „{searchQuery}“ gefunden.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {matchedActivities.map((act) => (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => {
                          setSelectedDay(act.dayNumber);
                          setSelectedActivityId(act.id);
                          setActiveTab('dashboard');
                          setSearchQuery('');
                          setIsSearchExpanded(false);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#EFECE6] text-left transition-colors cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-bold text-[#141416]">
                            {act.title}
                          </p>
                          <p className="text-[11px] text-[#141416]/60">
                            Tag {act.dayNumber} · {act.timeSlot} Uhr
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#F4DF7B] text-[#141416]">
                          Programm
                        </span>
                      </button>
                    ))}

                    {matchedMeals.map((meal) => (
                      <button
                        key={meal.id}
                        type="button"
                        onClick={() => {
                          setSelectedDay(meal.dayNumber);
                          setActiveTab('meals');
                          setSearchQuery('');
                          setIsSearchExpanded(false);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#EFECE6] text-left transition-colors cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-bold text-[#141416]">
                            {meal.title}
                          </p>
                          <p className="text-[11px] text-[#141416]/60">
                            Tag {meal.dayNumber} · {meal.time} Uhr
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#E8C2E8] text-[#141416]">
                          Essen
                        </span>
                      </button>
                    ))}

                    {matchedIdeas.map((idea) => (
                      <button
                        key={idea.id}
                        type="button"
                        onClick={() => {
                          setActiveTab('ideas');
                          setSearchQuery('');
                          setIsSearchExpanded(false);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#EFECE6] text-left transition-colors cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-[#141416] truncate">
                            {idea.title}
                          </p>
                          {idea.location && (
                            <p className="text-[11px] text-[#141416]/60 truncate">
                              {idea.location}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-200 text-amber-950 shrink-0">
                          Idee
                        </span>
                      </button>
                    ))}

                    {matchedPolls.map((poll) => (
                      <button
                        key={poll.id}
                        type="button"
                        onClick={() => {
                          setActiveTab('polls');
                          setSearchQuery('');
                          setIsSearchExpanded(false);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#EFECE6] text-left transition-colors cursor-pointer"
                      >
                        <p className="text-xs font-bold text-[#141416] truncate pr-2">
                          {poll.question}
                        </p>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#C5D1F5] text-[#141416] shrink-0">
                          Umfrage
                        </span>
                      </button>
                    ))}

                    {matchedTasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => {
                          setActiveTab('tasks');
                          setSearchQuery('');
                          setIsSearchExpanded(false);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#EFECE6] text-left transition-colors cursor-pointer"
                      >
                        <p className="text-xs font-bold text-[#141416] truncate pr-2">
                          {task.title}
                        </p>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#A9B882] text-[#141416] shrink-0">
                          Aufgabe
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Active User Switcher Badge + Private Link + Urlaub wechseln */}
      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
        {/* Compact User Switcher Pills */}
        <div className="flex items-center gap-1 bg-[#EFECE6] rounded-full p-1 border border-black/5">
          <span className="text-[11px] font-bold text-[#141416]/60 pl-2.5 pr-1">
            Ich bin:
          </span>

          {trip.travelers.map((traveler) => {
            const isSelected = traveler.id === currentUser.id;
            return (
              <button
                key={traveler.id}
                onClick={() => setCurrentUserById(traveler.id)}
                title={`Als ${traveler.name} planen & abstimmen`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#141416] text-white font-bold shadow-xs'
                    : 'text-[#141416]/70 hover:bg-white/70 hover:text-[#141416] font-medium'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold text-[#141416] shrink-0"
                  style={{ backgroundColor: traveler.color }}
                >
                  {traveler.initials}
                </span>
                <span>{traveler.name}</span>
              </button>
            );
          })}

          {!isAddingTraveler ? (
            <button
              onClick={() => setIsAddingTraveler(true)}
              title="Weiteren Namen hinzufügen"
              className="w-7 h-7 rounded-full hover:bg-white text-[#141416]/70 hover:text-[#141416] flex items-center justify-center transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          ) : (
            <form
              onSubmit={handleAddTravelerSubmit}
              className="inline-flex items-center gap-1 bg-white rounded-full pl-2.5 pr-1 py-0.5 border border-black/15"
            >
              <input
                type="text"
                value={newTravelerName}
                onChange={(e) => setNewTravelerName(e.target.value)}
                placeholder="Name..."
                autoFocus
                className="text-xs text-[#141416] bg-transparent focus:outline-none w-20"
              />
              <button
                type="submit"
                className="w-5 h-5 rounded-full bg-[#141416] text-white flex items-center justify-center"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingTraveler(false);
                  setNewTravelerName('');
                }}
                className="w-5 h-5 rounded-full bg-black/5 text-[#141416]/60 flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </form>
          )}
        </div>

        {/* Private Invite Link Copy Button */}
        <button
          type="button"
          onClick={handleCopyPrivateLink}
          title="Privaten Direktlink inkl. Zugangsschlüssel für Freunde kopieren"
          className="inline-flex items-center gap-1.5 bg-[#EFECE6] hover:bg-[#E8C2E8]/70 text-[#141416] text-xs font-bold px-3.5 py-2 rounded-full transition-colors cursor-pointer"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-700" />
              <span>Link kopiert!</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>Privater Link</span>
            </>
          )}
        </button>

        {/* Urlaub / Nutzer wechseln Button */}
        <button
          type="button"
          onClick={() => setIsWelcomeOpen(true)}
          className="inline-flex items-center gap-1.5 bg-[#141416] text-white text-xs font-bold px-3.5 py-2 rounded-full hover:bg-black/85 transition-colors cursor-pointer"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-[#F4DF7B]" />
          <span>Urlaub wechseln</span>
        </button>
      </div>
    </header>
  );
};

export default TopBar;
