# Vacayly – Gemeinsamer Urlaubs-Organizer

Ein interaktiver Gruppen-Urlaubsplaner im modernen Pastel-Bento-Design (inspiriert vom **Intelly** Dashboard-Look) für gemeinsame Reiseplanung ohne Account-Zwang.

## Highlights & Features

- **Nutzer-Auswahl ohne Account**: Oben in der Leiste mit einem Klick auswählen, wer man gerade ist (oder neue Mitreisende direkt hinzufügen) – sofort abstimmen, Vorschläge einreichen und Aufgaben abhaken.
- **Testmodus („Mallorca Sommer-Finca 2026“) & Eigener Urlaubs-Assistent**:
  - Sofort startklarer **Testmodus** mit 7 vollgepackten Urlaubstagen in Santanyí / Cala Llombards (Aktivitäten, Essensplan, Abstimmungen, Pack- & Einkaufsliste).
  - Jederzeit per Klick **eigenen Urlaub neu planen** (Reiseziel, Dauer 1–21 Tage, Mitreisende, Budget-Richtwert) oder die Demo-Daten zurücksetzen.
- **Tagesplan & Vorschläge mit Voting**: Aktivitäten pro Tag mit Zeitfenster, Ort, Kosten und Gruppen-Abstimmung planen.
- **Essensplaner & Kulinarik**: Frühstück, Mittagessen, Abendessen & Snacks pro Tag koordinieren – egal ob *Selbst kochen auf der Finca*, *Bäckerei*, *Lieferservice* oder *Restaurant*, inklusive Koch-Teams und Einkaufsnotizen.
- **Live-Abstimmungen (Polls)**: Mehrheitsentscheidungen für Mietwagen, Bootstour-Tage, Koch-Teams oder Ausflugsziele mit Prozentbalken und Favoriten-Krone.
- **Generelle Checkliste, Packliste & Einkauf**: Aufgaben vor der Reise, Gemeinschaftsgepäck, Dokumente und Ersteinkauf vor Ort mit Prioritäten und Zuständigkeiten.
- **Netlify Ready**: Inklusive `netlify.toml` und Serverless Function (`netlify/functions/trips.ts` mit `@netlify/blobs` + LocalStorage-Fallback).

## Lokale Entwicklung

```bash
npm install
npm run dev
```

## Produktions-Build

```bash
npm run build
```
