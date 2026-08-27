# Rulesets

`main.json` ist der Schutz für `main`, zum Import in GitHub. Die Datei wird von GitHub **nicht** automatisch gelesen — sie liegt hier, damit die Einstellung versioniert und nachvollziehbar ist. Wer sie ändert, muss sie in GitHub neu importieren.

## Reihenfolge — wichtig

Das Ruleset verlangt einen Pull Request für jede Änderung an `main`. Das gilt auch für den **allerersten** Push, der `main` überhaupt erst anlegt. Wer zuerst importiert und dann pusht, sperrt sich aus.

1. `main` pushen (`git push -u origin main` — der lokale Pre-Push-Hook fragt nach, `ALLOW_MAIN_PUSH=1` für diesen einen Fall)
2. Einen Test-PR öffnen und den CI-Workflow **einmal** laufen lassen
3. Erst danach importieren

Schritt 2 ist nicht optional: GitHub kennt einen Status-Check-Namen erst, wenn er mindestens einmal gemeldet wurde. Vorher lehnt der Import ihn ab oder verwirft ihn still.

## Import

**Automatisch — der Normalfall.** `scripts/bootstrap.sh` ruft in Schritt 2c das Skript auf, das den Import erledigt. Auch einzeln aufrufbar:

```bash
bash scripts/setup-ruleset.sh
```

Das Skript ist idempotent und bricht nichts ab. Es überspringt sich selbst mit einer Begründung, wenn `gh` fehlt oder nicht angemeldet ist, kein GitHub-Remote existiert, `main` noch nicht gepusht wurde, oder Rulesets für das Repo nicht verfügbar sind (privat ohne Pro → `403`).

Die Reihenfolge aus dem vorigen Abschnitt erzwingt es selbst: Solange `main` nicht auf dem Remote liegt, importiert es nichts und sagt, wann es nachzuholen ist. Beim ersten Bootstrap-Durchlauf ist das der Normalfall — danach einmal von Hand nachziehen.

**Manuell**, falls das Skript nicht greift: **Settings → Rules → Rulesets → New ruleset → Import a ruleset**, dann `main.json` hochladen.

## Was drinsteht

| Regel | Wirkung |
|---|---|
| `pull_request` | Kein direkter Push auf `main`, alles läuft über einen PR |
| `required_status_checks` | `Lint + Typecheck + Test` muss grün sein |
| `deletion` | `main` kann nicht gelöscht werden |
| `non_fast_forward` | Kein Force-Push auf `main` |

### Bewusst gesetzte Werte

**`required_approving_review_count: 0`** — GitHub lässt niemanden den eigenen PR freigeben. Bei einer Ein-Personen-Entwicklung würde jeder Wert über 0 bedeuten, dass sich nichts mehr mergen lässt. Sobald ein zweiter Mensch mitarbeitet, gehört hier `1` hin.

**`strict_required_status_checks_policy: true`** — der Branch muss vor dem Merge auf dem Stand von `main` sein. Kostet gelegentlich ein `git rebase`, fängt dafür den Fall ab, dass zwei Branches einzeln grün sind und zusammen kaputt.

**`bypass_actors: []`** — niemand umgeht die Regeln, auch Admins nicht. Kein Risiko, sich auszusperren: Wenn CI einmal hängt, lässt sich das Ruleset in den Settings in Sekunden auf `evaluate` oder `disabled` stellen.

**`integration_id: 15368` beim Status-Check** — bindet den Check an GitHub Actions als Quelle. Ohne diese Bindung zählt allein der Name: Jede App mit Schreibrecht auf die Checks-API könnte einen Check namens `Lint + Typecheck + Test` als erfolgreich melden und das Gate erfüllen, ohne dass ein Test lief. Bei einem öffentlichen Repo ist das kein theoretisches Risiko.

Die ID stammt aus der API (`gh api apps/github-actions`), nicht aus dem Gedächtnis. Wer den Check je von einer anderen Quelle melden lässt, muss sie anpassen.

**Beide Ziele in `ref_name.include`** — `~DEFAULT_BRANCH` **und** `refs/heads/main`. Der Platzhalter allein wandert mit: Wird der Default-Branch je auf einen anderen umgestellt, verliert `main` seinen Schutz, ohne dass jemand etwas ändert. Mit beiden Einträgen bleibt `main` geschützt, egal was Default ist. Solange `main` der Default ist, matchen beide dieselbe Branch — harmlos.

## Noch nicht enthalten: E2E

`Playwright (gegen Vercel-Preview)` fehlt — solange Vercel nicht angebunden ist, mit Absicht.

`e2e.yml` kennt zwei Zustände, gesteuert über die Repository-Variable **`VERCEL_CONNECTED`** (Settings → Secrets and variables → Actions → Variables):

| `VERCEL_CONNECTED` | Verhalten | Als Required Check? |
|---|---|---|
| nicht gesetzt / ≠ `true` | Job überspringt alles, endet grün | **Nein** — würde Schutz vortäuschen |
| `true` | Echtes Gate: keine Preview oder roter Test ⇒ Job scheitert | **Ja** |

Beobachtet am ersten PR (vor dem Umbau): Der Job lief 6–7 Minuten, lud 300 MB Playwright-Browser und führte **null** Tests aus — und meldete `success`. Genau das Muster, wegen dem die PR-Pflicht überhaupt eingeführt wurde (`CLAUDE.md` → Key Conventions).

### Wenn Vercel angebunden wird

1. Vercel mit dem Repo verknüpfen, einen PR öffnen, prüfen dass eine Preview entsteht
2. Repository-Variable `VERCEL_CONNECTED` auf `true` setzen
3. Einen PR öffnen und bestätigen, dass der Job **wirklich Tests ausführt** (Step „Run Playwright" darf nicht `skipped` sein)
4. Erst dann diesen Eintrag in `required_status_checks` ergänzen und neu importieren:

```json
{
  "context": "Playwright (gegen Vercel-Preview)",
  "integration_id": 15368
}
```

Schritt 3 ist nicht optional. Ein Required Check, der überspringt, ist genau die Lücke, die dieser Umbau beseitigen sollte.

## Status-Check-Namen

GitHub identifiziert Checks über den **Job**-Namen, nicht den Workflow-Namen:

| Datei | `name:` des Workflows | Job-Name = Check |
|---|---|---|
| `ci.yml` | CI | `Lint + Typecheck + Test` |
| `e2e.yml` | E2E | `Playwright (gegen Vercel-Preview)` |

Wer einen Job umbenennt, muss das Ruleset nachziehen — sonst wartet es auf einen Check, den es nicht mehr gibt, und **kein PR wird je mergebar**.

## Verhältnis zum lokalen Hook

`.githooks/pre-push` macht dasselbe auf diesem Rechner. Beides ergänzt sich:

- Der Hook meldet sich **vor** dem Push, spart also den vergeblichen Versuch — wirkt aber nur, wo er aktiviert ist (`git config core.hooksPath .githooks`).
- Das Ruleset wirkt serverseitig für alle und lässt sich nicht umgehen.

Der Hook war der Ersatz, solange das Repo privat und ohne GitHub Pro war. Er darf bleiben.
