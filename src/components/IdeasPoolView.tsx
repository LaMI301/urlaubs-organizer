import React, { useState } from 'react';
import {
  Lightbulb,
  Plus,
  ThumbsUp,
  CalendarPlus,
  Trash2,
  MapPin,
  Euro,
  Sparkles,
  Compass,
  Utensils,
  Palmtree,
  PartyPopper,
  CheckCircle2,
  X,
  Star,
  Coffee,
  Filter,
  Pencil,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import {
  BrainstormIdea,
  ActivityCategory,
  IdeaPriority,
} from '../types/vacation';

export const IdeasPoolView: React.FC = () => {
  const {
    trip,
    currentUser,
    addIdea,
    updateIdea,
    toggleIdeaVote,
    deleteIdea,
    scheduleIdeaToDay,
    setActiveTab,
    setSelectedDay,
  } = useVacation();

  const [selectedTravelerFilter, setSelectedTravelerFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAddIdeaOpen, setIsAddIdeaOpen] = useState(false);
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [collapsedTravelers, setCollapsedTravelers] = useState<Record<string, boolean>>({});

  // Transfer to schedule modal state
  const [schedulingIdea, setSchedulingIdea] = useState<BrainstormIdea | null>(null);
  const [scheduleDay, setScheduleDay] = useState<number>(1);
  const [scheduleTime, setScheduleTime] = useState<string>('10:00');

  // New Idea Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<ActivityCategory | 'food'>('activity');
  const [newPriority, setNewPriority] = useState<IdeaPriority>('must_do');
  const [newLocation, setNewLocation] = useState('');
  const [newCost, setNewCost] = useState<string>('');

  const ideas = trip.ideas || [];

  const resetIdeaForm = () => {
    setNewTitle('');
    setNewDesc('');
    setNewCategory('activity');
    setNewPriority('must_do');
    setNewLocation('');
    setNewCost('');
    setEditingIdeaId(null);
  };

  const handleStartEditIdea = (idea: BrainstormIdea) => {
    setEditingIdeaId(idea.id);
    setNewTitle(idea.title);
    setNewDesc(idea.description || '');
    setNewCategory(idea.category);
    setNewPriority(idea.priority);
    setNewLocation(idea.location || '');
    setNewCost(idea.estimatedCost !== undefined ? String(idea.estimatedCost) : '');
    setIsAddIdeaOpen(true);
  };

  const handleCreateIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const payload = {
      title: newTitle.trim(),
      description: newDesc.trim(),
      category: newCategory,
      priority: newPriority,
      location: newLocation.trim() || undefined,
      estimatedCost: newCost ? Number(newCost) : undefined,
    };

    if (editingIdeaId) {
      updateIdea(editingIdeaId, payload);
    } else {
      addIdea(payload);
    }

    resetIdeaForm();
    setIsAddIdeaOpen(false);
  };

  const toggleTravelerCollapse = (travelerId: string) => {
    setCollapsedTravelers((prev) => ({ ...prev, [travelerId]: !prev[travelerId] }));
  };

  const handleConfirmSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingIdea) return;
    scheduleIdeaToDay(schedulingIdea.id, scheduleDay, scheduleTime);
    setSchedulingIdea(null);
    setSelectedDay(scheduleDay);
    setActiveTab('schedule');
  };

  // Filter ideas
  const filteredIdeas = ideas.filter((idea) => {
    if (selectedTravelerFilter !== 'all' && idea.createdBy !== selectedTravelerFilter) {
      return false;
    }
    if (priorityFilter !== 'all' && idea.priority !== priorityFilter) {
      return false;
    }
    if (categoryFilter !== 'all' && idea.category !== categoryFilter) {
      return false;
    }
    return true;
  });

  // Group ideas by traveler
  const groupedByTraveler = trip.travelers.map((traveler) => {
    const travelerIdeas = filteredIdeas.filter((i) => i.createdBy === traveler.id);
    return {
      traveler,
      ideas: travelerIdeas,
    };
  }).filter((group) => {
    // If a traveler is filtered, only show that traveler
    if (selectedTravelerFilter !== 'all') {
      return group.traveler.id === selectedTravelerFilter;
    }
    return group.ideas.length > 0;
  });

  const getPriorityBadge = (priority: IdeaPriority) => {
    switch (priority) {
      case 'must_do':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1 rounded-full bg-amber-100/90 text-amber-900 border border-amber-300/60 shadow-sm backdrop-blur-md">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            Must-Do / Highlight
          </span>
        );
      case 'nice_to_have':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1 rounded-full bg-emerald-100/90 text-emerald-900 border border-emerald-300/60 shadow-sm backdrop-blur-md">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            Nice to have
          </span>
        );
      case 'chill':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1 rounded-full bg-purple-100/90 text-purple-900 border border-purple-300/60 shadow-sm backdrop-blur-md">
            <Coffee className="w-3 h-3 text-purple-600" />
            Entspannt / Chillig
          </span>
        );
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'beach':
        return <Palmtree className="w-4 h-4 text-cyan-600" />;
      case 'food':
        return <Utensils className="w-4 h-4 text-amber-600" />;
      case 'culture':
        return <Compass className="w-4 h-4 text-purple-600" />;
      case 'nightlife':
        return <PartyPopper className="w-4 h-4 text-pink-600" />;
      default:
        return <Lightbulb className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* GLASSY HERO HEADER */}
      <div className="relative overflow-hidden rounded-[32px] p-6 md:p-8 bg-gradient-to-r from-white/70 via-white/50 to-white/70 backdrop-blur-xl border border-white/80 shadow-[0_10px_35px_rgba(0,0,0,0.04)]">
        {/* Decorative background glows */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#F4DF7B]/40 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 right-32 w-48 h-48 bg-[#E8C2E8]/40 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141416]/5 border border-black/5 text-[#141416] text-xs font-bold mb-2 backdrop-blur-sm">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Brainstorming & Ideen-Pool</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[#141416] tracking-tight">
              Vorschläge & Ideen der Gruppe
            </h1>
            <p className="text-sm text-[#141416]/70 mt-1 max-w-2xl leading-relaxed">
              Hier sammeln alle Mitreisenden Aktivitäten, Wünsche und Spots – ganz ohne festen Tag oder Uhrzeit.
              Stimmt für eure Favoriten ab und übernehmt sie mit einem Klick in den Tagesplan!
            </p>
          </div>

          <button
            onClick={() => {
              resetIdeaForm();
              setIsAddIdeaOpen(true);
            }}
            className="self-start md:self-center px-6 py-3.5 rounded-full bg-[#141416] hover:bg-black/85 text-white font-extrabold text-sm shadow-xl flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-[#F4DF7B]" />
            <span>Idee vorschlagen</span>
          </button>
        </div>

        {/* TRAVELER FILTER TABS (PERSONEN-AUSWAHL) */}
        <div className="relative z-10 mt-6 pt-6 border-t border-black/5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#141416]/60 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Nach Person:
          </span>

          <button
            onClick={() => setSelectedTravelerFilter('all')}
            className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
              selectedTravelerFilter === 'all'
                ? 'bg-[#141416] text-white shadow-md'
                : 'bg-white/70 hover:bg-white text-[#141416]/80 border border-black/5'
            }`}
          >
            Alle Personen ({ideas.length})
          </button>

          {trip.travelers.map((traveler) => {
            const count = ideas.filter((i) => i.createdBy === traveler.id).length;
            const isSelected = selectedTravelerFilter === traveler.id;
            return (
              <button
                key={traveler.id}
                onClick={() => setSelectedTravelerFilter(traveler.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-[#141416] text-white shadow-md'
                    : 'bg-white/70 hover:bg-white text-[#141416]/80 border border-black/5'
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-[#141416]"
                  style={{ backgroundColor: traveler.color }}
                >
                  {traveler.initials}
                </span>
                <span>{traveler.name}</span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-black/5 text-[#141416]/60'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FILTER CHIPS (PRIORITÄT) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#141416]/50 mr-1">Priorität:</span>
          {[
            { id: 'all', label: 'Alle' },
            { id: 'must_do', label: '⭐ Must-Do' },
            { id: 'nice_to_have', label: '🌴 Nice to have' },
            { id: 'chill', label: '☕ Entspannt' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPriorityFilter(item.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                priorityFilter === item.id
                  ? 'bg-white text-[#141416] shadow-sm border border-black/10'
                  : 'text-[#141416]/60 hover:text-[#141416]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p className="text-xs font-semibold text-[#141416]/60">
          {filteredIdeas.length} {filteredIdeas.length === 1 ? 'Vorschlag' : 'Vorschläge'} gefunden
        </p>
      </div>

      {/* IDEAS GROUPED BY PERSON */}
      {groupedByTraveler.length === 0 ? (
        <div className="rounded-[32px] p-12 text-center bg-white/50 backdrop-blur-lg border border-white/60">
          <Lightbulb className="w-12 h-12 text-amber-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-black text-[#141416]">Noch keine Ideen in dieser Ansicht</h3>
          <p className="text-sm text-[#141416]/60 mt-1 max-w-md mx-auto">
            Reiche als Erster eine coole Idee oder einen Ausflugswunsch für euren Urlaub ein!
          </p>
          <button
            onClick={() => setIsAddIdeaOpen(true)}
            className="mt-5 px-6 py-2.5 rounded-full bg-[#141416] text-white font-bold text-xs cursor-pointer shadow-md inline-flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5 text-[#F4DF7B]" />
            <span>Jetzt Idee einreichen</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByTraveler.map(({ traveler, ideas: travelerIdeas }) => {
            const isCollapsed = !!collapsedTravelers[traveler.id];

            return (
              <div key={traveler.id} className="space-y-4">
                {/* TRAVELER SECTION HEADER (COLLAPSIBLE) */}
                <button
                  type="button"
                  onClick={() => toggleTravelerCollapse(traveler.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-[22px] bg-white/60 hover:bg-white/80 backdrop-blur-md border border-black/5 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm text-[#141416] shadow-sm border border-black/10"
                      style={{ backgroundColor: traveler.color }}
                    >
                      {traveler.initials}
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-[#141416] flex items-center gap-2">
                        <span>Ideen von {traveler.name}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/80 border border-black/5 text-[#141416]/70">
                          {travelerIdeas.length}
                        </span>
                      </h2>
                      {traveler.role && (
                        <p className="text-xs text-[#141416]/50">{traveler.role}</p>
                      )}
                    </div>
                  </div>
                  {isCollapsed ? (
                    <ChevronDown className="w-5 h-5 text-[#141416]/60 shrink-0" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-[#141416]/60 shrink-0" />
                  )}
                </button>

                {/* IDEAS CARDS GRID */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {travelerIdeas.map((idea) => {
                      const hasVoted = idea.votes.includes(currentUser.id);
                      const isAssigned = typeof idea.assignedDay === 'number';
                      const isConfirmingDelete = confirmDeleteId === idea.id;

                      return (
                        <div
                          key={idea.id}
                          className="group relative rounded-[28px] p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white/70 hover:bg-white/85 backdrop-blur-xl border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
                        >
                          {/* TOP ROW: PRIORITY & CATEGORY */}
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              {getPriorityBadge(idea.priority)}
                              <div className="flex items-center gap-1">
                                <span className="p-1.5 rounded-full bg-white/80 border border-black/5 shadow-xs">
                                  {getCategoryIcon(idea.category)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditIdea(idea)}
                                  title="Idee bearbeiten"
                                  className="p-1.5 rounded-full hover:bg-black/5 text-neutral-500 hover:text-[#141416] transition-all cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                {isConfirmingDelete ? (
                                  <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 text-[10px] font-bold">
                                    <span className="text-red-700">Löschen?</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        deleteIdea(idea.id);
                                        setConfirmDeleteId(null);
                                      }}
                                      className="px-1.5 py-0.5 rounded-full bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                                    >
                                      Ja
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="px-1.5 py-0.5 rounded-full bg-white text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                                    >
                                      Nein
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(idea.id)}
                                    title="Idee löschen"
                                    className="p-1.5 rounded-full hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* TITLE & DESCRIPTION */}
                            <h3 className="text-base font-black text-[#141416] leading-snug tracking-tight">
                              {idea.title}
                            </h3>

                            {idea.description && (
                              <p className="text-xs text-[#141416]/70 mt-2 leading-relaxed line-clamp-3">
                                {idea.description}
                              </p>
                            )}

                            {/* META PILLS (ORT, MAPS & KOSTEN) */}
                            <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] font-bold text-[#141416]/70">
                              {idea.location && (
                                <>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/[0.03] border border-black/5">
                                    <MapPin className="w-3 h-3 text-[#141416]/50" />
                                    {idea.location}
                                  </span>
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(idea.location)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/90 hover:bg-[#C5D1F5]/70 text-[#141416] border border-black/5 transition-colors"
                                    title={`In Google Maps öffnen: ${idea.location}`}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Maps</span>
                                  </a>
                                </>
                              )}
                              {typeof idea.estimatedCost === 'number' && idea.estimatedCost > 0 && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/[0.03] border border-black/5">
                                  <Euro className="w-3 h-3 text-[#141416]/50" />
                                  ca. {idea.estimatedCost} € p.P.
                                </span>
                              )}
                              {isAssigned && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300/60 font-black">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                  Tag {idea.assignedDay} eingeplant
                                </span>
                              )}
                            </div>
                          </div>

                          {/* BOTTOM ROW: VOTERS & ACTIONS */}
                          <div className="mt-5 pt-4 border-t border-black/5 flex items-center justify-between gap-3">
                            {/* VOTER AVATARS */}
                            <div className="flex items-center gap-1.5">
                              <div className="flex -space-x-1.5">
                                {idea.votes.slice(0, 4).map((voterId) => {
                                  const voter = trip.travelers.find((t) => t.id === voterId);
                                  if (!voter) return null;
                                  return (
                                    <span
                                      key={voterId}
                                      title={voter.name}
                                      className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black text-[#141416] shadow-xs"
                                      style={{ backgroundColor: voter.color }}
                                    >
                                      {voter.initials}
                                    </span>
                                  );
                                })}
                              </div>
                              {idea.votes.length > 4 && (
                                <span className="text-[10px] font-bold text-[#141416]/50">
                                  +{idea.votes.length - 4}
                                </span>
                              )}
                            </div>

                            {/* BUTTONS: VOTE & SCHEDULE */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => toggleIdeaVote(idea.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                                  hasVoted
                                    ? 'bg-[#141416] text-white shadow-sm'
                                    : 'bg-white/80 hover:bg-white text-[#141416] border border-black/10'
                                }`}
                                title={hasVoted ? 'Deine Stimme zurückziehen' : 'Dafür stimmen'}
                              >
                                <ThumbsUp
                                  className={`w-3.5 h-3.5 ${
                                    hasVoted ? 'fill-[#F4DF7B] text-[#F4DF7B]' : 'text-[#141416]/60'
                                  }`}
                                />
                                <span>{idea.votes.length}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSchedulingIdea(idea);
                                  setScheduleDay(1);
                                  setScheduleTime('10:00');
                                }}
                                className="p-1.5 rounded-full bg-white/80 hover:bg-white border border-black/10 text-[#141416] hover:scale-105 transition-all cursor-pointer shadow-xs"
                                title="In den Tagesplan übernehmen"
                              >
                                <CalendarPlus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: NEUE IDEE VORSCHLAGEN */}
      {isAddIdeaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#F9F6F0]/95 backdrop-blur-2xl w-full max-w-lg rounded-[34px] p-6 md:p-8 shadow-2xl border border-white/60 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-600 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#141416]">
                    {editingIdeaId ? 'Idee bearbeiten' : 'Neue Idee einreichen'}
                  </h3>
                  <p className="text-xs text-[#141416]/60">
                    {editingIdeaId
                      ? 'Änderungen speichern – alle bisherigen Votes bleiben erhalten.'
                      : <>Vorgeschlagen von: <strong className="text-[#141416]">{currentUser.name}</strong></>}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetIdeaForm();
                  setIsAddIdeaOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#141416] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIdea} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#141416]/80 mb-1">
                  Was möchtest du vorschlagen? *
                </label>
                <input
                  type="text"
                  required
                  placeholder="z.B. Bootstour mit Schnorcheln, Tapas kochen, Quadtour..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white rounded-2xl px-4 py-3 text-sm font-semibold text-[#141416] border border-black/10 focus:outline-none focus:border-[#141416]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141416]/80 mb-1">
                    Priorität
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as IdeaPriority)}
                    className="w-full bg-white rounded-2xl px-3 py-2.5 text-xs font-bold text-[#141416] border border-black/10 focus:outline-none focus:border-[#141416]"
                  >
                    <option value="must_do">⭐ Must-Do (Unbedingt!)</option>
                    <option value="nice_to_have">🌴 Nice to have</option>
                    <option value="chill">☕ Entspannt / Chillig</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141416]/80 mb-1">
                    Kategorie
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ActivityCategory | 'food')}
                    className="w-full bg-white rounded-2xl px-3 py-2.5 text-xs font-bold text-[#141416] border border-black/10 focus:outline-none focus:border-[#141416]"
                  >
                    <option value="activity">Aktivität / Action</option>
                    <option value="beach">Strand & Meer</option>
                    <option value="food">Essen & Kulinarik</option>
                    <option value="culture">Kultur & Sightseeing</option>
                    <option value="nightlife">Abend & Feiern</option>
                    <option value="other">Sonstiges</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141416]/80 mb-1">
                  Beschreibung / Notiz (optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Warum hast du Lust darauf? Gibt es Details oder Tipps?"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-white rounded-2xl p-3 text-xs font-semibold text-[#141416] border border-black/10 focus:outline-none focus:border-[#141416] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141416]/80 mb-1">
                    Ort / Spot (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. Cala Varques, Palma..."
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-[#141416] border border-black/10 focus:outline-none focus:border-[#141416]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141416]/80 mb-1">
                    Kosten p.P. in € (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="z.B. 25"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-[#141416] border border-black/10 focus:outline-none focus:border-[#141416]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetIdeaForm();
                    setIsAddIdeaOpen(false);
                  }}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-[#141416]/70 hover:bg-black/5 cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#141416] text-white font-extrabold text-xs shadow-lg hover:bg-black/85 cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F4DF7B]" />
                  <span>{editingIdeaId ? 'Änderungen speichern' : 'Idee einreichen'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IN TAGESPLAN ÜBERNEHMEN */}
      {schedulingIdea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#F9F6F0]/95 backdrop-blur-2xl w-full max-w-md rounded-[34px] p-6 md:p-8 shadow-2xl border border-white/60 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center">
                  <CalendarPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#141416]">In Tagesplan übernehmen</h3>
                  <p className="text-xs text-[#141416]/60 line-clamp-1">
                    „{schedulingIdea.title}“
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSchedulingIdea(null)}
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#141416] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#141416]/80 mb-1.5">
                  An welchem Tag soll die Aktivität stattfinden?
                </label>
                <select
                  value={scheduleDay}
                  onChange={(e) => setScheduleDay(Number(e.target.value))}
                  className="w-full bg-white rounded-2xl px-4 py-3 text-sm font-bold text-[#141416] border border-black/10 focus:outline-none focus:border-[#141416]"
                >
                  {Array.from({ length: trip.totalDays }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      Tag {day}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141416]/80 mb-1.5">
                  Uhrzeit / Startzeit
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full bg-white rounded-2xl px-4 py-3 text-sm font-bold text-[#141416] border border-black/10 focus:outline-none focus:border-[#141416]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSchedulingIdea(null)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-[#141416]/70 hover:bg-black/5 cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#141416] text-white font-extrabold text-xs shadow-lg hover:bg-black/85 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#F4DF7B]" />
                  <span>Jetzt fest einplanen</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
