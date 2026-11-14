import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Compass,
  Euro,
  ExternalLink,
  Landmark,
  Lightbulb,
  ListChecks,
  Map as MapIcon,
  MapPin,
  Music,
  Navigation,
  Palmtree,
  Plus,
  Snowflake,
  Sparkles,
  Sun,
  ThumbsUp,
  Users,
  Utensils,
  Vote,
  Car,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import { ActivityCategory, DayActivity, Traveler } from '../types/vacation';
import {
  buildGoogleMapsDayRouteUrl,
  buildGoogleMapsUrl,
  compareTimeSlots,
  detectDayConflicts,
  formatCurrency,
  formatTripDayDate,
  geocodePlace,
  isGenericLocation,
  parseLocalDate,
  parseTimeToMinutes,
  roundCents,
} from '../utils/vacationHelpers';
import { InfoBoardCard } from './InfoBoardCard';

const CATEGORY_META: Record<
  ActivityCategory,
  {
    label: string;
    icon: React.FC<{ className?: string }>;
    pillClass: string;
    iconBgClass: string;
  }
> = {
  beach: {
    label: 'Strand & Meer',
    icon: Palmtree,
    pillClass: 'border-[#D9822B]/30 bg-[#D9822B]/14 text-[#9E5A14]',
    iconBgClass: 'bg-[#D9822B]/14 text-[#9E5A14] border border-[#D9822B]/30',
  },
  activity: {
    label: 'Ausflug & Action',
    icon: Compass,
    pillClass: 'border-[#6E7F5E]/30 bg-[#6E7F5E]/14 text-[#4B593E]',
    iconBgClass: 'bg-[#6E7F5E]/14 text-[#4B593E] border border-[#6E7F5E]/30',
  },
  culture: {
    label: 'Kultur & Sightseeing',
    icon: Landmark,
    pillClass: 'border-[#2A7B88]/30 bg-[#2A7B88]/12 text-[#1F5E68]',
    iconBgClass: 'bg-[#2A7B88]/12 text-[#1F5E68] border border-[#2A7B88]/30',
  },
  transport: {
    label: 'Anreise & Roadtrip',
    icon: Car,
    pillClass: 'border-[#E6DDD1] bg-[#F3ECE1]/80 text-[#6B6259]',
    iconBgClass: 'bg-[#F3ECE1]/80 text-[#6B6259] border border-[#E6DDD1]',
  },
  nightlife: {
    label: 'Abend & Sunset',
    icon: Music,
    pillClass: 'border-[#C85A38]/30 bg-[#C85A38]/12 text-[#A34224]',
    iconBgClass: 'bg-[#C85A38]/12 text-[#A34224] border border-[#C85A38]/30',
  },
  other: {
    label: 'Sonstiges',
    icon: Sparkles,
    pillClass: 'border-[#E6DDD1] bg-[#FAF7F2] text-[#6B6259]',
    iconBgClass: 'bg-[#FAF7F2] text-[#6B6259] border border-[#E6DDD1]',
  },
};

const STATUS_LABELS: Record<
  DayActivity['status'],
  { label: string; badgeClass: string; dotClass: string }
> = {
  confirmed: {
    label: 'Bestätigt',
    badgeClass: 'bg-[#6E7F5E]/14 text-[#4B593E] border border-[#6E7F5E]/30',
    dotClass: 'bg-[#6E7F5E] shadow-[0_0_0_3px_rgba(110,127,94,0.18)]',
  },
  planned: {
    label: 'Geplant',
    badgeClass: 'bg-[#2A7B88]/12 text-[#1F5E68] border border-[#2A7B88]/30',
    dotClass: 'bg-[#2A7B88] shadow-[0_0_0_3px_rgba(42,123,136,0.18)]',
  },
  idea: {
    label: 'Idee',
    badgeClass: 'bg-[#D9822B]/14 text-[#9E5A14] border border-[#D9822B]/30',
    dotClass: 'bg-[#D9822B] shadow-[0_0_0_3px_rgba(217,130,43,0.18)]',
  },
};

interface WeatherSnapshot {
  temp: number;
  tempMax?: number;
  tempMin?: number;
  code: number;
  label: string;
  fetchedAt: number;
}

const WEATHER_CACHE_KEY = 'vo_weather_cache_v1';
const WEATHER_CACHE_TTL_MS = 20 * 60 * 1000;

function describeWeatherCode(code: number): {
  label: string;
  kind: 'sun' | 'partly' | 'cloud' | 'rain' | 'storm' | 'snow';
} {
  if (code === 0) return { label: 'Klar & Sonnig', kind: 'sun' };
  if (code === 1 || code === 2) return { label: 'Leicht bewölkt', kind: 'partly' };
  if (code === 3 || code === 45 || code === 48) {
    return { label: code === 3 ? 'Bewölkt' : 'Diesig / Nebel', kind: 'cloud' };
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { label: 'Regenschauer', kind: 'rain' };
  }
  if (code >= 71 && code <= 77) return { label: 'Schnee', kind: 'snow' };
  if (code >= 95) return { label: 'Gewitter', kind: 'storm' };
  return { label: 'Wechselhaft', kind: 'partly' };
}

function renderWeatherIcon(code: number, className = 'w-4 h-4') {
  const { kind } = describeWeatherCode(code);
  switch (kind) {
    case 'sun':
      return <Sun className={`${className} text-[#D9822B]`} />;
    case 'partly':
      return <CloudSun className={`${className} text-[#D9822B]`} />;
    case 'rain':
      return <CloudRain className={`${className} text-[#2A7B88]`} />;
    case 'storm':
      return <CloudLightning className={`${className} text-[#C85A38]`} />;
    case 'snow':
      return <Snowflake className={`${className} text-[#2A7B88]`} />;
    default:
      return <Cloud className={`${className} text-[#6B6259]`} />;
  }
}

function readWeatherCache(key: string): WeatherSnapshot | null {
  try {
    const raw = sessionStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, WeatherSnapshot>;
    const entry = parsed?.[key];
    if (!entry || Date.now() - entry.fetchedAt > WEATHER_CACHE_TTL_MS) {
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeWeatherCache(key: string, entry: WeatherSnapshot): void {
  try {
    const raw = sessionStorage.getItem(WEATHER_CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, WeatherSnapshot>) : {};
    parsed[key] = entry;
    sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage errors
  }
}

function formatRelativeTime(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return 'gerade eben';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `vor ${diffHrs} Std.`;
  const d = new Date(ms);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export const DashboardView: React.FC = () => {
  const {
    trip,
    currentUser,
    selectedDay,
    setSelectedDay,
    selectedActivityId,
    setSelectedActivityId,
    setActiveTab,
    setIsQuickAddOpen,
    toggleActivityVote,
    updateActivityStatus,
    mapOpen,
    setMapOpen,
    focusOnMap,
    setSearchTarget,
  } = useVacation();

  const [showBentoCards, setShowBentoCards] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vo_show_bento_cards') !== 'false';
    } catch {
      return true;
    }
  });

  const [showAllLogs, setShowAllLogs] = useState(false);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<'idle' | 'loading' | 'ready' | 'offline'>('idle');

  const dayChartScrollRef = useRef<HTMLDivElement | null>(null);

  const toggleBentoCards = () => {
    setShowBentoCards((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vo_show_bento_cards', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Safe traveler lookup WITHOUT mapping orphaned IDs to travelers[0]
  const travelerMap = useMemo(() => {
    const map = new Map<string, Traveler>();
    trip.travelers.forEach((t) => map.set(t.id, t));
    return map;
  }, [trip.travelers]);

  const getTravelerExact = (id: string): Traveler | null => travelerMap.get(id) || null;

  const safeTotalDays = Math.max(0, Math.round(trip.totalDays || 0));

  const fallbackActivityCoordKey = useMemo(() => {
    const geoAct = trip.activities.find(
      (a) => typeof a.lat === 'number' && typeof a.lng === 'number'
    );
    return geoAct ? `${geoAct.lat},${geoAct.lng}` : '';
  }, [trip.activities]);

  // Fetch lightweight non-blocking live weather via Open-Meteo
  useEffect(() => {
    let active = true;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId =
      controller && typeof window !== 'undefined'
        ? window.setTimeout(() => controller.abort(), 3000)
        : null;

    async function loadWeather() {
      let lat = typeof trip.info?.lat === 'number' ? trip.info.lat : undefined;
      let lng = typeof trip.info?.lng === 'number' ? trip.info.lng : undefined;

      if ((lat === undefined || lng === undefined) && fallbackActivityCoordKey) {
        const [fLat, fLng] = fallbackActivityCoordKey.split(',').map(Number);
        if (Number.isFinite(fLat) && Number.isFinite(fLng)) {
          lat = fLat;
          lng = fLng;
        }
      }

      if ((lat === undefined || lng === undefined) && trip.destination && !isGenericLocation(trip.destination)) {
        const coords = await geocodePlace(trip.destination);
        if (!active) return;
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }

      if (lat === undefined || lng === undefined) {
        if (active) {
          setWeather(null);
          setWeatherStatus('offline');
        }
        return;
      }

      const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
      const cached = readWeatherCache(cacheKey);
      if (cached) {
        if (active) {
          setWeather(cached);
          setWeatherStatus('ready');
        }
        return;
      }

      if (typeof fetch !== 'function') {
        if (active) setWeatherStatus('offline');
        return;
      }

      if (active) setWeatherStatus('loading');

      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
          String(lat)
        )}&longitude=${encodeURIComponent(
          String(lng)
        )}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;

        const res = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller?.signal,
        });
        if (!res.ok) {
          if (active) setWeatherStatus('offline');
          return;
        }
        const data = (await res.json()) as {
          current?: { temperature_2m?: number; weather_code?: number };
          daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] };
        };

        const rawTemp = data?.current?.temperature_2m;
        const rawCode = data?.current?.weather_code;
        if (typeof rawTemp !== 'number' || !Number.isFinite(rawTemp)) {
          if (active) setWeatherStatus('offline');
          return;
        }

        const code = typeof rawCode === 'number' && Number.isFinite(rawCode) ? rawCode : 0;
        const { label } = describeWeatherCode(code);
        const snap: WeatherSnapshot = {
          temp: Math.round(rawTemp),
          tempMax:
            typeof data?.daily?.temperature_2m_max?.[0] === 'number'
              ? Math.round(data.daily.temperature_2m_max[0])
              : undefined,
          tempMin:
            typeof data?.daily?.temperature_2m_min?.[0] === 'number'
              ? Math.round(data.daily.temperature_2m_min[0])
              : undefined,
          code,
          label,
          fetchedAt: Date.now(),
        };

        writeWeatherCache(cacheKey, snap);
        if (active) {
          setWeather(snap);
          setWeatherStatus('ready');
        }
      } catch {
        if (active) {
          setWeather(null);
          setWeatherStatus('offline');
        }
      }
    }

    loadWeather();

    return () => {
      active = false;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      controller?.abort();
    };
  }, [trip.id, trip.info?.lat, trip.info?.lng, trip.destination, fallbackActivityCoordKey]);

  // Countdown & active trip day calculation
  const tripTiming = useMemo(() => {
    const start = parseLocalDate(trip.startDate);
    if (!start || safeTotalDays <= 0) {
      return {
        badgeText: 'Zeitraum offen',
        subText: trip.destination,
        isRunning: false,
        currentTripDay: null as number | null,
      };
    }

    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endLocal = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + safeTotalDays - 1
    );

    const diffToStartDays = Math.round(
      (startLocal.getTime() - todayLocal.getTime()) / 86400000
    );

    if (diffToStartDays > 0) {
      return {
        badgeText: `In ${diffToStartDays} ${diffToStartDays === 1 ? 'Tag' : 'Tagen'}`,
        subText: `Start ${formatTripDayDate(trip.startDate, 1)} · ${safeTotalDays} Tage`,
        isRunning: false,
        currentTripDay: null as number | null,
      };
    }

    if (todayLocal.getTime() <= endLocal.getTime()) {
      const runningDay =
        Math.floor((todayLocal.getTime() - startLocal.getTime()) / 86400000) + 1;
      return {
        badgeText: `Tag ${runningDay} von ${safeTotalDays} · Läuft`,
        subText: `Aktiv · ${formatTripDayDate(trip.startDate, runningDay)}`,
        isRunning: true,
        currentTripDay: runningDay,
      };
    }

    return {
      badgeText: `Abgeschlossen · ${safeTotalDays} Tage`,
      subText: `Start war ${formatTripDayDate(trip.startDate, 1)}`,
      isRunning: false,
      currentTripDay: null as number | null,
    };
  }, [trip.startDate, safeTotalDays, trip.destination]);

  // Per-day stats across ALL days (1..totalDays), avoiding slice(0, 7) / slice(0, 8) truncation
  const dayStats = useMemo(() => {
    return Array.from({ length: safeTotalDays }, (_, idx) => {
      const day = idx + 1;
      const acts = trip.activities.filter((a) => a.dayNumber === day);
      const scheduledActs = acts.filter((a) => a.status !== 'idea');
      const meals = trip.meals.filter((m) => m.dayNumber === day);

      const actPlannedCost = scheduledActs.reduce(
        (sum, a) => sum + Math.max(0, Number(a.estimatedCost) || 0),
        0
      );
      const actIdeasCost = acts
        .filter((a) => a.status === 'idea')
        .reduce((sum, a) => sum + Math.max(0, Number(a.estimatedCost) || 0), 0);

      // Count top-voted meal per slot to avoid double-counting competing options
      const bestMealPerSlot = new Map<string, number>();
      meals.forEach((m) => {
        const existing = meals.filter((cand) => cand.mealType === m.mealType);
        const top = existing.slice().sort((a, b) => b.votes.length - a.votes.length)[0];
        if (top && top.id === m.id) {
          bestMealPerSlot.set(m.mealType, Math.max(0, Number(m.estimatedCostPerPerson) || 0));
        }
      });
      const mealPlannedCost = Array.from(bestMealPerSlot.values()).reduce((s, v) => s + v, 0);

      return {
        day,
        activitiesCount: acts.length,
        mealsCount: meals.length,
        plannedCost: roundCents(actPlannedCost + mealPlannedCost),
        ideasCost: roundCents(actIdeasCost),
      };
    });
  }, [safeTotalDays, trip.activities, trip.meals]);

  const maxActivitiesPerDay = Math.max(
    ...dayStats.map((d) => d.activitiesCount),
    3
  );

  // Budget summary (confirmed/planned vs target)
  const budgetSummary = useMemo(() => {
    const plannedPerPerson = roundCents(
      dayStats.reduce((sum, d) => sum + d.plannedCost, 0)
    );
    const ideasPerPerson = roundCents(
      dayStats.reduce((sum, d) => sum + d.ideasCost, 0)
    );
    const target = Math.max(0, Number(trip.budgetTargetPerPerson) || 0);
    const pct =
      target > 0 ? Math.min(100, Math.round((plannedPerPerson / target) * 100)) : 0;
    const isOver = target > 0 && plannedPerPerson > target;
    const isWarning = target > 0 && !isOver && pct >= 85;
    const expensesSum = roundCents(
      (trip.expenses || []).reduce((s, e) => s + Math.max(0, Number(e.amount) || 0), 0)
    );
    return {
      plannedPerPerson,
      withIdeasPerPerson: roundCents(plannedPerPerson + ideasPerPerson),
      target,
      pct,
      isOver,
      isWarning,
      expensesCount: trip.expenses?.length || 0,
      expensesSum,
    };
  }, [dayStats, trip.budgetTargetPerPerson, trip.expenses]);

  // Polls, Ideas, Tasks counters
  const openPollsCount = trip.polls.filter((p) => !p.isClosed).length;
  const totalPollVotes = trip.polls.reduce(
    (sum, p) => sum + p.options.reduce((s, o) => s + o.votes.length, 0),
    0
  );
  const ideasCount = trip.ideas?.length || 0;
  const unscheduledIdeasCount = (trip.ideas || []).filter(
    (i) => !i.assignedDay
  ).length;
  const completedTasksCount = trip.tasks.filter((t) => t.completed).length;
  const openTasksCount = trip.tasks.filter((t) => !t.completed).length;

  // "Als Nächstes steht an" highlight item
  const nextHighlightItem = useMemo(() => {
    const actCandidates = trip.activities
      .filter((a) => a.status !== 'idea')
      .map((a) => ({
        kind: 'activity' as const,
        id: a.id,
        dayNumber: a.dayNumber,
        time: a.timeSlot || '09:00',
        title: a.title,
        location: a.location,
        lat: a.lat,
        lng: a.lng,
        status: a.status,
      }));

    const mealCandidates = trip.meals.map((m) => ({
      kind: 'meal' as const,
      id: m.id,
      dayNumber: m.dayNumber,
      time: m.time || '12:30',
      title: m.title,
      location: m.locationOrRecipe,
      lat: m.lat,
      lng: m.lng,
      status: 'planned' as const,
    }));

    const allScheduled = [...actCandidates, ...mealCandidates].sort(
      (a, b) => a.dayNumber - b.dayNumber || compareTimeSlots(a.time, b.time)
    );

    if (allScheduled.length === 0) {
      // Fallback to any activity on selectedDay or trip
      const anyAct = [...trip.activities].sort(
        (a, b) => a.dayNumber - b.dayNumber || compareTimeSlots(a.timeSlot, b.timeSlot)
      )[0];
      if (!anyAct) return null;
      return {
        kind: 'activity' as const,
        id: anyAct.id,
        dayNumber: anyAct.dayNumber,
        time: anyAct.timeSlot || '09:00',
        title: anyAct.title,
        location: anyAct.location,
        lat: anyAct.lat,
        lng: anyAct.lng,
        status: anyAct.status,
      };
    }

    if (tripTiming.isRunning && tripTiming.currentTripDay) {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const liveUpcoming = allScheduled.find((item) => {
        if (item.dayNumber > tripTiming.currentTripDay!) return true;
        if (item.dayNumber < tripTiming.currentTripDay!) return false;
        const mins = parseTimeToMinutes(item.time);
        return mins === null || mins >= nowMins;
      });
      if (liveUpcoming) return liveUpcoming;
    }

    const onSelectedDay = allScheduled.find((item) => item.dayNumber === selectedDay);
    if (onSelectedDay) return onSelectedDay;

    const upcomingFromSelected = allScheduled.find(
      (item) => item.dayNumber >= selectedDay
    );
    return upcomingFromSelected || allScheduled[0];
  }, [trip.activities, trip.meals, selectedDay, tripTiming]);

  // Proposals for the selected day sorted chronologically with compareTimeSlots
  const dayActivities = useMemo(() => {
    return trip.activities
      .filter((a) => a.dayNumber === selectedDay)
      .sort((a, b) => compareTimeSlots(a.timeSlot, b.timeSlot));
  }, [trip.activities, selectedDay]);

  const dayMeals = useMemo(() => {
    return trip.meals
      .filter((m) => m.dayNumber === selectedDay)
      .sort((a, b) => compareTimeSlots(a.time, b.time));
  }, [trip.meals, selectedDay]);

  const dayConflicts = useMemo(
    () => detectDayConflicts(trip.activities, trip.meals, selectedDay),
    [trip.activities, trip.meals, selectedDay]
  );

  const conflictItemIds = useMemo(
    () => Object.keys(dayConflicts).filter((id) => dayConflicts[id].length > 0),
    [dayConflicts]
  );

  const dayRouteUrl = useMemo(() => {
    const timelineLocs = [
      ...dayActivities
        .filter((a) => a.status !== 'idea')
        .map((a) => ({ time: a.timeSlot, location: a.location })),
      ...dayMeals
        .filter((m) => m.style === 'restaurant' || m.style === 'bakery')
        .map((m) => ({ time: m.time, location: m.locationOrRecipe })),
    ]
      .sort((a, b) => compareTimeSlots(a.time, b.time))
      .map((item) => item.location);

    const locsToRoute =
      timelineLocs.length > 0
        ? timelineLocs
        : dayActivities.map((a) => a.location);

    return buildGoogleMapsDayRouteUrl(locsToRoute);
  }, [dayActivities, dayMeals]);

  // Currently inspected activity: strictly null if dayActivities is empty (never falls back to day 1!)
  const activeActivity = useMemo(() => {
    if (dayActivities.length === 0) return null;
    if (selectedActivityId) {
      const found = dayActivities.find((a) => a.id === selectedActivityId);
      if (found) return found;
    }
    return dayActivities[0];
  }, [dayActivities, selectedActivityId]);

  // Dynamic SVG wave path supporting ALL trip days (including > 7/8 days) without midpoint bug
  const wavePoints = useMemo(() => {
    if (dayStats.length === 0) {
      return {
        width: 280,
        path: '',
        area: '',
        pts: [] as Array<{ x: number; y: number; cost: number; day: number }>,
        highlight: null as { x: number; y: number; cost: number; day: number } | null,
      };
    }

    const width = Math.max(280, dayStats.length * 36);
    const height = 64;
    const maxCost = Math.max(...dayStats.map((s) => s.plannedCost), 60);

    const pts = dayStats.map((s, i) => {
      const x =
        dayStats.length === 1
          ? width / 2
          : (i / (dayStats.length - 1)) * (width - 28) + 14;
      const y = height - 10 - (s.plannedCost / maxCost) * (height - 24);
      return { x, y, cost: s.plannedCost, day: s.day };
    });

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const ctrlX = (curr.x + next.x) / 2;
      d += ` C ${ctrlX} ${curr.y}, ${ctrlX} ${next.y}, ${next.x} ${next.y}`;
    }

    const area = `${d} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`;
    const clampedIndex = Math.min(Math.max(selectedDay - 1, 0), pts.length - 1);
    const highlight = pts.find((p) => p.day === selectedDay) || pts[clampedIndex];

    return { width, path: d, area, pts, highlight };
  }, [dayStats, selectedDay]);

  // Auto-scroll active day bar into view when totalDays > 8
  useEffect(() => {
    const container = dayChartScrollRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLButtonElement>(
      `[data-chart-day="${selectedDay}"]`
    );
    if (!activeBtn) return;
    const targetLeft =
      activeBtn.offsetLeft - container.clientWidth / 2 + activeBtn.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [selectedDay, safeTotalDays]);

  const activityLogs = trip.activityLog || [];
  const visibleLogs = showAllLogs ? activityLogs.slice(0, 15) : activityLogs.slice(0, 5);

  const nextMapsUrl = nextHighlightItem
    ? buildGoogleMapsUrl(nextHighlightItem.location)
    : null;
  const activeActivityMapsUrl = activeActivity
    ? buildGoogleMapsUrl(activeActivity.location)
    : null;

  const activeConflicts = activeActivity ? dayConflicts[activeActivity.id] || [] : [];

  return (
    <div className="space-y-5 min-w-0">
      {/* Reise-Übersicht Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#A34224] mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#C85A38]" />
            <span>Reise-Übersicht</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1F1B18] truncate">
            Hallo, {currentUser.name}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-[#6B6259] mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono tabular-nums text-[#A34224] font-semibold">
              Tag {selectedDay} von {safeTotalDays || 1}
            </span>
            <span className="text-[#8C8277]">•</span>
            <span>{formatTripDayDate(trip.startDate, selectedDay)}</span>
            <span className="text-[#8C8277]">•</span>
            <span className="text-[#1F1B18] font-semibold truncate">{trip.destination}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={toggleBentoCards}
            className="w-9 h-9 rounded-full surface-glass hover:border-[#C85A38]/40 flex items-center justify-center text-[#6B6259] hover:text-[#A34224] transition-all cursor-pointer"
            title={showBentoCards ? 'Live-Ribbon einklappen' : 'Live-Ribbon ausklappen'}
            aria-label={showBentoCards ? 'Live-Ribbon einklappen' : 'Live-Ribbon ausklappen'}
            aria-expanded={showBentoCards}
          >
            {showBentoCards ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMapOpen(!mapOpen)}
            className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-full transition-all cursor-pointer border ${
              mapOpen
                ? 'bg-[#2A7B88]/12 text-[#1F5E68] border-[#2A7B88]/40 shadow-sm'
                : 'surface-glass text-[#1F1B18] hover:text-[#1F5E68] hover:border-[#2A7B88]/40'
            }`}
          >
            <MapIcon className="w-4 h-4 text-[#2A7B88]" />
            <span>{mapOpen ? 'Karte aktiv' : 'Karte'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsQuickAddOpen(true)}
            className="inline-flex items-center gap-2 bg-[#C85A38] hover:bg-[#B54B2B] text-white text-xs font-extrabold px-5 py-2.5 rounded-full active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Neuer Vorschlag</span>
          </button>
        </div>
      </div>

      {/* Top 4er-Live-Ribbon + Dynamic Full-Trip Chart */}
      {showBentoCards && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Reise-Countdown & Live-Wetter-Chip */}
            <div className="surface-glass rounded-[26px] p-5 flex flex-col justify-between gap-4 border-t-2 border-t-[#2A7B88]/60 min-w-0 relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#1F5E68] flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-[#2A7B88]" />
                    <span>Reise-Countdown</span>
                  </span>
                  <div className="text-xl sm:text-2xl font-black tracking-tight text-[#1F1B18] mt-1.5 font-mono tabular-nums break-words">
                    {tripTiming.badgeText}
                  </div>
                  <p className="text-xs text-[#6B6259] mt-1 truncate">
                    {tripTiming.subText}
                  </p>
                </div>

                {/* Live Weather Chip with calm offline fallback */}
                <div className="shrink-0 rounded-2xl bg-[#FAF7F2] border border-[#E6DDD1] px-3.5 py-2.5 text-right min-w-[116px]">
                  {weatherStatus === 'ready' && weather ? (
                    <>
                      <div className="flex items-center justify-end gap-1.5">
                        {renderWeatherIcon(weather.code, 'w-4 h-4')}
                        <span className="text-lg font-black text-[#1F1B18] font-mono tabular-nums">
                          {weather.temp}°C
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-[#6B6259] mt-0.5 truncate max-w-[130px]">
                        {weather.label}
                      </p>
                      {weather.tempMin !== undefined && weather.tempMax !== undefined && (
                        <p className="text-[10px] text-[#8C8277] font-mono tabular-nums mt-0.5">
                          {weather.tempMin}° / {weather.tempMax}°
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-end gap-1.5 text-[#1F1B18]">
                        <Cloud className="w-4 h-4 text-[#2A7B88]" />
                        <span className="text-xs font-bold font-mono">
                          {weatherStatus === 'loading' ? 'Lädt…' : 'Wetter bereit'}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#8C8277] mt-0.5 truncate max-w-[130px]">
                        {weatherStatus === 'loading'
                          ? 'Open-Meteo'
                          : 'Offline-Modus aktiv'}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E6DDD1] text-xs">
                <span className="inline-flex items-center gap-1.5 text-[#6B6259] font-semibold">
                  <Users className="w-3.5 h-3.5 text-[#2A7B88]" />
                  <span className="font-mono tabular-nums text-[#1F1B18]">{trip.travelers.length}</span>{' '}
                  Mitreisende
                </span>
                <div className="flex items-center -space-x-1.5">
                  {trip.travelers.slice(0, 6).map((t) => (
                    <span
                      key={t.id}
                      title={`${t.name}${t.role ? ` (${t.role})` : ''}`}
                      className="w-6 h-6 rounded-full border-2 border-[#FAF7F2] text-[10px] font-extrabold text-white flex items-center justify-center shrink-0"
                      style={{ backgroundColor: t.color }}
                    >
                      {t.initials}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Budget-Ribbon */}
            <button
              type="button"
              onClick={() => setActiveTab('budget')}
              className="surface-glass rounded-[26px] p-5 flex flex-col justify-between gap-3.5 border-t-2 border-t-[#6E7F5E]/60 hover:border-[#6E7F5E]/50 hover:-translate-y-0.5 transition-all text-left cursor-pointer min-w-0 group"
            >
              <div className="flex items-start justify-between gap-3 w-full">
                <div className="min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#4B593E] flex items-center gap-1.5">
                    <Euro className="w-3.5 h-3.5 text-[#6E7F5E]" />
                    <span>Budget-Ribbon (p.P.)</span>
                  </span>
                  <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-black text-[#1F1B18] font-mono tabular-nums">
                      {formatCurrency(budgetSummary.plannedPerPerson, trip.currency)}
                    </span>
                    {budgetSummary.target > 0 && (
                      <span className="text-xs font-semibold text-[#6B6259] font-mono tabular-nums">
                        / {formatCurrency(budgetSummary.target, trip.currency)} Ziel
                      </span>
                    )}
                  </div>
                </div>

                <span
                  className={`shrink-0 text-[11px] font-extrabold px-2.5 py-1 rounded-full font-mono tabular-nums border ${
                    budgetSummary.isOver
                      ? 'bg-rose-600/12 text-rose-800 border-rose-500/30'
                      : budgetSummary.isWarning
                      ? 'bg-[#D9822B]/14 text-[#9E5A14] border-[#D9822B]/30'
                      : 'bg-[#6E7F5E]/14 text-[#4B593E] border-[#6E7F5E]/30'
                  }`}
                >
                  {budgetSummary.target > 0 ? `${budgetSummary.pct}%` : 'Flexibel'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full space-y-2">
                <div className="w-full h-2.5 rounded-full bg-[#EFE7DB] border border-[#E6DDD1] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      budgetSummary.isOver
                        ? 'bg-gradient-to-r from-[#D9822B] to-rose-600'
                        : budgetSummary.isWarning
                        ? 'bg-gradient-to-r from-[#6E7F5E] to-[#D9822B]'
                        : 'bg-gradient-to-r from-[#2A7B88] to-[#6E7F5E]'
                    }`}
                    style={{
                      width: `${
                        budgetSummary.target > 0 ? Math.max(4, budgetSummary.pct) : 25
                      }%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#6B6259]">
                  <span className="font-mono tabular-nums">
                    Inkl. Ideen:{' '}
                    <strong className="text-[#1F1B18]">
                      {formatCurrency(budgetSummary.withIdeasPerPerson, trip.currency)}
                    </strong>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#4B593E] font-bold group-hover:translate-x-0.5 transition-transform">
                    {budgetSummary.expensesCount > 0 ? (
                      <span className="font-mono tabular-nums">
                        {budgetSummary.expensesCount} Ausgaben
                      </span>
                    ) : (
                      <span>Reisekasse</span>
                    )}
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </button>

            {/* 3. Offene Abstimmungen & Ideen-Pool (Cleanly separated <button> elements!) */}
            <div className="surface-glass rounded-[26px] p-5 flex flex-col justify-between gap-3.5 border-t-2 border-t-[#D9822B]/60 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('polls')}
                  className="text-left group cursor-pointer flex-1 min-w-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A38]"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E5A14] flex items-center gap-1.5">
                    <Vote className="w-3.5 h-3.5 text-[#D9822B]" />
                    <span>Offene Abstimmungen</span>
                  </span>
                  <div className="flex items-baseline gap-2.5 mt-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-[#1F1B18] font-mono tabular-nums">
                      {openPollsCount}
                    </span>
                    <span className="text-xs text-[#6B6259] font-medium font-mono tabular-nums">
                      aktiv · {totalPollVotes} Stimmen
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('polls')}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#D9822B]/14 hover:bg-[#D9822B]/22 text-[#9E5A14] border border-[#D9822B]/30 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  <span>Abstimmen</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('ideas')}
                  className="rounded-2xl bg-[#FAF7F2] hover:bg-[#D9822B]/10 border border-[#E6DDD1] hover:border-[#D9822B]/40 px-3.5 py-2.5 text-left transition-all cursor-pointer group min-w-0"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#9E5A14]">
                      <Lightbulb className="w-3.5 h-3.5 text-[#D9822B]" />
                      <span className="truncate">Ideen-Pool</span>
                    </span>
                    <span className="text-sm font-black text-[#1F1B18] font-mono tabular-nums">
                      {ideasCount}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#8C8277] mt-0.5 truncate font-mono tabular-nums">
                    {unscheduledIdeasCount} noch frei
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className="rounded-2xl bg-[#FAF7F2] hover:bg-[#6E7F5E]/10 border border-[#E6DDD1] hover:border-[#6E7F5E]/40 px-3.5 py-2.5 text-left transition-all cursor-pointer group min-w-0"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#4B593E]">
                      <ListChecks className="w-3.5 h-3.5 text-[#6E7F5E]" />
                      <span className="truncate">Aufgaben</span>
                    </span>
                    <span className="text-sm font-black text-[#1F1B18] font-mono tabular-nums">
                      {openTasksCount}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#8C8277] mt-0.5 truncate font-mono tabular-nums">
                    {completedTasksCount} erledigt
                  </p>
                </button>
              </div>
            </div>

            {/* 4. „Als Nächstes steht an“-Highlight-Karte */}
            <div className="surface-glass-elevated rounded-[26px] p-5 flex flex-col justify-between gap-3.5 border-t-2 border-t-[#C85A38]/70 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A34224] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C85A38]" />
                  <span>Als Nächstes steht an</span>
                </span>
                {nextHighlightItem && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#C85A38]/12 text-[#A34224] border border-[#C85A38]/30 font-mono tabular-nums shrink-0">
                    Tag {nextHighlightItem.dayNumber} · {nextHighlightItem.time}
                  </span>
                )}
              </div>

              {nextHighlightItem ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDay(nextHighlightItem.dayNumber);
                      if (nextHighlightItem.kind === 'activity') {
                        setSelectedActivityId(nextHighlightItem.id);
                      } else {
                        setActiveTab('meals');
                        setSearchTarget({
                          tab: 'meals',
                          kind: 'meal',
                          id: nextHighlightItem.id,
                          dayNumber: nextHighlightItem.dayNumber,
                        });
                      }
                    }}
                    className="text-left group cursor-pointer min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A38]"
                  >
                    <h3 className="text-base sm:text-lg font-extrabold text-[#1F1B18] group-hover:text-[#A34224] transition-colors line-clamp-1">
                      {nextHighlightItem.title}
                    </h3>
                    <p className="text-xs text-[#6B6259] mt-0.5 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#2A7B88] shrink-0" />
                      <span className="truncate">
                        {nextHighlightItem.location || trip.destination}
                      </span>
                    </p>
                  </button>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        focusOnMap({
                          kind: nextHighlightItem.kind,
                          id: nextHighlightItem.id,
                          title: nextHighlightItem.title,
                          location: nextHighlightItem.location || trip.destination,
                          lat: nextHighlightItem.lat,
                          lng: nextHighlightItem.lng,
                          dayNumber: nextHighlightItem.dayNumber,
                          time: nextHighlightItem.time,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#2A7B88]/12 hover:bg-[#2A7B88]/20 text-[#1F5E68] border border-[#2A7B88]/30 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Auf Karte</span>
                    </button>

                    {nextMapsUrl && (
                      <a
                        href={nextMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#1F1B18] border border-[#E6DDD1] text-xs font-bold transition-colors"
                      >
                        <span>Maps</span>
                        <ExternalLink className="w-3 h-3 text-[#6B6259]" />
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-3 py-2">
                  <p className="text-xs text-[#6B6259]">
                    Noch keine festen Programmpunkte eingetragen.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#C85A38] hover:bg-[#B54B2B] text-white text-xs font-bold cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Planen</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Multi-Day Activity & Cost Pulse (supports > 7/8 days cleanly!) */}
          {dayStats.length > 0 && (
            <div className="surface-glass rounded-[26px] p-4 sm:p-5 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#C85A38]" />
                  <h2 className="text-xs sm:text-sm font-extrabold text-[#1F1B18]">
                    Tages-Puls & Kostenverlauf (Tag 1–{dayStats.length})
                  </h2>
                </div>
                <span className="text-[11px] text-[#6B6259] font-mono tabular-nums">
                  Tag {selectedDay}:{' '}
                  <strong className="text-[#A34224]">
                    {formatCurrency(
                      dayStats[selectedDay - 1]?.plannedCost || 0,
                      trip.currency
                    )}
                  </strong>{' '}
                  · {dayStats[selectedDay - 1]?.activitiesCount || 0} Akt. /{' '}
                  {dayStats[selectedDay - 1]?.mealsCount || 0} Essen
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 items-end">
                {/* Scrollable Activity Bar Strip across ALL days */}
                <div
                  ref={dayChartScrollRef}
                  className="flex items-end gap-1.5 h-20 overflow-x-auto no-scrollbar pb-1 min-w-0"
                >
                  {dayStats.map((d) => {
                    const isSelected = d.day === selectedDay;
                    const heightPct = Math.max(
                      22,
                      Math.round((d.activitiesCount / maxActivitiesPerDay) * 100)
                    );
                    return (
                      <button
                        key={d.day}
                        type="button"
                        data-chart-day={d.day}
                        onClick={() => setSelectedDay(d.day)}
                        title={`Tag ${d.day}: ${d.activitiesCount} Aktivitäten, ${formatCurrency(
                          d.plannedCost,
                          trip.currency
                        )}`}
                        className="flex flex-col items-center justify-end h-full min-w-[28px] flex-1 cursor-pointer group shrink-0"
                      >
                        <div className="w-full flex-1 flex items-end justify-center">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full max-w-[26px] rounded-full transition-all ${
                              isSelected
                                ? 'bg-gradient-to-t from-[#C85A38] to-[#D9822B] shadow-sm'
                                : d.activitiesCount > 0
                                ? 'bg-[#D8CFC2] group-hover:bg-[#C85A38]/55'
                                : 'bg-[#EDE6DA] group-hover:bg-[#D8CFC2]'
                            }`}
                          />
                        </div>
                        <span
                          className={`text-[10px] mt-1 font-mono tabular-nums font-bold ${
                            isSelected ? 'text-[#A34224]' : 'text-[#8C8277] group-hover:text-[#1F1B18]'
                          }`}
                        >
                          T{d.day}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Full-Trip Cost Curve SVG (every day mapped accurately) */}
                <div className="overflow-x-auto no-scrollbar min-w-0">
                  <svg
                    viewBox={`0 0 ${wavePoints.width} 64`}
                    className="w-full h-16 overflow-visible min-w-[240px]"
                  >
                    <defs>
                      <linearGradient id="costWaveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C85A38" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#C85A38" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {wavePoints.area && (
                      <path d={wavePoints.area} fill="url(#costWaveGradient)" />
                    )}
                    {wavePoints.path && (
                      <path
                        d={wavePoints.path}
                        fill="none"
                        stroke="#C85A38"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    )}
                    {wavePoints.pts.map((pt) => (
                      <circle
                        key={pt.day}
                        cx={pt.x}
                        cy={pt.y}
                        r={pt.day === selectedDay ? 5.5 : 2.5}
                        fill={pt.day === selectedDay ? '#6E7F5E' : '#C85A38'}
                        stroke={pt.day === selectedDay ? '#FAF7F2' : 'none'}
                        strokeWidth={pt.day === selectedDay ? 2 : 0}
                        className="cursor-pointer"
                        onClick={() => setSelectedDay(pt.day)}
                      >
                        <title>
                          {`Tag ${pt.day}: ${formatCurrency(pt.cost, trip.currency)}`}
                        </title>
                      </circle>
                    ))}
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsible Travel & Accommodation InfoBoardCard */}
      <InfoBoardCard />

      {/* Main Stage: Chronological Day Timeline (Left) & Detail Inspector + Activity Log (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6 pt-1 min-w-0">
        {/* Left: Chronological Timeline for selectedDay */}
        <div className="flex flex-col min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-[#1F1B18]">
                Zeitstrahl · Tag {selectedDay}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
                  disabled={selectedDay <= 1}
                  aria-label="Vorheriger Tag"
                  className="w-7 h-7 rounded-full surface-glass hover:border-[#C85A38]/40 disabled:opacity-35 flex items-center justify-center text-[#6B6259] cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedDay(Math.min(Math.max(1, safeTotalDays), selectedDay + 1))
                  }
                  disabled={selectedDay >= Math.max(1, safeTotalDays)}
                  aria-label="Nächster Tag"
                  className="w-7 h-7 rounded-full surface-glass hover:border-[#C85A38]/40 disabled:opacity-35 flex items-center justify-center text-[#6B6259] cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {conflictItemIds.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D9822B]/14 text-[#9E5A14] border border-[#D9822B]/30 text-[11px] font-bold">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="font-mono tabular-nums">
                    {conflictItemIds.length} Konflikte
                  </span>
                </span>
              )}

              {dayRouteUrl && (
                <a
                  href={dayRouteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full surface-glass hover:border-[#6E7F5E]/40 text-[#4B593E] text-[11px] font-bold transition-colors"
                >
                  <Navigation className="w-3 h-3 text-[#6E7F5E]" />
                  <span>Tagesroute in Maps</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setMapOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#2A7B88]/12 hover:bg-[#2A7B88]/20 text-[#1F5E68] border border-[#2A7B88]/30 text-[11px] font-bold transition-colors cursor-pointer"
              >
                <MapPin className="w-3 h-3" />
                <span>Auf Karte</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className="text-xs font-bold text-[#6B6259] hover:text-[#A34224] transition-colors cursor-pointer"
              >
                Alle Tage →
              </button>
            </div>
          </div>

          <div className="space-y-3 relative">
            {dayActivities.length === 0 ? (
              <div className="surface-glass rounded-[24px] p-8 text-center border-dashed border-[#E6DDD1]">
                <Clock className="w-7 h-7 text-[#C85A38]/70 mx-auto mb-2.5" />
                <p className="text-sm font-bold text-[#1F1B18]">
                  Noch keine Programmpunkte an Tag {selectedDay}.
                </p>
                <p className="text-xs text-[#6B6259] mt-1">
                  Füge direkt einen Vorschlag hinzu oder übernimm Highlights aus dem Ideen-Pool.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsQuickAddOpen(true)}
                    className="inline-flex items-center gap-1.5 bg-[#C85A38] hover:bg-[#B54B2B] text-white text-xs font-extrabold px-4 py-2 rounded-full cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Vorschlag hinzufügen</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ideas')}
                    className="inline-flex items-center gap-1.5 surface-glass text-[#9E5A14] text-xs font-bold px-4 py-2 rounded-full hover:border-[#D9822B]/40 cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Zum Ideen-Pool</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative pl-5 space-y-2.5">
                {/* Warm vertical timeline spine */}
                <div className="absolute left-[9px] top-4 bottom-4 w-px bg-gradient-to-b from-[#C85A38]/60 via-[#6E7F5E]/40 to-[#2A7B88]/30 pointer-events-none" />

                {dayActivities.map((act) => {
                  const isSelected = activeActivity?.id === act.id;
                  const catMeta = CATEGORY_META[act.category] || CATEGORY_META.other;
                  const CatIcon = catMeta.icon;
                  const hasVoted = act.votes.includes(currentUser.id);
                  const hasConflict = (dayConflicts[act.id] || []).length > 0;
                  const statusMeta = STATUS_LABELS[act.status];

                  return (
                    <div
                      key={act.id}
                      className={`relative flex items-center justify-between gap-2.5 p-3.5 rounded-[22px] transition-all border min-w-0 ${
                        isSelected
                          ? 'surface-glass-elevated border-[#C85A38]/55 shadow-md'
                          : 'surface-glass hover:border-[#D8CFC2]'
                      }`}
                    >
                      {/* Timeline node */}
                      <span
                        className={`absolute -left-[15px] w-2.5 h-2.5 rounded-full ${statusMeta.dotClass}`}
                      />

                      {/* Keyboard-accessible main selection button (separate from sibling action buttons) */}
                      <button
                        type="button"
                        onClick={() => setSelectedActivityId(act.id)}
                        className="flex-1 flex items-center gap-3 min-w-0 text-left cursor-pointer rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A38]"
                      >
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${catMeta.iconBgClass}`}
                        >
                          <CatIcon className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-[#A34224] font-mono tabular-nums">
                              {act.timeSlot}
                              {act.endTime ? `–${act.endTime}` : ''}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusMeta.badgeClass}`}
                            >
                              {statusMeta.label}
                            </span>
                            {hasConflict && (
                              <span
                                title="Zeitüberschneidung mit anderem Termin"
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D9822B]/14 text-[#9E5A14] border border-[#D9822B]/30"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Konflikt
                              </span>
                            )}
                          </div>

                          <p className="text-sm font-extrabold text-[#1F1B18] truncate mt-0.5">
                            {act.title}
                          </p>
                          {act.location && (
                            <p className="text-xs text-[#6B6259] truncate">
                              {act.location}
                            </p>
                          )}
                        </div>
                      </button>

                      {/* Sibling Actions: Map Focus & Vote */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            focusOnMap({
                              kind: 'activity',
                              id: act.id,
                              title: act.title,
                              location: act.location || trip.destination,
                              lat: act.lat,
                              lng: act.lng,
                              dayNumber: act.dayNumber,
                              time: act.timeSlot,
                            })
                          }
                          title="Auf Karte zeigen"
                          aria-label={`${act.title} auf Karte zeigen`}
                          className="w-8 h-8 rounded-full bg-[#FAF7F2] hover:bg-[#2A7B88]/12 text-[#6B6259] hover:text-[#1F5E68] border border-[#E6DDD1] flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleActivityVote(act.id)}
                          title={`Als ${currentUser.name} abstimmen`}
                          aria-label={`Stimme für ${act.title} (${act.votes.length})`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer font-mono tabular-nums border ${
                            hasVoted
                              ? 'bg-[#C85A38]/12 text-[#A34224] border-[#C85A38]/35'
                              : 'bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#6B6259] border-[#E6DDD1]'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{act.votes.length}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Compact Day Meals Reference Strip */}
            {dayMeals.length > 0 && (
              <div className="surface-glass rounded-[20px] p-3.5 mt-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E5A14] flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-[#D9822B]" />
                    <span>Mahlzeiten an Tag {selectedDay}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('meals')}
                    className="text-[11px] font-bold text-[#6B6259] hover:text-[#9E5A14] cursor-pointer"
                  >
                    Essensplan →
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {dayMeals.map((meal) => (
                    <button
                      key={meal.id}
                      type="button"
                      onClick={() => {
                        setActiveTab('meals');
                        setSearchTarget({
                          tab: 'meals',
                          kind: 'meal',
                          id: meal.id,
                          dayNumber: selectedDay,
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF7F2] hover:bg-[#D9822B]/14 border border-[#E6DDD1] hover:border-[#D9822B]/35 text-xs text-[#1F1B18] transition-colors cursor-pointer max-w-full"
                    >
                      <span className="font-mono tabular-nums text-[#9E5A14] font-bold">
                        {meal.time}
                      </span>
                      <span className="truncate font-semibold">{meal.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Detail Inspector + Group Activity Feed */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Detail Inspector */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-extrabold text-[#1F1B18]">
                Detail-Inspector
              </h2>
              {activeActivity && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('schedule');
                    setSearchTarget({
                      tab: 'schedule',
                      kind: 'activity',
                      id: activeActivity.id,
                      dayNumber: activeActivity.dayNumber,
                    });
                  }}
                  className="text-xs font-bold text-[#A34224] hover:text-[#C85A38] cursor-pointer"
                >
                  Im Tagesplan bearbeiten →
                </button>
              )}
            </div>

            {activeActivity ? (
              <div className="surface-glass-elevated rounded-[26px] p-5 sm:p-6 flex flex-col justify-between space-y-5 min-w-0">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#A34224] font-mono tabular-nums">
                        Tag {activeActivity.dayNumber} · {activeActivity.timeSlot}
                        {activeActivity.endTime ? ` – ${activeActivity.endTime}` : ''} Uhr
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-[#1F1B18] mt-1 break-words">
                        {activeActivity.title}
                      </h3>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                        STATUS_LABELS[activeActivity.status].badgeClass
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {STATUS_LABELS[activeActivity.status].label}
                    </span>
                  </div>

                  {activeConflicts.length > 0 && (
                    <div className="rounded-2xl bg-[#D9822B]/14 border border-[#D9822B]/30 px-3.5 py-2.5 flex items-start gap-2 text-xs text-[#9E5A14]">
                      <AlertTriangle className="w-4 h-4 text-[#D9822B] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Zeitkonflikt am selben Tag</p>
                        <p className="text-[#9E5A14]/90 mt-0.5">
                          Überschneidet sich mit{' '}
                          <span className="font-mono tabular-nums">
                            {activeConflicts.length}
                          </span>{' '}
                          weiteren Eintrag/Einträgen an Tag {activeActivity.dayNumber}.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Location, Map Focus & Cost Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#FAF7F2] text-[#1F1B18] border border-[#E6DDD1] max-w-full">
                      <MapPin className="w-3.5 h-3.5 text-[#2A7B88] shrink-0" />
                      <span className="truncate">
                        {activeActivity.location || trip.destination}
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        focusOnMap({
                          kind: 'activity',
                          id: activeActivity.id,
                          title: activeActivity.title,
                          location: activeActivity.location || trip.destination,
                          lat: activeActivity.lat,
                          lng: activeActivity.lng,
                          dayNumber: activeActivity.dayNumber,
                          time: activeActivity.timeSlot,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#2A7B88]/12 hover:bg-[#2A7B88]/20 text-[#1F5E68] border border-[#2A7B88]/30 transition-colors cursor-pointer"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Auf Karte</span>
                    </button>

                    {activeActivityMapsUrl && (
                      <a
                        href={activeActivityMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#1F1B18] border border-[#E6DDD1] transition-colors"
                      >
                        <span>Maps</span>
                        <ExternalLink className="w-3 h-3 text-[#6B6259]" />
                      </a>
                    )}

                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#6E7F5E]/14 text-[#4B593E] border border-[#6E7F5E]/30 font-mono tabular-nums">
                      <Euro className="w-3.5 h-3.5" />
                      {activeActivity.estimatedCost === 0
                        ? 'Kostenlos'
                        : `~${formatCurrency(activeActivity.estimatedCost, trip.currency)} p.P.`}
                    </span>
                  </div>

                  {/* Description */}
                  {activeActivity.description && (
                    <p className="text-sm text-[#1F1B18] leading-relaxed bg-[#FAF7F2] border border-[#E6DDD1] rounded-2xl p-4 break-words">
                      {activeActivity.description}
                    </p>
                  )}

                  {/* Voters (orphaned IDs NEVER mapped to travelers[0]) */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-xs font-bold text-[#6B6259] font-mono tabular-nums">
                      Stimmen ({activeActivity.votes.length}):
                    </span>
                    {activeActivity.votes.length === 0 ? (
                      <span className="text-xs text-[#8C8277]">Noch keine Stimmen</span>
                    ) : (
                      activeActivity.votes.map((voterId) => {
                        const voter = getTravelerExact(voterId);
                        if (!voter) {
                          return (
                            <span
                              key={voterId}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F3ECE1] border border-[#E6DDD1] text-xs font-semibold text-[#6B6259]"
                            >
                              <span className="w-4 h-4 rounded-full bg-[#D8CFC2] text-[#1F1B18] text-[9px] flex items-center justify-center font-bold">
                                ?
                              </span>
                              Ehem. Mitglied
                            </span>
                          );
                        }
                        return (
                          <span
                            key={voterId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF7F2] border border-[#E6DDD1] text-xs font-bold text-[#1F1B18]"
                          >
                            <span
                              className="w-4 h-4 rounded-full text-[9px] text-white flex items-center justify-center font-black"
                              style={{ backgroundColor: voter.color }}
                            >
                              {voter.initials}
                            </span>
                            {voter.name}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Footer Status & Vote Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E6DDD1]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(['idea', 'planned', 'confirmed'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => updateActivityStatus(activeActivity.id, st)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                          activeActivity.status === st
                            ? 'bg-[#C85A38] text-white border-[#C85A38] shadow-sm'
                            : 'bg-[#FAF7F2] text-[#6B6259] border-[#E6DDD1] hover:bg-[#F3ECE1]'
                        }`}
                      >
                        {STATUS_LABELS[st].label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleActivityVote(activeActivity.id)}
                    className={`inline-flex items-center gap-2 text-xs font-extrabold px-5 py-2 rounded-full transition-all cursor-pointer border ${
                      activeActivity.votes.includes(currentUser.id)
                        ? 'bg-[#6E7F5E]/14 text-[#4B593E] border-[#6E7F5E]/35'
                        : 'bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#1F1B18] border-[#E6DDD1]'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-[#C85A38]" />
                    <span>
                      {activeActivity.votes.includes(currentUser.id)
                        ? 'Stimme aktiv'
                        : 'Dafür stimmen'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="surface-glass rounded-[26px] p-8 text-center flex flex-col items-center justify-center border-dashed border-[#E6DDD1]">
                <Clock className="w-8 h-8 text-[#8C8277] mb-2.5" />
                <p className="text-sm font-bold text-[#1F1B18]">
                  Kein Programmpunkt für Tag {selectedDay} ausgewählt
                </p>
                <p className="text-xs text-[#6B6259] mt-1 max-w-xs">
                  Wähle einen Termin im Zeitstrahl oder lege einen neuen Vorschlag für diesen Tag an.
                </p>
              </div>
            )}
          </div>

          {/* Kleiner Gruppen-Aktivitätsfeed */}
          <div className="surface-glass rounded-[24px] p-4 sm:p-5 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6E7F5E]" />
                <h3 className="text-sm font-extrabold text-[#1F1B18]">
                  Gruppen-Aktivitätsfeed
                </h3>
              </div>
              {activityLogs.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllLogs((p) => !p)}
                  className="text-[11px] font-bold text-[#A34224] hover:text-[#C85A38] cursor-pointer"
                >
                  {showAllLogs ? 'Weniger' : `Alle (${activityLogs.length})`}
                </button>
              )}
            </div>

            {visibleLogs.length === 0 ? (
              <p className="text-xs text-[#6B6259] py-2">
                Noch keine Aktivitäten im Gruppenverlauf erfasst.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {visibleLogs.map((entry) => {
                  const actor = getTravelerExact(entry.actorId);
                  return (
                    <div
                      key={entry.id}
                      className="flex items-start justify-between gap-2.5 rounded-xl bg-[#FAF7F2] border border-[#E6DDD1] px-3 py-2 text-xs min-w-0"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className="w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 text-white"
                          style={{ backgroundColor: actor?.color || '#8C8277' }}
                        >
                          {actor?.initials || '?'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[#6B6259] leading-snug break-words">
                            <strong className="text-[#1F1B18]">
                              {actor?.name || 'Mitglied'}
                            </strong>{' '}
                            {entry.action}{' '}
                            {entry.targetLabel && (
                              <span className="text-[#A34224] font-semibold">
                                „{entry.targetLabel}“
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-[#8C8277] font-mono tabular-nums shrink-0 mt-0.5">
                        {formatRelativeTime(entry.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
