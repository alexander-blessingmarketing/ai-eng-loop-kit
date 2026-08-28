# Design-System

> Konkrete Design-Tokens für dieses Projekt — verbindlich für `/build`, damit UI-Entscheidungen nicht pro Feature neu getroffen werden.

## Ausgangspunkt

Minimalistisches, rein lokales GitHub-Repo-Dashboard. Gewünschter Feel: **Cyberpunk**.

**Bewusste Abweichung vom Kit-Standard:** Normalerweise verlangt dieses Kit Light **und** Dark von Anfang an. Für dieses Projekt — ein rein lokales Ein-Personen-Tool — wurde explizit **nur Dark** gewählt. Kein Light-Mode-Fallback vorgesehen.

## Farben (nur Dark)

| Token | Wert | Verwendung |
|-------|------|------------|
| Background | `#0A0A0F` | App-Hintergrund |
| Foreground | `#E4E4F0` | Haupttext |
| Primary (Cyan) | `#00F0FF` | Primäraktionen, Links, aktive Zustände |
| Primary Hover | `#33F3FF` | Hover auf Primary |
| Primary Active | `#00C4D1` | Active/Pressed auf Primary |
| Primary Subtle-BG | `#00F0FF1A` | Dezenter Hintergrund für Primary-Elemente |
| Secondary (Magenta) | `#F72585` | Zweitakzent, z. B. offene PRs |
| Accent (Violett) | `#9D4EDD` | Dritter Akzent, z. B. Historie/Timeline |
| Destructive | `#FF3860` | Fehler, fehlgeschlagene Checks |
| Panel-Background | `#13131A` | Karten/Panels |
| Panel-Border | `#2A2A3A` | Kartenrand (Glow in Primary bei Hover) |

## Typografie

- **Headings:** Orbitron (Google Font) — futuristischer Cyberpunk-Look
- **Body / Daten** (Repo-Namen, Commit-Messages, Zahlen, Hashes): JetBrains Mono — Terminal-/Code-Gefühl, gut lesbar bei Zahlen
- **Skala:** 12 / 14 / 16 / 20 / 28 / 36 px
- **Gewichte:** Body regular (400), Headings 600–700

## Radius, Spacing, Elevation

- **Radius:** 4px durchgehend — kantig statt verspielt, passt zum technischen Look
- **Spacing-Raster:** 4px-Basis (4/8/12/16/24/32...)
- **Elevation:** keine Schatten — stattdessen dezenter Neon-Glow (`box-shadow` in Primärfarbe, niedrige Opazität) auf Hover/aktiven Karten

## Komponenten-Konventionen

- **Buttons:** Standardgröße `md`, Default-Variante als Outline (Cyan-Border, transparenter Hintergrund) statt flächigem Neon-Fill
- **Ladezustand:** pulsierendes Skeleton in Panel-Farbe
- **Leerzustand:** dezenter monospace-Hinweistext
- **Fokus-Zustand:** sichtbarer 2px Cyan-Outline auf allen interaktiven Elementen (Pflicht für Tastaturbedienung, auch bei Dark-only)
- **Kontrast:** Text auf Background und auf Panel-Background jeweils ≥ 4.5:1
