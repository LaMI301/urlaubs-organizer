import {
  CurrencyCode,
  DayActivity,
  ExpenseItem,
  MealPlan,
  Settlement,
  Traveler,
} from '../types/vacation';

const GEO_CACHE_KEY = 'vo_geo_cache_v1';
const GEO_RATE_LIMIT_MS = 1000;
const GEO_FETCH_TIMEOUT_MS = 1500;

let lastGeocodeTimestamp = 0;
let geocodeQueue: Promise<unknown> = Promise.resolve();

const GENERIC_PLACEHOLDER_PATTERNS = [
  /^vor ort$/i,
  /^restaurant vor ort$/i,
  /^gemeinsames essen$/i,
  /^zielort$/i,
  /^unterkunft$/i,
  /^finca(-?(küche|außenküche|terrasse|garten|poolterrasse))?$/i,
  /^steingrill im finca-garten$/i,
  /^lokales restaurant(\s+in\s+der\s+nähe)?$/i,
  /^tbd$/i,
  /^k\.?\s*a\.?$/i,
  /^n\/a$/i,
  /^keine angabe$/i,
  /^[-–—?.\s]+$/,
];

const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  EUR: 'de-DE',
  CHF: 'de-CH',
  GBP: 'en-GB',
  USD: 'en-US',
};

/**
 * Checks whether a location string is empty or a generic non-mappable placeholder.
 */
export function isGenericLocation(location?: string): boolean {
  if (!location) return true;
  const trimmed = location.trim();
  if (trimmed.length < 2) return true;
  return GENERIC_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function parseHttpUrl(value: string): URL | null {
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Builds a clean Google Maps link for a location or preserves an existing http/https URL
 * without double-encoding. Returns null for empty or generic placeholder strings.
 */
export function buildGoogleMapsUrl(location?: string): string | null {
  if (!location) return null;
  const trimmed = location.trim();
  if (isGenericLocation(trimmed)) return null;

  const directUrl = parseHttpUrl(trimmed);
  if (directUrl) {
    return directUrl.toString();
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
}

/**
 * Builds a multi-stop Google Maps directions URL for >= 2 valid locations,
 * a single search URL for 1 valid location, or null if none are valid.
 */
export function buildGoogleMapsDayRouteUrl(
  locations: (string | undefined)[]
): string | null {
  const cleaned: string[] = [];
  for (const raw of locations) {
    if (!raw) continue;
    const trimmed = raw.trim();
    if (isGenericLocation(trimmed)) continue;
    // Skip raw URLs when building /dir/ segments unless there is only 1 item total
    if (cleaned.length > 0 && cleaned[cleaned.length - 1].toLowerCase() === trimmed.toLowerCase()) {
      continue;
    }
    cleaned.push(trimmed);
  }

  if (cleaned.length === 0) return null;
  if (cleaned.length === 1) {
    return buildGoogleMapsUrl(cleaned[0]);
  }

  const routable = cleaned.filter((loc) => !parseHttpUrl(loc));
  if (routable.length === 0) {
    return buildGoogleMapsUrl(cleaned[0]);
  }
  if (routable.length === 1) {
    return buildGoogleMapsUrl(routable[0]);
  }

  return `https://www.google.com/maps/dir/${routable
    .map((loc) => encodeURIComponent(loc))
    .join('/')}`;
}

/**
 * Rounds a numeric value cleanly to 2 decimal places without binary float artifacts.
 */
export function roundCents(val: number): number {
  if (!Number.isFinite(val)) return 0;
  const sign = val < 0 ? -1 : 1;
  const rounded = Math.round((Math.abs(val) + 1e-9) * 100) / 100;
  return rounded === 0 ? 0 : sign * rounded;
}

/**
 * Parses and clamps a cost input to a non-negative finite value rounded to cents,
 * returning undefined when empty or non-numeric.
 */
export function clampCost(val: unknown): number | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'string') {
    const normalized = val.trim().replace(',', '.');
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return undefined;
    return roundCents(Math.max(0, parsed));
  }
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return undefined;
    return roundCents(Math.max(0, val));
  }
  return undefined;
}

/**
 * Formats an amount in the trip currency cleanly without floating point noise.
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'EUR'
): string {
  const safe = roundCents(Number.isFinite(amount) ? amount : 0);
  const totalCents = Math.round(safe * 100);
  const hasDecimals = Math.abs(totalCents % 100) !== 0;
  const locale = CURRENCY_LOCALES[currency] || 'de-DE';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    }).format(safe);
  } catch {
    return `${hasDecimals ? safe.toFixed(2) : String(Math.round(safe))} ${currency}`;
  }
}

/**
 * Computes cent-accurate minimum transfer settlements ("who owes whom how much").
 */
export function calculateSettlements(
  expenses: ExpenseItem[],
  travelers: Traveler[]
): Settlement[] {
  if (!Array.isArray(expenses) || !Array.isArray(travelers) || travelers.length === 0) {
    return [];
  }

  const validIds = new Set(travelers.map((t) => t.id));
  const balances = new Map<string, number>();
  travelers.forEach((t) => balances.set(t.id, 0));

  for (const expense of expenses) {
    if (!expense || !validIds.has(expense.paidBy)) continue;
    const rawAmount = Number(expense.amount);
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) continue;

    const totalCents = Math.round(roundCents(rawAmount) * 100);
    if (totalCents <= 0) continue;

    const uniqueSplit = Array.from(
      new Set((expense.splitBetween || []).filter((id) => validIds.has(id)))
    );
    const participants =
      uniqueSplit.length > 0 ? uniqueSplit : travelers.map((t) => t.id);

    balances.set(expense.paidBy, (balances.get(expense.paidBy) || 0) + totalCents);

    const baseShare = Math.floor(totalCents / participants.length);
    const remainder = totalCents % participants.length;

    participants.forEach((participantId, idx) => {
      const share = baseShare + (idx < remainder ? 1 : 0);
      balances.set(participantId, (balances.get(participantId) || 0) - share);
    });
  }

  const debtors: Array<{ id: string; cents: number }> = [];
  const creditors: Array<{ id: string; cents: number }> = [];

  balances.forEach((cents, id) => {
    if (cents < 0) {
      debtors.push({ id, cents: -cents });
    } else if (cents > 0) {
      creditors.push({ id, cents });
    }
  });

  debtors.sort((a, b) => b.cents - a.cents || a.id.localeCompare(b.id));
  creditors.sort((a, b) => b.cents - a.cents || a.id.localeCompare(b.id));

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const transferCents = Math.min(debtor.cents, creditor.cents);

    if (transferCents > 0) {
      settlements.push({
        fromId: debtor.id,
        toId: creditor.id,
        amount: transferCents / 100,
      });
    }

    debtor.cents -= transferCents;
    creditor.cents -= transferCents;

    if (debtor.cents === 0) i++;
    if (creditor.cents === 0) j++;
  }

  return settlements;
}

/**
 * Parses an HH:MM string into total minutes since midnight, or null if invalid.
 */
export function parseTimeToMinutes(t?: string): number | null {
  if (!t) return null;
  const match = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(t);
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(mins)) return null;
  if (mins < 0 || mins > 59) return null;
  if (hours === 24 && mins === 0) return 1440;
  if (hours < 0 || hours > 23) return null;
  return hours * 60 + mins;
}

/**
 * Normalizes a valid time string like "9:30" to zero-padded "09:30".
 */
export function normalizeTimeSlot(t?: string): string {
  const mins = parseTimeToMinutes(t);
  if (mins === null) return (t || '').trim();
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Chronologically compares two time strings ("9:30" vs "10:00").
 */
export function compareTimeSlots(a?: string, b?: string): number {
  const minA = parseTimeToMinutes(a);
  const minB = parseTimeToMinutes(b);
  if (minA !== null && minB !== null) return minA - minB;
  if (minA !== null) return -1;
  if (minB !== null) return 1;
  return (a || '').localeCompare(b || '');
}

/**
 * Checks whether an optional end time is strictly after the start time.
 */
export function isValidTimeRange(start?: string, end?: string): boolean {
  if (!end || !end.trim()) return true;
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);
  if (startMin === null || endMin === null) return false;
  return endMin > startMin;
}

/**
 * Detects overlapping scheduled activities (excluding status === 'idea') and meals
 * on a given day. Returns a map of itemId -> conflicting item IDs.
 */
export function detectDayConflicts(
  activities: DayActivity[],
  meals: MealPlan[],
  dayNumber: number
): Record<string, string[]> {
  interface TimeSpan {
    id: string;
    start: number;
    end: number;
  }

  const spans: TimeSpan[] = [];

  for (const act of activities) {
    if (act.dayNumber !== dayNumber || act.status === 'idea') continue;
    const start = parseTimeToMinutes(act.timeSlot);
    if (start === null) continue;
    const parsedEnd = parseTimeToMinutes(act.endTime);
    const end = parsedEnd !== null && parsedEnd > start ? parsedEnd : start + 60;
    spans.push({ id: act.id, start, end });
  }

  for (const meal of meals) {
    if (meal.dayNumber !== dayNumber) continue;
    const start = parseTimeToMinutes(meal.time);
    if (start === null) continue;
    spans.push({ id: meal.id, start, end: start + 30 });
  }

  const conflicts: Record<string, string[]> = {};

  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      const a = spans[i];
      const b = spans[j];
      // Strict overlap check; touching boundaries (a.end === b.start) do not conflict
      if (a.start < b.end && b.start < a.end) {
        if (!conflicts[a.id]) conflicts[a.id] = [];
        if (!conflicts[b.id]) conflicts[b.id] = [];
        if (!conflicts[a.id].includes(b.id)) conflicts[a.id].push(b.id);
        if (!conflicts[b.id].includes(a.id)) conflicts[b.id].push(a.id);
      }
    }
  }

  return conflicts;
}

/**
 * Computes Unicode- and emoji-safe initials from a display name.
 */
export function getSafeInitials(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return 'UR';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = [...parts[0]][0] || '';
    const second = [...parts[1]][0] || '';
    return `${first}${second}`.toUpperCase() || 'UR';
  }
  const chars = [...parts[0]];
  return chars.slice(0, 2).join('').toUpperCase() || 'UR';
}

interface GeoCacheEntry {
  lat: number;
  lng: number;
}

function readGeoCache(): Record<string, GeoCacheEntry> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeGeoCache(cache: Record<string, GeoCacheEntry>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore localStorage quota / private browsing errors
  }
}

function extractCoordsFromMapsUrl(query: string): GeoCacheEntry | null {
  const atMatch = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(query);
  if (atMatch) {
    const lat = Number(atMatch[1]);
    const lng = Number(atMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const qMatch = /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(query);
  if (qMatch) {
    const lat = Number(qMatch[1]);
    const lng = Number(qMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

/**
 * Geocodes a place string via OpenStreetMap Nominatim with localStorage caching
 * (`vo_geo_cache_v1`), 1s rate-guard, timeout protection, and silent offline fallback.
 */
export function geocodePlace(
  query: string
): Promise<{ lat: number; lng: number } | null> {
  const trimmed = query.trim();
  if (isGenericLocation(trimmed)) {
    return Promise.resolve(null);
  }

  const directCoords = extractCoordsFromMapsUrl(trimmed);
  if (directCoords) {
    return Promise.resolve(directCoords);
  }

  if (parseHttpUrl(trimmed)) {
    return Promise.resolve(null);
  }

  const cacheKey = trimmed.toLowerCase();
  const cache = readGeoCache();
  const cached = cache[cacheKey];
  if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lng)) {
    return Promise.resolve({ lat: cached.lat, lng: cached.lng });
  }

  if (typeof fetch !== 'function') {
    return Promise.resolve(null);
  }

  const task = geocodeQueue.then(async (): Promise<{ lat: number; lng: number } | null> => {
    // Re-check cache in case a queued duplicate already resolved it
    const latestCache = readGeoCache();
    const latestHit = latestCache[cacheKey];
    if (latestHit && Number.isFinite(latestHit.lat) && Number.isFinite(latestHit.lng)) {
      return { lat: latestHit.lat, lng: latestHit.lng };
    }

    const now = Date.now();
    const elapsed = now - lastGeocodeTimestamp;
    if (lastGeocodeTimestamp > 0 && elapsed < GEO_RATE_LIMIT_MS) {
      await new Promise((resolve) =>
        setTimeout(resolve, GEO_RATE_LIMIT_MS - elapsed)
      );
    }

    const controller =
      typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), GEO_FETCH_TIMEOUT_MS)
      : null;

    try {
      lastGeocodeTimestamp = Date.now();
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
        trimmed
      )}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller?.signal,
      });
      if (!res.ok) return null;

      const results = (await res.json()) as Array<{ lat?: string; lon?: string }>;
      if (!Array.isArray(results) || results.length === 0) return null;

      const lat = Number(results[0]?.lat);
      const lng = Number(results[0]?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const updatedCache = readGeoCache();
      updatedCache[cacheKey] = { lat, lng };
      writeGeoCache(updatedCache);

      return { lat, lng };
    } catch {
      return null;
    } finally {
      if (timeoutId !== null) clearTimeout(timeoutId);
    }
  });

  geocodeQueue = task.catch(() => null);
  return task;
}

/**
 * Parses YYYY-MM-DD safely in local time without UTC midnight shift.
 */
export function parseLocalDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) {
    const fallback = new Date(dateStr);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Formats the calendar date for a given 1-based trip day number.
 */
export function formatTripDayDate(
  startDate: string,
  dayNumber: number,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }
): string {
  const base = parseLocalDate(startDate);
  if (!base) return `Tag ${dayNumber}`;
  const target = new Date(base.getFullYear(), base.getMonth(), base.getDate() + (dayNumber - 1));
  return target.toLocaleDateString('de-DE', options);
}

export const ACCESS_HASH_SALT = 'vo-london-salt-2026-v1:';
export const DEFAULT_ACCESS_HASH =
  '8455f8ba650f8d8312b5d00b7314c8a4f5146f716813a2408eafcf8361e8c718';

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function encodeUtf8Bytes(input: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff) {
      const next = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
      if (next >= 0xdc00 && next <= 0xdfff) {
        const cp = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        bytes.push(
          0xf0 | (cp >> 18),
          0x80 | ((cp >> 12) & 0x3f),
          0x80 | ((cp >> 6) & 0x3f),
          0x80 | (cp & 0x3f)
        );
        i++;
      } else {
        bytes.push(0xef, 0xbf, 0xbd);
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      bytes.push(0xef, 0xbf, 0xbd);
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Synchronous pure-TypeScript UTF-8 SHA-256 returning a lowercase 64-char hex digest.
 * Works in plain HTTP LAN browsers where window.crypto.subtle is unavailable.
 */
export function sha256Hex(input: string): string {
  const msg = encodeUtf8Bytes(input);
  const msgLen = msg.length;
  const paddedLen = Math.ceil((msgLen + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(msg);
  padded[msgLen] = 0x80;

  const bitLenHigh = Math.floor(msgLen / 0x20000000);
  const bitLenLow = (msgLen << 3) >>> 0;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, bitLenHigh, false);
  view.setUint32(paddedLen - 4, bitLenLow, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((word) => word.toString(16).padStart(8, '0'))
    .join('');
}

/**
 * Computes the salted SHA-256 access hash for a trimmed raw password.
 */
export function computeAccessHash(rawPassword: string): string {
  return sha256Hex(`${ACCESS_HASH_SALT}${rawPassword.trim()}`);
}
