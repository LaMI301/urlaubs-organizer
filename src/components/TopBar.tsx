import React, { useState } from 'react';
import {
  Search,
  UserPlus,
  Check,
  X,
  Sparkles,
  Calendar,
  MapPin,
  PlusCircle,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import { NavigationTab } from '../types/vacation';

export const TopBar: React.FC = () => {
  const {
    trip,
    currentUser,
    setCurrentUserById,
    addTraveler,
    activeTab,
    setActiveTab,
    setSelectedDay,
    setSelectedActivityId,
    setIsNewTripModalOpen,
  } = useVacation();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<
    'all' | 'activities' | 'meals' | 'polls' | 'tasks'
  >('all');
  const [isAddingTraveler, setIsAddingTraveler] = useState(false);
  const [newTravelerName, setNewTravelerName] = useState('');

  const handleAddTravelerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTravelerName.trim();
    if (!trimmed) return;
    addTraveler(trimmed, 'Mitreisende/r');
    setNewTravelerName('');
    setIsAddingTraveler(false);
  };

  // Live search results across trip items
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const hasSearch = trimmedQuery.length > 0;

  const matchedActivities =
    searchFilter === 'all' || searchFilter === 'activities'
      ? trip.activities.filter(
          (a) =>
            a.title.toLowerCase().includes(trimmedQuery) ||
            a.location.toLowerCase().includes(trimmedQuery) ||
            a.description.toLowerCase().includes(trimmedQuery)
        )
      : [];

  const matchedMeals =
    searchFilter === 'all' || searchFilter === 'meals'
      ? trip.meals.filter(
          (m) =>
            m.title.toLowerCase().includes(trimmedQuery) ||
            m.locationOrRecipe.toLowerCase().includes(trimmedQuery)
        )
      : [];

  const matchedPolls =
    searchFilter === 'all' || searchFilter === 'polls'
      ? trip.polls.filter((p) =>
          p.question.toLowerCase().includes(trimmedQuery)
        )
      : [];

  const matchedTasks =
    searchFilter === 'all' || searchFilter === 'tasks'
      ? trip.tasks.filter((t) => t.title.toLowerCase().includes(trimmedQuery))
      : [];

  const totalMatches =
    matchedActivities.length +
    matchedMeals.length +
    matchedPolls.length +
    matchedTasks.length;

  const filterPills: {
    id: 'activities' | 'meals' | 'polls' | 'tasks';
    label: string;
    tab: NavigationTab;
    dotColor: string;
  }[] = [
    {
      id: 'activities',
      label: 'Vorschläge',
      tab: 'schedule',
      dotColor: 'bg-[#F4DF7B]',
    },
    {
      id: 'meals',
      label: 'Essen',
      tab: 'meals',
      dotColor: 'bg-[#E8C2E8]',
    },
    {
      id: 'polls',
      label: 'Abstimmungen',
      tab: 'polls',
      dotColor: 'bg-[#C5D1F5]',
    },
    {
      id: 'tasks',
      label: 'Aufgaben',
      tab: 'tasks',
      dotColor: 'bg-[#A9B882]',
    },
  ];

  return (
    <header className="mb-5 space-y-3">
      {/* Row 1: Search bar with category filter pills (Intelly Reference Style) + Trip Quick Meta */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        {/* Search Input + Embedded Filter Pills */}
        <div className="relative flex-1 flex flex-wrap sm:flex-nowrap items-center gap-2 bg-[#EFECE6] rounded-full px-4 py-2 border border-black/5 focus-within:border-black/20 transition-colors">
          <Search className="w-4 h-4 text-[#141416]/50 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Suche nach Aktivitäten, Essen, Abstimmungen..."
            className="bg-transparent text-sm text-[#141416] placeholder-[#141416]/45 focus:outline-none flex-1 min-w-[160px]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full hover:bg-black/10 text-[#141416]/60"
              title="Suche löschen"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Category Filter Pills inside search bar */}
          <div className="hidden md:flex items-center gap-1.5 pl-2 border-l border-black/10">
            {filterPills.map((pill) => {
              const isSelected =
                searchFilter === pill.id ||
                (!hasSearch && activeTab === pill.tab);
              return (
                <button
                  key={pill.id}
                  onClick={() => {
                    if (hasSearch) {
                      setSearchFilter(
                        searchFilter === pill.id ? 'all' : pill.id
                      );
                    } else {
                      setActiveTab(pill.tab);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-[#141416] text-white shadow-sm'
                      : 'bg-white/80 text-[#141416]/75 hover:bg-white hover:text-[#141416]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${pill.dotColor}`} />
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Search Dropdown Results */}
          {hasSearch && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-3xl shadow-2xl border border-black/10 p-4 z-40 max-h-80 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#141416]/50">
                  Suchergebnisse ({totalMatches})
                </span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-semibold text-[#141416]/60 hover:text-[#141416]"
                >
                  Schließen
                </button>
              </div>

              {totalMatches === 0 ? (
                <p className="text-xs text-[#141416]/50 py-4 text-center">
                  Keine Einträge für „{searchQuery}“ gefunden.
                </p>
              ) : (
                <div className="space-y-2">
                  {matchedActivities.map((act) => (
                    <button
                      key={act.id}
                      onClick={() => {
                        setSelectedDay(act.dayNumber);
                        setSelectedActivityId(act.id);
                        setActiveTab('dashboard');
                        setSearchQuery('');
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#EFECE6] text-left transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#141416]">
                          {act.title}
                        </p>
                        <p className="text-[11px] text-[#141416]/60">
                          Tag {act.dayNumber} · {act.timeSlot} Uhr ·{' '}
                          {act.location}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#F4DF7B] text-[#141416]">
                        Vorschlag
                      </span>
                    </button>
                  ))}

                  {matchedMeals.map((meal) => (
                    <button
                      key={meal.id}
                      onClick={() => {
                        setSelectedDay(meal.dayNumber);
                        setActiveTab('meals');
                        setSearchQuery('');
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#EFECE6] text-left transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#141416]">
                          {meal.title}
                        </p>
                        <p className="text-[11px] text-[#141416]/60">
                          Tag {meal.dayNumber} · {meal.time} Uhr ·{' '}
                          {meal.locationOrRecipe}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#E8C2E8] text-[#141416]">
                        Essen
                      </span>
                    </button>
                  ))}

                  {matchedPolls.map((poll) => (
                    <button
                      key={poll.id}
                      onClick={() => {
                        setActiveTab('polls');
                        setSearchQuery('');
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#EFECE6] text-left transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#141416]">
                          {poll.question}
                        </p>
                        <p className="text-[11px] text-[#141416]/60">
                          {poll.options.length} Optionen
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#C5D1F5] text-[#141416]">
                        Abstimmung
                      </span>
                    </button>
                  ))}

                  {matchedTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => {
                        setActiveTab('tasks');
                        setSearchQuery('');
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#EFECE6] text-left transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#141416]">
                          {task.title}
                        </p>
                        <p className="text-[11px] text-[#141416]/60">
                          {task.completed ? 'Erledigt' : 'Offen'}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#A9B882] text-[#141416]">
                        Aufgabe
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Trip Destination & Quick Create Trip Pill */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center gap-2 bg-[#EFECE6] px-3.5 py-2 rounded-full text-xs font-medium text-[#141416]/80">
            <MapPin className="w-3.5 h-3.5 text-[#141416]" />
            <span className="font-semibold text-[#141416] truncate max-w-[150px]">
              {trip.destination}
            </span>
            <span className="text-[#141416]/30">|</span>
            <Calendar className="w-3.5 h-3.5 text-[#141416]/70" />
            <span>{trip.totalDays} Tage</span>
          </div>

          <button
            onClick={() => setIsNewTripModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-[#141416] text-white text-xs font-semibold px-4 py-2.5 rounded-full hover:bg-[#141416]/90 transition-all shadow-sm shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#F4DF7B]" />
            <span>Urlaub konfigurieren</span>
          </button>
        </div>
      </div>

      {/* Row 2: Prominent Accountless User Switcher ("Wer bist du gerade?") */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#EFECE6]/80 border border-black/5 rounded-2xl px-3.5 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-[#141416]/70 mr-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#141416]" />
            Aktiver Nutzer (ohne Login):
          </span>

          {trip.travelers.map((traveler) => {
            const isSelected = traveler.id === currentUser.id;
            return (
              <button
                key={traveler.id}
                onClick={() => setCurrentUserById(traveler.id)}
                title={`Als ${traveler.name} abstimmen & planen`}
                className={`inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full text-xs transition-all ${
                  isSelected
                    ? 'bg-[#141416] text-white font-bold shadow-sm scale-[1.02]'
                    : 'bg-white/80 text-[#141416]/75 hover:bg-white hover:text-[#141416] font-medium'
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-[#141416] shrink-0"
                  style={{ backgroundColor: traveler.color }}
                >
                  {traveler.initials}
                </span>
                <span>{traveler.name}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F4DF7B] ml-0.5" />
                )}
              </button>
            );
          })}

          {/* Inline Add Traveler without Account */}
          {!isAddingTraveler ? (
            <button
              onClick={() => setIsAddingTraveler(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/60 hover:bg-white text-[#141416]/70 hover:text-[#141416] border border-dashed border-black/20 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Name</span>
            </button>
          ) : (
            <form
              onSubmit={handleAddTravelerSubmit}
              className="inline-flex items-center gap-1 bg-white rounded-full pl-3 pr-1 py-0.5 border border-black/15 shadow-sm"
            >
              <input
                type="text"
                value={newTravelerName}
                onChange={(e) => setNewTravelerName(e.target.value)}
                placeholder="Dein Vorname..."
                autoFocus
                className="text-xs text-[#141416] bg-transparent focus:outline-none w-24"
              />
              <button
                type="submit"
                className="w-5 h-5 rounded-full bg-[#141416] text-white flex items-center justify-center hover:bg-black/80"
                title="Hinzufügen"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingTraveler(false);
                  setNewTravelerName('');
                }}
                className="w-5 h-5 rounded-full bg-black/5 text-[#141416]/60 flex items-center justify-center hover:bg-black/10"
                title="Abbrechen"
              >
                <X className="w-3 h-3" />
              </button>
            </form>
          )}
        </div>

        <span className="text-[11px] text-[#141416]/55 hidden sm:inline">
          Du stimmst aktuell ab als{' '}
          <strong className="text-[#141416]">{currentUser.name}</strong>
        </span>
      </div>
    </header>
  );
};

export default TopBar;
