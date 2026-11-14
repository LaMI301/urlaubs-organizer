import React, { useEffect, useState } from 'react';
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
  KeyRound,
  Trash2,
  Link2,
  X,
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
    deleteTrip,
  } = useVacation();

  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [welcomeStep, setWelcomeStep] = useState<'select-trip' | 'select-user'>(
    'select-trip'
  );
  const [newUserName, setNewUserName] = useState('');
  const [confirmDeleteTripId, setConfirmDeleteTripId] = useState<string | null>(null);
  const [unlockedViaInviteLink, setUnlockedViaInviteLink] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.location.hash.includes('access=') && isUnlocked;
  });

  // Reset internal gate state whenever gate closes or app locks
  useEffect(() => {
    if (!isUnlocked) {
      setUnlockedViaInviteLink(false);
      setWelcomeStep('select-trip');
      setConfirmDeleteTripId(null);
    }
  }, [isUnlocked]);

  useEffect(() => {
    if (!isWelcomeOpen) {
      setWelcomeStep('select-trip');
      setConfirmDeleteTripId(null);
      setNewUserName('');
    }
  }, [isWelcomeOpen]);

  const customTrips = savedTrips.filter((t) => !t.isDemo);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = unlockApp(passwordInput);
    if (!ok) {
      setPasswordError(true);
    } else {
      setPasswordError(false);
      setPasswordInput('');
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

  // Keep Welcome Gate open behind NewTripModal so cancelling modal stays in Gate!
  const handleCreateNewTrip = () => {
    setIsNewTripModalOpen(true);
  };

  const handleSelectUserAndEnter = (userId: string) => {
    setCurrentUserById(userId);
    setWelcomeStep('select-trip');
    setIsWelcomeOpen(false);
  };

  const handleContinueAsCurrent = () => {
    setWelcomeStep('select-trip');
    setIsWelcomeOpen(false);
  };

  const handleAddUserAndEnter = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newUserName.trim();
    if (!trimmed) return;
    const added = addTraveler(trimmed, 'Mitreisende/r');
    if (!added) return;
    setNewUserName('');
    setWelcomeStep('select-trip');
    setIsWelcomeOpen(false);
  };

  // 1. PASSWORD GATE
  if (!isUnlocked) {
    return (
      <div className="aurora-canvas min-h-screen flex items-center justify-center p-4 text-slate-100 font-sans relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-28 -left-24 w-96 h-96 bg-cyan-400/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-28 -right-24 w-96 h-96 bg-violet-500/15 rounded-full blur-3xl" />
        </div>

        <div className="aurora-glass-elevated relative z-10 w-full max-w-md rounded-[32px] p-7 sm:p-8 space-y-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-[#0B0E14] flex items-center justify-center font-black text-xl shadow-[0_0_24px_rgba(34,211,238,0.35)] shrink-0">
              VO
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-400/15 border border-cyan-400/30 text-cyan-300">
                <Lock className="w-3 h-3" /> Privater Bereich
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 mt-1 truncate">
                Vacation Organizer
              </h1>
            </div>
          </div>

          <p className="text-sm text-slate-400 leading-relaxed">
            Dieser Urlaubsplaner ist privat geschützt. Gib euren Zugangscode ein
            oder öffne einen privaten Einladungslink.
          </p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="gate-access-password"
                className="block text-xs font-bold text-slate-300 mb-1.5"
              >
                Zugangs-Passwort
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-cyan-300/75 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="gate-access-password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError(false);
                  }}
                  placeholder="Passwort eingeben..."
                  autoFocus
                  className="aurora-input w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold"
                />
              </div>
              {passwordError && (
                <p className="text-xs font-bold text-rose-400 mt-1.5">
                  Falsches Passwort. Bitte überprüfe deine Eingabe.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-cyan-400 hover:bg-cyan-300 text-[#0B0E14] font-extrabold text-sm py-3.5 rounded-full shadow-[0_0_24px_rgba(34,211,238,0.3)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Zugang freischalten</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. GUIDED STEP-BY-STEP START FLOW (Trip Selection -> User Selection -> Dashboard)
  if (isWelcomeOpen) {
    return (
      <div className="aurora-canvas min-h-screen flex items-center justify-center p-4 text-slate-100 font-sans relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-28 -left-24 w-96 h-96 bg-cyan-400/14 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -right-24 w-96 h-96 bg-violet-500/14 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl" />
        </div>

        <div className="aurora-glass-elevated relative z-10 w-full max-w-2xl rounded-[32px] p-5 sm:p-8 space-y-6 my-auto">
          {/* Invite Link Auto-Unlock Banner */}
          {unlockedViaInviteLink && (
            <div className="rounded-2xl bg-emerald-400/12 border border-emerald-400/30 px-4 py-2.5 flex items-center justify-between gap-2 text-xs text-emerald-200">
              <div className="flex items-center gap-2 min-w-0">
                <Link2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span className="font-semibold truncate">
                  Über deinen privaten Einladungslink automatisch entsperrt!
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUnlockedViaInviteLink(false)}
                aria-label="Hinweis ausblenden"
                className="p-1 rounded-full hover:bg-white/10 text-emerald-200 shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Top Brand & Step Indicator */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-[#0B0E14] flex items-center justify-center font-black text-base shadow-[0_0_20px_rgba(34,211,238,0.3)] shrink-0">
                VO
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-slate-400 block truncate">
                  Vacation Organizer
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 block truncate">
                  {welcomeStep === 'select-trip'
                    ? 'Schritt 1 von 2 · Urlaub wählen'
                    : 'Schritt 2 von 2 · Wer bist du?'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`h-2 rounded-full transition-all ${
                  welcomeStep === 'select-trip'
                    ? 'w-8 bg-cyan-400 shadow-[0_0_10px_#22D3EE]'
                    : 'w-3 bg-white/20'
                }`}
              />
              <span
                className={`h-2 rounded-full transition-all ${
                  welcomeStep === 'select-user'
                    ? 'w-8 bg-cyan-400 shadow-[0_0_10px_#22D3EE]'
                    : 'w-3 bg-white/20'
                }`}
              />
            </div>
          </div>

          {welcomeStep === 'select-trip' ? (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
                  Welchen Urlaub möchtest du öffnen?
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Wähle eine bestehende Reise aus, erstelle einen neuen Urlaub
                  oder probiere den Testmodus aus.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Option A: Bestehende eigene Urlaube */}
                <div className="bg-[#0B0E14]/55 rounded-[24px] p-4 sm:p-5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-300">
                      <FolderOpen className="w-4 h-4 text-cyan-300" />
                      Gespeicherte Urlaube
                    </span>
                    <span className="font-mono tabular-nums text-xs font-bold text-slate-400">
                      {customTrips.length}{' '}
                      {customTrips.length === 1 ? 'Reise' : 'Reisen'}
                    </span>
                  </div>

                  {customTrips.length === 0 ? (
                    <p className="text-xs text-slate-400 py-1">
                      Noch kein eigener Urlaub gespeichert. Erstelle unten in 3
                      kurzen Schritten deinen ersten eigenen Urlaub!
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {customTrips.map((t) => {
                        const isConfirmingDelete = confirmDeleteTripId === t.id;
                        return (
                          <div
                            key={t.id}
                            className="bg-[#1B2232]/85 hover:bg-[#1B2232] rounded-2xl border border-white/10 hover:border-cyan-400/35 transition-all flex items-center justify-between gap-2 p-2.5 group"
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectExistingTrip(t.id)}
                              className="min-w-0 flex-1 text-left p-1.5 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                            >
                              <p className="font-extrabold text-sm text-slate-100 truncate">
                                {t.title}
                              </p>
                              <p className="text-xs text-slate-400 truncate mt-0.5">
                                {t.destination} ·{' '}
                                <span className="font-mono tabular-nums">
                                  {t.totalDays} Tage
                                </span>
                              </p>
                            </button>

                            {isConfirmingDelete ? (
                              <div className="flex items-center gap-1 shrink-0 pr-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteTrip(t.id);
                                    setConfirmDeleteTripId(null);
                                  }}
                                  className="px-2.5 py-1 rounded-full bg-rose-500 hover:bg-rose-400 text-white text-[10px] font-bold transition-colors cursor-pointer"
                                >
                                  Löschen
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteTripId(null)}
                                  className="px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] font-bold transition-colors cursor-pointer"
                                >
                                  Abbr.
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 shrink-0 pr-1">
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteTripId(t.id)}
                                  title="Urlaub löschen"
                                  aria-label={`Urlaub ${t.title} löschen`}
                                  className="w-7 h-7 rounded-full hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectExistingTrip(t.id)}
                                  aria-label={`Urlaub ${t.title} öffnen`}
                                  className="w-7 h-7 rounded-full text-slate-400 group-hover:text-cyan-300 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <ArrowRight className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Option B: Neuen Urlaub erstellen */}
                <button
                  type="button"
                  onClick={handleCreateNewTrip}
                  className="w-full bg-gradient-to-r from-cyan-400/20 via-cyan-400/12 to-emerald-400/20 hover:from-cyan-400/30 hover:to-emerald-400/30 border border-cyan-400/35 text-slate-100 rounded-[24px] p-4 sm:p-5 text-left transition-all flex items-center justify-between gap-3 group cursor-pointer shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-cyan-400 text-[#0B0E14] flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(34,211,238,0.35)]">
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-300 block">
                        Neu starten · Mit Templates
                      </span>
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-100 truncate">
                        Neuen Urlaub erstellen
                      </h2>
                      <p className="text-xs text-slate-300/80 mt-0.5 line-clamp-2">
                        Reiseziel, Datumsbereich, Budget &amp; Gruppe festlegen
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-cyan-300 group-hover:translate-x-1 transition-transform shrink-0" />
                </button>

                {/* Option C: Testmodus öffnen */}
                <button
                  type="button"
                  onClick={handleSelectDemoTrip}
                  className="w-full bg-white/[0.06] hover:bg-white/[0.11] border border-amber-400/25 text-slate-100 rounded-[24px] p-4 sm:p-5 text-left transition-all flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/35 text-amber-300 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 block">
                        Beispiel-Reise zum Ausprobieren
                      </span>
                      <h2 className="text-base font-extrabold text-slate-100 truncate">
                        Testmodus öffnen („Mallorca Sommer-Finca 2026“)
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                        7 Tage mit Karte, Essen, Abstimmungen, Reisekasse &amp; Checkliste
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-amber-300 group-hover:translate-x-1 transition-transform shrink-0" />
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: WER BIST DU? */
            <div className="space-y-5">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 mb-2 max-w-full">
                  <Compass className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {trip.title} ({trip.destination})
                  </span>
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
                  Wer bist du?
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Wähle deinen Namen aus (ohne Account), damit deine Vorschläge,
                  Ausgaben und Stimmen dir zugeordnet werden.
                </p>
              </div>

              {/* Traveler Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {trip.travelers.map((traveler) => {
                  const isSelected = traveler.id === currentUser.id;
                  return (
                    <button
                      key={traveler.id}
                      type="button"
                      onClick={() => handleSelectUserAndEnter(traveler.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer min-w-0 ${
                        isSelected
                          ? 'bg-cyan-400/18 text-slate-100 border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.18)]'
                          : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border-white/10'
                      }`}
                    >
                      <span
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-[#0B0E14] shrink-0"
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
                            isSelected ? 'text-cyan-300' : 'text-slate-400'
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
                className="bg-[#0B0E14]/55 rounded-2xl p-3.5 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
              >
                <div className="flex items-center gap-2 flex-1 aurora-input rounded-full px-4 py-2.5">
                  <UserPlus className="w-4 h-4 text-cyan-300 shrink-0" />
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="+ Neuen Namen hinzufügen (z. B. Dein Vorname)..."
                    className="bg-transparent text-xs font-semibold text-slate-100 placeholder-slate-500 focus:outline-none w-full min-w-0"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newUserName.trim()}
                  className="bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-[#0B0E14] text-xs font-extrabold px-5 py-3 rounded-full transition-all shrink-0 cursor-pointer"
                >
                  Hinzufügen &amp; starten
                </button>
              </form>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setWelcomeStep('select-trip')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-100 py-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Zurück zur Urlaubsauswahl</span>
                </button>

                <button
                  type="button"
                  onClick={handleContinueAsCurrent}
                  className="inline-flex items-center gap-1.5 bg-cyan-400 hover:bg-cyan-300 text-[#0B0E14] text-xs font-extrabold px-5 py-2.5 rounded-full transition-colors cursor-pointer max-w-[230px]"
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    Weiter als {currentUser.name}
                  </span>
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
