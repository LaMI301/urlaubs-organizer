import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Lightbulb,
  Plus,
  ThumbsUp,
  CalendarPlus,
  Trash2,
  MapPin,
  Sparkles,
  Compass,
  Utensils,
  Palmtree,
  PartyPopper,
  Car,
  CheckCircle2,
  X,
  Star,
  Coffee,
  Filter,
  Pencil,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Map as MapIcon,
  GripVertical,
  RotateCcw,
  Calendar,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import {
  BrainstormIdea,
  ActivityCategory,
  IdeaPriority,
} from '../types/vacation';
import {
  buildGoogleMapsUrl,
  clampCost,
  formatCurrency,
  isGenericLocation,
  isValidTimeRange,
} from '../utils/vacationHelpers';

const CATEGORY_FILTER_OPTIONS: Array<{
  id: string;
  label: string;
}> = [
  { id: 'all', label: 'Alle Kategorien' },
  { id: 'activity', label: 'Aktivität & Action' },
  { id: 'beach', label: 'Strand & Meer' },
  { id: 'food', label: 'Essen & Kulinarik' },
  { id: 'culture', label: 'Kultur & Sightseeing' },
  { id: 'transport', label: 'Transfer & Route' },
  { id: 'nightlife', label: 'Abend & Feiern' },
  { id: 'other', label: 'Sonstiges' },
];

export const IdeasPoolView: React.FC = () => {
  const {
    trip,
    currentUser,
    selectedDay,
    addIdea,
    updateIdea,
    toggleIdeaVote,
    deleteIdea,
    scheduleIdeaToDay,
    setActiveTab,
    setSelectedDay,
    setSelectedActivityId,
    focusOnMap,
    searchTarget,
    setSearchTarget,
    showToast,
  } = useVacation();

  const [selectedTravelerFilter, setSelectedTravelerFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAddIdeaOpen, setIsAddIdeaOpen] = useState(false);
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [collapsedTravelers, setCollapsedTravelers] = useState<Record<string, boolean>>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Drag & Drop state
  const [draggingIdeaId, setDraggingIdeaId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  // Transfer to schedule modal state
  const [schedulingIdea, setSchedulingIdea] = useState<BrainstormIdea | null>(null);
  const [scheduleDay, setScheduleDay] = useState<number>(selectedDay || 1);
  const [scheduleTime, setScheduleTime] = useState<string>('10:00');
  const [scheduleEndTime, setScheduleEndTime] = useState<string>('');
  const [scheduleTimeError, setScheduleTimeError] = useState<string | null>(null);

  // New / Edit Idea Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<ActivityCategory | 'food'>('activity');
  const [newPriority, setNewPriority] = useState<IdeaPriority>('must_do');
  const [newLocation, setNewLocation] = useState('');
  const [newCost, setNewCost] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const highlightTimerRef = useRef<number | null>(null);
  const ideas = useMemo(() => trip.ideas || [], [trip.ideas]);
  const currency = trip.currency || 'EUR';
  const safeTotalDays = Math.max(1, trip.totalDays || 1);

  const travelerIds = useMemo(
    () => new Set(trip.travelers.map((t) => t.id)),
    [trip.travelers]
  );

  const unknownIdeasCount = useMemo(
    () => ideas.filter((i) => !travelerIds.has(i.createdBy)).length,
    [ideas, travelerIds]
  );

  const clampDay = (day: number) =>
    Math.max(1, Math.min(Math.round(day) || 1, safeTotalDays));

  const resetIdeaForm = () => {
    setNewTitle('');
    setNewDesc('');
    setNewCategory('activity');
    setNewPriority('must_do');
    setNewLocation('');
    setNewCost('');
    setEditingIdeaId(null);
    setFormError(null);
  };

  const closeIdeaModal = () => {
    resetIdeaForm();
    setIsAddIdeaOpen(false);
  };

  const closeScheduleModal = () => {
    setSchedulingIdea(null);
    setScheduleTimeError(null);
    setScheduleEndTime('');
  };

  // Spotlight search target handler
  useEffect(() => {
    if (!searchTarget || searchTarget.kind !== 'idea') return;
    const targetId = searchTarget.id;
    const targetIdea = ideas.find((i) => i.id === targetId);
    setSelectedTravelerFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    if (targetIdea) {
      const groupKey = travelerIds.has(targetIdea.createdBy)
        ? targetIdea.createdBy
        : '__unknown__';
      setCollapsedTravelers((prev) => ({ ...prev, [groupKey]: false }));
    }
    setHighlightedId(targetId);
    setSearchTarget(null);
  }, [searchTarget, ideas, travelerIds, setSearchTarget]);

  // Scroll highlighted idea into view and clear highlight after 3.5s
  useEffect(() => {
    if (!highlightedId) return;
    const scrollTimer = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-search-id="${highlightedId}"]`
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);

    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedId(null);
    }, 3500);

    return () => {
      window.clearTimeout(scrollTimer);
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, [highlightedId]);

  // ESC key accessibility for modals
  useEffect(() => {
    if (!isAddIdeaOpen && !schedulingIdea) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (schedulingIdea) {
          closeScheduleModal();
        } else if (isAddIdeaOpen) {
          closeIdeaModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddIdeaOpen, schedulingIdea]);

  const handleStartEditIdea = (idea: BrainstormIdea) => {
    setEditingIdeaId(idea.id);
    setNewTitle(idea.title);
    setNewDesc(idea.description || '');
    setNewCategory(idea.category);
    setNewPriority(idea.priority);
    setNewLocation(idea.location || '');
    setNewCost(idea.estimatedCost !== undefined ? String(idea.estimatedCost) : '');
    setFormError(null);
    setIsAddIdeaOpen(true);
  };

  const handleCreateIdea = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      setFormError('Bitte gib einen Titel für die Idee ein.');
      return;
    }

    let parsedCost: number | undefined;
    if (newCost.trim() !== '') {
      const normalized = Number(newCost.trim().replace(',', '.'));
      if (!Number.isFinite(normalized) || normalized < 0) {
        setFormError('Bitte gib gültige Kosten (>= 0) ein.');
        return;
      }
      parsedCost = clampCost(normalized);
    }

    const payload = {
      title: trimmedTitle,
      description: newDesc.trim(),
      category: newCategory,
      priority: newPriority,
      location: newLocation.trim() || undefined,
      estimatedCost: parsedCost,
    };

    if (editingIdeaId) {
      updateIdea(editingIdeaId, payload);
      showToast(`Idee „${trimmedTitle}“ aktualisiert`, 'success');
    } else {
      addIdea(payload);
      showToast(`Idee „${trimmedTitle}“ eingereicht`, 'success');
    }

    closeIdeaModal();
  };

  const toggleTravelerCollapse = (travelerId: string) => {
    setCollapsedTravelers((prev) => ({ ...prev, [travelerId]: !prev[travelerId] }));
  };

  const openScheduleModal = (idea: BrainstormIdea) => {
    setSchedulingIdea(idea);
    setScheduleDay(clampDay(idea.assignedDay ?? selectedDay ?? 1));
    setScheduleTime('10:00');
    setScheduleEndTime('');
    setScheduleTimeError(null);
  };

  const handleConfirmSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingIdea) return;
    if (scheduleEndTime.trim() && !isValidTimeRange(scheduleTime, scheduleEndTime)) {
      setScheduleTimeError('Die Endzeit muss nach der Startzeit liegen.');
      return;
    }
    const targetDay = clampDay(scheduleDay);
    scheduleIdeaToDay(
      schedulingIdea.id,
      targetDay,
      scheduleTime,
      scheduleEndTime.trim() || undefined
    );
    closeScheduleModal();
    setSelectedDay(targetDay);
    setActiveTab('schedule');
  };

  const handleIdeaDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    idea: BrainstormIdea
  ) => {
    setDraggingIdeaId(idea.id);
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('application/x-vacayly-idea', idea.id);
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({ kind: 'idea', id: idea.id })
    );
  };

  const handleDropIdeaOnDay = (
    e: React.DragEvent<HTMLButtonElement>,
    dayNum: number
  ) => {
    e.preventDefault();
    setDragOverDay(null);
    let droppedIdeaId = e.dataTransfer.getData('application/x-vacayly-idea');
    if (!droppedIdeaId) {
      try {
        const parsed = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (parsed?.kind === 'idea' && typeof parsed.id === 'string') {
          droppedIdeaId = parsed.id;
        }
      } catch {
        // ignore plain text parse error
      }
    }
    const targetId = droppedIdeaId || draggingIdeaId;
    setDraggingIdeaId(null);
    if (!targetId) return;

    const targetIdea = ideas.find((i) => i.id === targetId);
    if (!targetIdea) return;
    scheduleIdeaToDay(targetIdea.id, dayNum, '10:00');
  };

  const hasActiveFilters =
    selectedTravelerFilter !== 'all' ||
    priorityFilter !== 'all' ||
    categoryFilter !== 'all';

  const resetAllFilters = () => {
    setSelectedTravelerFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
  };

  // Filter ideas
  const filteredIdeas = useMemo(() => {
    return ideas.filter((idea) => {
      if (selectedTravelerFilter === '__unknown__') {
        if (travelerIds.has(idea.createdBy)) return false;
      } else if (
        selectedTravelerFilter !== 'all' &&
        idea.createdBy !== selectedTravelerFilter
      ) {
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
  }, [
    ideas,
    selectedTravelerFilter,
    priorityFilter,
    categoryFilter,
    travelerIds,
  ]);

  // Group filtered ideas by traveler + fallback group for unknown creators
  const groupedByTraveler = useMemo(() => {
    const groups = trip.travelers
      .map((traveler) => ({
        traveler,
        ideas: filteredIdeas.filter((i) => i.createdBy === traveler.id),
      }))
      .filter((group) => group.ideas.length > 0);

    const unknownIdeas = filteredIdeas.filter(
      (i) => !travelerIds.has(i.createdBy)
    );
    if (unknownIdeas.length > 0) {
      groups.push({
        traveler: {
          id: '__unknown__',
          name: 'Unbekannt / Ehemalig',
          initials: '?',
          color: '#94A3B8',
          role: 'Ersteller nicht mehr in der Reisegruppe',
        },
        ideas: unknownIdeas,
      });
    }

    return groups;
  }, [trip.travelers, filteredIdeas, travelerIds]);

  const getPriorityBadge = (priority: IdeaPriority) => {
    switch (priority) {
      case 'must_do':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1 rounded-full bg-[#D9822B]/14 text-[#9E5A14] border border-[#D9822B]/30">
            <Star className="w-3 h-3 fill-[#D9822B] text-[#D9822B]" />
            Must-Do
          </span>
        );
      case 'nice_to_have':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1 rounded-full bg-[#6E7F5E]/14 text-[#4B593E] border border-[#6E7F5E]/30">
            <Sparkles className="w-3 h-3 text-[#6E7F5E]" />
            Nice to have
          </span>
        );
      case 'chill':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1 rounded-full bg-[#2A7B88]/12 text-[#1F5E68] border border-[#2A7B88]/30">
            <Coffee className="w-3 h-3 text-[#2A7B88]" />
            Entspannt
          </span>
        );
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'beach':
        return <Palmtree className="w-4 h-4 text-[#2A7B88]" />;
      case 'food':
        return <Utensils className="w-4 h-4 text-[#D9822B]" />;
      case 'culture':
        return <Compass className="w-4 h-4 text-[#C85A38]" />;
      case 'transport':
        return <Car className="w-4 h-4 text-[#6E7F5E]" />;
      case 'nightlife':
        return <PartyPopper className="w-4 h-4 text-[#C85A38]" />;
      default:
        return <Lightbulb className="w-4 h-4 text-[#D9822B]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* HERO HEADER */}
      <div className="relative overflow-hidden rounded-[28px] p-6 md:p-8 surface-glass-elevated">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9822B]/14 border border-[#D9822B]/30 text-[#9E5A14] text-xs font-bold mb-2.5">
              <Lightbulb className="w-3.5 h-3.5 fill-[#D9822B] text-[#D9822B]" />
              <span>Brainstorming & Ideen-Pool</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[#1F1B18] tracking-tight">
              Vorschläge & Ideen der Gruppe
            </h1>
            <p className="text-sm text-[#6B6259] mt-1.5 max-w-2xl leading-relaxed">
              Sammelt Spots, Aktivitäten & Erlebnisse – stimmt gemeinsam ab und zieht eure
              Favoriten per Drag & Drop oder Klick direkt in einen Reisetag.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              resetIdeaForm();
              setIsAddIdeaOpen(true);
            }}
            className="self-start md:self-center min-h-[44px] px-6 py-3 rounded-full bg-[#C85A38] hover:bg-[#B54B2B] text-white font-extrabold text-sm shadow-sm flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Idee vorschlagen</span>
          </button>
        </div>

        {/* TRAVELER FILTER TABS */}
        <div className="relative z-10 mt-6 pt-5 border-t border-[#E6DDD1] flex flex-nowrap overflow-x-auto no-scrollbar sm:flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#6B6259] mr-1 flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#C85A38]" /> Nach Person:
          </span>

          <button
            type="button"
            onClick={() => setSelectedTravelerFilter('all')}
            className={`min-h-[44px] px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedTravelerFilter === 'all'
                ? 'bg-[#C85A38] text-white shadow-sm'
                : 'bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#6B6259] border border-[#E6DDD1]'
            }`}
          >
            Alle Personen (
            <span className="font-mono tabular-nums">{ideas.length}</span>)
          </button>

          {trip.travelers.map((traveler) => {
            const count = ideas.filter((i) => i.createdBy === traveler.id).length;
            const isSelected = selectedTravelerFilter === traveler.id;
            return (
              <button
                key={traveler.id}
                type="button"
                onClick={() => setSelectedTravelerFilter(traveler.id)}
                className={`min-h-[44px] px-3 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border shrink-0 ${
                  isSelected
                    ? 'bg-[#C85A38]/12 text-[#A34224] border-[#C85A38]/40'
                    : 'bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#1F1B18] border-[#E6DDD1]'
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                  style={{ backgroundColor: traveler.color }}
                >
                  {traveler.initials}
                </span>
                <span className="truncate max-w-[110px]">{traveler.name}</span>
                <span
                  className={`text-[10px] font-mono tabular-nums font-bold px-1.5 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-[#C85A38]/15 text-[#A34224]'
                      : 'bg-[#EFE7DB] text-[#6B6259]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {unknownIdeasCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTravelerFilter('__unknown__')}
              className={`min-h-[44px] px-3 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border shrink-0 ${
                selectedTravelerFilter === '__unknown__'
                  ? 'bg-[#D9822B]/14 text-[#9E5A14] border-[#D9822B]/40'
                  : 'bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#6B6259] border-[#E6DDD1]'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-[#D8CFC2] flex items-center justify-center text-[10px] font-black text-[#1F1B18]">
                ?
              </span>
              <span>Unbekannt</span>
              <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-full bg-[#EFE7DB] text-[#6B6259]">
                {unknownIdeasCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* FILTER BAR: PRIORITY + CATEGORY */}
      <div className="surface-glass rounded-[22px] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-nowrap overflow-x-auto no-scrollbar sm:flex-wrap items-center gap-1.5 max-w-full">
            <span className="text-xs font-bold text-[#6B6259] mr-1 shrink-0">Priorität:</span>
            {[
              { id: 'all', label: 'Alle' },
              { id: 'must_do', label: '⭐ Must-Do' },
              { id: 'nice_to_have', label: '🌴 Nice to have' },
              { id: 'chill', label: '☕ Entspannt' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPriorityFilter(item.id)}
                className={`min-h-[44px] px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                  priorityFilter === item.id
                    ? 'bg-[#D9822B]/14 text-[#9E5A14] border-[#D9822B]/40'
                    : 'bg-[#FAF7F2] text-[#6B6259] hover:bg-[#F3ECE1] border-[#E6DDD1]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-full text-[11px] font-bold bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#A34224] border border-[#E6DDD1] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Filter zurücksetzen</span>
              </button>
            )}
            <p className="text-xs font-semibold text-[#6B6259] font-mono tabular-nums">
              {filteredIdeas.length}{' '}
              {filteredIdeas.length === 1 ? 'Vorschlag' : 'Vorschläge'}
            </p>
          </div>
        </div>

        {/* VISIBLE CATEGORY FILTER BAR */}
        <div className="flex flex-nowrap overflow-x-auto no-scrollbar sm:flex-wrap items-center gap-1.5 pt-2.5 border-t border-[#E6DDD1]">
          <span className="text-xs font-bold text-[#6B6259] mr-1 shrink-0">Kategorie:</span>
          {CATEGORY_FILTER_OPTIONS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                categoryFilter === cat.id
                  ? 'bg-[#C85A38]/12 text-[#A34224] border-[#C85A38]/35'
                  : 'bg-[#FAF7F2] text-[#6B6259] hover:bg-[#F3ECE1] border-[#E6DDD1]'
              }`}
            >
              {cat.id !== 'all' && getCategoryIcon(cat.id)}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* DRAG & DROP DAY PLANNER BAR (Desktop lg+ only, touch uses bottom sheet & quick button) */}
      {ideas.length > 0 && (
        <div
          className={`hidden lg:block rounded-[22px] p-3.5 transition-all border ${
            draggingIdeaId
              ? 'bg-[#C85A38]/10 border-[#C85A38]/50 shadow-sm'
              : 'surface-glass'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1F1B18]">
              <Calendar className="w-4 h-4 text-[#C85A38]" />
              <span>
                {draggingIdeaId
                  ? 'Auf einen Reisetag fallen lassen, um um 10:00 Uhr einzuplanen:'
                  : 'Schnell-Übernahme: Idee hierhin auf einen Reisetag ziehen'}
              </span>
            </div>
            <span className="text-[11px] text-[#6B6259]">
              Alternativ „In Tagesplan“ auf der Karte nutzen
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {Array.from({ length: safeTotalDays }, (_, idx) => idx + 1).map((dayNum) => {
              const isDropActive = dragOverDay === dayNum;
              const isCurrentSelected = selectedDay === dayNum;
              return (
                <button
                  key={dayNum}
                  type="button"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    if (dragOverDay !== dayNum) setDragOverDay(dayNum);
                  }}
                  onDragLeave={() => {
                    if (dragOverDay === dayNum) setDragOverDay(null);
                  }}
                  onDrop={(e) => handleDropIdeaOnDay(e, dayNum)}
                  onClick={() => {
                    setSelectedDay(dayNum);
                    setActiveTab('schedule');
                  }}
                  title={`Idee auf Tag ${dayNum} ziehen oder Tag ${dayNum} im Tagesplan öffnen`}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono tabular-nums shrink-0 transition-all border cursor-pointer ${
                    isDropActive
                      ? 'bg-[#C85A38] text-white border-[#C85A38] scale-105 shadow-sm'
                      : isCurrentSelected
                      ? 'bg-[#C85A38]/12 text-[#A34224] border-[#C85A38]/35 hover:bg-[#C85A38]/20'
                      : 'bg-[#FAF7F2] text-[#6B6259] border-[#E6DDD1] hover:bg-[#F3ECE1]'
                  }`}
                >
                  Tag {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* IDEAS GROUPED BY PERSON */}
      {groupedByTraveler.length === 0 ? (
        <div className="surface-glass rounded-[28px] p-12 text-center border-dashed border-[#E6DDD1]">
          <Lightbulb className="w-12 h-12 text-[#D9822B] mx-auto mb-3 opacity-80" />
          <h3 className="text-lg font-black text-[#1F1B18]">
            {hasActiveFilters
              ? 'Keine Ideen für diese Filterkombination gefunden'
              : 'Noch keine Ideen im Pool'}
          </h3>
          <p className="text-sm text-[#6B6259] mt-1.5 max-w-md mx-auto">
            {hasActiveFilters
              ? 'Passe deine Filter an oder setze alle Filter zurück, um wieder alle Vorschläge zu sehen.'
              : 'Reiche als Erste/r eine coole Idee, einen Ausflug oder einen Restaurant-Tipp ein!'}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="min-h-[44px] px-5 py-2.5 rounded-full bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#1F1B18] font-bold text-xs cursor-pointer inline-flex items-center gap-2 border border-[#E6DDD1]"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#C85A38]" />
                <span>Filter zurücksetzen</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                resetIdeaForm();
                setIsAddIdeaOpen(true);
              }}
              className="min-h-[44px] px-6 py-2.5 rounded-full bg-[#C85A38] hover:bg-[#B54B2B] text-white font-extrabold text-xs cursor-pointer shadow-sm inline-flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Jetzt Idee einreichen</span>
            </button>
          </div>
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
                  className="w-full min-h-[48px] flex items-center justify-between gap-3 px-4 py-3 rounded-[22px] surface-glass hover:bg-white/90 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-sm shrink-0"
                      style={{ backgroundColor: traveler.color }}
                    >
                      {traveler.initials}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base md:text-lg font-black text-[#1F1B18] flex items-center gap-2 flex-wrap">
                        <span className="truncate">Ideen von {traveler.name}</span>
                        <span className="text-xs font-mono tabular-nums font-bold px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#A34224] border border-[#E6DDD1]">
                          {travelerIdeas.length}
                        </span>
                      </h2>
                      {traveler.role && (
                        <p className="text-xs text-[#6B6259] truncate">{traveler.role}</p>
                      )}
                    </div>
                  </div>
                  {isCollapsed ? (
                    <ChevronDown className="w-5 h-5 text-[#6B6259] shrink-0" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-[#6B6259] shrink-0" />
                  )}
                </button>

                {/* IDEAS CARDS GRID */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 cq-cols-1-narrow gap-4">
                    {travelerIdeas.map((idea) => {
                      const hasVoted = idea.votes.includes(currentUser.id);
                      const linkedActivity = trip.activities.find(
                        (a) => a.sourceIdeaId === idea.id
                      );
                      const effectiveAssignedDay =
                        linkedActivity?.dayNumber ?? idea.assignedDay;
                      const isAssigned = typeof effectiveAssignedDay === 'number';
                      const isConfirmingDelete = confirmDeleteId === idea.id;
                      const isHighlighted = highlightedId === idea.id;
                      const mapsUrl = buildGoogleMapsUrl(idea.location);
                      const canFocusOnMap =
                        !isGenericLocation(idea.location) ||
                        (typeof idea.lat === 'number' && typeof idea.lng === 'number');

                      return (
                        <div
                          key={idea.id}
                          data-search-id={idea.id}
                          draggable
                          onDragStart={(e) => handleIdeaDragStart(e, idea)}
                          onDragEnd={() => {
                            setDraggingIdeaId(null);
                            setDragOverDay(null);
                          }}
                          className={`group relative rounded-[26px] p-5 flex flex-col justify-between transition-all duration-300 lg:cursor-grab lg:active:cursor-grabbing ${
                            isHighlighted
                              ? 'surface-glass-elevated ring-2 ring-[#C85A38] shadow-md'
                              : draggingIdeaId === idea.id
                              ? 'surface-glass opacity-60 scale-[0.98] border-[#C85A38]/50'
                              : 'surface-glass hover:border-[#C85A38]/35 hover:-translate-y-0.5'
                          }`}
                        >
                          {/* TOP ROW: PRIORITY, DRAG HANDLE & ACTIONS */}
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <GripVertical className="hidden lg:block w-3.5 h-3.5 text-[#8C8277] shrink-0" />
                                {getPriorityBadge(idea.priority)}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="w-9 h-9 rounded-full bg-[#FAF7F2] border border-[#E6DDD1] flex items-center justify-center shrink-0">
                                  {getCategoryIcon(idea.category)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditIdea(idea)}
                                  title="Idee bearbeiten"
                                  aria-label="Idee bearbeiten"
                                  className="w-11 h-11 rounded-full hover:bg-[#F3ECE1] text-[#6B6259] hover:text-[#A34224] flex items-center justify-center transition-all cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                {isConfirmingDelete ? (
                                  <div className="inline-flex items-center gap-1 bg-rose-600/12 border border-rose-500/30 rounded-full px-2 py-1 text-[11px] font-bold">
                                    <span className="text-rose-800 pl-1">Löschen?</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        deleteIdea(idea.id);
                                        setConfirmDeleteId(null);
                                      }}
                                      className="min-h-[44px] px-3 rounded-full bg-rose-600 text-white hover:bg-rose-500 cursor-pointer"
                                    >
                                      Ja
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="min-h-[44px] px-3 rounded-full bg-white text-[#1F1B18] border border-[#E6DDD1] hover:bg-[#FAF7F2] cursor-pointer"
                                    >
                                      Nein
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(idea.id)}
                                    title="Idee löschen"
                                    aria-label="Idee löschen"
                                    className="w-11 h-11 rounded-full hover:bg-rose-600/12 text-[#6B6259] hover:text-rose-700 flex items-center justify-center transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* TITLE & DESCRIPTION */}
                            <h3 className="text-base font-black text-[#1F1B18] leading-snug tracking-tight">
                              {idea.title}
                            </h3>

                            {idea.description && (
                              <p className="text-xs text-[#6B6259] mt-2 leading-relaxed line-clamp-3">
                                {idea.description}
                              </p>
                            )}

                            {/* META PILLS (ORT, MAPS, KARTE & KOSTEN) */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-3.5 text-[11px] font-bold">
                              {idea.location && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E6DDD1] text-[#1F1B18] max-w-full">
                                  <MapPin className="w-3 h-3 text-[#2A7B88] shrink-0" />
                                  <span className="truncate">{idea.location}</span>
                                </span>
                              )}
                              {canFocusOnMap && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    focusOnMap({
                                      kind: 'idea',
                                      id: idea.id,
                                      title: idea.title,
                                      location: idea.location || trip.destination,
                                      lat: idea.lat,
                                      lng: idea.lng,
                                      dayNumber: effectiveAssignedDay,
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl bg-[#2A7B88]/12 hover:bg-[#2A7B88]/20 text-[#1F5E68] border border-[#2A7B88]/30 transition-colors cursor-pointer"
                                  title="Standort auf Karte fokussieren"
                                >
                                  <MapIcon className="w-3.5 h-3.5" />
                                  <span>🗺️ Auf Karte</span>
                                </button>
                              )}
                              {mapsUrl && (
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#1F1B18] border border-[#E6DDD1] transition-colors"
                                  title={`In Google Maps öffnen: ${idea.location}`}
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-[#6B6259]" />
                                  <span>Maps</span>
                                </a>
                              )}
                              {typeof idea.estimatedCost === 'number' &&
                                idea.estimatedCost > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#D9822B]/14 border border-[#D9822B]/30 text-[#9E5A14] font-mono tabular-nums">
                                    ca. {formatCurrency(idea.estimatedCost, currency)} p.P.
                                  </span>
                                )}
                              {isAssigned && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDay(effectiveAssignedDay!);
                                    if (linkedActivity) {
                                      setSelectedActivityId(linkedActivity.id);
                                    }
                                    setActiveTab('schedule');
                                  }}
                                  className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl bg-[#6E7F5E]/14 hover:bg-[#6E7F5E]/22 text-[#4B593E] border border-[#6E7F5E]/30 font-extrabold cursor-pointer"
                                  title="Im Tagesplan anzeigen"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#6E7F5E]" />
                                  <span>Tag {effectiveAssignedDay} eingeplant</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* BOTTOM ROW: VOTERS & ACTIONS */}
                          <div className="mt-5 pt-3.5 border-t border-[#E6DDD1] flex items-center justify-between gap-2 flex-wrap">
                            {/* VOTER AVATARS */}
                            <div className="flex items-center gap-1.5">
                              <div className="flex -space-x-1.5">
                                {idea.votes.slice(0, 4).map((voterId) => {
                                  const voter = trip.travelers.find(
                                    (t) => t.id === voterId
                                  );
                                  if (!voter) return null;
                                  return (
                                    <span
                                      key={voterId}
                                      title={voter.name}
                                      className="w-6 h-6 rounded-full border-2 border-[#FAF7F2] flex items-center justify-center text-[9px] font-black text-white shadow-sm"
                                      style={{ backgroundColor: voter.color }}
                                    >
                                      {voter.initials}
                                    </span>
                                  );
                                })}
                              </div>
                              {idea.votes.length > 4 && (
                                <span className="text-[10px] font-mono tabular-nums font-bold text-[#6B6259]">
                                  +{idea.votes.length - 4}
                                </span>
                              )}
                            </div>

                            {/* BUTTONS: VOTE, QUICK + TAG X & SCHEDULE */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => toggleIdeaVote(idea.id)}
                                className={`min-h-[44px] px-3.5 py-2 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border ${
                                  hasVoted
                                    ? 'bg-[#C85A38] text-white border-[#C85A38] shadow-sm'
                                    : 'bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#1F1B18] border-[#E6DDD1]'
                                }`}
                                title={
                                  hasVoted ? 'Deine Stimme zurückziehen' : 'Dafür stimmen'
                                }
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                                <span className="font-mono tabular-nums">
                                  {idea.votes.length}
                                </span>
                              </button>

                              {effectiveAssignedDay !== selectedDay && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    scheduleIdeaToDay(idea.id, selectedDay, '10:00')
                                  }
                                  className="inline-flex items-center gap-1 min-h-[44px] px-3 py-2 rounded-full bg-[#C85A38]/12 hover:bg-[#C85A38]/20 border border-[#C85A38]/30 text-[#A34224] text-xs font-extrabold transition-all cursor-pointer font-mono tabular-nums"
                                  title={`Direkt für Tag ${selectedDay} (10:00 Uhr) einplanen`}
                                >
                                  <span>+ Tag {selectedDay}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => openScheduleModal(idea)}
                                className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-full bg-[#6E7F5E]/14 hover:bg-[#6E7F5E]/22 border border-[#6E7F5E]/30 text-[#4B593E] text-xs font-bold transition-all cursor-pointer"
                                title="In den Tagesplan übernehmen"
                              >
                                <CalendarPlus className="w-3.5 h-3.5" />
                                <span>In Tagesplan</span>
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

      {/* MODAL: NEUE IDEE VORSCHLAGEN / BEARBEITEN */}
      {isAddIdeaOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#1F1B18]/40 backdrop-blur-sm animate-fade-in"
          onClick={closeIdeaModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="idea-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="surface-glass-elevated w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-7 space-y-5 mobile-sheet"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#D9822B]/14 border border-[#D9822B]/30 text-[#9E5A14] flex items-center justify-center shrink-0">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="idea-modal-title" className="text-lg font-black text-[#1F1B18]">
                    {editingIdeaId ? 'Idee bearbeiten' : 'Neue Idee einreichen'}
                  </h3>
                  <p className="text-xs text-[#6B6259]">
                    {editingIdeaId ? (
                      'Änderungen speichern – alle bisherigen Votes bleiben erhalten.'
                    ) : (
                      <>
                        Vorgeschlagen von:{' '}
                        <strong className="text-[#1F1B18]">{currentUser.name}</strong>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeIdeaModal}
                aria-label="Dialog schließen"
                className="w-11 h-11 rounded-full bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#E6DDD1] flex items-center justify-center text-[#6B6259] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="rounded-2xl bg-rose-600/12 border border-rose-500/30 px-4 py-2.5 text-xs font-semibold text-rose-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateIdea} className="space-y-4">
              <div>
                <label
                  htmlFor="idea-title-input"
                  className="block text-xs font-bold text-[#1F1B18] mb-1.5"
                >
                  Was möchtest du vorschlagen? *
                </label>
                <input
                  id="idea-title-input"
                  type="text"
                  required
                  placeholder="z.B. Bootstour mit Schnorcheln, Tapas kochen, Quadtour..."
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="w-full surface-input rounded-2xl px-4 py-3 text-sm font-semibold placeholder:text-[#8C8277]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="idea-priority-select"
                    className="block text-xs font-bold text-[#1F1B18] mb-1.5"
                  >
                    Priorität
                  </label>
                  <select
                    id="idea-priority-select"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as IdeaPriority)}
                    className="w-full surface-input rounded-2xl px-3.5 py-2.5 text-xs font-bold [color-scheme:light]"
                  >
                    <option value="must_do" className="bg-white text-[#1F1B18]">
                      ⭐ Must-Do (Unbedingt!)
                    </option>
                    <option value="nice_to_have" className="bg-white text-[#1F1B18]">
                      🌴 Nice to have
                    </option>
                    <option value="chill" className="bg-white text-[#1F1B18]">
                      ☕ Entspannt / Chillig
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="idea-category-select"
                    className="block text-xs font-bold text-[#1F1B18] mb-1.5"
                  >
                    Kategorie
                  </label>
                  <select
                    id="idea-category-select"
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as ActivityCategory | 'food')
                    }
                    className="w-full surface-input rounded-2xl px-3.5 py-2.5 text-xs font-bold [color-scheme:light]"
                  >
                    <option value="activity" className="bg-white text-[#1F1B18]">
                      Aktivität / Action
                    </option>
                    <option value="beach" className="bg-white text-[#1F1B18]">
                      Strand & Meer
                    </option>
                    <option value="food" className="bg-white text-[#1F1B18]">
                      Essen & Kulinarik
                    </option>
                    <option value="culture" className="bg-white text-[#1F1B18]">
                      Kultur & Sightseeing
                    </option>
                    <option value="transport" className="bg-white text-[#1F1B18]">
                      Transfer & Route
                    </option>
                    <option value="nightlife" className="bg-white text-[#1F1B18]">
                      Abend & Feiern
                    </option>
                    <option value="other" className="bg-white text-[#1F1B18]">
                      Sonstiges
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="idea-desc-input"
                  className="block text-xs font-bold text-[#1F1B18] mb-1.5"
                >
                  Beschreibung / Notiz (optional)
                </label>
                <textarea
                  id="idea-desc-input"
                  rows={3}
                  placeholder="Warum hast du Lust darauf? Gibt es Details oder Tipps?"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full surface-input rounded-2xl p-3.5 text-xs font-medium placeholder:text-[#8C8277] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="idea-location-input"
                    className="block text-xs font-bold text-[#1F1B18] mb-1.5"
                  >
                    Ort / Spot (optional)
                  </label>
                  <input
                    id="idea-location-input"
                    type="text"
                    placeholder="z.B. Cala Varques, Palma..."
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full surface-input rounded-2xl px-3.5 py-2.5 text-xs font-semibold placeholder:text-[#8C8277]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="idea-cost-input"
                    className="block text-xs font-bold text-[#1F1B18] mb-1.5"
                  >
                    Kosten p.P. in {currency} (optional)
                  </label>
                  <input
                    id="idea-cost-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="z.B. 25.50"
                    value={newCost}
                    onChange={(e) => {
                      setNewCost(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    className="w-full surface-input rounded-2xl px-3.5 py-2.5 text-xs font-mono tabular-nums font-semibold placeholder:text-[#8C8277]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeIdeaModal}
                  className="min-h-[44px] px-5 py-2.5 rounded-full text-xs font-bold bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#6B6259] border border-[#E6DDD1] cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-6 py-2.5 rounded-full bg-[#C85A38] hover:bg-[#B54B2B] text-white font-extrabold text-xs shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{editingIdeaId ? 'Änderungen speichern' : 'Idee einreichen'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IN TAGESPLAN ÜBERNEHMEN */}
      {schedulingIdea && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#1F1B18]/40 backdrop-blur-sm animate-fade-in"
          onClick={closeScheduleModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-idea-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="surface-glass-elevated w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-6 space-y-5 mobile-sheet"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[#6E7F5E]/14 border border-[#6E7F5E]/30 text-[#4B593E] flex items-center justify-center shrink-0">
                  <CalendarPlus className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3
                    id="schedule-idea-modal-title"
                    className="text-lg font-black text-[#1F1B18]"
                  >
                    In Tagesplan übernehmen
                  </h3>
                  <p className="text-xs text-[#6B6259] truncate">
                    „{schedulingIdea.title}“
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeScheduleModal}
                aria-label="Dialog schließen"
                className="w-11 h-11 rounded-full bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#E6DDD1] flex items-center justify-center text-[#6B6259] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {scheduleTimeError && (
              <div className="rounded-2xl bg-rose-600/12 border border-rose-500/30 px-4 py-2.5 text-xs font-semibold text-rose-800">
                {scheduleTimeError}
              </div>
            )}

            <form onSubmit={handleConfirmSchedule} className="space-y-4">
              <div>
                <label
                  htmlFor="schedule-idea-day"
                  className="block text-xs font-bold text-[#1F1B18] mb-1.5"
                >
                  An welchem Tag soll die Aktivität stattfinden?
                </label>
                <select
                  id="schedule-idea-day"
                  value={scheduleDay}
                  onChange={(e) => setScheduleDay(Number(e.target.value))}
                  className="w-full surface-input rounded-2xl px-4 py-3 text-sm font-bold [color-scheme:light]"
                >
                  {Array.from({ length: safeTotalDays }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day} className="bg-white text-[#1F1B18]">
                      Tag {day}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="schedule-idea-start"
                    className="block text-xs font-bold text-[#1F1B18] mb-1.5"
                  >
                    Startzeit
                  </label>
                  <input
                    id="schedule-idea-start"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => {
                      setScheduleTime(e.target.value);
                      if (scheduleTimeError) setScheduleTimeError(null);
                    }}
                    className="w-full surface-input rounded-2xl px-3.5 py-2.5 text-sm font-mono tabular-nums font-bold [color-scheme:light]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="schedule-idea-end"
                    className="block text-xs font-bold text-[#1F1B18] mb-1.5"
                  >
                    Endzeit (optional)
                  </label>
                  <input
                    id="schedule-idea-end"
                    type="time"
                    value={scheduleEndTime}
                    onChange={(e) => {
                      setScheduleEndTime(e.target.value);
                      if (scheduleTimeError) setScheduleTimeError(null);
                    }}
                    className="w-full surface-input rounded-2xl px-3.5 py-2.5 text-sm font-mono tabular-nums font-bold [color-scheme:light]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeScheduleModal}
                  className="min-h-[44px] px-5 py-2.5 rounded-full text-xs font-bold bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#6B6259] border border-[#E6DDD1] cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-6 py-2.5 rounded-full bg-[#6E7F5E] hover:bg-[#5B6B4D] text-white font-extrabold text-xs shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
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

export default IdeasPoolView;
