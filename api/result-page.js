function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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

function paragraphsFromText(text = "") {
  return text
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

export default async function handler(req, res) {
  try {
    const name = req.query.name ? String(req.query.name) : "du";
    const calendly = req.query.calendly
      ? String(req.query.calendly)
      : "https://calendly.com/DEIN-LINK";

    const values = String(req.query.values || "3,3,3,3,3,3,3,3,3")
      .split(",")
      .map((v) => {
        const n = parseInt(v, 10);
        if (Number.isNaN(n)) return 3;
        return Math.min(Math.max(n, 1), 5);
      })
      .slice(0, 9);

    while (values.length < 9) values.push(3);

    const chartUrl =
      `${process.env.APP_BASE_URL}/api/generate-chart` +
      `?values=${encodeURIComponent(values.join(","))}` +
      `&v=${Date.now()}`;

    const prompt = `
Erstelle eine personalisierte Analyse des Essensalltags basierend auf den Ergebnissen eines Meal-Prep-Tests.

Schreibe ausschließlich in der Du-Form und verwende einen wertschätzenden, stärkenorientierten und motivierenden Ton. Die Sprache soll klar, nahbar, professionell und alltagstauglich sein. Vermeide Fachjargon, Floskeln, Emojis und übertriebene Werbesprache.

Ziel der Analyse ist es, der Person zu helfen, ihren Essensalltag besser zu verstehen und einzuordnen. Zeige auf, was bereits gut funktioniert, welche Herausforderungen bestehen und wo Potenziale für mehr Struktur, Entlastung und Wohlbefinden liegen.

Betone, dass Meal Prep keine „One-Size-Fits-All“-Lösung ist. Eine individuelle, flexible und nachhaltige Strategie ist entscheidend, um langfristig eine alltagstaugliche und umsetzbare Lösung zu entwickeln.

Die Analyse soll:
- die wichtigsten Erkenntnisse aus den Testergebnissen zusammenfassen,
- den persönlichen Alltag realistisch widerspiegeln,
- Stärken und Entwicklungspotenziale aufzeigen,
- Orientierung geben und Selbstwirksamkeit fördern,
- als Grundlage für eine passende Meal-Prep-Strategie dienen.

Strukturiere den Text in drei Absätze:
1. Einordnung des aktuellen Essensalltags,
2. zentrale Stärken und Herausforderungen,
3. Potenziale und Ausblick.

Verwende nach Möglichkeit Begriffe wie:
„flexibel“, „alltagstauglich“, „individuell“, „strukturiert“, „entlastend“, „nachhaltig“, „klar“, „umsetzbar“ und „selbstfürsorglich“.

Vermeide negativ konnotierte oder wertende Begriffe wie:
„fehlende Motivation“, „keine Lust“, „Widerstand“, „Defizit“, „Schwäche“, „Überforderung“, „Problem“, „Versagen“, „Disziplinmangel“, „unorganisiert“ oder „faul“.

Formuliere stattdessen neutral und unterstützend. Stelle Herausforderungen als Entwicklungsmöglichkeiten dar und vermittle Zuversicht, Klarheit und Selbstwirksamkeit.

Der Text soll zwischen 120 und 180 Wörtern umfassen.

Name: ${name}

Ergebnisse der neun Dimensionen:
${valuesToContext(values)}
`;

    let analysisHtml = "<p>Deine Auswertung konnte leider nicht erstellt werden.</p>";

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
      const analysisText = extractOpenAIText(openaiResult);

      if (openaiResponse.ok && analysisText) {
        analysisHtml = paragraphsFromText(analysisText);
      }
    } catch (error) {
      console.error("Fehler in result-page OpenAI:", error);
    }

    const meaningHtml = `
      <p>Deine Ergebnisse zeigen, welche Anforderungen eine passende Meal-Prep-Methode erfüllen sollte. Entscheidend ist ein Ansatz, der sich flexibel in deinen Alltag integrieren lässt und dich nachhaltig entlastet.</p>
      <p>Im nächsten Schritt schauen wir gemeinsam, wie du eine Struktur entwickeln kannst, die wirklich zu dir und deinen Bedürfnissen passt – alltagstauglich, individuell und langfristig umsetzbar.</p>
    `;

    const html = `
      <!DOCTYPE html>
      <html lang="de">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Dein persönliches Meal Prep Profil</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              background: #f4f7f6;
              font-family: Arial, Helvetica, sans-serif;
              color: #333333;
            }
            .wrapper {
              max-width: 760px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .card {
              background: #ffffff;
              border-radius: 18px;
              overflow: hidden;
              box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
            }
            .header {
              background: #6B8E23;
              color: white;
              text-align: center;
              padding: 30px 24px;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              line-height: 1.2;
            }
            .header p {
              margin: 8px 0 0 0;
              font-size: 14px;
              opacity: 0.95;
            }
            .content {
              padding: 34px 30px 38px 30px;
              line-height: 1.7;
            }
            h2 {
              color: #6B8E23;
              font-size: 22px;
              margin-top: 32px;
              margin-bottom: 16px;
            }
            .chart-box {
              background: #f8fbf9;
              border-radius: 14px;
              padding: 18px;
              margin-bottom: 28px;
              text-align: center;
            }
            .chart-box img {
              display: block;
              width: 100%;
              max-width: 620px;
              height: auto;
              margin: 0 auto;
              border-radius: 14px;
            }
            .text-box {
              background: #f8fbf9;
              border: 1px solid #e4eee7;
              border-radius: 12px;
              padding: 22px 20px;
              color: #2f3a30;
            }
            .cta {
              text-align: center;
              margin: 34px 0 10px 0;
            }
            .cta a {
              background: #6B8E23;
              color: #ffffff;
              text-decoration: none;
              padding: 14px 26px;
              border-radius: 8px;
              font-weight: bold;
              display: inline-block;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #777;
              padding: 18px;
              background: #f4f7f6;
            }
            p {
              margin-top: 0;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="card">
              <div class="header">
                <h1>Happy Tummy Club</h1>
                <p>Dein persönliches Meal Prep Profil</p>
              </div>

              <div class="content">
                <p>Hi ${escapeHtml(name)},</p>

                <p>
                  schön, dass du dir die Zeit für den Test genommen hast. Das ist dein erster Schritt zu mehr Selbstfürsorge.
                  Dein persönliches Ergebnis zeigt dir, wie dein Essensalltag aktuell aussieht – und welche Faktoren ihn besonders prägen.
                </p>

                <p>
                  Dabei werden neun Dimensionen betrachtet, die dir helfen zu erkennen, was für dich gut funktioniert und wo du dir mehr Struktur,
                  Entlastung und Klarheit wünschst.
                </p>

                <p>
                  Meal Prep ist kein „One-Size-Fits-All“-Thema. Ob Beruf, Familienkonstellation, Budget, zeitliche Ressourcen oder einfach der Platz
                  in der Küche – wir haben alle unterschiedliche Herausforderungen und vor allem: einen sehr individuellen Alltag. Meal-Prep-Pläne von
                  Social Media und Co. sind daher keine langfristige Lösung, da sie meist nicht oder nur eingeschränkt auf deine persönlichen Bedürfnisse
                  eingehen. Genau darauf kommt es jedoch an, wenn du dir Entlastung und eine geregelte Ernährung im Alltag wünschst.
                </p>

                <p>
                  Die folgende Auswertung hilft dir dabei, deine aktuellen Gewohnheiten und Herausforderungen besser zu verstehen und einzuordnen –
                  als Grundlage für nachhaltige Veränderungen und mehr Leichtigkeit im Alltag.
                </p>

                <p>
                  Möchtest du tiefer in deine Ergebnisse eintauchen? Gerne! Buche dir ein kostenloses Orientierungsgespräch und lass uns gemeinsam
                  auf deine aktuelle Situation und deine Wünsche schauen. Wir besprechen, wie du Meal Prep alltagstauglich und nachhaltig in dein Leben
                  integrieren kannst und auf welchem Weg du deine Ziele erreichst – strukturiert und in deinem eigenen Tempo.
                </p>

                <div class="cta">
                  <a href="${escapeHtml(calendly)}" target="_blank">Kostenloses Startgespräch buchen</a>
                </div>

                <h2>Dein Profil auf einen Blick</h2>

                <p>
                  Die folgende Grafik zeigt dein persönliches Meal Prep Profil auf einen Blick. Sie veranschaulicht, welche Faktoren deinen Essensalltag
                  prägen und wo Potenziale für mehr Struktur, Entlastung und Wohlbefinden liegen.
                </p>

                <div class="chart-box">
                  <img src="${escapeHtml(chartUrl)}" alt="Dein persönliches Meal Prep Profil" />
                </div>

                <h2>Analyse deines Essensalltags</h2>

                <div class="text-box">
                  ${analysisHtml}
                </div>

                <h2>Was bedeutet das für dich?</h2>

                <div class="text-box">
                  ${meaningHtml}
                </div>

                <h2>Dein nächster Schritt</h2>

                <p>
                  Wenn du herausfinden möchtest, wie du daraus eine Meal-Prep-Methode entwickeln kannst, die wirklich zu deinem Alltag passt,
                  dann ist das der nächste sinnvolle Schritt.
                </p>

                <div class="cta">
                  <a href="${escapeHtml(calendly)}" target="_blank">Kostenloses Startgespräch buchen</a>
                </div>

                <p style="margin-top: 28px; margin-bottom: 0;">
                  Liebe Grüße<br />
                  Samia Tömen<br />
                  Happy Tummy Club
                </p>
              </div>

              <div class="footer">
                © ${new Date().getFullYear()} Happy Tummy Club
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (error) {
    console.error("Fehler in /api/result-page:", error);
    res.status(500).send("Fehler beim Laden der Ergebnis-Seite.");
  }
}
