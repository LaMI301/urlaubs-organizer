import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Trip,
  Traveler,
  NavigationTab,
  DayActivity,
  MealPlan,
  Poll,
  TodoTask,
} from '../types/vacation';
import { DEMO_TRIP, createDemoTripClone } from '../data/demoTrip';

const STORAGE_KEY_TRIPS = 'vacayly_saved_trips_v1';
const STORAGE_KEY_ACTIVE_ID = 'vacayly_active_trip_id_v1';
const STORAGE_KEY_USER_ID = 'vacayly_current_user_id_v1';

const PASTEL_PALETTE = [
  '#E8C2E8',
  '#F5E284',
  '#A7B582',
  '#C4D0F5',
  '#F7C59F',
  '#B8E0D2',
  '#FFC6FF',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || 'UR';
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
  isSyncing: boolean;
  setCurrentUserById: (id: string) => void;
  addTraveler: (name: string, role?: string) => void;
  setSelectedDay: (day: number) => void;
  setActiveTab: (tab: NavigationTab) => void;
  setSelectedActivityId: (id: string | null) => void;
  setIsNewTripModalOpen: (open: boolean) => void;
  setIsQuickAddOpen: (open: boolean) => void;
  switchToDemoTrip: () => void;
  resetDemoTrip: () => void;
  switchTrip: (tripId: string) => void;
  createNewTrip: (data: {
    title: string;
    destination: string;
    subtitle: string;
    startDate: string;
    totalDays: number;
    budgetTargetPerPerson: number;
    travelerNames: string[];
  }) => void;
  addActivity: (activity: Omit<DayActivity, 'id' | 'votes' | 'createdBy'>) => void;
  toggleActivityVote: (activityId: string) => void;
  updateActivityStatus: (activityId: string, status: DayActivity['status']) => void;
  deleteActivity: (activityId: string) => void;
  addMeal: (meal: Omit<MealPlan, 'id' | 'votes' | 'proposedBy'>) => void;
  toggleMealVote: (mealId: string) => void;
  deleteMeal: (mealId: string) => void;
  addPoll: (
    question: string,
    category: Poll['category'],
    optionTexts: string[],
    dayNumber?: number
  ) => void;
  togglePollVote: (pollId: string, optionId: string) => void;
  togglePollClosed: (pollId: string) => void;
  addTask: (task: Omit<TodoTask, 'id' | 'completed' | 'votes'>) => void;
  toggleTaskCompleted: (taskId: string) => void;
  toggleTaskVote: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
}

const VacationContext = createContext<VacationContextValue | undefined>(undefined);

export const VacationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedTrips, setSavedTrips] = useState<Trip[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TRIPS);
      if (raw) {
        const parsed = JSON.parse(raw) as Trip[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasDemo = parsed.some((t) => t.id === DEMO_TRIP.id || t.isDemo);
          return hasDemo ? parsed : [createDemoTripClone(), ...parsed];
        }
      }
    } catch {
      // ignore localStorage read errors
    }
    return [createDemoTripClone()];
  });

  const [activeTripId, setActiveTripId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_ACTIVE_ID) || DEMO_TRIP.id;
    } catch {
      return DEMO_TRIP.id;
    }
  });

  const trip =
    savedTrips.find((t) => t.id === activeTripId) ||
    savedTrips[0] ||
    createDemoTripClone();

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_USER_ID) || trip.travelers[0]?.id || 't-lars';
    } catch {
      return trip.travelers[0]?.id || 't-lars';
    }
  });

  const currentUser: Traveler =
    trip.travelers.find((t) => t.id === currentUserId) ||
    trip.travelers[0] || {
      id: 't-default',
      name: 'Gast',
      initials: 'GA',
      color: '#E8C2E8',
    };

  const [selectedDay, setSelectedDayState] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    trip.activities[0]?.id || null
  );
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState<boolean>(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TRIPS, JSON.stringify(savedTrips));
    } catch {
      // ignore quota errors
    }
  }, [savedTrips]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, trip.id);
    } catch {
      // ignore
    }
  }, [trip.id]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USER_ID, currentUser.id);
    } catch {
      // ignore
    }
  }, [currentUser.id]);

  // Initial background fetch from Netlify function if deployed
  useEffect(() => {
    let isMounted = true;
    async function loadRemoteTrips() {
      try {
        const res = await fetch('/api/trips', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return;
        const data = await res.json();
        if (isMounted && Array.isArray(data?.trips) && data.trips.length > 0) {
          setSavedTrips((prev) => {
            const byId = new Map<string, Trip>();
            prev.forEach((t) => byId.set(t.id, t));
            data.trips.forEach((remoteTrip: Trip) => {
              if (remoteTrip && remoteTrip.id) {
                byId.set(remoteTrip.id, remoteTrip);
              }
            });
            return Array.from(byId.values());
          });
        }
      } catch {
        // Offline or local dev without netlify dev - silently fall back to localStorage
      }
    }
    loadRemoteTrips();
    return () => {
      isMounted = false;
    };
  }, []);

  const syncTripToCloud = useCallback(async (updatedTrip: Trip) => {
    setIsSyncing(true);
    try {
      await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip: updatedTrip }),
      });
    } catch {
      // Silent fallback to localStorage when offline
    } finally {
      setTimeout(() => setIsSyncing(false), 300);
    }
  }, []);

  const updateActiveTrip = useCallback(
    (updater: (current: Trip) => Trip) => {
      setSavedTrips((prev) => {
        const next = prev.map((item) => {
          if (item.id !== trip.id) return item;
          const updated = updater(item);
          syncTripToCloud(updated);
          return updated;
        });
        return next;
      });
    },
    [trip.id, syncTripToCloud]
  );

  const setCurrentUserById = useCallback((id: string) => {
    setCurrentUserId(id);
  }, []);

  const setSelectedDay = useCallback(
    (day: number) => {
      const clamped = Math.max(1, Math.min(day, trip.totalDays));
      setSelectedDayState(clamped);
    },
    [trip.totalDays]
  );

  const addTraveler = useCallback(
    (name: string, role?: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const newTraveler: Traveler = {
        id: generateId('t'),
        name: trimmed,
        initials: getInitials(trimmed),
        color: PASTEL_PALETTE[trip.travelers.length % PASTEL_PALETTE.length],
        role: role?.trim() || 'Mitreisende/r',
      };
      updateActiveTrip((curr) => ({
        ...curr,
        travelers: [...curr.travelers, newTraveler],
      }));
      setCurrentUserId(newTraveler.id);
    },
    [trip.travelers.length, updateActiveTrip]
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
      setSavedTrips((prev) => [freshDemo, ...prev]);
      setActiveTripId(freshDemo.id);
      setSelectedDayState(1);
      setSelectedActivityId(freshDemo.activities[0]?.id || null);
      setCurrentUserId(freshDemo.travelers[0]?.id || 't-lars');
    }
  }, [savedTrips]);

  const resetDemoTrip = useCallback(() => {
    const freshDemo = createDemoTripClone();
    setSavedTrips((prev) => {
      const filtered = prev.filter((t) => t.id !== DEMO_TRIP.id && !t.isDemo);
      return [freshDemo, ...filtered];
    });
    setActiveTripId(freshDemo.id);
    setSelectedDayState(1);
    setSelectedActivityId(freshDemo.activities[0]?.id || null);
    setCurrentUserId(freshDemo.travelers[0]?.id || 't-lars');
    syncTripToCloud(freshDemo);
  }, [syncTripToCloud]);

  const switchTrip = useCallback(
    (tripId: string) => {
      const target = savedTrips.find((t) => t.id === tripId);
      if (!target) return;
      setActiveTripId(target.id);
      setSelectedDayState(1);
      setSelectedActivityId(target.activities[0]?.id || null);
      setCurrentUserId(target.travelers[0]?.id || '');
    },
    [savedTrips]
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
    }) => {
      const names =
        data.travelerNames.map((n) => n.trim()).filter(Boolean).length > 0
          ? data.travelerNames.map((n) => n.trim()).filter(Boolean)
          : ['Ich', 'Mitreisende/r 2'];

      const travelers: Traveler[] = names.map((name, idx) => ({
        id: generateId(`t-${idx}`),
        name,
        initials: getInitials(name),
        color: PASTEL_PALETTE[idx % PASTEL_PALETTE.length],
        role: idx === 0 ? 'Haupt-Orga' : 'Crew',
      }));

      const firstUserId = travelers[0].id;
      const totalDays = Math.max(1, Math.min(21, Number(data.totalDays) || 7));

      const initialActivity: DayActivity = {
        id: generateId('act'),
        dayNumber: 1,
        timeSlot: '14:00',
        endTime: '16:30',
        title: `Ankunft & Check-in in ${data.destination || 'unserer Unterkunft'}`,
        category: 'transport',
        location: data.destination || 'Zielort',
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
        locationOrRecipe: `Lokales Restaurant in ${data.destination || 'der Nähe'}`,
        description: 'Auf den ersten Urlaubsabend anstoßen und die Pläne für die nächsten Tage besprechen.',
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
        dayNumber: 2,
        isClosed: false,
        options: [
          {
            id: generateId('opt'),
            text: 'Entspannt ankommen, Strand / Natur & gutes Essen',
            votes: [firstUserId],
          },
          {
            id: generateId('opt'),
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

      const newTrip: Trip = {
        id: generateId('trip'),
        title: data.title.trim() || `Urlaub in ${data.destination.trim() || '2026'}`,
        destination: data.destination.trim() || 'Wunschziel',
        subtitle:
          data.subtitle.trim() ||
          `${totalDays} Tage gemeinsam planen, abstimmen & genießen`,
        startDate: data.startDate || '2026-08-01',
        totalDays,
        budgetTargetPerPerson: Number(data.budgetTargetPerPerson) || 650,
        isDemo: false,
        travelers,
        activities: [initialActivity],
        meals: [initialMeal],
        polls: [initialPoll],
        tasks: initialTasks,
      };

      setSavedTrips((prev) => [newTrip, ...prev]);
      setActiveTripId(newTrip.id);
      setCurrentUserId(firstUserId);
      setSelectedDayState(1);
      setSelectedActivityId(initialActivity.id);
      setIsNewTripModalOpen(false);
      syncTripToCloud(newTrip);
    },
    [syncTripToCloud]
  );

  const addActivity = useCallback(
    (activityData: Omit<DayActivity, 'id' | 'votes' | 'createdBy'>) => {
      const newActivity: DayActivity = {
        ...activityData,
        id: generateId('act'),
        createdBy: currentUser.id,
        votes: [currentUser.id],
      };
      updateActiveTrip((curr) => ({
        ...curr,
        activities: [...curr.activities, newActivity],
      }));
      setSelectedActivityId(newActivity.id);
    },
    [currentUser.id, updateActiveTrip]
  );

  const toggleActivityVote = useCallback(
    (activityId: string) => {
      updateActiveTrip((curr) => ({
        ...curr,
        activities: curr.activities.map((act) => {
          if (act.id !== activityId) return act;
          const hasVoted = act.votes.includes(currentUser.id);
          return {
            ...act,
            votes: hasVoted
              ? act.votes.filter((id) => id !== currentUser.id)
              : [...act.votes, currentUser.id],
          };
        }),
      }));
    },
    [currentUser.id, updateActiveTrip]
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
      updateActiveTrip((curr) => ({
        ...curr,
        activities: curr.activities.filter((act) => act.id !== activityId),
      }));
      if (selectedActivityId === activityId) {
        setSelectedActivityId(null);
      }
    },
    [selectedActivityId, updateActiveTrip]
  );

  const addMeal = useCallback(
    (mealData: Omit<MealPlan, 'id' | 'votes' | 'proposedBy'>) => {
      const newMeal: MealPlan = {
        ...mealData,
        id: generateId('meal'),
        proposedBy: currentUser.id,
        votes: [currentUser.id],
      };
      updateActiveTrip((curr) => ({
        ...curr,
        meals: [...curr.meals, newMeal],
      }));
    },
    [currentUser.id, updateActiveTrip]
  );

  const toggleMealVote = useCallback(
    (mealId: string) => {
      updateActiveTrip((curr) => ({
        ...curr,
        meals: curr.meals.map((meal) => {
          if (meal.id !== mealId) return meal;
          const hasVoted = meal.votes.includes(currentUser.id);
          return {
            ...meal,
            votes: hasVoted
              ? meal.votes.filter((id) => id !== currentUser.id)
              : [...meal.votes, currentUser.id],
          };
        }),
      }));
    },
    [currentUser.id, updateActiveTrip]
  );

  const deleteMeal = useCallback(
    (mealId: string) => {
      updateActiveTrip((curr) => ({
        ...curr,
        meals: curr.meals.filter((meal) => meal.id !== mealId),
      }));
    },
    [updateActiveTrip]
  );

  const addPoll = useCallback(
    (
      question: string,
      category: Poll['category'],
      optionTexts: string[],
      dayNumber?: number
    ) => {
      const cleanOptions = optionTexts.map((t) => t.trim()).filter(Boolean);
      if (!question.trim() || cleanOptions.length === 0) return;

      const newPoll: Poll = {
        id: generateId('poll'),
        question: question.trim(),
        category,
        createdBy: currentUser.id,
        dayNumber,
        isClosed: false,
        options: cleanOptions.map((text, idx) => ({
          id: generateId(`opt-${idx}`),
          text,
          votes: idx === 0 ? [currentUser.id] : [],
        })),
      };

      updateActiveTrip((curr) => ({
        ...curr,
        polls: [newPoll, ...curr.polls],
      }));
    },
    [currentUser.id, updateActiveTrip]
  );

  const togglePollVote = useCallback(
    (pollId: string, optionId: string) => {
      updateActiveTrip((curr) => ({
        ...curr,
        polls: curr.polls.map((poll) => {
          if (poll.id !== pollId || poll.isClosed) return poll;
          return {
            ...poll,
            options: poll.options.map((opt) => {
              if (opt.id !== optionId) return opt;
              const hasVoted = opt.votes.includes(currentUser.id);
              return {
                ...opt,
                votes: hasVoted
                  ? opt.votes.filter((id) => id !== currentUser.id)
                  : [...opt.votes, currentUser.id],
              };
            }),
          };
        }),
      }));
    },
    [currentUser.id, updateActiveTrip]
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

  const addTask = useCallback(
    (taskData: Omit<TodoTask, 'id' | 'completed' | 'votes'>) => {
      const newTask: TodoTask = {
        ...taskData,
        id: generateId('task'),
        completed: false,
        votes: [currentUser.id],
      };
      updateActiveTrip((curr) => ({
        ...curr,
        tasks: [newTask, ...curr.tasks],
      }));
    },
    [currentUser.id, updateActiveTrip]
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
      updateActiveTrip((curr) => ({
        ...curr,
        tasks: curr.tasks.map((task) => {
          if (task.id !== taskId) return task;
          const hasVoted = task.votes.includes(currentUser.id);
          return {
            ...task,
            votes: hasVoted
              ? task.votes.filter((id) => id !== currentUser.id)
              : [...task.votes, currentUser.id],
          };
        }),
      }));
    },
    [currentUser.id, updateActiveTrip]
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      updateActiveTrip((curr) => ({
        ...curr,
        tasks: curr.tasks.filter((task) => task.id !== taskId),
      }));
    },
    [updateActiveTrip]
  );

  return (
    <VacationContext.Provider
      value={{
        trip,
        savedTrips,
        currentUser,
        selectedDay,
        activeTab,
        selectedActivityId,
        isNewTripModalOpen,
        isQuickAddOpen,
        isSyncing,
        setCurrentUserById,
        addTraveler,
        setSelectedDay,
        setActiveTab,
        setSelectedActivityId,
        setIsNewTripModalOpen,
        setIsQuickAddOpen,
        switchToDemoTrip,
        resetDemoTrip,
        switchTrip,
        createNewTrip,
        addActivity,
        toggleActivityVote,
        updateActivityStatus,
        deleteActivity,
        addMeal,
        toggleMealVote,
        deleteMeal,
        addPoll,
        togglePollVote,
        togglePollClosed,
        addTask,
        toggleTaskCompleted,
        toggleTaskVote,
        deleteTask,
      }}
    >
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
