import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Award,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Circle,
  Compass,
  CreditCard,
  Edit3,
  FileText,
  Filter,
  Flame,
  ListChecks,
  Lock,
  Luggage,
  Package,
  PiggyBank,
  Plus,
  Receipt,
  Scale,
  ShoppingBag,
  Sparkles,
  Square,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Unlock,
  UserCheck,
  Users,
  Utensils,
  Vote,
  Wallet,
  X,
} from 'lucide-react';
import { PollOptionInput, useVacation } from '../context/VacationContext';
import {
  ActivityCategory,
  CurrencyCode,
  ExpenseCategory,
  ExpenseItem,
  Poll,
  TaskCategory,
  TaskPriority,
  TodoTask,
  Traveler,
} from '../types/vacation';
import {
  calculateSettlements,
  clampCost,
  compareTimeSlots,
  formatCurrency,
  formatTripDayDate,
  getSafeInitials,
  roundCents,
} from '../utils/vacationHelpers';

// ============================================================================
// POLLS VIEW
// ============================================================================

const POLL_CATEGORY_META: Record<
  Poll['category'],
  { label: string; badgeClass: string }
> = {
  general: {
    label: 'Allgemein',
    badgeClass: 'bg-slate-500/15 text-slate-200 border-slate-400/25',
  },
  accommodation: {
    label: 'Unterkunft',
    badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-400/30',
  },
  activity: {
    label: 'Aktivität',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
  },
  food: {
    label: 'Essen & Trinken',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  },
  transport: {
    label: 'Transport',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  },
};

const POLL_CATEGORY_TO_ACTIVITY_CAT: Record<Poll['category'], ActivityCategory> = {
  general: 'other',
  accommodation: 'other',
  activity: 'activity',
  food: 'other',
  transport: 'transport',
};

interface DraftPollOption {
  key: string;
  id?: string;
  text: string;
  subtitle: string;
}

const makeEmptyDraftOptions = (): DraftPollOption[] => [
  { key: `draft-${Date.now()}-1`, text: '', subtitle: '' },
  { key: `draft-${Date.now()}-2`, text: '', subtitle: '' },
];

export const PollsView: React.FC = () => {
  const {
    trip,
    currentUser,
    selectedDay,
    searchTarget,
    setSearchTarget,
    addPoll,
    updatePoll,
    togglePollVote,
    togglePollClosed,
    deletePoll,
    addActivity,
    addMeal,
    showToast,
  } = useVacation();

  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [filterCategory, setFilterCategory] = useState<Poll['category'] | 'all'>('all');
  const [showClosedPolls, setShowClosedPolls] = useState<boolean>(false);

  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState<string>('');
  const [category, setCategory] = useState<Poll['category']>('activity');
  const [dayNumber, setDayNumber] = useState<string>('');
  const [allowMultiple, setAllowMultiple] = useState<boolean>(false);
  const [options, setOptions] = useState<DraftPollOption[]>(makeEmptyDraftOptions);
  const [formError, setFormError] = useState<string | null>(null);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const travelerById = useMemo(
    () => new Map(trip.travelers.map((t) => [t.id, t])),
    [trip.travelers]
  );

  // Spotlight search integration
  useEffect(() => {
    if (!searchTarget || searchTarget.kind !== 'poll') return;
    const found = trip.polls.find((p) => p.id === searchTarget.id);
    setFilterCategory('all');
    if (found?.isClosed) {
      setFilterStatus('all');
      setShowClosedPolls(true);
    } else {
      setFilterStatus('all');
    }
    setHighlightedId(searchTarget.id);
    setSearchTarget(null);
  }, [searchTarget, setSearchTarget, trip.polls]);

  useEffect(() => {
    if (!highlightedId) return;
    const scrollTimer = window.setTimeout(() => {
      const el = document.querySelector(`[data-search-id="poll-${highlightedId}"]`);
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
    const clearTimer = window.setTimeout(() => setHighlightedId(null), 3600);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [highlightedId]);

  // Scroll inline editor into view when opened
  useEffect(() => {
    if (!showForm) return;
    const timer = window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [showForm, editingId]);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setQuestion('');
    setCategory('activity');
    setDayNumber('');
    setAllowMultiple(false);
    setOptions(makeEmptyDraftOptions());
    setFormError(null);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setQuestion('');
    setCategory('activity');
    setDayNumber('');
    setAllowMultiple(false);
    setOptions(makeEmptyDraftOptions());
    setFormError(null);
    setShowForm(true);
  };

  const startEdit = (poll: Poll) => {
    setEditingId(poll.id);
    setQuestion(poll.question);
    setCategory(poll.category);
    setDayNumber(poll.dayNumber ? String(poll.dayNumber) : '');
    setAllowMultiple(Boolean(poll.allowMultiple));
    const mapped: DraftPollOption[] = poll.options.map((opt) => ({
      key: opt.id,
      id: opt.id,
      text: opt.text,
      subtitle: opt.subtitle || '',
    }));
    while (mapped.length < 2) {
      mapped.push({
        key: `draft-${Date.now()}-${mapped.length}`,
        text: '',
        subtitle: '',
      });
    }
    setOptions(mapped);
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setFormError('Bitte gib eine Frage oder ein Thema für die Abstimmung ein.');
      return;
    }

    const nonEmptyOptions = options
      .map((o) => ({
        ...o,
        text: o.text.trim(),
        subtitle: o.subtitle.trim(),
      }))
      .filter((o) => o.text.length > 0);

    if (nonEmptyOptions.length < 2) {
      setFormError('Mindestens 2 ausgefüllte Antwortoptionen sind erforderlich.');
      return;
    }

    // Duplicate protection (case-insensitive trimmed check)
    const seen = new Set<string>();
    for (const opt of nonEmptyOptions) {
      const normalized = opt.text.toLowerCase();
      if (seen.has(normalized)) {
        setFormError(`Doppelte Option erkannt: „${opt.text}“. Bitte eindeutige Optionen wählen.`);
        return;
      }
      seen.add(normalized);
    }

    const payloadOptions: PollOptionInput[] = nonEmptyOptions.map((o) => ({
      ...(o.id ? { id: o.id } : {}),
      text: o.text,
      subtitle: o.subtitle || undefined,
    }));

    const parsedDay = dayNumber ? parseInt(dayNumber, 10) : undefined;
    const validDay = parsedDay && !Number.isNaN(parsedDay) ? parsedDay : undefined;

    if (editingId) {
      updatePoll(editingId, trimmedQuestion, category, payloadOptions, validDay, allowMultiple);
      showToast('Abstimmung aktualisiert — bestehende Stimmen blieben erhalten.', 'success');
    } else {
      addPoll(trimmedQuestion, category, payloadOptions, validDay, allowMultiple);
    }
    resetForm();
  };

  const handlePromoteOption = (poll: Poll, optionId: string, target: 'activity' | 'meal') => {
    const opt = poll.options.find((o) => o.id === optionId);
    if (!opt) return;

    const targetDay = Math.min(
      Math.max(poll.dayNumber ?? selectedDay ?? 1, 1),
      Math.max(1, trip.totalDays)
    );

    if (target === 'meal') {
      addMeal({
        dayNumber: targetDay,
        mealType: 'dinner',
        style: 'restaurant',
        title: opt.text,
        time: '19:30',
        locationOrRecipe: opt.subtitle || trip.destination,
        description: `Aus Abstimmung „${poll.question}“`,
        estimatedCostPerPerson: 0,
        assignedTeam: [],
      });
      showToast(`„${opt.text}“ in den Essensplan (Tag ${targetDay}) übernommen!`, 'success');
    } else {
      addActivity({
        dayNumber: targetDay,
        timeSlot: '10:00',
        title: opt.text,
        category: POLL_CATEGORY_TO_ACTIVITY_CAT[poll.category] || 'other',
        location: trip.destination,
        description: opt.subtitle
          ? `${opt.subtitle} · Aus Abstimmung „${poll.question}“`
          : `Aus Abstimmung „${poll.question}“`,
        estimatedCost: 0,
        status: 'planned',
      });
      showToast(`„${opt.text}“ in den Tagesplan (Tag ${targetDay}) übernommen!`, 'success');
    }
  };

  const openCount = useMemo(
    () => trip.polls.filter((p) => !p.isClosed).length,
    [trip.polls]
  );
  const closedCount = useMemo(
    () => trip.polls.filter((p) => p.isClosed).length,
    [trip.polls]
  );

  const filteredPolls = useMemo(() => {
    return trip.polls.filter((p) => {
      if (filterStatus === 'open' && p.isClosed) return false;
      if (filterStatus === 'closed' && !p.isClosed) return false;
      if (filterCategory !== 'all' && p.category !== filterCategory) return false;
      return true;
    });
  }, [trip.polls, filterCategory, filterStatus]);

  const visibleOpenPolls = useMemo(
    () => filteredPolls.filter((p) => !p.isClosed),
    [filteredPolls]
  );
  const visibleClosedPolls = useMemo(
    () => filteredPolls.filter((p) => Boolean(p.isClosed)),
    [filteredPolls]
  );

  const hasActiveFilter = filterStatus !== 'all' || filterCategory !== 'all';

  const renderPollCard = (poll: Poll) => {
    const meta = POLL_CATEGORY_META[poll.category] ?? POLL_CATEGORY_META.general;
    const author = travelerById.get(poll.createdBy);
    const totalVotes = poll.options.reduce((acc, o) => acc + o.votes.length, 0);
    const uniqueVoters = new Set(poll.options.flatMap((o) => o.votes)).size;
    const maxVotes = Math.max(0, ...poll.options.map((o) => o.votes.length));
    const topOptions =
      maxVotes > 0 ? poll.options.filter((o) => o.votes.length === maxVotes) : [];
    const isTie = topOptions.length > 1;
    const clearWinner = topOptions.length === 1 ? topOptions[0] : null;
    const isHighlighted = highlightedId === poll.id;

    return (
      <div
        key={poll.id}
        data-search-id={`poll-${poll.id}`}
        className={`aurora-glass rounded-2xl p-5 flex flex-col transition-all ${
          poll.isClosed ? 'opacity-90 border-slate-500/20' : ''
        } ${
          isHighlighted
            ? 'ring-2 ring-cyan-400 shadow-[0_0_28px_rgba(34,211,238,0.28)]'
            : 'hover:border-white/15'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${meta.badgeClass}`}
            >
              {meta.label}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                poll.allowMultiple
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-400/25'
                  : 'bg-white/5 text-slate-300 border-white/10'
              }`}
            >
              {poll.allowMultiple ? 'Mehrfachauswahl' : 'Einzelwahl'}
            </span>
            {poll.dayNumber && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums bg-white/5 text-slate-300 border border-white/10">
                Tag {poll.dayNumber}
              </span>
            )}
            {poll.isClosed ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/20 text-slate-300 border border-slate-400/25">
                <Lock className="w-3 h-3" /> Geschlossen
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/25">
                <Vote className="w-3 h-3" /> Offen
              </span>
            )}
            {isTie && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-400/30">
                <Scale className="w-3 h-3" /> Gleichstand
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => startEdit(poll)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition-colors"
              title="Abstimmung bearbeiten"
              aria-label={`Abstimmung „${poll.question}“ bearbeiten`}
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => togglePollClosed(poll.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-white/10 transition-colors"
              title={poll.isClosed ? 'Abstimmung wieder öffnen' : 'Abstimmung schließen'}
              aria-label={poll.isClosed ? 'Abstimmung öffnen' : 'Abstimmung schließen'}
            >
              {poll.isClosed ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => deletePoll(poll.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Abstimmung löschen"
              aria-label={`Abstimmung „${poll.question}“ löschen`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h3 className="text-base font-bold text-slate-100 leading-snug mb-1">{poll.question}</h3>
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
          {author ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-4 h-4 rounded-full text-[9px] font-bold text-slate-950 flex items-center justify-center"
                style={{ backgroundColor: author.color }}
              >
                {getSafeInitials(author.initials || author.name)}
              </span>
              <span>von {author.name}</span>
            </span>
          ) : (
            <span>Unbekannter Ersteller</span>
          )}
          <span>·</span>
          <span className="font-mono tabular-nums">
            {totalVotes} {totalVotes === 1 ? 'Stimme' : 'Stimmen'} ({uniqueVoters} Person
            {uniqueVoters === 1 ? '' : 'en'})
          </span>
        </div>

        {/* Options */}
        <div className="space-y-2.5 flex-1">
          {poll.options.map((opt) => {
            const count = opt.votes.length;
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const userVoted = opt.votes.includes(currentUser.id);
            const isTopOption = maxVotes > 0 && count === maxVotes;

            return (
              <div key={opt.id} className="space-y-1">
                <button
                  type="button"
                  disabled={Boolean(poll.isClosed)}
                  onClick={() => togglePollVote(poll.id, opt.id)}
                  className={`w-full text-left relative overflow-hidden rounded-xl border p-3 transition-all ${
                    poll.isClosed ? 'cursor-default' : 'cursor-pointer hover:border-cyan-400/40'
                  } ${
                    userVoted
                      ? 'bg-cyan-500/12 border-cyan-400/50 shadow-[0_0_16px_rgba(34,211,238,0.12)]'
                      : 'bg-[#131823]/80 border-white/10'
                  }`}
                >
                  {/* Progress background */}
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-300 ${
                      userVoted
                        ? 'bg-cyan-400/15'
                        : isTopOption
                        ? isTie
                          ? 'bg-amber-400/12'
                          : 'bg-emerald-400/12'
                        : 'bg-white/[0.04]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />

                  <div className="relative flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className={`mt-0.5 shrink-0 ${
                          userVoted ? 'text-cyan-300' : 'text-slate-400'
                        }`}
                      >
                        {poll.allowMultiple ? (
                          userVoted ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )
                        ) : userVoted ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold text-slate-100 break-words">
                            {opt.text}
                          </span>
                          {isTopOption && !isTie && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                              <Award className="w-3 h-3" />
                              {poll.isClosed ? 'Gewinner' : 'Favorit'}
                            </span>
                          )}
                          {isTopOption && isTie && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-400/30">
                              <Scale className="w-3 h-3" /> Gleichstand
                            </span>
                          )}
                        </div>
                        {opt.subtitle && (
                          <p className="text-xs text-slate-400 mt-0.5 break-words">{opt.subtitle}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex -space-x-1">
                        {opt.votes.slice(0, 5).map((vid) => {
                          const voter = travelerById.get(vid);
                          if (!voter) return null;
                          return (
                            <span
                              key={vid}
                              title={voter.name}
                              className="w-5 h-5 rounded-full text-[9px] font-bold text-slate-950 flex items-center justify-center ring-1 ring-[#0B0E14]"
                              style={{ backgroundColor: voter.color }}
                            >
                              {getSafeInitials(voter.initials || voter.name)}
                            </span>
                          );
                        })}
                        {opt.votes.length > 5 && (
                          <span className="w-5 h-5 rounded-full text-[9px] font-mono bg-slate-700 text-slate-200 flex items-center justify-center ring-1 ring-[#0B0E14]">
                            +{opt.votes.length - 5}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono tabular-nums font-semibold text-slate-200 min-w-[3.2rem] text-right">
                        {count} ({pct}%)
                      </span>
                    </div>
                  </div>
                </button>

                {/* Quick promote for tied top options */}
                {isTie && isTopOption && (
                  <div className="flex flex-wrap items-center justify-end gap-1.5 px-1">
                    <span className="text-[11px] text-amber-300/90">Bei Gleichstand wählen:</span>
                    {poll.category === 'food' ? (
                      <button
                        type="button"
                        onClick={() => handlePromoteOption(poll, opt.id, 'meal')}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/30 transition-colors"
                      >
                        <Utensils className="w-3 h-3" /> In Essensplan
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePromoteOption(poll, opt.id, 'activity')}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/30 transition-colors"
                      >
                        <ArrowRight className="w-3 h-3" /> In Tagesplan
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Winner promotion footer */}
        {clearWinner && (
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-400 truncate max-w-[60%]">
              Führend: <strong className="text-slate-200">{clearWinner.text}</strong>
            </span>
            <div className="flex items-center gap-2">
              {poll.category === 'food' ? (
                <button
                  type="button"
                  onClick={() => handlePromoteOption(poll, clearWinner.id, 'meal')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/30 transition-colors"
                >
                  <Utensils className="w-3.5 h-3.5" />
                  Gewinner in Essensplan übernehmen
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePromoteOption(poll, clearWinner.id, 'activity')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/30 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Gewinner in Tagesplan übernehmen
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="aurora-glass-elevated rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Gruppen-Abstimmungen</h2>
              <p className="text-xs text-slate-400">
                Demokratisch entscheiden · Einzel- & Mehrfachauswahl · Gewinner direkt einplanen
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#131823] border border-white/10 text-xs">
            <span className="text-emerald-300 font-mono tabular-nums font-bold">{openCount}</span>
            <span className="text-slate-400">offen</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300 font-mono tabular-nums font-bold">{closedCount}</span>
            <span className="text-slate-400">geschlossen</span>
          </div>

          <button
            type="button"
            onClick={() => (showForm && !editingId ? resetForm() : openCreateForm())}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.28)] transition-all"
          >
            {showForm && !editingId ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm && !editingId ? 'Schließen' : 'Neue Abstimmung'}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="aurora-glass rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: `Alle (${trip.polls.length})` },
              { id: 'open', label: `Offen (${openCount})` },
              { id: 'closed', label: `Geschlossen (${closedCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === tab.id
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1" />
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filterCategory === 'all'
                ? 'bg-white/15 text-slate-100'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            Alle Kategorien
          </button>
          {(Object.keys(POLL_CATEGORY_META) as Poll['category'][]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterCategory === cat
                  ? 'bg-white/15 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {POLL_CATEGORY_META[cat].label}
            </button>
          ))}
        </div>
      </div>

      {/* Create / Edit Poll Form */}
      {showForm && (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="aurora-glass-elevated rounded-2xl p-5 border border-cyan-400/30 space-y-4 animate-in"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-100">
              {editingId ? 'Abstimmung bearbeiten' : 'Neue Abstimmung erstellen'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10"
              aria-label="Formular schließen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Frage / Thema *
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="z.B. Welchen Strand besuchen wir am Mittwoch?"
                className="aurora-input w-full px-3 py-2 rounded-xl text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Kategorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Poll['category'])}
                  className="aurora-input w-full px-2.5 py-2 rounded-xl text-sm [color-scheme:dark]"
                >
                  {(Object.keys(POLL_CATEGORY_META) as Poll['category'][]).map((cat) => (
                    <option key={cat} value={cat} className="bg-[#131823] text-slate-100">
                      {POLL_CATEGORY_META[cat].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tag (opt.)</label>
                <select
                  value={dayNumber}
                  onChange={(e) => setDayNumber(e.target.value)}
                  className="aurora-input w-full px-2.5 py-2 rounded-xl text-sm [color-scheme:dark]"
                >
                  <option value="" className="bg-[#131823] text-slate-100">
                    Allgemein
                  </option>
                  {Array.from({ length: trip.totalDays }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={String(d)} className="bg-[#131823] text-slate-100">
                      Tag {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Single vs Multi-choice toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#131823]/70 border border-white/10">
            <div>
              <p className="text-xs font-semibold text-slate-200">Abstimmungsmodus</p>
              <p className="text-[11px] text-slate-400">
                Wähle zwischen genau einer Stimme oder Mehrfachauswahl pro Person.
              </p>
            </div>
            <div className="inline-flex rounded-xl p-1 bg-[#0B0E14] border border-white/10">
              <button
                type="button"
                onClick={() => setAllowMultiple(false)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  !allowMultiple
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/35'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Single-Choice
              </button>
              <button
                type="button"
                onClick={() => setAllowMultiple(true)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  allowMultiple
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/35'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Multi-Choice
              </button>
            </div>
          </div>

          {/* Options with preserved ID + editable subtitle */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                Antwortoptionen (min. 2) · bestehende Stimmen bleiben beim Umbenennen erhalten
              </label>
              <button
                type="button"
                onClick={() =>
                  setOptions((prev) => [
                    ...prev,
                    { key: `draft-${Date.now()}-${prev.length}`, text: '', subtitle: '' },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
              >
                <Plus className="w-3.5 h-3.5" /> Option hinzufügen
              </button>
            </div>

            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div
                  key={opt.key}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-[#131823]/70 border border-white/10"
                >
                  <div className="md:col-span-5 flex items-center gap-2">
                    <span className="text-xs font-mono tabular-nums text-slate-500 w-5 text-center shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOptions((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, text: val } : item))
                        );
                      }}
                      placeholder={`Option ${idx + 1} (Titel)`}
                      className="aurora-input w-full px-3 py-1.5 rounded-lg text-sm"
                    />
                  </div>
                  <div className="md:col-span-6">
                    <input
                      type="text"
                      value={opt.subtitle}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOptions((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, subtitle: val } : item))
                        );
                      }}
                      placeholder="Untertitel / Preis / Info (optional)"
                      className="aurora-input w-full px-3 py-1.5 rounded-lg text-xs"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      disabled={options.length <= 2}
                      onClick={() =>
                        setOptions((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:pointer-events-none"
                      title="Option entfernen"
                      aria-label={`Option ${idx + 1} entfernen`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-colors"
            >
              <Check className="w-4 h-4" />
              {editingId ? 'Änderungen speichern' : 'Abstimmung starten'}
            </button>
          </div>
        </form>
      )}

      {/* Content */}
      {trip.polls.length === 0 ? (
        <div className="aurora-glass rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
            <Vote className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Noch keine Abstimmungen</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Starte die erste Umfrage für Unterkünfte, Aktivitäten, Restaurants oder Mietwagen,
            damit alle gemeinsam abstimmen können.
          </p>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-colors"
          >
            <Plus className="w-4 h-4" /> Erste Abstimmung starten
          </button>
        </div>
      ) : filteredPolls.length === 0 ? (
        <div className="aurora-glass rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm text-slate-300">
            Keine Abstimmungen für die aktuellen Filter gefunden.
          </p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => {
                setFilterStatus('all');
                setFilterCategory('all');
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-100 transition-colors"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Open Polls */}
          {visibleOpenPolls.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {visibleOpenPolls.map(renderPollCard)}
            </div>
          )}

          {/* Closed Polls */}
          {visibleClosedPolls.length > 0 && (
            <div className="space-y-3">
              {filterStatus === 'closed' ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {visibleClosedPolls.map(renderPollCard)}
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowClosedPolls((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#131823] hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                  >
                    {showClosedPolls ? (
                      <ChevronDown className="w-4 h-4 text-cyan-300" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    Abgeschlossene Abstimmungen ({visibleClosedPolls.length})
                  </button>
                  {showClosedPolls && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {visibleClosedPolls.map(renderPollCard)}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// TASKS VIEW
// ============================================================================

const CATEGORY_META: Record<
  TaskCategory,
  {
    label: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeClass: string;
  }
> = {
  before_trip: {
    label: 'Vor der Reise',
    subtitle: 'Buchungen, Versicherungen & Orga',
    icon: Flame,
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
  },
  shared_equipment: {
    label: 'Gemeinschafts-Equipment',
    subtitle: 'Wer bringt was für die Gruppe mit?',
    icon: Package,
    badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-400/30',
  },
  packing: {
    label: 'Packliste',
    subtitle: 'Kleidung, Technik & Persönliches',
    icon: Luggage,
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  },
  shopping: {
    label: 'Einkaufsliste',
    subtitle: 'Supermarkt, Vorräte & Verpflegung',
    icon: ShoppingBag,
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  },
  documents: {
    label: 'Dokumente & Tickets',
    subtitle: 'Pässe, Bordkarten & Mietwagen',
    icon: FileText,
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
  },
};

const PRIORITY_META: Record<
  TaskPriority,
  { label: string; badgeClass: string; order: number }
> = {
  critical: {
    label: 'Kritisch',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
    order: 0,
  },
  important: {
    label: 'Wichtig',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    order: 1,
  },
  normal: {
    label: 'Normal',
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-400/25',
    order: 2,
  },
};

const TASK_CATEGORIES_ORDER: TaskCategory[] = [
  'before_trip',
  'shared_equipment',
  'shopping',
  'documents',
  'packing',
];

export const TasksView: React.FC = () => {
  const {
    trip,
    currentUser,
    searchTarget,
    setSearchTarget,
    addTask,
    updateTask,
    toggleTaskCompleted,
    toggleTaskVote,
    deleteTask,
    showToast,
  } = useVacation();

  const [filterCategory, setFilterCategory] = useState<TaskCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'done'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'unassigned' | string>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});

  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<TaskCategory>('before_trip');
  const [priority, setPriority] = useState<TaskPriority>('important');
  const [assignedTo, setAssignedTo] = useState<string>('');

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const travelerById = useMemo(
    () => new Map(trip.travelers.map((t) => [t.id, t])),
    [trip.travelers]
  );

  // Spotlight search integration
  useEffect(() => {
    if (!searchTarget || searchTarget.kind !== 'task') return;
    const found = trip.tasks.find((t) => t.id === searchTarget.id);
    setFilterCategory('all');
    setFilterStatus('all');
    setAssigneeFilter('all');
    setPriorityFilter('all');
    if (found) {
      setCollapsedCats((prev) => ({ ...prev, [found.category]: false }));
    }
    setHighlightedId(searchTarget.id);
    setSearchTarget(null);
  }, [searchTarget, setSearchTarget, trip.tasks]);

  useEffect(() => {
    if (!highlightedId) return;
    const scrollTimer = window.setTimeout(() => {
      const el = document.querySelector(`[data-search-id="task-${highlightedId}"]`);
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 90);
    const clearTimer = window.setTimeout(() => setHighlightedId(null), 3600);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [highlightedId]);

  useEffect(() => {
    if (!showForm) return;
    const timer = window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [showForm, editingId]);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setTitle('');
    setDescription('');
    setCategory('before_trip');
    setPriority('important');
    setAssignedTo('');
  };

  const openCreateForm = (presetCategory?: TaskCategory) => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setCategory(presetCategory || 'before_trip');
    setPriority('important');
    setAssignedTo('');
    setShowForm(true);
  };

  const startEdit = (task: TodoTask) => {
    setEditingId(task.id);
    setTitle(task.title);
    setDescription(task.description || '');
    setCategory(task.category);
    setPriority(task.priority);
    setAssignedTo(task.assignedTo || '');
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    if (editingId) {
      updateTask(editingId, {
        title: trimmedTitle,
        description: description.trim() || undefined,
        category,
        priority,
        assignedTo: assignedTo || undefined,
      });
      showToast('Aufgabe aktualisiert.', 'success');
    } else {
      addTask({
        title: trimmedTitle,
        description: description.trim() || undefined,
        category,
        priority,
        assignedTo: assignedTo || undefined,
      });
    }
    resetForm();
  };

  const toggleCollapse = (cat: string) => {
    setCollapsedCats((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const filteredTasks = useMemo(() => {
    return trip.tasks.filter((task) => {
      if (filterCategory !== 'all' && task.category !== filterCategory) return false;
      if (filterStatus === 'open' && task.completed) return false;
      if (filterStatus === 'done' && !task.completed) return false;
      if (assigneeFilter === 'unassigned' && task.assignedTo) return false;
      if (
        assigneeFilter !== 'all' &&
        assigneeFilter !== 'unassigned' &&
        task.assignedTo !== assigneeFilter
      ) {
        return false;
      }
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      return true;
    });
  }, [trip.tasks, filterCategory, filterStatus, assigneeFilter, priorityFilter]);

  const completedTotal = useMemo(
    () => trip.tasks.filter((t) => t.completed).length,
    [trip.tasks]
  );
  const totalCount = trip.tasks.length;
  const overallProgress = totalCount > 0 ? Math.round((completedTotal / totalCount) * 100) : 0;

  const hasActiveFilter =
    filterCategory !== 'all' ||
    filterStatus !== 'all' ||
    assigneeFilter !== 'all' ||
    priorityFilter !== 'all';

  const resetAllFilters = () => {
    setFilterCategory('all');
    setFilterStatus('all');
    setAssigneeFilter('all');
    setPriorityFilter('all');
  };

  const visibleCategories = useMemo(() => {
    const known = TASK_CATEGORIES_ORDER.filter((cat) => {
      if (filterCategory !== 'all' && filterCategory !== cat) return false;
      return filteredTasks.some((t) => t.category === cat);
    });
    return known;
  }, [filterCategory, filteredTasks]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="aurora-glass-elevated rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
            <ListChecks className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Checkliste & Aufgaben</h2>
            <p className="text-xs text-slate-400">
              Gemeinschafts-Equipment, Einkaufsliste, Dokumente & persönliche Packliste
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#131823] border border-white/10">
            <div className="text-right">
              <div className="text-xs font-mono tabular-nums font-bold text-slate-100">
                {completedTotal} / {totalCount} erledigt ({overallProgress}%)
              </div>
              <div className="w-32 h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => (showForm && !editingId ? resetForm() : openCreateForm())}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.28)] transition-all"
          >
            {showForm && !editingId ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm && !editingId ? 'Schließen' : 'Neue Aufgabe'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="aurora-glass rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterCategory === 'all'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            Alle ({trip.tasks.length})
          </button>
          {TASK_CATEGORIES_ORDER.map((cat) => {
            const meta = CATEGORY_META[cat];
            const count = trip.tasks.filter((t) => t.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filterCategory === cat
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                {meta.label} <span className="font-mono tabular-nums opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'all', label: 'Alle Status' },
                { id: 'open', label: 'Offen' },
                { id: 'done', label: 'Erledigt' },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setFilterStatus(st.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filterStatus === st.id
                    ? 'bg-white/15 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                aria-label="Nach Zuständigkeit filtern"
                className="aurora-input px-2.5 py-1 rounded-lg text-xs [color-scheme:dark]"
              >
                <option value="all" className="bg-[#131823] text-slate-100">
                  Alle Personen
                </option>
                <option value="unassigned" className="bg-[#131823] text-slate-100">
                  Noch niemand zugewiesen
                </option>
                {trip.travelers.map((tr) => (
                  <option key={tr.id} value={tr.id} className="bg-[#131823] text-slate-100">
                    {tr.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
                aria-label="Nach Priorität filtern"
                className="aurora-input px-2.5 py-1 rounded-lg text-xs [color-scheme:dark]"
              >
                <option value="all" className="bg-[#131823] text-slate-100">
                  Alle Prioritäten
                </option>
                <option value="critical" className="bg-[#131823] text-slate-100">
                  Kritisch
                </option>
                <option value="important" className="bg-[#131823] text-slate-100">
                  Wichtig
                </option>
                <option value="normal" className="bg-[#131823] text-slate-100">
                  Normal
                </option>
              </select>
            </div>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-cyan-300 hover:bg-cyan-500/10 transition-colors"
              >
                Zurücksetzen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inline Create / Edit Form */}
      {showForm && (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="aurora-glass-elevated rounded-2xl p-5 border border-cyan-400/30 space-y-4 animate-in"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-100">
              {editingId ? 'Aufgabe bearbeiten' : 'Neue Aufgabe hinzufügen'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10"
              aria-label="Formular schließen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Aufgabe *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. JBL Charge 5 + Powerbank einpacken"
                className="aurora-input w-full px-3 py-2 rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Kategorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="aurora-input w-full px-2.5 py-2 rounded-xl text-sm [color-scheme:dark]"
              >
                {TASK_CATEGORIES_ORDER.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#131823] text-slate-100">
                    {CATEGORY_META[cat].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Priorität</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="aurora-input w-full px-2.5 py-2 rounded-xl text-sm [color-scheme:dark]"
              >
                <option value="critical" className="bg-[#131823] text-slate-100">
                  Kritisch
                </option>
                <option value="important" className="bg-[#131823] text-slate-100">
                  Wichtig
                </option>
                <option value="normal" className="bg-[#131823] text-slate-100">
                  Normal
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Hinweis / Details (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="z.B. Mit USB-C-Kabel für die Finca-Terrasse"
                className="aurora-input w-full px-3 py-2 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Zuständig (Wer bringt es mit?)
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="aurora-input w-full px-2.5 py-2 rounded-xl text-sm [color-scheme:dark]"
              >
                <option value="" className="bg-[#131823] text-slate-100">
                  Noch offen / Unassigned
                </option>
                {trip.travelers.map((tr) => (
                  <option key={tr.id} value={tr.id} className="bg-[#131823] text-slate-100">
                    {tr.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/10"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-colors"
            >
              <Check className="w-4 h-4" />
              {editingId ? 'Änderungen speichern' : 'Aufgabe anlegen'}
            </button>
          </div>
        </form>
      )}

      {/* Empty States or Category Accordions */}
      {trip.tasks.length === 0 ? (
        <div className="aurora-glass rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
            <ListChecks className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Noch keine Aufgaben vorhanden</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Lege erste To-dos für Dokumente, Gemeinschafts-Equipment oder den Einkauf an – oder
            übernimm im Tab „Essen“ direkt alle Kochzutaten mit einem Klick.
          </p>
          <button
            type="button"
            onClick={() => openCreateForm('before_trip')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-colors"
          >
            <Plus className="w-4 h-4" /> Erste Aufgabe anlegen
          </button>
        </div>
      ) : visibleCategories.length === 0 ? (
        <div className="aurora-glass rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm text-slate-300">
            Keine Aufgaben entsprechen den gewählten Filtern.
          </p>
          <button
            type="button"
            onClick={resetAllFilters}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-100 transition-colors"
          >
            Alle Filter zurücksetzen
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleCategories.map((cat) => {
            const meta = CATEGORY_META[cat] ?? CATEGORY_META.before_trip;
            const Icon = meta.icon;
            const catTasks = filteredTasks
              .filter((t) => t.category === cat)
              .sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                const pA = (PRIORITY_META[a.priority] ?? PRIORITY_META.normal).order;
                const pB = (PRIORITY_META[b.priority] ?? PRIORITY_META.normal).order;
                return pA - pB;
              });

            const doneInCat = catTasks.filter((t) => t.completed).length;
            const pctInCat =
              catTasks.length > 0 ? Math.round((doneInCat / catTasks.length) * 100) : 0;
            const isCollapsed = Boolean(collapsedCats[cat]);

            return (
              <section key={cat} className="aurora-glass rounded-2xl overflow-hidden">
                {/* Accordion Header */}
                <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-[#131823]/70 border-b border-white/10">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(cat)}
                    className="flex items-center gap-3 text-left min-w-0 flex-1"
                  >
                    <span className="text-slate-400">
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${meta.badgeClass}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-100">{meta.label}</h3>
                        {cat === 'shared_equipment' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-400/30">
                            Wer bringt es mit?
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{meta.subtitle}</p>
                    </div>
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono tabular-nums text-slate-300">
                        {doneInCat}/{catTasks.length}
                      </span>
                      <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 transition-all duration-300"
                          style={{ width: `${pctInCat}%` }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openCreateForm(cat)}
                      className="p-1.5 rounded-lg text-cyan-300 hover:bg-cyan-500/15 transition-colors"
                      title={`Aufgabe zu „${meta.label}“ hinzufügen`}
                      aria-label={`Aufgabe zu ${meta.label} hinzufügen`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tasks list */}
                {!isCollapsed && (
                  <div className="divide-y divide-white/5">
                    {catTasks.map((task) => {
                      const prio = PRIORITY_META[task.priority] ?? PRIORITY_META.normal;
                      const assignee = task.assignedTo
                        ? travelerById.get(task.assignedTo)
                        : undefined;
                      const userVoted = task.votes.includes(currentUser.id);
                      const isHighlighted = highlightedId === task.id;

                      return (
                        <div
                          key={task.id}
                          data-search-id={`task-${task.id}`}
                          className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                            task.completed ? 'bg-white/[0.015] opacity-75' : 'hover:bg-white/[0.03]'
                          } ${
                            isHighlighted
                              ? 'ring-2 ring-inset ring-cyan-400 bg-cyan-500/10'
                              : ''
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => toggleTaskCompleted(task.id)}
                              className={`mt-0.5 shrink-0 transition-colors ${
                                task.completed
                                  ? 'text-emerald-400 hover:text-emerald-300'
                                  : 'text-slate-400 hover:text-cyan-300'
                              }`}
                              aria-label={
                                task.completed ? 'Als offen markieren' : 'Als erledigt markieren'
                              }
                            >
                              {task.completed ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`text-sm font-semibold break-words ${
                                    task.completed
                                      ? 'line-through text-slate-400'
                                      : 'text-slate-100'
                                  }`}
                                >
                                  {task.title}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${prio.badgeClass}`}
                                >
                                  {prio.label}
                                </span>
                              </div>
                              {task.description && (
                                <p className="text-xs text-slate-400 mt-0.5 break-words">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 pl-8 sm:pl-0">
                            {/* Quick inline assignee selector */}
                            <div className="flex items-center gap-1.5">
                              {assignee && (
                                <span
                                  className="w-5 h-5 rounded-full text-[9px] font-bold text-slate-950 flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: assignee.color }}
                                >
                                  {getSafeInitials(assignee.initials || assignee.name)}
                                </span>
                              )}
                              <select
                                value={task.assignedTo || ''}
                                onChange={(e) =>
                                  updateTask(task.id, {
                                    assignedTo: e.target.value || undefined,
                                  })
                                }
                                aria-label={`Zuständige Person für ${task.title}`}
                                className="aurora-input px-2 py-1 rounded-lg text-xs [color-scheme:dark]"
                              >
                                <option value="" className="bg-[#131823] text-slate-100">
                                  Offen
                                </option>
                                {trip.travelers.map((tr) => (
                                  <option
                                    key={tr.id}
                                    value={tr.id}
                                    className="bg-[#131823] text-slate-100"
                                  >
                                    {tr.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleTaskVote(task.id)}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono tabular-nums border transition-colors ${
                                userVoted
                                  ? 'bg-cyan-500/15 text-cyan-200 border-cyan-400/40'
                                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200'
                              }`}
                              title="Wichtigkeit hochvoten"
                            >
                              <ThumbsUp className="w-3 h-3" />
                              {task.votes.length}
                            </button>

                            <button
                              type="button"
                              onClick={() => startEdit(task)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition-colors"
                              title="Aufgabe bearbeiten"
                              aria-label={`Aufgabe „${task.title}“ bearbeiten`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteTask(task.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Aufgabe löschen"
                              aria-label={`Aufgabe „${task.title}“ löschen`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// BUDGET VIEW (REISEKASSE 2.0)
// ============================================================================

const CURRENCY_OPTIONS: { code: CurrencyCode; label: string }[] = [
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'CHF', label: 'CHF (Fr.)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'USD', label: 'USD ($)' },
];

const EXPENSE_CATEGORY_META: Record<
  ExpenseCategory,
  { label: string; colorClass: string; barColor: string }
> = {
  accommodation: {
    label: 'Unterkunft',
    colorClass: 'bg-violet-500/15 text-violet-300 border-violet-400/30',
    barColor: '#A78BFA',
  },
  transport: {
    label: 'Transport & Mietwagen',
    colorClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
    barColor: '#22D3EE',
  },
  food: {
    label: 'Essen & Getränke',
    colorClass: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    barColor: '#FBBF24',
  },
  activity: {
    label: 'Aktivitäten & Tickets',
    colorClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    barColor: '#34D399',
  },
  shopping: {
    label: 'Einkauf & Supermarkt',
    colorClass: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
    barColor: '#38BDF8',
  },
  other: {
    label: 'Sonstiges',
    colorClass: 'bg-slate-500/15 text-slate-300 border-slate-400/25',
    barColor: '#94A3B8',
  },
};

const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  activity: 'Aktivitäten & Touren',
  beach: 'Strand & Natur',
  culture: 'Kultur & Sightseeing',
  transport: 'Transport & Anreise',
  nightlife: 'Nightlife & Bars',
  other: 'Sonstiges / Extras',
};

export const BudgetView: React.FC = () => {
  const {
    trip,
    currentUser,
    searchTarget,
    setSearchTarget,
    updateTripMeta,
    addExpense,
    updateExpense,
    deleteExpense,
    toggleSettlementPaid,
    showToast,
  } = useVacation();

  const currency: CurrencyCode = trip.currency || 'EUR';

  // Planning budget mode toggle: Confirmed/Planned vs Incl. Ideas & Meal Alternatives
  const [includeIdeas, setIncludeIdeas] = useState<boolean>(false);

  // Inline budget target editor
  const [editingTarget, setEditingTarget] = useState<boolean>(false);
  const [targetInput, setTargetInput] = useState<string>(
    String(trip.budgetTargetPerPerson ?? 0)
  );

  // Expense form state
  const [showExpenseForm, setShowExpenseForm] = useState<boolean>(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expTitle, setExpTitle] = useState<string>('');
  const [expAmount, setExpAmount] = useState<string>('');
  const [expPaidBy, setExpPaidBy] = useState<string>(
    currentUser?.id || trip.travelers[0]?.id || ''
  );
  const [expSplitBetween, setExpSplitBetween] = useState<string[]>(() =>
    trip.travelers.map((t) => t.id)
  );
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('food');
  const [expDayNumber, setExpDayNumber] = useState<string>('');
  const [expError, setExpError] = useState<string | null>(null);
  const [expCategoryFilter, setExpCategoryFilter] = useState<ExpenseCategory | 'all'>('all');

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const expenseFormRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    setTargetInput(String(trip.budgetTargetPerPerson ?? 0));
  }, [trip.budgetTargetPerPerson]);

  // Spotlight search integration for expenses
  useEffect(() => {
    if (!searchTarget || searchTarget.kind !== 'expense') return;
    setExpCategoryFilter('all');
    setHighlightedId(searchTarget.id);
    setSearchTarget(null);
  }, [searchTarget, setSearchTarget]);

  useEffect(() => {
    if (!highlightedId) return;
    const scrollTimer = window.setTimeout(() => {
      const el = document.querySelector(`[data-search-id="expense-${highlightedId}"]`);
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 90);
    const clearTimer = window.setTimeout(() => setHighlightedId(null), 3600);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [highlightedId]);

  useEffect(() => {
    if (!showExpenseForm) return;
    const timer = window.setTimeout(() => {
      expenseFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [showExpenseForm, editingExpenseId]);

  const travelerById = useMemo(
    () => new Map<string, Traveler>(trip.travelers.map((t) => [t.id, t])),
    [trip.travelers]
  );

  // --------------------------------------------------------------------------
  // Planned Budget Calculations (slot-based for meals when !includeIdeas)
  // --------------------------------------------------------------------------
  const planningStats = useMemo(() => {
    const activeActivities = includeIdeas
      ? trip.activities
      : trip.activities.filter((a) => a.status !== 'idea');

    let selectedMeals = trip.meals;
    let multiOptionSlotCount = 0;

    // Group meal options by (dayNumber, mealType)
    const slotGroups = new Map<string, typeof trip.meals>();
    for (const m of trip.meals) {
      const key = `${m.dayNumber}::${m.mealType}`;
      const list = slotGroups.get(key) || [];
      list.push(m);
      slotGroups.set(key, list);
    }

    if (!includeIdeas) {
      const winners: typeof trip.meals = [];
      for (const [, list] of slotGroups.entries()) {
        if (list.length > 1) multiOptionSlotCount += 1;
        const sorted = [...list].sort((a, b) => {
          const voteDiff = b.votes.length - a.votes.length;
          if (voteDiff !== 0) return voteDiff;
          return compareTimeSlots(a.time, b.time);
        });
        if (sorted[0]) winners.push(sorted[0]);
      }
      selectedMeals = winners;
    } else {
      for (const [, list] of slotGroups.entries()) {
        if (list.length > 1) multiOptionSlotCount += 1;
      }
    }

    const activityTotal = roundCents(
      activeActivities.reduce((sum, a) => sum + (clampCost(a.estimatedCost) || 0), 0)
    );
    const mealTotal = roundCents(
      selectedMeals.reduce((sum, m) => sum + (clampCost(m.estimatedCostPerPerson) || 0), 0)
    );
    const plannedPerPerson = roundCents(activityTotal + mealTotal);
    const travelerCount = Math.max(1, trip.travelers.length);
    const plannedTotal = roundCents(plannedPerPerson * travelerCount);

    // Category breakdown
    const catTotals = new Map<string, { label: string; amount: number; color: string }>();
    const activityColors: Record<ActivityCategory, string> = {
      activity: '#34D399',
      beach: '#22D3EE',
      culture: '#A78BFA',
      transport: '#38BDF8',
      nightlife: '#F472B6',
      other: '#94A3B8',
    };

    for (const a of activeActivities) {
      const c = clampCost(a.estimatedCost) || 0;
      if (c <= 0) continue;
      const catKey = `act:${a.category}`;
      const prev = catTotals.get(catKey) || {
        label: ACTIVITY_CATEGORY_LABELS[a.category] || 'Aktivitäten',
        amount: 0,
        color: activityColors[a.category] || '#94A3B8',
      };
      catTotals.set(catKey, { ...prev, amount: roundCents(prev.amount + c) });
    }
    if (mealTotal > 0) {
      catTotals.set('meals', {
        label: 'Essen & Verpflegung',
        amount: mealTotal,
        color: '#FBBF24',
      });
    }

    // Per-day breakdown (including out-of-range dayNumbers so total matches)
    const dayMap = new Map<number, { activities: number; meals: number }>();
    for (let d = 1; d <= trip.totalDays; d++) {
      dayMap.set(d, { activities: 0, meals: 0 });
    }
    let outOfRangeTotal = 0;

    for (const a of activeActivities) {
      const c = clampCost(a.estimatedCost) || 0;
      if (a.dayNumber >= 1 && a.dayNumber <= trip.totalDays) {
        const cur = dayMap.get(a.dayNumber) || { activities: 0, meals: 0 };
        dayMap.set(a.dayNumber, {
          ...cur,
          activities: roundCents(cur.activities + c),
        });
      } else {
        outOfRangeTotal = roundCents(outOfRangeTotal + c);
      }
    }
    for (const m of selectedMeals) {
      const c = clampCost(m.estimatedCostPerPerson) || 0;
      if (m.dayNumber >= 1 && m.dayNumber <= trip.totalDays) {
        const cur = dayMap.get(m.dayNumber) || { activities: 0, meals: 0 };
        dayMap.set(m.dayNumber, {
          ...cur,
          meals: roundCents(cur.meals + c),
        });
      } else {
        outOfRangeTotal = roundCents(outOfRangeTotal + c);
      }
    }

    const daysBreakdown = Array.from(dayMap.entries()).map(([day, vals]) => ({
      day,
      activities: vals.activities,
      meals: vals.meals,
      total: roundCents(vals.activities + vals.meals),
    }));

    return {
      activityTotal,
      mealTotal,
      plannedTotal,
      plannedPerPerson,
      multiOptionSlotCount,
      categories: Array.from(catTotals.values()).sort((a, b) => b.amount - a.amount),
      daysBreakdown,
      outOfRangeTotal,
      ideaCountIncluded: includeIdeas
        ? trip.activities.filter((a) => a.status === 'idea').length
        : 0,
    };
  }, [includeIdeas, trip.activities, trip.meals, trip.totalDays, trip.travelers.length]);

  // --------------------------------------------------------------------------
  // Actual Expenses & Settlements Calculations
  // --------------------------------------------------------------------------
  const expenses = useMemo(() => trip.expenses || [], [trip.expenses]);

  const settlements = useMemo(
    () => calculateSettlements(expenses, trip.travelers),
    [expenses, trip.travelers]
  );

  const expenseStats = useMemo(() => {
    const totalActual = roundCents(
      expenses.reduce((sum, e) => sum + (clampCost(e.amount) || 0), 0)
    );
    const travelerCount = Math.max(1, trip.travelers.length);
    const actualPerPerson = roundCents(totalActual / travelerCount);

    const paidByMap = new Map<string, number>();
    const shareByMap = new Map<string, number>();
    for (const tr of trip.travelers) {
      paidByMap.set(tr.id, 0);
      shareByMap.set(tr.id, 0);
    }

    for (const exp of expenses) {
      const amt = clampCost(exp.amount) || 0;
      if (amt <= 0) continue;
      paidByMap.set(exp.paidBy, roundCents((paidByMap.get(exp.paidBy) || 0) + amt));

      const splitIds =
        exp.splitBetween.length > 0
          ? exp.splitBetween
          : trip.travelers.map((t) => t.id);
      if (splitIds.length > 0) {
        const share = amt / splitIds.length;
        for (const pid of splitIds) {
          shareByMap.set(pid, (shareByMap.get(pid) || 0) + share);
        }
      }
    }

    const balances = trip.travelers.map((tr) => {
      const paid = roundCents(paidByMap.get(tr.id) || 0);
      const share = roundCents(shareByMap.get(tr.id) || 0);
      return {
        traveler: tr,
        paid,
        share,
        net: roundCents(paid - share),
      };
    });

    const settledCount = settlements.filter((s) =>
      Boolean(trip.settledPairs?.includes(`${s.fromId}->${s.toId}`))
    ).length;

    return {
      totalActual,
      actualPerPerson,
      balances,
      settledCount,
    };
  }, [expenses, settlements, trip.settledPairs, trip.travelers]);

  const filteredExpenses = useMemo(() => {
    const list =
      expCategoryFilter === 'all'
        ? expenses
        : expenses.filter((e) => e.category === expCategoryFilter);
    return [...list].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [expCategoryFilter, expenses]);

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------
  const saveBudgetTarget = () => {
    const cleaned = clampCost(targetInput);
    const nextValue = cleaned === undefined ? 0 : roundCents(cleaned);
    updateTripMeta({ budgetTargetPerPerson: nextValue });
    setEditingTarget(false);
    showToast(
      `Zielbudget auf ${formatCurrency(nextValue, currency)} / Person aktualisiert.`,
      'success'
    );
  };

  const resetExpenseForm = () => {
    setShowExpenseForm(false);
    setEditingExpenseId(null);
    setExpTitle('');
    setExpAmount('');
    setExpPaidBy(currentUser?.id || trip.travelers[0]?.id || '');
    setExpSplitBetween(trip.travelers.map((t) => t.id));
    setExpCategory('food');
    setExpDayNumber('');
    setExpError(null);
  };

  const openCreateExpense = () => {
    setEditingExpenseId(null);
    setExpTitle('');
    setExpAmount('');
    setExpPaidBy(currentUser?.id || trip.travelers[0]?.id || '');
    setExpSplitBetween(trip.travelers.map((t) => t.id));
    setExpCategory('food');
    setExpDayNumber('');
    setExpError(null);
    setShowExpenseForm(true);
  };

  const startEditExpense = (item: ExpenseItem) => {
    setEditingExpenseId(item.id);
    setExpTitle(item.title);
    setExpAmount(String(item.amount));
    setExpPaidBy(item.paidBy);
    setExpSplitBetween(item.splitBetween);
    setExpCategory(item.category);
    setExpDayNumber(item.dayNumber ? String(item.dayNumber) : '');
    setExpError(null);
    setShowExpenseForm(true);
  };

  const toggleSplitMember = (travelerId: string) => {
    setExpSplitBetween((prev) =>
      prev.includes(travelerId)
        ? prev.filter((id) => id !== travelerId)
        : [...prev, travelerId]
    );
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = expTitle.trim();
    if (!trimmedTitle) {
      setExpError('Bitte einen Titel für die Ausgabe eingeben.');
      return;
    }

    const parsedAmount = clampCost(expAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      setExpError('Bitte einen Betrag größer als 0 eingeben.');
      return;
    }

    if (!expPaidBy) {
      setExpError('Bitte auswählen, wer bezahlt hat.');
      return;
    }

    if (expSplitBetween.length === 0) {
      setExpError('Bitte mindestens eine Person für die Aufteilung wählen.');
      return;
    }

    const parsedDay = expDayNumber ? parseInt(expDayNumber, 10) : undefined;
    const validDay = parsedDay && !Number.isNaN(parsedDay) ? parsedDay : undefined;

    const payload = {
      title: trimmedTitle,
      amount: roundCents(parsedAmount),
      paidBy: expPaidBy,
      splitBetween: expSplitBetween,
      category: expCategory,
      dayNumber: validDay,
    };

    if (editingExpenseId) {
      updateExpense(editingExpenseId, payload);
      showToast(`Ausgabe „${trimmedTitle}“ aktualisiert.`, 'success');
    } else {
      addExpense(payload);
    }
    resetExpenseForm();
  };

  const targetPerPerson = trip.budgetTargetPerPerson ?? 0;
  const targetGroupTotal = roundCents(targetPerPerson * Math.max(1, trip.travelers.length));
  const targetDiffPerPerson = roundCents(targetPerPerson - planningStats.plannedPerPerson);
  const targetUsedPct =
    targetPerPerson > 0
      ? Math.min(100, Math.round((planningStats.plannedPerPerson / targetPerPerson) * 100))
      : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="aurora-glass-elevated rounded-2xl p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Reisekasse 2.0 & Budget</h2>
            <p className="text-xs text-slate-400">
              Geplantes Budget (pro Essens-Slot nur führende Option) · Tatsächliche Ausgaben &
              Schuldenausgleich
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Planned vs Incl. Ideas Toggle */}
          <div className="inline-flex rounded-xl p-1 bg-[#131823] border border-white/10">
            <button
              type="button"
              onClick={() => setIncludeIdeas(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !includeIdeas
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/35'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bestätigt & Geplant
            </button>
            <button
              type="button"
              onClick={() => setIncludeIdeas(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                includeIdeas
                  ? 'bg-violet-500/20 text-violet-200 border border-violet-400/35'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Inkl. Ideen & Alternativen
            </button>
          </div>

          {/* Currency Switcher */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#131823] border border-white/10">
            <span className="text-[11px] text-slate-400">Währung:</span>
            <select
              value={currency}
              onChange={(e) => updateTripMeta({ currency: e.target.value as CurrencyCode })}
              aria-label="Reisewährung ändern"
              className="bg-transparent text-xs font-mono font-semibold text-cyan-300 focus:outline-none [color-scheme:dark]"
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option
                  key={opt.code}
                  value={opt.code}
                  className="bg-[#131823] text-slate-100"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Info banner when competing meal options or ideas are active */}
      {!includeIdeas && planningStats.multiOptionSlotCount > 0 && (
        <div className="aurora-glass rounded-xl px-4 py-2.5 flex items-center justify-between gap-2 text-xs text-slate-300 border border-amber-400/25">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              In{' '}
              <strong className="font-mono tabular-nums text-amber-300">
                {planningStats.multiOptionSlotCount}
              </strong>{' '}
              Essens-Slot{planningStats.multiOptionSlotCount === 1 ? '' : 's'} gibt es mehrere
              Alternativen — im geplanten Budget zählt jeweils nur die führende Option.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIncludeIdeas(true)}
            className="text-cyan-300 hover:text-cyan-200 font-semibold whitespace-nowrap"
          >
            Alle Alternativen einbeziehen
          </button>
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Planned Per Person */}
        <div className="aurora-glass rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{includeIdeas ? 'Max. Plan / Person' : 'Geplant pro Person'}</span>
            <Compass className="w-4 h-4 text-cyan-300" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-300">
            {formatCurrency(planningStats.plannedPerPerson, currency)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>
              Aktivitäten:{' '}
              <span className="font-mono tabular-nums text-slate-200">
                {formatCurrency(planningStats.activityTotal, currency)}
              </span>
            </span>
            <span>
              Essen:{' '}
              <span className="font-mono tabular-nums text-slate-200">
                {formatCurrency(planningStats.mealTotal, currency)}
              </span>
            </span>
          </div>
        </div>

        {/* Card 2: Planned Group Total */}
        <div className="aurora-glass rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Gruppen-Planbudget ({trip.travelers.length} Pers.)</span>
            <Users className="w-4 h-4 text-cyan-300" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-100">
            {formatCurrency(planningStats.plannedTotal, currency)}
          </div>
          <div className="text-xs text-slate-400">
            {includeIdeas
              ? `Inkl. ${planningStats.ideaCountIncluded} Pool-Idee${
                  planningStats.ideaCountIncluded === 1 ? '' : 'n'
                } & Alternativen`
              : 'Ohne unverplante Ideen'}
          </div>
        </div>

        {/* Card 3: Inline editable target per person */}
        <div className="aurora-glass rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Zielbudget / Person</span>
            <PiggyBank className="w-4 h-4 text-violet-300" />
          </div>

          {editingTarget ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                step="0.01"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveBudgetTarget();
                  if (e.key === 'Escape') {
                    setTargetInput(String(trip.budgetTargetPerPerson ?? 0));
                    setEditingTarget(false);
                  }
                }}
                aria-label="Zielbudget pro Person bearbeiten"
                className="aurora-input w-full px-2.5 py-1.5 rounded-lg text-sm font-mono tabular-nums"
                autoFocus
              />
              <button
                type="button"
                onClick={saveBudgetTarget}
                className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                aria-label="Zielbudget speichern"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetInput(String(trip.budgetTargetPerPerson ?? 0));
                  setEditingTarget(false);
                }}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-slate-200"
                aria-label="Abbrechen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-100">
                {formatCurrency(targetPerPerson, currency)}
              </div>
              <button
                type="button"
                onClick={() => setEditingTarget(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 transition-colors"
              >
                <Edit3 className="w-3 h-3" /> Ändern
              </button>
            </div>
          )}

          {targetPerPerson > 0 ? (
            <div className="space-y-1">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    targetDiffPerPerson >= 0 ? 'bg-violet-400' : 'bg-rose-400'
                  }`}
                  style={{ width: `${targetUsedPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                <span className="text-slate-400">
                  Gruppe: {formatCurrency(targetGroupTotal, currency)}
                </span>
                <span
                  className={
                    targetDiffPerPerson >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  }
                >
                  {targetDiffPerPerson >= 0
                    ? `${formatCurrency(targetDiffPerPerson, currency)} Puffer`
                    : `${formatCurrency(Math.abs(targetDiffPerPerson), currency)} drüber`}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">Kein Limit pro Person gesetzt.</p>
          )}
        </div>

        {/* Card 4: Actual Expenses Total */}
        <div className="aurora-glass rounded-2xl p-4 space-y-2 border border-amber-400/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tatsächliche Ausgaben (Ist)</span>
            <Receipt className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-300">
            {formatCurrency(expenseStats.totalActual, currency)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between font-mono tabular-nums">
            <span>
              Ø {formatCurrency(expenseStats.actualPerPerson, currency)} / Pers.
            </span>
            <span>{expenses.length} Belege</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* REISEKASSE 2.0: TATSÄCHLICHE AUSGABEN & WER SCHULDET WEM WAS         */}
      {/* ==================================================================== */}
      <section className="aurora-glass-elevated rounded-2xl p-5 space-y-5 border border-cyan-400/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Tatsächliche Ausgaben & Wer schuldet wem was
              </h3>
              <p className="text-xs text-slate-400">
                Gemeinsame Belege erfassen, beliebig auf Mitreisende aufteilen & minimalen
                Ausgleich berechnen
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              showExpenseForm && !editingExpenseId ? resetExpenseForm() : openCreateExpense()
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.28)] transition-all self-start sm:self-auto"
          >
            {showExpenseForm && !editingExpenseId ? (
              <X className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {showExpenseForm && !editingExpenseId ? 'Schließen' : 'Ausgabe hinzufügen'}
          </button>
        </div>

        {/* Add / Edit Expense Form */}
        {showExpenseForm && (
          <form
            ref={expenseFormRef}
            onSubmit={handleExpenseSubmit}
            className="rounded-2xl p-4 bg-[#131823]/90 border border-cyan-400/35 space-y-4 animate-in"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-100">
                {editingExpenseId ? 'Ausgabe bearbeiten' : 'Neue gemeinsame Ausgabe verbuchen'}
              </h4>
              <button
                type="button"
                onClick={resetExpenseForm}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10"
                aria-label="Ausgaben-Formular schließen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {expError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-200 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{expError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Beschreibung / Beleg *
                </label>
                <input
                  type="text"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="z.B. Mietwagen-Anzahlung oder Einkauf Mercadona"
                  className="aurora-input w-full px-3 py-2 rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Betrag ({currency}) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="0.00"
                  className="aurora-input w-full px-3 py-2 rounded-xl text-sm font-mono tabular-nums"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Bezahlt von *
                </label>
                <select
                  value={expPaidBy}
                  onChange={(e) => setExpPaidBy(e.target.value)}
                  className="aurora-input w-full px-2.5 py-2 rounded-xl text-sm [color-scheme:dark]"
                >
                  {trip.travelers.map((tr) => (
                    <option key={tr.id} value={tr.id} className="bg-[#131823] text-slate-100">
                      {tr.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Kategorie
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                    className="aurora-input w-full px-2 py-2 rounded-xl text-xs [color-scheme:dark]"
                  >
                    {(Object.keys(EXPENSE_CATEGORY_META) as ExpenseCategory[]).map((cat) => (
                      <option key={cat} value={cat} className="bg-[#131823] text-slate-100">
                        {EXPENSE_CATEGORY_META[cat].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tag (opt.)
                  </label>
                  <select
                    value={expDayNumber}
                    onChange={(e) => setExpDayNumber(e.target.value)}
                    className="aurora-input w-full px-2 py-2 rounded-xl text-xs [color-scheme:dark]"
                  >
                    <option value="" className="bg-[#131823] text-slate-100">
                      Allgemein
                    </option>
                    {Array.from({ length: trip.totalDays }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)} className="bg-[#131823] text-slate-100">
                        Tag {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Split between selection */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-medium text-slate-300">
                  Aufgeteilt auf ({expSplitBetween.length} von {trip.travelers.length} Personen)
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setExpSplitBetween(trip.travelers.map((t) => t.id))}
                    className="text-cyan-300 hover:text-cyan-200 font-semibold"
                  >
                    Alle wählen
                  </button>
                  <span className="text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={() =>
                      setExpSplitBetween(
                        trip.travelers.filter((t) => t.id !== expPaidBy).map((t) => t.id)
                      )
                    }
                    className="text-slate-300 hover:text-slate-100"
                  >
                    Ohne Zahler
                  </button>
                  <span className="text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={() => setExpSplitBetween([])}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    Keine
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {trip.travelers.map((tr) => {
                  const selected = expSplitBetween.includes(tr.id);
                  return (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => toggleSplitMember(tr.id)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        selected
                          ? 'bg-cyan-500/20 text-cyan-100 border-cyan-400/50'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full text-[9px] font-bold text-slate-950 flex items-center justify-center"
                        style={{ backgroundColor: tr.color }}
                      >
                        {getSafeInitials(tr.initials || tr.name)}
                      </span>
                      <span>{tr.name}</span>
                      {selected && <Check className="w-3.5 h-3.5 text-cyan-300" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={resetExpenseForm}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-colors"
              >
                <Check className="w-4 h-4" />
                {editingExpenseId ? 'Ausgabe aktualisieren' : 'Ausgabe speichern'}
              </button>
            </div>
          </form>
        )}

        {/* Settlements + Balances Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Who owes whom */}
          <div className="rounded-2xl p-4 bg-[#131823]/75 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-300" />
                <h4 className="text-sm font-bold text-slate-100">Ausgleichszahlungen</h4>
              </div>
              {settlements.length > 0 && (
                <span className="text-[11px] font-mono tabular-nums text-slate-400">
                  {expenseStats.settledCount}/{settlements.length} beglichen
                </span>
              )}
            </div>

            {settlements.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Alles ausgeglichen — aktuell schuldet niemand jemandem etwas.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {settlements.map((s) => {
                  const from = travelerById.get(s.fromId);
                  const to = travelerById.get(s.toId);
                  const pairKey = `${s.fromId}->${s.toId}`;
                  const isSettled = Boolean(trip.settledPairs?.includes(pairKey));

                  return (
                    <div
                      key={pairKey}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        isSettled
                          ? 'bg-emerald-500/10 border-emerald-400/30 opacity-85'
                          : 'bg-[#0B0E14]/70 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-100">
                          {from && (
                            <span
                              className="w-5 h-5 rounded-full text-[9px] font-bold text-slate-950 flex items-center justify-center"
                              style={{ backgroundColor: from.color }}
                            >
                              {getSafeInitials(from.initials || from.name)}
                            </span>
                          )}
                          <span>{from?.name || 'Unbekannt'}</span>
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-100">
                          {to && (
                            <span
                              className="w-5 h-5 rounded-full text-[9px] font-bold text-slate-950 flex items-center justify-center"
                              style={{ backgroundColor: to.color }}
                            >
                              {getSafeInitials(to.initials || to.name)}
                            </span>
                          )}
                          <span>{to?.name || 'Unbekannt'}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2.5">
                        <span
                          className={`text-sm font-mono tabular-nums font-bold ${
                            isSettled ? 'line-through text-emerald-300' : 'text-amber-300'
                          }`}
                        >
                          {formatCurrency(s.amount, currency)}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleSettlementPaid(s.fromId, s.toId)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            isSettled
                              ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40 hover:bg-emerald-500/30'
                              : 'bg-white/5 hover:bg-emerald-500/15 text-slate-200 hover:text-emerald-200 border-white/15'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          {isSettled ? 'Beglichen' : 'Als beglichen markieren'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Per-Traveler Balance Sheet */}
          <div className="rounded-2xl p-4 bg-[#131823]/75 border border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-cyan-300" />
              <h4 className="text-sm font-bold text-slate-100">Saldo pro Mitreisendem</h4>
            </div>

            <div className="space-y-2">
              {expenseStats.balances.map(({ traveler, paid, share, net }) => (
                <div
                  key={traveler.id}
                  className="p-2.5 rounded-xl bg-[#0B0E14]/60 border border-white/10 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-7 h-7 rounded-full text-[10px] font-bold text-slate-950 flex items-center justify-center shrink-0"
                      style={{ backgroundColor: traveler.color }}
                    >
                      {getSafeInitials(traveler.initials || traveler.name)}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-100 truncate">
                        {traveler.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                        Gezahlt: {formatCurrency(paid, currency)} · Anteil:{' '}
                        {formatCurrency(share, currency)}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-mono tabular-nums font-bold px-2.5 py-1 rounded-lg border shrink-0 ${
                      net > 0.005
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                        : net < -0.005
                        ? 'bg-rose-500/15 text-rose-300 border-rose-400/30'
                        : 'bg-slate-500/15 text-slate-300 border-slate-400/20'
                    }`}
                  >
                    {net > 0.005 ? '+' : ''}
                    {formatCurrency(net, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recorded Expenses List */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-slate-100">
              Erfasste Belege & Ausgaben ({filteredExpenses.length})
            </h4>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setExpCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  expCategoryFilter === 'all'
                    ? 'bg-white/15 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                Alle
              </button>
              {(Object.keys(EXPENSE_CATEGORY_META) as ExpenseCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setExpCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    expCategoryFilter === cat
                      ? 'bg-white/15 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {EXPENSE_CATEGORY_META[cat].label}
                </button>
              ))}
            </div>
          </div>

          {expenses.length === 0 ? (
            <div className="rounded-2xl p-8 bg-[#131823]/60 border border-white/10 text-center space-y-2.5">
              <p className="text-sm font-semibold text-slate-200">
                Noch keine tatsächlichen Ausgaben verbucht
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Erfasse bezahlte Buchungen, Tankfüllungen oder Supermarkt-Einkäufe, um automatisch
                zu sehen, wer wem wie viel schuldet.
              </p>
              <button
                type="button"
                onClick={openCreateExpense}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Erste Ausgabe hinzufügen
              </button>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="rounded-2xl p-6 bg-[#131823]/60 border border-white/10 text-center text-xs text-slate-400">
              Keine Ausgaben in dieser Kategorie.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExpenses.map((exp) => {
                const payer = travelerById.get(exp.paidBy);
                const catMeta =
                  EXPENSE_CATEGORY_META[exp.category] ?? EXPENSE_CATEGORY_META.other;
                const splitCount = Math.max(1, exp.splitBetween.length);
                const perHead = roundCents(exp.amount / splitCount);
                const isHighlighted = highlightedId === exp.id;

                return (
                  <div
                    key={exp.id}
                    data-search-id={`expense-${exp.id}`}
                    className={`rounded-xl p-3.5 bg-[#131823]/80 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      isHighlighted
                        ? 'border-cyan-400 ring-2 ring-cyan-400/50 bg-cyan-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-100">{exp.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catMeta.colorClass}`}
                        >
                          {catMeta.label}
                        </span>
                        {exp.dayNumber && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums bg-white/5 text-slate-300 border border-white/10">
                            Tag {exp.dayNumber}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>
                          Bezahlt von{' '}
                          <strong className="text-slate-200">
                            {payer?.name || 'Unbekannt'}
                          </strong>
                        </span>
                        <span>·</span>
                        <span>
                          Aufgeteilt auf{' '}
                          <span className="font-mono tabular-nums text-slate-300">
                            {exp.splitBetween.length === trip.travelers.length
                              ? `alle (${exp.splitBetween.length})`
                              : exp.splitBetween
                                  .map((id) => travelerById.get(id)?.name || 'Unbekannt')
                                  .join(', ')}
                          </span>
                        </span>
                        <span>·</span>
                        <span className="font-mono tabular-nums text-slate-300">
                          {formatCurrency(perHead, currency)} / Person
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span className="text-base font-bold font-mono tabular-nums text-amber-300">
                        {formatCurrency(exp.amount, currency)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEditExpense(exp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition-colors"
                          title="Ausgabe bearbeiten"
                          aria-label={`Ausgabe „${exp.title}“ bearbeiten`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteExpense(exp.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Ausgabe löschen"
                          aria-label={`Ausgabe „${exp.title}“ löschen`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* PLANNED BUDGET BREAKDOWN (CATEGORIES + PER DAY)                      */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Breakdown */}
        <section className="aurora-glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-300" />
              <h3 className="text-sm font-bold text-slate-100">Plan-Kosten p.P. nach Kategorie</h3>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {formatCurrency(planningStats.plannedPerPerson, currency)} / Pers.
            </span>
          </div>

          {planningStats.categories.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Keine geschätzten Kosten bei geplanten Aktivitäten oder Mahlzeiten hinterlegt.
            </p>
          ) : (
            <div className="space-y-3">
              {planningStats.categories.map((cat) => {
                const pct =
                  planningStats.plannedPerPerson > 0
                    ? Math.round((cat.amount / planningStats.plannedPerPerson) * 100)
                    : 0;
                return (
                  <div key={cat.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-200 font-medium">{cat.label}</span>
                      <span className="font-mono tabular-nums text-slate-300">
                        {formatCurrency(cat.amount, currency)}{' '}
                        <span className="text-slate-500">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Per-Day Cost Overview */}
        <section className="aurora-glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100">Plan-Kosten p.P. pro Reisetag</h3>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {trip.totalDays} Tage
            </span>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {planningStats.daysBreakdown.map((d) => {
              const dateLabel = formatTripDayDate(trip.startDate, d.day, {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
              });
              return (
                <div
                  key={d.day}
                  className="p-2.5 rounded-xl bg-[#131823]/75 border border-white/10 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-mono tabular-nums font-bold text-cyan-300">
                      Tag {d.day}
                    </span>
                    <span className="text-slate-400 ml-2">{dateLabel}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono tabular-nums">
                    <span className="text-slate-400">
                      Akt: {formatCurrency(d.activities, currency)}
                    </span>
                    <span className="text-slate-400">
                      Essen: {formatCurrency(d.meals, currency)}
                    </span>
                    <span className="font-bold text-slate-100 min-w-[4.5rem] text-right">
                      {formatCurrency(d.total, currency)}
                    </span>
                  </div>
                </div>
              );
            })}

            {planningStats.outOfRangeTotal > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/25 flex items-center justify-between text-xs">
                <span className="text-amber-300 font-semibold">
                  Außerhalb Reisedauer (Tag &gt; {trip.totalDays})
                </span>
                <span className="font-mono tabular-nums font-bold text-amber-300">
                  {formatCurrency(planningStats.outOfRangeTotal, currency)}
                </span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
