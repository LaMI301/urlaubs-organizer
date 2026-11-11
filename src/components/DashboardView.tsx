import React, { useState, useMemo } from 'react';
import {
  ThumbsUp,
  MapPin,
  Clock,
  Sparkles,
  Utensils,
  Compass,
  Palmtree,
  Landmark,
  Car,
  Music,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  Users,
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
    label: 'Idee / Abstimmung',
    badgeClass: 'bg-white/75 text-[#141416]',
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
    toggleMealVote,
  } = useVacation();

  const [dayFilterMode, setDayFilterMode] = useState<'selected' | 'all'>('all');

  // Helper to get traveler by id
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

  const confirmedActivitiesCount = trip.activities.filter(
    (a) => a.status === 'confirmed'
  ).length;
  const ideaActivitiesCount = trip.activities.filter(
    (a) => a.status !== 'confirmed'
  ).length;

  // Tasks stats for Sage Green Card
  const completedTasksCount = trip.tasks.filter((t) => t.completed).length;
  const openTasksCount = trip.tasks.filter((t) => !t.completed).length;
  const highPriorityTasksCount = trip.tasks.filter(
    (t) => !t.completed && (t.priority === 'critical' || t.priority === 'important')
  ).length;

  // Polls stats for Periwinkle Blue Card
  const openPollsCount = trip.polls.filter((p) => !p.isClosed).length;
  const closedPollsCount = trip.polls.filter((p) => p.isClosed).length;
  const totalPollVotes = trip.polls.reduce(
    (sum, p) => sum + p.options.reduce((s, o) => s + o.votes.length, 0),
    0
  );

  // Filtered activities for bottom-left list
  const visibleActivities = useMemo(() => {
    const base =
      dayFilterMode === 'selected'
        ? trip.activities.filter((a) => a.dayNumber === selectedDay)
        : trip.activities;
    return [...base].sort((a, b) => {
      if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
      return a.timeSlot.localeCompare(b.timeSlot);
    });
  }, [trip.activities, dayFilterMode, selectedDay]);

  // Currently inspected activity for bottom-right detail card
  const activeActivity = useMemo(() => {
    if (selectedActivityId) {
      const found = trip.activities.find((a) => a.id === selectedActivityId);
      if (found) return found;
    }
    const dayFirst = visibleActivities.find((a) => a.dayNumber === selectedDay);
    return dayFirst || visibleActivities[0] || trip.activities[0] || null;
  }, [selectedActivityId, trip.activities, visibleActivities, selectedDay]);

  // Meals for the inspected activity's day (or selectedDay)
  const detailDay = activeActivity ? activeActivity.dayNumber : selectedDay;
  const dayMeals = useMemo(() => {
    return trip.meals.filter((m) => m.dayNumber === detailDay);
  }, [trip.meals, detailDay]);

  // Build SVG wave path for Lilac Card
  const wavePoints = useMemo(() => {
    const stats = dayStats.slice(0, 8);
    if (stats.length === 0) return { path: '', area: '', highlight: { x: 100, y: 40, cost: 0, day: 1 } };
    const maxCost = Math.max(...stats.map((s) => s.totalCost), 60);
    const width = 240;
    const height = 68;
    const pts = stats.map((s, i) => {
      const x =
        stats.length === 1 ? width / 2 : (i / (stats.length - 1)) * (width - 24) + 12;
      const y = height - 12 - (s.totalCost / maxCost) * (height - 26);
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
      {/* Greeting Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#141416]/50 mb-1">
            {trip.subtitle}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#141416]">
            Hallo, {currentUser.name}! 👋
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="inline-flex items-center gap-2 bg-[#141416] text-white text-xs font-bold px-4 py-2.5 rounded-full hover:bg-[#141416]/90 active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#F4DF7B]" />
            <span>Neuer Vorschlag</span>
          </button>

          <button
            onClick={() => setActiveTab('meals')}
            className="inline-flex items-center gap-1.5 bg-[#EFECE6] hover:bg-[#e5e0d8] text-[#141416] text-xs font-bold px-3.5 py-2.5 rounded-full transition-colors"
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Essensplan</span>
          </button>
        </div>
      </div>

      {/* 2x2 Pastel Bento Summary Grid ("Intelly" Reference Aesthetic) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Sunny Yellow (#F4DF7B) - Reisetage & Aktivitäten-Dichte */}
        <div className="bg-[#F4DF7B] rounded-[26px] p-5 flex flex-col justify-between min-h-[195px] shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-extrabold text-[#141416]">
              Tagesprogramm & Ideen
            </h2>
            <button
              onClick={() => setActiveTab('schedule')}
              className="text-[11px] font-bold bg-white/70 hover:bg-white text-[#141416] px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-colors"
            >
              <span>Tagesplaner</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-[1fr_1.3fr] gap-3 items-end mt-3">
            {/* Left numbers */}
            <div>
              <div className="text-4xl font-black tracking-tight text-[#141416] leading-none">
                {trip.activities.length}
              </div>
              <p className="text-[11px] font-semibold text-[#141416]/70 mt-1 mb-3">
                Aktivitäten an {trip.totalDays} Tagen
              </p>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between pr-2">
                  <span className="font-bold text-[#141416]">
                    {confirmedActivitiesCount}
                  </span>
                  <span className="text-[11px] text-[#141416]/70">
                    Fest eingeplant
                  </span>
                </div>
                <div className="flex items-center justify-between pr-2 border-t border-black/10 pt-1">
                  <span className="font-bold text-[#141416]">
                    {ideaActivitiesCount}
                  </span>
                  <span className="text-[11px] text-[#141416]/70">
                    Offene Ideen
                  </span>
                </div>
              </div>
            </div>

            {/* Right vertical bar chart per day (Intelly "Patients" card style) */}
            <div className="flex items-end justify-between gap-1.5 h-28 pt-4 px-1">
              {dayStats.slice(0, 7).map((d) => {
                const isSelected = d.day === selectedDay;
                const heightPct = Math.max(
                  28,
                  Math.round((d.activitiesCount / maxActivitiesPerDay) * 100)
                );
                return (
                  <button
                    key={d.day}
                    onClick={() => {
                      setSelectedDay(d.day);
                      setDayFilterMode('selected');
                    }}
                    title={`Tag ${d.day}: ${d.activitiesCount} Programmpunkte`}
                    className="flex-1 flex flex-col items-center justify-end h-full group focus:outline-none"
                  >
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full max-w-[26px] rounded-2xl transition-all flex flex-col items-center justify-between py-1.5 ${
                        isSelected
                          ? 'bg-[#141416] text-white shadow-md scale-105'
                          : 'bg-black/15 text-[#141416] hover:bg-black/25'
                      }`}
                    >
                      <span className="text-[9px] font-extrabold leading-none">
                        {d.activitiesCount}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-[#F4DF7B]' : 'bg-[#141416]/40'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-[10px] mt-1 font-bold ${
                        isSelected ? 'text-[#141416]' : 'text-[#141416]/60'
                      }`}
                    >
                      T{d.day}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 2: Soft Lilac (#E8C2E8) - Essens- & Budget-Kurve */}
        <div className="bg-[#E8C2E8] rounded-[26px] p-5 flex flex-col justify-between min-h-[195px] shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-[#141416]">
                Essen & Reisekasse
              </h2>
              <p className="text-[11px] font-semibold text-[#141416]/65">
                Ziel: {trip.budgetTargetPerPerson} € p.P. · {trip.meals.length}{' '}
                Mahlzeiten geplant
              </p>
            </div>
            <button
              onClick={() => setActiveTab('budget')}
              className="text-[11px] font-bold bg-white/70 hover:bg-white text-[#141416] px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-colors"
            >
              <span>Budget</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-[0.9fr_1.4fr] gap-2 items-end mt-2">
            <div>
              <div className="text-3xl font-black tracking-tight text-[#141416] leading-none">
                {totalEstimatedPerPerson} €
              </div>
              <p className="text-[11px] font-semibold text-[#141416]/70 mt-1">
                Geschätzt pro Person
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 bg-white/65 px-2.5 py-1 rounded-full text-[11px] font-bold text-[#141416]">
                <Utensils className="w-3 h-3" />
                <span>Ø {Math.round(totalEstimatedPerPerson / Math.max(1, trip.totalDays))} € / Tag</span>
              </div>
            </div>

            {/* Smooth SVG Wave Chart (Intelly "Visits summary" style) */}
            <div className="relative flex flex-col items-end">
              <div className="bg-[#141416] text-white text-[10px] font-bold px-2.5 py-1 rounded-full mb-1 shadow-sm">
                Tag {wavePoints.highlight.day}: ~{wavePoints.highlight.cost} € p.P.
              </div>
              <svg
                viewBox="0 0 240 68"
                className="w-full h-16 overflow-visible"
              >
                <defs>
                  <linearGradient id="lilacWave" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#141416" stopOpacity="0.22" />
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
                <line
                  x1={wavePoints.highlight.x}
                  y1={wavePoints.highlight.y}
                  x2={wavePoints.highlight.x}
                  y2={66}
                  stroke="#141416"
                  strokeDasharray="2 2"
                  strokeWidth="1.2"
                />
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
        </div>

        {/* Card 3: Sage Green (#A9B882) - Aufgaben & Checkliste ("By condition" reference style) */}
        <div
          onClick={() => setActiveTab('tasks')}
          className="bg-[#A9B882] rounded-[26px] p-5 flex items-center justify-between min-h-[160px] shadow-sm cursor-pointer hover:brightness-[1.02] transition-all relative overflow-hidden group"
        >
          <div className="z-10 space-y-2.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#141416]">
                Checkliste & Orga
              </h2>
              <span className="text-[10px] font-bold bg-[#141416]/10 text-[#141416] px-2 py-0.5 rounded-full">
                Vor der Reise
              </span>
            </div>

            <div className="flex items-center gap-5 pt-1">
              <div>
                <div className="text-2xl font-black text-[#141416]">
                  {openTasksCount}
                </div>
                <div className="text-[11px] font-semibold text-[#141416]/75">
                  Offen
                </div>
              </div>
              <div className="h-7 w-px bg-[#141416]/15" />
              <div>
                <div className="text-2xl font-black text-[#141416]">
                  {completedTasksCount}
                </div>
                <div className="text-[11px] font-semibold text-[#141416]/75">
                  Erledigt
                </div>
              </div>
              <div className="h-7 w-px bg-[#141416]/15" />
              <div>
                <div className="text-2xl font-black text-[#141416]">
                  {highPriorityTasksCount}
                </div>
                <div className="text-[11px] font-semibold text-[#141416]/75">
                  Wichtig
                </div>
              </div>
            </div>
          </div>

          {/* Geometric Overlapping Circles Graphic (matching Intelly "By condition") */}
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#141416] absolute left-0 top-2 opacity-90 group-hover:scale-105 transition-transform" />
            <div
              className="w-16 h-16 rounded-full absolute right-0 bottom-2 border-2 border-[#141416]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, #141416 0, #141416 2px, transparent 2px, transparent 6px)',
              }}
            />
          </div>
        </div>

        {/* Card 4: Pastel Periwinkle Blue (#C5D1F5) - Abstimmungen & Polls ("Sessions" reference style) */}
        <div
          onClick={() => setActiveTab('polls')}
          className="bg-[#C5D1F5] rounded-[26px] p-5 flex items-center justify-between min-h-[160px] shadow-sm cursor-pointer hover:brightness-[1.02] transition-all relative overflow-hidden group"
        >
          <div className="z-10 space-y-2.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#141416]">
                Gruppen-Abstimmungen
              </h2>
              <span className="text-[10px] font-bold bg-white/70 text-[#141416] px-2 py-0.5 rounded-full">
                Live-Voting
              </span>
            </div>

            <div className="flex items-center gap-5 pt-1">
              <div>
                <div className="text-2xl font-black text-[#141416]">
                  {openPollsCount}
                </div>
                <div className="text-[11px] font-semibold text-[#141416]/75">
                  Offene Votes
                </div>
              </div>
              <div className="h-7 w-px bg-[#141416]/15" />
              <div>
                <div className="text-2xl font-black text-[#141416]">
                  {closedPollsCount}
                </div>
                <div className="text-[11px] font-semibold text-[#141416]/75">
                  Entschieden
                </div>
              </div>
              <div className="h-7 w-px bg-[#141416]/15" />
              <div>
                <div className="text-2xl font-black text-[#141416]">
                  {totalPollVotes}
                </div>
                <div className="text-[11px] font-semibold text-[#141416]/75">
                  Stimmen gesamt
                </div>
              </div>
            </div>
          </div>

          {/* Starburst / Asterisk Graphic (matching Intelly "Sessions" card) */}
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center group-hover:rotate-12 transition-transform">
            <svg viewBox="0 0 100 100" className="w-20 h-20 text-[#141416]">
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

      {/* Bottom Section: Left "Tages-Vorschläge & Programm" + Right "Vorschlag & Tages-Details" */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1fr] gap-6 pt-1">
        {/* Left Column: Sleek Activity Rows ("Patient's list" reference style) */}
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-extrabold text-[#141416]">
              Tages-Vorschläge & Programm
            </h2>

            <div className="flex items-center gap-1.5 bg-[#EFECE6] p-1 rounded-full">
              <button
                onClick={() => setDayFilterMode('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  dayFilterMode === 'all'
                    ? 'bg-[#141416] text-white shadow-sm'
                    : 'text-[#141416]/65 hover:text-[#141416]'
                }`}
              >
                Alle Tage ({trip.activities.length})
              </button>
              <button
                onClick={() => setDayFilterMode('selected')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  dayFilterMode === 'selected'
                    ? 'bg-[#141416] text-white shadow-sm'
                    : 'text-[#141416]/65 hover:text-[#141416]'
                }`}
              >
                Tag {selectedDay}
              </button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[430px] overflow-y-auto pr-1">
            {visibleActivities.length === 0 ? (
              <div className="bg-[#EFECE6] rounded-[22px] p-8 text-center">
                <p className="text-sm font-bold text-[#141416]">
                  Noch keine Aktivitäten für Tag {selectedDay} eingetragen.
                </p>
                <button
                  onClick={() => setIsQuickAddOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 bg-[#141416] text-white text-xs font-bold px-4 py-2 rounded-full"
                >
                  <Plus className="w-3.5 h-3.5 text-[#F4DF7B]" />
                  Ersten Vorschlag für Tag {selectedDay} machen
                </button>
              </div>
            ) : (
              visibleActivities.map((act) => {
                const isSelected = activeActivity?.id === act.id;
                const catMeta =
                  CATEGORY_META[act.category] || CATEGORY_META.other;
                const CatIcon = catMeta.icon;
                const creator = getTraveler(act.createdBy);
                const hasVoted = act.votes.includes(currentUser.id);

                return (
                  <div
                    key={act.id}
                    onClick={() => {
                      setSelectedActivityId(act.id);
                      setSelectedDay(act.dayNumber);
                    }}
                    className={`flex items-center justify-between gap-3 p-3 rounded-[22px] cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#E8C2E8] shadow-sm scale-[1.01]'
                        : 'bg-[#EFECE6] hover:bg-[#e7e3db]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-black/5 ${
                          isSelected ? 'bg-[#141416] text-white' : catMeta.bg
                        }`}
                      >
                        <CatIcon className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/10 text-[#141416]">
                            Tag {act.dayNumber}
                          </span>
                          <p className="text-sm font-extrabold text-[#141416] truncate">
                            {act.title}
                          </p>
                        </div>
                        <p className="text-xs text-[#141416]/65 truncate mt-0.5">
                          {act.location} · von {creator?.name || 'Team'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Upvote Pill */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActivityVote(act.id);
                        }}
                        title={`Stimme als ${currentUser.name} abgeben`}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                          hasVoted
                            ? 'bg-[#141416] text-[#F4DF7B]'
                            : 'bg-white/75 text-[#141416] hover:bg-white'
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{act.votes.length}</span>
                      </button>

                      {/* Time Pill */}
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                          isSelected
                            ? 'bg-white text-[#141416]'
                            : 'bg-white/70 text-[#141416]'
                        }`}
                      >
                        {act.timeSlot}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Large Lilac Card ("Visit details" reference style) */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold text-[#141416]">
              Vorschlag & Tages-Details
            </h2>
            <span className="text-xs font-bold text-[#141416]/60">
              Tag {detailDay} von {trip.totalDays}
            </span>
          </div>

          {activeActivity ? (
            <div className="bg-[#E8C2E8] rounded-[26px] p-6 flex-1 flex flex-col justify-between shadow-sm space-y-5">
              {/* Top Header & Proposer Badge */}
              <div>
                <div className="flex flex-wrap items-start justify-between gap-2 pb-4 border-b border-black/10">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#141416]/60">
                      Tag {activeActivity.dayNumber} · {activeActivity.timeSlot}
                      {activeActivity.endTime
                        ? ` – ${activeActivity.endTime}`
                        : ''}{' '}
                      Uhr
                    </span>
                    <h3 className="text-xl font-black text-[#141416] mt-0.5">
                      {activeActivity.title}
                    </h3>
                  </div>

                  {/* Proposer Pill */}
                  {(() => {
                    const proposer = getTraveler(activeActivity.createdBy);
                    return (
                      <div className="inline-flex items-center gap-2 bg-white/80 pl-1.5 pr-3 py-1 rounded-full text-xs font-bold text-[#141416]">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-[#141416]"
                          style={{
                            backgroundColor: proposer?.color || '#F4DF7B',
                          }}
                        >
                          {proposer?.initials || 'T'}
                        </span>
                        <span>Vorschlag: {proposer?.name || 'Team'}</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Tags Row */}
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#F4DF7B] text-[#141416]">
                    <MapPin className="w-3 h-3" />
                    {activeActivity.location}
                  </span>

                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white/75 text-[#141416]">
                    <Euro className="w-3 h-3" />
                    {activeActivity.estimatedCost === 0
                      ? 'Kostenlos'
                      : `~${activeActivity.estimatedCost} € p.P.`}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                      STATUS_LABELS[activeActivity.status].badgeClass
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {STATUS_LABELS[activeActivity.status].label}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-[#141416]/85 leading-relaxed mt-4 bg-white/45 rounded-2xl p-3.5">
                  {activeActivity.description}
                </p>

                {/* Voter Avatars */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-[#141416]/70 inline-flex items-center gap-1 mr-1">
                      <Users className="w-3.5 h-3.5" />
                      Dafür gestimmt ({activeActivity.votes.length}):
                    </span>
                    {activeActivity.votes.map((voterId) => {
                      const voter = getTraveler(voterId);
                      if (!voter) return null;
                      return (
                        <span
                          key={voterId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/85 text-[11px] font-bold text-[#141416]"
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full text-[8px] flex items-center justify-center font-black"
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

                {/* Essens-Plan des Tages Box */}
                <div className="mt-4 pt-4 border-t border-black/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#141416]/70 flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-[#141416]" />
                      Essens-Plan an Tag {detailDay}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedDay(detailDay);
                        setActiveTab('meals');
                      }}
                      className="text-[11px] font-bold text-[#141416] underline hover:opacity-75"
                    >
                      Alle Mahlzeiten bearbeiten
                    </button>
                  </div>

                  {dayMeals.length === 0 ? (
                    <p className="text-xs text-[#141416]/60 bg-white/40 rounded-xl p-2.5">
                      Noch kein Essen für Tag {detailDay} geplant.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {dayMeals.slice(0, 2).map((meal) => {
                        const mealVoted = meal.votes.includes(currentUser.id);
                        return (
                          <div
                            key={meal.id}
                            className="bg-white/60 rounded-2xl p-2.5 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <span className="text-[10px] font-extrabold uppercase text-[#141416]/60 block">
                                {meal.mealType === 'breakfast'
                                  ? 'Frühstück'
                                  : meal.mealType === 'lunch'
                                  ? 'Mittag'
                                  : meal.mealType === 'dinner'
                                  ? 'Abendessen'
                                  : 'Snack'}{' '}
                                · {meal.time}
                              </span>
                              <p className="text-xs font-bold text-[#141416] truncate">
                                {meal.title}
                              </p>
                            </div>
                            <button
                              onClick={() => toggleMealVote(meal.id)}
                              className={`px-2 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 shrink-0 ${
                                mealVoted
                                  ? 'bg-[#141416] text-[#F4DF7B]'
                                  : 'bg-white text-[#141416]'
                              }`}
                            >
                              <ThumbsUp className="w-2.5 h-2.5" />
                              {meal.votes.length}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Bottom Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-black/10">
                <div className="flex items-center gap-1.5">
                  {(['idea', 'planned', 'confirmed'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() =>
                        updateActivityStatus(activeActivity.id, st)
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        activeActivity.status === st
                          ? 'bg-[#141416] text-white'
                          : 'bg-white/60 text-[#141416]/75 hover:bg-white'
                      }`}
                    >
                      {st === 'idea'
                        ? 'Idee'
                        : st === 'planned'
                        ? 'Geplant'
                        : 'Bestätigt'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => toggleActivityVote(activeActivity.id)}
                  className="inline-flex items-center gap-2 bg-[#141416] text-white text-xs font-bold px-5 py-2.5 rounded-full hover:bg-[#141416]/90 active:scale-95 transition-all shadow-md"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-[#F4DF7B]" />
                  <span>
                    {activeActivity.votes.includes(currentUser.id)
                      ? `Stimme zurückziehen (${currentUser.name})`
                      : `Für Vorschlag stimmen (${currentUser.name})`}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#E8C2E8] rounded-[26px] p-8 text-center flex-1 flex flex-col items-center justify-center">
              <Clock className="w-8 h-8 text-[#141416]/50 mb-2" />
              <p className="text-base font-bold text-[#141416]">
                Wähle links einen Programmpunkt aus
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
