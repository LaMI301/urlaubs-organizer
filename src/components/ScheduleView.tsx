import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Pencil,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertTriangle,
  Map as MapIcon,
  Route,
  GripVertical,
  ArrowRightLeft,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import {
  ActivityCategory,
  DayActivity,
  MealType,
  MealStyle,
} from '../types/vacation';
import {
  buildGoogleMapsDayRouteUrl,
  buildGoogleMapsUrl,
  clampCost,
  compareTimeSlots,
  detectDayConflicts,
  formatCurrency,
  formatTripDayDate,
  isGenericLocation,
  isValidTimeRange,
  parseTimeToMinutes,
  roundCents,
} from '../utils/vacationHelpers';

const CATEGORY_META: Record<
  ActivityCategory,
  { label: string; iconBg: string; badgeClass: string; icon: React.ReactNode }
> = {
  beach: {
    label: 'Strand & Meer',
    iconBg: 'bg-cyan-400/15 border border-cyan-400/30 text-cyan-300',
    badgeClass: 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/30',
    icon: <Sun className="w-3.5 h-3.5 text-cyan-300" />,
  },
  activity: {
    label: 'Ausflug & Action',
    iconBg: 'bg-emerald-400/15 border border-emerald-400/30 text-emerald-300',
    badgeClass: 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/30',
    icon: <Compass className="w-3.5 h-3.5 text-emerald-300" />,
  },
  culture: {
    label: 'Kultur & Sightseeing',
    iconBg: 'bg-violet-400/15 border border-violet-400/30 text-violet-300',
    badgeClass: 'bg-violet-400/15 text-violet-300 border border-violet-400/30',
    icon: <Landmark className="w-3.5 h-3.5 text-violet-300" />,
  },
  transport: {
    label: 'Transfer & Route',
    iconBg: 'bg-sky-400/15 border border-sky-400/30 text-sky-300',
    badgeClass: 'bg-sky-400/15 text-sky-300 border border-sky-400/30',
    icon: <Car className="w-3.5 h-3.5 text-sky-300" />,
  },
  nightlife: {
    label: 'Abend & Nightlife',
    iconBg: 'bg-amber-400/15 border border-amber-400/30 text-amber-300',
    badgeClass: 'bg-amber-400/15 text-amber-300 border border-amber-400/30',
    icon: <Music className="w-3.5 h-3.5 text-amber-300" />,
  },
  other: {
    label: 'Sonstiges',
    iconBg: 'bg-slate-400/15 border border-slate-400/30 text-slate-300',
    badgeClass: 'bg-slate-400/15 text-slate-300 border border-slate-400/30',
    icon: <Sparkles className="w-3.5 h-3.5 text-slate-300" />,
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
    pillClass: 'bg-amber-400/20 text-amber-200 border border-amber-400/40',
    icon: <Lightbulb className="w-3.5 h-3.5" />,
  },
  {
    value: 'planned',
    label: 'Geplant',
    pillClass: 'bg-cyan-400/20 text-cyan-200 border border-cyan-400/40',
    icon: <CalendarCheck className="w-3.5 h-3.5" />,
  },
  {
    value: 'confirmed',
    label: 'Bestätigt',
    pillClass: 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/40',
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
    showToast,
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
  const [timeError, setTimeError] = useState<string | null>(null);

  const safeTotalDays = Math.max(1, trip.totalDays || 1);
  const currency = trip.currency || 'EUR';

  const resetAllFields = (targetDay = selectedDay) => {
    setMode('activity');
    setDayNumber(Math.max(1, Math.min(targetDay || 1, safeTotalDays)));
    setTitle('');
    setTimeSlot('10:00');
    setEndTime('13:00');
    setCategory('activity');
    setLocation('');
    setDescription('');
    setEstimatedCost('25');
    setStatus('idea');
    setMealType('dinner');
    setMealStyle('restaurant');
    setShoppingNotes('');
    setTimeError(null);
  };

  const handleClose = () => {
    resetAllFields(selectedDay);
    setIsQuickAddOpen(false);
  };

  // Sync dayNumber when opening modal cleanly
  useEffect(() => {
    if (isQuickAddOpen) {
      setDayNumber(Math.max(1, Math.min(selectedDay || 1, safeTotalDays)));
      setTimeError(null);
    }
  }, [isQuickAddOpen, selectedDay, safeTotalDays]);

  // ESC key handler
  useEffect(() => {
    if (!isQuickAddOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        resetAllFields(selectedDay);
        setIsQuickAddOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isQuickAddOpen, selectedDay, safeTotalDays, setIsQuickAddOpen]);

  if (!isQuickAddOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    if (parseTimeToMinutes(timeSlot) === null) {
      setTimeError('Bitte gib eine gültige Startzeit (HH:MM) ein.');
      return;
    }

    if (mode === 'activity' && endTime.trim() && !isValidTimeRange(timeSlot, endTime)) {
      setTimeError('Die Endzeit muss strikt nach der Startzeit liegen.');
      return;
    }

    const parsedCost = clampCost(estimatedCost) ?? 0;

    if (mode === 'activity') {
      addActivity({
        dayNumber,
        timeSlot,
        endTime: endTime.trim() || undefined,
        title: trimmedTitle,
        category,
        location: location.trim() || trip.destination,
        description: description.trim() || 'Gemeinsamer Aktivitätsvorschlag.',
        estimatedCost: parsedCost,
        status,
      });
      showToast(`Aktivität „${trimmedTitle}“ hinzugefügt`, 'success');
    } else {
      addMeal({
        dayNumber,
        mealType,
        style: mealStyle,
        title: trimmedTitle,
        time: timeSlot,
        locationOrRecipe: location.trim() || 'Gemeinsames Essen',
        description: description.trim() || 'Essensvorschlag für die Gruppe.',
        ShoppingNotes: shoppingNotes.trim() || undefined,
        estimatedCostPerPerson: parsedCost,
        assignedTeam: [currentUser.id],
      });
      showToast(`Essensvorschlag „${trimmedTitle}“ hinzugefügt`, 'success');
    }

    resetAllFields(selectedDay);
    setIsQuickAddOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="aurora-glass-elevated rounded-[28px] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0">
              {mode === 'activity' ? (
                <Sparkles className="w-5 h-5" />
              ) : (
                <Utensils className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3
                id="quick-add-modal-title"
                className="text-lg font-black text-slate-100"
              >
                Neuen Vorschlag einreichen
              </h3>
              <p className="text-xs text-slate-400">
                Du schlägst gerade vor als{' '}
                <strong className="text-slate-200">{currentUser.name}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Dialog schließen"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switch */}
        <div className="grid grid-cols-2 gap-1.5 bg-white/5 border border-white/10 p-1 rounded-full text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('activity');
              setTimeError(null);
            }}
            className={`py-2 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'activity'
                ? 'bg-cyan-400 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Aktivität / Ausflug
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('meal');
              setTimeError(null);
            }}
            className={`py-2 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'meal'
                ? 'bg-cyan-400 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            Essens-Vorschlag
          </button>
        </div>

        {timeError && (
          <div className="rounded-2xl bg-rose-500/15 border border-rose-400/40 px-3.5 py-2.5 text-xs font-semibold text-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
            <span>{timeError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label
              htmlFor="quickadd-title"
              className="text-xs font-bold text-slate-300 block mb-1.5"
            >
              Titel des Vorschlags *
            </label>
            <input
              id="quickadd-title"
              type="text"
              required
              autoFocus
              placeholder={
                mode === 'activity'
                  ? 'z.B. Bootstour zur Blauen Lagune'
                  : 'z.B. Paella-Abend auf der Finca-Terrasse'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full aurora-input rounded-2xl px-3.5 py-2.5 text-sm font-semibold placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label
                htmlFor="quickadd-day"
                className="text-xs font-bold text-slate-300 block mb-1.5"
              >
                Reisetag
              </label>
              <select
                id="quickadd-day"
                value={dayNumber}
                onChange={(e) => setDayNumber(Number(e.target.value))}
                className="w-full aurora-input rounded-2xl px-3 py-2 text-xs font-bold [color-scheme:dark]"
              >
                {Array.from({ length: safeTotalDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d} className="bg-[#131823] text-slate-100">
                    Tag {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="quickadd-start"
                className="text-xs font-bold text-slate-300 block mb-1.5"
              >
                Startzeit
              </label>
              <input
                id="quickadd-start"
                type="time"
                value={timeSlot}
                onChange={(e) => {
                  setTimeSlot(e.target.value);
                  if (timeError) setTimeError(null);
                }}
                className="w-full aurora-input rounded-2xl px-3 py-2 text-xs font-mono tabular-nums font-bold [color-scheme:dark]"
              />
            </div>

            {mode === 'activity' ? (
              <div>
                <label
                  htmlFor="quickadd-end"
                  className="text-xs font-bold text-slate-300 block mb-1.5"
                >
                  Endzeit
                </label>
                <input
                  id="quickadd-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    if (timeError) setTimeError(null);
                  }}
                  className="w-full aurora-input rounded-2xl px-3 py-2 text-xs font-mono tabular-nums font-bold [color-scheme:dark]"
                />
              </div>
            ) : (
              <div>
                <label
                  htmlFor="quickadd-meal-type"
                  className="text-xs font-bold text-slate-300 block mb-1.5"
                >
                  Mahlzeit
                </label>
                <select
                  id="quickadd-meal-type"
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealType)}
                  className="w-full aurora-input rounded-2xl px-3 py-2 text-xs font-bold [color-scheme:dark]"
                >
                  <option value="breakfast" className="bg-[#131823] text-slate-100">
                    Frühstück
                  </option>
                  <option value="lunch" className="bg-[#131823] text-slate-100">
                    Mittagessen
                  </option>
                  <option value="dinner" className="bg-[#131823] text-slate-100">
                    Abendessen
                  </option>
                  <option value="snack" className="bg-[#131823] text-slate-100">
                    Snacks & Drinks
                  </option>
                </select>
              </div>
            )}
          </div>

          {mode === 'activity' ? (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="quickadd-cat"
                  className="text-xs font-bold text-slate-300 block mb-1.5"
                >
                  Kategorie
                </label>
                <select
                  id="quickadd-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                  className="w-full aurora-input rounded-2xl px-3 py-2 text-xs font-bold [color-scheme:dark]"
                >
                  <option value="beach" className="bg-[#131823] text-slate-100">
                    Strand & Meer
                  </option>
                  <option value="activity" className="bg-[#131823] text-slate-100">
                    Ausflug & Action
                  </option>
                  <option value="culture" className="bg-[#131823] text-slate-100">
                    Kultur & Sightseeing
                  </option>
                  <option value="transport" className="bg-[#131823] text-slate-100">
                    Transfer & Route
                  </option>
                  <option value="nightlife" className="bg-[#131823] text-slate-100">
                    Abend & Nightlife
                  </option>
                  <option value="other" className="bg-[#131823] text-slate-100">
                    Sonstiges
                  </option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="quickadd-status"
                  className="text-xs font-bold text-slate-300 block mb-1.5"
                >
                  Status
                </label>
                <select
                  id="quickadd-status"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as DayActivity['status'])
                  }
                  className="w-full aurora-input rounded-2xl px-3 py-2 text-xs font-bold [color-scheme:dark]"
                >
                  <option value="idea" className="bg-[#131823] text-slate-100">
                    Idee (zur Abstimmung)
                  </option>
                  <option value="planned" className="bg-[#131823] text-slate-100">
                    Geplant
                  </option>
                  <option value="confirmed" className="bg-[#131823] text-slate-100">
                    Bestätigt / Gebucht
                  </option>
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label
                htmlFor="quickadd-meal-style"
                className="text-xs font-bold text-slate-300 block mb-1.5"
              >
                Art der Verpflegung
              </label>
              <select
                id="quickadd-meal-style"
                value={mealStyle}
                onChange={(e) => setMealStyle(e.target.value as MealStyle)}
                className="w-full aurora-input rounded-2xl px-3 py-2 text-xs font-bold [color-scheme:dark]"
              >
                <option value="cook" className="bg-[#131823] text-slate-100">
                  Selbst kochen
                </option>
                <option value="restaurant" className="bg-[#131823] text-slate-100">
                  Restaurant
                </option>
                <option value="bakery" className="bg-[#131823] text-slate-100">
                  Bäckerei / Café
                </option>
                <option value="delivery" className="bg-[#131823] text-slate-100">
                  Lieferservice
                </option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2">
              <label
                htmlFor="quickadd-loc"
                className="text-xs font-bold text-slate-300 block mb-1.5"
              >
                {mode === 'activity' ? 'Ort / Treffpunkt' : 'Restaurant / Rezept-Idee'}
              </label>
              <input
                id="quickadd-loc"
                type="text"
                placeholder={
                  mode === 'activity'
                    ? 'z.B. Hafen Cala Figuera'
                    : 'z.B. Es Cantonet oder Finca-Grill'
                }
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full aurora-input rounded-2xl px-3.5 py-2 text-xs font-semibold placeholder:text-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="quickadd-cost"
                className="text-xs font-bold text-slate-300 block mb-1.5"
              >
                Kosten p.P. ({currency})
              </label>
              <input
                id="quickadd-cost"
                type="number"
                min="0"
                step="0.01"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                className="w-full aurora-input rounded-2xl px-3 py-2 text-xs font-mono tabular-nums font-semibold"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="quickadd-desc"
              className="text-xs font-bold text-slate-300 block mb-1.5"
            >
              Beschreibung & Details
            </label>
            <textarea
              id="quickadd-desc"
              rows={2}
              placeholder="Was müssen die anderen wissen? Tipps, Links oder Details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full aurora-input rounded-2xl px-3.5 py-2 text-xs placeholder:text-slate-500 resize-none"
            />
          </div>

          {mode === 'meal' && (
            <div>
              <label
                htmlFor="quickadd-notes"
                className="text-xs font-bold text-slate-300 block mb-1.5"
              >
                Einkaufsnotizen (optional)
              </label>
              <input
                id="quickadd-notes"
                type="text"
                placeholder="z.B. Frischer Fisch vom Markt, Zitronen, Aioli..."
                value={shoppingNotes}
                onChange={(e) => setShoppingNotes(e.target.value)}
                className="w-full aurora-input rounded-2xl px-3.5 py-2 text-xs placeholder:text-slate-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-200 cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full text-xs font-extrabold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.28)] cursor-pointer"
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
    updateActivity,
    toggleActivityVote,
    updateActivityStatus,
    deleteActivity,
    scheduleIdeaToDay,
    focusOnMap,
    searchTarget,
    setSearchTarget,
    showToast,
  } = useVacation();

  const [viewAllDays, setViewAllDays] = useState(false);
  const [sortBy, setSortBy] = useState<'time' | 'votes'>('time');
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<Record<number, boolean>>({});
  const [showOutOfRange, setShowOutOfRange] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Drag & Drop + Touch move state
  const [draggingActivityId, setDraggingActivityId] = useState<string | null>(null);
  const [draggingIdeaId, setDraggingIdeaId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [movingActivityId, setMovingActivityId] = useState<string | null>(null);
  const [showIdeaTray, setShowIdeaTray] = useState(false);

  // Inline Activity Form State
  const [title, setTitle] = useState('');
  const [formDay, setFormDay] = useState<number>(selectedDay);
  const [timeSlot, setTimeSlot] = useState('10:00');
  const [endTime, setEndTime] = useState('12:30');
  const [category, setCategory] = useState<ActivityCategory>('activity');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('20');
  const [status, setStatus] = useState<DayActivity['status']>('idea');
  const [formError, setFormError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  const safeTotalDays = Math.max(1, trip.totalDays || 1);
  const currency = trip.currency || 'EUR';

  // Only sync formDay with selectedDay when NOT editing and NOT creating
  useEffect(() => {
    if (!editingActivityId && !showAddForm) {
      setFormDay(selectedDay);
    }
  }, [selectedDay, editingActivityId, showAddForm]);

  // Spotlight search handler
  useEffect(() => {
    if (!searchTarget || searchTarget.kind !== 'activity') return;
    const targetId = searchTarget.id;
    const targetAct = trip.activities.find((a) => a.id === targetId);
    setCategoryFilter('all');
    if (targetAct) {
      if (targetAct.dayNumber >= 1 && targetAct.dayNumber <= safeTotalDays) {
        setViewAllDays(false);
        setSelectedDay(targetAct.dayNumber);
        setCollapsedDays((prev) => ({ ...prev, [targetAct.dayNumber]: false }));
      } else {
        setShowOutOfRange(true);
      }
    }
    setHighlightedId(targetId);
    setSearchTarget(null);
  }, [searchTarget, trip.activities, safeTotalDays, setSelectedDay, setSearchTarget]);

  // Scroll highlighted card into view
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

  const getDayDateLabel = (dayNumber: number) =>
    formatTripDayDate(trip.startDate, dayNumber, {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });

  // Lookup titles for conflict descriptions
  const itemLabelById = useMemo(() => {
    const map = new Map<string, string>();
    trip.activities.forEach((a) => map.set(a.id, `${a.title} (${a.timeSlot})`));
    trip.meals.forEach((m) => map.set(m.id, `Essen: ${m.title} (${m.time})`));
    return map;
  }, [trip.activities, trip.meals]);

  // Detect conflicts per day
  const conflictsByDay = useMemo(() => {
    const daySet = new Set<number>();
    trip.activities.forEach((a) => daySet.add(a.dayNumber));
    const map: Record<number, Record<string, string[]>> = {};
    daySet.forEach((d) => {
      map[d] = detectDayConflicts(trip.activities, trip.meals, d);
    });
    return map;
  }, [trip.activities, trip.meals]);

  // Unscheduled ideas for quick drag/drop or transfer
  const unscheduledIdeas = useMemo(() => {
    const linkedIds = new Set(
      trip.activities.map((a) => a.sourceIdeaId).filter(Boolean)
    );
    return (trip.ideas || []).filter(
      (i) => !linkedIds.has(i.id) && typeof i.assignedDay !== 'number'
    );
  }, [trip.ideas, trip.activities]);

  // In-range filtered activities (1..safeTotalDays)
  const inRangeFilteredActivities = useMemo(() => {
    return trip.activities
      .filter((a) => a.dayNumber >= 1 && a.dayNumber <= safeTotalDays)
      .filter((a) => (viewAllDays ? true : a.dayNumber === selectedDay))
      .filter((a) => (categoryFilter === 'all' ? true : a.category === categoryFilter))
      .sort((a, b) => {
        if (sortBy === 'votes') {
          const diff = b.votes.length - a.votes.length;
          if (diff !== 0) return diff;
        }
        if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
        return compareTimeSlots(a.timeSlot, b.timeSlot);
      });
  }, [
    trip.activities,
    safeTotalDays,
    viewAllDays,
    selectedDay,
    categoryFilter,
    sortBy,
  ]);

  // Out-of-range activities (dayNumber < 1 or > safeTotalDays) so nothing disappears silently!
  const outOfRangeActivities = useMemo(() => {
    return trip.activities
      .filter((a) => a.dayNumber < 1 || a.dayNumber > safeTotalDays)
      .filter((a) => (categoryFilter === 'all' ? true : a.category === categoryFilter))
      .sort((a, b) => {
        if (sortBy === 'votes') {
          const diff = b.votes.length - a.votes.length;
          if (diff !== 0) return diff;
        }
        if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
        return compareTimeSlots(a.timeSlot, b.timeSlot);
      });
  }, [trip.activities, safeTotalDays, categoryFilter, sortBy]);

  // Google Maps Day Route URL for currently selected day
  const selectedDayRouteUrl = useMemo(() => {
    if (viewAllDays) return null;
    const chronoLocations = trip.activities
      .filter((a) => a.dayNumber === selectedDay && a.status !== 'idea')
      .sort((a, b) => compareTimeSlots(a.timeSlot, b.timeSlot))
      .map((a) => a.location);
    if (chronoLocations.length === 0) {
      return buildGoogleMapsDayRouteUrl(
        trip.activities
          .filter((a) => a.dayNumber === selectedDay)
          .sort((a, b) => compareTimeSlots(a.timeSlot, b.timeSlot))
          .map((a) => a.location)
      );
    }
    return buildGoogleMapsDayRouteUrl(chronoLocations);
  }, [trip.activities, viewAllDays, selectedDay]);

  const getTraveler = (id: string) =>
    trip.travelers.find((t) => t.id === id) || {
      id,
      name: 'Unbekannt',
      initials: '?',
      color: '#94A3B8',
    };

  const resetForm = () => {
    setTitle('');
    setFormDay(selectedDay);
    setTimeSlot('10:00');
    setEndTime('12:30');
    setCategory('activity');
    setLocation('');
    setDescription('');
    setEstimatedCost('20');
    setStatus('idea');
    setEditingActivityId(null);
    setFormError(null);
  };

  const scrollToForm = () => {
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  };

  const handleStartEdit = (act: DayActivity) => {
    setEditingActivityId(act.id);
    setTitle(act.title);
    setFormDay(
      act.dayNumber >= 1 && act.dayNumber <= safeTotalDays
        ? act.dayNumber
        : selectedDay
    );
    setTimeSlot(act.timeSlot);
    setEndTime(act.endTime || '');
    setCategory(act.category);
    setLocation(act.location);
    setDescription(act.description);
    setEstimatedCost(String(act.estimatedCost));
    setStatus(act.status);
    setFormError(null);
    setShowAddForm(true);
    scrollToForm();
  };

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Bitte gib einen Titel für die Aktivität ein.');
      return;
    }

    if (parseTimeToMinutes(timeSlot) === null) {
      setFormError('Bitte gib eine gültige Startzeit (HH:MM) ein.');
      return;
    }

    if (endTime.trim() && !isValidTimeRange(timeSlot, endTime)) {
      setFormError('Die Endzeit muss strikt nach der Startzeit liegen.');
      showToast('Endzeit muss nach der Startzeit liegen', 'warning');
      return;
    }

    const parsedCost = clampCost(estimatedCost) ?? 0;

    const payload = {
      dayNumber: Math.max(1, Math.min(Math.round(formDay) || 1, safeTotalDays)),
      timeSlot,
      endTime: endTime.trim() || undefined,
      title: trimmedTitle,
      category,
      location: location.trim() || trip.destination,
      description: description.trim() || 'Gemeinsamer Vorschlag für den Tagesplan.',
      estimatedCost: parsedCost,
      status,
    };

    if (editingActivityId) {
      updateActivity(editingActivityId, payload);
      showToast(`Aktivität „${trimmedTitle}“ gespeichert`, 'success');
    } else {
      addActivity(payload);
      showToast(`Aktivität „${trimmedTitle}“ hinzugefügt`, 'success');
    }

    resetForm();
    setShowAddForm(false);
  };

  const toggleDayCollapse = (dayNum: number) => {
    setCollapsedDays((prev) => ({ ...prev, [dayNum]: !prev[dayNum] }));
  };

  const handleMoveActivityToDay = (act: DayActivity, targetDay: number) => {
    const clampedDay = Math.max(1, Math.min(targetDay, safeTotalDays));
    if (act.dayNumber === clampedDay) {
      setMovingActivityId(null);
      return;
    }
    updateActivity(act.id, { dayNumber: clampedDay });
    setMovingActivityId(null);
    showToast(`„${act.title}“ auf Tag ${clampedDay} verschoben`, 'success');
  };

  const handleDayPillDrop = (
    e: React.DragEvent<HTMLButtonElement>,
    targetDay: number
  ) => {
    e.preventDefault();
    setDragOverDay(null);

    const droppedActId = e.dataTransfer.getData('application/x-vacayly-activity');
    const droppedIdeaId = e.dataTransfer.getData('application/x-vacayly-idea');

    let parsedKind: 'activity' | 'idea' | null = null;
    let parsedId = '';

    if (droppedActId) {
      parsedKind = 'activity';
      parsedId = droppedActId;
    } else if (droppedIdeaId) {
      parsedKind = 'idea';
      parsedId = droppedIdeaId;
    } else {
      try {
        const parsed = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (
          (parsed?.kind === 'activity' || parsed?.kind === 'idea') &&
          typeof parsed.id === 'string'
        ) {
          parsedKind = parsed.kind;
          parsedId = parsed.id;
        }
      } catch {
        // ignore
      }
    }

    if (!parsedKind && draggingActivityId) {
      parsedKind = 'activity';
      parsedId = draggingActivityId;
    } else if (!parsedKind && draggingIdeaId) {
      parsedKind = 'idea';
      parsedId = draggingIdeaId;
    }

    setDraggingActivityId(null);
    setDraggingIdeaId(null);

    if (!parsedId) return;

    if (parsedKind === 'activity') {
      const targetAct = trip.activities.find((a) => a.id === parsedId);
      if (targetAct) {
        handleMoveActivityToDay(targetAct, targetDay);
      }
    } else if (parsedKind === 'idea') {
      scheduleIdeaToDay(parsedId, targetDay, '10:00');
    }
  };

  const renderActivityCard = (act: DayActivity) => {
    const catMeta = CATEGORY_META[act.category] || CATEGORY_META.other;
    const proposer = getTraveler(act.createdBy);
    const hasVoted = act.votes.includes(currentUser.id);
    const isConfirmingDelete = confirmDeleteId === act.id;
    const isMoving = movingActivityId === act.id;
    const isHighlighted = highlightedId === act.id;
    const isDragging = draggingActivityId === act.id;

    const dayConflicts = conflictsByDay[act.dayNumber] || {};
    const conflictingIds = dayConflicts[act.id] || [];
    const conflictLabels = conflictingIds
      .map((id) => itemLabelById.get(id))
      .filter((lbl): lbl is string => Boolean(lbl));

    const mapsUrl = buildGoogleMapsUrl(act.location);
    const canFocusOnMap =
      !isGenericLocation(act.location) ||
      (typeof act.lat === 'number' && typeof act.lng === 'number');

    return (
      <div
        key={act.id}
        data-search-id={act.id}
        draggable
        onDragStart={(e) => {
          setDraggingActivityId(act.id);
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('application/x-vacayly-activity', act.id);
          e.dataTransfer.setData(
            'text/plain',
            JSON.stringify({ kind: 'activity', id: act.id })
          );
        }}
        onDragEnd={() => {
          setDraggingActivityId(null);
          setDragOverDay(null);
        }}
        className={`rounded-[24px] p-5 flex flex-col justify-between gap-4 transition-all cursor-grab active:cursor-grabbing ${
          isHighlighted
            ? 'aurora-glass-elevated ring-2 ring-cyan-400 shadow-[0_0_28px_rgba(34,211,238,0.3)]'
            : isDragging
            ? 'aurora-glass opacity-60 scale-[0.98] border-cyan-400/50'
            : conflictLabels.length > 0
            ? 'aurora-glass border-amber-400/45 shadow-[0_0_20px_rgba(251,191,36,0.12)]'
            : 'aurora-glass hover:border-cyan-400/35'
        }`}
      >
        <div>
          {/* Top Meta Row */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <GripVertical className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              {(viewAllDays ||
                act.dayNumber < 1 ||
                act.dayNumber > safeTotalDays) && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-mono tabular-nums font-extrabold bg-cyan-400/20 text-cyan-200 border border-cyan-400/40">
                  Tag {act.dayNumber}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono tabular-nums font-bold bg-white/10 text-slate-100 border border-white/10">
                <Clock className="w-3 h-3 text-cyan-400" />
                {act.timeSlot}
                {act.endTime ? ` – ${act.endTime}` : ''}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${catMeta.badgeClass}`}
              >
                {catMeta.icon}
                <span>{catMeta.label}</span>
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setMovingActivityId((prev) => (prev === act.id ? null : act.id))
                }
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  isMoving
                    ? 'bg-cyan-400 text-slate-950'
                    : 'hover:bg-white/10 text-slate-400 hover:text-cyan-300'
                }`}
                title="Auf anderen Tag verschieben"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleStartEdit(act)}
                className="w-7 h-7 rounded-full hover:bg-white/10 text-slate-400 hover:text-cyan-300 flex items-center justify-center transition-colors cursor-pointer"
                title="Aktivität bearbeiten"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              {isConfirmingDelete ? (
                <div className="inline-flex items-center gap-1 bg-rose-500/15 border border-rose-400/40 rounded-full px-2 py-0.5 text-[10px] font-bold">
                  <span className="text-rose-200">Löschen?</span>
                  <button
                    type="button"
                    onClick={() => {
                      deleteActivity(act.id);
                      setConfirmDeleteId(null);
                    }}
                    className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white hover:bg-rose-400 cursor-pointer"
                  >
                    Ja
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-1.5 py-0.5 rounded-full bg-white/10 text-slate-200 hover:bg-white/20 cursor-pointer"
                  >
                    Nein
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(act.id)}
                  className="w-7 h-7 rounded-full hover:bg-rose-500/15 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                  title="Vorschlag löschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Touch-friendly Day Move Selector */}
          {isMoving && (
            <div className="mb-3 p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-400/35 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-[11px] font-bold text-cyan-200">
                <span>Auf welchen Tag verschieben?</span>
                <button
                  type="button"
                  onClick={() => setMovingActivityId(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: safeTotalDays }, (_, i) => i + 1).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleMoveActivityToDay(act, d)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono tabular-nums font-bold transition-all cursor-pointer ${
                      act.dayNumber === d
                        ? 'bg-cyan-400 text-slate-950'
                        : 'bg-white/10 hover:bg-cyan-400/25 text-slate-200'
                    }`}
                  >
                    Tag {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time Conflict Warning */}
          {conflictLabels.length > 0 && (
            <div className="mb-3 rounded-2xl bg-amber-500/15 border border-amber-400/40 px-3 py-2 text-[11px] text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <strong className="font-extrabold">Zeitkonflikt:</strong>{' '}
                <span>Überschneidet sich mit {conflictLabels.join(', ')}</span>
              </div>
            </div>
          )}

          {/* Title & Description */}
          <h3 className="text-base font-extrabold text-slate-100 leading-snug">
            {act.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            {act.description}
          </p>

          {/* Location, Map Focus, External Maps, Cost & Proposer Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3.5">
            {act.location && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-200 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full max-w-full">
                <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">{act.location}</span>
              </span>
            )}

            {canFocusOnMap && (
              <button
                type="button"
                onClick={() =>
                  focusOnMap({
                    kind: 'activity',
                    id: act.id,
                    title: act.title,
                    location: act.location || trip.destination,
                    lat: act.lat,
                    lng: act.lng,
                    dayNumber: act.dayNumber,
                    time: act.timeSlot,
                  })
                }
                className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 px-2.5 py-1 rounded-full border border-cyan-400/30 transition-colors cursor-pointer"
                title="Im Map-Cockpit anzeigen"
              >
                <MapIcon className="w-3 h-3" />
                <span>Auf Karte</span>
              </button>
            )}

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-200 bg-white/5 hover:bg-white/15 px-2.5 py-1 rounded-full border border-white/10 transition-colors"
                title={`In Google Maps öffnen: ${act.location}`}
              >
                <ExternalLink className="w-3 h-3 text-slate-400" />
                <span>Maps</span>
              </a>
            )}

            <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums font-bold text-amber-300 bg-amber-400/10 border border-amber-400/25 px-2.5 py-1 rounded-full">
              {act.estimatedCost > 0
                ? `ca. ${formatCurrency(act.estimatedCost, currency)} p.P.`
                : 'Kostenlos'}
            </span>

            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
              <span
                style={{ backgroundColor: proposer.color }}
                className="w-4 h-4 rounded-full text-[9px] font-black text-slate-950 flex items-center justify-center shrink-0"
              >
                {proposer.initials}
              </span>
              <span className="truncate max-w-[120px]">{proposer.name}</span>
            </span>
          </div>
        </div>

        {/* Footer: Status Switcher & Interactive Voting */}
        <div className="pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-full">
            {STATUS_OPTIONS.map((st) => {
              const active = act.status === st.value;
              return (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => updateActivityStatus(act.id, st.value)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    active
                      ? st.pillClass
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {st.icon}
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-1.5">
              {act.votes.slice(0, 4).map((voterId) => {
                const voter = trip.travelers.find((t) => t.id === voterId);
                if (!voter) return null;
                return (
                  <span
                    key={voterId}
                    style={{ backgroundColor: voter.color }}
                    className="w-6 h-6 rounded-full text-[10px] font-black text-slate-950 flex items-center justify-center ring-2 ring-[#131823]"
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
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                hasVoted
                  ? 'bg-cyan-400 text-slate-950 shadow-[0_0_14px_rgba(34,211,238,0.28)]'
                  : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">
                {hasVoted ? 'Abgestimmt' : 'Vote'} ({act.votes.length})
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="aurora-glass-elevated rounded-[28px] p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-52 h-52 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 mb-2">
              <Calendar className="w-3.5 h-3.5" />
              Tagesplan & Aktivitäten
            </span>
            <h1 className="text-2xl font-black text-slate-100">
              Was unternehmen wir wann?
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Sammelt Ideen, zieht Karten per Drag & Drop auf einen anderen Tag und plant als{' '}
              <strong className="text-slate-200">{currentUser.name}</strong> euer Tagesprogramm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {selectedDayRouteUrl && (
              <a
                href={selectedDayRouteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold bg-emerald-400/15 hover:bg-emerald-400/25 text-emerald-200 border border-emerald-400/35 transition-colors"
                title={`Route für Tag ${selectedDay} in Google Maps öffnen`}
              >
                <Route className="w-3.5 h-3.5 text-emerald-300" />
                <span>🗺️ Tagesroute in Google Maps</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                if (showAddForm) {
                  resetForm();
                  setShowAddForm(false);
                } else {
                  resetForm();
                  setShowAddForm(true);
                  scrollToForm();
                }
              }}
              className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-full px-5 py-2.5 text-xs font-extrabold flex items-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.28)] transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>
                {showAddForm ? 'Formular schließen' : '+ Aktivität vorschlagen'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Day Selector Bar (Drop Targets for Activities & Ideas) */}
      <div className="space-y-2">
        {(draggingActivityId || draggingIdeaId) && (
          <div className="text-xs font-bold text-cyan-300 flex items-center gap-2 px-1 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {draggingIdeaId
                ? 'Idee auf einen Tag ziehen, um sie dort einzuplanen!'
                : 'Aktivität auf einen Tag ziehen, um sie zu verschieben!'}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            type="button"
            onClick={() => setViewAllDays(true)}
            className={`px-4 py-3 rounded-[20px] text-left transition-all shrink-0 border cursor-pointer ${
              viewAllDays
                ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.3)]'
                : 'aurora-glass text-slate-200 hover:bg-white/10'
            }`}
          >
            <div className="text-xs font-extrabold">Alle Tage</div>
            <div
              className={`text-[11px] font-mono tabular-nums ${
                viewAllDays ? 'text-slate-900 font-bold' : 'text-slate-400'
              }`}
            >
              {trip.activities.length} Vorschläge
            </div>
          </button>

          {Array.from({ length: safeTotalDays }, (_, i) => i + 1).map((dayNum) => {
            const isSelected = !viewAllDays && selectedDay === dayNum;
            const actCount = trip.activities.filter((a) => a.dayNumber === dayNum).length;
            const mealCount = trip.meals.filter((m) => m.dayNumber === dayNum).length;
            const dayHasConflict = Object.keys(conflictsByDay[dayNum] || {}).length > 0;
            const isDropTarget = dragOverDay === dayNum;

            return (
              <button
                key={dayNum}
                type="button"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverDay !== dayNum) setDragOverDay(dayNum);
                }}
                onDragLeave={() => {
                  if (dragOverDay === dayNum) setDragOverDay(null);
                }}
                onDrop={(e) => handleDayPillDrop(e, dayNum)}
                onClick={() => {
                  setViewAllDays(false);
                  setSelectedDay(dayNum);
                }}
                className={`px-4 py-3 rounded-[20px] text-left transition-all shrink-0 border cursor-pointer ${
                  isDropTarget
                    ? 'bg-emerald-400/25 text-emerald-100 border-emerald-400 scale-[1.03] shadow-[0_0_20px_rgba(52,211,153,0.35)]'
                    : isSelected
                    ? 'bg-cyan-500/20 text-cyan-100 border-cyan-400/60 shadow-[0_0_18px_rgba(34,211,238,0.2)]'
                    : 'aurora-glass text-slate-200 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2.5">
                  <span className="text-xs font-extrabold font-mono tabular-nums flex items-center gap-1">
                    Tag {dayNum}
                    {dayHasConflict && (
                      <AlertTriangle
                        className="w-3 h-3 text-amber-400"
                        aria-label="Zeitkonflikt an diesem Tag"
                      />
                    )}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {getDayDateLabel(dayNum)}
                  </span>
                </div>
                <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5 font-medium">
                  {actCount} Akt. • {mealCount} Essen
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Collapsible Unscheduled Ideas Tray (Drag & Drop directly onto Day Pills) */}
      {unscheduledIdeas.length > 0 && (
        <div className="aurora-glass rounded-[22px] p-3.5">
          <button
            type="button"
            onClick={() => setShowIdeaTray((prev) => !prev)}
            className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>
                Ideen aus dem Ideen-Pool direkt einplanen (
                <span className="font-mono tabular-nums text-amber-300">
                  {unscheduledIdeas.length}
                </span>
                )
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] text-cyan-300 font-bold">
              <span>{showIdeaTray ? 'Ausblenden' : 'Zum Reinziehen öffnen'}</span>
              {showIdeaTray ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </span>
          </button>

          {showIdeaTray && (
            <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2">
              {unscheduledIdeas.map((idea) => (
                <div
                  key={idea.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggingIdeaId(idea.id);
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData('application/x-vacayly-idea', idea.id);
                    e.dataTransfer.setData(
                      'text/plain',
                      JSON.stringify({ kind: 'idea', id: idea.id })
                    );
                  }}
                  onDragEnd={() => {
                    setDraggingIdeaId(null);
                    setDragOverDay(null);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-xs font-bold text-amber-100 cursor-grab active:cursor-grabbing hover:bg-amber-400/20 transition-colors"
                  title="Auf einen Tag oben ziehen oder per Klick für aktuellen Tag einplanen"
                >
                  <GripVertical className="w-3 h-3 text-amber-300" />
                  <span className="truncate max-w-[200px]">{idea.title}</span>
                  {!viewAllDays && (
                    <button
                      type="button"
                      onClick={() => scheduleIdeaToDay(idea.id, selectedDay, '10:00')}
                      className="px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-extrabold hover:bg-cyan-300 cursor-pointer"
                    >
                      + Tag {selectedDay}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inline Propose / Edit Activity Form */}
      {showAddForm && (
        <form
          ref={formRef}
          onSubmit={handleCreateActivity}
          className="aurora-glass-elevated rounded-[26px] p-6 border-cyan-400/35 space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-100">
                {editingActivityId
                  ? 'Aktivität bearbeiten'
                  : 'Neue Aktivität / Ausflug vorschlagen'}
              </h3>
              <p className="text-xs text-slate-400">
                {editingActivityId ? (
                  'Änderungen speichern – alle bisherigen Votes bleiben erhalten.'
                ) : (
                  <>
                    Vorgeschlagen von{' '}
                    <strong className="text-slate-200">{currentUser.name}</strong> –
                    andere Reisende können sofort abstimmen.
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowAddForm(false);
              }}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="rounded-2xl bg-rose-500/15 border border-rose-400/40 px-4 py-2.5 text-xs font-semibold text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label
                htmlFor="sched-title"
                className="text-xs font-bold text-slate-300 block mb-1.5"
              >
                Titel der Aktivität *
              </label>
              <input
                id="sched-title"
                type="text"
                required
                placeholder="z.B. Katamaran-Tour bei Sonnenuntergang"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="w-full aurora-input rounded-2xl px-3.5 py-2.5 text-xs font-semibold placeholder:text-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="sched-day"
                className="text-xs font-bold text-slate-300 block mb-1.5"
              >
                Tag auswählen
              </label>
              <select
                id="sched-day"
                value={formDay}
                onChange={(e) => setFormDay(Number(e.target.value))}
                className="w-full aurora-input rounded-2xl px-3 py-2.5 text-xs font-bold [color-scheme:dark]"
              >
                {Array.from({ length: safeTotalDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d} className="bg-[#131823] text-slate-100">
                    Tag {d} ({getDayDateLabel(d)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="sched-cat"
                className="text-xs font-bold text-slate-300 block mb-1.5"
              >
                Kategorie
              </label>
              <select
                id="sched-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                className="w-full aurora-input rounded-2xl px-3 py-2.5 text-xs font-bold [color-scheme:dark]"
              >
                <option value="beach" className="bg-[#131823] text-slate-100">
                  Strand & Meer
                </option>
                <option value="activity" className="bg-[#131823] text-slate-100">
                  Ausflug & Action
                </option>
                <option value="culture" className="bg-[#131823] text-slate-100">
                  Kultur & Sightseeing
                </option>
                <option value="transport" className="bg-[#131823] text-slate-100">
                  Transfer & Route
                </option>
                <option value="nightlife" className="bg-[#131823] text-slate-100">
                  Abend & Nightlife
                </option>
                <option value="other" className="bg-[#131823] text-slate-100">
                  Sonstiges
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label
                htmlFor="sched-start"
                className="text-xs font-bold text-slate-300 block mb-1.5"
              >
                Startzeit
              </label>
              <input
                id="sched-start"
                type="time"
                value={timeSlot}
                onChange={(e) => {
                  setTimeSlot(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="w-full aurora-input rounded-2xl px-3 py-2 text-xs font-mono tabular-nums font-bold [color-scheme:dark]"
              />
            </div>

            <div>
              <label
                htmlFor="sched-end"
                className="text-xs font-bold text-slate-300 block mb-1.5"
              >
                Endzeit
              </label>
              <input
                id="sched-end"
                type="time"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="w-full aurora-input rounded-2xl px-3 py-2 text-xs font-mono tabular-nums font-bold [color-scheme:dark]"
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <label
                htmlFor="sched-loc"
                className="text-xs font-bold text-slate-300 block mb-1.5"
              >
                Ort / Treffpunkt
              </label>
              <input
                id="sched-loc"
                type="text"
                placeholder="z.B. Cala Llombards"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full aurora-input rounded-2xl px-3 py-2 text-xs font-semibold placeholder:text-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="sched-cost"
                className="text-xs font-bold text-slate-300 block mb-1.5"
              >
                Kosten p.P. ({currency})
              </label>
              <input
                id="sched-cost"
                type="number"
                min="0"
                step="0.01"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                className="w-full aurora-input rounded-2xl px-3 py-2 text-xs font-mono tabular-nums font-semibold"
              />
            </div>

            <div>
              <label
                htmlFor="sched-status"
                className="text-xs font-bold text-slate-300 block mb-1.5"
              >
                Status
              </label>
              <select
                id="sched-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as DayActivity['status'])}
                className="w-full aurora-input rounded-2xl px-3 py-2 text-xs font-bold [color-scheme:dark]"
              >
                <option value="idea" className="bg-[#131823] text-slate-100">
                  Idee
                </option>
                <option value="planned" className="bg-[#131823] text-slate-100">
                  Geplant
                </option>
                <option value="confirmed" className="bg-[#131823] text-slate-100">
                  Bestätigt
                </option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="sched-desc"
              className="text-xs font-bold text-slate-300 block mb-1.5"
            >
              Beschreibung & Infos für die Gruppe
            </label>
            <textarea
              id="sched-desc"
              rows={2}
              placeholder="Was macht diesen Vorschlag besonders? Müssen wir vorab reservieren oder Tickets buchen?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full aurora-input rounded-2xl px-3.5 py-2 text-xs placeholder:text-slate-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowAddForm(false);
              }}
              className="px-4 py-2 rounded-full text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-200 cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full text-xs font-extrabold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.28)] cursor-pointer"
            >
              {editingActivityId ? 'Änderungen speichern' : 'Aktivität speichern'}
            </button>
          </div>
        </form>
      )}

      {/* Filter & Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" /> Filter:
          </span>
          {(
            [
              { id: 'all', label: 'Alle' },
              { id: 'beach', label: 'Strand' },
              { id: 'activity', label: 'Action & Ausflug' },
              { id: 'culture', label: 'Kultur' },
              { id: 'transport', label: 'Transfer' },
              { id: 'nightlife', label: 'Nightlife' },
              { id: 'other', label: 'Sonstiges' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-cyan-400 text-slate-950 shadow-sm'
                  : 'aurora-glass text-slate-300 hover:bg-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSortBy((prev) => (prev === 'time' ? 'votes' : 'time'))}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold aurora-glass hover:bg-white/10 text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            Sortiert nach:{' '}
            <strong className="text-cyan-300">
              {sortBy === 'time' ? 'Uhrzeit' : 'Beliebtheit (Votes)'}
            </strong>
          </span>
        </button>
      </div>

      {/* Activity Cards Grid */}
      {inRangeFilteredActivities.length === 0 ? (
        <div className="aurora-glass rounded-[28px] p-10 text-center border-dashed border-white/15">
          <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-2.5 opacity-80" />
          <h3 className="text-base font-extrabold text-slate-100">
            Keine Aktivitäten für diese Auswahl gefunden
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Füge oben den ersten Vorschlag für diesen Tag hinzu oder ändere den Filter.
          </p>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddForm(true);
              scrollToForm();
            }}
            className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-full px-5 py-2.5 text-xs font-extrabold cursor-pointer shadow-[0_0_18px_rgba(34,211,238,0.25)]"
          >
            + Jetzt Vorschlag erstellen
          </button>
        </div>
      ) : viewAllDays && sortBy === 'time' ? (
        <div className="space-y-4">
          {Array.from({ length: safeTotalDays }, (_, i) => i + 1).map((dayNum) => {
            const dayActs = inRangeFilteredActivities.filter(
              (a) => a.dayNumber === dayNum
            );
            if (dayActs.length === 0) return null;
            const isCollapsed = !!collapsedDays[dayNum];
            const dayCost = roundCents(
              dayActs.reduce((sum, a) => sum + (Number(a.estimatedCost) || 0), 0)
            );
            const dayRouteUrl = buildGoogleMapsDayRouteUrl(
              dayActs
                .slice()
                .sort((a, b) => compareTimeSlots(a.timeSlot, b.timeSlot))
                .map((a) => a.location)
            );

            return (
              <div key={dayNum} className="space-y-3">
                <div className="flex items-center justify-between gap-2 aurora-glass rounded-[20px] px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleDayCollapse(dayNum)}
                    className="flex-1 flex items-center justify-between gap-3 text-left cursor-pointer min-w-0"
                  >
                    <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono tabular-nums font-extrabold bg-cyan-400 text-slate-950">
                        Tag {dayNum}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {getDayDateLabel(dayNum)}
                      </span>
                      <span className="text-xs font-bold text-slate-200 font-mono tabular-nums">
                        · {dayActs.length}{' '}
                        {dayActs.length === 1 ? 'Aktivität' : 'Aktivitäten'} · ~
                        {formatCurrency(dayCost, currency)} p.P.
                      </span>
                    </div>
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {dayRouteUrl && (
                    <a
                      href={dayRouteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-400/15 hover:bg-emerald-400/25 text-emerald-200 border border-emerald-400/30 shrink-0 transition-colors"
                      title={`Route Tag ${dayNum} in Google Maps`}
                    >
                      <Route className="w-3 h-3" />
                      <span className="hidden sm:inline">Route</span>
                    </a>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dayActs.map(renderActivityCard)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inRangeFilteredActivities.map(renderActivityCard)}
        </div>
      )}

      {/* Collapsible Out-of-Range Section (Tag < 1 or Tag > totalDays) */}
      {outOfRangeActivities.length > 0 && (
        <div className="aurora-glass rounded-[24px] border-amber-400/35 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowOutOfRange((prev) => !prev)}
            className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 flex-wrap">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-extrabold text-amber-200">
                Außerhalb Reisedauer (Tag &lt; 1 oder Tag &gt; {safeTotalDays})
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-bold bg-amber-400/20 text-amber-200">
                {outOfRangeActivities.length}
              </span>
            </div>
            {showOutOfRange ? (
              <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            )}
          </button>

          {showOutOfRange && (
            <div className="p-4 pt-1 space-y-3">
              <p className="text-xs text-slate-400 px-1">
                Diese Einträge liegen außerhalb der aktuell eingestellten {safeTotalDays} Reisetage
                und können hier auf einen gültigen Tag verschoben oder gelöscht werden.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {outOfRangeActivities.map(renderActivityCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScheduleView;
