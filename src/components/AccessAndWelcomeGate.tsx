import React, { useState } from 'react';
import {
  Lock,
  Sparkles,
  Plus,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  Check,
  UserPlus,
  Compass,
  Calendar,
  Users,
  KeyRound,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';

export const AccessAndWelcomeGate: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    trip,
    savedTrips,
    currentUser,
    isUnlocked,
    unlockApp,
    isWelcomeOpen,
    setIsWelcomeOpen,
    setCurrentUserById,
    addTraveler,
    switchTrip,
    switchToDemoTrip,
    setIsNewTripModalOpen,
  } = useVacation();

  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [welcomeStep, setWelcomeStep] = useState<'select-trip' | 'select-user'>(
    'select-trip'
  );
  const [newUserName, setNewUserName] = useState('');

  // Custom trips vs Demo trip
  const customTrips = savedTrips.filter((t) => !t.isDemo);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = unlockApp(passwordInput);
    if (!ok) {
      setPasswordError(true);
    } else {
      setPasswordError(false);
    }
  };

  const handleSelectExistingTrip = (tripId: string) => {
    switchTrip(tripId);
    setWelcomeStep('select-user');
  };

  const handleSelectDemoTrip = () => {
    switchToDemoTrip();
    setWelcomeStep('select-user');
  };

  const handleCreateNewTrip = () => {
    setIsWelcomeOpen(false);
    setIsNewTripModalOpen(true);
  };

  const handleSelectUserAndEnter = (userId: string) => {
    setCurrentUserById(userId);
    setIsWelcomeOpen(false);
    setWelcomeStep('select-trip');
  };

  const handleAddUserAndEnter = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newUserName.trim();
    if (!trimmed) return;
    addTraveler(trimmed, 'Mitreisende/r');
    setNewUserName('');
    setIsWelcomeOpen(false);
    setWelcomeStep('select-trip');
  };

  // 1. PASSWORD GATE
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#EFEAE2] flex items-center justify-center p-4 text-[#141416] font-sans">
        <div className="bg-[#F9F6F0] w-full max-w-md rounded-[36px] p-8 shadow-2xl border border-black/10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#141416] text-[#F4DF7B] flex items-center justify-center font-black text-xl shadow-md">
              VO
            </div>
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E8C2E8] text-[#141416]">
                <Lock className="w-3 h-3" /> Privater Bereich
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#141416] mt-0.5">
                Vacation Organizer
              </h1>
            </div>
          </div>

          <p className="text-sm text-[#141416]/75 leading-relaxed">
            Dieser Urlaubsplaner ist privat geschützt. Bitte gib das
            Zugangs-Passwort ein, um fortzufahren.
          </p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#141416]/80 mb-1.5">
                Zugangs-Passwort
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#141416]/45 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError(false);
                  }}
                  placeholder="Passwort eingeben..."
                  autoFocus
                  className="w-full bg-white rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold text-[#141416] border border-black/15 focus:outline-none focus:border-[#141416]"
                />
              </div>
              {passwordError && (
                <p className="text-xs font-bold text-red-600 mt-1.5">
                  Falsches Passwort. Bitte überprüfe deine Eingabe.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-[#141416] hover:bg-black/85 text-white font-bold text-sm py-3.5 rounded-full shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Zugang freischalten</span>
              <ArrowRight className="w-4 h-4 text-[#F4DF7B]" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. GUIDED STEP-BY-STEP START FLOW (Trip Selection -> User Selection -> Dashboard)
  if (isWelcomeOpen) {
    return (
      <div className="min-h-screen bg-[#EFEAE2] flex items-center justify-center p-4 text-[#141416] font-sans">
        <div className="bg-[#F9F6F0] w-full max-w-2xl rounded-[36px] p-6 sm:p-9 shadow-2xl border border-black/10 space-y-7">
          {/* Top Brand & Step Indicator */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#141416] text-[#F4DF7B] flex items-center justify-center font-black text-base shadow-sm">
                VO
              </div>
              <div>
                <span className="text-xs font-bold text-[#141416]/55 block">
                  Vacation Organizer
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#141416]">
                  {welcomeStep === 'select-trip'
                    ? 'Schritt 1 von 2 · Urlaub wählen'
                    : 'Schritt 2 von 2 · Wer bist du?'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 rounded-full transition-all ${
                  welcomeStep === 'select-trip'
                    ? 'w-8 bg-[#141416]'
                    : 'w-3 bg-[#141416]/25'
                }`}
              />
              <span
                className={`h-2 rounded-full transition-all ${
                  welcomeStep === 'select-user'
                    ? 'w-8 bg-[#141416]'
                    : 'w-3 bg-[#141416]/25'
                }`}
              />
            </div>
          </div>

          {welcomeStep === 'select-trip' ? (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#141416]">
                  Welchen Urlaub möchtest du öffnen?
                </h1>
                <p className="text-sm text-[#141416]/65 mt-1">
                  Wähle eine bestehende Reise aus, erstelle einen neuen Urlaub
                  oder probiere den Testmodus aus.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Option A: Bestehende eigene Urlaube */}
                <div className="bg-[#EFECE6] rounded-[26px] p-5 border border-black/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#141416]/75">
                      <FolderOpen className="w-4 h-4 text-[#141416]" />
                      Auf bestehenden Urlaub zugreifen
                    </span>
                    <span className="text-xs font-bold text-[#141416]/55">
                      {customTrips.length}{' '}
                      {customTrips.length === 1 ? 'Reise' : 'Reisen'}
                    </span>
                  </div>

                  {customTrips.length === 0 ? (
                    <p className="text-xs text-[#141416]/60 py-1">
                      Noch kein eigener Urlaub gespeichert. Erstelle unten in 3
                      kurzen Schritten deinen ersten eigenen Urlaub!
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {customTrips.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectExistingTrip(t.id)}
                          className="bg-white hover:bg-[#C5D1F5]/50 text-left p-4 rounded-2xl border border-black/5 transition-all flex items-center justify-between group cursor-pointer"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-extrabold text-sm text-[#141416] truncate">
                              {t.title}
                            </p>
                            <p className="text-xs text-[#141416]/60 truncate mt-0.5">
                              {t.destination} · {t.totalDays} Tage
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#141416]/40 group-hover:text-[#141416] group-hover:translate-x-0.5 transition-all shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Option B: Neuen Urlaub erstellen (Step-by-Step Wizard ohne Vorbelegung) */}
                <button
                  type="button"
                  onClick={handleCreateNewTrip}
                  className="w-full bg-[#F4DF7B] hover:bg-[#f2d961] text-[#141416] rounded-[26px] p-5 text-left transition-all flex items-center justify-between shadow-sm group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#141416] text-[#F4DF7B] flex items-center justify-center shrink-0">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#141416]/70 block">
                        Neu starten · Ohne Vorgaben
                      </span>
                      <h2 className="text-lg font-extrabold text-[#141416]">
                        Neuen Urlaub erstellen
                      </h2>
                      <p className="text-xs text-[#141416]/75 mt-0.5">
                        Schritt für Schritt Reiseziel, Dauer und Mitreisende
                        selbst festlegen
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#141416] group-hover:translate-x-1 transition-transform shrink-0" />
                </button>

                {/* Option C: Testmodus öffnen */}
                <button
                  type="button"
                  onClick={handleSelectDemoTrip}
                  className="w-full bg-[#E8C2E8]/75 hover:bg-[#E8C2E8] text-[#141416] rounded-[26px] p-5 text-left transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/80 text-[#141416] flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#141416]/70 block">
                        Beispiel-Reise zum Ausprobieren
                      </span>
                      <h2 className="text-base font-extrabold text-[#141416]">
                        Testmodus öffnen („Mallorca Sommer-Finca 2026“)
                      </h2>
                      <p className="text-xs text-[#141416]/75 mt-0.5">
                        Fertig gefülltes Beispiel mit 7 Tagen, Essen,
                        Abstimmungen & Checkliste
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#141416] group-hover:translate-x-1 transition-transform shrink-0" />
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: WER BIST DU? */
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-[#EFECE6] text-[#141416] mb-2">
                    <Compass className="w-3.5 h-3.5" />
                    {trip.title} ({trip.destination})
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#141416]">
                    Wer bist du?
                  </h1>
                  <p className="text-sm text-[#141416]/65 mt-1">
                    Wähle deinen Namen aus (ganz ohne Login), damit deine
                    Vorschläge und Stimmen dir zugeordnet werden.
                  </p>
                </div>
              </div>

              {/* Traveler Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {trip.travelers.map((traveler) => {
                  const isSelected = traveler.id === currentUser.id;
                  return (
                    <button
                      key={traveler.id}
                      type="button"
                      onClick={() => handleSelectUserAndEnter(traveler.id)}
                      className={`p-4 rounded-[24px] border text-left transition-all flex items-center gap-3 cursor-pointer group ${
                        isSelected
                          ? 'bg-[#141416] text-white border-[#141416] shadow-md'
                          : 'bg-white hover:bg-[#EFECE6] text-[#141416] border-black/10'
                      }`}
                    >
                      <span
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-[#141416] shrink-0"
                        style={{ backgroundColor: traveler.color }}
                      >
                        {traveler.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-sm truncate">
                          {traveler.name}
                        </p>
                        <p
                          className={`text-[11px] truncate ${
                            isSelected ? 'text-white/70' : 'text-[#141416]/55'
                          }`}
                        >
                          Auswählen →
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Add new person inline */}
              <form
                onSubmit={handleAddUserAndEnter}
                className="bg-[#EFECE6] rounded-[24px] p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
              >
                <div className="flex items-center gap-2 flex-1 bg-white rounded-full px-4 py-2.5 border border-black/10">
                  <UserPlus className="w-4 h-4 text-[#141416]/50 shrink-0" />
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="+ Neuen Namen hinzufügen (z. B. Dein Vorname)..."
                    className="bg-transparent text-xs font-semibold text-[#141416] focus:outline-none w-full"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newUserName.trim()}
                  className="bg-[#141416] disabled:opacity-40 text-white text-xs font-bold px-5 py-3 rounded-full hover:bg-black/85 transition-all shrink-0 cursor-pointer"
                >
                  Hinzufügen & starten
                </button>
              </form>

              <div className="flex items-center justify-between pt-2 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setWelcomeStep('select-trip')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#141416]/70 hover:text-[#141416] py-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Zurück zur Urlaubsauswahl</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsWelcomeOpen(false)}
                  className="inline-flex items-center gap-1.5 bg-[#141416] text-white text-xs font-bold px-5 py-2.5 rounded-full hover:bg-black/85 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-[#F4DF7B]" />
                  <span>Weiter als {currentUser.name}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AccessAndWelcomeGate;
