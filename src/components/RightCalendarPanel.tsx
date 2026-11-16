import React, { useEffect, useMemo, useRef } from 'react';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Landmark,
  Music,
  Plus,
  Sparkles,
  Sun,
  ThumbsUp,
  Utensils,
  X,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import { ActivityCategory, MealType } from '../types/vacation';
import {
  compareTimeSlots,
  detectDayConflicts,
  formatTripDayDate,
  parseLocalDate,
} from '../utils/vacationHelpers';

const CATEGORY_META: Record<
  ActivityCategory,
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  beach: {
    label: 'Strand & Meer',
    badgeClass: 'bg-[#D9822B]/14 text-[#9E5A14] border border-[#D9822B]/30',
    icon: <Sun className="w-4 h-4" />,
  },
  activity: {
    label: 'Ausflug & Action',
    badgeClass: 'bg-[#6E7F5E]/14 text-[#4B593E] border border-[#6E7F5E]/30',
    icon: <Compass className="w-4 h-4" />,
  },
  culture: {
    label: 'Kultur & Sightseeing',
    badgeClass: 'bg-[#2A7B88]/12 text-[#1F5E68] border border-[#2A7B88]/30',
    icon: <Landmark className="w-4 h-4" />,
  },
  transport: {
    label: 'Transfer & Route',
    badgeClass: 'bg-[#F3ECE1]/80 text-[#6B6259] border border-[#E6DDD1]',
    icon: <Car className="w-4 h-4" />,
  },
  nightlife: {
    label: 'Abend & Nightlife',
    badgeClass: 'bg-[#C85A38]/12 text-[#A34224] border border-[#C85A38]/30',
    icon: <Music className="w-4 h-4" />,
  },
  other: {
    label: 'Sonstiges',
    badgeClass: 'bg-[#FAF7F2] text-[#6B6259] border border-[#E6DDD1]',
    icon: <Sparkles className="w-4 h-4" />,
  },
};

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snacks & Drinks',
};

const WEEKDAYS = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mär',
  'Apr',
  'Mai',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dez',
];

interface RightCalendarPanelProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onCloseSheet?: () => void;
}

export const RightCalendarPanel: React.FC<RightCalendarPanelProps> = ({
  collapsed = false,
  onToggleCollapse,
  onCloseSheet,
}) => {
  const {
    trip,
    currentUser,
    selectedDay,
    setSelectedDay,
    activeTab,
    selectedActivityId,
    setSelectedActivityId,
    toggleActivityVote,
    toggleMealVote,
    setIsQuickAddOpen,
    setActiveTab,
    setSearchTarget,
  } = useVacation();

  const dayPillsRef = useRef<HTMLDivElement | null>(null);
  const calendarGridScrollRef = useRef<HTMLDivElement | null>(null);

  const safeTotalDays = Math.max(0, Math.round(trip.totalDays || 0));

  // Parse startDate and compute calendar cells + dynamic cross-month header
  const calendarData = useMemo(() => {
    if (safeTotalDays <= 0) {
      return {
        monthLabel: 'Kein Zeitraum',
        startMonth: -1,
        cells: [] as Array<{
          date: Date;
          dayOfMonth: number;
          monthIndex: number;
          tripDay: number | null;
          isStartMonth: boolean;
          showMonthTag: boolean;
        }>,
      };
    }

    const validBase = parseLocalDate(trip.startDate) || new Date(2026, 6, 15);
    const startYear = validBase.getFullYear();
    const startMonth = validBase.getMonth();

    const endDate = new Date(
      startYear,
      startMonth,
      validBase.getDate() + (safeTotalDays - 1)
    );
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();

    let monthLabel = `${MONTH_NAMES[startMonth]} ${startYear}`;
    if (startYear !== endYear) {
      monthLabel = `${MONTH_NAMES[startMonth]} ${startYear} – ${MONTH_NAMES[endMonth]} ${endYear}`;
    } else if (startMonth !== endMonth) {
      monthLabel = `${MONTH_NAMES[startMonth]} – ${MONTH_NAMES[endMonth]} ${startYear}`;
    }

    const tripDayByDateStr = new Map<string, number>();

    for (let d = 1; d <= safeTotalDays; d++) {
      const dt = new Date(startYear, startMonth, validBase.getDate() + (d - 1));
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(dt.getDate()).padStart(2, '0')}`;
      tripDayByDateStr.set(key, d);
    }

    const firstDayOfWeek = (validBase.getDay() + 6) % 7;
    const gridStart = new Date(
      startYear,
      startMonth,
      validBase.getDate() - firstDayOfWeek
    );

    const totalCells = Math.max(
      21,
      Math.ceil((firstDayOfWeek + safeTotalDays) / 7) * 7
    );

    const cells: Array<{
      date: Date;
      dayOfMonth: number;
      monthIndex: number;
      tripDay: number | null;
      isStartMonth: boolean;
      showMonthTag: boolean;
    }> = [];

    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + i
      );
      const key = `${cellDate.getFullYear()}-${String(
        cellDate.getMonth() + 1
      ).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
      const mIdx = cellDate.getMonth();
      const dOfM = cellDate.getDate();
      const isStartMonth = mIdx === startMonth && cellDate.getFullYear() === startYear;
      const showMonthTag = dOfM === 1 && !isStartMonth;

      cells.push({
        date: cellDate,
        dayOfMonth: dOfM,
        monthIndex: mIdx,
        tripDay: tripDayByDateStr.get(key) ?? null,
        isStartMonth,
        showMonthTag,
      });
    }

    return {
      monthLabel,
      startMonth,
      cells,
    };
  }, [trip.startDate, safeTotalDays]);

  // Precompute per-day status dots (confirmed / planned / idea / meal)
  const dayStatusMap = useMemo(() => {
    const map = new Map<
      number,
      {
        hasConfirmed: boolean;
        hasPlanned: boolean;
        hasIdea: boolean;
        hasMeal: boolean;
      }
    >();

    trip.activities.forEach((act) => {
      const curr = map.get(act.dayNumber) || {
        hasConfirmed: false,
        hasPlanned: false,
        hasIdea: false,
        hasMeal: false,
      };
      if (act.status === 'confirmed') curr.hasConfirmed = true;
      else if (act.status === 'planned') curr.hasPlanned = true;
      else curr.hasIdea = true;
      map.set(act.dayNumber, curr);
    });

    trip.meals.forEach((meal) => {
      const curr = map.get(meal.dayNumber) || {
        hasConfirmed: false,
        hasPlanned: false,
        hasIdea: false,
        hasMeal: false,
      };
      curr.hasMeal = true;
      map.set(meal.dayNumber, curr);
    });

    return map;
  }, [trip.activities, trip.meals]);

  const selectedDateFormatted =
    safeTotalDays > 0
      ? formatTripDayDate(trip.startDate, selectedDay)
      : 'Kein Tag gewählt';

  // Auto-scroll active Tag 1..N pill into view horizontally
  useEffect(() => {
    if (collapsed) return;
    const container = dayPillsRef.current;
    if (!container) return;
    const activePill = container.querySelector<HTMLButtonElement>(
      `[data-pill-day="${selectedDay}"]`
    );
    if (!activePill) return;
    const targetLeft =
      activePill.offsetLeft - container.clientWidth / 2 + activePill.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [selectedDay, safeTotalDays, collapsed]);

  // Auto-scroll grid vertically when trip > 31 days
  useEffect(() => {
    if (collapsed || safeTotalDays <= 31) return;
    const gridEl = calendarGridScrollRef.current;
    if (!gridEl) return;
    const activeCell = gridEl.querySelector<HTMLButtonElement>(
      `[data-grid-day="${selectedDay}"]`
    );
    if (!activeCell) return;
    const targetTop =
      activeCell.offsetTop - gridEl.clientHeight / 2 + activeCell.clientHeight / 2;
    gridEl.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  }, [selectedDay, safeTotalDays, collapsed]);

  // Combine activities and meals for selectedDay sorted chronologically
  const timelineItems = useMemo(() => {
    const dayActivities = trip.activities
      .filter((a) => a.dayNumber === selectedDay)
      .map((a) => ({
        kind: 'activity' as const,
        id: a.id,
        time: a.timeSlot || '09:00',
        title: a.title,
        subtitle: a.location || trip.destination,
        category: a.category,
        status: a.status,
        votes: a.votes,
      }));

    const dayMeals = trip.meals
      .filter((m) => m.dayNumber === selectedDay)
      .map((m) => ({
        kind: 'meal' as const,
        id: m.id,
        time: m.time || '12:30',
        title: m.title,
        subtitle: m.locationOrRecipe
          ? `${MEAL_TYPE_LABELS[m.mealType]} • ${m.locationOrRecipe}`
          : MEAL_TYPE_LABELS[m.mealType],
        mealType: m.mealType,
        votes: m.votes,
      }));

    return [...dayActivities, ...dayMeals].sort((a, b) =>
      compareTimeSlots(a.time, b.time)
    );
  }, [trip.activities, trip.meals, selectedDay, trip.destination]);

  const dayConflicts = useMemo(
    () => detectDayConflicts(trip.activities, trip.meals, selectedDay),
    [trip.activities, trip.meals, selectedDay]
  );

  if (collapsed && !onCloseSheet) {
    return (
      <aside className="surface-glass rounded-[26px] p-2.5 flex flex-row lg:flex-col items-center justify-between gap-2 w-full max-w-full min-w-0 lg:h-full select-none overflow-hidden">
        <div className="flex flex-row lg:flex-col items-center gap-2 lg:gap-3 lg:pt-1">
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Kalender ausklappen"
              aria-label="Kalender ausklappen"
              className="w-8 h-8 rounded-full bg-[#FAF7F2] hover:bg-[#C85A38]/12 text-[#6B6259] hover:text-[#A34224] border border-[#E6DDD1] flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('week')}
            title="Wochenübersicht öffnen"
            aria-label="Wochenübersicht öffnen"
            className="w-9 h-9 rounded-2xl bg-[#2A7B88]/12 hover:bg-[#2A7B88]/20 text-[#1F5E68] border border-[#2A7B88]/30 flex items-center justify-center transition-all cursor-pointer"
          >
            <CalendarDays className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          title={`Tag ${selectedDay} — Kalender öffnen`}
          className="px-2.5 py-1.5 lg:py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E6DDD1] text-[11px] font-extrabold text-[#A34224] font-mono tabular-nums cursor-pointer hover:border-[#C85A38]/40 transition-colors"
        >
          T{selectedDay}
        </button>

        <button
          type="button"
          onClick={() => setIsQuickAddOpen(true)}
          title="Neuer Termin"
          aria-label="Neuer Termin"
          className="w-9 h-9 rounded-full bg-[#C85A38] hover:bg-[#B54B2B] text-white flex items-center justify-center transition-all cursor-pointer shadow-sm lg:mb-1"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className={
        onCloseSheet
          ? 'p-3.5 sm:p-5 flex flex-col gap-3.5 sm:gap-4 w-full max-w-full min-w-0 flex-1 overflow-y-auto'
          : 'surface-glass rounded-[28px] p-3.5 sm:p-4 lg:p-5 flex flex-col gap-4 w-full max-w-full min-w-0 lg:h-full overflow-hidden'
      }
    >
      {/* Calendar Header & Month Grid */}
      <div className="surface-glass-elevated rounded-[24px] p-3.5 sm:p-4 w-full min-w-0 overflow-hidden shrink-0">
        <div className="flex items-start justify-between mb-3 gap-2 min-w-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('week');
              onCloseSheet?.();
            }}
            title="Zur Wochen- & Mehrtagesübersicht"
            className="text-left group cursor-pointer rounded-xl px-1.5 py-1 -ml-1.5 hover:bg-[#FAF7F2] transition-colors min-w-0 flex-1"
          >
            <span className="text-[10px] uppercase tracking-wider text-[#6B6259] font-bold flex items-center gap-1.5 flex-wrap">
              <span>Reisezeitraum</span>
              <span className="text-[10px] font-bold text-[#1F5E68] bg-[#2A7B88]/12 border border-[#2A7B88]/30 px-1.5 py-0.5 rounded-full">
                Wochenplan
              </span>
            </span>
            <h2 className="text-sm sm:text-base font-extrabold text-[#1F1B18] flex items-center gap-1.5 group-hover:text-[#A34224] transition-colors mt-1 truncate">
              <CalendarIcon className="w-4 h-4 text-[#C85A38] shrink-0" />
              <span className="truncate">{calendarData.monthLabel}</span>
            </h2>
          </button>

          <div className="flex items-center gap-1 shrink-0 pt-0.5">
            <button
              type="button"
              onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
              disabled={safeTotalDays <= 0 || selectedDay <= 1}
              aria-label="Vorheriger Tag"
              className="w-10 h-10 lg:w-7 lg:h-7 rounded-full bg-[#FAF7F2] hover:bg-[#C85A38]/12 border border-[#E6DDD1] disabled:opacity-35 text-[#1F1B18] flex items-center justify-center transition-colors cursor-pointer"
              title="Vorheriger Tag"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedDay(Math.min(Math.max(1, safeTotalDays), selectedDay + 1))
              }
              disabled={safeTotalDays <= 0 || selectedDay >= safeTotalDays}
              aria-label="Nächster Tag"
              className="w-10 h-10 lg:w-7 lg:h-7 rounded-full bg-[#FAF7F2] hover:bg-[#C85A38]/12 border border-[#E6DDD1] disabled:opacity-35 text-[#1F1B18] flex items-center justify-center transition-colors cursor-pointer"
              title="Nächster Tag"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {onCloseSheet ? (
              <button
                type="button"
                onClick={onCloseSheet}
                title="Kalender schließen"
                aria-label="Kalender schließen"
                className="w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-[#F3ECE1] hover:bg-[#E6DDD1] border border-[#DDD2C3] text-[#1F1B18] flex items-center justify-center transition-colors cursor-pointer ml-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  title="Kalender einklappen"
                  aria-label="Kalender einklappen"
                  className="hidden lg:flex w-7 h-7 rounded-full bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#E6DDD1] text-[#6B6259] hover:text-[#1F1B18] items-center justify-center transition-colors cursor-pointer ml-0.5"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )
            )}
          </div>
        </div>

        {safeTotalDays <= 0 ? (
          <div className="rounded-2xl bg-[#FAF7F2] border border-dashed border-[#E6DDD1] p-5 text-center">
            <p className="text-xs font-semibold text-[#6B6259]">
              Noch keine Reisetage festgelegt.
            </p>
          </div>
        ) : (
          <>
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-[10px] font-bold tracking-wider text-[#8C8277] py-1 font-mono"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid (scroll-bounded when > 31 days) */}
            <div
              ref={calendarGridScrollRef}
              className={`grid grid-cols-7 gap-1 text-center ${
                safeTotalDays > 31 ? 'max-h-[252px] overflow-y-auto pr-0.5' : ''
              }`}
            >
              {calendarData.cells.map((cell, idx) => {
                const isTripDay = cell.tripDay !== null;
                const isSelected = cell.tripDay === selectedDay;
                const statusInfo =
                  cell.tripDay !== null ? dayStatusMap.get(cell.tripDay) : undefined;

                    return (
                      <button
                        key={idx}
                        type="button"
                        data-grid-day={cell.tripDay ?? undefined}
                        disabled={!isTripDay}
                        onClick={() => {
                          if (cell.tripDay) setSelectedDay(cell.tripDay);
                        }}
                        aria-label={
                          isTripDay
                            ? `Tag ${cell.tripDay} (${cell.dayOfMonth}. ${
                                MONTH_SHORT[cell.monthIndex]
                              })`
                            : undefined
                        }
                        className={`relative min-h-[42px] sm:min-h-[44px] py-1 rounded-xl flex flex-col items-center justify-center text-xs transition-all font-mono tabular-nums min-w-0 overflow-hidden ${
                          isSelected
                            ? 'bg-[#C85A38] text-white font-black shadow-sm'
                            : isTripDay
                            ? `bg-[#FAF7F2] hover:bg-[#C85A38]/12 text-[#1F1B18] hover:text-[#A34224] border border-[#E6DDD1] font-bold cursor-pointer ${
                                cell.showMonthTag ? 'ring-1 ring-inset ring-[#2A7B88]/30' : ''
                              }`
                            : cell.isStartMonth
                            ? 'text-[#8C8277]/70 cursor-default'
                            : 'text-[#8C8277]/45 cursor-default'
                        }`}
                        title={
                          isTripDay
                            ? `Tag ${cell.tripDay} (${cell.dayOfMonth}. ${
                                MONTH_SHORT[cell.monthIndex]
                              })`
                            : undefined
                        }
                      >
                        <span className="leading-none">{cell.dayOfMonth}</span>

                        {/* Colored status dots for days with scheduled items */}
                        <span className="flex items-center justify-center gap-0.5 mt-1 h-1.5">
                          {isTripDay && statusInfo && (
                            <>
                              {statusInfo.hasConfirmed && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSelected ? 'bg-white' : 'bg-[#6E7F5E]'
                                  }`}
                                />
                              )}
                              {(statusInfo.hasPlanned || statusInfo.hasIdea) && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSelected ? 'bg-white/85' : 'bg-[#2A7B88]'
                                  }`}
                                />
                              )}
                              {statusInfo.hasMeal && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSelected ? 'bg-white/70' : 'bg-[#D9822B]'
                                  }`}
                                />
                              )}
                            </>
                          )}
                        </span>
                      </button>
                    );
              })}
            </div>

            {/* Tag 1 .. Tag N Scrollable Snap Pill Selector with auto-scroll */}
            <div
              ref={dayPillsRef}
              className="mt-3 pt-3 border-t border-[#E6DDD1] flex items-center gap-1.5 overflow-x-auto snap-x snap-mandatory scroll-pl-1 pb-1 no-scrollbar w-full max-w-full min-w-0"
            >
              {Array.from({ length: safeTotalDays }, (_, i) => i + 1).map(
                (dayNum) => {
                  const active = dayNum === selectedDay;
                  return (
                    <button
                      key={dayNum}
                      type="button"
                      data-pill-day={dayNum}
                      onClick={() => setSelectedDay(dayNum)}
                      className={`snap-start min-h-[40px] lg:min-h-[30px] px-3.5 lg:px-3 py-1.5 lg:py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 font-mono tabular-nums ${
                        active
                          ? 'bg-[#C85A38] text-white shadow-sm'
                          : 'bg-[#FAF7F2] text-[#6B6259] hover:bg-[#F3ECE1] border border-[#E6DDD1]'
                      }`}
                    >
                      Tag {dayNum}
                    </button>
                  );
                }
              )}
            </div>
          </>
        )}
      </div>

      {/* Quick Add Button */}
      <button
        type="button"
        onClick={() => {
          onCloseSheet?.();
          setIsQuickAddOpen(true);
        }}
        className="w-full min-h-[44px] bg-[#C85A38] hover:bg-[#B54B2B] text-white rounded-full py-2.5 px-4 text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
        <span>+ Vorschlag / Event</span>
      </button>

      {/* Clean Timeline for selectedDay */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="flex items-center justify-between mb-2.5 px-1 gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-[#1F1B18] truncate">
              Tag {selectedDay} · Ablauf
            </h3>
            <p className="text-[11px] text-[#6B6259] truncate">
              {selectedDateFormatted}
            </p>
          </div>
          <span className="text-xs font-bold text-[#A34224] font-mono tabular-nums shrink-0">
            {timelineItems.length}{' '}
            {timelineItems.length === 1 ? 'Eintrag' : 'Einträge'}
          </span>
        </div>

        <div className={onCloseSheet ? 'space-y-2 pb-16 sm:pb-2' : 'space-y-2 overflow-y-auto pr-0.5 flex-1 min-w-0 pb-14'}>
          {timelineItems.length === 0 ? (
            <div className="bg-[#FAF7F2] rounded-[20px] p-6 text-center border border-dashed border-[#E6DDD1]">
              <Clock className="w-5 h-5 text-[#8C8277] mx-auto mb-2" />
              <p className="text-xs font-semibold text-[#6B6259]">
                Noch keine Einträge für Tag {selectedDay}
              </p>
            </div>
          ) : (
            timelineItems.map((item) => {
              const hasVoted = item.votes.includes(currentUser.id);
              const isSelectedCard =
                item.kind === 'activity' && selectedActivityId === item.id;
              const hasConflict = (dayConflicts[item.id] || []).length > 0;
              const catMeta =
                item.kind === 'activity'
                  ? CATEGORY_META[item.category] || CATEGORY_META.other
                  : {
                      label: MEAL_TYPE_LABELS[item.mealType],
                      badgeClass:
                        'bg-[#D9822B]/14 text-[#9E5A14] border border-[#D9822B]/30',
                      icon: <Utensils className="w-4 h-4" />,
                    };

              return (
                <div
                  key={`${item.kind}-${item.id}`}
                  className={`rounded-[20px] p-3 transition-all border flex items-center justify-between gap-2.5 min-w-0 ${
                    isSelectedCard
                      ? 'surface-glass-elevated border-[#C85A38]/55 shadow-md'
                      : 'bg-[#FAF7F2] hover:bg-white border-[#E6DDD1]'
                  }`}
                >
                  {/* Accessible main selection/navigation button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (item.kind === 'activity') {
                        setSelectedActivityId(item.id);
                        if (activeTab !== 'dashboard' && activeTab !== 'schedule') {
                          setActiveTab('schedule');
                        }
                        if (activeTab !== 'dashboard') {
                          setSearchTarget({
                            tab: 'schedule',
                            kind: 'activity',
                            id: item.id,
                            dayNumber: selectedDay,
                          });
                        }
                      } else {
                        setActiveTab('meals');
                        setSearchTarget({
                          tab: 'meals',
                          kind: 'meal',
                          id: item.id,
                          dayNumber: selectedDay,
                        });
                      }
                      onCloseSheet?.();
                    }}
                    className="flex-1 flex items-center gap-2.5 min-w-0 min-h-[44px] text-left cursor-pointer rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A38]"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl ${catMeta.badgeClass} flex items-center justify-center shrink-0`}
                    >
                      {catMeta.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-[#A34224] font-mono tabular-nums">
                          {item.time} Uhr
                        </span>
                        {hasConflict && (
                          <AlertTriangle
                            className="w-3 h-3 text-[#D9822B] shrink-0"
                            aria-label="Zeitkonflikt"
                          />
                        )}
                      </div>
                      <h4 className="text-xs font-extrabold text-[#1F1B18] truncate">
                        {item.title}
                      </h4>
                      {item.subtitle && (
                        <p className="text-[11px] text-[#6B6259] truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Sibling Vote Button */}
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
                    className={`inline-flex items-center justify-center gap-1 min-h-[40px] lg:min-h-0 px-3 lg:px-2.5 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition-all cursor-pointer font-mono tabular-nums border ${
                      hasVoted
                        ? 'bg-[#C85A38]/12 text-[#A34224] border-[#C85A38]/35'
                        : 'bg-white/90 hover:bg-[#F3ECE1] text-[#6B6259] border-[#E6DDD1]'
                    }`}
                  >
                    <ThumbsUp className="w-3 h-3" />
                    <span>{item.votes.length}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};

export default RightCalendarPanel;
