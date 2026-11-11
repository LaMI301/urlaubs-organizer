import React, { useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  ThumbsUp,
  Utensils,
  Compass,
  Sun,
  Landmark,
  Car,
  Music,
  Sparkles,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import { ActivityCategory, MealType } from '../types/vacation';

const CATEGORY_META: Record<
  ActivityCategory,
  { label: string; bg: string; icon: React.ReactNode }
> = {
  beach: {
    label: 'Strand & Meer',
    bg: 'bg-[#F4DF7B]',
    icon: <Sun className="w-4 h-4 text-[#141416]" />,
  },
  activity: {
    label: 'Ausflug & Action',
    bg: 'bg-[#C5D1F5]',
    icon: <Compass className="w-4 h-4 text-[#141416]" />,
  },
  culture: {
    label: 'Kultur & Sightseeing',
    bg: 'bg-[#E8C2E8]',
    icon: <Landmark className="w-4 h-4 text-[#141416]" />,
  },
  transport: {
    label: 'Transfer & Route',
    bg: 'bg-[#A9B882]',
    icon: <Car className="w-4 h-4 text-[#141416]" />,
  },
  nightlife: {
    label: 'Abend & Nightlife',
    bg: 'bg-[#F7C59F]',
    icon: <Music className="w-4 h-4 text-[#141416]" />,
  },
  other: {
    label: 'Sonstiges',
    bg: 'bg-[#EFECE6]',
    icon: <Sparkles className="w-4 h-4 text-[#141416]" />,
  },
};

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snacks & Drinks',
};

const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

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

export const RightCalendarPanel: React.FC = () => {
  const {
    trip,
    currentUser,
    selectedDay,
    setSelectedDay,
    selectedActivityId,
    setSelectedActivityId,
    toggleActivityVote,
    toggleMealVote,
    setIsQuickAddOpen,
  } = useVacation();

  // Parse startDate and compute calendar cells
  const calendarData = useMemo(() => {
    const baseDate = trip.startDate
      ? new Date(`${trip.startDate}T00:00:00`)
      : new Date(2026, 6, 15);
    const validBase = isNaN(baseDate.getTime())
      ? new Date(2026, 6, 15)
      : baseDate;

    const year = validBase.getFullYear();
    const month = validBase.getMonth();
    const monthLabel = `${MONTH_NAMES[month]} ${year}`;

    const tripDayByDateStr = new Map<string, number>();
    const dateByTripDay = new Map<number, Date>();

    for (let d = 1; d <= trip.totalDays; d++) {
      const dt = new Date(validBase);
      dt.setDate(validBase.getDate() + (d - 1));
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(dt.getDate()).padStart(2, '0')}`;
      tripDayByDateStr.set(key, d);
      dateByTripDay.set(d, dt);
    }

    const firstDayOfWeek = (validBase.getDay() + 6) % 7;
    const gridStart = new Date(validBase);
    gridStart.setDate(validBase.getDate() - firstDayOfWeek);

    const totalCells = Math.max(
      21,
      Math.ceil((firstDayOfWeek + trip.totalDays) / 7) * 7
    );
    const cells: Array<{
      date: Date;
      dayOfMonth: number;
      tripDay: number | null;
      isCurrentMonth: boolean;
    }> = [];

    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + i);
      const key = `${cellDate.getFullYear()}-${String(
        cellDate.getMonth() + 1
      ).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
      cells.push({
        date: cellDate,
        dayOfMonth: cellDate.getDate(),
        tripDay: tripDayByDateStr.get(key) ?? null,
        isCurrentMonth: cellDate.getMonth() === month,
      });
    }

    return {
      monthLabel,
      cells,
      dateByTripDay,
    };
  }, [trip.startDate, trip.totalDays]);

  const selectedDateObj = calendarData.dateByTripDay.get(selectedDay);
  const selectedDateFormatted = selectedDateObj
    ? selectedDateObj.toLocaleDateString('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      })
    : `Tag ${selectedDay}`;

  // Combine activities and meals for selectedDay sorted chronologically
  const timelineItems = useMemo(() => {
    const dayActivities = trip.activities
      .filter((a) => a.dayNumber === selectedDay)
      .map((a) => ({
        kind: 'activity' as const,
        id: a.id,
        time: a.timeSlot || '09:00',
        title: a.title,
        subtitle: a.location,
        category: a.category,
        votes: a.votes,
      }));

    const dayMeals = trip.meals
      .filter((m) => m.dayNumber === selectedDay)
      .map((m) => ({
        kind: 'meal' as const,
        id: m.id,
        time: m.time || '12:30',
        title: m.title,
        subtitle: `${MEAL_TYPE_LABELS[m.mealType]} • ${m.locationOrRecipe}`,
        mealType: m.mealType,
        votes: m.votes,
      }));

    return [...dayActivities, ...dayMeals].sort((a, b) =>
      a.time.localeCompare(b.time)
    );
  }, [trip.activities, trip.meals, selectedDay]);

  return (
    <aside className="bg-[#EFECE6]/70 rounded-[28px] p-5 flex flex-col gap-5 border border-black/5 h-full">
      {/* Calendar Header & Month Grid */}
      <div className="bg-[#F9F6F0] rounded-[24px] p-4 shadow-xs border border-black/5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block">
              Reisezeitraum
            </span>
            <h2 className="text-base font-extrabold text-[#141416] flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-[#141416]" />
              {calendarData.monthLabel}
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
              disabled={selectedDay <= 1}
              className="w-7 h-7 rounded-full bg-[#EFECE6] hover:bg-[#E8C2E8] disabled:opacity-40 flex items-center justify-center transition-colors cursor-pointer"
              title="Vorheriger Tag"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedDay(Math.min(trip.totalDays, selectedDay + 1))
              }
              disabled={selectedDay >= trip.totalDays}
              className="w-7 h-7 rounded-full bg-[#EFECE6] hover:bg-[#E8C2E8] disabled:opacity-40 flex items-center justify-center transition-colors cursor-pointer"
              title="Nächster Tag"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-[10px] font-bold tracking-wider text-neutral-400 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarData.cells.map((cell, idx) => {
            const isTripDay = cell.tripDay !== null;
            const isSelected = cell.tripDay === selectedDay;

            return (
              <button
                key={idx}
                type="button"
                disabled={!isTripDay}
                onClick={() => {
                  if (cell.tripDay) setSelectedDay(cell.tripDay);
                }}
                className={`relative h-9 rounded-full flex items-center justify-center text-xs transition-all ${
                  isSelected
                    ? 'bg-[#E8C2E8] text-[#141416] font-extrabold shadow-xs scale-105'
                    : isTripDay
                    ? 'bg-[#EFECE6] hover:bg-[#F4DF7B]/70 text-[#141416] font-semibold cursor-pointer'
                    : cell.isCurrentMonth
                    ? 'text-neutral-400 cursor-default'
                    : 'text-neutral-300 cursor-default'
                }`}
                title={isTripDay ? `Tag ${cell.tripDay}` : undefined}
              >
                <span>{cell.dayOfMonth}</span>
              </button>
            );
          })}
        </div>

        {/* Tag 1 .. Tag N Selector */}
        <div className="mt-3.5 pt-3 border-t border-black/5 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {Array.from({ length: trip.totalDays }, (_, i) => i + 1).map(
            (dayNum) => {
              const active = dayNum === selectedDay;
              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => setSelectedDay(dayNum)}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-[#141416] text-white shadow-xs'
                      : 'bg-[#EFECE6] text-neutral-700 hover:bg-[#E8C2E8]/60'
                  }`}
                >
                  Tag {dayNum}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Single Clean "+ Vorschlag / Event" Button */}
      <button
        type="button"
        onClick={() => setIsQuickAddOpen(true)}
        className="w-full bg-[#141416] hover:bg-neutral-800 text-white rounded-full py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
      >
        <Plus className="w-4 h-4 text-[#F4DF7B]" />
        <span>+ Vorschlag / Event</span>
      </button>

      {/* Clean Uncluttered Timeline for selectedDay */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-sm font-extrabold text-[#141416]">
              Tag {selectedDay} · Ablauf
            </h3>
            <p className="text-[11px] text-neutral-500">
              {selectedDateFormatted}
            </p>
          </div>
          <span className="text-xs font-bold text-neutral-500">
            {timelineItems.length} Einträge
          </span>
        </div>

        <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
          {timelineItems.length === 0 ? (
            <div className="bg-[#F9F6F0] rounded-[22px] p-6 text-center border border-dashed border-black/10">
              <Clock className="w-5 h-5 text-neutral-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-[#141416]">
                Noch keine Einträge für Tag {selectedDay}
              </p>
            </div>
          ) : (
            timelineItems.map((item) => {
              const hasVoted = item.votes.includes(currentUser.id);
              const isSelectedCard =
                item.kind === 'activity' && selectedActivityId === item.id;
              const catMeta =
                item.kind === 'activity'
                  ? CATEGORY_META[item.category]
                  : {
                      label: MEAL_TYPE_LABELS[item.mealType],
                      bg: 'bg-[#F7C59F]',
                      icon: <Utensils className="w-4 h-4 text-[#141416]" />,
                    };

              return (
                <div
                  key={`${item.kind}-${item.id}`}
                  onClick={() => {
                    if (item.kind === 'activity') {
                      setSelectedActivityId(item.id);
                    }
                  }}
                  className={`rounded-[22px] p-3.5 transition-all border flex items-center justify-between gap-3 ${
                    isSelectedCard
                      ? 'bg-[#E8C2E8] border-[#141416]/15 shadow-xs'
                      : 'bg-[#F9F6F0] hover:bg-white border-black/5'
                  } ${item.kind === 'activity' ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-2xl ${catMeta.bg} flex items-center justify-center shrink-0`}
                    >
                      {catMeta.icon}
                    </div>

                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-neutral-500 block">
                        {item.time} Uhr
                      </span>
                      <h4 className="text-xs font-extrabold text-[#141416] truncate">
                        {item.title}
                      </h4>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.kind === 'activity') {
                        toggleActivityVote(item.id);
                      } else {
                        toggleMealVote(item.id);
                      }
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                      hasVoted
                        ? 'bg-[#141416] text-[#F4DF7B]'
                        : 'bg-[#EFECE6] hover:bg-[#F4DF7B] text-[#141416]'
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
