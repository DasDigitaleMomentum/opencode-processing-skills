---
type: documentation
entity: concept
status: draft
---

# Agent Checkpoint / Heartbeat

## Zweck

Jeder Agent, einschließlich des Parents, segmentiert seine Arbeit selbstständig in Subtasks und protokolliert nach jedem abgeschlossenen oder fehlgeschlagenen Subtask:

- den gerade erledigten Schritt,
- den als Nächstes geplanten Schritt,
- ob der versuchte Schritt fehlgeschlagen ist und nun korrigiert wird,
- Session-ID und Zeitstempel.

Das Checkpoint-Tool übernimmt zusätzlich eine vom Harness defensibel bereitgestellte ungefähre Context-Auslastung. Der OpenCode-Pilot leitet sie über `PluginInput.client` aus dem letzten vorherigen abgeschlossenen Assistant-Schritt ab: Er verwendet dieselben Token-Felder wie die TUI und die Context-Grenze des passenden Providers und Modells. Fehlende oder ungültige Daten sowie SDK-Fehler werden weiterhin als `null` gespeichert und als `unknown` zurückgegeben.

Das Log ergänzt den Blueprint oder ursprünglichen Subagent-Prompt. Es soll diese Informationen nicht duplizieren und ist kein vollständiges Recovery-Schema.

## Grundprinzip

Der jeweilige Agent ruft nach jedem selbst bestimmten Subtask ein Tool auf:

```text
checkpoint(done, next, step_failed=false)
```

Beispiel:

```text
checkpoint(
  done="API Aufrufe prüfen",
  next="Logging Schema bauen"
)
```

`done` und `next` sollen kurze Stichpunkte von genau drei Wörtern sein. Die Kürze wird über die Tool-Beschreibung angefordert, aber nicht technisch erzwungen.

Ein fachlich fehlgeschlagener Arbeitsschritt ist von einem Canary-Fehler zu unterscheiden. Der Agent setzt dafür `step_failed` auf `true` und beschreibt in `next` den vorgesehenen Korrekturschritt:

```text
checkpoint(
  done="Tests gezielt ausführen",
  next="Testfehler gezielt beheben",
  step_failed=true
)
```

Der Checkpoint zeigt damit korrekt an, dass die Instruktion weiterhin befolgt wurde, obwohl der Arbeitsschritt selbst nicht erfolgreich war.

## Verkettung der Arbeitsschritte

Für zwei aufeinanderfolgende Checkpoints derselben Session gilt:

```text
vorher.next == aktuell.done
```

Beispiel:

```json
{"done":"API Aufrufe prüfen","next":"Logging Schema bauen"}
{"done":"Logging Schema bauen","next":"Lesezugriff gezielt ergänzen"}
```

Der Agent verwendet den zuvor angekündigten `next`-Text beim folgenden Aufruf unverändert als `done`. Dadurch kann eine externe Auswertung ohne inhaltliche Interpretation erkennen, wie konsistent die protokollierte Arbeitskette ist.

Die Chain-Übereinstimmung kann aus dem Log über die gesamte Session als Prozentwert berechnet werden:

```text
chain_percent = übereinstimmende Übergänge / geprüfte Übergänge * 100
```

Beim ersten Checkpoint ist noch kein Übergang prüfbar und `chain_percent` daher `null`. Eine Abweichung bleibt in der Folge der Rohdaten sichtbar, blockiert den Agenten aber nicht.

Eine externe Auswertung kann zusätzlich die Drei-Worte-Regel prüfen. Dafür zählt sie die durch Leerraum getrennten Wörter in `done` und `next` und berechnet:

```text
three_word_percent = Stichpunkte mit genau drei Wörtern / alle Stichpunkte * 100
```

Auch dieser Wert ist ein Hinweis auf Instruktionsbefolgung und kein Qualitätsnachweis.

## Getrennte Auswertung

Die beiden Ziele werden getrennt ausgewertet:

- **Canary-Effekt:** Wurde `checkpoint` aufgerufen, wurde die Verkettung eingehalten und wurden die Stichpunkte mit drei Wörtern formuliert?
- **Arbeitsfortschritt:** Was wurde versucht, was folgt als Nächstes und ist der Schritt laut `step_failed` fehlgeschlagen?

`step_failed=true` senkt die gemessene Canary-Qualität nicht. Es zeigt im Gegenteil, dass der Agent trotz eines fachlichen Fehlschlags korrekt checkpointet und einen Korrekturschritt angekündigt hat.

## Schreibfunktion

### `checkpoint`

```text
checkpoint(done: string, next: string, step_failed: boolean = false)
```

Das Tool:

1. ermittelt Session-ID und Zeitstempel,
2. übernimmt die vom Adapter bereitgestellte Context-Telemetrie oder `null`,
3. protokolliert den gemeldeten Erfolg oder Fehlschlag des Schritts,
4. übernimmt den vom Adapter bereitgestellten Agentennamen und den aktuellen Session-Titel oder jeweils `null`,
5. hängt einen JSONL-Eintrag an das Session-Log an,
6. gibt Context-Auslastung und verbleibende K-Tokens zurück, sofern vorhanden, sonst `unknown`.

Antwort des OpenCode-Adapters bei verfügbaren Daten:

```text
Checkpoint saved.
Context (previous completed step, TUI-equivalent): ~72%
Remaining K-tokens (context-window headroom): ~56k
```

OpenCode wählt rückwärts den neuesten Assistant-Schritt mit positiven Output-Tokens aus und summiert Input, Output, Reasoning, Cache-Read und Cache-Write. `context_used` ist diese Summe geteilt durch die Context-Grenze des über `providerID` und `modelID` passenden Modells. Die verbleibenden K-Tokens sind `(Context-Grenze - Tokensumme) / 1000`, mindestens null.

Der gerade `checkpoint` aufrufende Assistant-Schritt ist noch nicht finalisiert und wird daher nicht ausgewählt. Die Angaben sind folglich Schätzwerte für den vorherigen abgeschlossenen Schritt, keine Live-Werte des aktiven Schritts. „Context-window headroom“ bezeichnet außerdem **nicht** den Abstand zu OpenCodes Compaction-Schwelle oder reservierten Compaction-Tokens.

Wenn SDK-Methoden, Session-ID oder ein abgeschlossener Schritt fehlen, Antworten fehlschlagen, Token-/Provider-/Modelldaten ungültig sind oder keine gültige Context-Grenze gefunden wird, bleibt die Antwort ausdrücklich:

```text
Checkpoint saved.
Context (previous completed step, TUI-equivalent): unknown
Remaining K-tokens (context-window headroom): unknown
```

## Pfad- und Lesezugriff

### `checkpoint_path`

```text
checkpoint_path(session_id: string)
```

Die Funktion gibt den relativen Pfad zur JSONL-Datei einer Session zurück. Session-IDs werden verlustfrei per `encodeURIComponent` für den Dateinamen kodiert; beispielsweise wird `parent/session` zu `parent%2Fsession`:

```text
.agent-checkpoints/parent%2Fsession.jsonl
```

Falls ein Harness keine geeignete Session-ID bereitstellt, verwendet der Adapter eine andere stabile, eindeutige ID und dokumentiert diese als Parameter von `checkpoint_path`.

Der Parent kann den Pfad selbst auswerten, an einen Retriever weiterreichen oder den implementierten read-only Inspector vom Workspace-Root aufrufen:

```bash
node packages/checkpoint-core/bin/checkpoint-inspect.js .agent-checkpoints/parent%2Fsession.jsonl
```

Der Inspector akzeptiert genau einen ausgewählten Pfad, scannt keine Sessions und verändert das Log nicht. Es ist keine zusätzliche Recovery- oder Lese-Datenstruktur vorgesehen.

Der Parent kann die Funktion selbst verwenden oder die Auswertung an einen Retriever delegieren, zum Beispiel:

> Lies `.agent-checkpoints/ses_123.jsonl`. Wie weit ist die Session gekommen, wie hoch sind Chain- und Drei-Worte-Übereinstimmung und welcher Schritt war als Nächstes vorgesehen?

Der Parent kombiniert die Antwort anschließend mit dem ihm bekannten Blueprint oder ursprünglichen Subagent-Prompt. Daraus kann er einen Folge-Subagenten ungefähr an der richtigen Stelle weiterarbeiten lassen.

Beispielausgabe des Inspectors:

```text
File: .agent-checkpoints/ses_123.jsonl
Session: ses_123
Agent: implementer
Name/title: Checkpoint TUI refinement
Latest timestamp: 2026-07-26T14:30:00.000Z
Last attempted: Logging Schema bauen
Next announced: Lesezugriff gezielt ergänzen
Work status: COMPLETED
Context used: unknown
Chain: 2/2 (100%)
Work: 2/3 (66.67%)
Three-word compliance: 6/6 (100%)
```

## JSONL-Format

Jeder Aufruf erzeugt genau eine Zeile:

```json
{"timestamp":"2026-07-26T14:30:00Z","session_id":"ses_123","done":"Tests gezielt ausführen","next":"Testfehler gezielt beheben","step_failed":true,"context_used":0.72,"agent":"implementer","session_title":"Checkpoint TUI refinement"}
```

Aktuelle Datensätze enthalten genau acht Felder:

| Feld | Bedeutung |
|------|-----------|
| `timestamp` | Vom Tool gesetzter UTC-Zeitstempel |
| `session_id` | Session-Kennung des Harnesses |
| `done` | Gerade abgeschlossener oder versuchter Subtask |
| `next` | Als Nächstes angekündigter Subtask |
| `step_failed` | `true`, wenn der versuchte Schritt fehlgeschlagen ist und `next` seine Korrektur beschreibt; sonst `false` |
| `context_used` | Vom Harness gemeldete ungefähre Context-Auslastung von `0.0` bis `1.0` oder `null` |
| `agent` | Vom Adapter zum Schreibzeitpunkt übernommener Agenten-/Persona-Name oder `null` |
| `session_title` | Zum Schreibzeitpunkt gelesener, menschenlesbarer Session-Titel oder `null` |

Pro Session wird eine append-only Datei unter `.agent-checkpoints/<session_id>.jsonl` angelegt. Der Pfad ist relativ zum Workspace, damit Parent, Retriever und Nutzer ihn gezielt lesen und filtern können. Die Session-ID wird für den Dateinamen bereinigt. Das Verzeichnis soll nicht versioniert werden.

Ältere Logs mit ausschließlich den ursprünglichen sechs Feldern bleiben lesbar. Parser und Auswertung normalisieren dort fehlendes `agent` und `session_title` im Speicher zu `null`, ohne die append-only Quelldatei umzuschreiben. Ein Mischlog aus sechs- und achtfeldrigen Zeilen ist damit ebenfalls zulässig; unvollständige Zwischenformen mit nur einem Metadatenfeld sind es nicht (`packages/checkpoint-core/src/index.js:59-123`, `packages/checkpoint-core/test/checkpoint-core.test.js:162-172`).

`session_title` ist eine Momentaufnahme und kann sich durch Umbenennung zwischen zwei Checkpoints derselben Session ändern. Für Identität, Pfadwahl und Zusammenführung bleibt deshalb `session_id` maßgeblich; Titel und Agent dienen der Anzeige. Chain-/Work-/Drei-Worte-Prozent, Token-Restmenge und Dateiname gehören nicht in die JSONL-Einträge. Sie sind Laufzeitinformationen oder aus den Rohdaten ableitbare Werte und werden bei Bedarf extern berechnet. OpenCode schreibt bei gültigen SDK-Daten die geschätzte TUI-äquivalente Context-Auslastung des vorherigen abgeschlossenen Schritts in `context_used`; andernfalls bleibt das Feld `null`.

## Agenten-Instruktion

Die Agentendefinition erhält eine kurze Meta-Instruktion:

> Segmentiere deine Arbeit selbstständig in sinnvolle Subtasks. Rufe nach jedem abgeschlossenen Subtask `checkpoint` mit dem erledigten und dem nächsten Subtask auf. Formuliere beide Stichpunkte mit genau drei Wörtern. Verwende beim folgenden Aufruf den zuvor angekündigten `next`-Text unverändert als `done`. Wenn die zurückgemeldete Context-Auslastung zu hoch wird, setze einen letzten Checkpoint und gib dem Parent zurück, wie weit du gekommen bist und welcher Schritt als Nächstes übernommen werden soll.

> Wenn ein versuchter Subtask fehlschlägt, rufe `checkpoint` trotzdem auf. Verwende den angekündigten Subtask als `done`, setze `step_failed=true` und beschreibe in `next` den Korrekturschritt. Ein fachlicher Fehlschlag ist kein Canary-Fehler, solange der Checkpoint und die Verkettungsregel korrekt eingehalten werden.

Es gibt keinen festen globalen Grenzwert für den kontrollierten Abbruch. Der Agent entscheidet anhand der zurückgegebenen ungefähren Auslastung und der noch anstehenden Arbeit.

Diese Anweisung gilt auch für den Parent. Er protokolliert damit seine eigenen Schritte, beispielsweise das Erstellen eines Subagent-Auftrags, die Prüfung eines zurückgegebenen Ergebnisses und die Entscheidung über die Fortsetzung.

## Live-Terminal-Dashboard

`checkpoint-watch` liest dieselben Roh-Logs und zeigt den letzten Stand aller direkt auffindbaren Sessions. Vom Workspace-Root startet die Quellversion mit `node packages/checkpoint-core/bin/checkpoint-watch.js` im Live-Modus; `--once` erzeugt genau eine deterministische Ausgabe ohne ANSI-Steuerzeichen. Die installierte Version wird mit dem exakten `Launch command:` gestartet, den `./install.sh` beziehungsweise `./install.sh --project` ausgibt. Globale und projektlokale Pfade sowie der Neustart-Hinweis stehen in der [Installationsanleitung](installation.md#checkpoint-dashboard-quickstart). Der OpenCode-Neustart lädt die Plugin-Tools; das eigenständige Dashboard kann sofort starten.

Die Spalten sind `SESSION`, `AGENT`, `NAME/TITLE`, `AGE`, `STATE`, `CHAIN`, `WORK`, `3-WORD`, `CONTEXT`, `DONE` und `NEXT`. `CHAIN`, `WORK` und `3-WORD` erscheinen jeweils als `Erfolge/Anzahl (Prozent)`, beispielsweise `1/1 (100%)`, `2/3 (66.7%)` und `6/6 (100%)`; ein noch nicht prüfbarer erster Übergang ist `0/0 (n/a)`. `ACTIVE` bedeutet ausschließlich, dass das Alter des letzten Checkpoints unter dem Stale-Grenzwert liegt; ab dem Grenzwert erscheint `STALE`. **Beide Zustände bewerten nur das Checkpoint-Alter und beweisen keine Prozess-Liveness.** `WORK` zählt Checkpoints mit `step_failed=false`; es ist kein Nachweis fachlicher Korrektheit.

Der Watcher hält Identitäts-, Alters-, Status- und Context-Spalten auf festen Breiten und dimensioniert die Metrikspalten anhand ihrer formatierten Zähler. Den verbleibenden Platz teilt er möglichst gleichmäßig auf `NAME/TITLE`, `DONE` und `NEXT` auf; Restspalten gehen deterministisch in genau dieser Reihenfolge an Titel, Done und Next. Zu lange Werte werden rechts mit `…` gekürzt (bei nur einem verfügbaren Zeichen hart abgeschnitten), anschließend wird auch jede Gesamtzeile auf die Terminalbreite begrenzt. Gleiche Daten und gleiche Breite erzeugen deshalb immer dieselbe Ausgabe (`packages/checkpoint-core/bin/checkpoint-watch.js:152-213`).

Live-Modus aktualisiert standardmäßig jede 1.000 ms; nach 120.000 ms gilt ein Checkpoint als stale. Positive Millisekundenwerte können über `--refresh-ms`/`--stale-ms` gesetzt werden. `CHECKPOINT_WATCH_REFRESH_MS` und `CHECKPOINT_WATCH_STALE_MS` liefern Umgebungsdefaults, die CLI-Optionen überschreiben. Änderungen im Checkpoint-Verzeichnis lösen ebenfalls eine Aktualisierung aus. Ctrl-C beziehungsweise SIGTERM schließt Watcher und Timer und stellt den Terminal-Cursor wieder her (`packages/checkpoint-core/bin/checkpoint-watch.js:221-267`).

Der Scope ist absichtlich nur das direkte Verzeichnis `.agent-checkpoints/*.jsonl` des aktuellen Workspace: reguläre JSONL-Dateien werden gelesen, Unterverzeichnisse und andere Erweiterungen ignoriert (`packages/checkpoint-core/bin/checkpoint-watch.js:62-75`). Eine fehlende Directory ergibt eine leere Anzeige. Eine malformed oder während des Lesens inkonsistente Datei erscheint als kompakte `ERROR`-Zeile, ohne gültige Sessions zu blockieren (`packages/checkpoint-core/bin/checkpoint-watch.js:85-133`). Die Logs werden nicht verändert.

Das Dashboard und der Inspector haben verschiedene Aufgaben: `checkpoint-watch` entdeckt mehrere direkte Session-Logs und verdichtet jede auf eine Zeile; `checkpoint-inspect` erhält genau einen bewusst ausgewählten Pfad, scannt keine Sessions und zeigt die detaillierte Zusammenfassung dieses Logs.

## Harness-Unterstützung

Der aufrufbare Tool-Vertrag bleibt harnessübergreifend gleich. Adapter unterscheiden sich bei Session-ID, Context-Telemetrie und optionalen Metadaten; der aktuelle gemeinsame Datensatz reserviert dafür die nullable Felder `agent` und `session_title`.

| Harness | Tool-Anbindung | Session-ID | Context-Rückmeldung |
|---------|----------------|------------|---------------------|
| OpenCode | Native Custom Tools `checkpoint` und `checkpoint_path`; `agent` aus `ToolContext.agent`, Titel und Telemetrie über `PluginInput.client` | `ToolContext.sessionID` | Geschätzter Context-Anteil des vorherigen abgeschlossenen Assistant-Schritts und verbleibende Context-Window-K-Tokens; bei fehlenden/ungültigen Daten oder SDK-Fehlern `null`/`unknown` |
| Codex | MCP-Tool, bei Bedarf ergänzt durch Hook oder App-Server-Anbindung | Über Codex-Session beziehungsweise Thread | Ungefährer verfügbarer Usage-Wert, sonst `null` |
| PydanticAI | Native Python Function Tool | `run_id` beziehungsweise `conversation_id` | Aus verfügbarer Run Usage und Modellgrenze ableitbar, sonst `null` |
| Claude Code | MCP-Tool in einem Plugin | Über Claude-Code-Session beziehungsweise Hook | Über verfügbare Statusline-Contextdaten, sonst `null` |

MCP kann den gemeinsamen Aufruf `checkpoint(done, next, step_failed)` transportieren. Harness-spezifische Adapter ergänzen Session-ID und Context-Werte, weil diese Informationen nicht Teil des allgemeinen MCP-Vertrags sind.

## Erwartetes Verhalten bei Context-Druck

Wenn die Tool-Antwort eine hohe Auslastung meldet, soll der Subagent nicht unkontrolliert bis zum Context-Ende weiterarbeiten. Er kann:

1. den aktuellen Subtask sauber beenden,
2. einen letzten Checkpoint mit dem nächsten konkreten Schritt schreiben,
3. dem Parent kurz mitteilen, was erreicht wurde und was übernommen werden soll.

Der Parent liest bei Bedarf das Session-Log und kombiniert es mit Blueprint, Prompt und aktuellem Arbeitsstand.

## Grenzen

- Der Tool-Aufruf beweist nicht, dass der erledigte Schritt fachlich korrekt ist.
- `step_failed=true` beschreibt das Arbeitsergebnis und wird nicht als Qualitätsproblem des Canarys gewertet.
- Der Agent bestimmt selbst, was ein Subtask ist und wann er abgeschlossen ist.
- Ein fehlender Checkpoint kann auf einen Abbruch, einen langen Arbeitsschritt oder fehlende Instruktionsbefolgung hinweisen.
- Context-Werte sind harnessabhängig und dürfen ungefähr oder unbekannt sein.
- Das Log ersetzt weder Blueprint noch Prompt, Tests, Diff oder Planungsartefakte.

## OpenCode-Implementierung und Installation

OpenCode ist der erste implementierte Harness. Der Adapter verwendet `ToolContext.sessionID` als Session-Kennung, `ToolContext.worktree` als Workspace-Root und `ToolContext.agent` als nullable Persona-Momentaufnahme. Über `PluginInput.client.session.get` liest er bei jedem Checkpoint den dann aktuellen Titel (`opencode/checkpoint-plugin.ts:53-60`, `opencode/checkpoint-runtime.mjs:16-41`, `opencode/checkpoint-runtime.mjs:157-193`). Titel- und Telemetrieabfragen werden unabhängig abgewartet; Fehler von `session.get`, leere Titel oder fehlende Agentennamen ergeben `null` und verhindern den Schreibvorgang nicht. Die globale Installation legt `plugins/checkpoint.ts` und die Supportmodule unter `lib/opencode-processing-skills/` im konfigurierten OpenCode-Home ab; `./install.sh --project` verwendet stattdessen `./.opencode/` (`install.sh:923-943`, `install.sh:1088-1090`). Ein Neustart von OpenCode lädt die Tools. Falls ein lokaler Development-Build keine gleich versionierte veröffentlichte `@opencode-ai/plugin`-Abhängigkeit auflösen kann, registriert der Shim dieselben Tool-Definitionen über OpenCodes eingebaute JSON-Schema-Kompatibilität; es entsteht keine zusätzliche Runtime-Abhängigkeit.

Die Checkpoint-Instruktion wird nur in installierte OpenCode-Personas eingefügt, einschließlich generierter Delegate-/Implementer-Varianten. Kanonische, auch für andere Harnesses verwendete `agents/*.md` bleiben unverändert (`install.sh:945-968`). Symlink-Ziele werden nicht überschrieben.

## OpenCode Pilot Evaluation

**Stand:** 2026-07-26, Phasen 1–3 plus Metadaten-/Zähler-/Breitenverfeinerung implementiert und mit `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs` verifiziert: 29/29 Tests bestanden; zusätzlich bestand `bash -n install.sh`.

| Szenario | Beobachtetes Ergebnis |
|---|---|
| Erfolgreiche Kette | `COMPLETED`, Chain 100 %, Drei-Worte-Regel 100 % |
| Fehlgeschlagen und korrigierend | `FAILED`, Chain 100 %, Drei-Worte-Regel 100 %; `step_failed` beeinflusst Canary-Metriken nicht |
| Absichtlich gebrochene Kette | Chain 50 %, Drei-Worte-Regel 100 % |
| Wortzahl-Drift | Chain 100 %, Drei-Worte-Regel 83,33 % |
| Kontrollierter Handoff-Fixture | 92 % Context und `Prepare compact handoff` werden korrekt angezeigt |

Der Handoff-Wert von 92 % ist ein **synthetischer Contract-Fixture**, keine gemessene OpenCode-Auslastung. Automatisierte Adaptertests bestätigen getrennte Parent-/Subagent-Dateien, den kodierten Rückgabepfad, append-only Korrekturketten und read-only Inspection (`opencode/test/checkpoint-plugin.test.mjs:226-322`). Sie prüfen außerdem die Auswahl des letzten positiven-Output-Assistant-Schritts vor einem aktiven Output-null-Schritt, alle fünf TUI-Tokenfelder, Provider-/Modellgrenze, Clamping sowie Null-Fallback bei ungültigen Daten und SDK-Fehlern (`opencode/test/checkpoint-plugin.test.mjs:324-346`, `opencode/test/checkpoint-plugin.test.mjs:456-512`). Agent-/Titel-Momentaufnahmen, umbenannte Sessions und nicht blockierende `session.get`-Fehler sind separat abgedeckt (`opencode/test/checkpoint-plugin.test.mjs:348-454`). Globale und projektlokale Installer-Szenarien einschließlich Client-Verdrahtung, Instruktionsinjektion und Symlink-Schutz sind ebenfalls getestet (`opencode/test/checkpoint-plugin.test.mjs:514-579`). Der frühere Lauf mit einem isolierten lokalen OpenCode-Build schrieb einen heute als Legacy-Schema lesbaren sechs-feldrigen Datensatz mit `context_used: null`; diese Beobachtung belegt den Fallback, nicht eine allgemeine Always-null-Eigenschaft.

**Pilot-Gate: GO für spätere Adapter.** Tool-Verfügbarkeit, ausgewählte Pfad-Inspection, Append-Integrität, Signaltrennung, deterministische Schätzwerte und der ehrliche Null-Fallback entsprechen dem gemeinsamen Vertrag. Nicht belegt sind Live-Belegung des aktiven Tool-Schritts, aktive oder Compaction-Headroom und ein real beobachteter telemetriebasierter Handoff.
