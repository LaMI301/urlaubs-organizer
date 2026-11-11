import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';

export const NewTripModal: React.FC = () => {
  const {
    isNewTripModalOpen,
    setIsNewTripModalOpen,
    createNewTrip,
  } = useVacation();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Reiseziel & Name (ALL EMPTY!)
  const [destination, setDestination] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');

  // Step 2: Zeitraum & Dauer
  const [totalDays, setTotalDays] = useState(7);
  const [startDate, setStartDate] = useState('');
  const [budgetTargetPerPerson, setBudgetTargetPerPerson] = useState('');

  // Step 3: Mitreisende & Deine Auswahl (STARTS EMPTY!)
  const [travelerNames, setTravelerNames] = useState<string[]>([]);
  const [newPersonInput, setNewPersonInput] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');

  // Reset form to clean empty state whenever opened
  useEffect(() => {
    if (isNewTripModalOpen) {
      setStep(1);
      setDestination('');
      setTitle('');
      setSubtitle('');
      setTotalDays(7);
      setStartDate('');
      setBudgetTargetPerPerson('');
      setTravelerNames([]);
      setNewPersonInput('');
      setSelectedUserName('');
    }
  }, [isNewTripModalOpen]);

  if (!isNewTripModalOpen) return null;

  const handleAddPerson = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newPersonInput.trim();
    if (!trimmed) return;
    if (!travelerNames.includes(trimmed)) {
      const updated = [...travelerNames, trimmed];
      setTravelerNames(updated);
      if (!selectedUserName) {
        setSelectedUserName(trimmed);
      }
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

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || !title.trim()) {
      setStep(1);
      return;
    }

    const finalNames =
      travelerNames.length > 0
        ? travelerNames
        : newPersonInput.trim()
        ? [newPersonInput.trim()]
        : ['Ich'];

    const activeName =
      selectedUserName && finalNames.includes(selectedUserName)
        ? selectedUserName
        : finalNames[0];

    createNewTrip({
      title: title.trim(),
      destination: destination.trim(),
      subtitle:
        subtitle.trim() || `${totalDays} Tage in ${destination.trim()}`,
      startDate: startDate || '2026-08-01',
      totalDays: Math.min(21, Math.max(1, Number(totalDays) || 7)),
      budgetTargetPerPerson: Math.max(
        0,
        Number(budgetTargetPerPerson) || 600
      ),
      travelerNames: finalNames,
      selectedUserName: activeName,
    });
    setIsNewTripModalOpen(false);
  };

  const canAdvanceStep1 =
    destination.trim().length > 0 && title.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#F9F6F0] text-[#141416] w-full max-w-xl rounded-[34px] shadow-2xl border border-black/10 overflow-hidden my-auto">
        {/* Top Header + Step Progress */}
        <div className="bg-[#141416] text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F4DF7B] text-[#141416] flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#F4DF7B] block">
                  Schritt {step} von 3
                </span>
                <h2 className="text-lg font-extrabold tracking-tight">
                  Neuen Urlaub erstellen
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsNewTripModalOpen(false)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar 1/3 -> 2/3 -> 3/3 */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s <= step ? 'bg-[#F4DF7B]' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        <form onSubmit={handleCreateTrip} className="p-6 sm:p-7 space-y-6">
          {/* STEP 1: REISEZIEL & NAME */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-extrabold text-[#141416] flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Reiseziel & Name
                </h3>
                <p className="text-xs text-[#141416]/65 mt-0.5">
                  Wo geht eure Reise hin und wie wollt ihr den Urlaub nennen?
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#141416]/80 mb-1.5">
                    Wo geht es hin? (Land, Ort oder Region) *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="z. B. Italien, Mallorca, Österreich..."
                    className="w-full bg-white rounded-2xl px-4 py-3 text-sm font-semibold text-[#141416] border border-black/15 focus:outline-none focus:border-[#141416]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141416]/80 mb-1.5">
                    Wie soll der Urlaub heißen? *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="z. B. Sommerurlaub 2026"
                    className="w-full bg-white rounded-2xl px-4 py-3 text-sm font-semibold text-[#141416] border border-black/15 focus:outline-none focus:border-[#141416]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141416]/80 mb-1.5">
                    Kurze Beschreibung / Motto (optional)
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Optionales Motto für die Gruppe..."
                    className="w-full bg-white rounded-2xl px-4 py-2.5 text-xs font-medium text-[#141416] border border-black/15 focus:outline-none focus:border-[#141416]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-black/10">
                <button
                  type="button"
                  disabled={!canAdvanceStep1}
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-extrabold bg-[#141416] disabled:opacity-40 text-white hover:bg-black/85 transition-all cursor-pointer"
                >
                  <span>Weiter zu Schritt 2</span>
                  <ArrowRight className="w-4 h-4 text-[#F4DF7B]" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ZEITRAUM & DAUER */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-extrabold text-[#141416] flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Zeitraum & Dauer
                </h3>
                <p className="text-xs text-[#141416]/65 mt-0.5">
                  Wie viele Tage seid ihr unterwegs?
                </p>
              </div>

              <div className="bg-[#F4DF7B]/50 rounded-[24px] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#141416]">
                    Wie viele Tage dauert der Urlaub?
                  </label>
                  <span className="px-3 py-1 rounded-full bg-[#141416] text-[#F4DF7B] text-xs font-black">
                    {totalDays} {totalDays === 1 ? 'Tag' : 'Tage'}
                  </span>
                </div>

                <input
                  type="range"
                  min={1}
                  max={21}
                  value={totalDays}
                  onChange={(e) => setTotalDays(Number(e.target.value))}
                  className="w-full accent-[#141416] cursor-pointer"
                />

                <div className="flex justify-between text-[11px] font-bold text-[#141416]/60">
                  <span>1 Tag</span>
                  <span>7 Tage</span>
                  <span>14 Tage</span>
                  <span>21 Tage</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#141416]/80 mb-1.5">
                    Wann geht es los? (optional)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white rounded-2xl px-4 py-3 text-xs font-bold text-[#141416] border border-black/15 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141416]/80 mb-1.5 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5" />
                    Geplantes Budget p.P. in € (optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={budgetTargetPerPerson}
                    onChange={(e) => setBudgetTargetPerPerson(e.target.value)}
                    placeholder="z. B. 600"
                    className="w-full bg-white rounded-2xl px-4 py-3 text-xs font-bold text-[#141416] border border-black/15 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-[#EFECE6] text-[#141416] hover:bg-black/10 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Zurück</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-extrabold bg-[#141416] text-white hover:bg-black/85 transition-all cursor-pointer"
                >
                  <span>Weiter zu Schritt 3</span>
                  <ArrowRight className="w-4 h-4 text-[#F4DF7B]" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: MITREISENDE & DEINE AUSWAHL */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-extrabold text-[#141416] flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Mitreisende & Deine Auswahl
                </h3>
                <p className="text-xs text-[#141416]/65 mt-0.5">
                  Trage die Vornamen eurer Gruppe ein (ohne Account) und klicke
                  auf deinen eigenen Namen.
                </p>
              </div>

              {/* Add person input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={newPersonInput}
                  onChange={(e) => setNewPersonInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddPerson();
                    }
                  }}
                  placeholder="Vorname eingeben (z. B. Lars)..."
                  className="flex-1 bg-white rounded-full px-4 py-3 text-sm font-semibold text-[#141416] border border-black/15 focus:outline-none focus:border-[#141416]"
                />
                <button
                  type="button"
                  onClick={() => handleAddPerson()}
                  className="inline-flex items-center gap-1.5 bg-[#141416] text-white px-5 py-3 rounded-full text-xs font-bold hover:bg-black/85 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4 text-[#F4DF7B]" />
                  <span>Name hinzufügen</span>
                </button>
              </div>

              {/* List of added names & active user picker */}
              <div className="bg-[#EFECE6] rounded-[24px] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#141416]/70">
                    Welcher Nutzer bist du?
                  </span>
                  <span className="text-xs font-bold text-[#141416]/60">
                    {travelerNames.length}{' '}
                    {travelerNames.length === 1 ? 'Person' : 'Personen'}
                  </span>
                </div>

                {travelerNames.length === 0 ? (
                  <p className="text-xs text-[#141416]/55 py-2">
                    Noch keine Namen eingetragen. Füge oben mindestens deinen
                    Vornamen hinzu.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {travelerNames.map((name) => {
                      const isMe = selectedUserName === name;
                      return (
                        <div
                          key={name}
                          onClick={() => setSelectedUserName(name)}
                          className={`inline-flex items-center gap-2 pl-3.5 pr-2 py-2 rounded-full text-xs font-bold cursor-pointer transition-all ${
                            isMe
                              ? 'bg-[#141416] text-white shadow-sm'
                              : 'bg-white text-[#141416] hover:bg-[#F4DF7B]/60'
                          }`}
                        >
                          <span>{name}</span>
                          {isMe && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4DF7B] text-[#141416] font-extrabold">
                              Ich
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePerson(name);
                            }}
                            className="w-5 h-5 rounded-full hover:bg-black/15 flex items-center justify-center opacity-70 hover:opacity-100"
                            title="Entfernen"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-[#EFECE6] text-[#141416] hover:bg-black/10 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Zurück</span>
                </button>

                <button
                  type="submit"
                  disabled={
                    travelerNames.length === 0 && !newPersonInput.trim()
                  }
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-extrabold bg-[#141416] disabled:opacity-40 text-white hover:bg-black/90 shadow-lg transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 text-[#F4DF7B]" />
                  <span>Urlaub erstellen & starten</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default NewTripModal;
