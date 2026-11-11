import React, { useState } from 'react';
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
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import { MealType, MealStyle } from '../types/vacation';

const MEAL_SLOTS: Array<{
  type: MealType;
  label: string;
  defaultTime: string;
  accentBg: string;
  icon: React.ReactNode;
}> = [
  {
    type: 'breakfast',
    label: 'Frühstück',
    defaultTime: '09:00',
    accentBg: 'bg-[#F4DF7B]',
    icon: <Coffee className="w-4 h-4 text-[#141416]" />,
  },
  {
    type: 'lunch',
    label: 'Mittagessen',
    defaultTime: '13:30',
    accentBg: 'bg-[#A9B882]',
    icon: <Sun className="w-4 h-4 text-[#141416]" />,
  },
  {
    type: 'dinner',
    label: 'Abendessen',
    defaultTime: '20:00',
    accentBg: 'bg-[#E8C2E8]',
    icon: <Moon className="w-4 h-4 text-[#141416]" />,
  },
  {
    type: 'snack',
    label: 'Snacks & Drinks',
    defaultTime: '17:00',
    accentBg: 'bg-[#C5D1F5]',
    icon: <Wine className="w-4 h-4 text-[#141416]" />,
  },
];

const STYLE_META: Record<
  MealStyle,
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  cook: {
    label: 'Selbst kochen',
    badgeClass: 'bg-[#A9B882]/60 text-[#141416]',
    icon: <ChefHat className="w-3.5 h-3.5" />,
  },
  restaurant: {
    label: 'Restaurant',
    badgeClass: 'bg-[#E8C2E8]/70 text-[#141416]',
    icon: <Store className="w-3.5 h-3.5" />,
  },
  bakery: {
    label: 'Bäckerei / Café',
    badgeClass: 'bg-[#F4DF7B]/70 text-[#141416]',
    icon: <Croissant className="w-3.5 h-3.5" />,
  },
  delivery: {
    label: 'Lieferservice',
    badgeClass: 'bg-[#C5D1F5]/70 text-[#141416]',
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
    toggleMealVote,
    deleteMeal,
  } = useVacation();

  const [viewAllDays, setViewAllDays] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Meal Form State
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

  React.useEffect(() => {
    setFormDay(selectedDay);
  }, [selectedDay]);

  const toggleTeamMember = (travelerId: string) => {
    setAssignedTeam((prev) =>
      prev.includes(travelerId)
        ? prev.filter((id) => id !== travelerId)
        : [...prev, travelerId]
    );
  };

  const openSlotAdd = (dayNum: number, slotType: MealType, defaultTime: string) => {
    setFormDay(dayNum);
    setMealType(slotType);
    setTime(defaultTime);
    if (!assignedTeam.includes(currentUser.id)) {
      setAssignedTeam([currentUser.id]);
    }
    setShowAddForm(true);
  };

  const handleCreateMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addMeal({
      dayNumber: formDay,
      mealType,
      style,
      title: title.trim(),
      time,
      locationOrRecipe:
        locationOrRecipe.trim() ||
        (style === 'cook' ? 'Finca-Küche / Grill' : 'Restaurant vor Ort'),
      description:
        description.trim() || 'Kulinarischer Vorschlag für die Gruppe.',
      ShoppingNotes: shoppingNotes.trim() || undefined,
      estimatedCostPerPerson: Math.max(0, Number(estimatedCostPerPerson) || 0),
      assignedTeam: assignedTeam.length > 0 ? assignedTeam : [currentUser.id],
    });

    setTitle('');
    setLocationOrRecipe('');
    setDescription('');
    setShoppingNotes('');
    setShowAddForm(false);
  };

  const getTraveler = (id: string) =>
    trip.travelers.find((t) => t.id === id) || {
      id,
      name: 'Mitreisender',
      initials: 'MR',
      color: '#E8C2E8',
    };

  const daysToRender = viewAllDays
    ? Array.from({ length: trip.totalDays }, (_, i) => i + 1)
    : [selectedDay];

  // Quick stats
  const cookCount = trip.meals.filter((m) => m.style === 'cook').length;
  const restaurantCount = trip.meals.filter((m) => m.style === 'restaurant').length;
  const totalMealCostPerPerson = trip.meals.reduce(
    (sum, m) => sum + m.estimatedCostPerPerson,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#EFECE6] rounded-[28px] p-6 border border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#F7C59F] text-[#141416] mb-2">
            <Utensils className="w-3.5 h-3.5" />
            Essensplaner & Kulinarik
          </span>
          <h1 className="text-2xl font-extrabold text-[#141416]">
            Was essen wir an welchem Tag?
          </h1>
          <p className="text-xs text-neutral-600 mt-1">
            Plant Frühstück, Mittag- und Abendessen, teilt Koch-Teams ein und stimmt zwischen Restaurant oder Selbstkochen ab.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-white/80 rounded-2xl px-3.5 py-2 text-xs border border-black/5">
            <span className="text-neutral-500 block text-[10px] font-bold uppercase">
              Kulinarik-Mix
            </span>
            <span className="font-extrabold text-[#141416]">
              {cookCount}x Kochen • {restaurantCount}x Restaurant • ~{totalMealCostPerPerson} € p.P.
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="bg-[#141416] hover:bg-neutral-800 text-white rounded-full px-5 py-3 text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Formular schließen' : '+ Essens-Vorschlag'}</span>
          </button>
        </div>
      </div>

      {/* Day Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setViewAllDays(true)}
          className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all shrink-0 ${
            viewAllDays
              ? 'bg-[#141416] text-white shadow-sm'
              : 'bg-[#EFECE6] text-[#141416] hover:bg-[#F4DF7B]/60'
          }`}
        >
          Alle Tage Übersicht ({trip.meals.length})
        </button>

        {Array.from({ length: trip.totalDays }, (_, i) => i + 1).map((dayNum) => {
          const isSelected = !viewAllDays && selectedDay === dayNum;
          const count = trip.meals.filter((m) => m.dayNumber === dayNum).length;

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => {
                setViewAllDays(false);
                setSelectedDay(dayNum);
              }}
              className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#E8C2E8] text-[#141416] ring-2 ring-[#141416]/15 shadow-xs'
                  : 'bg-[#EFECE6] text-neutral-700 hover:bg-[#E8C2E8]/50'
              }`}
            >
              <span>Tag {dayNum}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 text-[#141416]">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Add Meal Proposal Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateMeal}
          className="bg-[#F4DF7B]/35 rounded-[26px] p-6 border border-[#141416]/10 space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#141416]">
                Neuen Essens-Vorschlag hinzufügen
              </h3>
              <p className="text-xs text-neutral-600">
                Mehrere Vorschläge pro Mahlzeit sind möglich – die Gruppe stimmt einfach ab!
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
            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Reisetag
              </label>
              <select
                value={formDay}
                onChange={(e) => setFormDay(Number(e.target.value))}
                className="w-full bg-white rounded-2xl px-3 py-2.5 text-xs font-semibold border border-black/10"
              >
                {Array.from({ length: trip.totalDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Tag {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Mahlzeit-Slot
              </label>
              <select
                value={mealType}
                onChange={(e) => {
                  const nextType = e.target.value as MealType;
                  setMealType(nextType);
                  const slot = MEAL_SLOTS.find((s) => s.type === nextType);
                  if (slot) setTime(slot.defaultTime);
                }}
                className="w-full bg-white rounded-2xl px-3 py-2.5 text-xs font-semibold border border-black/10"
              >
                <option value="breakfast">Frühstück</option>
                <option value="lunch">Mittagessen</option>
                <option value="dinner">Abendessen</option>
                <option value="snack">Snacks & Drinks</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Verpflegungs-Art
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as MealStyle)}
                className="w-full bg-white rounded-2xl px-3 py-2.5 text-xs font-semibold border border-black/10"
              >
                <option value="cook">Selbst kochen</option>
                <option value="restaurant">Restaurant</option>
                <option value="bakery">Bäckerei / Café</option>
                <option value="delivery">Lieferservice</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Uhrzeit
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-white rounded-2xl px-3 py-2.5 text-xs font-semibold border border-black/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Gericht / Titel *
              </label>
              <input
                type="text"
                required
                placeholder="z.B. Großer Grillabend auf der Finca"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-xs border border-black/10"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Ort / Rezept-Idee
              </label>
              <input
                type="text"
                placeholder="z.B. Finca-Terrasse oder Tapas Bar Sa Cova"
                value={locationOrRecipe}
                onChange={(e) => setLocationOrRecipe(e.target.value)}
                className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-xs border border-black/10"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Geschätzte Kosten p.P. (€)
              </label>
              <input
                type="number"
                min="0"
                value={estimatedCostPerPerson}
                onChange={(e) => setEstimatedCostPerPerson(e.target.value)}
                className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-xs border border-black/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Ausführliche Beschreibung
              </label>
              <textarea
                rows={2}
                placeholder="Details zum Menü, Reservierungshinweise oder besondere Wünsche..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white rounded-2xl px-3.5 py-2 text-xs border border-black/10 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Einkaufsnotizen (ShoppingNotes)
              </label>
              <textarea
                rows={2}
                placeholder="z.B. Grillgemüse, Halloumi, frisches Baguette, Sangria-Zutaten..."
                value={shoppingNotes}
                onChange={(e) => setShoppingNotes(e.target.value)}
                className="w-full bg-white rounded-2xl px-3.5 py-2 text-xs border border-black/10 resize-none"
              />
            </div>
          </div>

          {/* Assigned Team Selector */}
          <div>
            <label className="text-xs font-bold text-[#141416] block mb-1.5">
              Koch- / Orga-Team (Wer kümmert sich ums Kochen, Einkaufen oder Reservieren?)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {trip.travelers.map((trav) => {
                const selected = assignedTeam.includes(trav.id);
                return (
                  <button
                    key={trav.id}
                    type="button"
                    onClick={() => toggleTeamMember(trav.id)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      selected
                        ? 'bg-[#141416] text-white border-[#141416]'
                        : 'bg-white text-neutral-700 border-black/10 hover:bg-[#EFECE6]'
                    }`}
                  >
                    <span
                      style={{ backgroundColor: trav.color }}
                      className="w-5 h-5 rounded-full text-[10px] font-bold text-[#141416] flex items-center justify-center"
                    >
                      {trav.initials}
                    </span>
                    <span>{trav.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
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
              Essens-Vorschlag speichern
            </button>
          </div>
        </form>
      )}

      {/* Days & 4 Structured Meal Slots */}
      <div className="space-y-8">
        {daysToRender.map((dayNum) => {
          const dayMeals = trip.meals.filter((m) => m.dayNumber === dayNum);

          return (
            <div key={dayNum} className="space-y-4">
              {viewAllDays && (
                <div className="flex items-center justify-between border-b border-black/10 pb-2">
                  <h2 className="text-lg font-extrabold text-[#141416]">
                    Tag {dayNum} – Kulinarischer Plan
                  </h2>
                  <span className="text-xs font-semibold text-neutral-500">
                    {dayMeals.length} Einträge
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MEAL_SLOTS.map((slot) => {
                  const slotMeals = dayMeals
                    .filter((m) => m.mealType === slot.type)
                    .sort((a, b) => b.votes.length - a.votes.length);

                  const maxVotes =
                    slotMeals.length > 1
                      ? Math.max(...slotMeals.map((m) => m.votes.length))
                      : 0;

                  return (
                    <div
                      key={slot.type}
                      className="bg-[#EFECE6]/70 rounded-[26px] p-5 border border-black/5 flex flex-col justify-between gap-4"
                    >
                      <div>
                        {/* Slot Header */}
                        <div className="flex items-center justify-between mb-3.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-9 h-9 rounded-2xl ${slot.accentBg} flex items-center justify-center shadow-2xs`}
                            >
                              {slot.icon}
                            </div>
                            <div>
                              <h3 className="text-sm font-extrabold text-[#141416]">
                                {slot.label}
                              </h3>
                              <span className="text-[11px] text-neutral-500">
                                {slotMeals.length === 0
                                  ? 'Noch offen'
                                  : slotMeals.length === 1
                                  ? '1 Vorschlag'
                                  : `${slotMeals.length} Optionen zur Abstimmung`}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              openSlotAdd(dayNum, slot.type, slot.defaultTime)
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold bg-white hover:bg-[#141416] hover:text-white text-[#141416] transition-colors border border-black/5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Option</span>
                          </button>
                        </div>

                        {/* Proposals inside this slot */}
                        {slotMeals.length === 0 ? (
                          <div className="bg-[#F9F6F0]/80 rounded-2xl p-5 text-center border border-dashed border-black/10">
                            <p className="text-xs font-semibold text-neutral-500">
                              Noch kein {slot.label} für Tag {dayNum} geplant.
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                openSlotAdd(dayNum, slot.type, slot.defaultTime)
                              }
                              className="mt-2 text-xs font-bold text-[#141416] underline hover:no-underline"
                            >
                              + Jetzt Vorschlag eintragen
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {slotMeals.map((meal) => {
                              const styleMeta = STYLE_META[meal.style];
                              const proposer = getTraveler(meal.proposedBy);
                              const hasVoted = meal.votes.includes(currentUser.id);
                              const isLeading =
                                slotMeals.length > 1 &&
                                meal.votes.length === maxVotes &&
                                maxVotes > 0;

                              return (
                                <div
                                  key={meal.id}
                                  className={`rounded-[20px] p-4 transition-all border ${
                                    isLeading
                                      ? 'bg-white border-[#141416]/20 shadow-xs'
                                      : 'bg-[#F9F6F0] border-black/5'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#EFECE6] px-2.5 py-0.5 rounded-full text-[#141416]">
                                        <Clock className="w-3 h-3 text-neutral-500" />
                                        {meal.time}
                                      </span>
                                      <span
                                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${styleMeta.badgeClass}`}
                                      >
                                        {styleMeta.icon}
                                        <span>{styleMeta.label}</span>
                                      </span>
                                      {isLeading && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-[#F4DF7B] text-[#141416] px-2 py-0.5 rounded-full">
                                          <Trophy className="w-3 h-3" /> Favorit
                                        </span>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => deleteMeal(meal.id)}
                                      className="text-neutral-400 hover:text-red-600 p-1"
                                      title="Essensvorschlag löschen"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <h4 className="text-sm font-extrabold text-[#141416] mt-2">
                                    {meal.title}
                                  </h4>

                                  <p className="text-xs text-neutral-600 mt-1 flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                    <span className="font-semibold text-[#141416]">
                                      {meal.locationOrRecipe}
                                    </span>
                                    <span>• ca. {meal.estimatedCostPerPerson} € p.P.</span>
                                  </p>

                                  <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                                    {meal.description}
                                  </p>

                                  {meal.ShoppingNotes && (
                                    <div className="mt-2.5 bg-[#F4DF7B]/30 rounded-xl px-3 py-2 text-[11px] text-[#141416] flex items-start gap-2">
                                      <ShoppingBag className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                      <div>
                                        <strong className="font-bold">Einkaufsnotiz: </strong>
                                        {meal.ShoppingNotes}
                                      </div>
                                    </div>
                                  )}

                                  {/* Team & Voting Footer */}
                                  <div className="mt-3 pt-2.5 border-t border-black/5 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-600">
                                      <Users className="w-3.5 h-3.5 text-neutral-400" />
                                      <span>Team:</span>
                                      <div className="flex items-center -space-x-1">
                                        {meal.assignedTeam.map((tId) => {
                                          const member = getTraveler(tId);
                                          return (
                                            <span
                                              key={tId}
                                              style={{ backgroundColor: member.color }}
                                              className="w-5 h-5 rounded-full text-[9px] font-bold text-[#141416] flex items-center justify-center ring-1 ring-white"
                                              title={`Orga/Koch-Team: ${member.name}`}
                                            >
                                              {member.initials}
                                            </span>
                                          );
                                        })}
                                      </div>
                                      <span className="text-[10px] text-neutral-400 ml-1">
                                        (von {proposer.name})
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center -space-x-1.5">
                                        {meal.votes.map((vId) => {
                                          const voter = getTraveler(vId);
                                          return (
                                            <span
                                              key={vId}
                                              style={{ backgroundColor: voter.color }}
                                              className="w-5 h-5 rounded-full text-[9px] font-bold text-[#141416] flex items-center justify-center ring-1 ring-white"
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
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                                          hasVoted
                                            ? 'bg-[#141416] text-white'
                                            : 'bg-[#EFECE6] hover:bg-[#E8C2E8] text-[#141416]'
                                        }`}
                                      >
                                        <ThumbsUp className="w-3 h-3" />
                                        <span>{meal.votes.length}</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MealsView;
