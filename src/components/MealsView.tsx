import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Utensils,
  Coffee,
  Sun,
  Moon,
  Wine,
  ChefHat,
  Store,
  Croissant,
  Bike,
  Plus,
  ThumbsUp,
  Trash2,
  ShoppingBag,
  Users,
  Clock,
  MapPin,
  X,
  Trophy,
  Pencil,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  EyeOff,
  AlertTriangle,
  Map as MapIcon,
  ListChecks,
  Scale,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import { MealType, MealStyle, MealPlan } from '../types/vacation';
import {
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

const MEAL_SLOTS: Array<{
  type: MealType;
  label: string;
  defaultTime: string;
  iconBg: string;
  icon: React.ReactNode;
}> = [
  {
    type: 'breakfast',
    label: 'Frühstück',
    defaultTime: '09:00',
    iconBg: 'bg-[#D9822B]/14 border border-[#D9822B]/30 text-[#9E5A14]',
    icon: <Coffee className="w-4 h-4 text-[#9E5A14]" />,
  },
  {
    type: 'lunch',
    label: 'Mittagessen',
    defaultTime: '13:30',
    iconBg: 'bg-[#6E7F5E]/14 border border-[#6E7F5E]/30 text-[#4B593E]',
    icon: <Sun className="w-4 h-4 text-[#4B593E]" />,
  },
  {
    type: 'dinner',
    label: 'Abendessen',
    defaultTime: '20:00',
    iconBg: 'bg-[#C85A38]/12 border border-[#C85A38]/30 text-[#A34224]',
    icon: <Moon className="w-4 h-4 text-[#A34224]" />,
  },
  {
    type: 'snack',
    label: 'Snacks & Drinks',
    defaultTime: '17:00',
    iconBg: 'bg-[#2A7B88]/12 border border-[#2A7B88]/30 text-[#1F5E68]',
    icon: <Wine className="w-4 h-4 text-[#1F5E68]" />,
  },
];

const STYLE_META: Record<
  MealStyle,
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  cook: {
    label: 'Selbst kochen',
    badgeClass: 'bg-[#6E7F5E]/14 text-[#4B593E] border border-[#6E7F5E]/30',
    icon: <ChefHat className="w-3.5 h-3.5" />,
  },
  restaurant: {
    label: 'Restaurant',
    badgeClass: 'bg-[#C85A38]/12 text-[#A34224] border border-[#C85A38]/30',
    icon: <Store className="w-3.5 h-3.5" />,
  },
  bakery: {
    label: 'Bäckerei / Café',
    badgeClass: 'bg-[#D9822B]/14 text-[#9E5A14] border border-[#D9822B]/30',
    icon: <Croissant className="w-3.5 h-3.5" />,
  },
  delivery: {
    label: 'Lieferservice',
    badgeClass: 'bg-[#2A7B88]/12 text-[#1F5E68] border border-[#2A7B88]/30',
    icon: <Bike className="w-3.5 h-3.5" />,
  },
};

export const MealsView: React.FC = () => {
  const {
    trip,
    currentUser,
    selectedDay,
    setSelectedDay,
    addMeal,
    updateMeal,
    toggleMealVote,
    deleteMeal,
    addShoppingTasksFromMeals,
    focusOnMap,
    searchTarget,
    setSearchTarget,
    showToast,
  } = useVacation();

  const [viewAllDays, setViewAllDays] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<Record<number, boolean>>({});
  const [hideEmptySlots, setHideEmptySlots] = useState(false);
  const [showOutOfRange, setShowOutOfRange] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Add / Edit Meal Form State
  const [formDay, setFormDay] = useState<number>(selectedDay);
  const [mealType, setMealType] = useState<MealType>('dinner');
  const [style, setStyle] = useState<MealStyle>('cook');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('20:00');
  const [locationOrRecipe, setLocationOrRecipe] = useState('');
  const [description, setDescription] = useState('');
  const [shoppingNotes, setShoppingNotes] = useState('');
  const [estimatedCostPerPerson, setEstimatedCostPerPerson] = useState('18');
  const [assignedTeam, setAssignedTeam] = useState<string[]>([currentUser.id]);
  const [formError, setFormError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  const safeTotalDays = Math.max(1, trip.totalDays || 1);
  const currency = trip.currency || 'EUR';

  // Sync formDay only when NOT editing and NOT adding
  useEffect(() => {
    if (!editingMealId && !showAddForm) {
      setFormDay(selectedDay);
    }
  }, [selectedDay, editingMealId, showAddForm]);

  // Spotlight search target handler
  useEffect(() => {
    if (!searchTarget || searchTarget.kind !== 'meal') return;
    const targetId = searchTarget.id;
    const targetMeal = trip.meals.find((m) => m.id === targetId);
    if (targetMeal) {
      setHideEmptySlots(false);
      if (targetMeal.dayNumber >= 1 && targetMeal.dayNumber <= safeTotalDays) {
        setViewAllDays(false);
        setSelectedDay(targetMeal.dayNumber);
        setCollapsedDays((prev) => ({ ...prev, [targetMeal.dayNumber]: false }));
      } else {
        setShowOutOfRange(true);
      }
    }
    setHighlightedId(targetId);
    setSearchTarget(null);
  }, [searchTarget, trip.meals, safeTotalDays, setSelectedDay, setSearchTarget]);

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

  const scrollToForm = () => {
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  };

  const toggleTeamMember = (travelerId: string) => {
    setAssignedTeam((prev) =>
      prev.includes(travelerId)
        ? prev.filter((id) => id !== travelerId)
        : [...prev, travelerId]
    );
  };

  const resetForm = () => {
    setFormDay(selectedDay);
    setMealType('dinner');
    setStyle('cook');
    setTitle('');
    setTime('20:00');
    setLocationOrRecipe('');
    setDescription('');
    setShoppingNotes('');
    setEstimatedCostPerPerson('18');
    setAssignedTeam([currentUser.id]);
    setEditingMealId(null);
    setFormError(null);
  };

  const openSlotAdd = (dayNum: number, slotType: MealType, defaultTime: string) => {
    setEditingMealId(null);
    setFormDay(dayNum);
    setMealType(slotType);
    setStyle('cook');
    setTitle('');
    setTime(defaultTime);
    setLocationOrRecipe('');
    setDescription('');
    setShoppingNotes('');
    setEstimatedCostPerPerson('18');
    setAssignedTeam([currentUser.id]);
    setFormError(null);
    setShowAddForm(true);
    scrollToForm();
  };

  const handleStartEdit = (meal: MealPlan) => {
    setEditingMealId(meal.id);
    setFormDay(
      meal.dayNumber >= 1 && meal.dayNumber <= safeTotalDays
        ? meal.dayNumber
        : selectedDay
    );
    setMealType(meal.mealType);
    setStyle(meal.style);
    setTitle(meal.title);
    setTime(meal.time);
    setLocationOrRecipe(meal.locationOrRecipe);
    setDescription(meal.description);
    setShoppingNotes(meal.ShoppingNotes || '');
    setEstimatedCostPerPerson(String(meal.estimatedCostPerPerson));
    // Preserve intentionally empty team []!
    setAssignedTeam([...meal.assignedTeam]);
    setFormError(null);
    setShowAddForm(true);
    scrollToForm();
  };

  const handleCreateMeal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Bitte gib einen Titel für das Gericht ein.');
      return;
    }

    if (parseTimeToMinutes(time) === null || !isValidTimeRange(time)) {
      setFormError('Bitte gib eine gültige Uhrzeit (HH:MM) an.');
      return;
    }

    const parsedCost = clampCost(estimatedCostPerPerson) ?? 0;

    const payload = {
      dayNumber: Math.max(1, Math.min(Math.round(formDay) || 1, safeTotalDays)),
      mealType,
      style,
      title: trimmedTitle,
      time,
      locationOrRecipe:
        locationOrRecipe.trim() ||
        (style === 'cook' ? 'Finca-Küche / Grill' : 'Restaurant vor Ort'),
      description:
        description.trim() || 'Kulinarischer Vorschlag für die Gruppe.',
      ShoppingNotes: shoppingNotes.trim() || undefined,
      estimatedCostPerPerson: parsedCost,
      // Respect intentionally empty team []!
      assignedTeam: [...assignedTeam],
    };

    if (editingMealId) {
      updateMeal(editingMealId, payload);
      showToast(`Mahlzeit „${trimmedTitle}“ gespeichert`, 'success');
    } else {
      addMeal(payload);
      showToast(`Essensvorschlag „${trimmedTitle}“ hinzugefügt`, 'success');
    }

    resetForm();
    setShowAddForm(false);
  };

  const toggleDayCollapse = (dayNum: number) => {
    setCollapsedDays((prev) => ({ ...prev, [dayNum]: !prev[dayNum] }));
  };

  const getTraveler = (id: string) =>
    trip.travelers.find((t) => t.id === id) || {
      id,
      name: 'Unbekannt',
      initials: '?',
      color: '#94A3B8',
    };

  // Lookup labels for conflict notices
  const itemLabelById = useMemo(() => {
    const map = new Map<string, string>();
    trip.activities.forEach((a) => map.set(a.id, `Aktivität: ${a.title} (${a.timeSlot})`));
    trip.meals.forEach((m) => map.set(m.id, `Essen: ${m.title} (${m.time})`));
    return map;
  }, [trip.activities, trip.meals]);

  // Conflict detection per day
  const conflictsByDay = useMemo(() => {
    const daySet = new Set<number>();
    trip.meals.forEach((m) => daySet.add(m.dayNumber));
    const map: Record<number, Record<string, string[]>> = {};
    daySet.forEach((d) => {
      map[d] = detectDayConflicts(trip.activities, trip.meals, d);
    });
    return map;
  }, [trip.activities, trip.meals]);

  // Budget calculation per slot (1 leading option per dayNumber+mealType slot)
  const mealStats = useMemo(() => {
    const cookCount = trip.meals.filter((m) => m.style === 'cook').length;
    const restaurantCount = trip.meals.filter((m) => m.style === 'restaurant').length;
    const mealsWithShoppingNotes = trip.meals.filter(
      (m) => Boolean(m.ShoppingNotes?.trim())
    ).length;

    const bySlot = new Map<string, MealPlan[]>();
    trip.meals.forEach((m) => {
      const key = `${m.dayNumber}::${m.mealType}`;
      const list = bySlot.get(key) || [];
      list.push(m);
      bySlot.set(key, list);
    });

    let effectiveCostPerPerson = 0;
    let multiOptionSlotCount = 0;
    let alternativeCount = 0;

    bySlot.forEach((slotItems) => {
      if (slotItems.length > 1) {
        multiOptionSlotCount += 1;
        alternativeCount += slotItems.length - 1;
      }
      const sorted = [...slotItems].sort(
        (a, b) =>
          b.votes.length - a.votes.length || compareTimeSlots(a.time, b.time)
      );
      effectiveCostPerPerson = roundCents(
        effectiveCostPerPerson + (Number(sorted[0]?.estimatedCostPerPerson) || 0)
      );
    });

    return {
      cookCount,
      restaurantCount,
      mealsWithShoppingNotes,
      effectiveCostPerPerson,
      multiOptionSlotCount,
      alternativeCount,
    };
  }, [trip.meals]);

  const outOfRangeMeals = useMemo(() => {
    return trip.meals
      .filter((m) => m.dayNumber < 1 || m.dayNumber > safeTotalDays)
      .sort(
        (a, b) => a.dayNumber - b.dayNumber || compareTimeSlots(a.time, b.time)
      );
  }, [trip.meals, safeTotalDays]);

  const daysToRender = viewAllDays
    ? Array.from({ length: safeTotalDays }, (_, i) => i + 1)
    : [selectedDay];

  const handleImportShoppingList = () => {
    if (mealStats.mealsWithShoppingNotes === 0) {
      showToast('Noch keine Einkaufsnotizen in den Mahlzeiten hinterlegt', 'info');
      return;
    }
    addShoppingTasksFromMeals();
  };

  const renderMealCard = (meal: MealPlan, isLeading: boolean, isTied: boolean) => {
    const styleMeta = STYLE_META[meal.style] || STYLE_META.restaurant;
    const proposer = getTraveler(meal.proposedBy);
    const hasVoted = meal.votes.includes(currentUser.id);
    const isConfirmingDelete = confirmDeleteId === meal.id;
    const isHighlighted = highlightedId === meal.id;

    const mapsUrl = buildGoogleMapsUrl(meal.locationOrRecipe);
    const canFocusOnMap =
      !isGenericLocation(meal.locationOrRecipe) ||
      (typeof meal.lat === 'number' && typeof meal.lng === 'number');

    const dayConflicts = conflictsByDay[meal.dayNumber] || {};
    const conflictingIds = dayConflicts[meal.id] || [];
    const conflictLabels = conflictingIds
      .map((id) => itemLabelById.get(id))
      .filter((lbl): lbl is string => Boolean(lbl));

    return (
      <div
        key={meal.id}
        data-search-id={meal.id}
        className={`rounded-[20px] p-4 transition-all border ${
          isHighlighted
            ? 'surface-glass-elevated ring-2 ring-[#C85A38] shadow-[0_8px_24px_rgba(200,90,56,0.18)]'
            : isLeading
            ? 'surface-glass-elevated border-[#D9822B]/45 shadow-[0_6px_20px_rgba(217,130,43,0.1)]'
            : 'bg-white/90 border-[#E6DDD1] hover:border-[#D5C9BA]'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(meal.dayNumber < 1 || meal.dayNumber > safeTotalDays) && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-extrabold bg-[#D9822B]/14 text-[#9E5A14] border border-[#D9822B]/30">
                Tag {meal.dayNumber}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums font-bold bg-[#F3ECE1]/80 border border-[#E6DDD1] px-2.5 py-0.5 rounded-full text-[#1F1B18]">
              <Clock className="w-3 h-3 text-[#C85A38]" />
              {meal.time}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${styleMeta.badgeClass}`}
            >
              {styleMeta.icon}
              <span>{styleMeta.label}</span>
            </span>
            {isLeading &&
              (isTied ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-[#2A7B88]/12 text-[#1F5E68] border border-[#2A7B88]/30 px-2 py-0.5 rounded-full">
                  <Scale className="w-3 h-3" /> Gleichstand
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-[#D9822B]/14 text-[#9E5A14] border border-[#D9822B]/30 px-2 py-0.5 rounded-full">
                  <Trophy className="w-3 h-3 text-[#D9822B]" /> Favorit
                </span>
              ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleStartEdit(meal)}
              className="text-[#8C8277] hover:text-[#C85A38] min-w-[44px] min-h-[44px] rounded-full hover:bg-[#F3ECE1] flex items-center justify-center transition-colors cursor-pointer"
              title="Essensvorschlag bearbeiten"
              aria-label={`Essensvorschlag „${meal.title}“ bearbeiten`}
            >
              <Pencil className="w-4 h-4" />
            </button>

            {isConfirmingDelete ? (
              <div className="inline-flex flex-wrap items-center gap-1.5 bg-rose-600/12 border border-rose-500/30 rounded-2xl px-2.5 py-1 text-xs font-bold">
                <span className="text-rose-800 px-1">Löschen?</span>
                <button
                  type="button"
                  onClick={() => {
                    deleteMeal(meal.id);
                    setConfirmDeleteId(null);
                  }}
                  className="min-h-[44px] px-3 rounded-xl bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                >
                  Ja
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="min-h-[44px] px-3 rounded-xl bg-[#F3ECE1] text-[#1F1B18] hover:bg-[#E6DDD1] cursor-pointer"
                >
                  Nein
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteId(meal.id)}
                className="text-[#8C8277] hover:text-rose-700 min-w-[44px] min-h-[44px] rounded-full hover:bg-rose-600/12 flex items-center justify-center transition-colors cursor-pointer"
                title="Essensvorschlag löschen"
                aria-label={`Essensvorschlag „${meal.title}“ löschen`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {conflictLabels.length > 0 && (
          <div className="mt-2.5 rounded-xl bg-[#D9822B]/14 border border-[#D9822B]/30 px-2.5 py-1.5 text-[11px] text-[#9E5A14] flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[#D9822B] shrink-0 mt-0.5" />
            <span>
              <strong>Zeitkonflikt:</strong> {conflictLabels.join(', ')}
            </span>
          </div>
        )}

        <h4 className="text-sm font-extrabold text-[#1F1B18] mt-2.5">
          {meal.title}
        </h4>

        <div className="text-xs text-[#6B6259] mt-1.5 flex flex-wrap items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 text-[#1F1B18] font-semibold min-w-0">
            <MapPin className="w-3.5 h-3.5 text-[#C85A38] shrink-0" />
            <span className="break-words">{meal.locationOrRecipe}</span>
          </span>

          {canFocusOnMap && (
            <button
              type="button"
              onClick={() =>
                focusOnMap({
                  kind: 'meal',
                  id: meal.id,
                  title: meal.title,
                  location: meal.locationOrRecipe || trip.destination,
                  lat: meal.lat,
                  lng: meal.lng,
                  dayNumber: meal.dayNumber,
                  time: meal.time,
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1F5E68] bg-[#2A7B88]/12 hover:bg-[#2A7B88]/20 px-3 min-h-[44px] rounded-full border border-[#2A7B88]/30 transition-colors cursor-pointer"
              title="Im Map-Cockpit fokussieren"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Auf Karte</span>
            </button>
          )}

          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1F1B18] bg-[#F3ECE1]/80 hover:bg-[#E6DDD1] px-3 min-h-[44px] rounded-full border border-[#E6DDD1] transition-colors"
              title={`In Google Maps öffnen: ${meal.locationOrRecipe}`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Maps</span>
            </a>
          )}

          <span className="font-mono tabular-nums text-[#9E5A14] font-bold">
            • ca. {formatCurrency(meal.estimatedCostPerPerson, currency)} p.P.
          </span>
        </div>

        <p className="text-xs text-[#6B6259] mt-2 leading-relaxed">
          {meal.description}
        </p>

        {meal.ShoppingNotes && (
          <div className="mt-2.5 bg-[#D9822B]/10 border border-[#D9822B]/25 rounded-xl px-3 py-2 text-[11px] text-[#1F1B18] flex items-start gap-2">
            <ShoppingBag className="w-3.5 h-3.5 text-[#9E5A14] shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-[#9E5A14]">Einkaufsnotiz: </strong>
              {meal.ShoppingNotes}
            </div>
          </div>
        )}

        {/* Team & Voting Footer */}
        <div className="mt-3.5 pt-2.5 border-t border-[#E6DDD1] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B6259]">
            <Users className="w-3.5 h-3.5 text-[#8C8277] shrink-0" />
            <span>Team:</span>
            {meal.assignedTeam.length === 0 ? (
              <span className="text-[#8C8277] italic">Noch offen</span>
            ) : (
              <div className="flex items-center -space-x-1">
                {meal.assignedTeam.map((tId) => {
                  const member = getTraveler(tId);
                  return (
                    <span
                      key={tId}
                      style={{ backgroundColor: member.color }}
                      className="w-5 h-5 rounded-full text-[9px] font-black text-white flex items-center justify-center ring-1 ring-white"
                      title={`Orga/Koch-Team: ${member.name}`}
                    >
                      {member.initials}
                    </span>
                  );
                })}
              </div>
            )}
            <span className="text-[10px] text-[#8C8277] ml-1">
              (von {proposer.name})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-1.5">
              {meal.votes.slice(0, 4).map((vId) => {
                const voter = trip.travelers.find((t) => t.id === vId);
                if (!voter) return null;
                return (
                  <span
                    key={vId}
                    style={{ backgroundColor: voter.color }}
                    className="w-5 h-5 rounded-full text-[9px] font-black text-white flex items-center justify-center ring-1 ring-white"
                    title={`${voter.name} stimmt dafür`}
                  >
                    {voter.initials}
                  </span>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => toggleMealVote(meal.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                hasVoted
                  ? 'bg-[#C85A38] text-white shadow-[0_4px_12px_rgba(200,90,56,0.28)]'
                  : 'bg-[#F3ECE1]/80 hover:bg-[#E6DDD1] text-[#1F1B18] border border-[#E6DDD1]'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">{meal.votes.length}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 min-w-0 w-full">
      {/* Header Banner */}
      <div className="surface-glass-elevated rounded-[28px] p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-52 h-52 bg-[#D9822B]/12 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-4 min-w-0">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#D9822B]/14 border border-[#D9822B]/30 text-[#9E5A14] mb-2">
              <Utensils className="w-3.5 h-3.5" />
              Essensplaner & Kulinarik
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#1F1B18]">
              Was essen wir an welchem Tag?
            </h1>
            <p className="text-xs text-[#6B6259] mt-1">
              Plant Frühstück, Mittag- & Abendessen, teilt Koch-Teams ein und übernehmt alle Einkaufsnotizen mit einem Klick in eure Checkliste.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <div className="surface-glass rounded-2xl px-3.5 py-2 text-xs min-w-0">
              <span className="text-[#8C8277] block text-[10px] font-bold uppercase tracking-wide">
                Kulinarik-Mix (1 Favorit / Slot)
              </span>
              <span className="font-extrabold text-[#1F1B18] font-mono tabular-nums break-words">
                {mealStats.cookCount}x Kochen • {mealStats.restaurantCount}x Restaurant • ~
                {formatCurrency(mealStats.effectiveCostPerPerson, currency)} p.P.
              </span>
              {mealStats.alternativeCount > 0 && (
                <span className="block text-[10px] text-[#9E5A14] font-semibold mt-0.5">
                  +{mealStats.alternativeCount}{' '}
                  {mealStats.alternativeCount === 1
                    ? 'Alternativ-Option'
                    : 'Alternativ-Optionen'}{' '}
                  in {mealStats.multiOptionSlotCount} Slots (nicht doppelt gezählt)
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleImportShoppingList}
              className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] py-2.5 rounded-full text-xs font-extrabold bg-[#6E7F5E]/14 hover:bg-[#6E7F5E]/22 text-[#4B593E] border border-[#6E7F5E]/30 transition-all cursor-pointer"
              title="Alle Einkaufsnotizen aus den Mahlzeiten als Aufgaben in die Einkaufsliste übernehmen"
            >
              <ListChecks className="w-4 h-4 text-[#4B593E] shrink-0" />
              <span>Einkaufsliste in Checkliste übernehmen</span>
              {mealStats.mealsWithShoppingNotes > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums bg-[#6E7F5E] text-white font-black">
                  {mealStats.mealsWithShoppingNotes}
                </span>
              )}
            </button>

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
              className="bg-[#C85A38] hover:bg-[#B54B2B] text-white rounded-full px-5 min-h-[44px] py-2.5 text-xs font-extrabold inline-flex items-center justify-center gap-2 shadow-[0_6px_18px_rgba(200,90,56,0.28)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? 'Formular schließen' : '+ Essens-Vorschlag'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Day Selector Bar + Empty Slots Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar min-w-0 w-full">
          <button
            type="button"
            onClick={() => setViewAllDays(true)}
            className={`px-4 min-h-[44px] rounded-full text-xs font-extrabold transition-all shrink-0 cursor-pointer inline-flex items-center ${
              viewAllDays
                ? 'bg-[#C85A38] text-white shadow-[0_4px_14px_rgba(200,90,56,0.28)]'
                : 'surface-glass text-[#1F1B18] hover:bg-[#F3ECE1]'
            }`}
          >
            Alle Tage (<span className="font-mono tabular-nums">{trip.meals.length}</span>)
          </button>

          {Array.from({ length: safeTotalDays }, (_, i) => i + 1).map((dayNum) => {
            const isSelected = !viewAllDays && selectedDay === dayNum;
            const count = trip.meals.filter((m) => m.dayNumber === dayNum).length;
            const dayHasConflict = Object.keys(conflictsByDay[dayNum] || {}).length > 0;

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => {
                  setViewAllDays(false);
                  setSelectedDay(dayNum);
                }}
                className={`px-4 min-h-[44px] rounded-full text-xs font-bold transition-all shrink-0 inline-flex items-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-[#C85A38]/12 text-[#A34224] border-[#C85A38]/30 shadow-sm'
                    : 'surface-glass text-[#6B6259] hover:text-[#1F1B18] hover:bg-[#F3ECE1]'
                }`}
              >
                <span className="font-mono tabular-nums">Tag {dayNum}</span>
                {dayHasConflict && (
                  <AlertTriangle
                    className="w-3 h-3 text-[#D9822B]"
                    aria-label="Zeitkonflikt"
                  />
                )}
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums bg-[#F3ECE1] text-[#1F1B18]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setHideEmptySlots((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-full text-xs font-bold transition-all shrink-0 self-start sm:self-auto border cursor-pointer ${
            hideEmptySlots
              ? 'bg-[#2A7B88]/12 text-[#1F5E68] border-[#2A7B88]/30'
              : 'surface-glass text-[#6B6259] hover:text-[#1F1B18] hover:bg-[#F3ECE1]'
          }`}
        >
          <EyeOff className="w-3.5 h-3.5" />
          <span>Leere Mahlzeiten ausblenden</span>
        </button>
      </div>

      {/* Add / Edit Meal Proposal Form */}
      {showAddForm && (
        <form
          ref={formRef}
          onSubmit={handleCreateMeal}
          className="surface-glass-elevated rounded-[26px] p-4 sm:p-6 border-[#D9822B]/35 space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-[#1F1B18]">
                {editingMealId
                  ? 'Essens-Vorschlag bearbeiten'
                  : 'Neuen Essens-Vorschlag hinzufügen'}
              </h3>
              <p className="text-xs text-[#6B6259]">
                {editingMealId
                  ? 'Änderungen speichern – alle bisherigen Votes bleiben erhalten.'
                  : 'Mehrere Vorschläge pro Mahlzeit sind möglich – die Gruppe stimmt einfach ab!'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowAddForm(false);
              }}
              aria-label="Formular schließen"
              className="w-11 h-11 rounded-full bg-[#F3ECE1] hover:bg-[#E6DDD1] text-[#1F1B18] flex items-center justify-center shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="rounded-2xl bg-rose-600/12 border border-rose-500/30 px-4 py-2.5 text-xs font-semibold text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label
                htmlFor="meal-day"
                className="text-xs font-bold text-[#1F1B18] block mb-1.5"
              >
                Reisetag
              </label>
              <select
                id="meal-day"
                value={formDay}
                onChange={(e) => setFormDay(Number(e.target.value))}
                className="w-full surface-input rounded-2xl px-3 min-h-[44px] py-2 text-xs font-bold [color-scheme:light]"
              >
                {Array.from({ length: safeTotalDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d} className="bg-white text-[#1F1B18]">
                    Tag {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="meal-slot"
                className="text-xs font-bold text-[#1F1B18] block mb-1.5"
              >
                Mahlzeit-Slot
              </label>
              <select
                id="meal-slot"
                value={mealType}
                onChange={(e) => {
                  const nextType = e.target.value as MealType;
                  setMealType(nextType);
                  const slot = MEAL_SLOTS.find((s) => s.type === nextType);
                  if (slot && !editingMealId) setTime(slot.defaultTime);
                }}
                className="w-full surface-input rounded-2xl px-3 min-h-[44px] py-2 text-xs font-bold [color-scheme:light]"
              >
                <option value="breakfast" className="bg-white text-[#1F1B18]">
                  Frühstück
                </option>
                <option value="lunch" className="bg-white text-[#1F1B18]">
                  Mittagessen
                </option>
                <option value="dinner" className="bg-white text-[#1F1B18]">
                  Abendessen
                </option>
                <option value="snack" className="bg-white text-[#1F1B18]">
                  Snacks & Drinks
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="meal-style"
                className="text-xs font-bold text-[#1F1B18] block mb-1.5"
              >
                Verpflegungs-Art
              </label>
              <select
                id="meal-style"
                value={style}
                onChange={(e) => setStyle(e.target.value as MealStyle)}
                className="w-full surface-input rounded-2xl px-3 min-h-[44px] py-2 text-xs font-bold [color-scheme:light]"
              >
                <option value="cook" className="bg-white text-[#1F1B18]">
                  Selbst kochen
                </option>
                <option value="restaurant" className="bg-white text-[#1F1B18]">
                  Restaurant
                </option>
                <option value="bakery" className="bg-white text-[#1F1B18]">
                  Bäckerei / Café
                </option>
                <option value="delivery" className="bg-white text-[#1F1B18]">
                  Lieferservice
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="meal-time"
                className="text-xs font-bold text-[#1F1B18] block mb-1.5"
              >
                Uhrzeit
              </label>
              <input
                id="meal-time"
                type="time"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="w-full surface-input rounded-2xl px-3 min-h-[44px] py-2 text-xs font-mono tabular-nums font-bold [color-scheme:light]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="meal-title"
                className="text-xs font-bold text-[#1F1B18] block mb-1.5"
              >
                Gericht / Titel *
              </label>
              <input
                id="meal-title"
                type="text"
                required
                placeholder="z.B. Großer Grillabend auf der Finca"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="w-full surface-input rounded-2xl px-3.5 min-h-[44px] py-2 text-xs font-semibold placeholder:text-[#8C8277]"
              />
            </div>

            <div>
              <label
                htmlFor="meal-location"
                className="text-xs font-bold text-[#1F1B18] block mb-1.5"
              >
                Ort / Rezept-Idee
              </label>
              <input
                id="meal-location"
                type="text"
                placeholder="z.B. Finca-Terrasse oder Tapas Bar Sa Cova"
                value={locationOrRecipe}
                onChange={(e) => setLocationOrRecipe(e.target.value)}
                className="w-full surface-input rounded-2xl px-3.5 min-h-[44px] py-2 text-xs font-semibold placeholder:text-[#8C8277]"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label
                htmlFor="meal-cost"
                className="text-xs font-bold text-[#1F1B18] block mb-1.5"
              >
                Geschätzte Kosten p.P. ({currency})
              </label>
              <input
                id="meal-cost"
                type="number"
                min="0"
                step="0.01"
                value={estimatedCostPerPerson}
                onChange={(e) => setEstimatedCostPerPerson(e.target.value)}
                className="w-full surface-input rounded-2xl px-3.5 min-h-[44px] py-2 text-xs font-mono tabular-nums font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="meal-desc"
                className="text-xs font-bold text-[#1F1B18] block mb-1.5"
              >
                Ausführliche Beschreibung
              </label>
              <textarea
                id="meal-desc"
                rows={2}
                placeholder="Details zum Menü, Reservierungshinweise oder besondere Wünsche..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full surface-input rounded-2xl px-3.5 py-2 text-xs placeholder:text-[#8C8277] resize-none"
              />
            </div>

            <div>
              <label
                htmlFor="meal-notes"
                className="text-xs font-bold text-[#1F1B18] block mb-1.5"
              >
                Einkaufsnotizen (ShoppingNotes)
              </label>
              <textarea
                id="meal-notes"
                rows={2}
                placeholder="z.B. Grillgemüse, Halloumi, frisches Baguette, Sangria-Zutaten..."
                value={shoppingNotes}
                onChange={(e) => setShoppingNotes(e.target.value)}
                className="w-full surface-input rounded-2xl px-3.5 py-2 text-xs placeholder:text-[#8C8277] resize-none"
              />
            </div>
          </div>

          {/* Assigned Team Selector (Empty team [] is preserved!) */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-bold text-[#1F1B18]">
                Koch- / Orga-Team (leer lassen möglich)
              </label>
              {assignedTeam.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAssignedTeam([])}
                  className="text-xs font-bold text-[#8C8277] hover:text-rose-700 min-h-[44px] px-2 transition-colors cursor-pointer"
                >
                  Team leeren
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {trip.travelers.map((trav) => {
                const selected = assignedTeam.includes(trav.id);
                return (
                  <button
                    key={trav.id}
                    type="button"
                    onClick={() => toggleTeamMember(trav.id)}
                    className={`inline-flex items-center gap-2 px-3.5 min-h-[44px] rounded-full text-xs font-bold transition-all border cursor-pointer ${
                      selected
                        ? 'bg-[#C85A38] text-white border-[#C85A38]'
                        : 'bg-[#FAF7F2] text-[#6B6259] border-[#E6DDD1] hover:bg-[#F3ECE1] hover:text-[#1F1B18]'
                    }`}
                  >
                    <span
                      style={{ backgroundColor: trav.color }}
                      className="w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center"
                    >
                      {trav.initials}
                    </span>
                    <span>{trav.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowAddForm(false);
              }}
              className="px-4 min-h-[44px] rounded-full text-xs font-bold bg-[#F3ECE1] hover:bg-[#E6DDD1] text-[#1F1B18] cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-5 min-h-[44px] rounded-full text-xs font-extrabold bg-[#C85A38] hover:bg-[#B54B2B] text-white shadow-[0_6px_18px_rgba(200,90,56,0.28)] cursor-pointer"
            >
              {editingMealId ? 'Änderungen speichern' : 'Essens-Vorschlag speichern'}
            </button>
          </div>
        </form>
      )}

      {/* Days & 4 Structured Meal Slots */}
      <div className="space-y-6">
        {daysToRender.map((dayNum) => {
          const dayMeals = trip.meals.filter((m) => m.dayNumber === dayNum);
          const isCollapsed = viewAllDays && !!collapsedDays[dayNum];
          const visibleSlots = MEAL_SLOTS.filter((slot) => {
            if (!hideEmptySlots) return true;
            return dayMeals.some((m) => m.mealType === slot.type);
          });

          return (
            <div key={dayNum} className="space-y-4">
              {viewAllDays && (
                <button
                  type="button"
                  onClick={() => toggleDayCollapse(dayNum)}
                  className="w-full min-h-[48px] flex items-center justify-between surface-glass hover:bg-[#F3ECE1]/80 rounded-[20px] px-5 py-3.5 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono tabular-nums font-extrabold bg-[#C85A38] text-white">
                      Tag {dayNum}
                    </span>
                    <span className="text-xs font-bold text-[#6B6259]">
                      {formatTripDayDate(trip.startDate, dayNum)}
                    </span>
                    <span className="text-sm font-extrabold text-[#1F1B18] font-mono tabular-nums">
                      · {dayMeals.length}{' '}
                      {dayMeals.length === 1 ? 'Mahlzeit' : 'Mahlzeiten'}
                    </span>
                  </div>
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-[#8C8277] shrink-0" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-[#8C8277] shrink-0" />
                  )}
                </button>
              )}

              {!isCollapsed &&
                (visibleSlots.length === 0 ? (
                  <div className="surface-glass rounded-[22px] p-5 text-center border-dashed border-[#E6DDD1] text-xs text-[#6B6259]">
                    Keine eingetragenen Mahlzeiten für Tag {dayNum}.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 cq-cols-1-narrow gap-4">
                    {visibleSlots.map((slot) => {
                      const slotMeals = dayMeals
                        .filter((m) => m.mealType === slot.type)
                        .sort(
                          (a, b) =>
                            b.votes.length - a.votes.length ||
                            compareTimeSlots(a.time, b.time)
                        );

                      const maxVotes =
                        slotMeals.length > 1
                          ? Math.max(...slotMeals.map((m) => m.votes.length))
                          : 0;
                      const leadersCount =
                        maxVotes > 0
                          ? slotMeals.filter((m) => m.votes.length === maxVotes).length
                          : 0;
                      const isTied = leadersCount > 1;

                      return (
                        <div
                          key={slot.type}
                          className="surface-glass rounded-[26px] p-4 sm:p-5 flex flex-col justify-between gap-4 min-w-0"
                        >
                          <div>
                            {/* Slot Header */}
                            <div className="flex items-center justify-between gap-2 mb-3.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-9 h-9 rounded-2xl ${slot.iconBg} flex items-center justify-center shrink-0`}
                                >
                                  {slot.icon}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-sm font-extrabold text-[#1F1B18]">
                                    {slot.label}
                                  </h3>
                                  <span className="text-[11px] text-[#6B6259] block truncate">
                                    {slotMeals.length === 0
                                      ? 'Noch offen'
                                      : slotMeals.length === 1
                                      ? '1 Vorschlag'
                                      : `${slotMeals.length} Optionen · nur Favorit im Budget`}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  openSlotAdd(dayNum, slot.type, slot.defaultTime)
                                }
                                className="inline-flex items-center gap-1 px-3.5 min-h-[44px] rounded-full text-xs font-bold bg-[#F3ECE1] hover:bg-[#C85A38] hover:text-white text-[#1F1B18] transition-colors border border-[#E6DDD1] cursor-pointer shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Option</span>
                              </button>
                            </div>

                            {/* Proposals inside this slot */}
                            {slotMeals.length === 0 ? (
                              <div className="rounded-2xl bg-[#FAF7F2] p-5 text-center border border-dashed border-[#E6DDD1]">
                                <p className="text-xs font-semibold text-[#6B6259]">
                                  Noch kein {slot.label} für Tag {dayNum} geplant.
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openSlotAdd(dayNum, slot.type, slot.defaultTime)
                                  }
                                  className="mt-2 inline-flex items-center justify-center min-h-[44px] px-3 text-xs font-bold text-[#C85A38] hover:text-[#B54B2B] underline hover:no-underline cursor-pointer"
                                >
                                  + Jetzt Vorschlag eintragen
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {slotMeals.map((meal) => {
                                  const isLeading =
                                    slotMeals.length > 1 &&
                                    meal.votes.length === maxVotes &&
                                    maxVotes > 0;
                                  return renderMealCard(meal, isLeading, isTied);
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>
          );
        })}
      </div>

      {/* Collapsible Out-of-Range Meals Section */}
      {outOfRangeMeals.length > 0 && (
        <div className="surface-glass rounded-[24px] border-[#D9822B]/35 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowOutOfRange((prev) => !prev)}
            className="w-full min-h-[48px] px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#F3ECE1]/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 flex-wrap">
              <AlertTriangle className="w-4 h-4 text-[#D9822B] shrink-0" />
              <span className="text-xs font-extrabold text-[#9E5A14]">
                Mahlzeiten außerhalb Reisedauer (Tag &lt; 1 oder Tag &gt; {safeTotalDays})
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-bold bg-[#D9822B]/14 text-[#9E5A14]">
                {outOfRangeMeals.length}
              </span>
            </div>
            {showOutOfRange ? (
              <ChevronUp className="w-4 h-4 text-[#8C8277] shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#8C8277] shrink-0" />
            )}
          </button>

          {showOutOfRange && (
            <div className="p-4 pt-1 space-y-3">
              <p className="text-xs text-[#6B6259] px-1">
                Diese Mahlzeiten liegen außerhalb der {safeTotalDays} Reisetage und können
                bearbeitet oder gelöscht werden.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 cq-cols-1-narrow gap-4">
                {outOfRangeMeals.map((meal) => renderMealCard(meal, false, false))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MealsView;
