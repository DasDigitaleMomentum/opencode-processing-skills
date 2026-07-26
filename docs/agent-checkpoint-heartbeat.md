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

Das Checkpoint-Tool erfasst zusätzlich die vom Harness verfügbare ungefähre Context-Auslastung. Sie wird in den Checkpoint geschrieben und dem Agenten zusammen mit den verbleibenden K-Tokens zurückgegeben.

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
2. ermittelt die aktuelle ungefähre Context-Auslastung,
3. protokolliert den gemeldeten Erfolg oder Fehlschlag des Schritts,
4. hängt einen JSONL-Eintrag an das Session-Log an,
5. gibt Context-Auslastung und verbleibende K-Tokens zurück.

Beispielantwort:

```text
Checkpoint gespeichert.
Context: ~72 %
Verbleibend: ~56k Tokens
```

Die Context-Werte dürfen Schätzwerte sein. Wenn ein Harness keinen brauchbaren Wert bereitstellt, werden sie als unbekannt zurückgegeben und nicht erfunden.

## Pfad- und Lesezugriff

### `checkpoint_path`

```text
checkpoint_path(session_id: string)
```

Die Funktion gibt den relativen Pfad zur JSONL-Datei einer Session zurück:

```text
.agent-checkpoints/ses_123.jsonl
```

Falls ein Harness keine geeignete Session-ID bereitstellt, verwendet der Adapter eine andere stabile, eindeutige ID und dokumentiert diese als Parameter von `checkpoint_path`.

Der Parent kann den Pfad selbst über Bash oder ein Python-Skript auswerten oder ihn an einen Retriever weiterreichen. Es ist keine zusätzliche Recovery- oder Lese-Datenstruktur vorgesehen.

Der Parent kann die Funktion selbst verwenden oder die Auswertung an einen Retriever delegieren, zum Beispiel:

> Lies `.agent-checkpoints/ses_123.jsonl`. Wie weit ist die Session gekommen, wie hoch sind Chain- und Drei-Worte-Übereinstimmung und welcher Schritt war als Nächstes vorgesehen?

Der Parent kombiniert die Antwort anschließend mit dem ihm bekannten Blueprint oder ursprünglichen Subagent-Prompt. Daraus kann er einen Folge-Subagenten ungefähr an der richtigen Stelle weiterarbeiten lassen.

Beispielausgabe:

```text
Session: ses_123
Datei: .agent-checkpoints/ses_123.jsonl
Letzter abgeschlossener Schritt: Logging Schema bauen
Nächster angekündigter Schritt: Lesezugriff gezielt ergänzen
Chain: 100 %
Drei-Worte-Regel: 100 %
Letzter Checkpoint: vor 3 Minuten
```

## JSONL-Format

Jeder Aufruf erzeugt genau eine Zeile:

```json
{"timestamp":"2026-07-26T14:30:00Z","session_id":"ses_123","done":"Tests gezielt ausführen","next":"Testfehler gezielt beheben","step_failed":true,"context_used":0.72}
```

Minimale Felder:

| Feld | Bedeutung |
|------|-----------|
| `timestamp` | Vom Tool gesetzter UTC-Zeitstempel |
| `session_id` | Session-Kennung des Harnesses |
| `done` | Gerade abgeschlossener oder versuchter Subtask |
| `next` | Als Nächstes angekündigter Subtask |
| `step_failed` | `true`, wenn der versuchte Schritt fehlgeschlagen ist und `next` seine Korrektur beschreibt; sonst `false` |
| `context_used` | Vom Harness gemeldete ungefähre Context-Auslastung von `0.0` bis `1.0` oder `null` |

Pro Session wird eine append-only Datei unter `.agent-checkpoints/<session_id>.jsonl` angelegt. Der Pfad ist relativ zum Workspace, damit Parent, Retriever und Nutzer ihn gezielt lesen und filtern können. Die Session-ID wird für den Dateinamen bereinigt. Das Verzeichnis soll nicht versioniert werden.

Chain-Prozent, Drei-Worte-Prozent, Token-Restmenge und Dateiname gehören nicht in die JSONL-Einträge. Sie sind Laufzeitinformationen oder aus den Rohdaten ableitbare Werte und werden bei Bedarf extern berechnet. Die vom Harness gemeldete Context-Auslastung wird dagegen als Messwert mitgeschrieben.

## Agenten-Instruktion

Die Agentendefinition erhält eine kurze Meta-Instruktion:

> Segmentiere deine Arbeit selbstständig in sinnvolle Subtasks. Rufe nach jedem abgeschlossenen Subtask `checkpoint` mit dem erledigten und dem nächsten Subtask auf. Formuliere beide Stichpunkte mit genau drei Wörtern. Verwende beim folgenden Aufruf den zuvor angekündigten `next`-Text unverändert als `done`. Wenn die zurückgemeldete Context-Auslastung zu hoch wird, setze einen letzten Checkpoint und gib dem Parent zurück, wie weit du gekommen bist und welcher Schritt als Nächstes übernommen werden soll.

> Wenn ein versuchter Subtask fehlschlägt, rufe `checkpoint` trotzdem auf. Verwende den angekündigten Subtask als `done`, setze `step_failed=true` und beschreibe in `next` den Korrekturschritt. Ein fachlicher Fehlschlag ist kein Canary-Fehler, solange der Checkpoint und die Verkettungsregel korrekt eingehalten werden.

Es gibt keinen festen globalen Grenzwert für den kontrollierten Abbruch. Der Agent entscheidet anhand der zurückgegebenen ungefähren Auslastung und der noch anstehenden Arbeit.

Diese Anweisung gilt auch für den Parent. Er protokolliert damit seine eigenen Schritte, beispielsweise das Erstellen eines Subagent-Auftrags, die Prüfung eines zurückgegebenen Ergebnisses und die Entscheidung über die Fortsetzung.

## Einfache Nutzeranzeige

Eine Anzeige liest dieselben Roh-Logs, berechnet die abgeleiteten Werte und zeigt den letzten Stand je Session:

```text
SESSION   AGE   CHAIN   3-WORT   STEP     DONE                    NEXT
ses_123   32s   100%    100%     FAILED   Tests gezielt ausführen  Testfehler gezielt beheben
```

Die Anzeige verändert die Logs nicht.

## Harness-Unterstützung

Der Tool-Vertrag und das JSONL-Format bleiben gleich. Nur die Anbindung an Session-ID und Context-Information unterscheidet sich.

| Harness | Tool-Anbindung | Session-ID | Context-Rückmeldung |
|---------|----------------|------------|---------------------|
| OpenCode | Natives Custom Tool in einem Plugin | Vom Tool-Kontext | Soweit über Plugin- oder Session-Daten verfügbar, sonst `null` |
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

## Noch zu entscheiden

- Mit welchem Harness die erste Implementierung beginnt.
- Wie die jeweilige Context-Schätzung technisch bezogen wird.
- Ob die Nutzeranzeige als CLI, Harness-UI oder beides umgesetzt wird.
