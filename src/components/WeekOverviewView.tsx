import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  GripVertical,
  Landmark,
  MapPin,
  Music,
  Navigation,
  Plus,
  Sparkles,
  Sun,
  ThumbsUp,
  Utensils,
  X,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import { ActivityCategory, DayActivity, MealType } from '../types/vacation';
import {
  buildGoogleMapsUrl,
  compareTimeSlots,
  detectDayConflicts,
  formatCurrency,
  formatTripDayDate,
} from '../utils/vacationHelpers';

const CATEGORY_META: Record<
  ActivityCategory,
  { badgeClass: string; icon: React.ReactNode }
> = {
  beach: {
    badgeClass: 'bg-[#D9822B]/14 text-[#9E5A14] border border-[#D9822B]/30',
    icon: <Sun className="w-3.5 h-3.5" />,
  },
  activity: {
    badgeClass: 'bg-[#6E7F5E]/14 text-[#4B593E] border border-[#6E7F5E]/30',
    icon: <Compass className="w-3.5 h-3.5" />,
  },
  culture: {
    badgeClass: 'bg-[#2A7B88]/12 text-[#1F5E68] border border-[#2A7B88]/30',
    icon: <Landmark className="w-3.5 h-3.5" />,
  },
  transport: {
    badgeClass: 'bg-[#F3ECE1]/80 text-[#6B6259] border border-[#E6DDD1]',
    icon: <Car className="w-3.5 h-3.5" />,
  },
  nightlife: {
    badgeClass: 'bg-[#C85A38]/12 text-[#A34224] border border-[#C85A38]/30',
    icon: <Music className="w-3.5 h-3.5" />,
  },
  other: {
    badgeClass: 'bg-[#FAF7F2] text-[#6B6259] border border-[#E6DDD1]',
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
};

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittag',
  dinner: 'Abendessen',
  snack: 'Snack',
};

const ACTIVITY_STATUS_META: Record<
  DayActivity['status'],
  { label: string; badgeClass: string }
> = {
  confirmed: {
    label: 'Bestätigt',
    badgeClass: 'bg-[#6E7F5E]/14 text-[#4B593E] border border-[#6E7F5E]/30',
  },
  planned: {
    label: 'Geplant',
    badgeClass: 'bg-[#2A7B88]/12 text-[#1F5E68] border border-[#2A7B88]/30',
  },
  idea: {
    label: 'Idee',
    badgeClass: 'bg-[#D9822B]/14 text-[#9E5A14] border border-[#D9822B]/30',
  },
};

export const WeekOverviewView: React.FC = () => {
  const {
    trip,
    currentUser,
    selectedDay,
    setSelectedDay,
    setSelectedActivityId,
    setActiveTab,
    setIsQuickAddOpen,
    toggleActivityVote,
    updateActivity,
    toggleMealVote,
    focusOnMap,
    setSearchTarget,
    showToast,
    scheduleIdeaToDay,
  } = useVacation();

  const [spanMode, setSpanMode] = useState<'3' | '7' | 'all'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? '3' : '7'
  );
  const [typeFilter, setTypeFilter] = useState<'all' | 'activities' | 'meals'>('all');
  const [pageOffset, setPageOffset] = useState(0);
  const [draggingActivityId, setDraggingActivityId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [movingActivityId, setMovingActivityId] = useState<string | null>(null);

  const safeTotalDays = Math.max(1, Math.round(trip.totalDays || 1));
  const pageSize = spanMode === '3' ? 3 : 7;
  const maxPages =
    spanMode === 'all' ? 1 : Math.max(1, Math.ceil(safeTotalDays / pageSize));

  // Sync pagination cleanly whenever selectedDay, trip, totalDays, or spanMode changes externally
  useEffect(() => {
    if (spanMode === 'all') {
      setPageOffset(0);
      return;
    }
    const clampedSelected = Math.max(1, Math.min(selectedDay, safeTotalDays));
    const targetPage = Math.floor((clampedSelected - 1) / pageSize);
    setPageOffset(Math.min(targetPage, maxPages - 1));
  }, [selectedDay, trip.id, safeTotalDays, spanMode, pageSize, maxPages]);

  const visibleDays = useMemo(() => {
    const allDays = Array.from({ length: safeTotalDays }, (_, i) => i + 1);
    if (spanMode === 'all') return allDays;
    const clampedPage = Math.max(0, Math.min(pageOffset, maxPages - 1));
    const startIdx = clampedPage * pageSize;
    return allDays.slice(startIdx, startIdx + pageSize);
  }, [safeTotalDays, spanMode, pageOffset, pageSize, maxPages]);

  const dayRangeLabel = useMemo(() => {
    if (visibleDays.length === 0) return '';
    const first = visibleDays[0];
    const last = visibleDays[visibleDays.length - 1];
    return first === last ? `Tag ${first}` : `Tag ${first}–${last}`;
  }, [visibleDays]);

  const handleMoveActivityToDay = (activityId: string, targetDay: number) => {
    const act = trip.activities.find((a) => a.id === activityId);
    if (!act) return;
    if (act.dayNumber === targetDay) {
      setMovingActivityId(null);
      return;
    }
    updateActivity(activityId, { dayNumber: targetDay });
    setSelectedDay(targetDay);
    setSelectedActivityId(activityId);
    setMovingActivityId(null);
    showToast(`„${act.title}“ auf Tag ${targetDay} verschoben`, 'success');
  };

  return (
    <div className="space-y-5 min-w-0 w-full">
      {/* Header */}
      <div className="surface-glass rounded-[28px] p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#C85A38]/12 text-[#A34224] border border-[#C85A38]/30 mb-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Wochen- &amp; Mehrtages-Kalender</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#1F1B18] tracking-tight break-words">
            Alle Termine im Überblick
          </h1>
          <p className="text-xs font-medium text-[#6B6259] mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-[#1F1B18] font-semibold">{trip.destination}</span>
            <span className="text-[#8C8277]">•</span>
            <span className="font-mono tabular-nums text-[#A34224] font-bold">
              {dayRangeLabel} von {safeTotalDays}
            </span>
            <span className="text-[#8C8277] hidden sm:inline">•</span>
            <span className="hidden sm:inline text-[#6B6259]">
              Aktivitäten per Drag &amp; Drop zwischen Tagen verschieben
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* Span Selector */}
          <div className="inline-flex flex-wrap items-center bg-[#FAF7F2] p-1 rounded-2xl sm:rounded-full border border-[#E6DDD1] max-w-full">
            {[
              { id: '3', label: '3 Tage' },
              { id: '7', label: 'Woche (7T)' },
              { id: 'all', label: 'Alle Tage' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setSpanMode(opt.id as '3' | '7' | 'all');
                }}
                className={`px-3 min-h-[44px] sm:min-h-[38px] rounded-full text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
                  spanMode === opt.id
                    ? 'bg-[#C85A38] text-white shadow-sm'
                    : 'text-[#6B6259] hover:text-[#1F1B18]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="inline-flex flex-wrap items-center bg-[#FAF7F2] p-1 rounded-2xl sm:rounded-full border border-[#E6DDD1] max-w-full">
            {[
              { id: 'all', label: 'Alles' },
              { id: 'activities', label: 'Aktivitäten' },
              { id: 'meals', label: 'Essen' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  setTypeFilter(opt.id as 'all' | 'activities' | 'meals')
                }
                className={`px-3 min-h-[44px] sm:min-h-[38px] rounded-full text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
                  typeFilter === opt.id
                    ? 'bg-[#F3ECE1] text-[#1F1B18] border border-[#E6DDD1]'
                    : 'text-[#6B6259] hover:text-[#1F1B18]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Pagination with Day-Range Indicator */}
          {maxPages > 1 && (
            <div className="inline-flex items-center gap-1.5 bg-[#FAF7F2] px-1.5 py-1 rounded-full border border-[#E6DDD1]">
              <button
                type="button"
                onClick={() => setPageOffset((p) => Math.max(0, p - 1))}
                disabled={pageOffset === 0}
                aria-label="Vorherige Tage"
                className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-[#C85A38]/12 text-[#1F1B18] border border-[#E6DDD1] flex items-center justify-center disabled:opacity-35 cursor-pointer"
                title="Vorherige Tage"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-bold text-[#A34224] font-mono tabular-nums px-1.5 whitespace-nowrap">
                {dayRangeLabel}
              </span>
              <button
                type="button"
                onClick={() => setPageOffset((p) => Math.min(maxPages - 1, p + 1))}
                disabled={pageOffset >= maxPages - 1}
                aria-label="Nächste Tage"
                className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-[#C85A38]/12 text-[#1F1B18] border border-[#E6DDD1] flex items-center justify-center disabled:opacity-35 cursor-pointer"
                title="Nächste Tage"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Compact Horizontal Day-Jump Pill Strip */}
      {safeTotalDays > 1 && (
        <div
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 min-w-0 w-full"
          aria-label="Schnellauswahl Reisetag"
        >
          {Array.from({ length: safeTotalDays }, (_, idx) => idx + 1).map((dayNum) => {
            const isSelected = dayNum === selectedDay;
            const isVisible = visibleDays.includes(dayNum);
            const dayCount =
              (typeFilter === 'meals'
                ? 0
                : trip.activities.filter((a) => a.dayNumber === dayNum).length) +
              (typeFilter === 'activities'
                ? 0
                : trip.meals.filter((m) => m.dayNumber === dayNum).length);

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => {
                  setSelectedDay(dayNum);
                  if (spanMode === 'all') {
                    window.setTimeout(() => {
                      document
                        .getElementById(`week-day-${dayNum}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 30);
                  }
                }}
                className={`min-h-[44px] px-3.5 rounded-full text-xs font-bold transition-all shrink-0 inline-flex items-center gap-1.5 border cursor-pointer ${
                  isSelected
                    ? 'bg-[#C85A38] text-white border-[#C85A38] shadow-sm'
                    : isVisible
                    ? 'bg-[#C85A38]/12 text-[#A34224] border-[#C85A38]/30 hover:bg-[#C85A38]/20'
                    : 'surface-glass text-[#6B6259] hover:text-[#1F1B18] hover:bg-[#F3ECE1]'
                }`}
              >
                <span className="font-mono tabular-nums">T{dayNum}</span>
                {dayCount > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums ${
                      isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-[#F3ECE1] text-[#1F1B18]'
                    }`}
                  >
                    {dayCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Multi-Day Columns Grid (responsive without crushing on lg: 1024px or overflowing 390px) */}
      <div
        className={`grid gap-4 min-w-0 w-full cq-cols-1-narrow ${
          spanMode === '3'
            ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
        }`}
      >
        {visibleDays.map((day) => {
          const isSelectedDay = day === selectedDay;
          const isDropTarget = dragOverDay === day;

          const dayConflicts = detectDayConflicts(
            trip.activities,
            trip.meals,
            day
          );
          const conflictCount = Object.keys(dayConflicts).filter(
            (id) => dayConflicts[id].length > 0
          ).length;

          const acts =
            typeFilter === 'meals'
              ? []
              : trip.activities
                  .filter((a) => a.dayNumber === day)
                  .map((a) => ({
                    kind: 'activity' as const,
                    id: a.id,
                    time: a.timeSlot || '09:00',
                    endTime: a.endTime,
                    title: a.title,
                    location: a.location,
                    cost: a.estimatedCost,
                    category: a.category,
                    status: a.status,
                    votes: a.votes,
                    lat: a.lat,
                    lng: a.lng,
                  }));

          const meals =
            typeFilter === 'activities'
              ? []
              : trip.meals
                  .filter((m) => m.dayNumber === day)
                  .map((m) => ({
                    kind: 'meal' as const,
                    id: m.id,
                    time: m.time || '12:30',
                    title: m.title,
                    location: m.locationOrRecipe,
                    cost: m.estimatedCostPerPerson,
                    mealType: m.mealType,
                    style: m.style,
                    votes: m.votes,
                    lat: m.lat,
                    lng: m.lng,
                  }));

          const items = [...acts, ...meals].sort((a, b) =>
            compareTimeSlots(a.time, b.time)
          );

          return (
            <div
              key={day}
              id={`week-day-${day}`}
              onDragOver={(e) => {
                e.preventDefault();
                if (e.dataTransfer) {
                  e.dataTransfer.dropEffect = 'move';
                }
                if (dragOverDay !== day) setDragOverDay(day);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setDragOverDay((curr) => (curr === day ? null : curr));
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverDay(null);
                let ideaId =
                  e.dataTransfer?.getData('application/x-vacayly-idea') ||
                  e.dataTransfer?.getData('application/x-idea-id') ||
                  '';
                let actId =
                  e.dataTransfer?.getData('application/x-vacayly-activity') ||
                  e.dataTransfer?.getData('application/x-activity-id') ||
                  '';

                if (!ideaId && !actId) {
                  const plain = e.dataTransfer?.getData('text/plain') || '';
                  if (plain) {
                    try {
                      const parsed = JSON.parse(plain) as {
                        kind?: string;
                        id?: string;
                      };
                      if (parsed?.kind === 'idea' && typeof parsed.id === 'string') {
                        ideaId = parsed.id;
                      } else if (
                        parsed?.kind === 'activity' &&
                        typeof parsed.id === 'string'
                      ) {
                        actId = parsed.id;
                      }
                    } catch {
                      // fallback: raw ID string if dragging local activity
                    }
                  }
                }

                if (ideaId) {
                  scheduleIdeaToDay(ideaId, day, '10:00');
                  setDraggingActivityId(null);
                  return;
                }
                const targetActId = actId || draggingActivityId;
                setDraggingActivityId(null);
                if (targetActId) {
                  handleMoveActivityToDay(targetActId, day);
                }
              }}
              className={`rounded-[24px] p-3.5 sm:p-4 flex flex-col justify-between gap-3 transition-all border min-w-0 break-words ${
                isDropTarget
                  ? 'surface-glass-elevated border-[#C85A38] ring-2 ring-[#C85A38]/30 shadow-md'
                  : isSelectedDay
                  ? 'surface-glass-elevated border-[#C85A38]/55 shadow-sm'
                  : 'surface-glass hover:border-[#D8CFC2]'
              }`}
            >
              <div className="min-w-0">
                {/* Day Column Header */}
                <div className="flex items-start justify-between gap-2 pb-3 mb-3 border-b border-[#E6DDD1] min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className="text-left group cursor-pointer min-w-0 flex-1 min-h-[44px] flex items-center"
                  >
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-full font-mono tabular-nums shrink-0 ${
                          isSelectedDay
                            ? 'bg-[#C85A38] text-white'
                            : 'bg-[#C85A38]/12 text-[#A34224] border border-[#C85A38]/30'
                        }`}
                      >
                        Tag {day}
                      </span>
                      <span className="text-xs font-bold text-[#6B6259] group-hover:text-[#A34224] transition-colors truncate">
                        {formatTripDayDate(trip.startDate, day)}
                      </span>
                    </div>
                  </button>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] font-bold text-[#8C8277] font-mono tabular-nums">
                      {items.length} {items.length === 1 ? 'Termin' : 'Termine'}
                    </span>
                    {conflictCount > 0 && (
                      <span
                        title="Zeitkonflikte an diesem Tag"
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D9822B]/14 text-[#9E5A14] border border-[#D9822B]/30 font-mono tabular-nums"
                      >
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {conflictCount} Konflikt
                      </span>
                    )}
                  </div>
                </div>

                {/* Day Appointments List */}
                <div className="space-y-2.5 min-w-0">
                  {items.length === 0 ? (
                    <div className="rounded-2xl p-5 text-center border border-dashed border-[#E6DDD1] bg-[#FAF7F2]">
                      <Clock className="w-4 h-4 text-[#8C8277] mx-auto mb-1.5" />
                      <p className="text-[11px] font-semibold text-[#6B6259]">
                        {isDropTarget ? 'Hier ablegen' : 'Noch frei'}
                      </p>
                    </div>
                  ) : (
                    items.map((item) => {
                      const hasVoted = item.votes.includes(currentUser.id);
                      const hasConflict = (dayConflicts[item.id] || []).length > 0;
                      const isDragging =
                        item.kind === 'activity' && draggingActivityId === item.id;
                      const isMoveMenuOpen =
                        item.kind === 'activity' && movingActivityId === item.id;
                      const mapsUrl = buildGoogleMapsUrl(item.location);

                      const meta =
                        item.kind === 'activity'
                          ? CATEGORY_META[item.category] || CATEGORY_META.other
                          : {
                              badgeClass:
                                'bg-[#D9822B]/14 text-[#9E5A14] border border-[#D9822B]/30',
                              icon: <Utensils className="w-3.5 h-3.5" />,
                            };

                      const statusBadge =
                        item.kind === 'meal'
                          ? {
                              label: MEAL_LABELS[item.mealType],
                              badgeClass:
                                'bg-[#D9822B]/14 text-[#9E5A14] border border-[#D9822B]/30',
                            }
                          : ACTIVITY_STATUS_META[item.status] ||
                            ACTIVITY_STATUS_META.planned;

                      return (
                        <div
                          key={`${item.kind}-${item.id}`}
                          draggable={item.kind === 'activity'}
                          onDragStart={(e) => {
                            if (item.kind !== 'activity') return;
                            setDraggingActivityId(item.id);
                            if (e.dataTransfer) {
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData(
                                'application/x-vacayly-activity',
                                item.id
                              );
                              e.dataTransfer.setData(
                                'application/x-activity-id',
                                item.id
                              );
                              e.dataTransfer.setData(
                                'text/plain',
                                JSON.stringify({ kind: 'activity', id: item.id })
                              );
                            }
                          }}
                          onDragEnd={() => {
                            setDraggingActivityId(null);
                            setDragOverDay(null);
                          }}
                          className={`rounded-2xl p-3 bg-[#FAF7F2] hover:bg-white border transition-all space-y-2 min-w-0 break-words ${
                            isDragging
                              ? 'opacity-45 border-[#C85A38] scale-[0.98]'
                              : hasConflict
                              ? 'border-[#D9822B]/45'
                              : 'border-[#E6DDD1] hover:border-[#D8CFC2]'
                          }`}
                        >
                          {/* Top Row: Time + Drag Grip + Status Badge */}
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {item.kind === 'activity' && (
                                <GripVertical
                                  className="w-3.5 h-3.5 text-[#8C8277] shrink-0 cursor-grab active:cursor-grabbing"
                                  aria-hidden="true"
                                />
                              )}
                              <span
                                className={`w-6 h-6 rounded-lg ${meta.badgeClass} flex items-center justify-center shrink-0`}
                              >
                                {meta.icon}
                              </span>
                              <span className="text-[11px] font-extrabold text-[#A34224] font-mono tabular-nums truncate">
                                {item.time}
                                {item.kind === 'activity' && item.endTime
                                  ? `–${item.endTime}`
                                  : ''}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {hasConflict && (
                                <span
                                  title="Zeitkonflikt mit anderem Termin"
                                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#D9822B]/14 text-[#9E5A14] border border-[#D9822B]/30"
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${statusBadge.badgeClass}`}
                              >
                                {statusBadge.label}
                              </span>
                            </div>
                          </div>

                          {/* Selectable Title Button (no nested buttons inside!) */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDay(day);
                              if (item.kind === 'activity') {
                                setSelectedActivityId(item.id);
                                setActiveTab('schedule');
                                setSearchTarget({
                                  tab: 'schedule',
                                  kind: 'activity',
                                  id: item.id,
                                  dayNumber: day,
                                });
                              } else {
                                setActiveTab('meals');
                                setSearchTarget({
                                  tab: 'meals',
                                  kind: 'meal',
                                  id: item.id,
                                  dayNumber: day,
                                });
                              }
                            }}
                            className="w-full text-left cursor-pointer group min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A38]"
                          >
                            <h4 className="text-xs font-extrabold text-[#1F1B18] group-hover:text-[#A34224] transition-colors leading-snug break-words">
                              {item.title}
                            </h4>
                          </button>

                          {/* Location Row with Focus on Map + Safe Google Maps URL */}
                          {(item.location ||
                            (typeof item.lat === 'number' &&
                              typeof item.lng === 'number')) && (
                            <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-[#6B6259] min-w-0">
                              <span className="inline-flex items-center gap-1 min-w-0 flex-1">
                                <MapPin className="w-3.5 h-3.5 text-[#2A7B88] shrink-0" />
                                <span className="truncate break-words">
                                  {item.location || trip.destination}
                                </span>
                              </span>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    focusOnMap({
                                      kind: item.kind,
                                      id: item.id,
                                      title: item.title,
                                      location: item.location || trip.destination,
                                      lat: item.lat,
                                      lng: item.lng,
                                      dayNumber: day,
                                      time: item.time,
                                    })
                                  }
                                  title="Auf Karte zeigen"
                                  aria-label={`${item.title} auf Karte zeigen`}
                                  className="inline-flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-[40px] rounded-xl bg-[#2A7B88]/12 hover:bg-[#2A7B88]/20 text-[#1F5E68] border border-[#2A7B88]/30 text-[11px] font-bold transition-colors cursor-pointer"
                                >
                                  <Navigation className="w-3.5 h-3.5" />
                                  <span>Karte</span>
                                </button>

                                {mapsUrl &&
                                  (item.kind === 'activity' ||
                                    item.style === 'restaurant' ||
                                    item.style === 'bakery') && (
                                    <a
                                      href={mapsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-white hover:bg-[#F3ECE1] text-[#6B6259] hover:text-[#1F1B18] border border-[#E6DDD1] transition-colors"
                                      title="In Google Maps öffnen"
                                      aria-label={`${item.title} in Google Maps öffnen`}
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  )}
                              </div>
                            </div>
                          )}

                          {/* Bottom Row: Cost + Touch Move Selector + Vote */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 min-w-0">
                            <span className="text-[11px] font-bold text-[#4B593E] font-mono tabular-nums truncate">
                              {item.cost > 0
                                ? `~${formatCurrency(item.cost, trip.currency)}`
                                : 'Kostenlos'}
                            </span>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.kind === 'activity' && safeTotalDays > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMovingActivityId((curr) =>
                                      curr === item.id ? null : item.id
                                    )
                                  }
                                  aria-expanded={isMoveMenuOpen}
                                  title="Auf anderen Tag verschieben"
                                  className={`inline-flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-[40px] rounded-full text-[11px] font-bold transition-colors cursor-pointer border ${
                                    isMoveMenuOpen
                                      ? 'bg-[#C85A38]/12 text-[#A34224] border-[#C85A38]/35'
                                      : 'bg-white hover:bg-[#F3ECE1] text-[#6B6259] border-[#E6DDD1]'
                                  }`}
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                  <span>Verschieben</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  if (item.kind === 'activity') {
                                    toggleActivityVote(item.id);
                                  } else {
                                    toggleMealVote(item.id);
                                  }
                                }}
                                aria-label={`Stimmen für ${item.title} (${item.votes.length})`}
                                className={`inline-flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-[40px] rounded-full text-[11px] font-bold transition-all cursor-pointer font-mono tabular-nums border ${
                                  hasVoted
                                    ? 'bg-[#C85A38]/12 text-[#A34224] border-[#C85A38]/35'
                                    : 'bg-white hover:bg-[#F3ECE1] text-[#6B6259] border-[#E6DDD1]'
                                }`}
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                                <span>{item.votes.length}</span>
                              </button>
                            </div>
                          </div>

                          {/* Touch / Mobile Day Move Picker Drawer */}
                          {isMoveMenuOpen && item.kind === 'activity' && (
                            <div className="pt-2.5 mt-1 border-t border-[#E6DDD1] space-y-2 animate-fade-in">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-[#A34224] uppercase tracking-wider">
                                  Auf Tag verschieben:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setMovingActivityId(null)}
                                  aria-label="Verschieben-Auswahl schließen"
                                  className="w-10 h-10 rounded-full text-[#8C8277] hover:text-[#1F1B18] hover:bg-[#F3ECE1] flex items-center justify-center cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={day <= 1}
                                  onClick={() => handleMoveActivityToDay(item.id, day - 1)}
                                  className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-white hover:bg-[#C85A38] hover:text-white text-[#1F1B18] border border-[#E6DDD1] disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                                >
                                  −1 Tag
                                </button>
                                <select
                                  value={day}
                                  onChange={(e) =>
                                    handleMoveActivityToDay(item.id, Number(e.target.value))
                                  }
                                  aria-label={`Zieltag für ${item.title}`}
                                  className="surface-input flex-1 min-w-[110px] min-h-[44px] px-2.5 rounded-xl text-xs font-bold font-mono tabular-nums [color-scheme:light]"
                                >
                                  {Array.from(
                                    { length: safeTotalDays },
                                    (_, idx) => idx + 1
                                  ).map((targetDay) => (
                                    <option
                                      key={targetDay}
                                      value={targetDay}
                                      className="bg-white text-[#1F1B18]"
                                    >
                                      Tag {targetDay} ({formatTripDayDate(trip.startDate, targetDay)})
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={day >= safeTotalDays}
                                  onClick={() => handleMoveActivityToDay(item.id, day + 1)}
                                  className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-white hover:bg-[#C85A38] hover:text-white text-[#1F1B18] border border-[#E6DDD1] disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                                >
                                  +1 Tag
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Footer: Quick Add + Contextual Details Jump */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-[#E6DDD1]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDay(day);
                    setIsQuickAddOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[40px] px-2.5 rounded-xl text-xs font-bold text-[#6B6259] hover:text-[#A34224] hover:bg-[#F3ECE1]/60 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#C85A38]" />
                  <span>Termin</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedDay(day);
                    setActiveTab(typeFilter === 'meals' ? 'meals' : 'schedule');
                  }}
                  title={
                    typeFilter === 'meals'
                      ? 'Essensplan für diesen Tag öffnen'
                      : 'Tagesplan für diesen Tag öffnen'
                  }
                  className="inline-flex items-center min-h-[44px] sm:min-h-[40px] px-2.5 rounded-xl text-xs font-bold text-[#A34224] hover:text-[#C85A38] hover:bg-[#C85A38]/8 transition-colors cursor-pointer"
                >
                  Details →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekOverviewView;
