#!/usr/bin/env bash
#
# Importiert .github/rulesets/main.json als Ruleset in GitHub.
#
# Wird von scripts/bootstrap.sh aufgerufen, laeuft aber auch einzeln:
#   bash scripts/setup-ruleset.sh
#
# Idempotent: Existiert ein Ruleset dieses Namens bereits, passiert nichts.
#
# Das Skript bricht NICHT den Bootstrap ab, wenn etwas fehlt — es sagt, was
# es nicht konnte, und warum. Ein stiller Fehlschlag waere hier das
# Schlimmste: Man haelt main fuer geschuetzt, und er ist es nicht.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATEI="$ROOT/.github/rulesets/main.json"

fehler() { echo "  ⚠️  $1" >&2; }
hinweis() { echo "     $1" >&2; }

echo ""
echo "🔒 Branch-Schutz fuer main"

# ─── Voraussetzungen ──────────────────────────────────────────────────────
if [ ! -f "$DATEI" ]; then
  fehler "Nicht gefunden: .github/rulesets/main.json"
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  fehler "GitHub CLI (gh) ist nicht installiert — uebersprungen."
  hinweis "Nachholen: https://cli.github.com, dann bash scripts/setup-ruleset.sh"
  exit 0
fi

if ! gh auth status >/dev/null 2>&1; then
  fehler "gh ist nicht angemeldet — uebersprungen."
  hinweis "Nachholen: gh auth login, dann bash scripts/setup-ruleset.sh"
  exit 0
fi

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
if [ -z "$REPO" ]; then
  fehler "Kein GitHub-Repo gefunden (kein origin?) — uebersprungen."
  hinweis "Erst das Repo anlegen und pushen, dann bash scripts/setup-ruleset.sh"
  exit 0
fi

# Das Ruleset verlangt einen PR fuer jede Aenderung an main — auch fuer den
# allerersten Push, der main ueberhaupt anlegt. Wer zuerst importiert und dann
# pusht, sperrt sich aus.
if ! git ls-remote --exit-code --heads origin main >/dev/null 2>&1; then
  fehler "Der Branch 'main' existiert noch nicht auf dem Remote — uebersprungen."
  hinweis "Sonst wuerde das Ruleset den ersten Push blockieren."
  hinweis "Erst: git push -u origin main   danach: bash scripts/setup-ruleset.sh"
  exit 0
fi

# ─── Schon vorhanden? ─────────────────────────────────────────────────────
NAME="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$DATEI','utf8')).name)" 2>/dev/null || echo "main protection")"

VORHANDEN="$(gh api "repos/$REPO/rulesets" --jq "map(select(.name==\"$NAME\")) | length" 2>/dev/null || echo "fehler")"

if [ "$VORHANDEN" = "fehler" ]; then
  fehler "Rulesets sind fuer dieses Repo nicht verfuegbar — uebersprungen."
  hinweis "Bei PRIVATEN Repos braucht das GitHub Pro; die API antwortet sonst mit 403."
  hinweis "Alternativen: Repo oeffentlich stellen, Pro buchen — oder beim lokalen"
  hinweis "Hook .githooks/pre-push bleiben, der wirkt auch ohne."
  exit 0
fi

if [ "$VORHANDEN" != "0" ]; then
  echo "  ℹ️  Ruleset \"$NAME\" existiert bereits — nichts zu tun."
  echo "     Zum Aktualisieren in GitHub loeschen und dieses Skript erneut laufen lassen."
  exit 0
fi

# ─── Import ───────────────────────────────────────────────────────────────
if gh api "repos/$REPO/rulesets" --method POST --input "$DATEI" >/dev/null 2>&1; then
  echo "  ✓ Ruleset \"$NAME\" angelegt — main ist serverseitig geschuetzt."
  echo ""
  echo "     Der Status-Check greift erst, wenn er einmal gemeldet wurde."
  echo "     Beim ersten PR laeuft die CI und meldet ihn; danach ist alles scharf."
  echo ""
  echo "     E2E ist bewusst NICHT als Pflicht-Check drin — der Job ueberspringt,"
  echo "     solange Vercel nicht verknuepft ist. Details und der Weg dorthin:"
  echo "     .github/rulesets/README.md"
else
  fehler "Import fehlgeschlagen."
  hinweis "Manuell: Settings → Rules → Rulesets → New ruleset → Import a ruleset"
  hinweis "Datei: .github/rulesets/main.json"
fi
