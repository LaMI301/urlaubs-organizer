import React, { useState } from 'react';
import {
  X,
  Compass,
  Calendar,
  Users,
  Wallet,
  Sparkles,
  Plus,
  Trash2,
  Check,
  MapPin,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';

const QUICK_TEMPLATES = [
  {
    title: 'Toskana Roadtrip & Wein',
    destination: 'Florenz & Val d’Orcia, Italien',
    subtitle: 'Kulinarik, Weinberge & historische Städte',
    totalDays: 7,
    budget: 850,
  },
  {
    title: 'Amalfiküste & Capri Sommer',
    destination: 'Positano & Sorrento, Italien',
    subtitle: 'Strandclubs, Bootstour & Pizza Napoletana',
    totalDays: 6,
    budget: 950,
  },
  {
    title: 'Hütten- & Skiurlaub Tirol',
    destination: 'Zillertal, Österreich',
    subtitle: 'Pistentage, Kaiserschmarrn & Sauna-Abende',
    totalDays: 5,
    budget: 650,
  },
  {
    title: 'Lissabon & Algarve Surfcamp',
    destination: 'Lissabon & Lagos, Portugal',
    subtitle: 'Städtetrip, Atlantikwellen & Pastéis de Belém',
    totalDays: 8,
    budget: 780,
  },
];

export const NewTripModal: React.FC = () => {
  const {
    isNewTripModalOpen,
    setIsNewTripModalOpen,
    createNewTrip,
    switchToDemoTrip,
  } = useVacation();

  const [title, setTitle] = useState('Toskana Roadtrip 2026');
  const [destination, setDestination] = useState('Florenz & Siena, Italien');
  const [subtitle, setSubtitle] = useState(
    'Gemeinsamer Sommerurlaub mit Freunden'
  );
  const [startDate, setStartDate] = useState('2026-08-01');
  const [totalDays, setTotalDays] = useState(7);
  const [budgetTargetPerPerson, setBudgetTargetPerPerson] = useState(800);
  const [travelerNames, setTravelerNames] = useState<string[]>([
    'Lars',
    'Mia',
    'Tom',
    'Sofia',
  ]);
  const [newPersonInput, setNewPersonInput] = useState('');

  if (!isNewTripModalOpen) return null;

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPersonInput.trim();
    if (!trimmed) return;
    if (!travelerNames.includes(trimmed)) {
      setTravelerNames((prev) => [...prev, trimmed]);
    }
    setNewPersonInput('');
  };

  const handleRemovePerson = (name: string) => {
    if (travelerNames.length <= 1) return;
    setTravelerNames((prev) => prev.filter((n) => n !== name));
  };

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !destination.trim()) return;
    createNewTrip({
      title: title.trim(),
      destination: destination.trim(),
      subtitle:
        subtitle.trim() || `${totalDays} Tage in ${destination.trim()}`,
      startDate,
      totalDays: Math.min(21, Math.max(1, Number(totalDays) || 7)),
      budgetTargetPerPerson: Math.max(50, Number(budgetTargetPerPerson) || 600),
      travelerNames: travelerNames.length > 0 ? travelerNames : ['Ich'],
    });
    setIsNewTripModalOpen(false);
  };

  const handleLoadDemoInstead = () => {
    switchToDemoTrip();
    setIsNewTripModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#F9F6F0] text-[#141416] w-full max-w-2xl rounded-[32px] shadow-2xl border border-black/10 overflow-hidden my-auto">
        {/* Top Header */}
        <div className="bg-[#141416] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F4DF7B] text-[#141416] flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">
                Neuen Urlaub planen & konfigurieren
              </h2>
              <p className="text-xs text-white/65">
                Wo geht es hin, wie viele Tage bleibt ihr und wer reist mit?
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsNewTripModalOpen(false)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreateTrip} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Quick Inspiration Templates */}
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#141416]/55 block mb-2">
              Schnell-Vorlagen zum Ausprobieren:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.title}
                  type="button"
                  onClick={() => {
                    setTitle(tpl.title);
                    setDestination(tpl.destination);
                    setSubtitle(tpl.subtitle);
                    setTotalDays(tpl.totalDays);
                    setBudgetTargetPerPerson(tpl.budget);
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#EFECE6] hover:bg-[#F4DF7B] text-[#141416] transition-colors"
                >
                  {tpl.title} ({tpl.totalDays}T)
                </button>
              ))}
            </div>
          </div>

          {/* 1. Wo geht es hin? */}
          <div className="bg-[#EFECE6] rounded-[24px] p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#141416]/70">
              <MapPin className="w-4 h-4 text-[#141416]" />
              <span>1. Wo geht es hin?</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#141416]/75 mb-1">
                  Name des Urlaubs
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z. B. Sommer-Finca Mallorca"
                  className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-[#141416] border border-black/10 focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141416]/75 mb-1">
                  Reiseziel / Region
                </label>
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="z. B. Santanyí, Mallorca"
                  className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-[#141416] border border-black/10 focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141416]/75 mb-1">
                Untertitel / Motto (optional)
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="z. B. Strand, gutes Essen & Ausflüge"
                className="w-full bg-white rounded-2xl px-3.5 py-2 text-xs font-medium text-[#141416] border border-black/10 focus:outline-none focus:border-black"
              />
            </div>
          </div>

          {/* 2. Wie viele Tage & Startdatum & Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#F4DF7B]/60 rounded-[24px] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#141416]/80">
                  <Calendar className="w-4 h-4" />
                  2. Dauer & Start
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#141416] text-[#F4DF7B] text-xs font-black">
                  {totalDays} {totalDays === 1 ? 'Tag' : 'Tage'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141416]/75 mb-1">
                  Anzahl Reisetage (1 – 21 Tage)
                </label>
                <input
                  type="range"
                  min={1}
                  max={21}
                  value={totalDays}
                  onChange={(e) => setTotalDays(Number(e.target.value))}
                  className="w-full accent-[#141416] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141416]/75 mb-1">
                  Anreisetag
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white rounded-2xl px-3 py-2 text-xs font-bold text-[#141416] border border-black/10 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-[#E8C2E8]/60 rounded-[24px] p-4 space-y-3 flex flex-col justify-between">
              <div>
                <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#141416]/80 mb-2">
                  <Wallet className="w-4 h-4" />
                  3. Budget-Richtwert
                </span>
                <label className="block text-xs font-bold text-[#141416]/75 mb-1">
                  Geplantes Budget pro Person (€)
                </label>
                <input
                  type="number"
                  min={50}
                  step={50}
                  value={budgetTargetPerPerson}
                  onChange={(e) =>
                    setBudgetTargetPerPerson(Number(e.target.value))
                  }
                  className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-base font-black text-[#141416] border border-black/10 focus:outline-none"
                />
              </div>
              <p className="text-[11px] font-medium text-[#141416]/70">
                Entspricht ca.{' '}
                <strong>
                  {Math.round(budgetTargetPerPerson / Math.max(1, totalDays))} €
                </strong>{' '}
                pro Tag für Aktivitäten & Essen.
              </p>
            </div>
          </div>

          {/* 4. Wer reist mit? (Ohne Account!) */}
          <div className="bg-[#C5D1F5]/55 rounded-[24px] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#141416]/80">
                <Users className="w-4 h-4" />
                4. Mitreisende (ohne Account & Login)
              </span>
              <span className="text-xs font-bold text-[#141416]/70">
                {travelerNames.length} Personen
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {travelerNames.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 bg-white pl-3 pr-2 py-1.5 rounded-full text-xs font-bold text-[#141416] shadow-sm"
                >
                  <span>{name}</span>
                  {travelerNames.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePerson(name)}
                      className="w-4 h-4 rounded-full hover:bg-black/10 flex items-center justify-center text-[#141416]/60 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newPersonInput}
                onChange={(e) => setNewPersonInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPerson(e);
                  }
                }}
                placeholder="Weiteren Namen eingeben (z. B. Lukas)..."
                className="flex-1 bg-white rounded-full px-4 py-2 text-xs font-semibold text-[#141416] border border-black/10 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddPerson}
                className="inline-flex items-center gap-1 bg-[#141416] text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-black/85"
              >
                <Plus className="w-3.5 h-3.5 text-[#F4DF7B]" />
                <span>Hinzufügen</span>
              </button>
            </div>
          </div>

          {/* Submit & Demo Switcher Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-black/10">
            <button
              type="button"
              onClick={handleLoadDemoInstead}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold bg-[#EFECE6] hover:bg-[#e4dfd7] text-[#141416] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#141416]" />
              <span>Stattdessen Testmodus mit Beispielwerten laden</span>
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-extrabold bg-[#141416] text-white hover:bg-black/90 shadow-lg transition-all"
            >
              <Check className="w-4 h-4 text-[#F4DF7B]" />
              <span>Urlaub jetzt erstellen</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTripModal;
