import { createHash, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';

const STORE_NAME = 'vacayly-trips-store';
const TRIPS_KEY = 'all-trips';
const ACCESS_HASH_SALT = 'vo-london-salt-2026-v1:';
const DEFAULT_ACCESS_HASH = (
  process.env.VACATION_ACCESS_HASH?.trim() ||
  'a78c236769256eec0d9e42dc125c51e02c5192f5ce5cf63000ab76b7d0106279'
)
  .trim()
  .toLowerCase();
const ACCESS_HASH_STORE_KEY = 'access-hash-v2';

const utf8Encoder = new TextEncoder();

interface StoredTrip {
  id: string;
  updatedAt?: string;
  [key: string]: unknown;
}

function parseTimestampMs(iso?: string): number {
  if (!iso || typeof iso !== 'string') return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function extractAuthToken(req: Request): string {
  const authHeader = req.headers.get('authorization')?.trim() || '';
  if (/^bearer\s+/i.test(authHeader)) {
    const bearerToken = authHeader.replace(/^bearer\s+/i, '').trim();
    if (bearerToken) return bearerToken;
  }
  return req.headers.get('x-access-key')?.trim() || '';
}

function timingSafeEqualUtf8(a: string, b: string): boolean {
  const bufA = utf8Encoder.encode(a);
  const bufB = utf8Encoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength) return false;
  return timingSafeEqual(bufA, bufB);
}

function unauthorizedResponse(headers: Record<string, string>): Response {
  return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
    status: 401,
    headers,
  });
}

export default async (req: Request, _context: Context): Promise<Response> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Access-Key',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const token = extractAuthToken(req);
  if (!token) {
    return unauthorizedResponse(headers);
  }

  let store: ReturnType<typeof getStore> | null = null;
  let expectedHash = DEFAULT_ACCESS_HASH;
  try {
    store = getStore(STORE_NAME);
    const storedHash = await store.get(ACCESS_HASH_STORE_KEY, { type: 'text' });
    if (typeof storedHash === 'string' && storedHash.trim()) {
      expectedHash = storedHash.trim().toLowerCase();
    }
  } catch {
    // Fallback to DEFAULT_ACCESS_HASH if Netlify Blobs store is unavailable locally
  }

  const hashOfRaw = createHash('sha256')
    .update(ACCESS_HASH_SALT + token, 'utf8')
    .digest('hex');
  const matchesRawHash = timingSafeEqualUtf8(hashOfRaw, expectedHash);

  if (!matchesRawHash) {
    return unauthorizedResponse(headers);
  }

  try {
    const activeStore = store ?? getStore(STORE_NAME);

    if (req.method === 'GET') {
      const existing = await activeStore.get(TRIPS_KEY, { type: 'json' });
      const trips: StoredTrip[] = Array.isArray(existing) ? existing : [];
      const url = new URL(req.url);
      const id = url.searchParams.get('id')?.trim();
      if (id) {
        const match = trips.find((t) => t.id === id) || null;
        return new Response(JSON.stringify({ trip: match, trips: match ? [match] : [] }), {
          status: 200,
          headers,
        });
      }
      return new Response(JSON.stringify({ trips }), {
        status: 200,
        headers,
      });
    }

    if (req.method === 'POST') {
      let body: { action?: unknown; newAccessHash?: unknown; trip?: StoredTrip };
      try {
        body = (await req.json()) as {
          action?: unknown;
          newAccessHash?: unknown;
          trip?: StoredTrip;
        };
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid JSON request body' }),
          { status: 400, headers }
        );
      }

      if (body?.action === 'updateAccessHash') {
        if (typeof body?.newAccessHash !== 'string' || !/^[0-9a-f]{64}$/i.test(body.newAccessHash)) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Invalid newAccessHash' }),
            { status: 400, headers }
          );
        }
        await activeStore.set(ACCESS_HASH_STORE_KEY, body.newAccessHash.toLowerCase());
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers,
        });
      }

      const incomingTrip = body?.trip;
      if (!incomingTrip || typeof incomingTrip.id !== 'string' || !incomingTrip.id.trim()) {
        return new Response(
          JSON.stringify({ error: 'Missing valid trip object in request body' }),
          { status: 400, headers }
        );
      }

      const existing = await activeStore.get(TRIPS_KEY, { type: 'json' });
      const currentTrips: StoredTrip[] = Array.isArray(existing) ? existing : [];

      const normalizedIncoming: StoredTrip = {
        ...incomingTrip,
        updatedAt:
          typeof incomingTrip.updatedAt === 'string' && incomingTrip.updatedAt
            ? incomingTrip.updatedAt
            : new Date().toISOString(),
      };

      const index = currentTrips.findIndex((t) => t.id === normalizedIncoming.id);
      let staleIgnored = false;

      if (index >= 0) {
        const existingTrip = currentTrips[index];
        const existingMs = parseTimestampMs(existingTrip.updatedAt);
        const incomingMs = parseTimestampMs(normalizedIncoming.updatedAt);
        if (existingMs > 0 && incomingMs > 0 && existingMs > incomingMs) {
          staleIgnored = true;
        } else {
          currentTrips[index] = normalizedIncoming;
        }
      } else {
        currentTrips.unshift(normalizedIncoming);
      }

      if (!staleIgnored) {
        await activeStore.setJSON(TRIPS_KEY, currentTrips);
      }

      return new Response(
        JSON.stringify({
          ok: true,
          staleIgnored,
          trip: index >= 0 ? currentTrips[index] : normalizedIncoming,
          trips: currentTrips,
        }),
        { status: 200, headers }
      );
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      let id = url.searchParams.get('id')?.trim();
      if (!id) {
        try {
          const body = await req.json();
          if (typeof body?.id === 'string') {
            id = body.id.trim();
          }
        } catch {
          // Body may be empty for DELETE with query param
        }
      }

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Missing trip id query parameter (?id=...)' }),
          { status: 400, headers }
        );
      }

      const existing = await activeStore.get(TRIPS_KEY, { type: 'json' });
      const currentTrips: StoredTrip[] = Array.isArray(existing) ? existing : [];
      const remaining = currentTrips.filter((t) => t.id !== id);

      if (remaining.length !== currentTrips.length) {
        await activeStore.setJSON(TRIPS_KEY, remaining);
      }

      return new Response(
        JSON.stringify({ ok: true, deletedId: id, trips: remaining }),
        { status: 200, headers }
      );
    }

    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers,
    });
  } catch (error) {
    // Graceful fallback if Netlify Blobs is not configured in local environment
    return new Response(
      JSON.stringify({
        ok: false,
        trips: [],
        message: 'Local mode active (Netlify Blobs store unavailable)',
        detail: error instanceof Error ? error.message : String(error),
      }),
      { status: 200, headers }
    );
  }
};
