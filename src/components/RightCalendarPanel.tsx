import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  RotateCcw,
  ThumbsUp,
  MapPin,
  Utensils,
  Compass,
  Sun,
  Landmark,
  Car,
  Music,
  Sparkles,
  Clock,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Euro,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import { ActivityCategory, MealType, MealStyle } from '../types/vacation';

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

const MEAL_STYLE_LABELS: Record<MealStyle, string> = {
  cook: 'Selbst kochen',
  restaurant: 'Restaurant',
  bakery: 'Bäckerei / Café',
  delivery: 'Lieferservice',
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
    addActivity,
    addMeal,
    resetDemoTrip,
    setIsQuickAddOpen,
  } = useVacation();

  const [showInlineForm, setShowInlineForm] = useState(false);
  const [formType, setFormType] = useState<'activity' | 'meal'>('activity');

  // Inline Activity Form State
  const [title, setTitle] = useState('');
  const [timeSlot, setTimeSlot] = useState('10:00');
  const [endTime, setEndTime] = useState('12:30');
  const [category, setCategory] = useState<ActivityCategory>('activity');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('25');

  // Inline Meal Form State
  const [mealType, setMealType] = useState<MealType>('dinner');
  const [mealStyle, setMealStyle] = useState<MealStyle>('restaurant');

  // Parse startDate and compute calendar cells
  const calendarData = useMemo(() => {
    const baseDate = trip.startDate ? new Date(`${trip.startDate}T00:00:00`) : new Date(2026, 6, 15);
    const validBase = isNaN(baseDate.getTime()) ? new Date(2026, 6, 15) : baseDate;

    const year = validBase.getFullYear();
    const month = validBase.getMonth();
    const monthLabel = `${MONTH_NAMES[month]} ${year}`;

    // Map each trip day (1..totalDays) to its date string YYYY-MM-DD
    const tripDayByDateStr = new Map<string, number>();
    const dateByTripDay = new Map<number, Date>();

    for (let d = 1; d <= trip.totalDays; d++) {
      const dt = new Date(validBase);
      dt.setDate(validBase.getDate() + (d - 1));
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
        dt.getDate()
      ).padStart(2, '0')}`;
      tripDayByDateStr.set(key, d);
      dateByTripDay.set(d, dt);
    }

    // Build a 3-week or full-month compact grid around the trip start date
    // Start from the Monday of the week of day 1 (or 1 week before if compact)
    const firstDayOfWeek = (validBase.getDay() + 6) % 7; // Monday = 0 .. Sunday = 6
    const gridStart = new Date(validBase);
    gridStart.setDate(validBase.getDate() - firstDayOfWeek);

    const totalCells = Math.max(21, Math.ceil((firstDayOfWeek + trip.totalDays) / 7) * 7);
    const cells: Array<{
      date: Date;
      dayOfMonth: number;
      tripDay: number | null;
      isCurrentMonth: boolean;
    }> = [];

    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + i);
      const key = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(cellDate.getDate()).padStart(2, '0')}`;
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
        endTime: a.endTime,
        title: a.title,
        subtitle: a.location,
        description: a.description,
        category: a.category,
        cost: a.estimatedCost,
        votes: a.votes,
        status: a.status,
        createdBy: a.createdBy,
        participants: Array.from(new Set([a.createdBy, ...a.votes])),
      }));

    const dayMeals = trip.meals
      .filter((m) => m.dayNumber === selectedDay)
      .map((m) => ({
        kind: 'meal' as const,
        id: m.id,
        time: m.time || '12:30',
        endTime: undefined,
        title: m.title,
        subtitle: `${MEAL_TYPE_LABELS[m.mealType]} • ${MEAL_STYLE_LABELS[m.style]} (${m.locationOrRecipe})`,
        description: m.description,
        mealType: m.mealType,
        cost: m.estimatedCostPerPerson,
        votes: m.votes,
        createdBy: m.proposedBy,
        participants: Array.from(new Set([m.proposedBy, ...m.assignedTeam, ...m.votes])),
      }));

    return [...dayActivities, ...dayMeals].sort((a, b) => a.time.localeCompare(b.time));
  }, [trip.activities, trip.meals, selectedDay]);

  const getTraveler = (id: string) =>
    trip.travelers.find((t) => t.id === id) || {
      id,
      name: 'Gast',
      initials: 'GA',
      color: '#E8C2E8',
    };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (formType === 'activity') {
      addActivity({
        dayNumber: selectedDay,
        timeSlot,
        endTime: endTime || undefined,
        title: title.trim(),
        category,
        location: location.trim() || trip.destination,
        description: description.trim() || 'Gemeinsamer Vorschlag für die Gruppe.',
        estimatedCost: Math.max(0, Number(estimatedCost) || 0),
        status: 'idea',
      });
    } else {
      addMeal({
        dayNumber: selectedDay,
        mealType,
        style: mealStyle,
        title: title.trim(),
        time: timeSlot,
        locationOrRecipe: location.trim() || 'Gemeinsames Essen',
        description: description.trim() || 'Kulinarischer Vorschlag für diesen Tag.',
        estimatedCostPerPerson: Math.max(0, Number(estimatedCost) || 0),
        assignedTeam: [currentUser.id],
      });
    }

    setTitle('');
    setLocation('');
    setDescription('');
    setShowInlineForm(false);
  };

  return (
    <aside className="bg-[#EFECE6]/70 rounded-[28px] p-5 flex flex-col gap-5 border border-black/5 h-full">
      {/* Calendar Header & Month Grid */}
      <div className="bg-[#F9F6F0] rounded-[24px] p-4 shadow-sm border border-black/5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block">
              Reisezeitraum
            </span>
            <h2 className="text-lg font-bold text-[#141416] flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-[#141416]" />
              {calendarData.monthLabel}
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
              disabled={selectedDay <= 1}
              className="w-7 h-7 rounded-full bg-[#EFECE6] hover:bg-[#E8C2E8] disabled:opacity-40 flex items-center justify-center transition-colors"
              title="Vorheriger Tag"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDay(Math.min(trip.totalDays, selectedDay + 1))}
              disabled={selectedDay >= trip.totalDays}
              className="w-7 h-7 rounded-full bg-[#EFECE6] hover:bg-[#E8C2E8] disabled:opacity-40 flex items-center justify-center transition-colors"
              title="Nächster Tag"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-[10px] font-bold tracking-wider text-neutral-400 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarData.cells.map((cell, idx) => {
            const isTripDay = cell.tripDay !== null;
            const isSelected = cell.tripDay === selectedDay;

            // Count items on this trip day
            const itemCount = isTripDay
              ? trip.activities.filter((a) => a.dayNumber === cell.tripDay).length +
                trip.meals.filter((m) => m.dayNumber === cell.tripDay).length
              : 0;

            return (
              <button
                key={idx}
                type="button"
                disabled={!isTripDay}
                onClick={() => {
                  if (cell.tripDay) setSelectedDay(cell.tripDay);
                }}
                className={`relative h-9 rounded-full flex flex-col items-center justify-center text-xs transition-all ${
                  isSelected
                    ? 'bg-[#E8C2E8] text-[#141416] font-bold shadow-sm scale-105 ring-2 ring-[#141416]/15'
                    : isTripDay
                    ? 'bg-[#EFECE6] hover:bg-[#F4DF7B]/70 text-[#141416] font-semibold cursor-pointer'
                    : cell.isCurrentMonth
                    ? 'text-neutral-400 cursor-default'
                    : 'text-neutral-300 cursor-default'
                }`}
                title={isTripDay ? `Tag ${cell.tripDay} auswählen` : undefined}
              >
                <span>{cell.dayOfMonth}</span>
                {isTripDay && itemCount > 0 && (
                  <span
                    className={`w-1 h-1 rounded-full mt-0.5 ${
                      isSelected ? 'bg-[#141416]' : 'bg-neutral-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Compact Tag 1 .. Tag N Quick-Pill Selector */}
        <div className="mt-3.5 pt-3 border-t border-black/5 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {Array.from({ length: trip.totalDays }, (_, i) => i + 1).map((dayNum) => {
            const active = dayNum === selectedDay;
            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => setSelectedDay(dayNum)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-[#141416] text-white shadow-sm'
                    : 'bg-[#EFECE6] text-neutral-700 hover:bg-[#E8C2E8]/60'
                }`}
              >
                Tag {dayNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowInlineForm((prev) => !prev)}
          className="flex-1 bg-[#141416] hover:bg-neutral-800 text-white rounded-full py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Vorschlag / Event</span>
        </button>

        <button
          type="button"
          onClick={() => setIsQuickAddOpen(true)}
          className="w-10 h-10 rounded-full bg-[#E8C2E8] hover:bg-[#dfb0df] text-[#141416] flex items-center justify-center transition-colors shadow-sm"
          title="Großes Vorschlags-Modal öffnen"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {trip.isDemo && (
          <button
            type="button"
            onClick={resetDemoTrip}
            className="w-10 h-10 rounded-full bg-[#F9F6F0] hover:bg-[#F4DF7B] text-[#141416] border border-black/5 flex items-center justify-center transition-colors"
            title="Demo-Daten zurücksetzen"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Inline Quick Creation Form */}
      {showInlineForm && (
        <form
          onSubmit={handleQuickSubmit}
          className="bg-[#F9F6F0] rounded-[22px] p-4 border border-black/10 shadow-md space-y-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#141416]">
              Neuer Eintrag für Tag {selectedDay}
            </span>
            <button
              type="button"
              onClick={() => setShowInlineForm(false)}
              className="text-neutral-400 hover:text-[#141416]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Switch Activity vs Meal */}
          <div className="grid grid-cols-2 gap-1 bg-[#EFECE6] p-1 rounded-full text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFormType('activity')}
              className={`py-1.5 rounded-full transition-all ${
                formType === 'activity' ? 'bg-[#141416] text-white' : 'text-neutral-600'
              }`}
            >
              Aktivität
            </button>
            <button
              type="button"
              onClick={() => setFormType('meal')}
              className={`py-1.5 rounded-full transition-all ${
                formType === 'meal' ? 'bg-[#141416] text-white' : 'text-neutral-600'
              }`}
            >
              Essen / Drink
            </button>
          </div>

          <input
            type="text"
            required
            placeholder={
              formType === 'activity'
                ? 'Titel (z.B. Katamaran Sunset Tour)'
                : 'Gericht / Ort (z.B. Tapas in Santanyí)'
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white rounded-xl px-3 py-2 text-xs border border-black/10 focus:outline-none focus:ring-2 focus:ring-[#E8C2E8]"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-neutral-500 block mb-0.5">
                Startzeit
              </label>
              <input
                type="time"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full bg-white rounded-xl px-2.5 py-1.5 text-xs border border-black/10"
              />
            </div>

            {formType === 'activity' ? (
              <div>
                <label className="text-[10px] font-semibold text-neutral-500 block mb-0.5">
                  Kategorie
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                  className="w-full bg-white rounded-xl px-2 py-1.5 text-xs border border-black/10"
                >
                  <option value="beach">Strand & Meer</option>
                  <option value="activity">Ausflug & Action</option>
                  <option value="culture">Kultur</option>
                  <option value="transport">Transfer</option>
                  <option value="nightlife">Nightlife</option>
                  <option value="other">Sonstiges</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-semibold text-neutral-500 block mb-0.5">
                  Mahlzeit
                </label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealType)}
                  className="w-full bg-white rounded-xl px-2 py-1.5 text-xs border border-black/10"
                >
                  <option value="breakfast">Frühstück</option>
                  <option value="lunch">Mittagessen</option>
                  <option value="dinner">Abendessen</option>
                  <option value="snack">Snacks & Drinks</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder={formType === 'activity' ? 'Ort / Treffpunkt' : 'Restaurant / Rezept'}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-white rounded-xl px-3 py-1.5 text-xs border border-black/10"
            />
            <div className="relative">
              <input
                type="number"
                min="0"
                placeholder="Kosten €"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                className="w-full bg-white rounded-xl pl-3 pr-6 py-1.5 text-xs border border-black/10"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-neutral-400">€</span>
            </div>
          </div>

          {formType === 'meal' && (
            <select
              value={mealStyle}
              onChange={(e) => setMealStyle(e.target.value as MealStyle)}
              className="w-full bg-white rounded-xl px-2.5 py-1.5 text-xs border border-black/10"
            >
              <option value="cook">Selbst kochen auf der Finca/Unterkunft</option>
              <option value="restaurant">Restaurant-Besuch</option>
              <option value="bakery">Bäckerei / Café</option>
              <option value="delivery">Lieferservice / Takeaway</option>
            </select>
          )}

          <textarea
            rows={2}
            placeholder="Kurze Notiz oder Beschreibung..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white rounded-xl px-3 py-1.5 text-xs border border-black/10 resize-none"
          />

          <button
            type="submit"
            className="w-full bg-[#141416] text-white rounded-full py-2 text-xs font-semibold hover:bg-neutral-800 transition-colors"
          >
            Als {currentUser.name} vorschlagen
          </button>
        </form>
      )}

      {/* Selected Day Timeline */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-sm font-bold text-[#141416]">Tag {selectedDay} – Timeline</h3>
            <p className="text-[11px] text-neutral-500">
              {selectedDateFormatted} • {timelineItems.length} Einträge
            </p>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#F4DF7B]/70 text-[#141416]">
            Chronologisch
          </span>
        </div>

        <div className="space-y-3 overflow-y-auto pr-1 flex-1">
          {timelineItems.length === 0 ? (
            <div className="bg-[#F9F6F0] rounded-[22px] p-6 text-center border border-dashed border-black/10">
              <Clock className="w-6 h-6 text-neutral-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-[#141416]">
                Noch keine Einträge für Tag {selectedDay}
              </p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Klicke oben auf „+ Vorschlag / Event“, um eine Aktivität oder ein Essen hinzuzufügen.
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
                  className={`relative pl-4 border-l-2 transition-all ${
                    isSelectedCard ? 'border-[#141416]' : 'border-black/10'
                  }`}
                >
                  {/* Timeline Time Dot */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-neutral-500 flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full -ml-[21px] mr-1.5 ring-4 ring-[#EFECE6] ${
                          item.kind === 'meal' ? 'bg-[#F7C59F]' : 'bg-[#141416]'
                        }`}
                      />
                      {item.time}
                      {item.endTime ? ` – ${item.endTime}` : ''}
                    </span>

                    {item.kind === 'activity' && item.status === 'confirmed' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-[#A9B882]/60 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Fix
                      </span>
                    )}
                    {item.kind === 'meal' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#141416] bg-[#F7C59F]/60 px-2 py-0.5 rounded-full">
                        Essen
                      </span>
                    )}
                  </div>

                  {/* Card */}
                  <div
                    className={`rounded-[20px] p-3.5 transition-all border ${
                      isSelectedCard
                        ? 'bg-[#E8C2E8] border-[#141416]/20 shadow-sm'
                        : 'bg-[#F9F6F0] hover:bg-white border-black/5'
                    } ${item.kind === 'activity' ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-2xl ${catMeta.bg} flex items-center justify-center shrink-0 shadow-xs`}
                      >
                        {catMeta.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-[#141416] leading-snug truncate">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-neutral-600 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0 text-neutral-400" />
                          <span className="truncate">{item.subtitle}</span>
                        </p>
                      </div>

                      {item.cost > 0 && (
                        <span className="text-[10px] font-bold bg-black/5 px-2 py-0.5 rounded-full text-[#141416] shrink-0 flex items-center">
                          {item.cost} €
                        </span>
                      )}
                    </div>

                    {/* Footer: Participant Initials & Instant Vote Button */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-black/5">
                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {item.participants.slice(0, 5).map((tId) => {
                          const trav = getTraveler(tId);
                          return (
                            <span
                              key={tId}
                              style={{ backgroundColor: trav.color }}
                              className="w-6 h-6 rounded-full text-[10px] font-bold text-[#141416] flex items-center justify-center ring-2 ring-[#F9F6F0] shrink-0"
                              title={trav.name}
                            >
                              {trav.initials}
                            </span>
                          );
                        })}
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
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                          hasVoted
                            ? 'bg-[#141416] text-white shadow-xs'
                            : 'bg-[#EFECE6] hover:bg-[#F4DF7B] text-[#141416]'
                        }`}
                        title={`Als ${currentUser.name} für diesen Vorschlag stimmen`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{item.votes.length}</span>
                      </button>
                    </div>
                  </div>
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
