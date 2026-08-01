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
Session state: OPEN
Latest event timestamp: 2026-07-26T14:31:00.000Z
Latest status timestamp: 2026-07-26T14:31:00.000Z
Latest raw status: open
Agent: implementer
Name/title: Checkpoint TUI refinement
Latest checkpoint timestamp: 2026-07-26T14:30:00.000Z
Last attempted: Logging Schema bauen
Next announced: Lesezugriff gezielt ergänzen
Work status: COMPLETED
Context used: unknown
Chain: 2/2 (100%)
Work: 2/3 (66.67%)
Three-word compliance: 6/6 (100%)
```

## JSONL-Format

Jeder `checkpoint`-Aufruf erzeugt weiterhin genau eine achtfeldrige Zeile:

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

Daneben kennt derselbe JSONL-Stream eine dritte, exakt vierfeldrige Variante:

```json
{"timestamp":"2026-07-26T14:31:00Z","session_id":"ses_123","event":"session_status","status":"open"}
```

Sie enthält ausschließlich `timestamp`, `session_id`, `event: "session_status"` und `status: "open" | "closed"`. Fehlende, zusätzliche oder nur teilweise vorhandene Felder, andere Event-Namen und abweichende Groß-/Kleinschreibung sind ungültig. `open` bedeutet konservativ, dass ein Start-/Öffnungsereignis beobachtet wurde und danach kein `closed`; es beweist keine laufende Session. `closed` bedeutet nur, dass ein Graceful-Close-Hook beobachtet wurde, nicht dass die Arbeit erfolgreich war. Crash, `SIGKILL`, Host-Ausfall oder ein Harness ohne Close-Hook können kein `closed` erzeugen.

Pro Session wird eine append-only Datei unter `.agent-checkpoints/<session_id>.jsonl` angelegt. Der Pfad ist relativ zum Workspace, damit Parent, Retriever und Nutzer ihn gezielt lesen und filtern können. Die Session-ID wird für den Dateinamen bereinigt. Das Verzeichnis soll nicht versioniert werden.

Ältere Logs mit ausschließlich den ursprünglichen sechs Feldern bleiben lesbar. Parser und Auswertung normalisieren dort fehlendes `agent` und `session_title` im Speicher zu `null`, ohne die append-only Quelldatei umzuschreiben. Ein Mischlog darf sechs- und achtfeldrige Checkpoints sowie vierfeldrige Statusereignisse enthalten; unvollständige Zwischenformen bleiben ungültig. `parseCheckpointLogJsonl` liefert alle Varianten in physischer Zeilenreihenfolge. Die kompatible API `parseCheckpointJsonl` filtert Statusereignisse heraus und liefert weiterhin nur normalisierte Checkpoints.

Lifecycle-Reduktion folgt ausschließlich der physischen JSONL-Reihenfolge, niemals der Zeitstempelsortierung: kein Statusereignis ergibt `UNKNOWN`, das letzte wirksame `open` ergibt `OPEN`, das letzte `closed` ergibt `CLOSED`; identische Wiederholungen sind idempotent und `closed` gefolgt von `open` öffnet die Session erneut. `ERROR` ist kein Lifecycle-Wert und wird nie persistiert oder vom Reducer geliefert. Statusereignisse zählen weder für Chain-Übergänge noch für Work- oder Drei-Worte-Metriken. Ein status-only Log ist gültig und zeigt für alle drei Checkpoint-Metriken `0/0 (n/a)` sowie neutrale Checkpoint-Detailfelder.

Der Reader-first-Rollout ist für alle vier Adapter aktiv: OpenCode schreibt `open` ausschließlich bei einem verifizierten `session.created`, Codex beim gepinnten `SessionStart`; beide schreiben mangels ehrlichem Close-Hook nie `closed`. Claude Code schreibt Parent-/Subagent-`open` bei `SessionStart`/`SubagentStart` und Parent-`closed` ausschließlich bei `SessionEnd`. Hermes schreibt nur beim beobachteten neuen Parent-`on_session_start` ein Parent-eigenes `open` und niemals `closed`. Kein Adapter leitet Status aus Checkpoints, Alter, Tool-Ende oder Prozessende ab.

`session_title` ist eine Momentaufnahme und kann sich durch Umbenennung zwischen zwei Checkpoints derselben Session ändern. Für Identität, Pfadwahl und Zusammenführung bleibt deshalb `session_id` maßgeblich; Titel und Agent dienen der Anzeige. Chain-/Work-/Drei-Worte-Prozent, Token-Restmenge und Dateiname gehören nicht in die JSONL-Einträge. Sie sind Laufzeitinformationen oder aus den Rohdaten ableitbare Werte und werden bei Bedarf extern berechnet. OpenCode schreibt bei gültigen SDK-Daten die geschätzte TUI-äquivalente Context-Auslastung des vorherigen abgeschlossenen Schritts in `context_used`; andernfalls bleibt das Feld `null`.

## Agenten-Instruktion

Die Agentendefinition erhält eine kurze Meta-Instruktion:

> Segmentiere deine Arbeit selbstständig in sinnvolle Subtasks. Rufe nach jedem abgeschlossenen Subtask `checkpoint` mit dem erledigten und dem nächsten Subtask auf. Formuliere beide Stichpunkte mit genau drei Wörtern. Verwende beim folgenden Aufruf den zuvor angekündigten `next`-Text unverändert als `done`. Wenn die zurückgemeldete Context-Auslastung zu hoch wird, setze einen letzten Checkpoint und gib dem Parent zurück, wie weit du gekommen bist und welcher Schritt als Nächstes übernommen werden soll.

> Wenn ein versuchter Subtask fehlschlägt, rufe `checkpoint` trotzdem auf. Verwende den angekündigten Subtask als `done`, setze `step_failed=true` und beschreibe in `next` den Korrekturschritt. Ein fachlicher Fehlschlag ist kein Canary-Fehler, solange der Checkpoint und die Verkettungsregel korrekt eingehalten werden.

Es gibt keinen festen globalen Grenzwert für den kontrollierten Abbruch. Der Agent entscheidet anhand der zurückgegebenen ungefähren Auslastung und der noch anstehenden Arbeit.

Diese Anweisung gilt auch für den Parent. Er protokolliert damit seine eigenen Schritte, beispielsweise das Erstellen eines Subagent-Auftrags, die Prüfung eines zurückgegebenen Ergebnisses und die Entscheidung über die Fortsetzung.

## Live-Terminal-Dashboard

`checkpoint-watch` liest dieselben Roh-Logs und zeigt den letzten Stand aller direkt auffindbaren Sessions. Vom Workspace-Root startet die Quellversion mit `node packages/checkpoint-core/bin/checkpoint-watch.js` im Live-Modus; `--once` erzeugt genau eine deterministische Ausgabe ohne ANSI-Steuerzeichen. Die installierte Version wird mit dem exakten `Launch command:` gestartet, den `./install.sh` beziehungsweise `./install.sh --project` ausgibt. Bei Upgrades gilt zwingend: laufendes Dashboard sowie alle Writer-fähigen OpenCode-, Checkpoint-Profil-Codex-, Claude-Code- und Hermes-Sessions vor der Installation stoppen; danach Reader und Writer installieren, das kompatible Dashboard mit diesem Befehl starten und erst anschließend die Harnesses neu starten. Der Installer druckt diese Reihenfolge, beendet Prozesse aber nicht automatisch. Details stehen in der [Installationsanleitung](installation.md#checkpoint-dashboard-quickstart).

Die Spalten sind `SESSION`, `AGENT`, `NAME/TITLE`, `AGE`, `STATE`, `CHAIN`, `WORK`, `3-WORD`, `CONTEXT`, `DONE` und `NEXT`. `STATE` ist ausschließlich die explizite Reduktion `OPEN`, `CLOSED` oder `UNKNOWN`; das Alter verändert diesen Wert nie. Ein alter Open-Event bleibt `OPEN`, ein frischer Close-Event bleibt `CLOSED`, und ein reines Checkpoint-Log bleibt unabhängig vom Alter `UNKNOWN`. Diese Werte beschreiben beobachtete Events und beweisen keine Prozess-Liveness. `CHAIN`, `WORK` und `3-WORD` erscheinen jeweils als `Erfolge/Anzahl (Prozent)`, beispielsweise `1/1 (100%)`, `2/3 (66.7%)` und `6/6 (100%)`; `WORK` zählt Checkpoints mit `step_failed=false` und ist kein Nachweis fachlicher Korrektheit.

Der Watcher hält Identitäts-, Alters-, Status- und Context-Spalten auf festen Breiten und dimensioniert die Metrikspalten anhand ihrer formatierten Zähler. Den verbleibenden Platz teilt er möglichst gleichmäßig auf `NAME/TITLE`, `DONE` und `NEXT` auf; Restspalten gehen deterministisch in genau dieser Reihenfolge an Titel, Done und Next. Zu lange Werte werden rechts mit `…` gekürzt (bei nur einem verfügbaren Zeichen hart abgeschnitten), anschließend wird auch jede Gesamtzeile auf die Terminalbreite begrenzt. Gleiche Daten und gleiche Breite erzeugen deshalb immer dieselbe Ausgabe (`packages/checkpoint-core/bin/checkpoint-watch.js:152-213`).

Live-Modus aktualisiert standardmäßig jede 1.000 ms. Der weiterhin akzeptierte Wert 120.000 ms für `--stale-ms` beziehungsweise `CHECKPOINT_WATCH_STALE_MS` ist nur ein kompatibler, informationaler Alters-Referenzwert und beeinflusst `STATE` nicht; `--refresh-ms`/`CHECKPOINT_WATCH_REFRESH_MS` steuern weiterhin die Aktualisierung. Änderungen im Checkpoint-Verzeichnis lösen ebenfalls eine Aktualisierung aus. Ctrl-C beziehungsweise SIGTERM schließt Watcher und Timer und stellt den Terminal-Cursor wieder her.

Der Scope ist absichtlich nur das direkte Verzeichnis `.agent-checkpoints/*.jsonl` des aktuellen Workspace: reguläre JSONL-Dateien werden gelesen, Unterverzeichnisse und andere Erweiterungen ignoriert. Eine fehlende Directory ergibt eine leere Anzeige. Eine malformed, unlesbare oder während des Lesens inkonsistente Datei erscheint ausschließlich im Watcher als kompakte `ERROR`-Zeile, ohne gültige Sessions zu blockieren. Der Inspector behält für solche Eingaben stattdessen leeres stdout, eine knappe `checkpoint-inspect:`-Meldung auf stderr und Exit-Status 1; er stellt niemals einen Lifecycle-Zustand `ERROR` dar. Die Logs werden nicht verändert.

Das Dashboard und der Inspector haben verschiedene Aufgaben: `checkpoint-watch` entdeckt mehrere direkte Session-Logs und verdichtet jede auf eine Zeile; `checkpoint-inspect` erhält genau einen bewusst ausgewählten Pfad, scannt keine Sessions und zeigt die detaillierte Zusammenfassung dieses Logs.

## Harness-Unterstützung

Der aufrufbare Tool-Vertrag bleibt harnessübergreifend gleich. Adapter unterscheiden sich bei Session-ID, Context-Telemetrie und optionalen Metadaten; der aktuelle gemeinsame Datensatz reserviert dafür die nullable Felder `agent` und `session_title`.

| Harness | Tool-Anbindung | Session-ID | Context-Rückmeldung |
|---------|----------------|------------|---------------------|
| OpenCode | Native Custom Tools `checkpoint` und `checkpoint_path`; `session.created` schreibt einmal `open`, ohne Resume- oder Close-Heuristik; `agent` aus `ToolContext.agent`, Titel und Telemetrie über `PluginInput.client` | `ToolContext.sessionID` für Checkpoints, native `event.properties.info.id` für Creation-Status | Geschätzter Context-Anteil des vorherigen abgeschlossenen Assistant-Schritts und verbleibende Context-Window-K-Tokens; bei fehlenden/ungültigen Daten oder SDK-Fehlern `null`/`unknown` |
| Codex | Implementiert: Stdio-MCP-Server `checkpoint`/`checkpoint_path` plus `SessionStart`-/`PreToolUse`-Hook-Bridge (`codex/`, Aktivierung über `codex --profile-v2 agent-checkpoint`); jeder gepinnte `SessionStart` schreibt `open`, `Stop` bleibt turn-scoped und write-free; `agent`/`session_title` immer `null` | Native Hook-`session_id` auf Session-Ebene | Immer `null`/`unknown` (kein dokumentierter Telemetrie-Kanal auf dem CLI/MCP-Pfad des gepinnten Builds) |
| PydanticAI | Native Python Function Tool | `run_id` beziehungsweise `conversation_id` | Aus verfügbarer Run Usage und Modellgrenze ableitbar, sonst `null` |
| Claude Code | Implementiert: Skills-Verzeichnis-Plugin `agent-checkpoint@skills-dir` mit gebündeltem Stdio-MCP-Server `checkpoint`/`checkpoint_path`; `SessionStart` und `SubagentStart` schreiben `open`, Parent-`SessionEnd` schreibt `closed`, `PreToolUse` injiziert Identität; kein verifizierter Child-Close (`claude/agent-checkpoint/`, Statusline-Aktivierung über opt-in `claude --settings <home>/agent-checkpoint.settings.json`); `agent` = Subagent-`agent_type` sonst `null`, `session_title` = Statusline-`session_name` sonst `null` | Parent: native Hook-`session_id`; Subagent: komposit `<session_id>--<agent_id>` | Statusline-Sidecar (`.agent-checkpoints/.runtime/claude/`): `used_percentage/100` der letzten Antwort (nur Input), `null` vor erster Antwort/nach Compaction; verbleibende K-Tokens approximativ aus Context-Window minus Input-Tokens; fehlende/ungültige Werte → `null`/`unknown` |
| Hermes | Implementiert: natives User-Plugin mit den Tools `checkpoint`/`checkpoint_path`, vollständiger Heartbeat-Instruktion über `pre_llm_call` und Parent-eigenem `open` ausschließlich bei neuem `on_session_start`; fortgesetzte Sessions und `subagent_start` schreiben keinen Status, kein verifizierter Main-Session-Close (`hermes/agent-checkpoint/`, installiert nach `~/.hermes/plugins/agent-checkpoint/`, opt-in über die dokumentierte Aktivierung `hermes plugins enable agent-checkpoint` als additivem `plugins.enabled`-Eintrag); `agent`/`session_title` immer `null` | Native Hook-`session_id`; `subagent_start` ordnet Child-IDs intern dem Parent-eigenen Log zu, ohne Child-Attribution zu persistieren | Pro nativer Session isolierter Schätzwert aus `pre_api_request`-`approx_input_tokens` geteilt durch bekannte Modell-Context-Grenze, sonst ehrlich `null`/`unknown`; verbleibender Headroom mindestens `0k` |

MCP kann den gemeinsamen Aufruf `checkpoint(done, next, step_failed)` transportieren. Harness-spezifische Adapter ergänzen Session-ID und Context-Werte, weil diese Informationen nicht Teil des allgemeinen MCP-Vertrags sind.

Der implementierte Codex-Adapter nutzt genau diese Trennung: Der `PreToolUse`-Hook injiziert `_workspace_root` (Hook-`cwd`) und `_checkpoint_session_id` (Hook-`session_id`) in den MCP-Tool-Aufruf. Der `SessionStart`-Hook schreibt zuerst über den gemeinsamen Core `open` und liefert danach unverändert die Instruktion. `startup`, `resume`, `clear` und `compact` sind beobachtete Open-/Fortsetzungsereignisse; identische Opens sind idempotent. Der gepinnte Build codex-cli 0.131.0 kennt weder `SessionEnd` noch einen `SubagentStart`-Hook oder eine `agent_id` auf Hook-Eingaben. `Stop` enthält eine `turn_id` und beendet nur einen Turn; es wird nie als Session-`closed` abgebildet. Graceful Exit und Crash bleiben deshalb ohne Close-Ereignis, und ein vorhandenes Open bleibt konservativ `OPEN`. Subagent-Checkpoints landen im selben Session-Log (dokumentiertes Build-Limit). Ein späterer Build mit dokumentierter Subagent-Identität oder `SessionEnd` erfordert eine neue gegatete Re-Pin-Phase.

Der implementierte Claude-Code-Adapter nutzt dieselbe Trennung mit dem reicheren Hook-Surface des exakt gepinnten Builds claude 2.1.170: `SessionStart` und `SubagentStart` schreiben vor ihrer unveränderten Instruktionsausgabe ein nativ beziehungsweise komposit `<session_id>--<agent_id>` attribuiertes `open`; `SessionEnd` schreibt nur für den nativen Parent `closed` und bereinigt dessen Telemetrie-Sidecar. Ohne verifizierten Subagent-End-Hook bleibt ein Child-Log `OPEN`. Der `PreToolUse`-Hook injiziert `_checkpoint_session_id`, `_telemetry_session_id` (immer die native Session) sowie bei Subagent-Aufrufen `_agent_type` als vollständigen `updatedInput`-Ersatz; vom Aufrufer mitgeschickte interne Felder werden dabei verworfen. Der Workspace-Root stammt aus `CLAUDE_PROJECT_DIR`, mit dem verifizierten Hook-`cwd` als begrenztem Lifecycle-Fallback. Die Statusline schreibt den letzten gültigen Snapshot atomar nach `.agent-checkpoints/.runtime/claude/`; der MCP-Server liest ihn nur bei übereinstimmender Session und Projekt und bildet `null`/Abwesenheit ehrlich als `unknown` ab. Der Sidecar ist ein flüchtiger Latest-Value-Cache und taucht weder in den Roh-Logs noch in der Inspection auf.

Der implementierte Hermes-Adapter ist ein natives Python-User-Plugin (Hermes-Plugins sind Python; keine Node-Abhängigkeit für Hermes-Nutzer) und spiegelt die Kontraktsemantik von `packages/checkpoint-core/src/index.js` (`hermes/agent-checkpoint/agent_checkpoint.py`): Checkpoints tragen alle acht Felder mit `agent`/`session_title` gleich `null`, Statusereignisse exakt die vier Lifecycle-Felder, legacy Sechs-Felder-Logs bleiben ohne Migration lesbar und keine abgeleiteten Werte gelangen in die JSONL. `on_session_start` erfasst die native Parent-Session und den Workspace und schreibt als einziger Hook ein Parent-eigenes `open`; `pre_tool_call` bindet fortgesetzte native Sessions ohne Lifecycle-Schreibzugriff. Der verifizierte `subagent_start`-Payload ordnet Child-IDs transitiv dem Parent-eigenen Log zu, schreibt aber weder Child-Status noch Parent-Reopen. Bindung und Telemetrie bleiben pro nativer Parent-/Child-Session getrennt, während alle Child-Checkpoints weiterhin die Root-Parent-ID tragen und keine Child-ID oder Beziehung persistiert wird. Der Pin v0.19.0 besitzt keinen übernommenen vertrauenswürdigen Main-Session-Close-Hook; Hermes schreibt daher niemals `closed`, und ein Checkpoint-only-Continue bleibt `UNKNOWN`. `pre_api_request` aktualisiert nur den adressierten Telemetrie-Slot; bei bekannter Modellgrenze wird ein Schätzwert mit nichtnegativem Headroom abgeleitet, sonst ehrlich `null`/`unknown`. `pre_llm_call` liefert Parent- und Child-Turns die vollständige Instruktion zu Kadenz, Drei-Wort-Verkettung, Fehlerkorrektur und Context-Druck. Die Aktivierung folgt dem dokumentierten Opt-in; exakte quotierte oder unquotierte Einträge unter `plugins.disabled` stoppen den Installer vor einer Konfigurationsänderung und verweisen auf `hermes plugins enable agent-checkpoint`. Hook-/Telemetriezustand ist prozesslokal; nur die expliziten JSONL-Records werden persistiert. `hermes checkpoints` ist Hermes' Shadow-Git-Rollback-Speicher und steht nie als Kontrakt-Ersatz.

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

OpenCode ist der erste implementierte Harness. Der Adapter verwendet `ToolContext.sessionID` als Checkpoint-Kennung, `ToolContext.worktree` als Workspace-Root und `ToolContext.agent` als nullable Persona-Momentaufnahme. Der generische Plugin-Event-Callback akzeptiert nur `session.created`, übernimmt dessen native `event.properties.info.id` und schreibt über den Plugin-Worktree `open`. Neu erzeugte Parent- und Subagent-Sessions erhalten dadurch getrennte Statuszeilen. Plugin-Laden, Nachrichten, Tool-Aufrufe, `session.updated`, Status/Idle, Löschen, Dispose und Fehler sind weder Resume noch Graceful Close und erzeugen kein Lifecycle-Event; eine wieder geöffnete ältere Checkpoint-only Session bleibt `UNKNOWN`. Über `PluginInput.client.session.get` liest der Adapter bei jedem Checkpoint den dann aktuellen Titel. Titel- und Telemetrieabfragen werden unabhängig abgewartet; Fehler von `session.get`, leere Titel oder fehlende Agentennamen ergeben `null` und verhindern den Schreibvorgang nicht. Die globale Installation legt zuerst kompatiblen Core/Watcher und danach Runtime/Plugin unter dem konfigurierten OpenCode-Home ab; `./install.sh --project` verwendet stattdessen `./.opencode/`. Ein Neustart nach dem Start des neuen Dashboards lädt Tools und Creation-Writer. Falls ein lokaler Development-Build keine gleich versionierte veröffentlichte `@opencode-ai/plugin`-Abhängigkeit auflösen kann, registriert der Shim dieselben Tool-Definitionen über OpenCodes eingebaute JSON-Schema-Kompatibilität; es entsteht keine zusätzliche Runtime-Abhängigkeit.

Die Checkpoint-Instruktion wird nur in installierte OpenCode-Personas eingefügt, einschließlich generierter Delegate-/Implementer-Varianten. Kanonische, auch für andere Harnesses verwendete `agents/*.md` bleiben unverändert (`install.sh:945-968`). Symlink-Ziele werden nicht überschrieben.

## OpenCode Pilot Evaluation

**Stand:** 2026-08-01. Die bestehende Pilotabdeckung bleibt erhalten und wurde um creation-only `open`, unsupported-resume `UNKNOWN`, no-close sowie Reader-Symlink-/Installationsreihenfolge erweitert. Die Phase-3-Gate umfasst Core-, OpenCode- und Codex-Tests plus `bash -n install.sh`.

| Szenario | Beobachtetes Ergebnis |
|---|---|
| Erfolgreiche Kette | `COMPLETED`, Chain 100 %, Drei-Worte-Regel 100 % |
| Fehlgeschlagen und korrigierend | `FAILED`, Chain 100 %, Drei-Worte-Regel 100 %; `step_failed` beeinflusst Canary-Metriken nicht |
| Absichtlich gebrochene Kette | Chain 50 %, Drei-Worte-Regel 100 % |
| Wortzahl-Drift | Chain 100 %, Drei-Worte-Regel 83,33 % |
| Kontrollierter Handoff-Fixture | 92 % Context und `Prepare compact handoff` werden korrekt angezeigt |

Der Handoff-Wert von 92 % ist ein **synthetischer Contract-Fixture**, keine gemessene OpenCode-Auslastung. Automatisierte Adaptertests bestätigen getrennte Parent-/Subagent-Dateien, den kodierten Rückgabepfad, append-only Korrekturketten und read-only Inspection (`opencode/test/checkpoint-plugin.test.mjs:226-322`). Sie prüfen außerdem die Auswahl des letzten positiven-Output-Assistant-Schritts vor einem aktiven Output-null-Schritt, alle fünf TUI-Tokenfelder, Provider-/Modellgrenze, Clamping sowie Null-Fallback bei ungültigen Daten und SDK-Fehlern (`opencode/test/checkpoint-plugin.test.mjs:324-346`, `opencode/test/checkpoint-plugin.test.mjs:456-512`). Agent-/Titel-Momentaufnahmen, umbenannte Sessions und nicht blockierende `session.get`-Fehler sind separat abgedeckt (`opencode/test/checkpoint-plugin.test.mjs:348-454`). Globale und projektlokale Installer-Szenarien einschließlich Client-Verdrahtung, Instruktionsinjektion und Symlink-Schutz sind ebenfalls getestet (`opencode/test/checkpoint-plugin.test.mjs:514-579`). Der frühere Lauf mit einem isolierten lokalen OpenCode-Build schrieb einen heute als Legacy-Schema lesbaren sechs-feldrigen Datensatz mit `context_used: null`; diese Beobachtung belegt den Fallback, nicht eine allgemeine Always-null-Eigenschaft.

**Pilot-Gate: GO für spätere Adapter.** Tool-Verfügbarkeit, ausgewählte Pfad-Inspection, Append-Integrität, Signaltrennung, deterministische Schätzwerte und der ehrliche Null-Fallback entsprechen dem gemeinsamen Vertrag. Nicht belegt sind Live-Belegung des aktiven Tool-Schritts, aktive oder Compaction-Headroom und ein real beobachteter telemetriebasierter Handoff.
