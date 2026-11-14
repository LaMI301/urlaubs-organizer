import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';

const STORE_NAME = 'vacayly-trips-store';
const TRIPS_KEY = 'all-trips';

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

export default async (req: Request, _context: Context): Promise<Response> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const store = getStore(STORE_NAME);

    if (req.method === 'GET') {
      const existing = await store.get(TRIPS_KEY, { type: 'json' });
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
      const body = await req.json();
      const incomingTrip = body?.trip as StoredTrip | undefined;
      if (!incomingTrip || typeof incomingTrip.id !== 'string' || !incomingTrip.id.trim()) {
        return new Response(
          JSON.stringify({ error: 'Missing valid trip object in request body' }),
          { status: 400, headers }
        );
      }

      const existing = await store.get(TRIPS_KEY, { type: 'json' });
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
        await store.setJSON(TRIPS_KEY, currentTrips);
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

      const existing = await store.get(TRIPS_KEY, { type: 'json' });
      const currentTrips: StoredTrip[] = Array.isArray(existing) ? existing : [];
      const remaining = currentTrips.filter((t) => t.id !== id);

      if (remaining.length !== currentTrips.length) {
        await store.setJSON(TRIPS_KEY, remaining);
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
