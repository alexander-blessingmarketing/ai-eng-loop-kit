# Instincts — Automatic Coding Behaviors

> Ergänzt `general.md`: HOW, nicht WHAT.

## Vor neuem Code
- **Suche vor Neuerstellung:** Codebase nach ähnlichen Impls durchsuchen, wiederverwenden statt neu
- **`src/lib/`:** vor neuer Utility (z.B. `cn()`, `formatDate()`)
- **`src/components/ui/`:** vor UI-Primitive (shadcn prüfen)
- **`src/hooks/`:** vor neuem Hook

## Während Implementation
- **Read-before-modify:** Datei vor Edit lesen, nie aus Memory/nach Compaction raten
- **Imports verifizieren:** Exports/Paths durch Lesen bestätigen, nie raten
- **Minimal:** Nur ändern was nötig ist — kein Refactor, keine Kommentare, kein "Improve" am Drumherum
- **Type-safety:** Kein `any`, Interfaces oder `z.infer<typeof schema>`

## Bei Errors
- **Vollen Error lesen** bevor Fix versucht wird
- **Diagnose vor Fix:** Ursache verstehen, Annahmen checken, Pfad tracen
- **Ein Fix auf einmal,** dann re-run. Keine Stapel-Fixes.

## Nach Implementation
- **Build-Check:** `npm run build` vor "fertig"
- **Eigenen Diff reviewen:** Debug-Logs, auskommentierter Code, TODOs entfernen
- **Extract wenn reusable:** Inline-Utility → `src/lib/` nur bei 2+ potenziellen Callern, nicht spekulativ

## Security
- **Keine Secrets im Code** → `.env.local`
- **Boundaries validieren** (User-Input, externe APIs) mit Zod; internem Code vertrauen
- **Auth zuerst** in API-Routes: Session vor Verarbeitung prüfen

## Supabase RLS
- **`auth.uid()` immer als `(SELECT auth.uid())`** in Policy-USING/WITH-CHECK-Ausdrücken — auch in Funktions-Argumenten und nested Subselects. Sonst evaluiert Postgres pro Row statt einmal pro Query → Performance-Advisor-Warning `auth_rls_initplan` (siehe PROJ-30).
- **`auth.role()` / `auth.jwt()`** analog wrappen.
