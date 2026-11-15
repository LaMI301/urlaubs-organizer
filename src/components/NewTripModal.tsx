import React, { useEffect, useState } from 'react';
import {
  X,
  Compass,
  Calendar,
  Users,
  Wallet,
  Plus,
  Trash2,
  Check,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Palmtree,
  Building2,
  Car,
  Mountain,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import { CurrencyCode } from '../types/vacation';
import { clampCost, parseLocalDate } from '../utils/vacationHelpers';

type TripTemplateId = 'beach' | 'city' | 'roadtrip' | 'mountain';

interface TripTemplate {
  id: TripTemplateId;
  label: string;
  defaultDays: number;
  defaultSubtitle: string;
  placeholderDest: string;
  icon: React.FC<{ className?: string }>;
  accentClass: string;
}

const TRIP_TEMPLATES: TripTemplate[] = [
  {
    id: 'beach',
    label: 'Strand / Finca',
    defaultDays: 7,
    defaultSubtitle: 'Sonne, versteckte Buchten, Pool & lange Abende',
    placeholderDest: 'z. B. Mallorca, Kreta, Algarve...',
    icon: Palmtree,
    accentClass: 'border-[#D9822B]/50 bg-[#D9822B]/14 text-[#9E5A14]',
  },
  {
    id: 'city',
    label: 'Städtetrip',
    defaultDays: 4,
    defaultSubtitle: 'Spots, Food-Märkte, Kultur & Rooftop-Drinks',
    placeholderDest: 'z. B. Lissabon, Barcelona, Rom...',
    icon: Building2,
    accentClass: 'border-[#2A7B88]/50 bg-[#2A7B88]/12 text-[#1F5E68]',
  },
  {
    id: 'roadtrip',
    label: 'Roadtrip',
    defaultDays: 10,
    defaultSubtitle: 'Etappen, Küstenstraßen & spontane Stopps',
    placeholderDest: 'z. B. Schottland, Toskana, Norwegen...',
    icon: Car,
    accentClass: 'border-[#6E7F5E]/50 bg-[#6E7F5E]/14 text-[#4E5F40]',
  },
  {
    id: 'mountain',
    label: 'Berge / Aktiv',
    defaultDays: 6,
    defaultSubtitle: 'Gipfeltouren, Hüttenabend & frische Bergluft',
    placeholderDest: 'z. B. Südtirol, Österreich, Allgäu...',
    icon: Mountain,
    accentClass: 'border-[#C85A38]/50 bg-[#C85A38]/12 text-[#9E3F22]',
  },
];

function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysToIso(isoStart: string, daysToAdd: number): string {
  const parsed = parseLocalDate(isoStart) || new Date(2026, 7, 1);
  const next = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate() + daysToAdd
  );
  return formatIsoDate(next);
}

function diffDaysInclusive(isoStart: string, isoEnd: string): number {
  const s = parseLocalDate(isoStart);
  const e = parseLocalDate(isoEnd);
  if (!s || !e) return 7;
  const utcStart = Date.UTC(s.getFullYear(), s.getMonth(), s.getDate());
  const utcEnd = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate());
  const diff = Math.round((utcEnd - utcStart) / 86400000) + 1;
  return Math.max(1, Math.min(60, diff));
}

export const NewTripModal: React.FC = () => {
  const {
    isUnlocked,
    isNewTripModalOpen,
    setIsNewTripModalOpen,
    createNewTrip,
  } = useVacation();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Reiseziel, Template & Name
  const [selectedTemplate, setSelectedTemplate] = useState<TripTemplateId | null>(null);
  const [destination, setDestination] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [subtitleWasAuto, setSubtitleWasAuto] = useState(false);

  // Step 2: Start- & Enddatum Range-Picker (1-60 Tage) & Budget
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-08-07');
  const [totalDays, setTotalDays] = useState(7);
  const [budgetTargetPerPerson, setBudgetTargetPerPerson] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');

  // Step 3: Mitreisende & Deine Auswahl
  const [travelerNames, setTravelerNames] = useState<string[]>([]);
  const [newPersonInput, setNewPersonInput] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');

  // Reset form to clean empty state whenever opened
  useEffect(() => {
    if (isNewTripModalOpen) {
      setStep(1);
      setSelectedTemplate(null);
      setDestination('');
      setTitle('');
      setSubtitle('');
      setSubtitleWasAuto(false);
      setStartDate('2026-08-01');
      setEndDate('2026-08-07');
      setTotalDays(7);
      setBudgetTargetPerPerson('');
      setCurrency('EUR');
      setTravelerNames([]);
      setNewPersonInput('');
      setDuplicateWarning('');
      setSelectedUserName('');
    }
  }, [isNewTripModalOpen]);

  // ESC closes modal
  useEffect(() => {
    if (!isNewTripModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsNewTripModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewTripModalOpen, setIsNewTripModalOpen]);

  if (!isUnlocked || !isNewTripModalOpen) return null;

  const handleSelectTemplate = (tpl: TripTemplate) => {
    if (selectedTemplate === tpl.id) {
      setSelectedTemplate(null);
      if (subtitleWasAuto) {
        setSubtitle('');
        setSubtitleWasAuto(false);
      }
      return;
    }

    setSelectedTemplate(tpl.id);
    if (!subtitle.trim() || subtitleWasAuto) {
      setSubtitle(tpl.defaultSubtitle);
      setSubtitleWasAuto(true);
    }
    const clampedDays = Math.max(1, Math.min(60, tpl.defaultDays));
    setTotalDays(clampedDays);
    setEndDate(addDaysToIso(startDate || '2026-08-01', clampedDays - 1));
  };

  const handleStartDateChange = (nextStart: string) => {
    if (!nextStart) {
      setStartDate('');
      return;
    }
    setStartDate(nextStart);
    const nextEnd = addDaysToIso(nextStart, Math.max(0, totalDays - 1));
    setEndDate(nextEnd);
  };

  const handleEndDateChange = (nextEnd: string) => {
    if (!nextEnd) {
      setEndDate('');
      return;
    }
    const baseStart = startDate || '2026-08-01';
    if (!startDate) {
      setStartDate(baseStart);
    }
    const s = parseLocalDate(baseStart);
    const e = parseLocalDate(nextEnd);
    if (!s || !e) return;

    if (e.getTime() < s.getTime()) {
      setEndDate(baseStart);
      setTotalDays(1);
      return;
    }

    const diff = diffDaysInclusive(baseStart, nextEnd);
    const clampedEnd = addDaysToIso(baseStart, diff - 1);
    setEndDate(clampedEnd);
    setTotalDays(diff);
  };

  const handleDaysChange = (nextDays: number) => {
    const clamped = Math.max(1, Math.min(60, Math.round(nextDays) || 1));
    setTotalDays(clamped);
    const baseStart = startDate || '2026-08-01';
    if (!startDate) setStartDate(baseStart);
    setEndDate(addDaysToIso(baseStart, clamped - 1));
  };

  const handleAddPerson = () => {
    const trimmed = newPersonInput.trim();
    if (!trimmed) return;
    const isDup = travelerNames.some(
      (n) => n.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDup) {
      setDuplicateWarning(`„${trimmed}“ wurde bereits hinzugefügt`);
      return;
    }
    setDuplicateWarning('');
    const updated = [...travelerNames, trimmed];
    setTravelerNames(updated);
    if (!selectedUserName) {
      setSelectedUserName(trimmed);
    }
    setNewPersonInput('');
  };

  const handleRemovePerson = (name: string) => {
    const updated = travelerNames.filter((n) => n !== name);
    setTravelerNames(updated);
    if (selectedUserName === name) {
      setSelectedUserName(updated[0] || '');
    }
  };

  const canAdvanceStep1 =
    destination.trim().length > 0 && title.trim().length > 0;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent Enter in Step 1 or Step 2 from creating the trip prematurely!
    if (step === 1) {
      if (canAdvanceStep1) {
        setStep(2);
      }
      return;
    }

    if (step === 2) {
      setStep(3);
      return;
    }

    // Step 3: Merge unsaved newPersonInput if present (case-insensitive dedup)
    const pendingName = newPersonInput.trim();
    const mergedNames = [...travelerNames];
    if (
      pendingName &&
      !mergedNames.some((n) => n.toLowerCase() === pendingName.toLowerCase())
    ) {
      mergedNames.push(pendingName);
    }
    const finalNames = mergedNames.length > 0 ? mergedNames : ['Ich'];

    const activeName =
      selectedUserName &&
      finalNames.some((n) => n.toLowerCase() === selectedUserName.toLowerCase())
        ? selectedUserName
        : finalNames[0];

    const trimmedBudget = budgetTargetPerPerson.trim();
    const parsedBudget =
      trimmedBudget === '' ? 0 : clampCost(trimmedBudget) ?? 0;

    createNewTrip({
      title: title.trim(),
      destination: destination.trim(),
      subtitle:
        subtitle.trim() || `${totalDays} Tage in ${destination.trim()}`,
      startDate: startDate || '2026-08-01',
      totalDays: Math.min(60, Math.max(1, Number(totalDays) || 7)),
      budgetTargetPerPerson: parsedBudget,
      currency,
      travelerNames: finalNames,
      selectedUserName: activeName,
    });
    setIsNewTripModalOpen(false);
  };

  const activeTemplateObj = TRIP_TEMPLATES.find((t) => t.id === selectedTemplate);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-trip-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setIsNewTripModalOpen(false);
        }
      }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-[#1F1B18]/45 backdrop-blur-sm p-0 sm:p-4"
    >
      <div className="surface-glass-elevated mobile-sheet text-[#1F1B18] w-full max-w-xl max-h-[92dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl shadow-2xl">
        {/* Top Header + Step Progress */}
        <div className="bg-[#FAF7F2]/95 border-b border-[#E6DDD1] px-5 sm:px-6 pt-3 pb-4 sm:py-5 shrink-0 backdrop-blur-xl">
          <div
            aria-hidden="true"
            className="sm:hidden w-10 h-1 rounded-full bg-[#DDD2C3] mx-auto mb-3"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#C85A38] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Compass className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="font-mono tabular-nums text-[11px] font-bold uppercase tracking-wider text-[#C85A38] block">
                  Schritt {step} von 3
                </span>
                <h2
                  id="new-trip-modal-title"
                  className="text-lg font-extrabold tracking-tight text-[#1F1B18] truncate"
                >
                  Neuen Urlaub erstellen
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsNewTripModalOpen(false)}
              aria-label="Modal schließen"
              className="w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-[#F3ECE1] hover:bg-[#E6DDD1] border border-[#DDD2C3] flex items-center justify-center text-[#6B6259] hover:text-[#1F1B18] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Progress Bar 1/3 -> 2/3 -> 3/3 */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s <= step ? 'bg-[#C85A38]' : 'bg-[#E6DDD1]'
                }`}
              />
            ))}
          </div>
        </div>

        <form
          onSubmit={handleFormSubmit}
          className="flex-1 overflow-y-auto overscroll-contain pb-safe"
        >
          <div className="p-5 sm:p-7 space-y-6">
          {/* STEP 1: REISEZIEL, TEMPLATE & NAME */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-extrabold text-[#1F1B18] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#C85A38]" />
                  <span>Reiseziel, Stil &amp; Name</span>
                </h3>
                <p className="text-xs text-[#6B6259] mt-0.5">
                  Wähle optional ein Reisetyp-Template und gib euer Ziel ein.
                </p>
              </div>

              {/* Reisetyp-Templates */}
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[#6B6259] mb-2">
                  Reisetyp-Template (optional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {TRIP_TEMPLATES.map((tpl) => {
                    const Icon = tpl.icon;
                    const active = selectedTemplate === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleSelectTemplate(tpl)}
                        aria-pressed={active}
                        className={`min-h-[44px] p-3 sm:p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                          active
                            ? `${tpl.accentClass} shadow-sm`
                            : 'bg-[#FAF7F2] hover:bg-[#F3ECE1] border-[#E6DDD1] text-[#6B6259]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon className="w-4 h-4" />
                          <span className="font-mono tabular-nums text-[10px] opacity-80">
                            {tpl.defaultDays}T
                          </span>
                        </div>
                        <span className="text-xs font-bold leading-tight">
                          {tpl.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="new-trip-destination"
                    className="block text-xs font-bold text-[#1F1B18] mb-1.5"
                  >
                    Wo geht es hin? (Land, Ort oder Region) *
                  </label>
                  <input
                    id="new-trip-destination"
                    type="text"
                    required
                    autoFocus
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder={
                      activeTemplateObj?.placeholderDest ||
                      'z. B. Italien, Mallorca, Österreich...'
                    }
                    className="surface-input w-full rounded-2xl px-4 py-3 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-trip-title"
                    className="block text-xs font-bold text-[#1F1B18] mb-1.5"
                  >
                    Wie soll der Urlaub heißen? *
                  </label>
                  <input
                    id="new-trip-title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="z. B. Sommerurlaub 2026"
                    className="surface-input w-full rounded-2xl px-4 py-3 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-trip-subtitle"
                    className="block text-xs font-bold text-[#1F1B18] mb-1.5"
                  >
                    Kurze Beschreibung / Motto (optional)
                  </label>
                  <input
                    id="new-trip-subtitle"
                    type="text"
                    value={subtitle}
                    onChange={(e) => {
                      setSubtitle(e.target.value);
                      setSubtitleWasAuto(false);
                    }}
                    placeholder="Optionales Motto für die Gruppe..."
                    className="surface-input w-full rounded-2xl px-4 py-2.5 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-[#E6DDD1]">
                <button
                  type="button"
                  disabled={!canAdvanceStep1}
                  onClick={() => setStep(2)}
                  className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-extrabold bg-[#C85A38] hover:bg-[#B54B2B] disabled:opacity-40 text-white shadow-sm transition-all cursor-pointer"
                >
                  <span>Weiter zu Schritt 2</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: START-/ENDDATUM RANGE-PICKER (1-60 TAGE) & BUDGET */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-extrabold text-[#1F1B18] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#C85A38]" />
                  <span>Zeitraum &amp; Budget</span>
                </h3>
                <p className="text-xs text-[#6B6259] mt-0.5">
                  Wähle Start- &amp; Enddatum (1–60 Tage) sowie euer Budgetziel.
                </p>
              </div>

              {/* Date Range Card */}
              <div className="bg-[#FAF7F2] border border-[#E6DDD1] rounded-[24px] p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="new-trip-start-date"
                      className="block text-[11px] font-bold text-[#6B6259] mb-1.5"
                    >
                      Startdatum
                    </label>
                    <input
                      id="new-trip-start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="surface-input w-full rounded-2xl px-3.5 py-2.5 text-xs font-bold font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-trip-end-date"
                      className="block text-[11px] font-bold text-[#6B6259] mb-1.5"
                    >
                      Enddatum (max. 60 Tage)
                    </label>
                    <input
                      id="new-trip-end-date"
                      type="date"
                      min={startDate || undefined}
                      max={startDate ? addDaysToIso(startDate, 59) : undefined}
                      value={endDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      className="surface-input w-full rounded-2xl px-3.5 py-2.5 text-xs font-bold font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="new-trip-days-range"
                      className="text-xs font-bold text-[#1F1B18]"
                    >
                      Reisedauer (1–60 Tage)
                    </label>
                    <span className="font-mono tabular-nums px-3 py-1 rounded-full bg-[#C85A38] text-white text-xs font-black">
                      {totalDays} {totalDays === 1 ? 'Tag' : 'Tage'}
                    </span>
                  </div>

                  <input
                    id="new-trip-days-range"
                    type="range"
                    min={1}
                    max={60}
                    value={totalDays}
                    onChange={(e) => handleDaysChange(Number(e.target.value))}
                    className="w-full accent-[#C85A38] cursor-pointer"
                  />

                  <div className="flex flex-wrap items-center gap-1.5">
                    {[3, 5, 7, 10, 14, 21, 30, 45].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleDaysChange(preset)}
                        className={`min-h-[44px] sm:min-h-[30px] font-mono tabular-nums px-3.5 py-2 sm:px-2.5 sm:py-1 rounded-full text-xs sm:text-[11px] font-bold border transition-colors cursor-pointer ${
                          totalDays === preset
                            ? 'bg-[#C85A38]/12 border-[#C85A38]/35 text-[#9E3F22]'
                            : 'bg-white hover:bg-[#F3ECE1] border-[#DDD2C3] text-[#6B6259]'
                        }`}
                      >
                        {preset}T
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Budget Target (0 EUR allowed, step="any") + Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-3">
                <div>
                  <label
                    htmlFor="new-trip-budget"
                    className="block text-xs font-bold text-[#1F1B18] mb-1.5 flex items-center gap-1.5"
                  >
                    <Wallet className="w-3.5 h-3.5 text-[#4E5F40]" />
                    <span>Geplantes Budget p.P. (0 = ohne Limit)</span>
                  </label>
                  <input
                    id="new-trip-budget"
                    type="number"
                    min={0}
                    step="any"
                    value={budgetTargetPerPerson}
                    onChange={(e) => setBudgetTargetPerPerson(e.target.value)}
                    placeholder="z. B. 600 oder 0"
                    className="surface-input w-full rounded-2xl px-4 py-3 text-xs font-bold font-mono tabular-nums"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-trip-currency"
                    className="block text-xs font-bold text-[#1F1B18] mb-1.5"
                  >
                    Währung
                  </label>
                  <select
                    id="new-trip-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="surface-input w-full rounded-2xl px-3.5 py-3 text-xs font-bold font-mono"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="CHF">CHF</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#E6DDD1]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold bg-[#F3ECE1] hover:bg-[#E6DDD1] border border-[#DDD2C3] text-[#1F1B18] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Zurück</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="min-h-[44px] inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-extrabold bg-[#C85A38] hover:bg-[#B54B2B] text-white shadow-sm transition-all cursor-pointer"
                >
                  <span>Weiter zu Schritt 3</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: MITREISENDE & DEINE AUSWAHL */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-extrabold text-[#1F1B18] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#C85A38]" />
                  <span>Mitreisende &amp; Deine Auswahl</span>
                </h3>
                <p className="text-xs text-[#6B6259] mt-0.5">
                  Trage die Vornamen eurer Gruppe ein und markiere deinen eigenen
                  Namen.
                </p>
              </div>

              {/* Add person input */}
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <label htmlFor="new-trip-person-input" className="sr-only">
                    Vorname eines Mitreisenden
                  </label>
                  <input
                    id="new-trip-person-input"
                    type="text"
                    autoFocus
                    value={newPersonInput}
                    onChange={(e) => {
                      setNewPersonInput(e.target.value);
                      if (duplicateWarning) setDuplicateWarning('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPerson();
                      }
                    }}
                    placeholder="Vorname eingeben (z. B. Lars)..."
                    className="surface-input flex-1 min-w-0 rounded-full px-4 py-3 text-sm font-semibold"
                  />
                  <button
                    type="button"
                    onClick={handleAddPerson}
                    className="min-h-[44px] inline-flex items-center gap-1.5 bg-[#F3ECE1] hover:bg-[#E6DDD1] border border-[#DDD2C3] text-[#1F1B18] px-4 sm:px-5 py-3 rounded-full text-xs font-bold cursor-pointer shrink-0 transition-colors"
                  >
                    <Plus className="w-4 h-4 text-[#C85A38]" />
                    <span>Hinzufügen</span>
                  </button>
                </div>
                {duplicateWarning && (
                  <p className="text-xs font-semibold text-[#9E5A14] pl-2">
                    {duplicateWarning}
                  </p>
                )}
              </div>

              {/* List of added names & active user picker */}
              <div className="bg-[#FAF7F2] border border-[#E6DDD1] rounded-[24px] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#6B6259]">
                    Welcher Nutzer bist du?
                  </span>
                  <span className="font-mono tabular-nums text-xs font-bold text-[#C85A38]">
                    {travelerNames.length}{' '}
                    {travelerNames.length === 1 ? 'Person' : 'Personen'}
                  </span>
                </div>

                {travelerNames.length === 0 ? (
                  <p className="text-xs text-[#6B6259] py-2">
                    Noch keine Namen in der Liste. Tippe oben einen Namen ein —
                    ein eingetippter Name wird beim Erstellen automatisch übernommen.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {travelerNames.map((name) => {
                      const isMe = selectedUserName === name;
                      return (
                        <div
                          key={name}
                          className={`inline-flex items-center gap-1 rounded-full border p-1 transition-all max-w-full ${
                            isMe
                              ? 'bg-[#C85A38]/12 border-[#C85A38]/40 text-[#1F1B18] shadow-sm'
                              : 'bg-white border-[#DDD2C3] text-[#1F1B18] hover:bg-[#F3ECE1]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedUserName(name)}
                            className="min-h-[44px] sm:min-h-[28px] inline-flex items-center gap-1.5 pl-3 pr-2 py-2 sm:pl-2.5 sm:pr-1.5 sm:py-1 text-xs font-bold cursor-pointer min-w-0"
                          >
                            <span className="truncate max-w-[140px]">{name}</span>
                            {isMe && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C85A38] text-white font-extrabold shrink-0">
                                Ich
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePerson(name)}
                            className="w-10 h-10 sm:w-6 sm:h-6 rounded-full hover:bg-rose-500/15 text-[#6B6259] hover:text-rose-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                            title={`${name} entfernen`}
                            aria-label={`${name} entfernen`}
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E6DDD1]">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold bg-[#F3ECE1] hover:bg-[#E6DDD1] border border-[#DDD2C3] text-[#1F1B18] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Zurück</span>
                </button>

                <button
                  type="submit"
                  disabled={
                    travelerNames.length === 0 && !newPersonInput.trim()
                  }
                  className="min-h-[44px] inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-extrabold bg-[#6E7F5E] hover:bg-[#5B6B4D] disabled:opacity-40 text-white shadow-sm transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Urlaub erstellen &amp; starten</span>
                </button>
              </div>
            </div>
          )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTripModal;
