/**
 * Laeuft automatisch nach jedem `npm install`.
 *
 * Zwei Aufgaben:
 *   1. Git-Hooks aktivieren (.githooks/pre-push) — still, weil automatisch.
 *   2. Melden, was fuer dieses Projekt noch offen ist — und NUR dann.
 *
 * Warum hier: `/verify-setup` ist eine managed Skill des Kits und kennt die
 * Ergaenzungen dieses Forks nicht. Sie meldet "bereit", waehrend main
 * ungeschuetzt ist. Anfassen duerfen wir sie nicht — das naechste `update`
 * wuerde es ueberschreiben.
 *
 * `npm install` ist die eine Stelle, an der jeder vorbeikommt, egal ob er das
 * Kit kennt oder nicht. Ein Hinweis in einer README setzt voraus, dass jemand
 * sie liest; dieser hier nicht.
 *
 * **Schweigen heisst: alles erledigt.** Wer bei jedem Lauf dieselbe Wand Text
 * sieht, liest sie nach dem dritten Mal nicht mehr.
 *
 * Bricht nie ab: kein Git, kein gh, keine Rechte, CI — dann passiert eben
 * nichts. Ein fehlgeschlagenes postinstall killt die Installation, und das
 * waere schlimmer als jeder fehlende Hinweis.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const CI = Boolean(process.env.CI);

function lauf(cmd, args, timeout = 5000) {
  return execFileSync(cmd, args, {
    stdio: ["ignore", "pipe", "ignore"],
    timeout,
  })
    .toString()
    .trim();
}

function versuche(fn, fallback = null) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

// ─── 1. Git-Hooks ─────────────────────────────────────────────────────────
function hooksAktivieren() {
  if (!existsSync(".githooks")) return;
  if (!versuche(() => lauf("git", ["rev-parse", "--git-dir"]))) return;

  const gesetzt = versuche(
    () => lauf("git", ["config", "--get", "core.hooksPath"]),
    "",
  );
  if (gesetzt === ".githooks") return;

  // `git config <key> <value>` gibt nichts aus — der Rueckgabewert taugt also
  // nicht als Erfolgsindikator. Wirft es nicht, hat es geklappt.
  try {
    lauf("git", ["config", "core.hooksPath", ".githooks"]);
    console.log("✓ Git-Hooks aktiviert (.githooks)");
  } catch {
    // Kein Schreibrecht auf die Git-Config — nicht kritisch, still weiter.
  }
}

// ─── 2. Was ist noch offen? ───────────────────────────────────────────────
function offenePunkte() {
  const punkte = [];

  const remote = versuche(() => lauf("git", ["remote", "get-url", "origin"]));
  if (!remote) return punkte; // Kein Remote — nichts zu schuetzen.
  if (!/github\.com/i.test(remote)) return punkte; // Kein GitHub — Rulesets gibt es nicht.

  const mainGepusht = versuche(
    () => lauf("git", ["ls-remote", "--heads", "origin", "main"], 10000),
    null,
  );
  if (mainGepusht === null) return punkte; // Remote nicht erreichbar — nicht raten.

  if (mainGepusht === "") {
    punkte.push({
      was: "main liegt noch nicht auf dem Remote",
      tu: "git push -u origin main",
      warum: "muss VOR dem Branch-Schutz passieren, sonst sperrst du dich aus",
    });
    punkte.push({
      was: "Branch-Schutz fehlt — main ist ungeschuetzt",
      tu: "bash scripts/setup-ruleset.sh",
      warum: "danach ausfuehren",
    });
    return punkte;
  }

  const hatGh = versuche(() => lauf("gh", ["--version"], 3000));
  if (!hatGh) {
    punkte.push({
      was: "Branch-Schutz nicht pruefbar — GitHub CLI fehlt",
      tu: "gh installieren, dann: bash scripts/setup-ruleset.sh",
      warum: "oder von Hand: Settings → Rules → Rulesets → Import a ruleset",
    });
    return punkte;
  }

  // Anmeldung getrennt pruefen. Sonst laesst sich ein 403 wegen fehlender
  // Anmeldung nicht von einem 403 wegen des Free-Plans unterscheiden — und
  // Schweigen bei Unwissen waere genau die Luecke, die dieses Skript schliessen
  // soll.
  const angemeldet = versuche(() => lauf("gh", ["auth", "status"], 5000)) !== null;
  if (!angemeldet) {
    punkte.push({
      was: "Branch-Schutz nicht pruefbar — gh ist nicht angemeldet",
      tu: "gh auth login, dann: bash scripts/setup-ruleset.sh",
      warum: "ohne Anmeldung laesst sich nicht sagen, ob main geschuetzt ist",
    });
    return punkte;
  }

  const repo = versuche(() =>
    lauf("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], 10000),
  );
  if (!repo) return punkte;

  const anzahl = versuche(
    () => lauf("gh", ["api", `repos/${repo}/rulesets`, "--jq", "length"], 10000),
    null,
  );

  // Angemeldet und trotzdem kein Zugriff: Rulesets brauchen bei privaten Repos
  // GitHub Pro. Dann gibt es hier nichts zu tun — der lokale Hook oben ist der
  // vorgesehene Ersatz, und eine Dauerwarnung ohne moegliche Abhilfe waere nur
  // Rauschen.
  if (anzahl === null) return punkte;

  if (anzahl === "0") {
    punkte.push({
      was: "Branch-Schutz fehlt — main ist ungeschuetzt",
      tu: "bash scripts/setup-ruleset.sh",
      warum: "/verify-setup prueft das nicht und meldet trotzdem 'bereit'",
    });
  }

  return punkte;
}

function melden(punkte) {
  if (punkte.length === 0) return;
  const linie = "─".repeat(66);
  console.log(`\n${linie}`);
  console.log("  Fuer dieses Projekt ist noch etwas offen:\n");
  punkte.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.was}`);
    console.log(`     → ${p.tu}`);
    console.log(`       (${p.warum})\n`);
  });
  console.log("  Hintergrund: CLAUDE.md → Key Conventions");
  console.log(`${linie}\n`);
}

try {
  hooksAktivieren();
  if (!CI) melden(offenePunkte());
} catch {
  // Absicht: nichts darf die Installation abbrechen.
}
