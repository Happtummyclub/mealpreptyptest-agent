function levelFromScore(score) {
  if (score <= 2) return "niedrig";
  if (score === 3) return "mittel";
  return "hoch";
}

function valuesToContext(values) {
  const labels = [
    "Alltagsdynamik",
    "Mental Load",
    "Motivation",
    "Zeit",
    "Ernährungsorientierung",
    "Kochverhalten",
    "Abwechslungsbedarf",
    "Einkauf",
    "Umgang mit Planänderungen",
  ];

  return labels
    .map((label, i) => `- ${label}: ${values[i]} (${levelFromScore(values[i])})`)
    .join("\n");
}

function deriveRequirements(values) {
  const requirements = [];
  const [
    alltagsdynamik,
    mentalLoad,
    motivation,
    zeit,
    ernaehrung,
    kochverhalten,
    abwechslungsbedarf,
    einkauf,
    planaenderungen,
  ] = values;

  if (alltagsdynamik >= 4 || planaenderungen >= 4) {
    requirements.push("eine Struktur, die Planänderungen auffangen kann und nicht von starren Tageszuordnungen abhängt");
  }

  if (mentalLoad >= 4) {
    requirements.push("eine klare und übersichtliche Organisation, die den täglichen Denk- und Entscheidungsaufwand spürbar reduziert");
  }

  if (zeit >= 4) {
    requirements.push("größere Abstände zwischen den Vorbereitungseinheiten, weil häufiges Preppen im Alltag schwer unterzubringen ist");
  } else if (zeit === 3) {
    requirements.push("einen realistischen Prep-Rhythmus, der sich gut in deinen Alltag einfügt");
  } else {
    requirements.push("kürzere und regelmäßigere Prep-Abstände, die zu deiner verfügbaren Zeit passen");
  }

  if (motivation >= 4 || kochverhalten <= 2) {
    requirements.push("eine Herangehensweise, die nicht stark auf häufiges oder aufwendiges Kochen im Alltag angewiesen ist");
  }

  if (abwechslungsbedarf >= 4) {
    requirements.push("genug Abwechslung, ohne dass dadurch zusätzlicher Planungs- und Organisationsaufwand entsteht");
  }

  if (einkauf <= 2) {
    requirements.push("eine Struktur, die mit wenigen Einkaufsterminen zuverlässig funktionieren kann");
  } else if (einkauf >= 4) {
    requirements.push("eine Struktur, die deine flexible Einkaufssituation sinnvoll mit aufnehmen kann");
  }

  if (ernaehrung >= 4) {
    requirements.push("eine verlässliche Grundlage, die eine ausgewogene Ernährung im Alltag unterstützt");
  }

  return [...new Set(requirements)].slice(0, 5);
}

function deriveWhatNotFits(values) {
  const [
    alltagsdynamik,
    mentalLoad,
    motivation,
    zeit,
    _ernaehrung,
    kochverhalten,
    abwechslungsbedarf,
    einkauf,
    planaenderungen,
  ] = values;

  const fragments = [];

  if (alltagsdynamik >= 4 || planaenderungen >= 4) {
    fragments.push("starre Wochenpläne mit fester Tageszuordnung");
  }

  if (mentalLoad >= 4) {
    fragments.push("Ansätze, die viele tägliche Entscheidungen verlangen");
  }

  if (zeit >= 4) {
    fragments.push("Konzepte, die häufige oder zeitintensive Prep-Termine voraussetzen");
  }

  if (motivation >= 4 || kochverhalten <= 2) {
    fragments.push("Lösungen, die stark auf spontanes oder tägliches Kochen bauen");
  }

  if (abwechslungsbedarf >= 4) {
    fragments.push("sehr monotone Routinen mit immer denselben Mahlzeiten");
  }

  if (einkauf <= 2) {
    fragments.push("Ansätze, die spontane Nachkäufe oder sehr flexible Einkaufsmöglichkeiten voraussetzen");
  }

  if (fragments.length === 0) {
    return "Pauschale Meal-Prep-Konzepte aus Social Media sehen oft gut aus, greifen im Alltag aber zu kurz, wenn sie nicht zu deinen tatsächlichen Anforderungen passen.";
  }

  if (fragments.length === 1) {
    return `Weniger passend für dich ist vor allem ${fragments[0]}, weil das deine aktuellen Anforderungen im Alltag zu wenig berücksichtigt.`;
  }

  const last = fragments.pop();
  return `Weniger passend für dich sind vor allem ${fragments.join(", ")} und ${last}, weil solche Ansätze die Anforderungen deines Alltags oft nicht ausreichend mitdenken.`;
}

function extractOpenAIText(openaiResult) {
  if (typeof openaiResult?.output_text === "string" && openaiResult.output_text.trim()) {
    return openaiResult.output_text.trim();
  }

  if (Array.isArray(openaiResult?.output)) {
    const text = openaiResult.output
      .map((item) => {
        if (item.type === "message" && Array.isArray(item.content)) {
          return item.content
            .filter((contentItem) => contentItem.type === "output_text")
            .map((contentItem) => contentItem.text || "")
            .join("\n");
        }
        return "";
      })
      .join("\n")
      .trim();

    if (text) return text;
  }

  return null;
}

function parseJsonFromText(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export default async function handler(req, res) {
  try {
    const name = req.query.name ? String(req.query.name) : "du";

    const values = String(req.query.values || "3,3,3,3,3,3,3,3,3")
      .split(",")
      .map((v) => {
        const n = parseInt(v, 10);
        if (Number.isNaN(n)) return 3;
        return Math.min(Math.max(n, 1), 5);
      })
      .slice(0, 9);

    while (values.length < 9) values.push(3);

    const requirements = deriveRequirements(values);
    const notFits = deriveWhatNotFits(values);

    const prompt = `
Du erstellst eine persönliche Auswertung eines Meal-Prep-Tests.

Schreibe ausschließlich in der Du-Form und in einem lockeren, klaren, natürlichen und wertschätzenden Ton. Keine Emojis. Keine Floskeln. Keine Fachsprache. Keine Lösungen oder konkreten Methoden. Es geht nur um Deutung der Ergebnisse, Herausforderungen und Anforderungen.

WICHTIG:
Gib deine Antwort ausschließlich als gültiges JSON zurück.
Keine Einleitung. Keine Erklärung. Kein Markdown.

Verwende exakt dieses Format:
{
  "essensalltag": "Text",
  "funktioniert": "Text",
  "fordert": "Text"
}

Bedeutung der Felder:
- "essensalltag": beschreibt, wie sich der Essensalltag aktuell zeigt
- "funktioniert": beschreibt ausschließlich, was bereits gut funktioniert
- "fordert": beschreibt ausschließlich, was aktuell besonders fordert

Zusätzliche Vorgaben:
- Kein Feld darf einfach den Titel wiederholen.
- "funktioniert" darf keine Herausforderungen nennen.
- "fordert" darf keine Stärken nennen.
- Kein Feld darf mit dem Abschnittstitel beginnen.
- Keine Lösungen, keine Rezepte, keine konkreten Handlungsanweisungen.
- Meal Prep darf als individuelle Anforderung eingeordnet werden, aber nicht als fertige Lösung erklärt werden.
- 2 bis 4 Sätze pro Feld.

Name: ${name}

Ergebnisse der neun Dimensionen:
${valuesToContext(values)}

Besonders wichtige Anforderungen an eine passende Meal-Prep-Routine:
${requirements.map((r) => `- ${r}`).join("\n")}
`;

    let result = {
      essensalltag: "Deine Auswertung konnte leider nicht geladen werden.",
      funktioniert: "",
      fordert: "",
      requirements,
      notFits,
    };

    try {
      const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          input: prompt,
        }),
      });

      const openaiResult = await openaiResponse.json();
      const text = extractOpenAIText(openaiResult);
      const parsed = text ? parseJsonFromText(text) : null;

      if (
        openaiResponse.ok &&
        parsed &&
        typeof parsed.essensalltag === "string" &&
        typeof parsed.funktioniert === "string" &&
        typeof parsed.fordert === "string"
      ) {
        result = {
          essensalltag: parsed.essensalltag.trim(),
          funktioniert: parsed.funktioniert.trim(),
          fordert: parsed.fordert.trim(),
          requirements,
          notFits,
        };
      }
    } catch (error) {
      console.error("Fehler in /api/result-analysis OpenAI:", error);
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(result);
  } catch (error) {
    console.error("Fehler in /api/result-analysis:", error);
    res.status(500).json({
      essensalltag: "Deine Auswertung konnte leider nicht geladen werden.",
      funktioniert: "",
      fordert: "",
      requirements: [],
      notFits: "",
    });
  }
}
