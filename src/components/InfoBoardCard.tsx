import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Copy,
  Check,
  MapPin,
  Wifi,
  KeyRound,
  AlertCircle,
  Home,
  ExternalLink,
  X,
  Map as MapIcon,
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import { TripInfo } from '../types/vacation';
import { buildGoogleMapsUrl } from '../utils/vacationHelpers';

export const InfoBoardCard: React.FC = () => {
  const { trip, updateTripInfo, focusOnMap, showToast } = useVacation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyTimerRef = useRef<number | null>(null);
  const prevTripIdRef = useRef<string>(trip.id);

  const info: TripInfo = trip.info || {};

  const [formState, setFormState] = useState<TripInfo>({
    accommodationName: info.accommodationName || '',
    address: info.address || '',
    wifiName: info.wifiName || '',
    wifiPassword: info.wifiPassword || '',
    checkinCode: info.checkinCode || '',
    emergencyNotes: info.emergencyNotes || '',
  });

  // Clean up copy timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  // Keep active edit state intact during background cloud/state updates!
  // Only reset edit mode when switching to a different trip, or sync fields when not editing.
  useEffect(() => {
    const nextState: TripInfo = {
      accommodationName: trip.info?.accommodationName || '',
      address: trip.info?.address || '',
      wifiName: trip.info?.wifiName || '',
      wifiPassword: trip.info?.wifiPassword || '',
      checkinCode: trip.info?.checkinCode || '',
      emergencyNotes: trip.info?.emergencyNotes || '',
    };

    if (prevTripIdRef.current !== trip.id) {
      prevTripIdRef.current = trip.id;
      setIsEditing(false);
      setFormState(nextState);
      return;
    }

    if (!isEditing) {
      setFormState(nextState);
    }
  }, [trip.id, trip.info, isEditing]);

  const handleCopy = async (field: string, label: string, value?: string) => {
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const el = document.createElement('textarea');
        el.value = value;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedField(field);
      showToast(`${label} kopiert`, 'success', { durationMs: 2000 });
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedField((prev) => (prev === field ? null : prev));
        copyTimerRef.current = null;
      }, 2000);
    } catch {
      showToast('Kopieren in Zwischenablage fehlgeschlagen', 'warning');
    }
  };

  const handleStartEdit = () => {
    setFormState({
      accommodationName: info.accommodationName || '',
      address: info.address || '',
      wifiName: info.wifiName || '',
      wifiPassword: info.wifiPassword || '',
      checkinCode: info.checkinCode || '',
      emergencyNotes: info.emergencyNotes || '',
    });
    setIsExpanded(true);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTripInfo({
      accommodationName: formState.accommodationName?.trim() || undefined,
      address: formState.address?.trim() || undefined,
      wifiName: formState.wifiName?.trim() || undefined,
      wifiPassword: formState.wifiPassword?.trim() || undefined,
      checkinCode: formState.checkinCode?.trim() || undefined,
      emergencyNotes: formState.emergencyNotes?.trim() || undefined,
    });
    setIsEditing(false);
    showToast('Unterkunfts-Infos gespeichert', 'success');
  };

  const handleCancel = () => {
    setFormState({
      accommodationName: info.accommodationName || '',
      address: info.address || '',
      wifiName: info.wifiName || '',
      wifiPassword: info.wifiPassword || '',
      checkinCode: info.checkinCode || '',
      emergencyNotes: info.emergencyNotes || '',
    });
    setIsEditing(false);
  };

  const handleFocusAccommodationOnMap = () => {
    focusOnMap({
      kind: 'accommodation',
      id: 'accommodation',
      title: info.accommodationName || 'Unterkunft',
      location: info.address || info.accommodationName || trip.destination,
      lat: info.lat,
      lng: info.lng,
    });
  };

  const hasAnyInfo = Boolean(
    info.accommodationName ||
      info.address ||
      info.wifiName ||
      info.wifiPassword ||
      info.checkinCode ||
      info.emergencyNotes
  );

  const addressMapsUrl = buildGoogleMapsUrl(info.address || info.accommodationName);

  return (
    <section
      aria-label="Unterkunfts- und Info-Board"
      className="surface-glass rounded-[26px] transition-all overflow-hidden"
    >
      {/* Header Row (sibling buttons, no nested interactive controls) */}
      <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer focus:outline-none group"
        >
          <div className="w-8 h-8 rounded-xl bg-[#D9822B]/14 border border-[#D9822B]/30 text-[#9E5A14] flex items-center justify-center shrink-0">
            <Home className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-sm font-extrabold text-[#1F1B18] group-hover:text-[#C85A38] transition-colors truncate">
              Unterkunfts- &amp; Info-Board
            </span>
            {info.accommodationName && !isExpanded && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#F3ECE1] border border-[#E6DDD1] text-[11px] font-semibold text-[#6B6259] truncate max-w-[220px]">
                {info.accommodationName}
              </span>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasAnyInfo && (
            <button
              type="button"
              onClick={handleFocusAccommodationOnMap}
              title="Unterkunft auf Karte zeigen"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#2A7B88]/12 hover:bg-[#2A7B88]/20 border border-[#2A7B88]/30 text-[#1F5E68] text-[11px] font-bold transition-colors cursor-pointer"
            >
              <MapIcon className="w-3 h-3" />
              <span>Auf Karte</span>
            </button>
          )}
          {isExpanded && !isEditing && (
            <button
              type="button"
              onClick={handleStartEdit}
              title="Unterkunfts-Infos bearbeiten"
              aria-label="Unterkunfts-Infos bearbeiten"
              className="w-8 h-8 rounded-full bg-[#F3ECE1] hover:bg-[#E6DDD1] border border-[#DDD2C3] text-[#6B6259] hover:text-[#1F1B18] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-label={isExpanded ? 'Info-Board einklappen' : 'Info-Board ausklappen'}
            className="w-8 h-8 rounded-full bg-[#F3ECE1] hover:bg-[#E6DDD1] border border-[#DDD2C3] text-[#6B6259] hover:text-[#1F1B18] flex items-center justify-center transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-[#E6DDD1]">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-3.5 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="info-accommodation-name"
                    className="block text-[11px] font-bold text-[#6B6259] mb-1"
                  >
                    Unterkunft / Name
                  </label>
                  <input
                    id="info-accommodation-name"
                    type="text"
                    value={formState.accommodationName || ''}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        accommodationName: e.target.value,
                      }))
                    }
                    placeholder="z. B. Finca Son Llombards"
                    className="surface-input w-full rounded-2xl px-3.5 py-2 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label
                    htmlFor="info-address"
                    className="block text-[11px] font-bold text-[#6B6259] mb-1"
                  >
                    Adresse
                  </label>
                  <input
                    id="info-address"
                    type="text"
                    value={formState.address || ''}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, address: e.target.value }))
                    }
                    placeholder="Straße, PLZ, Ort"
                    className="surface-input w-full rounded-2xl px-3.5 py-2 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label
                    htmlFor="info-wifi-name"
                    className="block text-[11px] font-bold text-[#6B6259] mb-1"
                  >
                    WLAN-Name (SSID)
                  </label>
                  <input
                    id="info-wifi-name"
                    type="text"
                    value={formState.wifiName || ''}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, wifiName: e.target.value }))
                    }
                    placeholder="WLAN-Netzwerkname"
                    className="surface-input w-full rounded-2xl px-3.5 py-2 text-xs font-semibold font-mono"
                  />
                </div>

                <div>
                  <label
                    htmlFor="info-wifi-password"
                    className="block text-[11px] font-bold text-[#6B6259] mb-1"
                  >
                    WLAN-Passwort
                  </label>
                  <input
                    id="info-wifi-password"
                    type="text"
                    value={formState.wifiPassword || ''}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        wifiPassword: e.target.value,
                      }))
                    }
                    placeholder="Passwort"
                    className="surface-input w-full rounded-2xl px-3.5 py-2 text-xs font-semibold font-mono"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="info-checkin-code"
                    className="block text-[11px] font-bold text-[#6B6259] mb-1"
                  >
                    Check-in / Schlüsselbox-Code
                  </label>
                  <input
                    id="info-checkin-code"
                    type="text"
                    value={formState.checkinCode || ''}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, checkinCode: e.target.value }))
                    }
                    placeholder="z. B. Schlüsselbox: 4829# (ab 15:00 Uhr)"
                    className="surface-input w-full rounded-2xl px-3.5 py-2 text-xs font-semibold font-mono"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="info-emergency-notes"
                    className="block text-[11px] font-bold text-[#6B6259] mb-1"
                  >
                    Notfall &amp; Wichtige Hinweise
                  </label>
                  <textarea
                    id="info-emergency-notes"
                    rows={3}
                    value={formState.emergencyNotes || ''}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        emergencyNotes: e.target.value,
                      }))
                    }
                    placeholder="Notruf, Vermieter-Kontakt, nächster Supermarkt, Müllregeln..."
                    className="surface-input w-full rounded-2xl px-3.5 py-2.5 text-xs font-medium leading-relaxed resize-y"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F3ECE1] hover:bg-[#E6DDD1] text-xs font-bold text-[#1F1B18] border border-[#DDD2C3] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Abbrechen</span>
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C85A38] hover:bg-[#B54B2B] text-xs font-extrabold text-white shadow-sm transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Speichern</span>
                </button>
              </div>
            </form>
          ) : !hasAnyInfo ? (
            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF7F2] rounded-2xl p-4 mt-2 border border-[#E6DDD1]">
              <p className="text-xs font-medium text-[#6B6259]">
                Noch keine Unterkunfts-, WLAN- oder Check-in-Daten hinterlegt.
              </p>
              <button
                type="button"
                onClick={handleStartEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C85A38] hover:bg-[#B54B2B] text-white text-xs font-extrabold self-start sm:self-auto cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Infos eintragen</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
              {/* Accommodation Name */}
              {info.accommodationName && (
                <div className="bg-[#FAF7F2] rounded-2xl p-3.5 border border-[#E6DDD1] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#D9822B]/14 border border-[#D9822B]/30 flex items-center justify-center shrink-0 text-[#9E5A14]">
                    <Home className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B6259] block">
                      Unterkunft
                    </span>
                    <p className="text-xs font-extrabold text-[#1F1B18] mt-0.5 break-words">
                      {info.accommodationName}
                    </p>
                    {!info.address && (
                      <button
                        type="button"
                        onClick={handleFocusAccommodationOnMap}
                        className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2A7B88]/12 hover:bg-[#2A7B88]/20 border border-[#2A7B88]/30 text-[11px] font-bold text-[#1F5E68] transition-colors cursor-pointer"
                      >
                        <MapIcon className="w-3 h-3" />
                        <span>Auf Karte</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Address + Copy + Google Maps + Auf Karte */}
              {info.address && (
                <div className="bg-[#FAF7F2] rounded-2xl p-3.5 border border-[#E6DDD1] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#2A7B88]/12 border border-[#2A7B88]/30 flex items-center justify-center shrink-0 text-[#2A7B88]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B6259] block">
                      Adresse
                    </span>
                    <p className="text-xs font-bold text-[#1F1B18] mt-0.5 break-words">
                      {info.address}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => handleCopy('address', 'Adresse', info.address)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#F3ECE1] border border-[#DDD2C3] text-[11px] font-bold text-[#1F1B18] transition-colors cursor-pointer"
                      >
                        {copiedField === 'address' ? (
                          <>
                            <Check className="w-3 h-3 text-[#4E5F40]" />
                            <span className="text-[#4E5F40]">Kopiert!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-[#2A7B88]" />
                            <span>Kopieren</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleFocusAccommodationOnMap}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2A7B88]/12 hover:bg-[#2A7B88]/20 border border-[#2A7B88]/30 text-[11px] font-bold text-[#1F5E68] transition-colors cursor-pointer"
                      >
                        <MapIcon className="w-3 h-3" />
                        <span>Auf Karte</span>
                      </button>

                      {addressMapsUrl && (
                        <a
                          href={addressMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#6E7F5E]/14 hover:bg-[#6E7F5E]/22 border border-[#6E7F5E]/30 text-[11px] font-bold text-[#4E5F40] transition-colors"
                        >
                          <span>Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* WiFi Name & Password + Copy Buttons for BOTH */}
              {(info.wifiName || info.wifiPassword) && (
                <div className="bg-[#FAF7F2] rounded-2xl p-3.5 border border-[#E6DDD1] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#6E7F5E]/14 border border-[#6E7F5E]/30 flex items-center justify-center shrink-0 text-[#4E5F40]">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B6259] block">
                      WLAN &amp; Passwort
                    </span>

                    {info.wifiName && (
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <code className="font-mono tabular-nums text-xs font-bold text-[#1F1B18] break-all">
                          {info.wifiName}
                        </code>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy('wifiName', 'WLAN-Name', info.wifiName)
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white hover:bg-[#F3ECE1] border border-[#DDD2C3] text-[10px] font-bold text-[#1F1B18] transition-colors cursor-pointer shrink-0"
                        >
                          {copiedField === 'wifiName' ? (
                            <>
                              <Check className="w-3 h-3 text-[#4E5F40]" />
                              <span className="text-[#4E5F40]">Kopiert!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-[#2A7B88]" />
                              <span>SSID</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {info.wifiPassword && (
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <code className="font-mono tabular-nums text-[11px] font-bold bg-[#F3ECE1] border border-[#DDD2C3] px-2 py-0.5 rounded-lg text-[#1F5E68] break-all">
                          {info.wifiPassword}
                        </code>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              'wifiPassword',
                              'WLAN-Passwort',
                              info.wifiPassword
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white hover:bg-[#F3ECE1] border border-[#DDD2C3] text-[10px] font-bold text-[#1F1B18] transition-colors cursor-pointer shrink-0"
                        >
                          {copiedField === 'wifiPassword' ? (
                            <>
                              <Check className="w-3 h-3 text-[#4E5F40]" />
                              <span className="text-[#4E5F40]">Kopiert!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-[#4E5F40]" />
                              <span>Passwort</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Check-in / Keybox Code + Copy */}
              {info.checkinCode && (
                <div className="bg-[#FAF7F2] rounded-2xl p-3.5 border border-[#E6DDD1] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#C85A38]/12 border border-[#C85A38]/30 flex items-center justify-center shrink-0 text-[#9E3F22]">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B6259] block">
                      Check-in &amp; Schlüssel
                    </span>
                    <p className="font-mono tabular-nums text-xs font-bold text-[#1F1B18] mt-0.5 break-words">
                      {info.checkinCode}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy('checkin', 'Check-in-Code', info.checkinCode)
                      }
                      className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#F3ECE1] border border-[#DDD2C3] text-[11px] font-bold text-[#1F1B18] transition-colors cursor-pointer"
                    >
                      {copiedField === 'checkin' ? (
                        <>
                          <Check className="w-3 h-3 text-[#4E5F40]" />
                          <span className="text-[#4E5F40]">Kopiert!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-[#C85A38]" />
                          <span>Code kopieren</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Emergency / Notes (multiline support) */}
              {info.emergencyNotes && (
                <div className="bg-[#FAF7F2] rounded-2xl p-3.5 border border-[#D9822B]/30 flex items-start gap-3 md:col-span-2">
                  <div className="w-8 h-8 rounded-xl bg-[#D9822B]/14 border border-[#D9822B]/30 flex items-center justify-center shrink-0 text-[#9E5A14]">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#9E5A14] block">
                      Notfall &amp; Wichtige Hinweise
                    </span>
                    <p className="text-xs font-medium text-[#1F1B18] mt-1 break-words whitespace-pre-line leading-relaxed">
                      {info.emergencyNotes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default InfoBoardCard;
