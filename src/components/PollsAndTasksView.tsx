import React, { useState, useMemo } from 'react';
import {
  Vote,
  Crown,
  Plus,
  CheckSquare,
  Square,
  ThumbsUp,
  Trash2,
  AlertTriangle,
  Sparkles,
  Lock,
  Unlock,
  Luggage,
  ShoppingCart,
  FileText,
  CalendarClock,
  Wallet,
  TrendingUp,
  PieChart,
  X,
  CheckCircle2,
  Utensils,
  Compass,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import {
  Poll,
  TaskCategory,
  TaskPriority,
  ActivityCategory,
} from '../types/vacation';

/* ============================================================================
 * 1. POLLS VIEW (ABSTIMMUNGEN)
 * ========================================================================== */

const POLL_CATEGORY_META: Record<
  Poll['category'],
  { label: string; bg: string }
> = {
  general: { label: 'Allgemein', bg: 'bg-[#C5D1F5]' },
  accommodation: { label: 'Unterkunft', bg: 'bg-[#E8C2E8]' },
  activity: { label: 'Ausflug & Programm', bg: 'bg-[#F4DF7B]' },
  food: { label: 'Essen & Kulinarik', bg: 'bg-[#F7C59F]' },
  transport: { label: 'Mietwagen & Anreise', bg: 'bg-[#A9B882]' },
};

export const PollsView: React.FC = () => {
  const {
    trip,
    currentUser,
    addPoll,
    togglePollVote,
    togglePollClosed,
  } = useVacation();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<Poll['category']>('general');
  const [dayNumber, setDayNumber] = useState<string>('');
  const [options, setOptions] = useState<string[]>(['', '', '']);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');

  const handleOptionChange = (idx: number, val: string) => {
    setOptions((prev) => prev.map((item, i) => (i === idx ? val : item)));
  };

  const handleAddOptionField = () => {
    setOptions((prev) => [...prev, '']);
  };

  const handleRemoveOptionField = (idx: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || validOptions.length < 2) return;

    addPoll(
      question.trim(),
      category,
      validOptions,
      dayNumber ? Number(dayNumber) : undefined
    );

    setQuestion('');
    setOptions(['', '', '']);
    setDayNumber('');
    setShowCreateForm(false);
  };

  const getTraveler = (id: string) =>
    trip.travelers.find((t) => t.id === id) || {
      id,
      name: 'Mitreisender',
      initials: 'MR',
      color: '#E8C2E8',
    };

  const filteredPolls = useMemo(() => {
    return trip.polls.filter((p) => {
      if (filterStatus === 'open') return !p.isClosed;
      if (filterStatus === 'closed') return !!p.isClosed;
      return true;
    });
  }, [trip.polls, filterStatus]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#C5D1F5]/45 rounded-[28px] p-6 border border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#C5D1F5] text-[#141416] mb-2">
            <Vote className="w-3.5 h-3.5" />
            Gruppen-Entscheidungen & Umfragen
          </span>
          <h1 className="text-2xl font-extrabold text-[#141416]">
            Gemeinsam abstimmen ohne Chaos
          </h1>
          <p className="text-xs text-neutral-600 mt-1">
            Klicke als <strong className="text-[#141416]">{currentUser.name}</strong> einfach auf deine Wunsch-Optionen. Du kannst jederzeit den Nutzer oben wechseln!
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="bg-[#141416] hover:bg-neutral-800 text-white rounded-full px-5 py-3 text-xs font-bold flex items-center gap-2 self-start md:self-auto shadow-sm transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{showCreateForm ? 'Formular schließen' : '+ Neue Abstimmung'}</span>
        </button>
      </div>

      {/* Create New Poll Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreatePoll}
          className="bg-[#EFECE6] rounded-[26px] p-6 border border-black/10 space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#141416]">
                Neue Abstimmung starten
              </h3>
              <p className="text-xs text-neutral-600">
                Erstellt von <strong>{currentUser.name}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="w-8 h-8 rounded-full bg-white hover:bg-black/10 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Frage an die Gruppe *
              </label>
              <input
                type="text"
                required
                placeholder="z.B. Welches Boot mieten wir an Tag 3?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-xs font-medium border border-black/10"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Kategorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Poll['category'])}
                className="w-full bg-white rounded-2xl px-3 py-2.5 text-xs font-semibold border border-black/10"
              >
                <option value="general">Allgemein</option>
                <option value="accommodation">Unterkunft</option>
                <option value="activity">Ausflug & Programm</option>
                <option value="food">Essen & Kulinarik</option>
                <option value="transport">Mietwagen & Anreise</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#141416] block mb-1">
                Bezug zu Reisetag (optional)
              </label>
              <select
                value={dayNumber}
                onChange={(e) => setDayNumber(e.target.value)}
                className="w-full bg-white rounded-2xl px-3 py-2.5 text-xs font-semibold border border-black/10"
              >
                <option value="">Gesamte Reise</option>
                {Array.from({ length: trip.totalDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Tag {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#141416] block">
              Antwort-Optionen (mindestens 2) *
            </label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  required={idx < 2}
                  placeholder={`Option ${idx + 1} (z.B. Katamaran mit Skipper)`}
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  className="flex-1 bg-white rounded-2xl px-3.5 py-2 text-xs border border-black/10"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOptionField(idx)}
                    className="w-8 h-8 rounded-full bg-white hover:bg-red-100 text-neutral-400 hover:text-red-600 flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddOptionField}
              className="text-xs font-bold text-[#141416] inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white hover:bg-[#F4DF7B]"
            >
              <Plus className="w-3.5 h-3.5" /> Weitere Option hinzufügen
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 rounded-full text-xs font-bold bg-white text-neutral-700"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#141416] text-white hover:bg-neutral-800"
            >
              Umfrage veröffentlichen
            </button>
          </div>
        </form>
      )}

      {/* Filter Pills */}
      <div className="flex items-center gap-2">
        {(
          [
            { id: 'all', label: `Alle (${trip.polls.length})` },
            {
              id: 'open',
              label: `Offen (${trip.polls.filter((p) => !p.isClosed).length})`,
            },
            {
              id: 'closed',
              label: `Entschieden (${trip.polls.filter((p) => p.isClosed).length})`,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterStatus(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              filterStatus === tab.id
                ? 'bg-[#141416] text-white'
                : 'bg-[#EFECE6] text-neutral-700 hover:bg-[#C5D1F5]/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Polls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredPolls.map((poll) => {
          const catMeta = POLL_CATEGORY_META[poll.category];
          const creator = getTraveler(poll.createdBy);
          const totalVotes = poll.options.reduce(
            (sum, o) => sum + o.votes.length,
            0
          );
          const maxVotes = Math.max(...poll.options.map((o) => o.votes.length), 0);

          return (
            <div
              key={poll.id}
              className={`rounded-[28px] p-6 border transition-all flex flex-col justify-between gap-4 ${
                poll.isClosed
                  ? 'bg-[#EFECE6]/60 border-black/5'
                  : 'bg-[#EFECE6] border-black/5 shadow-xs'
              }`}
            >
              <div>
                {/* Top Badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-bold text-[#141416] ${catMeta.bg}`}
                    >
                      {catMeta.label}
                    </span>
                    {poll.dayNumber && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#141416] text-white">
                        Tag {poll.dayNumber}
                      </span>
                    )}
                    {poll.isClosed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#A9B882] text-[#141416]">
                        <Lock className="w-3 h-3" /> Entschieden
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white text-emerald-700">
                        ● Abstimmung läuft
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => togglePollClosed(poll.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/80 hover:bg-white text-neutral-700 transition-colors"
                    title={
                      poll.isClosed
                        ? 'Abstimmung wieder öffnen'
                        : 'Abstimmung abschließen'
                    }
                  >
                    {poll.isClosed ? (
                      <>
                        <Unlock className="w-3 h-3" /> Öffnen
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" /> Abschließen
                      </>
                    )}
                  </button>
                </div>

                <h3 className="text-base font-extrabold text-[#141416] leading-snug mb-1">
                  {poll.question}
                </h3>
                <p className="text-[11px] text-neutral-500 mb-4">
                  Gestartet von {creator.name} • {totalVotes} Stimmen insgesamt
                </p>

                {/* Options List */}
                <div className="space-y-2.5">
                  {poll.options.map((opt) => {
                    const voteCount = opt.votes.length;
                    const pct =
                      totalVotes > 0
                        ? Math.round((voteCount / totalVotes) * 100)
                        : 0;
                    const hasVoted = opt.votes.includes(currentUser.id);
                    const isWinner = maxVotes > 0 && voteCount === maxVotes;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={poll.isClosed}
                        onClick={() => togglePollVote(poll.id, opt.id)}
                        className={`w-full text-left rounded-[20px] p-3.5 relative overflow-hidden border transition-all ${
                          hasVoted
                            ? 'bg-white border-[#141416] ring-1 ring-[#141416]/20 shadow-xs'
                            : 'bg-[#F9F6F0] hover:bg-white border-black/5'
                        } ${poll.isClosed ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        {/* Live Percentage Fill Bar */}
                        <div
                          style={{ width: `${pct}%` }}
                          className={`absolute inset-y-0 left-0 transition-all duration-300 ${
                            isWinner ? 'bg-[#F4DF7B]/45' : 'bg-[#E8C2E8]/35'
                          }`}
                        />

                        <div className="relative z-10 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-extrabold text-[#141416]">
                                {opt.text}
                              </span>
                              {isWinner && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#F4DF7B] text-[#141416]">
                                  <Crown className="w-3 h-3" /> Favorit
                                </span>
                              )}
                              {hasVoted && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#141416] text-white">
                                  Deine Wahl
                                </span>
                              )}
                            </div>
                            {opt.subtitle && (
                              <p className="text-[11px] text-neutral-600 mt-0.5">
                                {opt.subtitle}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center -space-x-1.5">
                              {opt.votes.map((vId) => {
                                const voter = getTraveler(vId);
                                return (
                                  <span
                                    key={vId}
                                    style={{ backgroundColor: voter.color }}
                                    className="w-6 h-6 rounded-full text-[9px] font-bold text-[#141416] flex items-center justify-center ring-2 ring-white"
                                    title={voter.name}
                                  >
                                    {voter.initials}
                                  </span>
                                );
                              })}
                            </div>

                            <span className="text-xs font-extrabold text-[#141416] min-w-[42px] text-right">
                              {pct}% ({voteCount})
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. TASKS VIEW (WAS MAN NOCH GENERELL MACHEN MUSS / CHECKLISTE & PACKLISTE)
 * ========================================================================== */

const TASK_CATEGORY_META: Record<
  TaskCategory,
  { label: string; shortLabel: string; bg: string; icon: React.ReactNode }
> = {
  before_trip: {
    label: 'Vor der Reise (Buchungen & Orga)',
    shortLabel: 'Vor der Reise',
    bg: 'bg-[#F4DF7B]',
    icon: <CalendarClock className="w-4 h-4 text-[#141416]" />,
  },
  packing: {
    label: 'Packliste & Gemeinschaftsgepäck',
    shortLabel: 'Packliste',
    bg: 'bg-[#C5D1F5]',
    icon: <Luggage className="w-4 h-4 text-[#141416]" />,
  },
  shopping: {
    label: 'Einkaufsliste vor Ort',
    shortLabel: 'Einkauf vor Ort',
    bg: 'bg-[#A9B882]',
    icon: <ShoppingCart className="w-4 h-4 text-[#141416]" />,
  },
  documents: {
    label: 'Dokumente & Wichtiges',
    shortLabel: 'Dokumente',
    bg: 'bg-[#E8C2E8]',
    icon: <FileText className="w-4 h-4 text-[#141416]" />,
  },
};

const PRIORITY_META: Record<
  TaskPriority,
  { label: string; badgeClass: string }
> = {
  normal: {
    label: 'Normal',
    badgeClass: 'bg-white text-neutral-600',
  },
  important: {
    label: 'Wichtig',
    badgeClass: 'bg-[#F4DF7B] text-[#141416]',
  },
  critical: {
    label: 'Dringend!',
    badgeClass: 'bg-[#F7C59F] text-[#141416] ring-1 ring-[#141416]/20',
  },
};

export const TasksView: React.FC = () => {
  const {
    trip,
    currentUser,
    addTask,
    toggleTaskCompleted,
    toggleTaskVote,
    deleteTask,
  } = useVacation();

  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'done'>('all');

  // New Task Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('before_trip');
  const [priority, setPriority] = useState<TaskPriority>('important');
  const [assignedTo, setAssignedTo] = useState<string>('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      priority,
      assignedTo: assignedTo || undefined,
    });

    setTitle('');
    setDescription('');
  };

  const getTraveler = (id: string) =>
    trip.travelers.find((t) => t.id === id) || {
      id,
      name: 'Offen',
      initials: '?',
      color: '#EFECE6',
    };

  const filteredTasks = useMemo(() => {
    return trip.tasks
      .filter((t) => (categoryFilter === 'all' ? true : t.category === categoryFilter))
      .filter((t) => {
        if (statusFilter === 'open') return !t.completed;
        if (statusFilter === 'done') return t.completed;
        return true;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return b.votes.length - a.votes.length;
      });
  }, [trip.tasks, categoryFilter, statusFilter]);

  const completedCount = trip.tasks.filter((t) => t.completed).length;
  const progressPct =
    trip.tasks.length > 0
      ? Math.round((completedCount / trip.tasks.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#A9B882]/40 rounded-[28px] p-6 border border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#A9B882] text-[#141416] mb-2">
            <CheckSquare className="w-3.5 h-3.5" />
            Was man noch generell machen muss
          </span>
          <h1 className="text-2xl font-extrabold text-[#141416]">
            Checkliste, Packliste & Orga-Aufgaben
          </h1>
          <p className="text-xs text-neutral-600 mt-1">
            Damit vor der Abreise und vor Ort nichts vergessen wird – verteilt Aufgaben ans Team oder hakt erledigte Punkte direkt ab.
          </p>
        </div>

        <div className="bg-white/90 rounded-[22px] p-4 min-w-[210px] border border-black/5">
          <div className="flex items-center justify-between text-xs font-bold text-[#141416] mb-1.5">
            <span>Gesamt-Fortschritt</span>
            <span>
              {completedCount}/{trip.tasks.length} ({progressPct}%)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#EFECE6] overflow-hidden">
            <div
              style={{ width: `${progressPct}%` }}
              className="h-full bg-[#141416] rounded-full transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* Quick Add Task Bar */}
      <form
        onSubmit={handleAddTask}
        className="bg-[#EFECE6] rounded-[26px] p-5 border border-black/5 space-y-3"
      >
        <div className="text-xs font-extrabold text-[#141416]">
          + Neue Aufgabe / Packlisten-Punkt eintragen
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2.5">
          <input
            type="text"
            required
            placeholder="Was muss erledigt oder eingepackt werden? *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="md:col-span-2 bg-white rounded-2xl px-3.5 py-2.5 text-xs border border-black/10"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TaskCategory)}
            className="bg-white rounded-2xl px-3 py-2.5 text-xs font-semibold border border-black/10"
          >
            <option value="before_trip">Vor der Reise (Buchungen & Orga)</option>
            <option value="packing">Packliste & Gemeinschaftsgepäck</option>
            <option value="shopping">Einkaufsliste vor Ort</option>
            <option value="documents">Dokumente & Wichtiges</option>
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="bg-white rounded-2xl px-3 py-2.5 text-xs font-semibold border border-black/10"
          >
            <option value="normal">Priorität: Normal</option>
            <option value="important">Priorität: Wichtig</option>
            <option value="critical">Priorität: Dringend!</option>
          </select>

          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="bg-white rounded-2xl px-3 py-2.5 text-xs font-semibold border border-black/10"
          >
            <option value="">Für alle / Niemand fest</option>
            {trip.travelers.map((t) => (
              <option key={t.id} value={t.id}>
                Zuständig: {t.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="bg-[#141416] hover:bg-neutral-800 text-white rounded-2xl px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Hinzufügen</span>
          </button>
        </div>

        <input
          type="text"
          placeholder="Optionale Zusatz-Notiz (z.B. Kreditkarte ohne Auslandsgebühr für Mietwagen-Kaution mitnehmen)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-white/80 rounded-xl px-3.5 py-2 text-xs border border-black/5"
        />
      </form>

      {/* Category & Status Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
              categoryFilter === 'all'
                ? 'bg-[#141416] text-white'
                : 'bg-[#EFECE6] text-neutral-700 hover:bg-[#A9B882]/40'
            }`}
          >
            Alle Kategorien ({trip.tasks.length})
          </button>

          {(Object.keys(TASK_CATEGORY_META) as TaskCategory[]).map((catKey) => {
            const meta = TASK_CATEGORY_META[catKey];
            const count = trip.tasks.filter((t) => t.category === catKey).length;
            const active = categoryFilter === catKey;

            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setCategoryFilter(catKey)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
                  active
                    ? 'bg-[#141416] text-white'
                    : 'bg-[#EFECE6] text-[#141416] hover:bg-[#F4DF7B]/50'
                }`}
              >
                <span>{meta.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    active ? 'bg-white/20 text-white' : 'bg-black/10 text-[#141416]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 bg-[#EFECE6] p-1 rounded-full text-xs font-bold">
          {(
            [
              { id: 'all', label: 'Alle' },
              { id: 'open', label: 'Offen' },
              { id: 'done', label: 'Erledigt' },
            ] as const
          ).map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1 rounded-full transition-all ${
                statusFilter === st.id
                  ? 'bg-[#141416] text-white'
                  : 'text-neutral-600'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-2.5">
        {filteredTasks.map((task) => {
          const catMeta = TASK_CATEGORY_META[task.category];
          const prioMeta = PRIORITY_META[task.priority];
          const assignee = task.assignedTo ? getTraveler(task.assignedTo) : null;
          const hasVoted = task.votes.includes(currentUser.id);

          return (
            <div
              key={task.id}
              className={`rounded-[22px] p-4 border transition-all flex items-center justify-between gap-4 ${
                task.completed
                  ? 'bg-[#EFECE6]/40 border-black/5 opacity-70'
                  : 'bg-[#EFECE6]/90 hover:bg-[#EFECE6] border-black/5 shadow-2xs'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => toggleTaskCompleted(task.id)}
                  className="mt-0.5 text-[#141416] hover:scale-110 transition-transform shrink-0"
                  title={
                    task.completed
                      ? 'Als offen markieren'
                      : 'Als erledigt abhaken'
                  }
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 fill-[#A9B882]" />
                  ) : (
                    <Square className="w-5 h-5 text-neutral-500" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-extrabold ${
                        task.completed
                          ? 'line-through text-neutral-500'
                          : 'text-[#141416]'
                      }`}
                    >
                      {task.title}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${catMeta.bg} text-[#141416]`}
                    >
                      {catMeta.icon}
                      <span>{catMeta.shortLabel}</span>
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${prioMeta.badgeClass}`}
                    >
                      {prioMeta.label}
                    </span>

                    {assignee && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white text-[#141416]">
                        <span
                          style={{ backgroundColor: assignee.color }}
                          className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                        >
                          {assignee.initials}
                        </span>
                        <span>{assignee.name}</span>
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <p className="text-xs text-neutral-600 mt-1">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleTaskVote(task.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    hasVoted
                      ? 'bg-[#141416] text-white'
                      : 'bg-white hover:bg-[#F4DF7B] text-[#141416]'
                  }`}
                  title="Wichtigkeit betonen"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{task.votes.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  className="w-8 h-8 rounded-full hover:bg-red-100 text-neutral-400 hover:text-red-600 flex items-center justify-center transition-colors"
                  title="Aufgabe löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. BUDGET VIEW (REISEKASSE & KOSTEN-ÜBERBLICK)
 * ========================================================================== */

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  beach: 'Strand & Meer',
  activity: 'Ausflüge & Action',
  culture: 'Kultur & Sightseeing',
  transport: 'Transfer & Mietwagen',
  nightlife: 'Abend & Nightlife',
  other: 'Sonstiges',
};

export const BudgetView: React.FC = () => {
  const { trip } = useVacation();

  const budgetData = useMemo(() => {
    const activitiesCostPerPerson = trip.activities.reduce(
      (sum, a) => sum + a.estimatedCost,
      0
    );
    const mealsCostPerPerson = trip.meals.reduce(
      (sum, m) => sum + m.estimatedCostPerPerson,
      0
    );
    const totalEstimatedPerPerson =
      activitiesCostPerPerson + mealsCostPerPerson;
    const totalGroupCost =
      totalEstimatedPerPerson * Math.max(1, trip.travelers.length);
    const remainingBudget =
      trip.budgetTargetPerPerson - totalEstimatedPerPerson;

    // Breakdown by day
    const byDay = Array.from({ length: trip.totalDays }, (_, i) => {
      const dayNum = i + 1;
      const actCost = trip.activities
        .filter((a) => a.dayNumber === dayNum)
        .reduce((s, a) => s + a.estimatedCost, 0);
      const mealCost = trip.meals
        .filter((m) => m.dayNumber === dayNum)
        .reduce((s, m) => s + m.estimatedCostPerPerson, 0);
      return {
        dayNum,
        actCost,
        mealCost,
        total: actCost + mealCost,
      };
    });

    // Breakdown by activity category
    const byCategory = (Object.keys(CATEGORY_LABELS) as ActivityCategory[]).map(
      (cat) => {
        const cost = trip.activities
          .filter((a) => a.category === cat)
          .reduce((s, a) => s + a.estimatedCost, 0);
        return {
          category: cat,
          label: CATEGORY_LABELS[cat],
          cost,
        };
      }
    );

    return {
      activitiesCostPerPerson,
      mealsCostPerPerson,
      totalEstimatedPerPerson,
      totalGroupCost,
      remainingBudget,
      byDay,
      byCategory,
    };
  }, [trip]);

  const usagePercent =
    trip.budgetTargetPerPerson > 0
      ? Math.min(
          100,
          Math.round(
            (budgetData.totalEstimatedPerPerson / trip.budgetTargetPerPerson) *
              100
          )
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Summary Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#E8C2E8] rounded-[28px] p-6 border border-black/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#141416]/70">
              Geplantes Budget p.P.
            </span>
            <Wallet className="w-5 h-5 text-[#141416]" />
          </div>
          <div className="text-3xl font-extrabold text-[#141416]">
            {budgetData.totalEstimatedPerPerson} €{' '}
            <span className="text-sm font-semibold text-[#141416]/70">
              / {trip.budgetTargetPerPerson} € Ziel
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-white/60 overflow-hidden mt-3">
            <div
              style={{ width: `${usagePercent}%` }}
              className="h-full bg-[#141416] rounded-full"
            />
          </div>
          <p className="text-xs font-semibold text-[#141416] mt-2">
            {budgetData.remainingBudget >= 0
              ? `Noch ${budgetData.remainingBudget} € Spielraum pro Person für Extras & Unterkunft`
              : `${Math.abs(budgetData.remainingBudget)} € über dem Richtwert pro Person`}
          </p>
        </div>

        <div className="bg-[#F4DF7B] rounded-[28px] p-6 border border-black/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#141416]/70">
              Aktivitäten vs. Kulinarik
            </span>
            <PieChart className="w-5 h-5 text-[#141416]" />
          </div>
          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between text-xs font-bold bg-white/60 rounded-xl px-3 py-2">
              <span className="flex items-center gap-1.5">
                <Compass className="w-4 h-4" /> Aktivitäten ({trip.activities.length})
              </span>
              <span>{budgetData.activitiesCostPerPerson} € p.P.</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold bg-white/60 rounded-xl px-3 py-2">
              <span className="flex items-center gap-1.5">
                <Utensils className="w-4 h-4" /> Essen & Drinks ({trip.meals.length})
              </span>
              <span>{budgetData.mealsCostPerPerson} € p.P.</span>
            </div>
          </div>
        </div>

        <div className="bg-[#A9B882] rounded-[28px] p-6 border border-black/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#141416]/70">
              Gruppen-Gesamtkasse ({trip.travelers.length} Pers.)
            </span>
            <TrendingUp className="w-5 h-5 text-[#141416]" />
          </div>
          <div className="text-3xl font-extrabold text-[#141416]">
            {budgetData.totalGroupCost} €
          </div>
          <p className="text-xs text-[#141416]/80 mt-2">
            Durchschnittlich ca.{' '}
            <strong>
              {Math.round(
                budgetData.totalEstimatedPerPerson / Math.max(1, trip.totalDays)
              )}{' '}
              € pro Tag
            </strong>{' '}
            und Person für Programm & Verpflegung.
          </p>
        </div>
      </div>

      {/* Breakdown by Day & Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Cost Breakdown */}
        <div className="bg-[#EFECE6] rounded-[28px] p-6 border border-black/5">
          <h3 className="text-base font-extrabold text-[#141416] mb-4">
            Kosten-Verlauf nach Reisetag (pro Person)
          </h3>
          <div className="space-y-3">
            {budgetData.byDay.map((d) => {
              const maxDayTotal = Math.max(
                ...budgetData.byDay.map((x) => x.total),
                1
              );
              const barPct = Math.round((d.total / maxDayTotal) * 100);

              return (
                <div
                  key={d.dayNum}
                  className="bg-[#F9F6F0] rounded-2xl p-3.5 border border-black/5"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-[#141416] mb-1.5">
                    <span>Tag {d.dayNum}</span>
                    <span>
                      {d.total} €{' '}
                      <span className="text-neutral-500 font-normal">
                        ({d.actCost} € Akt. • {d.mealCost} € Essen)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#EFECE6] overflow-hidden">
                    <div
                      style={{ width: `${barPct}%` }}
                      className="h-full bg-[#141416] rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-[#EFECE6] rounded-[28px] p-6 border border-black/5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-[#141416] mb-4">
              Aufschlüsselung nach Kategorien (pro Person)
            </h3>
            <div className="space-y-2.5">
              {budgetData.byCategory.map((c) => (
                <div
                  key={c.category}
                  className="flex items-center justify-between bg-[#F9F6F0] rounded-2xl px-4 py-3 text-xs font-bold text-[#141416] border border-black/5"
                >
                  <span>{c.label}</span>
                  <span className="px-2.5 py-1 rounded-full bg-[#F4DF7B]/60">
                    {c.cost} €
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between bg-[#F7C59F]/50 rounded-2xl px-4 py-3 text-xs font-extrabold text-[#141416] border border-black/5">
                <span>Kulinarik & Mahlzeiten gesamt</span>
                <span className="px-2.5 py-1 rounded-full bg-white">
                  {budgetData.mealsCostPerPerson} €
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white/80 rounded-2xl p-4 text-xs text-neutral-600 border border-black/5">
            <strong className="text-[#141416]">Hinweis zur Reisekasse:</strong> Alle Preise basieren auf den geschätzten Kosten eurer eingetragenen Aktivitäts- und Essens-Vorschläge.
          </div>
        </div>
      </div>
    </div>
  );
};
