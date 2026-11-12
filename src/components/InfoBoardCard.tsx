import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useVacation } from '../context/VacationContext';
import { TripInfo } from '../types/vacation';

export const InfoBoardCard: React.FC = () => {
  const { trip, updateTripInfo } = useVacation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const info: TripInfo = trip.info || {};

  const [formState, setFormState] = useState<TripInfo>({
    accommodationName: info.accommodationName || '',
    address: info.address || '',
    wifiName: info.wifiName || '',
    wifiPassword: info.wifiPassword || '',
    checkinCode: info.checkinCode || '',
    emergencyNotes: info.emergencyNotes || '',
  });

  useEffect(() => {
    setFormState({
      accommodationName: trip.info?.accommodationName || '',
      address: trip.info?.address || '',
      wifiName: trip.info?.wifiName || '',
      wifiPassword: trip.info?.wifiPassword || '',
      checkinCode: trip.info?.checkinCode || '',
      emergencyNotes: trip.info?.emergencyNotes || '',
    });
    setIsEditing(false);
  }, [trip.id, trip.info]);

  const handleCopy = (field: string, value?: string) => {
    if (!value) return;
    navigator.clipboard?.writeText(value);
    setCopiedField(field);
    setTimeout(() => {
      setCopiedField((prev) => (prev === field ? null : prev));
    }, 2000);
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const hasAnyInfo = Boolean(
    info.accommodationName ||
      info.address ||
      info.wifiName ||
      info.wifiPassword ||
      info.checkinCode ||
      info.emergencyNotes
  );

  return (
    <div className="bg-white/65 backdrop-blur-xl border border-white/80 rounded-[26px] shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition-all">
      {/* Compact Header Row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
        className="w-full px-5 py-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-sm font-extrabold text-[#141416] truncate">
            🏡 Unterkunfts- &amp; Info-Board (WLAN, Adresse, Check-in)
          </span>
          {info.accommodationName && !isExpanded && (
            <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/80 border border-black/5 text-[11px] font-bold text-[#141416]/70 truncate max-w-[220px]">
              {info.accommodationName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isExpanded && !isEditing && (
            <button
              type="button"
              onClick={handleStartEdit}
              title="Unterkunfts-Infos bearbeiten"
              className="w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-black/5 text-[#141416]/75 hover:text-[#141416] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-black/5 text-[#141416]/75 flex items-center justify-center transition-colors">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-1 border-t border-black/5">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-3 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#141416]/65 mb-1">
                    Unterkunft / Name
                  </label>
                  <input
                    type="text"
                    value={formState.accommodationName || ''}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, accommodationName: e.target.value }))
                    }
                    placeholder="z. B. Finca Son Llombards"
                    className="w-full bg-white/85 rounded-2xl px-3.5 py-2 text-xs font-semibold text-[#141416] border border-black/10 focus:outline-none focus:border-[#141416]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#141416]/65 mb-1">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={formState.address || ''}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, address: e.target.value }))
                    }
                    placeholder="Straße, PLZ, Ort"
                    className="w-full bg-white/85 rounded-2xl px-3.5 py-2 text-xs font-semibold text-[#141416] border border-black/10 focus:outline-none focus:border-[#141416]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#141416]/65 mb-1">
                    WLAN-Name (SSID)
                  </label>
                  <input
                    type="text"
                    value={formState.wifiName || ''}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, wifiName: e.target.value }))
                    }
                    placeholder="WLAN-Netzwerkname"
                    className="w-full bg-white/85 rounded-2xl px-3.5 py-2 text-xs font-semibold text-[#141416] border border-black/10 focus:outline-none focus:border-[#141416]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#141416]/65 mb-1">
                    WLAN-Passwort
                  </label>
                  <input
                    type="text"
                    value={formState.wifiPassword || ''}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, wifiPassword: e.target.value }))
                    }
                    placeholder="Passwort"
                    className="w-full bg-white/85 rounded-2xl px-3.5 py-2 text-xs font-semibold text-[#141416] border border-black/10 focus:outline-none focus:border-[#141416]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#141416]/65 mb-1">
                    Check-in / Schlüsselbox-Code
                  </label>
                  <input
                    type="text"
                    value={formState.checkinCode || ''}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, checkinCode: e.target.value }))
                    }
                    placeholder="z. B. Schlüsselbox: 4829# (ab 15:00 Uhr)"
                    className="w-full bg-white/85 rounded-2xl px-3.5 py-2 text-xs font-semibold text-[#141416] border border-black/10 focus:outline-none focus:border-[#141416]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#141416]/65 mb-1">
                    Notfall &amp; Hinweise
                  </label>
                  <input
                    type="text"
                    value={formState.emergencyNotes || ''}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, emergencyNotes: e.target.value }))
                    }
                    placeholder="Notruf, Vermieter-Kontakt, Supermarkt..."
                    className="w-full bg-white/85 rounded-2xl px-3.5 py-2 text-xs font-semibold text-[#141416] border border-black/10 focus:outline-none focus:border-[#141416]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/80 hover:bg-white text-xs font-bold text-[#141416]/75 border border-black/10 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Abbrechen</span>
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#141416] hover:bg-black/85 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-[#F4DF7B]" />
                  <span>Speichern</span>
                </button>
              </div>
            </form>
          ) : !hasAnyInfo ? (
            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/50 rounded-2xl p-4 mt-2">
              <p className="text-xs font-medium text-[#141416]/65">
                Noch keine Unterkunfts-, WLAN- oder Check-in-Daten hinterlegt.
              </p>
              <button
                type="button"
                onClick={handleStartEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#141416] text-white text-xs font-bold self-start sm:self-auto cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-[#F4DF7B]" />
                <span>Infos eintragen</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
              {/* Accommodation Name */}
              {info.accommodationName && (
                <div className="bg-white/70 rounded-2xl p-3.5 border border-white/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#F4DF7B]/70 flex items-center justify-center shrink-0 text-[#141416]">
                    <Home className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#141416]/50 block">
                      Unterkunft
                    </span>
                    <p className="text-xs font-extrabold text-[#141416] mt-0.5 break-words">
                      {info.accommodationName}
                    </p>
                  </div>
                </div>
              )}

              {/* Address + Copy + Google Maps */}
              {info.address && (
                <div className="bg-white/70 rounded-2xl p-3.5 border border-white/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#C5D1F5]/70 flex items-center justify-center shrink-0 text-[#141416]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#141416]/50 block">
                      Adresse
                    </span>
                    <p className="text-xs font-bold text-[#141416] mt-0.5 break-words">
                      {info.address}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => handleCopy('address', info.address)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#EFECE6] border border-black/5 text-[11px] font-bold text-[#141416] transition-colors cursor-pointer"
                      >
                        {copiedField === 'address' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Kopiert!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Kopieren</span>
                          </>
                        )}
                      </button>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          info.address
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#141416] hover:bg-black/85 text-[11px] font-bold text-white transition-colors"
                      >
                        <span>Maps</span>
                        <ExternalLink className="w-3 h-3 text-[#F4DF7B]" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* WiFi Name & Password + Copy */}
              {(info.wifiName || info.wifiPassword) && (
                <div className="bg-white/70 rounded-2xl p-3.5 border border-white/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#A9B882]/65 flex items-center justify-center shrink-0 text-[#141416]">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#141416]/50 block">
                      WLAN &amp; Passwort
                    </span>
                    {info.wifiName && (
                      <p className="text-xs font-extrabold text-[#141416] mt-0.5 break-all">
                        {info.wifiName}
                      </p>
                    )}
                    {info.wifiPassword && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <code className="text-[11px] font-bold bg-[#EFECE6] px-2 py-0.5 rounded-lg text-[#141416] break-all">
                          {info.wifiPassword}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopy('wifi', info.wifiPassword)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#EFECE6] border border-black/5 text-[11px] font-bold text-[#141416] transition-colors cursor-pointer"
                        >
                          {copiedField === 'wifi' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Kopiert!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Kopieren</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Check-in / Keybox Code */}
              {info.checkinCode && (
                <div className="bg-white/70 rounded-2xl p-3.5 border border-white/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#E8C2E8]/75 flex items-center justify-center shrink-0 text-[#141416]">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#141416]/50 block">
                      Check-in &amp; Schlüssel
                    </span>
                    <p className="text-xs font-bold text-[#141416] mt-0.5 break-words">
                      {info.checkinCode}
                    </p>
                  </div>
                </div>
              )}

              {/* Emergency / Notes */}
              {info.emergencyNotes && (
                <div className="bg-white/70 rounded-2xl p-3.5 border border-white/80 flex items-start gap-3 md:col-span-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-200/75 flex items-center justify-center shrink-0 text-[#141416]">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#141416]/50 block">
                      Notfall &amp; Wichtige Hinweise
                    </span>
                    <p className="text-xs font-semibold text-[#141416]/85 mt-0.5 break-words leading-relaxed">
                      {info.emergencyNotes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InfoBoardCard;
