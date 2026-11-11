import React, { useMemo } from 'react';
import {
  ThumbsUp,
  MapPin,
  Clock,
  Sparkles,
  Compass,
  Palmtree,
  Landmark,
  Car,
  Music,
  CheckCircle2,
  Plus,
  Euro,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import { ActivityCategory, DayActivity } from '../types/vacation';

const CATEGORY_META: Record<
  ActivityCategory,
  { label: string; icon: React.FC<{ className?: string }>; bg: string }
> = {
  beach: { label: 'Strand & Meer', icon: Palmtree, bg: 'bg-[#F4DF7B]' },
  activity: { label: 'Ausflug & Action', icon: Compass, bg: 'bg-[#A9B882]' },
  culture: { label: 'Kultur & Sightseeing', icon: Landmark, bg: 'bg-[#C5D1F5]' },
  transport: { label: 'Anreise & Roadtrip', icon: Car, bg: 'bg-[#EFECE6]' },
  nightlife: { label: 'Abend & Sunset', icon: Music, bg: 'bg-[#E8C2E8]' },
  other: { label: 'Sonstiges', icon: Sparkles, bg: 'bg-white' },
};

const STATUS_LABELS: Record<
  DayActivity['status'],
  { label: string; badgeClass: string }
> = {
  confirmed: {
    label: 'Bestätigt',
    badgeClass: 'bg-[#141416] text-[#F4DF7B]',
  },
  planned: {
    label: 'Geplant',
    badgeClass: 'bg-[#141416]/15 text-[#141416]',
  },
  idea: {
    label: 'Idee',
    badgeClass: 'bg-white/80 text-[#141416]',
  },
};

export const DashboardView: React.FC = () => {
  const {
    trip,
    currentUser,
    selectedDay,
    setSelectedDay,
    selectedActivityId,
    setSelectedActivityId,
    setActiveTab,
    setIsQuickAddOpen,
    toggleActivityVote,
    updateActivityStatus,
  } = useVacation();

  const getTraveler = (id: string) =>
    trip.travelers.find((t) => t.id === id) || trip.travelers[0];

  // Calculate per-day stats for Yellow Card bar chart & Lilac Card wave chart
  const dayStats = useMemo(() => {
    return Array.from({ length: trip.totalDays }, (_, idx) => {
      const day = idx + 1;
      const acts = trip.activities.filter((a) => a.dayNumber === day);
      const meals = trip.meals.filter((m) => m.dayNumber === day);
      const actCost = acts.reduce((sum, a) => sum + a.estimatedCost, 0);
      const mealCost = meals.reduce(
        (sum, m) => sum + m.estimatedCostPerPerson,
        0
      );
      return {
        day,
        activitiesCount: acts.length,
        mealsCount: meals.length,
        totalCost: actCost + mealCost,
      };
    });
  }, [trip.totalDays, trip.activities, trip.meals]);

  const maxActivitiesPerDay = Math.max(
    ...dayStats.map((d) => d.activitiesCount),
    3
  );

  // Total budget stats
  const totalEstimatedPerPerson = useMemo(() => {
    return dayStats.reduce((sum, d) => sum + d.totalCost, 0);
  }, [dayStats]);

  // Tasks stats for Sage Green Card
  const completedTasksCount = trip.tasks.filter((t) => t.completed).length;
  const openTasksCount = trip.tasks.filter((t) => !t.completed).length;

  // Polls stats for Periwinkle Blue Card
  const openPollsCount = trip.polls.filter((p) => !p.isClosed).length;
  const totalPollVotes = trip.polls.reduce(
    (sum, p) => sum + p.options.reduce((s, o) => s + o.votes.length, 0),
    0
  );

  // Proposals for the selected day
  const dayActivities = useMemo(() => {
    return trip.activities
      .filter((a) => a.dayNumber === selectedDay)
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }, [trip.activities, selectedDay]);

  // Currently inspected activity for bottom-right detail card
  const activeActivity = useMemo(() => {
    if (selectedActivityId) {
      const found = trip.activities.find((a) => a.id === selectedActivityId);
      if (found && found.dayNumber === selectedDay) return found;
    }
    return dayActivities[0] || trip.activities[0] || null;
  }, [selectedActivityId, trip.activities, dayActivities, selectedDay]);

  // Build SVG wave path for Lilac Card
  const wavePoints = useMemo(() => {
    const stats = dayStats.slice(0, 8);
    if (stats.length === 0)
      return {
        path: '',
        area: '',
        highlight: { x: 100, y: 40, cost: 0, day: 1 },
      };
    const maxCost = Math.max(...stats.map((s) => s.totalCost), 60);
    const width = 220;
    const height = 64;
    const pts = stats.map((s, i) => {
      const x =
        stats.length === 1
          ? width / 2
          : (i / (stats.length - 1)) * (width - 24) + 12;
      const y = height - 10 - (s.totalCost / maxCost) * (height - 24);
      return { x, y, cost: s.totalCost, day: s.day };
    });

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const ctrlX = (curr.x + next.x) / 2;
      d += ` C ${ctrlX} ${curr.y}, ${ctrlX} ${next.y}, ${next.x} ${next.y}`;
    }

    const area = `${d} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`;
    const selectedPt =
      pts.find((p) => p.day === selectedDay) || pts[Math.floor(pts.length / 2)];
    return { path: d, area, highlight: selectedPt };
  }, [dayStats, selectedDay]);

  return (
    <div className="space-y-6">
      {/* Clean Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#141416]">
            Hallo, {currentUser.name} 👋
          </h1>
          <p className="text-sm font-medium text-[#141416]/60 mt-1">
            Tag {selectedDay} von {trip.totalDays} • {trip.destination}
          </p>
        </div>

        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="inline-flex items-center gap-2 bg-[#141416] text-white text-xs font-bold px-5 py-3 rounded-full hover:bg-[#141416]/90 active:scale-95 transition-all shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#F4DF7B]" />
          <span>Neuer Vorschlag</span>
        </button>
      </div>

      {/* 4 Simplified Pastel Bento Cards with Generous Breathing Room */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Sunny Yellow (#F4DF7B) */}
        <div
          onClick={() => setActiveTab('schedule')}
          className="bg-[#F4DF7B] rounded-[28px] p-6 flex items-center justify-between gap-4 min-h-[175px] shadow-xs cursor-pointer hover:brightness-[1.01] transition-all"
        >
          <div className="space-y-2">
            <h2 className="text-base font-extrabold text-[#141416]">
              Tagesprogramm
            </h2>
            <div className="text-4xl font-black tracking-tight text-[#141416] leading-none pt-1">
              {trip.activities.length}
            </div>
            <p className="text-xs font-semibold text-[#141416]/70">
              Aktivitäten an {trip.totalDays} Tagen
            </p>
          </div>

          {/* Clean Bar Chart */}
          <div
            className="flex items-end gap-1.5 h-24 pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            {dayStats.slice(0, 7).map((d) => {
              const isSelected = d.day === selectedDay;
              const heightPct = Math.max(
                28,
                Math.round((d.activitiesCount / maxActivitiesPerDay) * 100)
              );
              return (
                <button
                  key={d.day}
                  onClick={() => setSelectedDay(d.day)}
                  title={`Tag ${d.day}`}
                  className="flex flex-col items-center justify-end h-full w-6 cursor-pointer"
                >
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-full transition-all ${
                      isSelected
                        ? 'bg-[#141416]'
                        : 'bg-[#141416]/20 hover:bg-[#141416]/35'
                    }`}
                  />
                  <span
                    className={`text-[10px] mt-1.5 font-bold ${
                      isSelected ? 'text-[#141416]' : 'text-[#141416]/55'
                    }`}
                  >
                    T{d.day}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card 2: Soft Lilac (#E8C2E8) */}
        <div
          onClick={() => setActiveTab('budget')}
          className="bg-[#E8C2E8] rounded-[28px] p-6 flex items-center justify-between gap-4 min-h-[175px] shadow-xs cursor-pointer hover:brightness-[1.01] transition-all"
        >
          <div className="space-y-2">
            <h2 className="text-base font-extrabold text-[#141416]">
              Essen & Budget
            </h2>
            <div className="text-4xl font-black tracking-tight text-[#141416] leading-none pt-1">
              {totalEstimatedPerPerson} €
            </div>
            <p className="text-xs font-semibold text-[#141416]/70">
              Geschätzt p.P. · {trip.meals.length} Mahlzeiten
            </p>
          </div>

          {/* Clean Wave Line */}
          <div className="w-36 sm:w-44 shrink-0">
            <svg viewBox="0 0 220 64" className="w-full h-16 overflow-visible">
              <defs>
                <linearGradient id="lilacWave" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#141416" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#141416" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {wavePoints.area && (
                <path d={wavePoints.area} fill="url(#lilacWave)" />
              )}
              {wavePoints.path && (
                <path
                  d={wavePoints.path}
                  fill="none"
                  stroke="#141416"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}
              <circle
                cx={wavePoints.highlight.x}
                cy={wavePoints.highlight.y}
                r="5"
                fill="#F4DF7B"
                stroke="#141416"
                strokeWidth="2.5"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Sage Green (#A9B882) */}
        <div
          onClick={() => setActiveTab('tasks')}
          className="bg-[#A9B882] rounded-[28px] p-6 flex items-center justify-between gap-4 min-h-[160px] shadow-xs cursor-pointer hover:brightness-[1.01] transition-all group"
        >
          <div className="space-y-2">
            <h2 className="text-base font-extrabold text-[#141416]">
              Checkliste & Orga
            </h2>
            <div className="text-4xl font-black tracking-tight text-[#141416] leading-none pt-1">
              {openTasksCount}
            </div>
            <p className="text-xs font-semibold text-[#141416]/70">
              Offene Aufgaben · {completedTasksCount} erledigt
            </p>
          </div>

          {/* Geometric Overlapping Circles Graphic */}
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-[#141416] absolute left-0 top-2 opacity-90 group-hover:scale-105 transition-transform" />
            <div
              className="w-14 h-14 rounded-full absolute right-0 bottom-2 border-2 border-[#141416]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, #141416 0, #141416 2px, transparent 2px, transparent 6px)',
              }}
            />
          </div>
        </div>

        {/* Card 4: Periwinkle Blue (#C5D1F5) */}
        <div
          onClick={() => setActiveTab('polls')}
          className="bg-[#C5D1F5] rounded-[28px] p-6 flex items-center justify-between gap-4 min-h-[160px] shadow-xs cursor-pointer hover:brightness-[1.01] transition-all group"
        >
          <div className="space-y-2">
            <h2 className="text-base font-extrabold text-[#141416]">
              Abstimmungen
            </h2>
            <div className="text-4xl font-black tracking-tight text-[#141416] leading-none pt-1">
              {openPollsCount}
            </div>
            <p className="text-xs font-semibold text-[#141416]/70">
              Offene Umfragen · {totalPollVotes} Stimmen
            </p>
          </div>

          {/* Starburst Graphic */}
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center group-hover:rotate-12 transition-transform">
            <svg viewBox="0 0 100 100" className="w-16 h-16 text-[#141416]">
              <g stroke="currentColor" strokeWidth="14" strokeLinecap="round">
                <line x1="50" y1="8" x2="50" y2="92" />
                <line x1="8" y1="50" x2="92" y2="50" />
                <line x1="20" y1="20" x2="80" y2="80" />
                <line x1="80" y1="20" x2="20" y2="80" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom Split View: Clean Proposals List (Left) & Detail Card (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6 pt-1">
        {/* Left: Proposals for Selected Day (max 3 data points per row: Icon, Title + Time, Vote Button) */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold text-[#141416]">
              Programm an Tag {selectedDay}
            </h2>
            <button
              onClick={() => setActiveTab('schedule')}
              className="text-xs font-bold text-[#141416]/60 hover:text-[#141416] cursor-pointer"
            >
              Alle Tage ansehen →
            </button>
          </div>

          <div className="space-y-2.5">
            {dayActivities.length === 0 ? (
              <div className="bg-[#EFECE6] rounded-[24px] p-8 text-center">
                <p className="text-sm font-bold text-[#141416]">
                  Noch keine Vorschläge für Tag {selectedDay}.
                </p>
                <button
                  onClick={() => setIsQuickAddOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 bg-[#141416] text-white text-xs font-bold px-4 py-2.5 rounded-full cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#F4DF7B]" />
                  <span>Vorschlag hinzufügen</span>
                </button>
              </div>
            ) : (
              dayActivities.map((act) => {
                const isSelected = activeActivity?.id === act.id;
                const catMeta =
                  CATEGORY_META[act.category] || CATEGORY_META.other;
                const CatIcon = catMeta.icon;
                const hasVoted = act.votes.includes(currentUser.id);

                return (
                  <div
                    key={act.id}
                    onClick={() => setSelectedActivityId(act.id)}
                    className={`flex items-center justify-between gap-3 p-4 rounded-[24px] cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#E8C2E8] shadow-xs'
                        : 'bg-[#EFECE6] hover:bg-[#e7e3db]'
                    }`}
                  >
                    {/* 1. Icon + 2. Title & Time */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#141416] text-white' : catMeta.bg
                        }`}
                      >
                        <CatIcon className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-[#141416] truncate">
                          {act.title}
                        </p>
                        <p className="text-xs font-medium text-[#141416]/65 truncate mt-0.5">
                          {act.timeSlot} Uhr · {act.location}
                        </p>
                      </div>
                    </div>

                    {/* 3. Vote Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActivityVote(act.id);
                      }}
                      title={`Als ${currentUser.name} abstimmen`}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                        hasVoted
                          ? 'bg-[#141416] text-[#F4DF7B]'
                          : 'bg-white/80 text-[#141416] hover:bg-white'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{act.votes.length}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Clean, Well-Spaced Detail Card */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold text-[#141416]">
              Details zum Vorschlag
            </h2>
          </div>

          {activeActivity ? (
            <div className="bg-[#E8C2E8] rounded-[28px] p-6 flex-1 flex flex-col justify-between shadow-xs space-y-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#141416]/65">
                      Tag {activeActivity.dayNumber} · {activeActivity.timeSlot}
                      {activeActivity.endTime
                        ? ` – ${activeActivity.endTime}`
                        : ''}{' '}
                      Uhr
                    </span>
                    <h3 className="text-xl font-black text-[#141416] mt-1">
                      {activeActivity.title}
                    </h3>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                      STATUS_LABELS[activeActivity.status].badgeClass
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {STATUS_LABELS[activeActivity.status].label}
                  </span>
                </div>

                {/* Location & Cost Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#F4DF7B] text-[#141416]">
                    <MapPin className="w-3.5 h-3.5" />
                    {activeActivity.location}
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/75 text-[#141416]">
                    <Euro className="w-3.5 h-3.5" />
                    {activeActivity.estimatedCost === 0
                      ? 'Kostenlos'
                      : `~${activeActivity.estimatedCost} € p.P.`}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-[#141416]/85 leading-relaxed bg-white/50 rounded-2xl p-4">
                  {activeActivity.description}
                </p>

                {/* Voters */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-xs font-bold text-[#141416]/70">
                    Stimmen ({activeActivity.votes.length}):
                  </span>
                  {activeActivity.votes.map((voterId) => {
                    const voter = getTraveler(voterId);
                    if (!voter) return null;
                    return (
                      <span
                        key={voterId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/85 text-xs font-bold text-[#141416]"
                      >
                        <span
                          className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-black"
                          style={{ backgroundColor: voter.color }}
                        >
                          {voter.initials}
                        </span>
                        {voter.name}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Clean Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-black/10">
                <div className="flex items-center gap-1.5">
                  {(['idea', 'planned', 'confirmed'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() =>
                        updateActivityStatus(activeActivity.id, st)
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        activeActivity.status === st
                          ? 'bg-[#141416] text-white'
                          : 'bg-white/60 text-[#141416]/75 hover:bg-white'
                      }`}
                    >
                      {STATUS_LABELS[st].label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => toggleActivityVote(activeActivity.id)}
                  className="inline-flex items-center gap-2 bg-[#141416] text-white text-xs font-bold px-5 py-2.5 rounded-full hover:bg-[#141416]/90 transition-all shadow-sm cursor-pointer"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-[#F4DF7B]" />
                  <span>
                    {activeActivity.votes.includes(currentUser.id)
                      ? 'Stimme aktiv'
                      : 'Dafür stimmen'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#E8C2E8] rounded-[28px] p-8 text-center flex-1 flex flex-col items-center justify-center">
              <Clock className="w-8 h-8 text-[#141416]/50 mb-2" />
              <p className="text-base font-bold text-[#141416]">
                Wähle links einen Vorschlag aus
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
