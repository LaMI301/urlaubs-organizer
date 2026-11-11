import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  ThumbsUp,
  Trash2,
  Plus,
  Sparkles,
  Sun,
  Compass,
  Landmark,
  Car,
  Music,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Lightbulb,
  CalendarCheck,
  X,
  Utensils,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import {
  ActivityCategory,
  DayActivity,
  MealType,
  MealStyle,
} from '../types/vacation';

const CATEGORY_META: Record<
  ActivityCategory,
  { label: string; bg: string; badgeBg: string; icon: React.ReactNode }
> = {
  beach: {
    label: 'Strand & Meer',
    bg: 'bg-[#F4DF7B]',
    badgeBg: 'bg-[#F4DF7B]/40 text-[#141416]',
    icon: <Sun className="w-4 h-4 text-[#141416]" />,
  },
  activity: {
    label: 'Ausflug & Action',
    bg: 'bg-[#C5D1F5]',
    badgeBg: 'bg-[#C5D1F5]/50 text-[#141416]',
    icon: <Compass className="w-4 h-4 text-[#141416]" />,
  },
  culture: {
    label: 'Kultur & Sightseeing',
    bg: 'bg-[#E8C2E8]',
    badgeBg: 'bg-[#E8C2E8]/50 text-[#141416]',
    icon: <Landmark className="w-4 h-4 text-[#141416]" />,
  },
  transport: {
    label: 'Transfer & Route',
    bg: 'bg-[#A9B882]',
    badgeBg: 'bg-[#A9B882]/40 text-[#141416]',
    icon: <Car className="w-4 h-4 text-[#141416]" />,
  },
  nightlife: {
    label: 'Abend & Nightlife',
    bg: 'bg-[#F7C59F]',
    badgeBg: 'bg-[#F7C59F]/50 text-[#141416]',
    icon: <Music className="w-4 h-4 text-[#141416]" />,
  },
  other: {
    label: 'Sonstiges',
    bg: 'bg-[#EFECE6]',
    badgeBg: 'bg-[#EFECE6] text-[#141416]',
    icon: <Sparkles className="w-4 h-4 text-[#141416]" />,
  },
};

const STATUS_OPTIONS: Array<{
  value: DayActivity['status'];
  label: string;
  pillClass: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'idea',
    label: 'Idee',
    pillClass: 'bg-[#F4DF7B]/60 text-[#141416]',
    icon: <Lightbulb className="w-3.5 h-3.5" />,
  },
  {
    value: 'planned',
    label: 'Geplant',
    pillClass: 'bg-[#C5D1F5]/70 text-[#141416]',
    icon: <CalendarCheck className="w-3.5 h-3.5" />,
  },
  {
    value: 'confirmed',
    label: 'Bestätigt',
    pillClass: 'bg-[#A9B882]/70 text-[#141416]',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
];

export const QuickAddModal: React.FC = () => {
  const {
    trip,
    currentUser,
    selectedDay,
    isQuickAddOpen,
    setIsQuickAddOpen,
    addActivity,
    addMeal,
  } = useVacation();

  const [mode, setMode] = useState<'activity' | 'meal'>('activity');
  const [dayNumber, setDayNumber] = useState<number>(selectedDay);
  const [title, setTitle] = useState('');
  const [timeSlot, setTimeSlot] = useState('10:00');
  const [endTime, setEndTime] = useState('13:00');
  const [category, setCategory] = useState<ActivityCategory>('activity');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('25');
  const [status, setStatus] = useState<DayActivity['status']>('idea');

  // Meal specific fields
  const [mealType, setMealType] = useState<MealType>('dinner');
  const [mealStyle, setMealStyle] = useState<MealStyle>('restaurant');
  const [shoppingNotes, setShoppingNotes] = useState('');

  React.useEffect(() => {
    setDayNumber(selectedDay);
  }, [selectedDay, isQuickAddOpen]);

  if (!isQuickAddOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (mode === 'activity') {
      addActivity({
        dayNumber,
        timeSlot,
        endTime: endTime || undefined,
        title: title.trim(),
        category,
        location: location.trim() || trip.destination,
        description: description.trim() || 'Gemeinsamer Aktivitätsvorschlag.',
        estimatedCost: Math.max(0, Number(estimatedCost) || 0),
        status,
      });
    } else {
      addMeal({
        dayNumber,
        mealType,
        style: mealStyle,
        title: title.trim(),
        time: timeSlot,
        locationOrRecipe: location.trim() || 'Gemeinsames Essen',
        description: description.trim() || 'Essensvorschlag für die Gruppe.',
        ShoppingNotes: shoppingNotes.trim() || undefined,
        estimatedCostPerPerson: Math.max(0, Number(estimatedCost) || 0),
        assignedTeam: [currentUser.id],
      });
    }

    setTitle('');
    setLocation('');
    setDescription('');
    setShoppingNotes('');
    setIsQuickAddOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#F9F6F0] rounded-[30px] max-w-lg w-full p-6 shadow-2xl border border-black/10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E8C2E8] flex items-center justify-center">
              {mode === 'activity' ? (
                <Sparkles className="w-5 h-5 text-[#141416]" />
              ) : (
                <Utensils className="w-5 h-5 text-[#141416]" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#141416]">
                Neuen Vorschlag einreichen
              </h3>
              <p className="text-xs text-neutral-500">
                Du schlägst gerade vor als{' '}
                <strong className="text-[#141416]">{currentUser.name}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsQuickAddOpen(false)}
            className="w-8 h-8 rounded-full bg-[#EFECE6] hover:bg-black/10 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switch */}
        <div className="grid grid-cols-2 gap-1.5 bg-[#EFECE6] p-1.5 rounded-full text-xs font-bold mb-4">
          <button
            type="button"
            onClick={() => setMode('activity')}
            className={`py-2 rounded-full transition-all flex items-center justify-center gap-1.5 ${
              mode === 'activity'
                ? 'bg-[#141416] text-white shadow-xs'
                : 'text-neutral-600 hover:text-[#141416]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Aktivität / Ausflug
          </button>
          <button
            type="button"
            onClick={() => setMode('meal')}
            className={`py-2 rounded-full transition-all flex items-center justify-center gap-1.5 ${
              mode === 'meal'
                ? 'bg-[#141416] text-white shadow-xs'
                : 'text-neutral-600 hover:text-[#141416]'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            Essens-Vorschlag
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-[#141416] block mb-1">
              Titel des Vorschlags *
            </label>
            <input
              type="text"
              required
              placeholder={
                mode === 'activity'
                  ? 'z.B. Bootstour zur Blauen Lagune'
                  : 'z.B. Paella-Abend auf der Finca-Terrasse'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-sm border border-black/10 focus:outline-none focus:ring-2 focus:ring-[#E8C2E8]"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Reisetag
              </label>
              <select
                value={dayNumber}
                onChange={(e) => setDayNumber(Number(e.target.value))}
                className="w-full bg-white rounded-2xl px-3 py-2 text-xs font-semibold border border-black/10"
              >
                {Array.from({ length: trip.totalDays }, (_, i) => i + 1).map(
                  (d) => (
                    <option key={d} value={d}>
                      Tag {d}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Startzeit
              </label>
              <input
                type="time"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full bg-white rounded-2xl px-3 py-2 text-xs font-semibold border border-black/10"
              />
            </div>

            {mode === 'activity' ? (
              <div>
                <label className="text-xs font-bold text-[#141416] block mb-1">
                  Endzeit
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-white rounded-2xl px-3 py-2 text-xs font-semibold border border-black/10"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-[#141416] block mb-1">
                  Mahlzeit
                </label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealType)}
                  className="w-full bg-white rounded-2xl px-3 py-2 text-xs font-semibold border border-black/10"
                >
                  <option value="breakfast">Frühstück</option>
                  <option value="lunch">Mittagessen</option>
                  <option value="dinner">Abendessen</option>
                  <option value="snack">Snacks & Drinks</option>
                </select>
              </div>
            )}
          </div>

          {mode === 'activity' ? (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-bold text-[#141416] block mb-1">
                  Kategorie
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as ActivityCategory)
                  }
                  className="w-full bg-white rounded-2xl px-3 py-2 text-xs font-semibold border border-black/10"
                >
                  <option value="beach">Strand & Meer</option>
                  <option value="activity">Ausflug & Action</option>
                  <option value="culture">Kultur & Sightseeing</option>
                  <option value="transport">Transfer & Route</option>
                  <option value="nightlife">Abend & Nightlife</option>
                  <option value="other">Sonstiges</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#141416] block mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as DayActivity['status'])
                  }
                  className="w-full bg-white rounded-2xl px-3 py-2 text-xs font-semibold border border-black/10"
                >
                  <option value="idea">Idee (zur Abstimmung)</option>
                  <option value="planned">Geplant</option>
                  <option value="confirmed">Bestätigt / Gebucht</option>
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Art der Verpflegung
              </label>
              <select
                value={mealStyle}
                onChange={(e) => setMealStyle(e.target.value as MealStyle)}
                className="w-full bg-white rounded-2xl px-3 py-2 text-xs font-semibold border border-black/10"
              >
                <option value="cook">Selbst kochen</option>
                <option value="restaurant">Restaurant</option>
                <option value="bakery">Bäckerei / Café</option>
                <option value="delivery">Lieferservice</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2">
              <label className="text-xs font-bold text-[#141416] block mb-1">
                {mode === 'activity' ? 'Ort / Treffpunkt' : 'Restaurant / Rezept-Idee'}
              </label>
              <input
                type="text"
                placeholder={
                  mode === 'activity'
                    ? 'z.B. Hafen Cala Figuera'
                    : 'z.B. Es Cantonet oder Finca-Grill'
                }
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-white rounded-2xl px-3.5 py-2 text-xs border border-black/10"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Kosten p.P. (€)
              </label>
              <input
                type="number"
                min="0"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                className="w-full bg-white rounded-2xl px-3 py-2 text-xs border border-black/10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#141416] block mb-1">
              Beschreibung & Details
            </label>
            <textarea
              rows={2}
              placeholder="Was müssen die anderen wissen? Tipps, Links oder Details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white rounded-2xl px-3.5 py-2 text-xs border border-black/10 resize-none"
            />
          </div>

          {mode === 'meal' && (
            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Einkaufsnotizen (optional)
              </label>
              <input
                type="text"
                placeholder="z.B. Frischer Fisch vom Markt, Zitronen, Aioli..."
                value={shoppingNotes}
                onChange={(e) => setShoppingNotes(e.target.value)}
                className="w-full bg-white rounded-2xl px-3.5 py-2 text-xs border border-black/10"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(false)}
              className="px-4 py-2.5 rounded-full text-xs font-bold bg-[#EFECE6] text-neutral-700 hover:bg-black/10"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#141416] text-white hover:bg-neutral-800 shadow-sm"
            >
              Vorschlag speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ScheduleView: React.FC = () => {
  const {
    trip,
    currentUser,
    selectedDay,
    setSelectedDay,
    addActivity,
    toggleActivityVote,
    updateActivityStatus,
    deleteActivity,
  } = useVacation();

  const [viewAllDays, setViewAllDays] = useState(false);
  const [sortBy, setSortBy] = useState<'time' | 'votes'>('time');
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // New Activity Form State
  const [title, setTitle] = useState('');
  const [formDay, setFormDay] = useState<number>(selectedDay);
  const [timeSlot, setTimeSlot] = useState('10:00');
  const [endTime, setEndTime] = useState('12:30');
  const [category, setCategory] = useState<ActivityCategory>('activity');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('20');
  const [status, setStatus] = useState<DayActivity['status']>('idea');

  React.useEffect(() => {
    setFormDay(selectedDay);
  }, [selectedDay]);

  const getDayDateLabel = (dayNumber: number) => {
    const base = trip.startDate ? new Date(`${trip.startDate}T00:00:00`) : new Date(2026, 6, 15);
    if (isNaN(base.getTime())) return `Tag ${dayNumber}`;
    const dt = new Date(base);
    dt.setDate(base.getDate() + (dayNumber - 1));
    return dt.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
  };

  const filteredActivities = useMemo(() => {
    return trip.activities
      .filter((a) => (viewAllDays ? true : a.dayNumber === selectedDay))
      .filter((a) => (categoryFilter === 'all' ? true : a.category === categoryFilter))
      .sort((a, b) => {
        if (sortBy === 'votes') {
          const diff = b.votes.length - a.votes.length;
          if (diff !== 0) return diff;
        }
        if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
        return a.timeSlot.localeCompare(b.timeSlot);
      });
  }, [trip.activities, viewAllDays, selectedDay, categoryFilter, sortBy]);

  const getTraveler = (id: string) =>
    trip.travelers.find((t) => t.id === id) || {
      id,
      name: 'Mitreisender',
      initials: 'MR',
      color: '#E8C2E8',
    };

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addActivity({
      dayNumber: formDay,
      timeSlot,
      endTime: endTime || undefined,
      title: title.trim(),
      category,
      location: location.trim() || trip.destination,
      description: description.trim() || 'Gemeinsamer Vorschlag für den Tagesplan.',
      estimatedCost: Math.max(0, Number(estimatedCost) || 0),
      status,
    });

    setTitle('');
    setLocation('');
    setDescription('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#EFECE6] rounded-[28px] p-6 border border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#F4DF7B] text-[#141416] mb-2">
            <Calendar className="w-3.5 h-3.5" />
            Tagesplan & Aktivitäten-Vorschläge
          </span>
          <h1 className="text-2xl font-extrabold text-[#141416]">
            Was unternehmen wir wann?
          </h1>
          <p className="text-xs text-neutral-600 mt-1">
            Sammelt Ideen für jeden Urlaubstag, stimmt als{' '}
            <strong className="text-[#141416]">{currentUser.name}</strong> über eure Favoriten ab und legt das Programm fest.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="bg-[#141416] hover:bg-neutral-800 text-white rounded-full px-5 py-3 text-xs font-bold flex items-center gap-2 self-start md:self-auto shadow-sm transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Formular schließen' : '+ Aktivität vorschlagen'}</span>
        </button>
      </div>

      {/* Horizontal Day Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          type="button"
          onClick={() => setViewAllDays(true)}
          className={`px-4 py-3 rounded-[20px] text-left transition-all shrink-0 border ${
            viewAllDays
              ? 'bg-[#141416] text-white border-[#141416] shadow-sm'
              : 'bg-[#EFECE6] text-[#141416] border-black/5 hover:bg-[#E8C2E8]/50'
          }`}
        >
          <div className="text-xs font-bold">Alle Tage</div>
          <div
            className={`text-[11px] ${
              viewAllDays ? 'text-neutral-300' : 'text-neutral-500'
            }`}
          >
            {trip.activities.length} Vorschläge
          </div>
        </button>

        {Array.from({ length: trip.totalDays }, (_, i) => i + 1).map((dayNum) => {
          const isSelected = !viewAllDays && selectedDay === dayNum;
          const actCount = trip.activities.filter((a) => a.dayNumber === dayNum).length;
          const mealCount = trip.meals.filter((m) => m.dayNumber === dayNum).length;

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => {
                setViewAllDays(false);
                setSelectedDay(dayNum);
              }}
              className={`px-4 py-3 rounded-[20px] text-left transition-all shrink-0 border ${
                isSelected
                  ? 'bg-[#E8C2E8] text-[#141416] border-[#141416]/20 shadow-sm scale-[1.02]'
                  : 'bg-[#EFECE6] text-[#141416] border-black/5 hover:bg-[#F4DF7B]/50'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-extrabold">Tag {dayNum}</span>
                <span className="text-[10px] font-semibold opacity-75">
                  {getDayDateLabel(dayNum)}
                </span>
              </div>
              <div className="text-[11px] text-neutral-600 mt-0.5 font-medium">
                {actCount} Akt. • {mealCount} Essen
              </div>
            </button>
          );
        })}
      </div>

      {/* Inline Propose New Activity Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateActivity}
          className="bg-[#E8C2E8]/40 rounded-[26px] p-6 border border-[#141416]/10 space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#141416]">
                Neue Aktivität / Ausflug vorschlagen
              </h3>
              <p className="text-xs text-neutral-600">
                Vorgeschlagen von <strong>{currentUser.name}</strong> – andere Reisende können sofort abstimmen.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Titel der Aktivität *
              </label>
              <input
                type="text"
                required
                placeholder="z.B. Katamaran-Tour bei Sonnenuntergang"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-xs font-medium border border-black/10"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Tag auswählen
              </label>
              <select
                value={formDay}
                onChange={(e) => setFormDay(Number(e.target.value))}
                className="w-full bg-white rounded-2xl px-3 py-2.5 text-xs font-semibold border border-black/10"
              >
                {Array.from({ length: trip.totalDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Tag {d} ({getDayDateLabel(d)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Kategorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                className="w-full bg-white rounded-2xl px-3 py-2.5 text-xs font-semibold border border-black/10"
              >
                <option value="beach">Strand & Meer</option>
                <option value="activity">Ausflug & Action</option>
                <option value="culture">Kultur & Sightseeing</option>
                <option value="transport">Transfer & Route</option>
                <option value="nightlife">Abend & Nightlife</option>
                <option value="other">Sonstiges</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Startzeit
              </label>
              <input
                type="time"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full bg-white rounded-2xl px-3 py-2 text-xs font-semibold border border-black/10"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Endzeit
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-white rounded-2xl px-3 py-2 text-xs font-semibold border border-black/10"
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Ort / Treffpunkt
              </label>
              <input
                type="text"
                placeholder="z.B. Cala Llombards"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-white rounded-2xl px-3 py-2 text-xs border border-black/10"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Kosten p.P. (€)
              </label>
              <input
                type="number"
                min="0"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                className="w-full bg-white rounded-2xl px-3 py-2 text-xs border border-black/10"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DayActivity['status'])}
                className="w-full bg-white rounded-2xl px-3 py-2 text-xs font-semibold border border-black/10"
              >
                <option value="idea">Idee</option>
                <option value="planned">Geplant</option>
                <option value="confirmed">Bestätigt</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#141416] block mb-1">
              Beschreibung & Infos für die Gruppe
            </label>
            <textarea
              rows={2}
              placeholder="Was macht diesen Vorschlag besonders? Müssen wir vorab reservieren oder Tickets buchen?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white rounded-2xl px-3.5 py-2 text-xs border border-black/10 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-full text-xs font-bold bg-white/80 text-neutral-700"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#141416] text-white hover:bg-neutral-800"
            >
              Aktivität speichern
            </button>
          </div>
        </form>
      )}

      {/* Filter & Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-neutral-500 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {(
            [
              { id: 'all', label: 'Alle' },
              { id: 'beach', label: 'Strand' },
              { id: 'activity', label: 'Action & Ausflug' },
              { id: 'culture', label: 'Kultur' },
              { id: 'transport', label: 'Transfer' },
              { id: 'nightlife', label: 'Nightlife' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                categoryFilter === cat.id
                  ? 'bg-[#141416] text-white'
                  : 'bg-[#EFECE6] text-neutral-700 hover:bg-[#E8C2E8]/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSortBy((prev) => (prev === 'time' ? 'votes' : 'time'))}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#EFECE6] hover:bg-[#F4DF7B] text-[#141416] transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          Sortiert nach: {sortBy === 'time' ? 'Uhrzeit' : 'Beliebtheit (Votes)'}
        </button>
      </div>

      {/* Activity Cards Grid */}
      {filteredActivities.length === 0 ? (
        <div className="bg-[#EFECE6]/60 rounded-[28px] p-10 text-center border border-dashed border-black/10">
          <Sparkles className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-[#141416]">
            Keine Aktivitäten für diese Auswahl gefunden
          </h3>
          <p className="text-xs text-neutral-500 mt-1 mb-4">
            Füge oben den ersten Vorschlag für diesen Tag hinzu!
          </p>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="bg-[#141416] text-white rounded-full px-5 py-2.5 text-xs font-bold"
          >
            + Jetzt Vorschlag erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredActivities.map((act) => {
            const catMeta = CATEGORY_META[act.category];
            const proposer = getTraveler(act.createdBy);
            const hasVoted = act.votes.includes(currentUser.id);

            return (
              <div
                key={act.id}
                className="bg-[#EFECE6]/80 hover:bg-[#EFECE6] rounded-[26px] p-5 border border-black/5 flex flex-col justify-between gap-4 transition-all shadow-xs"
              >
                <div>
                  {/* Top Meta Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {viewAllDays && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#141416] text-white">
                          Tag {act.dayNumber}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-white text-[#141416]">
                        <Clock className="w-3 h-3 text-neutral-500" />
                        {act.timeSlot}
                        {act.endTime ? ` – ${act.endTime}` : ''}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${catMeta.badgeBg}`}
                      >
                        {catMeta.icon}
                        <span>{catMeta.label}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteActivity(act.id)}
                      className="w-7 h-7 rounded-full hover:bg-red-100 text-neutral-400 hover:text-red-600 flex items-center justify-center transition-colors"
                      title="Vorschlag löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-extrabold text-[#141416] leading-snug">
                    {act.title}
                  </h3>
                  <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                    {act.description}
                  </p>

                  {/* Location, Cost & Proposer Badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-3.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-700 bg-white/80 px-2.5 py-1 rounded-full">
                      <MapPin className="w-3 h-3 text-neutral-500" />
                      {act.location}
                    </span>

                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#141416] bg-[#F4DF7B]/70 px-2.5 py-1 rounded-full">
                      {act.estimatedCost > 0
                        ? `ca. ${act.estimatedCost} € p.P.`
                        : 'Kostenlos'}
                    </span>

                    <span className="inline-flex items-center gap-1.5 text-[11px] text-neutral-600 bg-white/60 px-2.5 py-1 rounded-full">
                      <span
                        style={{ backgroundColor: proposer.color }}
                        className="w-4 h-4 rounded-full text-[9px] font-bold text-[#141416] flex items-center justify-center"
                      >
                        {proposer.initials}
                      </span>
                      Idee von {proposer.name}
                    </span>
                  </div>
                </div>

                {/* Footer: Status Switcher & Interactive Voting */}
                <div className="pt-3.5 border-t border-black/5 flex flex-wrap items-center justify-between gap-3">
                  {/* Status Switcher */}
                  <div className="flex items-center gap-1 bg-white/70 p-1 rounded-full">
                    {STATUS_OPTIONS.map((st) => {
                      const active = act.status === st.value;
                      return (
                        <button
                          key={st.value}
                          type="button"
                          onClick={() => updateActivityStatus(act.id, st.value)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                            active
                              ? `${st.pillClass} shadow-2xs`
                              : 'text-neutral-500 hover:text-[#141416]'
                          }`}
                        >
                          {st.icon}
                          <span>{st.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Voters & Vote Button */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center -space-x-1.5">
                      {act.votes.map((voterId) => {
                        const voter = getTraveler(voterId);
                        return (
                          <span
                            key={voterId}
                            style={{ backgroundColor: voter.color }}
                            className="w-6 h-6 rounded-full text-[10px] font-bold text-[#141416] flex items-center justify-center ring-2 ring-[#EFECE6]"
                            title={`${voter.name} stimmt dafür`}
                          >
                            {voter.initials}
                          </span>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleActivityVote(act.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                        hasVoted
                          ? 'bg-[#141416] text-white shadow-xs'
                          : 'bg-white hover:bg-[#E8C2E8] text-[#141416]'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>
                        {hasVoted ? 'Abgestimmt' : 'Vote'} ({act.votes.length})
                      </span>
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
};

export default ScheduleView;
