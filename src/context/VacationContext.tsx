import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  ActivityLogEntry,
  BrainstormIdea,
  CurrencyCode,
  DayActivity,
  ExpenseItem,
  MapFocusTarget,
  MealPlan,
  NavigationTab,
  Poll,
  PollOption,
  SearchTarget,
  ToastItem,
  ToastType,
  TodoTask,
  Traveler,
  Trip,
  TripInfo,
} from '../types/vacation';
import { DEMO_TRIP, createDemoTripClone } from '../data/demoTrip';
import { LONDON_TRIP, createLondonTripClone } from '../data/londonTrip';
import {
  DEFAULT_ACCESS_HASH,
  clampCost,
  computeAccessHash,
  formatCurrency,
  getSafeInitials,
  normalizeTimeSlot,
  roundCents,
} from '../utils/vacationHelpers';

const STORAGE_KEY_TRIPS = 'vacayly_saved_trips_v1';
const STORAGE_KEY_ACTIVE_ID = 'vacayly_active_trip_id_v1';
const STORAGE_KEY_USER_ID = 'vacayly_current_user_id_v1';
const STORAGE_KEY_LONDON_DEFAULT = 'vacayly_london_default_v1';
const STORAGE_KEY_ACCESS_HASH = 'vacation_organizer_access_hash_v2';
const STORAGE_KEY_SESSION_TOKEN = 'vacation_organizer_session_token_v2';
const STORAGE_KEY_UNLOCKED = 'vacation_organizer_unlocked_v2';
const LEGACY_STORAGE_KEY_ACCESS_KEY = 'vacation_organizer_access_key_v1';
const LEGACY_STORAGE_KEY_UNLOCKED = 'vacation_organizer_unlocked_v1';
const STORAGE_KEY_WELCOME_DONE = 'vacation_organizer_welcome_done_v1';

const CURRENT_SCHEMA_VERSION = 2;
const MAX_ACTIVITY_LOG = 40;

const PASTEL_PALETTE = [
  '#E8C2E8',
  '#F5E284',
  '#A7B582',
  '#C4D0F5',
  '#F7C59F',
  '#B8E0D2',
  '#FFC6FF',
];

const isLocalDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]');

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseHashAccessKey(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash || !hash.includes('access=')) return null;
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  const val = params.get('access');
  return val ? val.trim() : null;
}

function parseTimestampMs(iso?: string): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function normalizeCurrency(val: unknown): CurrencyCode {
  if (val === 'CHF' || val === 'GBP' || val === 'USD' || val === 'EUR') {
    return val;
  }
  return 'EUR';
}

function appendLogEntry(
  curr: Trip,
  actorId: string,
  action: string,
  targetLabel: string
): ActivityLogEntry[] {
  const entry: ActivityLogEntry = {
    id: generateId('log'),
    actorId,
    action,
    targetLabel,
    createdAt: new Date().toISOString(),
  };
  return [entry, ...(curr.activityLog || [])].slice(0, MAX_ACTIVITY_LOG);
}

export function normalizeTrip(raw: unknown): Trip | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const id =
    typeof obj.id === 'string' && obj.id.trim()
      ? obj.id.trim()
      : generateId('trip');
  const isDemo = Boolean(obj.isDemo || id === DEMO_TRIP.id);
  const rawSchemaVersion =
    typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 1;

  const rawTotalDays = Number(obj.totalDays);
  const totalDays =
    Number.isFinite(rawTotalDays) && rawTotalDays >= 1
      ? Math.min(60, Math.round(rawTotalDays))
      : isDemo
      ? DEMO_TRIP.totalDays
      : 7;

  const rawBudget = Number(obj.budgetTargetPerPerson);
  const budgetTargetPerPerson =
    Number.isFinite(rawBudget) && rawBudget >= 0
      ? roundCents(rawBudget)
      : isDemo
      ? DEMO_TRIP.budgetTargetPerPerson
      : 650;

  const rawTravelers = Array.isArray(obj.travelers) ? obj.travelers : [];
  const travelers: Traveler[] =
    rawTravelers.length > 0
      ? rawTravelers
          .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object'))
          .map((t, idx) => {
            const name =
              typeof t.name === 'string' && t.name.trim()
                ? t.name.trim()
                : `Person ${idx + 1}`;
            const tId =
              typeof t.id === 'string' && t.id.trim()
                ? t.id.trim()
                : generateId(`t-${idx}`);
            const rawInitials =
              typeof t.initials === 'string' ? t.initials.trim() : '';
            const fixedInitials =
              isDemo && tId === 't-lars' && rawSchemaVersion < 2 && rawInitials === 'LF'
                ? 'LA'
                : rawInitials || getSafeInitials(name);
            return {
              id: tId,
              name,
              initials: fixedInitials,
              color:
                typeof t.color === 'string' && t.color.trim()
                  ? t.color
                  : PASTEL_PALETTE[idx % PASTEL_PALETTE.length],
              role: typeof t.role === 'string' ? t.role : undefined,
            };
          })
      : [
          {
            id: 't-host',
            name: 'Gast',
            initials: 'GA',
            color: PASTEL_PALETTE[0],
            role: 'Orga',
          },
        ];

  const demoActCoords = new Map(
    DEMO_TRIP.activities.map((a) => [a.id, { lat: a.lat, lng: a.lng }])
  );
  const demoMealCoords = new Map(
    DEMO_TRIP.meals.map((m) => [m.id, { lat: m.lat, lng: m.lng }])
  );
  const demoIdeaCoords = new Map(
    DEMO_TRIP.ideas.map((i) => [i.id, { lat: i.lat, lng: i.lng }])
  );

  const activities: DayActivity[] = Array.isArray(obj.activities)
    ? obj.activities
        .filter((a): a is Record<string, unknown> => Boolean(a && typeof a === 'object'))
        .map((a) => {
          const actId =
            typeof a.id === 'string' && a.id.trim() ? a.id : generateId('act');
          const demoCoords = isDemo ? demoActCoords.get(actId) : undefined;
          const lat = typeof a.lat === 'number' ? a.lat : demoCoords?.lat;
          const lng = typeof a.lng === 'number' ? a.lng : demoCoords?.lng;
          const dayNum = Number(a.dayNumber);
          return {
            id: actId,
            dayNumber: Number.isFinite(dayNum) && dayNum >= 1 ? Math.round(dayNum) : 1,
            timeSlot:
              typeof a.timeSlot === 'string'
                ? normalizeTimeSlot(a.timeSlot) || '10:00'
                : '10:00',
            endTime:
              typeof a.endTime === 'string' && a.endTime.trim()
                ? normalizeTimeSlot(a.endTime)
                : undefined,
            title: typeof a.title === 'string' ? a.title : 'Aktivität',
            category:
              a.category === 'beach' ||
              a.category === 'culture' ||
              a.category === 'transport' ||
              a.category === 'nightlife' ||
              a.category === 'other'
                ? a.category
                : 'activity',
            location: typeof a.location === 'string' ? a.location : '',
            description: typeof a.description === 'string' ? a.description : '',
            estimatedCost: clampCost(a.estimatedCost) ?? 0,
            createdBy:
              typeof a.createdBy === 'string' && a.createdBy
                ? a.createdBy
                : travelers[0].id,
            votes: Array.isArray(a.votes)
              ? a.votes.filter((v): v is string => typeof v === 'string')
              : [],
            status:
              a.status === 'confirmed' || a.status === 'idea'
                ? a.status
                : 'planned',
            ...(typeof lat === 'number' && typeof lng === 'number'
              ? { lat, lng }
              : {}),
            ...(typeof a.sourceIdeaId === 'string' && a.sourceIdeaId
              ? { sourceIdeaId: a.sourceIdeaId }
              : {}),
          };
        })
    : [];

  const meals: MealPlan[] = Array.isArray(obj.meals)
    ? obj.meals
        .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === 'object'))
        .map((m) => {
          const mealId =
            typeof m.id === 'string' && m.id.trim() ? m.id : generateId('meal');
          const demoCoords = isDemo ? demoMealCoords.get(mealId) : undefined;
          const lat = typeof m.lat === 'number' ? m.lat : demoCoords?.lat;
          const lng = typeof m.lng === 'number' ? m.lng : demoCoords?.lng;
          const dayNum = Number(m.dayNumber);
          const notes =
            typeof m.ShoppingNotes === 'string'
              ? m.ShoppingNotes
              : typeof m.shoppingNotes === 'string'
              ? m.shoppingNotes
              : undefined;
          return {
            id: mealId,
            dayNumber: Number.isFinite(dayNum) && dayNum >= 1 ? Math.round(dayNum) : 1,
            mealType:
              m.mealType === 'breakfast' ||
              m.mealType === 'lunch' ||
              m.mealType === 'dinner' ||
              m.mealType === 'snack'
                ? m.mealType
                : 'dinner',
            style:
              m.style === 'cook' ||
              m.style === 'restaurant' ||
              m.style === 'bakery' ||
              m.style === 'delivery'
                ? m.style
                : 'restaurant',
            title: typeof m.title === 'string' ? m.title : 'Mahlzeit',
            time:
              typeof m.time === 'string'
                ? normalizeTimeSlot(m.time) || '19:00'
                : '19:00',
            locationOrRecipe:
              typeof m.locationOrRecipe === 'string' ? m.locationOrRecipe : '',
            description: typeof m.description === 'string' ? m.description : '',
            ...(notes ? { ShoppingNotes: notes } : {}),
            estimatedCostPerPerson: clampCost(m.estimatedCostPerPerson) ?? 0,
            proposedBy:
              typeof m.proposedBy === 'string' && m.proposedBy
                ? m.proposedBy
                : travelers[0].id,
            assignedTeam: Array.isArray(m.assignedTeam)
              ? m.assignedTeam.filter((v): v is string => typeof v === 'string')
              : [],
            votes: Array.isArray(m.votes)
              ? m.votes.filter((v): v is string => typeof v === 'string')
              : [],
            ...(typeof lat === 'number' && typeof lng === 'number'
              ? { lat, lng }
              : {}),
          };
        })
    : [];

  const polls: Poll[] = Array.isArray(obj.polls)
    ? obj.polls
        .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object'))
        .map((p) => {
          const pollId =
            typeof p.id === 'string' && p.id.trim() ? p.id : generateId('poll');
          const rawOptions = Array.isArray(p.options) ? p.options : [];
          return {
            id: pollId,
            question: typeof p.question === 'string' ? p.question : 'Abstimmung',
            category:
              p.category === 'accommodation' ||
              p.category === 'activity' ||
              p.category === 'food' ||
              p.category === 'transport'
                ? p.category
                : 'general',
            createdBy:
              typeof p.createdBy === 'string' && p.createdBy
                ? p.createdBy
                : travelers[0].id,
            dayNumber:
              typeof p.dayNumber === 'number' && Number.isFinite(p.dayNumber)
                ? Math.round(p.dayNumber)
                : undefined,
            isClosed: Boolean(p.isClosed),
            allowMultiple: Boolean(p.allowMultiple),
            options: rawOptions
              .filter((o): o is Record<string, unknown> => Boolean(o && typeof o === 'object'))
              .map((o, idx) => ({
                id:
                  typeof o.id === 'string' && o.id.trim()
                    ? o.id
                    : generateId(`opt-${idx}`),
                text: typeof o.text === 'string' ? o.text : `Option ${idx + 1}`,
                subtitle: typeof o.subtitle === 'string' ? o.subtitle : undefined,
                votes: Array.isArray(o.votes)
                  ? o.votes.filter((v): v is string => typeof v === 'string')
                  : [],
              })),
          };
        })
    : [];

  const tasks: TodoTask[] = Array.isArray(obj.tasks)
    ? obj.tasks
        .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object'))
        .map((t) => ({
          id: typeof t.id === 'string' && t.id.trim() ? t.id : generateId('task'),
          title: typeof t.title === 'string' ? t.title : 'Aufgabe',
          description:
            typeof t.description === 'string' ? t.description : undefined,
          category:
            t.category === 'before_trip' ||
            t.category === 'shared_equipment' ||
            t.category === 'packing' ||
            t.category === 'shopping' ||
            t.category === 'documents'
              ? t.category
              : 'before_trip',
          priority:
            t.priority === 'important' || t.priority === 'critical'
              ? t.priority
              : 'normal',
          assignedTo:
            typeof t.assignedTo === 'string' && t.assignedTo
              ? t.assignedTo
              : undefined,
          completed: Boolean(t.completed),
          votes: Array.isArray(t.votes)
            ? t.votes.filter((v): v is string => typeof v === 'string')
            : [],
        }))
    : [];

  // Respect intentionally empty ideas: [] (only fallback when ideas is missing/not an array)
  const ideas: BrainstormIdea[] = Array.isArray(obj.ideas)
    ? obj.ideas
        .filter((i): i is Record<string, unknown> => Boolean(i && typeof i === 'object'))
        .map((i) => {
          const ideaId =
            typeof i.id === 'string' && i.id.trim() ? i.id : generateId('idea');
          const demoCoords = isDemo ? demoIdeaCoords.get(ideaId) : undefined;
          const lat = typeof i.lat === 'number' ? i.lat : demoCoords?.lat;
          const lng = typeof i.lng === 'number' ? i.lng : demoCoords?.lng;
          const parsedCost = clampCost(i.estimatedCost);
          return {
            id: ideaId,
            title: typeof i.title === 'string' ? i.title : 'Idee',
            description: typeof i.description === 'string' ? i.description : '',
            category:
              i.category === 'beach' ||
              i.category === 'culture' ||
              i.category === 'transport' ||
              i.category === 'nightlife' ||
              i.category === 'other' ||
              i.category === 'food'
                ? i.category
                : 'activity',
            priority:
              i.priority === 'must_do' || i.priority === 'chill'
                ? i.priority
                : 'nice_to_have',
            location:
              typeof i.location === 'string' && i.location.trim()
                ? i.location
                : undefined,
            estimatedCost: parsedCost,
            createdBy:
              typeof i.createdBy === 'string' && i.createdBy
                ? i.createdBy
                : travelers[0].id,
            votes: Array.isArray(i.votes)
              ? i.votes.filter((v): v is string => typeof v === 'string')
              : [],
            assignedDay:
              typeof i.assignedDay === 'number' && Number.isFinite(i.assignedDay)
                ? Math.round(i.assignedDay)
                : undefined,
            createdAt:
              typeof i.createdAt === 'string' && i.createdAt
                ? i.createdAt
                : new Date().toISOString(),
            ...(typeof lat === 'number' && typeof lng === 'number'
              ? { lat, lng }
              : {}),
          };
        })
    : isDemo
    ? createDemoTripClone().ideas
    : [];

  const expenses: ExpenseItem[] = Array.isArray(obj.expenses)
    ? obj.expenses
        .filter((e): e is Record<string, unknown> => Boolean(e && typeof e === 'object'))
        .map((e) => ({
          id: typeof e.id === 'string' && e.id.trim() ? e.id : generateId('exp'),
          title: typeof e.title === 'string' ? e.title : 'Ausgabe',
          amount: clampCost(e.amount) ?? 0,
          paidBy:
            typeof e.paidBy === 'string' && e.paidBy
              ? e.paidBy
              : travelers[0].id,
          splitBetween: Array.isArray(e.splitBetween)
            ? e.splitBetween.filter((v): v is string => typeof v === 'string')
            : travelers.map((t) => t.id),
          category:
            e.category === 'accommodation' ||
            e.category === 'transport' ||
            e.category === 'food' ||
            e.category === 'activity' ||
            e.category === 'shopping'
              ? e.category
              : 'other',
          dayNumber:
            typeof e.dayNumber === 'number' && Number.isFinite(e.dayNumber)
              ? Math.round(e.dayNumber)
              : undefined,
          createdAt:
            typeof e.createdAt === 'string' && e.createdAt
              ? e.createdAt
              : new Date().toISOString(),
        }))
    : isDemo && rawSchemaVersion < 2
    ? createDemoTripClone().expenses || []
    : [];

  const settledPairs: string[] = Array.isArray(obj.settledPairs)
    ? obj.settledPairs.filter((s): s is string => typeof s === 'string')
    : [];

  const activityLog: ActivityLogEntry[] = Array.isArray(obj.activityLog)
    ? obj.activityLog
        .filter((l): l is Record<string, unknown> => Boolean(l && typeof l === 'object'))
        .map((l) => ({
          id: typeof l.id === 'string' && l.id.trim() ? l.id : generateId('log'),
          actorId:
            typeof l.actorId === 'string' && l.actorId
              ? l.actorId
              : travelers[0].id,
          action: typeof l.action === 'string' ? l.action : '',
          targetLabel: typeof l.targetLabel === 'string' ? l.targetLabel : '',
          createdAt:
            typeof l.createdAt === 'string' && l.createdAt
              ? l.createdAt
              : new Date().toISOString(),
        }))
    : isDemo && rawSchemaVersion < 2
    ? createDemoTripClone().activityLog || []
    : [];

  let info: TripInfo | undefined =
    obj.info && typeof obj.info === 'object'
      ? { ...(obj.info as TripInfo) }
      : isDemo
      ? { ...DEMO_TRIP.info }
      : undefined;

  if (isDemo && info && typeof info.lat !== 'number' && DEMO_TRIP.info) {
    info = {
      ...info,
      lat: DEMO_TRIP.info.lat,
      lng: DEMO_TRIP.info.lng,
    };
  }

  return {
    id,
    title:
      typeof obj.title === 'string' && obj.title.trim()
        ? obj.title
        : isDemo
        ? DEMO_TRIP.title
        : 'Neuer Urlaub',
    destination:
      typeof obj.destination === 'string' ? obj.destination : 'Reiseziel',
    subtitle: typeof obj.subtitle === 'string' ? obj.subtitle : '',
    startDate:
      typeof obj.startDate === 'string' && obj.startDate
        ? obj.startDate
        : '2026-07-15',
    totalDays,
    budgetTargetPerPerson,
    isDemo,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt:
      typeof obj.updatedAt === 'string' && obj.updatedAt
        ? obj.updatedAt
        : undefined,
    currency: normalizeCurrency(obj.currency),
    info,
    travelers,
    activities,
    meals,
    polls,
    tasks,
    ideas,
    expenses,
    settledPairs,
    activityLog,
  };
}

export type PollOptionInput = string | { id?: string; text: string; subtitle?: string };

interface UndoSnapshot {
  tripId: string;
  kind: 'activity' | 'meal' | 'idea' | 'poll' | 'task' | 'expense';
  index: number;
  item: unknown;
  restoredIdea?: { id: string; assignedDay?: number };
}

export interface VacationContextValue {
  trip: Trip;
  savedTrips: Trip[];
  currentUser: Traveler;
  selectedDay: number;
  activeTab: NavigationTab;
  selectedActivityId: string | null;
  isNewTripModalOpen: boolean;
  isQuickAddOpen: boolean;
  isWelcomeOpen: boolean;
  isUnlocked: boolean;
  isSyncing: boolean;
  isLocalMode: boolean;
  mapOpen: boolean;
  mapFocusTarget: MapFocusTarget | null;
  searchTarget: SearchTarget | null;
  toasts: ToastItem[];
  setCurrentUserById: (id: string) => void;
  addTraveler: (name: string, role?: string) => boolean;
  updateTraveler: (
    travelerId: string,
    updates: Partial<Pick<Traveler, 'name' | 'role' | 'color' | 'initials'>>
  ) => boolean;
  removeTraveler: (travelerId: string) => boolean;
  setSelectedDay: (day: number) => void;
  setActiveTab: (tab: NavigationTab) => void;
  setSelectedActivityId: (id: string | null) => void;
  setIsNewTripModalOpen: (open: boolean) => void;
  setIsQuickAddOpen: (open: boolean) => void;
  setIsWelcomeOpen: (open: boolean) => void;
  setMapOpen: (open: boolean) => void;
  setMapFocusTarget: (target: MapFocusTarget | null) => void;
  focusOnMap: (target: MapFocusTarget) => void;
  setSearchTarget: (target: SearchTarget | null) => void;
  showToast: (
    message: string,
    type?: ToastType,
    options?: { canUndo?: boolean; durationMs?: number }
  ) => void;
  dismissToast: (id: string) => void;
  undoLastDelete: () => void;
  unlockApp: (passwordInput: string) => boolean;
  lockApp: () => void;
  setAccessKey: (newKey: string) => void;
  getInviteUrl: () => string;
  switchToDemoTrip: () => void;
  resetDemoTrip: () => void;
  switchTrip: (tripId: string) => void;
  deleteTrip: (tripId: string) => void;
  updateTripInfo: (info: TripInfo) => void;
  updateTripMeta: (
    updates: Partial<
      Pick<
        Trip,
        | 'title'
        | 'destination'
        | 'subtitle'
        | 'startDate'
        | 'totalDays'
        | 'budgetTargetPerPerson'
        | 'currency'
      >
    >
  ) => void;
  createNewTrip: (data: {
    title: string;
    destination: string;
    subtitle: string;
    startDate: string;
    totalDays: number;
    budgetTargetPerPerson: number;
    travelerNames: string[];
    selectedUserName?: string;
    currency?: CurrencyCode;
  }) => void;
  addActivity: (activity: Omit<DayActivity, 'id' | 'votes' | 'createdBy'>) => void;
  updateActivity: (activityId: string, updates: Partial<Omit<DayActivity, 'id'>>) => void;
  toggleActivityVote: (activityId: string) => void;
  updateActivityStatus: (activityId: string, status: DayActivity['status']) => void;
  deleteActivity: (activityId: string) => void;
  addMeal: (meal: Omit<MealPlan, 'id' | 'votes' | 'proposedBy'>) => void;
  updateMeal: (mealId: string, updates: Partial<Omit<MealPlan, 'id'>>) => void;
  toggleMealVote: (mealId: string) => void;
  deleteMeal: (mealId: string) => void;
  addShoppingTasksFromMeals: () => number;
  addPoll: (
    question: string,
    category: Poll['category'],
    optionTexts: PollOptionInput[],
    dayNumber?: number,
    allowMultiple?: boolean
  ) => void;
  updatePoll: (
    pollId: string,
    question: string,
    category: Poll['category'],
    optionTexts: PollOptionInput[],
    dayNumber?: number,
    allowMultiple?: boolean
  ) => void;
  togglePollVote: (pollId: string, optionId: string) => void;
  togglePollClosed: (pollId: string) => void;
  deletePoll: (pollId: string) => void;
  addTask: (task: Omit<TodoTask, 'id' | 'completed' | 'votes'>) => void;
  updateTask: (taskId: string, updates: Partial<Omit<TodoTask, 'id'>>) => void;
  toggleTaskCompleted: (taskId: string) => void;
  toggleTaskVote: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  addIdea: (idea: Omit<BrainstormIdea, 'id' | 'votes' | 'createdAt' | 'createdBy'>) => void;
  updateIdea: (ideaId: string, updates: Partial<Omit<BrainstormIdea, 'id'>>) => void;
  toggleIdeaVote: (ideaId: string) => void;
  deleteIdea: (ideaId: string) => void;
  scheduleIdeaToDay: (
    ideaId: string,
    dayNumber: number,
    timeSlot: string,
    endTime?: string
  ) => void;
  addExpense: (expense: Omit<ExpenseItem, 'id' | 'createdAt'>) => void;
  updateExpense: (
    expenseId: string,
    updates: Partial<Omit<ExpenseItem, 'id' | 'createdAt'>>
  ) => void;
  deleteExpense: (expenseId: string) => void;
  toggleSettlementPaid: (fromId: string, toId: string) => void;
}

const VacationContext = createContext<VacationContextValue | undefined>(undefined);

function loadInitialAccessHash(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ACCESS_HASH)?.trim();
    return stored ? stored.toLowerCase() : DEFAULT_ACCESS_HASH.toLowerCase();
  } catch {
    return DEFAULT_ACCESS_HASH.toLowerCase();
  }
}

interface InitialAuthState {
  accessHash: string;
  sessionToken: string;
  isUnlocked: boolean;
}

function loadInitialAuthState(): InitialAuthState {
  const initialHash = loadInitialAccessHash();
  const hashKey = parseHashAccessKey();

  if (hashKey && computeAccessHash(hashKey).toLowerCase() === initialHash) {
    try {
      localStorage.setItem(STORAGE_KEY_SESSION_TOKEN, hashKey);
      localStorage.setItem(STORAGE_KEY_UNLOCKED, 'true');
    } catch {
      // ignore
    }
    return {
      accessHash: initialHash,
      sessionToken: hashKey,
      isUnlocked: true,
    };
  }

  try {
    const storedToken = localStorage.getItem(STORAGE_KEY_SESSION_TOKEN)?.trim() || '';
    if (storedToken && computeAccessHash(storedToken).toLowerCase() === initialHash) {
      return {
        accessHash: initialHash,
        sessionToken: storedToken,
        isUnlocked: true,
      };
    }
  } catch {
    // ignore
  }

  return {
    accessHash: initialHash,
    sessionToken: '',
    isUnlocked: false,
  };
}

function hasStoredLondonTrip(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRIPS);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.some((t) => t && t.id === LONDON_TRIP.id);
  } catch {
    return false;
  }
}

function loadInitialActiveTripId(): string {
  try {
    const storedActive = localStorage.getItem(STORAGE_KEY_ACTIVE_ID)?.trim();
    const migrated = localStorage.getItem(STORAGE_KEY_LONDON_DEFAULT);
    if (!migrated) {
      const hadLondon = hasStoredLondonTrip();
      localStorage.setItem(STORAGE_KEY_LONDON_DEFAULT, 'true');
      if (!storedActive || (storedActive === DEMO_TRIP.id && !hadLondon)) {
        return LONDON_TRIP.id;
      }
    }
    return storedActive || LONDON_TRIP.id;
  } catch {
    return LONDON_TRIP.id;
  }
}

function loadInitialSavedTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRIPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = parsed
          .map((item) => normalizeTrip(item))
          .filter((item): item is Trip => item !== null);
        if (normalized.length > 0) {
          let result = normalized;
          const hasDemo = result.some((t) => t.id === DEMO_TRIP.id || t.isDemo);
          if (!hasDemo) {
            result = [...result, createDemoTripClone()];
          }
          const hasLondon = result.some((t) => t.id === LONDON_TRIP.id);
          if (!hasLondon) {
            result = [createLondonTripClone(), ...result];
          }
          return result;
        }
      }
    }
  } catch {
    // ignore localStorage read errors
  }
  return [createLondonTripClone(), createDemoTripClone()];
}

export const VacationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [initialAuth] = useState<InitialAuthState>(() => loadInitialAuthState());
  const [accessHash, setAccessHash] = useState<string>(initialAuth.accessHash);
  const [sessionToken, setSessionToken] = useState<string>(initialAuth.sessionToken);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(initialAuth.isUnlocked);

  const sessionTokenRef = useRef<string>(sessionToken);
  sessionTokenRef.current = sessionToken;

  const [savedTrips, setSavedTrips] = useState<Trip[]>(() => loadInitialSavedTrips());

  const [activeTripId, setActiveTripId] = useState<string>(() =>
    loadInitialActiveTripId()
  );

  const trip = useMemo(
    () =>
      savedTrips.find((t) => t.id === activeTripId) ||
      savedTrips[0] ||
      createLondonTripClone(),
    [savedTrips, activeTripId]
  );

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      return (
        localStorage.getItem(STORAGE_KEY_USER_ID) ||
        trip.travelers[0]?.id ||
        't-lars'
      );
    } catch {
      return trip.travelers[0]?.id || 't-lars';
    }
  });

  const currentUser: Traveler = useMemo(
    () =>
      trip.travelers.find((t) => t.id === currentUserId) ||
      trip.travelers[0] || {
        id: 't-host',
        name: 'Gast',
        initials: 'GA',
        color: '#E8C2E8',
      },
    [trip.travelers, currentUserId]
  );

  const [selectedDay, setSelectedDayState] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    trip.activities[0]?.id || null
  );
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState<boolean>(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Map-First Cockpit & Spotlight Search states
  const [mapOpen, setMapOpen] = useState<boolean>(false);
  const [mapFocusTarget, setMapFocusTarget] = useState<MapFocusTarget | null>(null);
  const [searchTarget, setSearchTarget] = useState<SearchTarget | null>(null);

  // Toast & 5s Undo states
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [isWelcomeOpen, setIsWelcomeOpenState] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_WELCOME_DONE) !== 'true';
    } catch {
      return true;
    }
  });

  // Refs for strict-mode-safe side effects & clean timers
  const activeTripRef = useRef<Trip>(trip);
  activeTripRef.current = trip;

  const currentUserRef = useRef<Traveler>(currentUser);
  currentUserRef.current = currentUser;

  const syncedUpdatedAtRef = useRef<Record<string, string>>(
    Object.fromEntries(
      savedTrips.map((t) => [t.id, t.updatedAt || '__initial__'])
    )
  );
  const deletedTripIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedRemoteRef = useRef<boolean>(isLocalDev);
  const syncFadeTimerRef = useRef<number | null>(null);
  const toastTimersRef = useRef<Map<string, number>>(new Map());
  const lastUndoRef = useRef<UndoSnapshot | null>(null);
  const undoExpiryTimerRef = useRef<number | null>(null);
  const quotaToastShownRef = useRef<boolean>(false);

  const dismissToast = useCallback((id: string) => {
    const existingTimer = toastTimersRef.current.get(id);
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = 'info',
      options?: { canUndo?: boolean; durationMs?: number }
    ) => {
      const id = generateId('toast');
      const canUndo = Boolean(options?.canUndo);
      const durationMs = options?.durationMs ?? (canUndo ? 5000 : 3200);

      setToasts((prev) => {
        const next = canUndo ? prev.filter((t) => !t.canUndo) : prev;
        return [...next.slice(-3), { id, message, type, canUndo }];
      });

      if (typeof window !== 'undefined' && durationMs > 0) {
        const timerId = window.setTimeout(() => {
          toastTimersRef.current.delete(id);
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, durationMs);
        toastTimersRef.current.set(id, timerId);
      }
    },
    []
  );

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      if (syncFadeTimerRef.current !== null) {
        window.clearTimeout(syncFadeTimerRef.current);
      }
      if (undoExpiryTimerRef.current !== null) {
        window.clearTimeout(undoExpiryTimerRef.current);
      }
      toastTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      toastTimersRef.current.clear();
    };
  }, []);

  // Clean up legacy v1 auth keys on mount & handle #access=... invite hash
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY_ACCESS_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY_UNLOCKED);
    } catch {
      // ignore
    }
    const hashKey = parseHashAccessKey();
    if (hashKey !== null) {
      if (isUnlocked && sessionTokenRef.current) {
        try {
          localStorage.setItem(
            STORAGE_KEY_SESSION_TOKEN,
            sessionTokenRef.current
          );
          localStorage.setItem(STORAGE_KEY_UNLOCKED, 'true');
        } catch {
          // ignore
        }
      }
      const cleanUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, '', cleanUrl);
    }
  }, [isUnlocked]);

  const setIsWelcomeOpen = useCallback((open: boolean) => {
    setIsWelcomeOpenState(open);
    try {
      if (!open) {
        sessionStorage.setItem(STORAGE_KEY_WELCOME_DONE, 'true');
      } else {
        sessionStorage.removeItem(STORAGE_KEY_WELCOME_DONE);
      }
    } catch {
      // ignore
    }
  }, []);

  const unlockApp = useCallback(
    (passwordInput: string): boolean => {
      const cleaned = passwordInput.trim();
      if (!cleaned) return false;
      if (computeAccessHash(cleaned).toLowerCase() === accessHash) {
        sessionTokenRef.current = cleaned;
        setSessionToken(cleaned);
        setIsUnlocked(true);
        try {
          localStorage.setItem(STORAGE_KEY_SESSION_TOKEN, cleaned);
          localStorage.setItem(STORAGE_KEY_UNLOCKED, 'true');
        } catch {
          // ignore
        }
        return true;
      }
      return false;
    },
    [accessHash]
  );

  const lockApp = useCallback(() => {
    sessionTokenRef.current = '';
    setSessionToken('');
    setIsUnlocked(false);
    try {
      localStorage.removeItem(STORAGE_KEY_SESSION_TOKEN);
      localStorage.removeItem(STORAGE_KEY_UNLOCKED);
    } catch {
      // ignore
    }
  }, []);

  const setAccessKey = useCallback(
    (newKey: string) => {
      const cleaned = newKey.trim();
      if (!cleaned) {
        showToast('Zugangscode darf nicht leer sein', 'warning');
        return;
      }
      const prevToken = sessionTokenRef.current;
      const nextHash = computeAccessHash(cleaned).toLowerCase();
      sessionTokenRef.current = cleaned;
      setAccessHash(nextHash);
      setSessionToken(cleaned);
      try {
        localStorage.setItem(STORAGE_KEY_ACCESS_HASH, nextHash);
        localStorage.setItem(STORAGE_KEY_SESSION_TOKEN, cleaned);
        localStorage.setItem(STORAGE_KEY_UNLOCKED, 'true');
      } catch {
        // ignore
      }
      if (!isLocalDev) {
        fetch('/api/trips', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${prevToken || ''}`,
          },
          body: JSON.stringify({
            action: 'updateAccessHash',
            newAccessHash: nextHash,
          }),
        })
          .then((res) => {
            if (res.status === 401) {
              showToast(
                'Cloud-Autorisierung fehlgeschlagen – bitte erneut anmelden',
                'warning'
              );
              lockApp();
            } else if (!res.ok) {
              showToast(
                'Passwort lokal aktualisiert, Cloud-Sync fehlgeschlagen',
                'warning'
              );
            }
          })
          .catch(() => {
            // Offline - localStorage remains updated
          });
      }
      showToast('Zugangscode aktualisiert', 'success');
    },
    [lockApp, showToast]
  );

  const getInviteUrl = useCallback((): string => {
    if (typeof window === 'undefined') return '';
    const base = `${window.location.origin}${window.location.pathname}`;
    if (!sessionToken) return base;
    return `${base}#access=${encodeURIComponent(sessionToken)}`;
  }, [sessionToken]);

  // Persist savedTrips safely to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TRIPS, JSON.stringify(savedTrips));
      quotaToastShownRef.current = false;
    } catch {
      if (!quotaToastShownRef.current) {
        quotaToastShownRef.current = true;
        showToast(
          'Lokaler Speicher fast voll – Änderungen konnten nicht lokal gesichert werden.',
          'error'
        );
      }
    }
  }, [savedTrips, showToast]);

  // Persist activeTripId only when resolved or after remote fetch completed
  useEffect(() => {
    const existsLocally = savedTrips.some((t) => t.id === activeTripId);
    if (!existsLocally && !hasLoadedRemoteRef.current) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, trip.id);
    } catch {
      // ignore
    }
  }, [savedTrips, activeTripId, trip.id]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USER_ID, currentUser.id);
    } catch {
      // ignore
    }
  }, [currentUser.id]);

  // Remote load ONLY when unlocked AND NOT on localhost/127.0.0.1
  useEffect(() => {
    if (!isUnlocked || isLocalDev) return;
    let isMounted = true;

    async function loadRemoteTrips() {
      try {
        const res = await fetch('/api/trips', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + (sessionTokenRef.current || ''),
          },
        });
        if (res.status === 401) {
          hasLoadedRemoteRef.current = true;
          if (isMounted) {
            showToast(
              'Sitzung nicht autorisiert – bitte Passwort erneut eingeben',
              'warning'
            );
            lockApp();
          }
          return;
        }
        if (!res.ok) {
          hasLoadedRemoteRef.current = true;
          return;
        }
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          hasLoadedRemoteRef.current = true;
          return;
        }
        const data = await res.json();
        hasLoadedRemoteRef.current = true;

        if (!isMounted || data?.ok === false || !Array.isArray(data?.trips)) {
          return;
        }

        const remoteNormalized = data.trips
          .map((rt: unknown) => normalizeTrip(rt))
          .filter((rt: Trip | null): rt is Trip => rt !== null);

        if (remoteNormalized.length === 0) return;

        setSavedTrips((prev) => {
          const byId = new Map<string, Trip>();
          prev.forEach((t) => byId.set(t.id, t));

          remoteNormalized.forEach((remoteTrip: Trip) => {
            if (deletedTripIdsRef.current.has(remoteTrip.id)) return;
            const localTrip = byId.get(remoteTrip.id);
            if (!localTrip) {
              byId.set(remoteTrip.id, remoteTrip);
              syncedUpdatedAtRef.current[remoteTrip.id] =
                remoteTrip.updatedAt || '__remote__';
              return;
            }
            const localMs = parseTimestampMs(localTrip.updatedAt);
            const remoteMs = parseTimestampMs(remoteTrip.updatedAt);
            if (remoteMs > 0 && (localMs === 0 || remoteMs >= localMs)) {
              byId.set(remoteTrip.id, remoteTrip);
              syncedUpdatedAtRef.current[remoteTrip.id] =
                remoteTrip.updatedAt || '__remote__';
            }
          });

          return Array.from(byId.values());
        });
      } catch {
        hasLoadedRemoteRef.current = true;
      }
    }

    loadRemoteTrips();
    return () => {
      isMounted = false;
    };
  }, [isUnlocked, lockApp, showToast]);

  const syncTripToCloud = useCallback(
    async (updatedTrip: Trip) => {
      if (!isUnlocked || isLocalDev) return;
      if (syncFadeTimerRef.current !== null) {
        window.clearTimeout(syncFadeTimerRef.current);
      }
      setIsSyncing(true);
      try {
        const res = await fetch('/api/trips', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + (sessionTokenRef.current || ''),
          },
          body: JSON.stringify({ trip: updatedTrip }),
        });
        if (res.status === 401) {
          showToast(
            'Cloud-Sync nicht autorisiert – bitte Passwort erneut eingeben',
            'warning'
          );
          lockApp();
          return;
        }
        if (!res.ok) {
          showToast('Cloud-Sync fehlgeschlagen (lokal gespeichert)', 'warning');
          return;
        }
        const data = await res.json().catch(() => null);
        if (data && data.ok === false) {
          return;
        }
        syncedUpdatedAtRef.current[updatedTrip.id] =
          updatedTrip.updatedAt || new Date().toISOString();
      } catch {
        // Offline - localStorage remains intact
      } finally {
        syncFadeTimerRef.current = window.setTimeout(() => {
          syncFadeTimerRef.current = null;
          setIsSyncing(false);
        }, 300);
      }
    },
    [isUnlocked, lockApp, showToast]
  );

  // Debounced post-commit cloud sync (NO side effects inside setSavedTrips updater!)
  useEffect(() => {
    if (!isUnlocked || isLocalDev) return;

    const dirtyTrips = savedTrips.filter((t) => {
      if (!t.updatedAt) return false;
      const lastSynced = syncedUpdatedAtRef.current[t.id];
      return lastSynced !== t.updatedAt;
    });

    if (dirtyTrips.length === 0) return;

    const timerId = window.setTimeout(() => {
      dirtyTrips.forEach((dirtyTrip) => {
        syncTripToCloud(dirtyTrip);
      });
    }, 400);

    return () => window.clearTimeout(timerId);
  }, [savedTrips, isUnlocked, syncTripToCloud]);

  const updateActiveTrip = useCallback((updater: (current: Trip) => Trip) => {
    const targetId = activeTripRef.current.id;
    const nowIso = new Date().toISOString();
    setSavedTrips((prev) =>
      prev.map((item) => {
        if (item.id !== targetId) return item;
        const updated = updater(item);
        return {
          ...updated,
          schemaVersion: CURRENT_SCHEMA_VERSION,
          updatedAt: nowIso,
        };
      })
    );
  }, []);

  const recordUndoSnapshot = useCallback(
    (snapshot: UndoSnapshot, label: string) => {
      lastUndoRef.current = snapshot;
      if (undoExpiryTimerRef.current !== null) {
        window.clearTimeout(undoExpiryTimerRef.current);
      }
      undoExpiryTimerRef.current = window.setTimeout(() => {
        lastUndoRef.current = null;
        undoExpiryTimerRef.current = null;
      }, 5200);
      showToast(`Gelöscht: ${label}`, 'info', {
        canUndo: true,
        durationMs: 5000,
      });
    },
    [showToast]
  );

  const undoLastDelete = useCallback(() => {
    const snapshot = lastUndoRef.current;
    if (!snapshot) return;

    if (undoExpiryTimerRef.current !== null) {
      window.clearTimeout(undoExpiryTimerRef.current);
      undoExpiryTimerRef.current = null;
    }
    lastUndoRef.current = null;

    setToasts((prev) => prev.filter((t) => !t.canUndo));

    const nowIso = new Date().toISOString();
    setSavedTrips((prev) =>
      prev.map((t) => {
        if (t.id !== snapshot.tripId) return t;
        if (snapshot.kind === 'activity') {
          const item = snapshot.item as DayActivity;
          if (t.activities.some((a) => a.id === item.id)) return t;
          const nextActs = [...t.activities];
          nextActs.splice(Math.min(snapshot.index, nextActs.length), 0, item);
          const nextIdeas = snapshot.restoredIdea
            ? t.ideas.map((idea) =>
                idea.id === snapshot.restoredIdea!.id
                  ? { ...idea, assignedDay: snapshot.restoredIdea!.assignedDay }
                  : idea
              )
            : t.ideas;
          return { ...t, activities: nextActs, ideas: nextIdeas, updatedAt: nowIso };
        }
        if (snapshot.kind === 'meal') {
          const item = snapshot.item as MealPlan;
          if (t.meals.some((m) => m.id === item.id)) return t;
          const nextMeals = [...t.meals];
          nextMeals.splice(Math.min(snapshot.index, nextMeals.length), 0, item);
          return { ...t, meals: nextMeals, updatedAt: nowIso };
        }
        if (snapshot.kind === 'idea') {
          const item = snapshot.item as BrainstormIdea;
          if (t.ideas.some((i) => i.id === item.id)) return t;
          const nextIdeas = [...t.ideas];
          nextIdeas.splice(Math.min(snapshot.index, nextIdeas.length), 0, item);
          return { ...t, ideas: nextIdeas, updatedAt: nowIso };
        }
        if (snapshot.kind === 'poll') {
          const item = snapshot.item as Poll;
          if (t.polls.some((p) => p.id === item.id)) return t;
          const nextPolls = [...t.polls];
          nextPolls.splice(Math.min(snapshot.index, nextPolls.length), 0, item);
          return { ...t, polls: nextPolls, updatedAt: nowIso };
        }
        if (snapshot.kind === 'task') {
          const item = snapshot.item as TodoTask;
          if (t.tasks.some((tk) => tk.id === item.id)) return t;
          const nextTasks = [...t.tasks];
          nextTasks.splice(Math.min(snapshot.index, nextTasks.length), 0, item);
          return { ...t, tasks: nextTasks, updatedAt: nowIso };
        }
        if (snapshot.kind === 'expense') {
          const item = snapshot.item as ExpenseItem;
          const currExpenses = t.expenses || [];
          if (currExpenses.some((ex) => ex.id === item.id)) return t;
          const nextExpenses = [...currExpenses];
          nextExpenses.splice(Math.min(snapshot.index, nextExpenses.length), 0, item);
          return { ...t, expenses: nextExpenses, updatedAt: nowIso };
        }
        return t;
      })
    );

    showToast('Eintrag wiederhergestellt', 'success', { durationMs: 2500 });
  }, [showToast]);

  const setCurrentUserById = useCallback((id: string) => {
    setCurrentUserId(id);
  }, []);

  const setSelectedDay = useCallback((day: number) => {
    const maxDays = activeTripRef.current.totalDays || 1;
    const clamped = Math.max(1, Math.min(Math.round(day) || 1, maxDays));
    setSelectedDayState(clamped);
  }, []);

  const focusOnMap = useCallback((target: MapFocusTarget) => {
    setMapFocusTarget(target);
    setMapOpen(true);
  }, []);

  const addTraveler = useCallback(
    (name: string, role?: string): boolean => {
      const trimmed = name.trim();
      if (!trimmed) {
        showToast('Bitte gib einen Namen ein', 'warning');
        return false;
      }

      const exists = activeTripRef.current.travelers.some(
        (t) => t.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) {
        showToast(`„${trimmed}“ ist bereits in der Gruppe`, 'warning');
        return false;
      }

      const newId = generateId('t');
      updateActiveTrip((curr) => {
        if (
          curr.travelers.some(
            (t) => t.name.trim().toLowerCase() === trimmed.toLowerCase()
          )
        ) {
          return curr;
        }
        const newTraveler: Traveler = {
          id: newId,
          name: trimmed,
          initials: getSafeInitials(trimmed),
          color: PASTEL_PALETTE[curr.travelers.length % PASTEL_PALETTE.length],
          role: role?.trim() || 'Mitreisende/r',
        };
        return {
          ...curr,
          travelers: [...curr.travelers, newTraveler],
          activityLog: appendLogEntry(curr, newId, 'trat der Reise bei', trimmed),
        };
      });
      setCurrentUserId(newId);
      return true;
    },
    [updateActiveTrip, showToast]
  );

  const updateTraveler = useCallback(
    (
      travelerId: string,
      updates: Partial<Pick<Traveler, 'name' | 'role' | 'color' | 'initials'>>
    ): boolean => {
      if (updates.name !== undefined) {
        const trimmed = updates.name.trim();
        if (!trimmed) {
          showToast('Name darf nicht leer sein', 'warning');
          return false;
        }
        const duplicate = activeTripRef.current.travelers.some(
          (t) =>
            t.id !== travelerId &&
            t.name.trim().toLowerCase() === trimmed.toLowerCase()
        );
        if (duplicate) {
          showToast(`„${trimmed}“ existiert bereits`, 'warning');
          return false;
        }
      }

      updateActiveTrip((curr) => ({
        ...curr,
        travelers: curr.travelers.map((t) => {
          if (t.id !== travelerId) return t;
          const nextName =
            updates.name !== undefined ? updates.name.trim() : t.name;
          const nextInitials =
            updates.initials !== undefined
              ? updates.initials.trim() || getSafeInitials(nextName)
              : updates.name !== undefined
              ? getSafeInitials(nextName)
              : t.initials;
          return {
            ...t,
            ...updates,
            name: nextName,
            initials: nextInitials,
            role:
              updates.role !== undefined ? updates.role.trim() : t.role,
          };
        }),
      }));
      return true;
    },
    [updateActiveTrip, showToast]
  );

  const removeTraveler = useCallback(
    (travelerId: string): boolean => {
      const currTravelers = activeTripRef.current.travelers;
      if (currTravelers.length <= 1) {
        showToast('Mindestens eine Person muss im Urlaub bleiben', 'warning');
        return false;
      }
      const target = currTravelers.find((t) => t.id === travelerId);
      if (!target) return false;

      const remaining = currTravelers.filter((t) => t.id !== travelerId);
      updateActiveTrip((curr) => {
        if (curr.travelers.length <= 1) return curr;
        return {
          ...curr,
          travelers: curr.travelers.filter((t) => t.id !== travelerId),
          tasks: curr.tasks.map((tk) =>
            tk.assignedTo === travelerId ? { ...tk, assignedTo: undefined } : tk
          ),
          meals: curr.meals.map((m) => ({
            ...m,
            assignedTeam: m.assignedTeam.filter((id) => id !== travelerId),
          })),
          activityLog: appendLogEntry(
            curr,
            currentUserRef.current.id,
            'entfernte Mitreisende/n',
            target.name
          ),
        };
      });

      if (currentUserRef.current.id === travelerId && remaining[0]) {
        setCurrentUserId(remaining[0].id);
      }
      return true;
    },
    [updateActiveTrip, showToast]
  );

  const switchToDemoTrip = useCallback(() => {
    const existingDemo = savedTrips.find((t) => t.id === DEMO_TRIP.id || t.isDemo);
    if (existingDemo) {
      setActiveTripId(existingDemo.id);
      setSelectedDayState(1);
      setSelectedActivityId(existingDemo.activities[0]?.id || null);
      setCurrentUserId(existingDemo.travelers[0]?.id || 't-lars');
    } else {
      const freshDemo = createDemoTripClone();
      deletedTripIdsRef.current.delete(freshDemo.id);
      setSavedTrips((prev) => [freshDemo, ...prev]);
      setActiveTripId(freshDemo.id);
      setSelectedDayState(1);
      setSelectedActivityId(freshDemo.activities[0]?.id || null);
      setCurrentUserId(freshDemo.travelers[0]?.id || 't-lars');
    }
  }, [savedTrips]);

  const resetDemoTrip = useCallback(() => {
    const freshDemo: Trip = {
      ...createDemoTripClone(),
      updatedAt: new Date().toISOString(),
    };
    deletedTripIdsRef.current.delete(freshDemo.id);
    setSavedTrips((prev) => {
      const filtered = prev.filter((t) => t.id !== DEMO_TRIP.id && !t.isDemo);
      return [freshDemo, ...filtered];
    });
    setActiveTripId(freshDemo.id);
    setSelectedDayState(1);
    setSelectedActivityId(freshDemo.activities[0]?.id || null);
    setCurrentUserId(freshDemo.travelers[0]?.id || 't-lars');
    showToast('Demo-Urlaub zurückgesetzt', 'info');
  }, [showToast]);

  const switchTrip = useCallback(
    (tripId: string) => {
      const target = savedTrips.find((t) => t.id === tripId);
      if (!target) return;
      setActiveTripId(target.id);
      setSelectedDayState(1);
      setSelectedActivityId(target.activities[0]?.id || null);
      const keepExistingUser = target.travelers.some(
        (t) => t.id === currentUserRef.current.id
      );
      setCurrentUserId(
        keepExistingUser
          ? currentUserRef.current.id
          : target.travelers[0]?.id || ''
      );
    },
    [savedTrips]
  );

  const deleteTrip = useCallback(
    (tripId: string) => {
      if (savedTrips.length <= 1) {
        showToast('Der letzte Urlaub kann nicht gelöscht werden', 'warning');
        return;
      }
      const target = savedTrips.find((t) => t.id === tripId);
      const remaining = savedTrips.filter((t) => t.id !== tripId);
      if (!target || remaining.length === savedTrips.length) return;

      deletedTripIdsRef.current.add(tripId);
      delete syncedUpdatedAtRef.current[tripId];
      setSavedTrips(remaining);

      if (activeTripRef.current.id === tripId) {
        const nextTrip =
          remaining.find((t) => t.id === LONDON_TRIP.id) ||
          remaining.find((t) => t.id === DEMO_TRIP.id || t.isDemo) ||
          remaining[0];
        if (nextTrip) {
          setActiveTripId(nextTrip.id);
          setSelectedDayState(1);
          setSelectedActivityId(nextTrip.activities[0]?.id || null);
          setCurrentUserId(nextTrip.travelers[0]?.id || '');
        }
      }

      if (isUnlocked && !isLocalDev) {
        fetch(`/api/trips?id=${encodeURIComponent(tripId)}`, {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer ' + (sessionTokenRef.current || ''),
          },
        })
          .then((res) => {
            if (res.status === 401) {
              showToast(
                'Sitzung nicht autorisiert – bitte Passwort erneut eingeben',
                'warning'
              );
              lockApp();
            }
          })
          .catch(() => {
            // Offline fallback
          });
      }
      showToast(`Urlaub „${target.title}“ gelöscht`, 'info');
    },
    [savedTrips, isUnlocked, lockApp, showToast]
  );

  const updateTripInfo = useCallback(
    (info: TripInfo) => {
      updateActiveTrip((curr) => ({
        ...curr,
        info: {
          ...(curr.info || {}),
          ...info,
        },
        activityLog: appendLogEntry(
          curr,
          currentUserRef.current.id,
          'aktualisierte das Info-Board',
          info.accommodationName || curr.info?.accommodationName || curr.title
        ),
      }));
    },
    [updateActiveTrip]
  );

  const updateTripMeta = useCallback(
    (
      updates: Partial<
        Pick<
          Trip,
          | 'title'
          | 'destination'
          | 'subtitle'
          | 'startDate'
          | 'totalDays'
          | 'budgetTargetPerPerson'
          | 'currency'
        >
      >
    ) => {
      let nextClampedTotalDays: number | null = null;
      updateActiveTrip((curr) => {
        const nextTotalDays =
          updates.totalDays !== undefined
            ? Math.max(1, Math.min(60, Math.round(Number(updates.totalDays) || curr.totalDays)))
            : curr.totalDays;
        nextClampedTotalDays = nextTotalDays;

        let nextBudget = curr.budgetTargetPerPerson;
        if (updates.budgetTargetPerPerson !== undefined) {
          const clamped = clampCost(updates.budgetTargetPerPerson);
          if (clamped !== undefined) {
            nextBudget = clamped;
          }
        }

        const nextTitle =
          updates.title !== undefined && updates.title.trim()
            ? updates.title.trim()
            : curr.title;

        return {
          ...curr,
          title: nextTitle,
          destination:
            updates.destination !== undefined
              ? updates.destination.trim() || curr.destination
              : curr.destination,
          subtitle:
            updates.subtitle !== undefined ? updates.subtitle.trim() : curr.subtitle,
          startDate:
            updates.startDate !== undefined && updates.startDate
              ? updates.startDate
              : curr.startDate,
          totalDays: nextTotalDays,
          budgetTargetPerPerson: nextBudget,
          currency:
            updates.currency !== undefined
              ? normalizeCurrency(updates.currency)
              : curr.currency || 'EUR',
          activityLog: appendLogEntry(
            curr,
            currentUserRef.current.id,
            'aktualisierte Reisedaten',
            nextTitle
          ),
        };
      });

      if (nextClampedTotalDays !== null) {
        setSelectedDayState((prev) =>
          Math.max(1, Math.min(prev, nextClampedTotalDays!))
        );
      }
    },
    [updateActiveTrip]
  );

  const createNewTrip = useCallback(
    (data: {
      title: string;
      destination: string;
      subtitle: string;
      startDate: string;
      totalDays: number;
      budgetTargetPerPerson: number;
      travelerNames: string[];
      selectedUserName?: string;
      currency?: CurrencyCode;
    }) => {
      const seenNames = new Set<string>();
      const uniqueNames: string[] = [];
      for (const rawName of data.travelerNames) {
        const trimmed = rawName.trim();
        if (!trimmed) continue;
        const lower = trimmed.toLowerCase();
        if (seenNames.has(lower)) continue;
        seenNames.add(lower);
        uniqueNames.push(trimmed);
      }
      const names = uniqueNames.length > 0 ? uniqueNames : ['Ich'];

      const travelers: Traveler[] = names.map((name, idx) => ({
        id: generateId(`t-${idx}`),
        name,
        initials: getSafeInitials(name),
        color: PASTEL_PALETTE[idx % PASTEL_PALETTE.length],
        role: idx === 0 ? 'Haupt-Orga' : 'Crew',
      }));

      const chosenTraveler =
        (data.selectedUserName &&
          travelers.find(
            (t) => t.name.toLowerCase() === data.selectedUserName!.trim().toLowerCase()
          )) ||
        travelers[0];

      const firstUserId = chosenTraveler.id;
      const totalDays = Math.max(1, Math.min(60, Math.round(Number(data.totalDays) || 7)));

      // Preserve 0 € budget! Only fallback when NaN or negative
      const parsedBudget = Number(data.budgetTargetPerPerson);
      const budgetTargetPerPerson =
        Number.isFinite(parsedBudget) && parsedBudget >= 0
          ? roundCents(parsedBudget)
          : 650;

      const initialActivity: DayActivity = {
        id: generateId('act'),
        dayNumber: 1,
        timeSlot: '14:00',
        endTime: '16:30',
        title: `Ankunft & Check-in in ${data.destination.trim() || 'unserer Unterkunft'}`,
        category: 'transport',
        location: data.destination.trim() || 'Zielort',
        description:
          'Gemeinsames Ankommen, Zimmer beziehen und erste Erkundungstour durch die Umgebung.',
        estimatedCost: 0,
        createdBy: firstUserId,
        votes: travelers.map((t) => t.id),
        status: 'confirmed',
      };

      const initialMeal: MealPlan = {
        id: generateId('meal'),
        dayNumber: 1,
        mealType: 'dinner',
        style: 'restaurant',
        title: 'Erstes gemeinsames Abendessen zum Urlaubsstart',
        time: '19:30',
        locationOrRecipe: `Lokales Restaurant in ${data.destination.trim() || 'der Nähe'}`,
        description:
          'Auf den ersten Urlaubsabend anstoßen und die Pläne für die nächsten Tage besprechen.',
        estimatedCostPerPerson: 25,
        proposedBy: firstUserId,
        assignedTeam: [firstUserId],
        votes: travelers.map((t) => t.id),
      };

      const initialPoll: Poll = {
        id: generateId('poll'),
        question: 'Worauf habt ihr in den ersten Tagen am meisten Lust?',
        category: 'general',
        createdBy: firstUserId,
        dayNumber: Math.min(2, totalDays),
        isClosed: false,
        allowMultiple: false,
        options: [
          {
            id: generateId('opt-0'),
            text: 'Entspannt ankommen, Strand / Natur & gutes Essen',
            votes: [],
          },
          {
            id: generateId('opt-1'),
            text: 'Direkt ein großes Highlight oder Ausflug starten',
            votes: [],
          },
        ],
      };

      const initialTasks: TodoTask[] = [
        {
          id: generateId('task'),
          title: 'Unterkunft & Anreise-Details für alle teilen',
          description: 'Adresse, Check-in-Zeiten und Buchungsbestätigung bereithalten.',
          category: 'before_trip',
          priority: 'critical',
          assignedTo: firstUserId,
          completed: false,
          votes: [firstUserId],
        },
        {
          id: generateId('task'),
          title: 'Ersten Großeinkauf vor Ort planen',
          description: 'Frühstück, Getränke, Snacks für die ersten Tage.',
          category: 'shopping',
          priority: 'important',
          assignedTo: travelers[1]?.id || firstUserId,
          completed: false,
          votes: [firstUserId],
        },
        {
          id: generateId('task'),
          title: 'Ausweise, Tickets & Reiseapotheke checken',
          category: 'documents',
          priority: 'important',
          assignedTo: firstUserId,
          completed: false,
          votes: [],
        },
      ];

      const nowIso = new Date().toISOString();
      const newTrip: Trip = {
        id: generateId('trip'),
        title:
          data.title.trim() || `Urlaub in ${data.destination.trim() || '2026'}`,
        destination: data.destination.trim() || 'Wunschziel',
        subtitle:
          data.subtitle.trim() ||
          `${totalDays} Tage gemeinsam planen, abstimmen & genießen`,
        startDate: data.startDate || '2026-08-01',
        totalDays,
        budgetTargetPerPerson,
        isDemo: false,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: nowIso,
        currency: normalizeCurrency(data.currency),
        travelers,
        activities: [initialActivity],
        meals: [initialMeal],
        polls: [initialPoll],
        tasks: initialTasks,
        ideas: [],
        expenses: [],
        settledPairs: [],
        activityLog: [
          {
            id: generateId('log'),
            actorId: firstUserId,
            action: 'erstellte den Urlaub',
            targetLabel:
              data.title.trim() || data.destination.trim() || 'Neuer Urlaub',
            createdAt: nowIso,
          },
        ],
      };

      deletedTripIdsRef.current.delete(newTrip.id);
      setSavedTrips((prev) => [newTrip, ...prev]);
      setActiveTripId(newTrip.id);
      setCurrentUserId(firstUserId);
      setSelectedDayState(1);
      setSelectedActivityId(initialActivity.id);
      setIsNewTripModalOpen(false);
      setIsWelcomeOpen(false);
      showToast(`Urlaub „${newTrip.title}“ erstellt`, 'success');
    },
    [setIsWelcomeOpen, showToast]
  );

  const addActivity = useCallback(
    (activityData: Omit<DayActivity, 'id' | 'votes' | 'createdBy'>) => {
      const title = activityData.title.trim();
      if (!title) return;
      const newActivity: DayActivity = {
        ...activityData,
        title,
        timeSlot: normalizeTimeSlot(activityData.timeSlot) || '10:00',
        endTime: activityData.endTime?.trim()
          ? normalizeTimeSlot(activityData.endTime)
          : undefined,
        estimatedCost: clampCost(activityData.estimatedCost) ?? 0,
        id: generateId('act'),
        createdBy: currentUserRef.current.id,
        votes: [currentUserRef.current.id],
      };
      updateActiveTrip((curr) => ({
        ...curr,
        activities: [...curr.activities, newActivity],
        activityLog: appendLogEntry(
          curr,
          currentUserRef.current.id,
          'plante Aktivität',
          newActivity.title
        ),
      }));
      setSelectedActivityId(newActivity.id);
    },
    [updateActiveTrip]
  );

  const updateActivity = useCallback(
    (activityId: string, updates: Partial<Omit<DayActivity, 'id'>>) => {
      updateActiveTrip((curr) => ({
        ...curr,
        activities: curr.activities.map((act) => {
          if (act.id !== activityId) return act;
          const nextCost =
            updates.estimatedCost !== undefined
              ? clampCost(updates.estimatedCost) ?? 0
              : act.estimatedCost;
          return {
            ...act,
            ...updates,
            timeSlot:
              updates.timeSlot !== undefined
                ? normalizeTimeSlot(updates.timeSlot) || act.timeSlot
                : act.timeSlot,
            endTime:
              updates.endTime !== undefined
                ? updates.endTime?.trim()
                  ? normalizeTimeSlot(updates.endTime)
                  : undefined
                : act.endTime,
            estimatedCost: nextCost,
          };
        }),
      }));
    },
    [updateActiveTrip]
  );

  const toggleActivityVote = useCallback(
    (activityId: string) => {
      const userId = currentUserRef.current.id;
      updateActiveTrip((curr) => ({
        ...curr,
        activities: curr.activities.map((act) => {
          if (act.id !== activityId) return act;
          const hasVoted = act.votes.includes(userId);
          return {
            ...act,
            votes: hasVoted
              ? act.votes.filter((id) => id !== userId)
              : [...act.votes, userId],
          };
        }),
      }));
    },
    [updateActiveTrip]
  );

  const updateActivityStatus = useCallback(
    (activityId: string, status: DayActivity['status']) => {
      updateActiveTrip((curr) => ({
        ...curr,
        activities: curr.activities.map((act) =>
          act.id === activityId ? { ...act, status } : act
        ),
      }));
    },
    [updateActiveTrip]
  );

  const deleteActivity = useCallback(
    (activityId: string) => {
      const currTrip = activeTripRef.current;
      const idx = currTrip.activities.findIndex((a) => a.id === activityId);
      if (idx === -1) return;
      const target = currTrip.activities[idx];

      let restoredIdea: { id: string; assignedDay?: number } | undefined;
      if (target.sourceIdeaId) {
        const linkedIdea = currTrip.ideas.find(
          (i) => i.id === target.sourceIdeaId
        );
        if (linkedIdea) {
          restoredIdea = {
            id: linkedIdea.id,
            assignedDay: linkedIdea.assignedDay,
          };
        }
      }

      updateActiveTrip((curr) => ({
        ...curr,
        activities: curr.activities.filter((act) => act.id !== activityId),
        ideas: target.sourceIdeaId
          ? curr.ideas.map((idea) =>
              idea.id === target.sourceIdeaId
                ? { ...idea, assignedDay: undefined }
                : idea
            )
          : curr.ideas,
      }));

      if (selectedActivityId === activityId) {
        setSelectedActivityId(null);
      }

      recordUndoSnapshot(
        {
          tripId: currTrip.id,
          kind: 'activity',
          index: idx,
          item: target,
          restoredIdea,
        },
        target.title
      );
    },
    [selectedActivityId, updateActiveTrip, recordUndoSnapshot]
  );

  const addMeal = useCallback(
    (mealData: Omit<MealPlan, 'id' | 'votes' | 'proposedBy'>) => {
      const title = mealData.title.trim();
      if (!title) return;
      const newMeal: MealPlan = {
        ...mealData,
        title,
        time: normalizeTimeSlot(mealData.time) || '19:00',
        estimatedCostPerPerson: clampCost(mealData.estimatedCostPerPerson) ?? 0,
        id: generateId('meal'),
        proposedBy: currentUserRef.current.id,
        votes: [currentUserRef.current.id],
      };
      updateActiveTrip((curr) => ({
        ...curr,
        meals: [...curr.meals, newMeal],
        activityLog: appendLogEntry(
          curr,
          currentUserRef.current.id,
          'ergänzte Mahlzeit',
          newMeal.title
        ),
      }));
    },
    [updateActiveTrip]
  );

  const updateMeal = useCallback(
    (mealId: string, updates: Partial<Omit<MealPlan, 'id'>>) => {
      updateActiveTrip((curr) => ({
        ...curr,
        meals: curr.meals.map((meal) => {
          if (meal.id !== mealId) return meal;
          const nextCost =
            updates.estimatedCostPerPerson !== undefined
              ? clampCost(updates.estimatedCostPerPerson) ?? 0
              : meal.estimatedCostPerPerson;
          return {
            ...meal,
            ...updates,
            time:
              updates.time !== undefined
                ? normalizeTimeSlot(updates.time) || meal.time
                : meal.time,
            estimatedCostPerPerson: nextCost,
          };
        }),
      }));
    },
    [updateActiveTrip]
  );

  const toggleMealVote = useCallback(
    (mealId: string) => {
      const userId = currentUserRef.current.id;
      updateActiveTrip((curr) => ({
        ...curr,
        meals: curr.meals.map((meal) => {
          if (meal.id !== mealId) return meal;
          const hasVoted = meal.votes.includes(userId);
          return {
            ...meal,
            votes: hasVoted
              ? meal.votes.filter((id) => id !== userId)
              : [...meal.votes, userId],
          };
        }),
      }));
    },
    [updateActiveTrip]
  );

  const deleteMeal = useCallback(
    (mealId: string) => {
      const currTrip = activeTripRef.current;
      const idx = currTrip.meals.findIndex((m) => m.id === mealId);
      if (idx === -1) return;
      const target = currTrip.meals[idx];

      updateActiveTrip((curr) => ({
        ...curr,
        meals: curr.meals.filter((meal) => meal.id !== mealId),
      }));

      recordUndoSnapshot(
        {
          tripId: currTrip.id,
          kind: 'meal',
          index: idx,
          item: target,
        },
        target.title
      );
    },
    [updateActiveTrip, recordUndoSnapshot]
  );

  const addShoppingTasksFromMeals = useCallback((): number => {
    const currTrip = activeTripRef.current;
    const existingKeys = new Set(
      currTrip.tasks.map((t) => `${t.title.trim().toLowerCase()}`)
    );

    const newTasks: TodoTask[] = [];
    for (const meal of currTrip.meals) {
      const notes = meal.ShoppingNotes?.trim();
      if (!notes) continue;
      const taskTitle = `Einkauf (Tag ${meal.dayNumber}): ${meal.title}`;
      if (existingKeys.has(taskTitle.toLowerCase())) continue;
      existingKeys.add(taskTitle.toLowerCase());
      newTasks.push({
        id: generateId('task'),
        title: taskTitle,
        description: notes,
        category: 'shopping',
        priority: 'normal',
        assignedTo: meal.assignedTeam[0] || meal.proposedBy,
        completed: false,
        votes: [currentUserRef.current.id],
      });
    }

    if (newTasks.length === 0) {
      showToast('Alle Einkaufsnotizen sind bereits als Aufgaben vorhanden', 'info');
      return 0;
    }

    updateActiveTrip((curr) => ({
      ...curr,
      tasks: [...newTasks, ...curr.tasks],
      activityLog: appendLogEntry(
        curr,
        currentUserRef.current.id,
        `übernahm ${newTasks.length} Einkaufslisten`,
        'Mahlzeiten -> Aufgaben'
      ),
    }));

    showToast(
      `${newTasks.length} Einkaufs-Aufgabe${newTasks.length === 1 ? '' : 'n'} hinzugefügt`,
      'success'
    );
    return newTasks.length;
  }, [updateActiveTrip, showToast]);

  const addPoll = useCallback(
    (
      question: string,
      category: Poll['category'],
      optionInputs: PollOptionInput[],
      dayNumber?: number,
      allowMultiple = false
    ) => {
      const trimmedQuestion = question.trim();
      const normalizedOptions = optionInputs
        .map((opt) =>
          typeof opt === 'string'
            ? { text: opt.trim(), subtitle: undefined }
            : {
                text: opt.text.trim(),
                subtitle: opt.subtitle?.trim() || undefined,
              }
        )
        .filter((opt) => Boolean(opt.text));

      if (!trimmedQuestion || normalizedOptions.length === 0) return;

      const newPoll: Poll = {
        id: generateId('poll'),
        question: trimmedQuestion,
        category,
        createdBy: currentUserRef.current.id,
        dayNumber,
        isClosed: false,
        allowMultiple: Boolean(allowMultiple),
        options: normalizedOptions.map((opt, idx) => ({
          id: generateId(`opt-${idx}`),
          text: opt.text,
          ...(opt.subtitle ? { subtitle: opt.subtitle } : {}),
          votes: [],
        })),
      };

      updateActiveTrip((curr) => ({
        ...curr,
        polls: [newPoll, ...curr.polls],
        activityLog: appendLogEntry(
          curr,
          currentUserRef.current.id,
          'startete Abstimmung',
          newPoll.question
        ),
      }));
    },
    [updateActiveTrip]
  );

  const togglePollVote = useCallback(
    (pollId: string, optionId: string) => {
      const userId = currentUserRef.current.id;
      updateActiveTrip((curr) => ({
        ...curr,
        polls: curr.polls.map((poll) => {
          if (poll.id !== pollId || poll.isClosed) return poll;

          if (poll.allowMultiple) {
            return {
              ...poll,
              options: poll.options.map((opt) => {
                if (opt.id !== optionId) return opt;
                const hasVoted = opt.votes.includes(userId);
                return {
                  ...opt,
                  votes: hasVoted
                    ? opt.votes.filter((id) => id !== userId)
                    : [...opt.votes, userId],
                };
              }),
            };
          }

          // Single-choice poll: clicking already-voted option toggles off; clicking another moves vote
          const targetOpt = poll.options.find((opt) => opt.id === optionId);
          const alreadyVotedTarget = Boolean(targetOpt?.votes.includes(userId));
          return {
            ...poll,
            options: poll.options.map((opt) => {
              const withoutUser = opt.votes.filter((id) => id !== userId);
              if (opt.id !== optionId) {
                return { ...opt, votes: withoutUser };
              }
              return {
                ...opt,
                votes: alreadyVotedTarget ? withoutUser : [...withoutUser, userId],
              };
            }),
          };
        }),
      }));
    },
    [updateActiveTrip]
  );

  const togglePollClosed = useCallback(
    (pollId: string) => {
      updateActiveTrip((curr) => ({
        ...curr,
        polls: curr.polls.map((poll) =>
          poll.id === pollId ? { ...poll, isClosed: !poll.isClosed } : poll
        ),
      }));
    },
    [updateActiveTrip]
  );

  const updatePoll = useCallback(
    (
      pollId: string,
      question: string,
      category: Poll['category'],
      optionInputs: PollOptionInput[],
      dayNumber?: number,
      allowMultiple?: boolean
    ) => {
      const trimmedQuestion = question.trim();
      const cleanOptions = optionInputs
        .map((opt) =>
          typeof opt === 'string'
            ? { id: undefined, text: opt.trim(), subtitle: undefined, hasExplicitSubtitle: false }
            : {
                id: opt.id,
                text: opt.text.trim(),
                subtitle: opt.subtitle?.trim() || undefined,
                hasExplicitSubtitle: opt.subtitle !== undefined,
              }
        )
        .filter((opt) => Boolean(opt.text));

      if (!trimmedQuestion || cleanOptions.length === 0) return;

      updateActiveTrip((curr) => ({
        ...curr,
        polls: curr.polls.map((poll) => {
          if (poll.id !== pollId) return poll;

          const existingById = new Map<string, PollOption>();
          poll.options.forEach((opt) => existingById.set(opt.id, opt));
          const usedOptionIds = new Set<string>();

          const updatedOptions: PollOption[] = cleanOptions.map((incoming, idx) => {
            if (incoming.id && existingById.has(incoming.id) && !usedOptionIds.has(incoming.id)) {
              usedOptionIds.add(incoming.id);
              const prevOpt = existingById.get(incoming.id)!;
              return {
                ...prevOpt,
                text: incoming.text,
                subtitle: incoming.hasExplicitSubtitle
                  ? incoming.subtitle
                  : prevOpt.subtitle,
              };
            }

            // Fallback match by text (only unused options to prevent duplicate IDs)
            const matchedByText = poll.options.find(
              (opt) =>
                !usedOptionIds.has(opt.id) &&
                opt.text.trim().toLowerCase() === incoming.text.toLowerCase()
            );
            if (matchedByText) {
              usedOptionIds.add(matchedByText.id);
              return {
                ...matchedByText,
                text: incoming.text,
                subtitle: incoming.hasExplicitSubtitle
                  ? incoming.subtitle
                  : matchedByText.subtitle,
              };
            }

            return {
              id: generateId(`opt-${idx}`),
              text: incoming.text,
              ...(incoming.subtitle ? { subtitle: incoming.subtitle } : {}),
              votes: [],
            };
          });

          return {
            ...poll,
            question: trimmedQuestion,
            category,
            dayNumber,
            allowMultiple:
              allowMultiple !== undefined ? Boolean(allowMultiple) : poll.allowMultiple,
            options: updatedOptions,
          };
        }),
      }));
    },
    [updateActiveTrip]
  );

  const deletePoll = useCallback(
    (pollId: string) => {
      const currTrip = activeTripRef.current;
      const idx = currTrip.polls.findIndex((p) => p.id === pollId);
      if (idx === -1) return;
      const target = currTrip.polls[idx];

      updateActiveTrip((curr) => ({
        ...curr,
        polls: curr.polls.filter((poll) => poll.id !== pollId),
      }));

      recordUndoSnapshot(
        {
          tripId: currTrip.id,
          kind: 'poll',
          index: idx,
          item: target,
        },
        target.question
      );
    },
    [updateActiveTrip, recordUndoSnapshot]
  );

  const addTask = useCallback(
    (taskData: Omit<TodoTask, 'id' | 'completed' | 'votes'>) => {
      const title = taskData.title.trim();
      if (!title) return;
      const newTask: TodoTask = {
        ...taskData,
        title,
        id: generateId('task'),
        completed: false,
        votes: [currentUserRef.current.id],
      };
      updateActiveTrip((curr) => ({
        ...curr,
        tasks: [newTask, ...curr.tasks],
        activityLog: appendLogEntry(
          curr,
          currentUserRef.current.id,
          'erstellte Aufgabe',
          newTask.title
        ),
      }));
    },
    [updateActiveTrip]
  );

  const updateTask = useCallback(
    (taskId: string, updates: Partial<Omit<TodoTask, 'id'>>) => {
      updateActiveTrip((curr) => ({
        ...curr,
        tasks: curr.tasks.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task
        ),
      }));
    },
    [updateActiveTrip]
  );

  const toggleTaskCompleted = useCallback(
    (taskId: string) => {
      updateActiveTrip((curr) => ({
        ...curr,
        tasks: curr.tasks.map((task) =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        ),
      }));
    },
    [updateActiveTrip]
  );

  const toggleTaskVote = useCallback(
    (taskId: string) => {
      const userId = currentUserRef.current.id;
      updateActiveTrip((curr) => ({
        ...curr,
        tasks: curr.tasks.map((task) => {
          if (task.id !== taskId) return task;
          const hasVoted = task.votes.includes(userId);
          return {
            ...task,
            votes: hasVoted
              ? task.votes.filter((id) => id !== userId)
              : [...task.votes, userId],
          };
        }),
      }));
    },
    [updateActiveTrip]
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      const currTrip = activeTripRef.current;
      const idx = currTrip.tasks.findIndex((t) => t.id === taskId);
      if (idx === -1) return;
      const target = currTrip.tasks[idx];

      updateActiveTrip((curr) => ({
        ...curr,
        tasks: curr.tasks.filter((task) => task.id !== taskId),
      }));

      recordUndoSnapshot(
        {
          tripId: currTrip.id,
          kind: 'task',
          index: idx,
          item: target,
        },
        target.title
      );
    },
    [updateActiveTrip, recordUndoSnapshot]
  );

  const addIdea = useCallback(
    (ideaData: Omit<BrainstormIdea, 'id' | 'votes' | 'createdAt' | 'createdBy'>) => {
      const title = ideaData.title.trim();
      if (!title) return;
      const newIdea: BrainstormIdea = {
        ...ideaData,
        title,
        estimatedCost: clampCost(ideaData.estimatedCost),
        id: generateId('idea'),
        createdBy: currentUserRef.current.id,
        votes: [currentUserRef.current.id],
        createdAt: new Date().toISOString(),
      };
      updateActiveTrip((curr) => ({
        ...curr,
        ideas: [newIdea, ...(curr.ideas || [])],
        activityLog: appendLogEntry(
          curr,
          currentUserRef.current.id,
          'teilte neue Idee',
          newIdea.title
        ),
      }));
    },
    [updateActiveTrip]
  );

  const updateIdea = useCallback(
    (ideaId: string, updates: Partial<Omit<BrainstormIdea, 'id'>>) => {
      updateActiveTrip((curr) => ({
        ...curr,
        ideas: (curr.ideas || []).map((idea) => {
          if (idea.id !== ideaId) return idea;
          const nextCost =
            'estimatedCost' in updates
              ? clampCost(updates.estimatedCost)
              : idea.estimatedCost;
          return {
            ...idea,
            ...updates,
            estimatedCost: nextCost,
          };
        }),
      }));
    },
    [updateActiveTrip]
  );

  const toggleIdeaVote = useCallback(
    (ideaId: string) => {
      const userId = currentUserRef.current.id;
      updateActiveTrip((curr) => ({
        ...curr,
        ideas: (curr.ideas || []).map((idea) => {
          if (idea.id !== ideaId) return idea;
          const hasVoted = idea.votes.includes(userId);
          return {
            ...idea,
            votes: hasVoted
              ? idea.votes.filter((id) => id !== userId)
              : [...idea.votes, userId],
          };
        }),
      }));
    },
    [updateActiveTrip]
  );

  const deleteIdea = useCallback(
    (ideaId: string) => {
      const currTrip = activeTripRef.current;
      const idx = currTrip.ideas.findIndex((i) => i.id === ideaId);
      if (idx === -1) return;
      const target = currTrip.ideas[idx];

      updateActiveTrip((curr) => ({
        ...curr,
        ideas: (curr.ideas || []).filter((idea) => idea.id !== ideaId),
      }));

      recordUndoSnapshot(
        {
          tripId: currTrip.id,
          kind: 'idea',
          index: idx,
          item: target,
        },
        target.title
      );
    },
    [updateActiveTrip, recordUndoSnapshot]
  );

  const scheduleIdeaToDay = useCallback(
    (ideaId: string, dayNumber: number, timeSlot: string, endTime?: string) => {
      const currTrip = activeTripRef.current;
      const existingActivity = currTrip.activities.find(
        (a) => a.sourceIdeaId === ideaId
      );
      if (existingActivity) {
        showToast(
          `Bereits an Tag ${existingActivity.dayNumber} im Tagesplan`,
          'info'
        );
        setSelectedDayState(existingActivity.dayNumber);
        setSelectedActivityId(existingActivity.id);
        return;
      }

      const clampedDay = Math.max(
        1,
        Math.min(Math.round(dayNumber) || 1, currTrip.totalDays || 1)
      );
      const createdId = generateId('act');
      let scheduledTitle = '';

      updateActiveTrip((curr) => {
        const targetIdea = curr.ideas?.find((i) => i.id === ideaId);
        if (!targetIdea) return curr;
        if (curr.activities.some((a) => a.sourceIdeaId === ideaId)) return curr;

        scheduledTitle = targetIdea.title;
        const newActivity: DayActivity = {
          id: createdId,
          dayNumber: clampedDay,
          timeSlot: normalizeTimeSlot(timeSlot) || '10:00',
          ...(endTime?.trim() ? { endTime: normalizeTimeSlot(endTime) } : {}),
          title: targetIdea.title,
          category: (targetIdea.category === 'food'
            ? 'activity'
            : targetIdea.category) as DayActivity['category'],
          location: targetIdea.location || '',
          description: targetIdea.description,
          estimatedCost: clampCost(targetIdea.estimatedCost) ?? 0,
          createdBy: targetIdea.createdBy,
          votes: [...targetIdea.votes],
          status: 'confirmed',
          sourceIdeaId: ideaId,
          ...(typeof targetIdea.lat === 'number' && typeof targetIdea.lng === 'number'
            ? { lat: targetIdea.lat, lng: targetIdea.lng }
            : {}),
        };

        return {
          ...curr,
          activities: [...curr.activities, newActivity],
          ideas: (curr.ideas || []).map((i) =>
            i.id === ideaId ? { ...i, assignedDay: clampedDay } : i
          ),
          activityLog: appendLogEntry(
            curr,
            currentUserRef.current.id,
            `übernahm Idee in Tag ${clampedDay}`,
            targetIdea.title
          ),
        };
      });

      if (scheduledTitle) {
        setSelectedActivityId(createdId);
        showToast(`„${scheduledTitle}“ für Tag ${clampedDay} eingeplant`, 'success');
      }
    },
    [updateActiveTrip, showToast]
  );

  const addExpense = useCallback(
    (expenseData: Omit<ExpenseItem, 'id' | 'createdAt'>) => {
      const title = expenseData.title.trim();
      const amount = clampCost(expenseData.amount) ?? 0;
      if (!title || amount <= 0) {
        showToast('Bitte Titel und gültigen Betrag > 0 angeben', 'warning');
        return;
      }

      const newExpense: ExpenseItem = {
        ...expenseData,
        title,
        amount,
        splitBetween:
          expenseData.splitBetween.length > 0
            ? expenseData.splitBetween
            : activeTripRef.current.travelers.map((t) => t.id),
        id: generateId('exp'),
        createdAt: new Date().toISOString(),
      };

      updateActiveTrip((curr) => ({
        ...curr,
        expenses: [newExpense, ...(curr.expenses || [])],
        activityLog: appendLogEntry(
          curr,
          newExpense.paidBy,
          'trug Ausgabe ein',
          `${newExpense.title} (${formatCurrency(newExpense.amount, curr.currency)})`
        ),
      }));
      showToast(`Ausgabe „${title}“ verbucht`, 'success');
    },
    [updateActiveTrip, showToast]
  );

  const updateExpense = useCallback(
    (expenseId: string, updates: Partial<Omit<ExpenseItem, 'id' | 'createdAt'>>) => {
      updateActiveTrip((curr) => ({
        ...curr,
        expenses: (curr.expenses || []).map((exp) => {
          if (exp.id !== expenseId) return exp;
          const nextAmount =
            updates.amount !== undefined
              ? clampCost(updates.amount) ?? exp.amount
              : exp.amount;
          return {
            ...exp,
            ...updates,
            title:
              updates.title !== undefined
                ? updates.title.trim() || exp.title
                : exp.title,
            amount: nextAmount,
          };
        }),
      }));
    },
    [updateActiveTrip]
  );

  const deleteExpense = useCallback(
    (expenseId: string) => {
      const currTrip = activeTripRef.current;
      const expenses = currTrip.expenses || [];
      const idx = expenses.findIndex((e) => e.id === expenseId);
      if (idx === -1) return;
      const target = expenses[idx];

      updateActiveTrip((curr) => ({
        ...curr,
        expenses: (curr.expenses || []).filter((e) => e.id !== expenseId),
      }));

      recordUndoSnapshot(
        {
          tripId: currTrip.id,
          kind: 'expense',
          index: idx,
          item: target,
        },
        target.title
      );
    },
    [updateActiveTrip, recordUndoSnapshot]
  );

  const toggleSettlementPaid = useCallback(
    (fromId: string, toId: string) => {
      const key = `${fromId}->${toId}`;
      updateActiveTrip((curr) => {
        const existing = curr.settledPairs || [];
        const hasKey = existing.includes(key);
        return {
          ...curr,
          settledPairs: hasKey
            ? existing.filter((k) => k !== key)
            : [...existing, key],
        };
      });
    },
    [updateActiveTrip]
  );

  const contextValue = useMemo<VacationContextValue>(
    () => ({
      trip,
      savedTrips,
      currentUser,
      selectedDay,
      activeTab,
      selectedActivityId,
      isNewTripModalOpen,
      isQuickAddOpen,
      isWelcomeOpen,
      isUnlocked,
      isSyncing,
      isLocalMode: isLocalDev,
      mapOpen,
      mapFocusTarget,
      searchTarget,
      toasts,
      setCurrentUserById,
      addTraveler,
      updateTraveler,
      removeTraveler,
      setSelectedDay,
      setActiveTab,
      setSelectedActivityId,
      setIsNewTripModalOpen,
      setIsQuickAddOpen,
      setIsWelcomeOpen,
      setMapOpen,
      setMapFocusTarget,
      focusOnMap,
      setSearchTarget,
      showToast,
      dismissToast,
      undoLastDelete,
      unlockApp,
      lockApp,
      setAccessKey,
      getInviteUrl,
      switchToDemoTrip,
      resetDemoTrip,
      switchTrip,
      deleteTrip,
      updateTripInfo,
      updateTripMeta,
      createNewTrip,
      addActivity,
      updateActivity,
      toggleActivityVote,
      updateActivityStatus,
      deleteActivity,
      addMeal,
      updateMeal,
      toggleMealVote,
      deleteMeal,
      addShoppingTasksFromMeals,
      addPoll,
      updatePoll,
      togglePollVote,
      togglePollClosed,
      deletePoll,
      addTask,
      updateTask,
      toggleTaskCompleted,
      toggleTaskVote,
      deleteTask,
      addIdea,
      updateIdea,
      toggleIdeaVote,
      deleteIdea,
      scheduleIdeaToDay,
      addExpense,
      updateExpense,
      deleteExpense,
      toggleSettlementPaid,
    }),
    [
      trip,
      savedTrips,
      currentUser,
      selectedDay,
      activeTab,
      selectedActivityId,
      isNewTripModalOpen,
      isQuickAddOpen,
      isWelcomeOpen,
      isUnlocked,
      isSyncing,
      mapOpen,
      mapFocusTarget,
      searchTarget,
      toasts,
      setCurrentUserById,
      addTraveler,
      updateTraveler,
      removeTraveler,
      setSelectedDay,
      setActiveTab,
      setSelectedActivityId,
      setIsNewTripModalOpen,
      setIsQuickAddOpen,
      setIsWelcomeOpen,
      setMapOpen,
      setMapFocusTarget,
      focusOnMap,
      setSearchTarget,
      showToast,
      dismissToast,
      undoLastDelete,
      unlockApp,
      lockApp,
      setAccessKey,
      getInviteUrl,
      switchToDemoTrip,
      resetDemoTrip,
      switchTrip,
      deleteTrip,
      updateTripInfo,
      updateTripMeta,
      createNewTrip,
      addActivity,
      updateActivity,
      toggleActivityVote,
      updateActivityStatus,
      deleteActivity,
      addMeal,
      updateMeal,
      toggleMealVote,
      deleteMeal,
      addShoppingTasksFromMeals,
      addPoll,
      updatePoll,
      togglePollVote,
      togglePollClosed,
      deletePoll,
      addTask,
      updateTask,
      toggleTaskCompleted,
      toggleTaskVote,
      deleteTask,
      addIdea,
      updateIdea,
      toggleIdeaVote,
      deleteIdea,
      scheduleIdeaToDay,
      addExpense,
      updateExpense,
      deleteExpense,
      toggleSettlementPaid,
    ]
  );

  return (
    <VacationContext.Provider value={contextValue}>
      {children}
    </VacationContext.Provider>
  );
};

export function useVacation(): VacationContextValue {
  const ctx = useContext(VacationContext);
  if (!ctx) {
    throw new Error('useVacation must be used within a VacationProvider');
  }
  return ctx;
}
