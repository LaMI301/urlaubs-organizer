import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';

const STORE_NAME = 'vacayly-trips-store';
const TRIPS_KEY = 'all-trips';

export default async (req: Request, _context: Context): Promise<Response> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const store = getStore(STORE_NAME);

    if (req.method === 'GET') {
      const existing = await store.get(TRIPS_KEY, { type: 'json' });
      const trips = Array.isArray(existing) ? existing : [];
      return new Response(JSON.stringify({ trips }), {
        status: 200,
        headers,
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const incomingTrip = body?.trip;
      if (!incomingTrip || !incomingTrip.id) {
        return new Response(
          JSON.stringify({ error: 'Missing valid trip object in request body' }),
          { status: 400, headers }
        );
      }

      const existing = await store.get(TRIPS_KEY, { type: 'json' });
      const currentTrips: Array<{ id: string }> = Array.isArray(existing) ? existing : [];

      const index = currentTrips.findIndex((t) => t.id === incomingTrip.id);
      if (index >= 0) {
        currentTrips[index] = incomingTrip;
      } else {
        currentTrips.unshift(incomingTrip);
      }

      await store.setJSON(TRIPS_KEY, currentTrips);

      return new Response(JSON.stringify({ ok: true, trips: currentTrips }), {
        status: 200,
        headers,
      });
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
