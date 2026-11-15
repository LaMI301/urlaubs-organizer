import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Map as MapIcon,
  X,
  Navigation,
  ExternalLink,
  Home,
  UtensilsCrossed,
  Compass,
  Lightbulb,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Loader2,
  WifiOff,
  Sparkles,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import {
  buildGoogleMapsDayRouteUrl,
  buildGoogleMapsUrl,
  compareTimeSlots,
  formatTripDayDate,
  geocodePlace,
  isGenericLocation,
} from '../utils/vacationHelpers';
import { MapFocusTarget, NavigationTab } from '../types/vacation';

type MapFilter = 'all' | 'activity' | 'meal' | 'idea' | 'accommodation';
type TileMode = 'carto' | 'osm' | 'offline';

interface MapPinItem {
  pinKey: string;
  sourceId: string;
  kind: MapFocusTarget['kind'];
  title: string;
  location: string;
  dayNumber?: number;
  time?: string;
  subtitle?: string;
  lat?: number;
  lng?: number;
  routeNumber?: number;
  isFocusOnly?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const FILTER_OPTIONS: { id: MapFilter; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'activity', label: 'Aktivitäten' },
  { id: 'meal', label: 'Essen' },
  { id: 'idea', label: 'Ideen' },
  { id: 'accommodation', label: 'Unterkunft' },
];

const KIND_STYLE: Record<
  MapFocusTarget['kind'],
  { color: string; glow: string; badgeBg: string; label: string }
> = {
  activity: {
    color: '#C85A38',
    glow: 'rgba(200, 90, 56, 0.25)',
    badgeBg: 'bg-[#C85A38]/12 text-[#9E3F22] border-[#C85A38]/30',
    label: 'Aktivität',
  },
  meal: {
    color: '#4E5F40',
    glow: 'rgba(110, 127, 94, 0.28)',
    badgeBg: 'bg-[#6E7F5E]/14 text-[#4E5F40] border-[#6E7F5E]/30',
    label: 'Essen',
  },
  idea: {
    color: '#D9822B',
    glow: 'rgba(217, 130, 43, 0.28)',
    badgeBg: 'bg-[#D9822B]/14 text-[#9E5A14] border-[#D9822B]/30',
    label: 'Idee',
  },
  accommodation: {
    color: '#2A7B88',
    glow: 'rgba(42, 123, 136, 0.28)',
    badgeBg: 'bg-[#2A7B88]/12 text-[#1F5E68] border-[#2A7B88]/30',
    label: 'Unterkunft',
  },
  place: {
    color: '#2A7B88',
    glow: 'rgba(42, 123, 136, 0.28)',
    badgeBg: 'bg-[#2A7B88]/12 text-[#1F5E68] border-[#2A7B88]/30',
    label: 'Ort',
  },
};

export const MapCockpitPanel: React.FC = () => {
  const {
    trip,
    selectedDay,
    setSelectedDay,
    selectedActivityId,
    setSelectedActivityId,
    setActiveTab,
    setMapOpen,
    mapFocusTarget,
    setMapFocusTarget,
    setSearchTarget,
    setIsQuickAddOpen,
  } = useVacation();

  const [filter, setFilter] = useState<MapFilter>('all');
  const [dayScope, setDayScope] = useState<'day' | 'all'>('day');
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');
  const [selectedPinKey, setSelectedPinKey] = useState<string | null>(null);
  const [resolvedCoords, setResolvedCoords] = useState<
    Record<string, { lat: number; lng: number } | null>
  >({});
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [tileMode, setTileMode] = useState<TileMode>(() =>
    typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'carto'
  );

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());
  const tileErrorsRef = useRef<number>(0);
  const tileSuccessRef = useRef<boolean>(false);
  const lastFittedKeyRef = useRef<string>('');

  // React live to external focusOnMap(...) requests (only when mapFocusTarget changes)
  useEffect(() => {
    if (!mapFocusTarget) return;

    if (
      typeof mapFocusTarget.dayNumber === 'number' &&
      mapFocusTarget.dayNumber >= 1 &&
      mapFocusTarget.dayNumber <= (trip.totalDays || 1)
    ) {
      setSelectedDay(mapFocusTarget.dayNumber);
      setDayScope('day');
    }

    if (mapFocusTarget.kind !== 'place') {
      setFilter((prev) =>
        prev !== 'all' && prev !== mapFocusTarget.kind ? 'all' : prev
      );
    }

    const focusKey = `${mapFocusTarget.kind}-${mapFocusTarget.id}`;
    setSelectedPinKey(focusKey);
    setMobileView('map');

    if (mapFocusTarget.kind === 'activity') {
      setSelectedActivityId(mapFocusTarget.id);
    }
  }, [mapFocusTarget, trip.totalDays, setSelectedDay, setSelectedActivityId]);

  // Build candidate map items from trip data
  const allPins = useMemo<MapPinItem[]>(() => {
    const items: MapPinItem[] = [];

    // 1. Accommodation basecamp
    const info = trip.info;
    const accLoc = info?.address?.trim() || info?.accommodationName?.trim() || '';
    if (
      info &&
      (typeof info.lat === 'number' ||
        (accLoc && !isGenericLocation(accLoc)) ||
        info.accommodationName)
    ) {
      items.push({
        pinKey: 'accommodation-accommodation',
        sourceId: 'accommodation',
        kind: 'accommodation',
        title: info.accommodationName || 'Unterkunft',
        location: accLoc || trip.destination,
        subtitle: info.checkinCode ? `Check-in: ${info.checkinCode}` : 'Basecamp',
        lat: info.lat,
        lng: info.lng,
      });
    }

    // 2. Chronological route items (Activities & Meals)
    const filteredActivities = trip.activities
      .filter((a) => (dayScope === 'day' ? a.dayNumber === selectedDay : true))
      .map((a) => ({
        pinKey: `activity-${a.id}`,
        sourceId: a.id,
        kind: 'activity' as const,
        title: a.title,
        location: a.location,
        dayNumber: a.dayNumber,
        time: a.timeSlot,
        subtitle: a.status === 'idea' ? 'Vorschlag' : a.category,
        lat: a.lat,
        lng: a.lng,
      }));

    const filteredMeals = trip.meals
      .filter((m) => (dayScope === 'day' ? m.dayNumber === selectedDay : true))
      .map((m) => ({
        pinKey: `meal-${m.id}`,
        sourceId: m.id,
        kind: 'meal' as const,
        title: m.title,
        location: m.locationOrRecipe,
        dayNumber: m.dayNumber,
        time: m.time,
        subtitle: m.style === 'cook' ? 'Gemeinsam kochen' : 'Auswärts / Essen',
        lat: m.lat,
        lng: m.lng,
      }));

    const combinedRouteItems = [...filteredActivities, ...filteredMeals].sort((a, b) => {
      const dayDiff = (a.dayNumber || 1) - (b.dayNumber || 1);
      if (dayDiff !== 0) return dayDiff;
      return compareTimeSlots(a.time, b.time);
    });

    // Assign route numbers 1, 2, 3...
    let routeCounter = 1;
    combinedRouteItems.forEach((item) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'activity' && item.kind === 'activity') ||
        (filter === 'meal' && item.kind === 'meal');
      if (matchesFilter) {
        items.push({
          ...item,
          routeNumber: routeCounter++,
        });
      }
    });

    // 3. Ideas (shown in 'idea' filter, 'all' dayScope, or when assigned to selectedDay)
    const showIdeas =
      filter === 'idea' || filter === 'all';
    if (showIdeas) {
      const ideasList = (trip.ideas || []).filter((idea) => {
        if (filter === 'idea' || dayScope === 'all') return true;
        if (idea.assignedDay === selectedDay) return true;
        if (
          mapFocusTarget?.kind === 'idea' &&
          mapFocusTarget.id === idea.id
        ) {
          return true;
        }
        return false;
      });

      ideasList.forEach((idea) => {
        items.push({
          pinKey: `idea-${idea.id}`,
          sourceId: idea.id,
          kind: 'idea',
          title: idea.title,
          location: idea.location || '',
          dayNumber: idea.assignedDay,
          subtitle: idea.assignedDay ? `Geplant für Tag ${idea.assignedDay}` : 'Ideen-Pool',
          lat: idea.lat,
          lng: idea.lng,
        });
      });
    }

    // Filter out items that don't match explicit non-'all' filter
    const finalItems = items.filter((item) => {
      if (filter === 'all') return true;
      return item.kind === filter;
    });

    // 4. Inject ad-hoc mapFocusTarget if not already in finalItems
    if (mapFocusTarget) {
      const targetKey = `${mapFocusTarget.kind}-${mapFocusTarget.id}`;
      const alreadyPresent = finalItems.some((item) => item.pinKey === targetKey);
      if (!alreadyPresent) {
        finalItems.unshift({
          pinKey: targetKey,
          sourceId: mapFocusTarget.id,
          kind: mapFocusTarget.kind,
          title: mapFocusTarget.title,
          location: mapFocusTarget.location,
          dayNumber: mapFocusTarget.dayNumber,
          time: mapFocusTarget.time,
          lat: mapFocusTarget.lat,
          lng: mapFocusTarget.lng,
          isFocusOnly: true,
        });
      }
    }

    return finalItems;
  }, [trip, selectedDay, dayScope, filter, mapFocusTarget]);

  // Helper to resolve coordinates for a pin (direct GPS > geocode cache)
  const getCoordsForPin = (
    pin: MapPinItem
  ): { lat: number; lng: number } | null => {
    if (typeof pin.lat === 'number' && typeof pin.lng === 'number') {
      return { lat: pin.lat, lng: pin.lng };
    }
    const locKey = pin.location.trim().toLowerCase();
    if (!locKey) return null;
    return resolvedCoords[locKey] || null;
  };

  // Geocode unknown non-generic places using geocodePlace()
  useEffect(() => {
    let cancelled = false;

    const queriesToResolve: string[] = [];
    const seen = new Set<string>();

    allPins.forEach((pin) => {
      if (typeof pin.lat === 'number' && typeof pin.lng === 'number') return;
      const loc = pin.location.trim();
      if (!loc || isGenericLocation(loc)) return;
      const key = loc.toLowerCase();
      if (key in resolvedCoords || seen.has(key)) return;
      seen.add(key);
      queriesToResolve.push(loc);
    });

    // Also resolve trip.destination as fallback map anchor
    const dest = trip.destination?.trim();
    if (dest && !isGenericLocation(dest)) {
      const destKey = dest.toLowerCase();
      if (!(destKey in resolvedCoords) && !seen.has(destKey)) {
        seen.add(destKey);
        queriesToResolve.push(dest);
      }
    }

    if (queriesToResolve.length === 0) {
      setIsGeocoding(false);
      return;
    }

    setIsGeocoding(true);

    (async () => {
      for (const rawQuery of queriesToResolve) {
        if (cancelled) break;
        const key = rawQuery.toLowerCase();
        let coords = await geocodePlace(rawQuery);
        if (
          !coords &&
          !cancelled &&
          dest &&
          !key.includes(dest.toLowerCase())
        ) {
          coords = await geocodePlace(`${rawQuery}, ${dest}`);
        }
        if (cancelled) break;
        setResolvedCoords((prev) => {
          if (key in prev) return prev;
          return { ...prev, [key]: coords };
        });
      }
      if (!cancelled) {
        setIsGeocoding(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allPins, resolvedCoords, trip.destination]);

  // Pins with valid coordinates
  const plottedPins = useMemo(() => {
    return allPins
      .map((pin) => {
        const coords = getCoordsForPin(pin);
        return coords ? { ...pin, lat: coords.lat, lng: coords.lng } : null;
      })
      .filter(
        (p): p is MapPinItem & { lat: number; lng: number } => p !== null
      );
  }, [allPins, resolvedCoords]);

  // Day Google Maps route URL
  const dayRouteUrl = useMemo(() => {
    const routeLocations = allPins
      .filter((p) => p.kind === 'activity' || p.kind === 'meal')
      .map((p) => p.location);
    return buildGoogleMapsDayRouteUrl(routeLocations);
  }, [allPins]);

  // Initialize Leaflet map once on mount
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapInstanceRef.current) return;

    const initialCenter: [number, number] =
      typeof trip.info?.lat === 'number' && typeof trip.info?.lng === 'number'
        ? [trip.info.lat, trip.info.lng]
        : [39.3278, 3.1364];

    const map = L.map(container, {
      center: initialCenter,
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    const markersLayer = L.layerGroup().addTo(map);
    const routeLayer = L.polyline([], {
      color: '#C85A38',
      weight: 2.5,
      opacity: 0.85,
      dashArray: '7 7',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = markersLayer;
    routeLayerRef.current = routeLayer;

    // ResizeObserver ensures map tiles redraw cleanly after panel slide/resize
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize({ animate: false });
      });
      resizeObserver.observe(container);
    }

    const invalidateTimer = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 220);

    return () => {
      window.clearTimeout(invalidateTimer);
      resizeObserver?.disconnect();
      markerMapRef.current.clear();
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      markersLayerRef.current = null;
      routeLayerRef.current = null;
    };
  }, []);

  // Re-measure Leaflet canvas when switching back from mobile list to map view
  useEffect(() => {
    if (mobileView !== 'map') return;
    const timer = window.setTimeout(() => {
      mapInstanceRef.current?.invalidateSize({ animate: false });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [mobileView]);

  // Manage tile layer & automatic fallback (Esri Street -> OSM -> Offline Spatial)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    if (tileMode === 'offline') {
      return;
    }

    tileErrorsRef.current = 0;
    tileSuccessRef.current = false;

    const url =
      tileMode === 'carto'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution =
      tileMode === 'carto'
        ? 'Tiles &copy; Esri'
        : '&copy; OpenStreetMap';

    const layer = L.tileLayer(url, {
      attribution,
      subdomains: 'abc',
      maxZoom: 19,
    });

    layer.on('tileload', () => {
      tileSuccessRef.current = true;
      tileErrorsRef.current = 0;
    });

    layer.on('tileerror', () => {
      tileErrorsRef.current += 1;
      if (!tileSuccessRef.current && tileErrorsRef.current >= 4) {
        setTileMode((curr) => {
          if (curr === 'carto') return 'osm';
          if (curr === 'osm') return 'offline';
          return curr;
        });
      }
    });

    layer.addTo(map);
    tileLayerRef.current = layer;
  }, [tileMode]);

  // Render markers & dashed route polyline whenever plottedPins / selection change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !markersLayer || !routeLayer) return;

    markersLayer.clearLayers();
    markerMapRef.current.clear();

    const routePoints: L.LatLngExpression[] = [];

    plottedPins.forEach((pin) => {
      const style = KIND_STYLE[pin.kind];
      const isSelected =
        selectedPinKey === pin.pinKey ||
        (pin.kind === 'activity' &&
          selectedActivityId === pin.sourceId &&
          !selectedPinKey);

      if (pin.routeNumber !== undefined) {
        routePoints.push([pin.lat, pin.lng]);
      }

      const badgeLabel =
        pin.kind === 'accommodation'
          ? '⌂'
          : pin.routeNumber !== undefined
          ? String(pin.routeNumber)
          : pin.kind === 'idea'
          ? '★'
          : '•';

      const size = isSelected ? 36 : 30;
      const ringShadow = isSelected
        ? `0 0 0 4px rgba(255,255,255,0.85), 0 6px 18px ${style.glow}`
        : `0 3px 10px rgba(31,27,24,0.22), 0 0 8px ${style.glow}`;

      const icon = L.divIcon({
        className: 'map-pin-marker',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
        html: `<div style="
          width:${size}px;
          height:${size}px;
          border-radius:9999px;
          background:#FAF7F2;
          border:2.5px solid ${style.color};
          color:${style.color};
          display:flex;
          align-items:center;
          justify-content:center;
          font-family:'JetBrains Mono',monospace;
          font-weight:800;
          font-size:${isSelected ? '13px' : '11px'};
          box-shadow:${ringShadow};
          transition:transform 0.15s ease;
        ">${escapeHtml(badgeLabel)}</div>`,
      });

      const marker = L.marker([pin.lat, pin.lng], {
        icon,
        zIndexOffset: isSelected ? 600 : pin.kind === 'accommodation' ? 300 : 100,
      });

      const safeTitle = escapeHtml(pin.title);
      const safeLoc = escapeHtml(pin.location || trip.destination);
      const safeMeta = escapeHtml(
        [
          pin.dayNumber ? `Tag ${pin.dayNumber}` : null,
          pin.time ? `${pin.time} Uhr` : null,
          style.label,
        ]
          .filter(Boolean)
          .join(' · ')
      );

      marker.bindPopup(
        `<div style="min-width:170px;max-width:230px;padding:2px 0;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${style.color};margin-bottom:3px;">
            ${safeMeta}
          </div>
          <div style="font-size:13px;font-weight:800;color:#1F1B18;line-height:1.3;">
            ${safeTitle}
          </div>
          <div style="font-size:11px;color:#6B6259;margin-top:4px;line-height:1.35;">
            ${safeLoc}
          </div>
        </div>`
      );

      marker.on('click', () => {
        setSelectedPinKey(pin.pinKey);
        if (pin.kind === 'activity') {
          setSelectedActivityId(pin.sourceId);
        }
        if (pin.dayNumber && pin.dayNumber !== selectedDay) {
          setSelectedDay(pin.dayNumber);
        }
      });

      marker.addTo(markersLayer);
      markerMapRef.current.set(pin.pinKey, marker);
    });

    routeLayer.setLatLngs(routePoints);

    // Center / fit bounds smoothly when context changes or focus target updates
    const focusKey = mapFocusTarget
      ? `${mapFocusTarget.kind}-${mapFocusTarget.id}-${mapFocusTarget.location}`
      : '';
    const scopeKey = `${trip.id}|${dayScope}|${selectedDay}|${filter}|${plottedPins.length}|${focusKey}`;

    if (focusKey) {
      const targetPin = plottedPins.find(
        (p) => p.pinKey === `${mapFocusTarget?.kind}-${mapFocusTarget?.id}`
      );
      if (targetPin && lastFittedKeyRef.current !== scopeKey) {
        lastFittedKeyRef.current = scopeKey;
        map.flyTo([targetPin.lat, targetPin.lng], 14, { duration: 0.5 });
        const marker = markerMapRef.current.get(targetPin.pinKey);
        if (marker) {
          window.setTimeout(() => marker.openPopup(), 260);
        }
        return;
      }
    }

    if (plottedPins.length > 0 && lastFittedKeyRef.current !== scopeKey) {
      lastFittedKeyRef.current = scopeKey;
      if (plottedPins.length === 1) {
        map.setView([plottedPins[0].lat, plottedPins[0].lng], 13, { animate: true });
      } else {
        const bounds = L.latLngBounds(plottedPins.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14, animate: true });
      }
    } else if (plottedPins.length === 0) {
      const destKey = (trip.destination || '').trim().toLowerCase();
      const destCoords = destKey ? resolvedCoords[destKey] : null;
      if (destCoords && lastFittedKeyRef.current !== scopeKey) {
        lastFittedKeyRef.current = scopeKey;
        map.setView([destCoords.lat, destCoords.lng], 11, { animate: true });
      }
    }
  }, [
    plottedPins,
    selectedPinKey,
    selectedActivityId,
    selectedDay,
    dayScope,
    filter,
    trip.id,
    trip.destination,
    resolvedCoords,
    mapFocusTarget,
    setSelectedActivityId,
    setSelectedDay,
  ]);

  const handleSelectWaypoint = (pin: MapPinItem) => {
    setSelectedPinKey(pin.pinKey);
    if (pin.kind === 'activity') {
      setSelectedActivityId(pin.sourceId);
    }

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileView('map');
    }

    const coords = getCoordsForPin(pin);
    const map = mapInstanceRef.current;
    if (coords && map) {
      window.setTimeout(() => {
        map.flyTo([coords.lat, coords.lng], 14, { duration: 0.45 });
        const marker = markerMapRef.current.get(pin.pinKey);
        if (marker) {
          window.setTimeout(() => marker.openPopup(), 220);
        }
      }, 40);
    }
  };

  const handleOpenInTab = (pin: MapPinItem) => {
    let targetTab: NavigationTab = 'dashboard';
    if (pin.kind === 'activity') {
      targetTab = 'schedule';
      if (pin.dayNumber) setSelectedDay(pin.dayNumber);
      setSelectedActivityId(pin.sourceId);
      setSearchTarget({
        tab: 'schedule',
        kind: 'activity',
        id: pin.sourceId,
        dayNumber: pin.dayNumber,
      });
    } else if (pin.kind === 'meal') {
      targetTab = 'meals';
      if (pin.dayNumber) setSelectedDay(pin.dayNumber);
      setSearchTarget({
        tab: 'meals',
        kind: 'meal',
        id: pin.sourceId,
        dayNumber: pin.dayNumber,
      });
    } else if (pin.kind === 'idea') {
      targetTab = 'ideas';
      setSearchTarget({
        tab: 'ideas',
        kind: 'idea',
        id: pin.sourceId,
      });
    } else {
      targetTab = 'dashboard';
    }
    setActiveTab(targetTab);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMapOpen(false);
    }
  };

  const handleFitAllPins = () => {
    const map = mapInstanceRef.current;
    if (!map || plottedPins.length === 0) return;
    if (plottedPins.length === 1) {
      map.flyTo([plottedPins[0].lat, plottedPins[0].lng], 13, { duration: 0.45 });
      return;
    }
    const bounds = L.latLngBounds(plottedPins.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14, animate: true });
  };

  const renderKindIcon = (kind: MapFocusTarget['kind']) => {
    switch (kind) {
      case 'accommodation':
        return <Home className="w-3.5 h-3.5 text-[#1F5E68]" />;
      case 'meal':
        return <UtensilsCrossed className="w-3.5 h-3.5 text-[#4E5F40]" />;
      case 'idea':
        return <Lightbulb className="w-3.5 h-3.5 text-[#9E5A14]" />;
      case 'activity':
        return <Compass className="w-3.5 h-3.5 text-[#9E3F22]" />;
      default:
        return <MapPin className="w-3.5 h-3.5 text-[#1F5E68]" />;
    }
  };

  const totalDays = Math.max(1, trip.totalDays || 1);
  const peekPin =
    allPins.find((p) => p.pinKey === selectedPinKey) || allPins[0] || null;
  const peekMapsUrl = peekPin ? buildGoogleMapsUrl(peekPin.location) : null;

  return (
    <aside
      aria-label="Karten-Cockpit"
      className="surface-glass-elevated rounded-none sm:rounded-[28px] flex flex-col h-full w-full overflow-hidden border-0 sm:border sm:border-[#DDD2C3] shadow-xl"
    >
      {/* Top Cockpit Header */}
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-[#E6DDD1] flex items-center justify-between gap-2 bg-[#FAF7F2] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#2A7B88]/12 border border-[#2A7B88]/30 text-[#1F5E68] hidden min-[400px]:flex items-center justify-center shrink-0">
            <MapIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-extrabold text-[#1F1B18] truncate">
                Karte
              </h2>
              <span className="font-mono tabular-nums text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2A7B88]/12 text-[#1F5E68] border border-[#2A7B88]/25 shrink-0">
                {plottedPins.length} Pins
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-[#6B6259] truncate">
              {dayScope === 'day'
                ? `Tag ${selectedDay} · ${formatTripDayDate(trip.startDate, selectedDay)}`
                : `Alle ${totalDays} Tage · ${trip.destination}`}
            </p>
          </div>
        </div>

        {/* Mobile/Tablet (<lg) Segmented Toggle: Karte | Liste */}
        <div
          role="tablist"
          aria-label="Kartenansicht umschalten"
          className="lg:hidden inline-flex items-center rounded-full bg-[#F3ECE1] p-0.5 border border-[#DDD2C3] shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobileView === 'map'}
            onClick={() => setMobileView('map')}
            className={`min-h-[40px] px-3 rounded-full text-xs font-extrabold transition-colors cursor-pointer ${
              mobileView === 'map'
                ? 'bg-[#C85A38] text-white shadow-sm'
                : 'text-[#6B6259] hover:text-[#1F1B18]'
            }`}
          >
            Karte
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileView === 'list'}
            onClick={() => setMobileView('list')}
            className={`min-h-[40px] px-3 rounded-full text-xs font-extrabold transition-colors cursor-pointer ${
              mobileView === 'list'
                ? 'bg-[#C85A38] text-white shadow-sm'
                : 'text-[#6B6259] hover:text-[#1F1B18]'
            }`}
          >
            Liste
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleFitAllPins}
            disabled={plottedPins.length === 0}
            title="Auf alle Pins zoomen"
            aria-label="Auf alle Pins zoomen"
            className="w-11 h-11 lg:w-8 lg:h-8 rounded-full bg-white hover:bg-[#F3ECE1] disabled:opacity-35 border border-[#DDD2C3] text-[#6B6259] hover:text-[#2A7B88] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Crosshair className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setMapFocusTarget(null);
              setMapOpen(false);
            }}
            title="Karte schließen"
            aria-label="Karte schließen"
            className="w-11 h-11 lg:w-8 lg:h-8 rounded-full bg-white hover:bg-rose-500/12 border border-[#DDD2C3] hover:border-rose-500/35 text-[#6B6259] hover:text-rose-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Controls: Day Scope + Day Switcher + Filter Pills */}
      <div className="px-3 sm:px-4 py-2 border-b border-[#E6DDD1] space-y-1.5 sm:space-y-2 bg-white/80 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center rounded-full bg-[#F3ECE1] p-0.5 border border-[#DDD2C3]">
            <button
              type="button"
              onClick={() => setDayScope('day')}
              className={`min-h-[40px] lg:min-h-0 px-3 lg:px-2.5 py-1.5 lg:py-1 rounded-full text-xs lg:text-[11px] font-bold transition-colors cursor-pointer ${
                dayScope === 'day'
                  ? 'bg-[#C85A38] text-white'
                  : 'text-[#6B6259] hover:text-[#1F1B18]'
              }`}
            >
              Tag {selectedDay}
            </button>
            <button
              type="button"
              onClick={() => setDayScope('all')}
              className={`min-h-[40px] lg:min-h-0 px-3 lg:px-2.5 py-1.5 lg:py-1 rounded-full text-xs lg:text-[11px] font-bold transition-colors cursor-pointer ${
                dayScope === 'all'
                  ? 'bg-[#C85A38] text-white'
                  : 'text-[#6B6259] hover:text-[#1F1B18]'
              }`}
            >
              Alle Tage
            </button>
          </div>

          {dayScope === 'day' && (
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
                disabled={selectedDay <= 1}
                aria-label="Vorheriger Tag"
                className="w-11 h-11 lg:w-7 lg:h-7 rounded-full bg-[#FAF7F2] hover:bg-[#F3ECE1] disabled:opacity-30 border border-[#DDD2C3] text-[#1F1B18] flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
              </button>
              <span className="font-mono tabular-nums text-xs font-bold text-[#1F1B18] px-1.5">
                {selectedDay}/{totalDays}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDay(Math.min(totalDays, selectedDay + 1))}
                disabled={selectedDay >= totalDays}
                aria-label="Nächster Tag"
                className="w-11 h-11 lg:w-7 lg:h-7 rounded-full bg-[#FAF7F2] hover:bg-[#F3ECE1] disabled:opacity-30 border border-[#DDD2C3] text-[#1F1B18] flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {FILTER_OPTIONS.map((opt) => {
            const active = filter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={`min-h-[44px] lg:min-h-0 px-3 lg:px-2.5 py-1.5 lg:py-1 rounded-full text-xs lg:text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  active
                    ? 'bg-[#C85A38]/12 text-[#9E3F22] border-[#C85A38]/35'
                    : 'bg-[#FAF7F2] text-[#6B6259] border-[#E6DDD1] hover:text-[#1F1B18] hover:bg-[#F3ECE1]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Leaflet Interactive Map Canvas (Full height on <lg when mobileView === 'map', docked 320px on lg+) */}
      <div
        className={
          mobileView === 'map'
            ? 'relative flex-1 min-h-[160px] lg:flex-none lg:h-[320px] lg:shrink-0 bg-[#F3ECE1] overflow-hidden border-b border-[#E6DDD1]'
            : 'hidden lg:block lg:relative lg:h-[320px] lg:shrink-0 bg-[#F3ECE1] overflow-hidden border-b border-[#E6DDD1]'
        }
      >
        {/* Subtle Warm Spatial Grid behind/under tiles */}
        <div
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(200,90,56,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(200,90,56,0.08) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Geocoding Progress Pill */}
        {isGeocoding && (
          <div className="absolute top-3 left-3 z-[450] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.95] backdrop-blur-md border border-[#DDD2C3] text-[11px] font-semibold text-[#1F5E68] shadow-md">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Orte werden verortet…</span>
          </div>
        )}

        {/* Offline Warm Spatial Overlay Badge */}
        {tileMode === 'offline' && (
          <div className="absolute top-3 right-3 z-[450] flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.96] backdrop-blur-md border border-[#D9822B]/40 text-[11px] font-bold text-[#9E5A14] shadow-md">
            <WifiOff className="w-3 h-3" />
            <span>Offline-Kartenmodus</span>
            <button
              type="button"
              onClick={() => setTileMode('carto')}
              className="underline text-[#2A7B88] hover:text-[#1F5E68] cursor-pointer"
            >
              Tiles neu laden
            </button>
          </div>
        )}

        {/* Empty Spatial Overlay when no pins have coordinates */}
        {plottedPins.length === 0 && !isGeocoding && (
          <div className="absolute inset-0 z-[420] flex flex-col items-center justify-center p-5 text-center bg-[#F3ECE1]/80 backdrop-blur-[2px] pointer-events-auto">
            <div className="w-11 h-11 rounded-2xl bg-[#2A7B88]/12 border border-[#2A7B88]/30 text-[#1F5E68] flex items-center justify-center mb-2.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-xs font-extrabold text-[#1F1B18]">
              Noch keine verorteten Orte für diesen Filter
            </p>
            <p className="text-[11px] text-[#6B6259] mt-1 max-w-[240px] leading-relaxed">
              Trage konkrete Ortsnamen oder Adressen ein, damit Pins automatisch auf der
              Karte erscheinen.
            </p>
            {filter !== 'all' && (
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="mt-3 min-h-[44px] lg:min-h-0 px-4 lg:px-3.5 py-2 lg:py-1.5 rounded-full bg-[#C85A38] hover:bg-[#B54B2B] text-white text-xs lg:text-[11px] font-bold transition-colors cursor-pointer"
              >
                Alle Kategorien anzeigen
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mobile/Tablet (<lg) Compact Bottom Stop-Peek Card & "+ Aktivität" CTA */}
      {mobileView === 'map' && (
        <div className="lg:hidden shrink-0 border-t border-[#E6DDD1] bg-white/[0.97] backdrop-blur-xl px-3 py-2 flex items-center justify-between gap-2">
          {peekPin ? (
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className="flex items-center gap-2.5 min-w-0 flex-1 min-h-[44px] text-left cursor-pointer"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-mono tabular-nums text-xs font-extrabold border bg-[#FAF7F2]"
                style={{
                  borderColor: KIND_STYLE[peekPin.kind].color,
                  color: KIND_STYLE[peekPin.kind].color,
                }}
              >
                {peekPin.routeNumber !== undefined
                  ? peekPin.routeNumber
                  : peekPin.kind === 'accommodation'
                  ? '⌂'
                  : '★'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-[#1F1B18] truncate">
                  {peekPin.title}
                </p>
                <p className="text-[11px] text-[#6B6259] truncate">
                  {peekPin.time ? `${peekPin.time} · ` : ''}
                  {peekPin.location || trip.destination}
                </p>
              </div>
            </button>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#6B6259] truncate">
                {dayScope === 'day'
                  ? `Tag ${selectedDay} · Keine Stationen`
                  : 'Keine Stationen'}
              </p>
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            {peekMapsUrl && (
              <a
                href={peekMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="In Google Maps öffnen"
                aria-label="In Google Maps öffnen"
                className="w-11 h-11 rounded-full bg-[#FAF7F2] hover:bg-[#6E7F5E]/15 border border-[#DDD2C3] text-[#4E5F40] flex items-center justify-center transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(true)}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 rounded-full bg-[#C85A38] hover:bg-[#B54B2B] text-white text-xs font-extrabold transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Aktivität</span>
            </button>
          </div>
        </div>
      )}

      {/* Waypoint List + 1-Click Day Route Action */}
      <div
        className={
          mobileView === 'list'
            ? 'flex-1 min-h-0 flex flex-col bg-[#FAF7F2]/80'
            : 'hidden lg:flex lg:flex-1 lg:min-h-0 lg:flex-col lg:bg-[#FAF7F2]/80'
        }
      >
        <div className="px-3 sm:px-4 py-2 border-b border-[#E6DDD1] flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B6259]">
            Stationen ({allPins.length})
          </span>
          <div className="flex items-center gap-1.5">
            {dayRouteUrl ? (
              <a
                href={dayRouteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] lg:min-h-0 inline-flex items-center gap-1.5 px-3 py-1.5 lg:py-1 rounded-full bg-[#6E7F5E]/14 hover:bg-[#6E7F5E]/22 border border-[#6E7F5E]/30 text-[#4E5F40] text-xs lg:text-[11px] font-extrabold transition-colors"
              >
                <Navigation className="w-3.5 h-3.5 lg:w-3 lg:h-3" />
                <span>Tagesroute</span>
                <ExternalLink className="w-3 h-3 lg:w-2.5 lg:h-2.5" />
              </a>
            ) : (
              <span className="text-[11px] text-[#8C8277]">
                Route ab 1 Ort
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(true)}
              className="lg:hidden min-h-[44px] inline-flex items-center gap-1 px-3 rounded-full bg-[#C85A38] hover:bg-[#B54B2B] text-white text-xs font-extrabold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Aktivität</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {allPins.length === 0 ? (
            <p className="text-xs text-[#6B6259] text-center py-6">
              Keine Einträge für diese Auswahl gefunden.
            </p>
          ) : (
            allPins.map((pin) => {
              const coords = getCoordsForPin(pin);
              const isSelected = selectedPinKey === pin.pinKey;
              const style = KIND_STYLE[pin.kind];
              const mapsUrl = buildGoogleMapsUrl(pin.location);

              return (
                <div
                  key={pin.pinKey}
                  className={`rounded-2xl p-2.5 border transition-all ${
                    isSelected
                      ? 'bg-white border-[#C85A38]/45 shadow-sm'
                      : 'bg-white/75 hover:bg-white border-[#E6DDD1]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectWaypoint(pin)}
                      className="flex items-start gap-2.5 flex-1 min-w-0 min-h-[44px] text-left cursor-pointer"
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-mono tabular-nums text-[11px] font-extrabold border mt-0.5 bg-[#FAF7F2]"
                        style={{
                          borderColor: style.color,
                          color: style.color,
                        }}
                      >
                        {pin.routeNumber !== undefined
                          ? pin.routeNumber
                          : pin.kind === 'accommodation'
                          ? '⌂'
                          : '★'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${style.badgeBg}`}
                          >
                            {renderKindIcon(pin.kind)}
                            <span>{style.label}</span>
                          </span>
                          {pin.time && (
                            <span className="font-mono tabular-nums text-[10px] font-semibold text-[#1F1B18]">
                              {pin.time}
                            </span>
                          )}
                          {dayScope === 'all' && pin.dayNumber && (
                            <span className="font-mono tabular-nums text-[10px] text-[#6B6259]">
                              Tag {pin.dayNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-[#1F1B18] truncate mt-1">
                          {pin.title}
                        </p>
                        <p className="text-[11px] text-[#6B6259] truncate">
                          {pin.location || 'Kein konkreter Ort'}
                          {!coords && !isGenericLocation(pin.location) && !isGeocoding
                            ? ' · offline/ungeprüft'
                            : ''}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      {mapsUrl && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="In Google Maps öffnen"
                          aria-label="In Google Maps öffnen"
                          className="w-11 h-11 lg:w-7 lg:h-7 rounded-full bg-[#FAF7F2] hover:bg-[#6E7F5E]/15 border border-[#DDD2C3] text-[#6B6259] hover:text-[#4E5F40] flex items-center justify-center transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 lg:w-3 lg:h-3" />
                        </a>
                      )}
                      {!pin.isFocusOnly && pin.kind !== 'accommodation' && (
                        <button
                          type="button"
                          onClick={() => handleOpenInTab(pin)}
                          title="In Planungsansicht öffnen"
                          aria-label="In Planungsansicht öffnen"
                          className="w-11 h-11 lg:w-7 lg:h-7 rounded-full bg-[#FAF7F2] hover:bg-[#2A7B88]/15 border border-[#DDD2C3] hover:border-[#2A7B88]/40 text-[#6B6259] hover:text-[#1F5E68] flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <ArrowUpRight className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};

export default MapCockpitPanel;
