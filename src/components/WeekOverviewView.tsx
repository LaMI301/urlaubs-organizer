import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Utensils,
  Sun,
  Landmark,
  Car,
  Music,
  Sparkles,
  ThumbsUp,
  Plus,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import { ActivityCategory, MealType } from '../types/vacation';

const CATEGORY_META: Record<
  ActivityCategory,
  { bg: string; icon: React.ReactNode }
> = {
  beach: { bg: 'bg-[#F4DF7B]', icon: <Sun className="w-3.5 h-3.5 text-[#141416]" /> },
  activity: { bg: 'bg-[#C5D1F5]', icon: <Compass className="w-3.5 h-3.5 text-[#141416]" /> },
  culture: { bg: 'bg-[#E8C2E8]', icon: <Landmark className="w-3.5 h-3.5 text-[#141416]" /> },
  transport: { bg: 'bg-[#A9B882]', icon: <Car className="w-3.5 h-3.5 text-[#141416]" /> },
  nightlife: { bg: 'bg-[#F7C59F]', icon: <Music className="w-3.5 h-3.5 text-[#141416]" /> },
  other: { bg: 'bg-[#EFECE6]', icon: <Sparkles className="w-3.5 h-3.5 text-[#141416]" /> },
};

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittag',
  dinner: 'Abendessen',
  snack: 'Snack',
};

function getDayDateStr(startDateStr: string, dayNumber: number): string {
  const base = new Date(`${startDateStr || '2026-07-15'}T12:00:00`);
  if (Number.isNaN(base.getTime())) return `Tag ${dayNumber}`;
  const d = new Date(base);
  d.setDate(d.getDate() + (dayNumber - 1));
  return d.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

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
    toggleMealVote,
  } = useVacation();

  const [spanMode, setSpanMode] = useState<'3' | '7' | 'all'>('7');
  const [typeFilter, setTypeFilter] = useState<'all' | 'activities' | 'meals'>('all');
  const [pageOffset, setPageOffset] = useState(0);

  const visibleDays = useMemo(() => {
    const allDays = Array.from({ length: trip.totalDays }, (_, i) => i + 1);
    if (spanMode === 'all') return allDays;
    const size = spanMode === '3' ? 3 : 7;
    const startIdx = Math.min(pageOffset * size, Math.max(0, allDays.length - size));
    return allDays.slice(startIdx, startIdx + size);
  }, [trip.totalDays, spanMode, pageOffset]);

  const maxPages =
    spanMode === 'all'
      ? 1
      : Math.ceil(trip.totalDays / (spanMode === '3' ? 3 : 7));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-xl rounded-[28px] p-5 border border-white/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#C5D1F5]/70 text-[#141416] mb-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Wochen- & Mehrtages-Kalender</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#141416] tracking-tight">
            Alle Termine im Überblick
          </h1>
          <p className="text-xs font-medium text-[#141416]/60 mt-0.5">
            {trip.destination} • {trip.totalDays} Reisetage nebeneinander
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Span Selector */}
          <div className="inline-flex items-center bg-[#EFECE6] p-1 rounded-full border border-black/5">
            {[
              { id: '3', label: '3 Tage' },
              { id: '7', label: 'Woche (7T)' },
              { id: 'all', label: 'Alle Tage' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setSpanMode(opt.id as '3' | '7' | 'all');
                  setPageOffset(0);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  spanMode === opt.id
                    ? 'bg-[#141416] text-white shadow-xs'
                    : 'text-[#141416]/70 hover:text-[#141416]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="inline-flex items-center bg-[#EFECE6] p-1 rounded-full border border-black/5">
            {[
              { id: 'all', label: 'Alles' },
              { id: 'activities', label: 'Aktivitäten' },
              { id: 'meals', label: 'Essen' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() =>
                  setTypeFilter(opt.id as 'all' | 'activities' | 'meals')
                }
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  typeFilter === opt.id
                    ? 'bg-white text-[#141416] shadow-xs'
                    : 'text-[#141416]/65 hover:text-[#141416]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Pagination if needed */}
          {maxPages > 1 && (
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={() => setPageOffset((p) => Math.max(0, p - 1))}
                disabled={pageOffset === 0}
                className="w-8 h-8 rounded-full bg-white border border-black/10 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                title="Vorherige Tage"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPageOffset((p) => Math.min(maxPages - 1, p + 1))}
                disabled={pageOffset >= maxPages - 1}
                className="w-8 h-8 rounded-full bg-white border border-black/10 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                title="Nächste Tage"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Multi-Day Columns Grid */}
      <div
        className={`grid gap-4 ${
          spanMode === '3'
            ? 'grid-cols-1 md:grid-cols-3'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}
      >
        {visibleDays.map((day) => {
          const isSelectedDay = day === selectedDay;
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
                  }));

          const items = [...acts, ...meals].sort((a, b) =>
            a.time.localeCompare(b.time)
          );

          return (
            <div
              key={day}
              className={`rounded-[26px] p-4 flex flex-col justify-between gap-3 transition-all border backdrop-blur-xl ${
                isSelectedDay
                  ? 'bg-gradient-to-b from-[#E8C2E8]/45 to-white/80 border-[#141416]/25 shadow-md'
                  : 'bg-white/65 border-white/80 shadow-xs hover:bg-white/80'
              }`}
            >
              <div>
                {/* Day Column Header */}
                <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-black/5">
                  <button
                    onClick={() => setSelectedDay(day)}
                    className="text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                          isSelectedDay
                            ? 'bg-[#141416] text-[#F4DF7B]'
                            : 'bg-[#F4DF7B] text-[#141416]'
                        }`}
                      >
                        Tag {day}
                      </span>
                      <span className="text-xs font-bold text-[#141416]/75 group-hover:text-[#141416]">
                        {getDayDateStr(trip.startDate, day)}
                      </span>
                    </div>
                  </button>

                  <span className="text-[11px] font-bold text-[#141416]/50">
                    {items.length} {items.length === 1 ? 'Termin' : 'Termine'}
                  </span>
                </div>

                {/* Day Appointments List */}
                <div className="space-y-2.5">
                  {items.length === 0 ? (
                    <div className="rounded-2xl p-4 text-center border border-dashed border-black/10 bg-white/40">
                      <Clock className="w-4 h-4 text-[#141416]/35 mx-auto mb-1" />
                      <p className="text-[11px] font-semibold text-[#141416]/50">
                        Noch frei
                      </p>
                    </div>
                  ) : (
                    items.map((item) => {
                      const hasVoted = item.votes.includes(currentUser.id);
                      const meta =
                        item.kind === 'activity'
                          ? CATEGORY_META[item.category] || CATEGORY_META.other
                          : {
                              bg: 'bg-[#F7C59F]',
                              icon: <Utensils className="w-3.5 h-3.5 text-[#141416]" />,
                            };

                      return (
                        <div
                          key={`${item.kind}-${item.id}`}
                          onClick={() => {
                            setSelectedDay(day);
                            if (item.kind === 'activity') {
                              setSelectedActivityId(item.id);
                            }
                          }}
                          className="rounded-2xl p-3 bg-white/85 hover:bg-white border border-black/5 shadow-2xs transition-all cursor-pointer space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-6 h-6 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}
                              >
                                {meta.icon}
                              </span>
                              <span className="text-[11px] font-extrabold text-[#141416]">
                                {item.time}
                                {item.kind === 'activity' && item.endTime
                                  ? `–${item.endTime}`
                                  : ''}{' '}
                                Uhr
                              </span>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                item.kind === 'meal'
                                  ? 'bg-[#F7C59F]/50 text-[#141416]'
                                  : item.status === 'confirmed'
                                  ? 'bg-[#A9B882]/40 text-[#141416]'
                                  : 'bg-[#EFECE6] text-[#141416]/70'
                              }`}
                            >
                              {item.kind === 'meal'
                                ? MEAL_LABELS[item.mealType]
                                : item.status === 'confirmed'
                                ? 'Fix'
                                : 'Idee'}
                            </span>
                          </div>

                          <h4 className="text-xs font-extrabold text-[#141416] leading-snug line-clamp-2">
                            {item.title}
                          </h4>

                          {item.location && (
                            <div className="flex items-center justify-between gap-1 text-[10px] text-[#141416]/60">
                              <span className="inline-flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{item.location}</span>
                              </span>
                              {(item.kind === 'activity' ||
                                item.style === 'restaurant' ||
                                item.style === 'bakery') && (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                    item.location
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#141416]/70 hover:text-[#141416] shrink-0"
                                  title="In Google Maps öffnen"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] font-bold text-[#141416]/55">
                              {item.cost > 0 ? `~${item.cost} €` : 'Kostenlos'}
                            </span>

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
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                                hasVoted
                                  ? 'bg-[#141416] text-[#F4DF7B]'
                                  : 'bg-[#EFECE6] hover:bg-[#E8C2E8] text-[#141416]'
                              }`}
                            >
                              <ThumbsUp className="w-2.5 h-2.5" />
                              <span>{item.votes.length}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Footer: Quick Add + Jump to Day */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-black/5">
                <button
                  onClick={() => {
                    setSelectedDay(day);
                    setIsQuickAddOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#141416]/70 hover:text-[#141416] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Termin</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedDay(day);
                    setActiveTab('schedule');
                  }}
                  className="text-[11px] font-bold text-[#141416]/60 hover:text-[#141416] cursor-pointer"
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
