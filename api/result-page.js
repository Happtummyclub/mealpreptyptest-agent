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

function splitIntoThreeParagraphs(text = "") {
  const parts = text
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 3) {
    return parts.slice(0, 3);
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 3) {
    while (sentences.length < 3) sentences.push("");
    return sentences;
  }

  const chunkSize = Math.ceil(sentences.length / 3);
  return [
    sentences.slice(0, chunkSize).join(" "),
    sentences.slice(chunkSize, chunkSize * 2).join(" "),
    sentences.slice(chunkSize * 2).join(" "),
  ];
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

  if (alltagsdynamik >= 4) {
    requirements.push("eine Struktur, die sich flexibel an einen dynamischen Alltag anpassen lässt");
  } else if (alltagsdynamik === 3) {
    requirements.push("eine Struktur mit genug Spielraum für Veränderungen");
  } else {
    requirements.push("eine Struktur, die gut mit planbaren und festen Abläufen arbeiten kann");
  }

  if (mentalLoad >= 4) {
    requirements.push("eine klare und übersichtliche Organisation, die den täglichen Denk- und Entscheidungsaufwand reduziert");
  } else if (mentalLoad === 3) {
    requirements.push("eine alltagstaugliche Struktur, die Orientierung gibt, ohne zusätzlichen Aufwand zu erzeugen");
  }

  if (motivation >= 4) {
    requirements.push("eine Herangehensweise, die auch an Tagen mit wenig Energie verlässlich funktioniert");
  }

  if (zeit >= 4) {
    requirements.push("größere Abstände zwischen den Vorbereitungseinheiten, da häufiges Preppen im Alltag schwer umsetzbar ist");
    requirements.push("einen insgesamt geringen Zeitaufwand, der sich realistisch in deinen Alltag integrieren lässt");
  } else if (zeit === 3) {
    requirements.push("einen ausgewogenen und realistischen Prep-Rhythmus, der sich gut in deinen Alltag einfügt");
  } else {
    requirements.push("kürzere und regelmäßigere Prep-Intervalle, die mit deiner Zeit gut vereinbar sind");
  }

  if (ernaehrung >= 4) {
    requirements.push("eine Struktur, die eine verlässliche und ausgewogene Ernährung im Alltag unterstützt");
  }

  if (kochverhalten <= 2) {
    requirements.push("eine Herangehensweise, die ohne umfangreiche Kochroutinen auskommt");
  } else if (kochverhalten >= 4) {
    requirements.push("eine Struktur, die deine Bereitschaft zum frischen Kochen sinnvoll mit einbezieht");
  }

  if (abwechslungsbedarf >= 4) {
    requirements.push("genug Vielfalt, ohne dass dadurch zusätzlicher Planungsaufwand entsteht");
  } else if (abwechslungsbedarf <= 2) {
    requirements.push("eine verlässliche Struktur, die mit Wiederholung und klaren Routinen gut funktioniert");
  }

  if (einkauf <= 2) {
    requirements.push("eine Planung, die mit wenigen Einkaufsterminen zuverlässig funktioniert");
  } else if (einkauf >= 4) {
    requirements.push("eine Struktur, die deine flexible Einkaufssituation sinnvoll mit aufnimmt");
  }

  if (planaenderungen >= 4) {
    requirements.push("eine hohe Anpassungsfähigkeit an spontane Planänderungen");
  } else if (planaenderungen === 3) {
    requirements.push("eine Struktur, die Veränderungen auffangen kann, ohne unübersichtlich zu werden");
  }

  const uniqueRequirements = [...new Set(requirements)];
  return uniqueRequirements.slice(0, 5);
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

    const requirements = deriveRequirements(values);
    const requirementsHtml = requirements
      .map((req) => `<li>${escapeHtml(req)}</li>`)
      .join("");

    const chartUrl =
      `${process.env.APP_BASE_URL}/api/generate-chart?values=${encodeURIComponent(
        values.join(",")
      )}&v=${Date.now()}`;

    const prompt = `
Erstelle eine personalisierte Auswertung eines Meal-Prep-Tests.

Schreibe ausschließlich in der Du-Form und verwende einen lockeren, wertschätzenden und motivierenden Ton. Die Sprache soll natürlich, klar und nahbar sein. Vermeide Fachjargon, Floskeln, Emojis und übertriebene Werbesprache.

WICHTIG:
Die Auswertung soll aus genau drei klar getrennten Absätzen bestehen.

Absatz 1:
Beschreibe, wie sich der Essensalltag aktuell zeigt. Gib eine übergeordnete Einordnung des Alltags, der Gewohnheiten und der Rahmenbedingungen. Dieser Absatz gehört in die Kategorie „So zeigt sich dein Essensalltag“.

Absatz 2:
Beschreibe ausschließlich, was bereits gut funktioniert. Hebe vorhandene Stärken, hilfreiche Gewohnheiten, Ressourcen und förderliche Voraussetzungen hervor. Dieser Absatz gehört in die Kategorie „Was bereits gut funktioniert“.

Absatz 3:
Beschreibe ausschließlich, was den Alltag aktuell besonders fordert oder erschwert. Formuliere dabei wertschätzend und ohne negative oder abwertende Begriffe. Dieser Absatz gehört in die Kategorie „Was dich aktuell besonders fordert“.

WICHTIG:
Die Auswertung darf ausschließlich Herausforderungen, Bedürfnisse und Anforderungen beschreiben. Es dürfen keine konkreten Lösungen, Strategien, Rezepte oder Handlungsempfehlungen genannt werden.

Betone, dass Meal Prep keine „One-Size-Fits-All“-Lösung ist, sondern zu den persönlichen Bedürfnissen und zum Alltag passen muss.

Verwende nach Möglichkeit Begriffe wie:
„flexibel“, „alltagstauglich“, „individuell“, „strukturiert“, „entlastend“, „nachhaltig“, „klar“ und „umsetzbar“.

Vermeide negativ konnotierte oder wertende Begriffe wie:
„fehlende Motivation“, „keine Lust“, „Widerstand“, „Defizit“, „Schwäche“, „Überforderung“, „Problem“, „Versagen“, „Disziplinmangel“, „unorganisiert“ oder „faul“.

Formuliere stattdessen verständlich, empathisch und unterstützend.

Der Text soll zwischen 120 und 180 Wörtern umfassen.

Name: ${name}

Ergebnisse der neun Dimensionen:
${valuesToContext(values)}
`;

    let analysisParagraphs = [
      "Deine Auswertung konnte leider nicht erstellt werden.",
      "",
      "",
    ];

    try {
      const openaiResponse = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4.1",
            input: prompt,
          }),
        }
      );

      const openaiResult = await openaiResponse.json();
      const analysisText = extractOpenAIText(openaiResult);

      if (openaiResponse.ok && analysisText) {
        analysisParagraphs = splitIntoThreeParagraphs(analysisText);
      }
    } catch (error) {
      console.error("Fehler bei OpenAI:", error);
    }

    const selfUrl =
      `${process.env.APP_BASE_URL}/api/result-page` +
      `?name=${encodeURIComponent(name)}` +
      `&values=${encodeURIComponent(values.join(","))}` +
      `&calendly=${encodeURIComponent(calendly)}`;

    const html = `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dein persönliches Meal Prep Profil</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  body {
    margin: 0;
    background: #f9f6f8;
    font-family: 'Montserrat', Arial, Helvetica, sans-serif;
    color: #333333;
  }

  .wrapper {
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  .card {
    background: #ffffff;
    border-radius: 18px;
    box-shadow: 0 4px 18px rgba(0,0,0,0.05);
    overflow: hidden;
  }

  .header {
    background: #d7afc7;
    color: #333333;
    text-align: center;
    padding: 30px 20px;
  }

  .header h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
  }

  .header p {
    margin: 6px 0 0 0;
    font-size: 14px;
    font-weight: 500;
  }

  .content {
    padding: 35px;
    line-height: 1.75;
    font-size: 16px;
  }

  h2 {
    color: #f05808;
    margin-top: 40px;
    margin-bottom: 14px;
    font-size: 24px;
    font-weight: 700;
  }

  .chart-box {
    text-align: center;
    margin: 26px 0 30px 0;
  }

  .chart-box img {
    max-width: 100%;
    border-radius: 12px;
    display: block;
    margin: 0 auto;
  }

  .accordion {
    margin-top: 8px;
  }

  .accordion-item {
    border-bottom: 1px solid #eaddea;
  }

  .accordion-button {
    width: 100%;
    background: none;
    border: none;
    outline: none;
    text-align: left;
    font-size: 18px;
    font-weight: 600;
    color: #f05808;
    padding: 16px 0;
    cursor: pointer;
    font-family: 'Montserrat', Arial, Helvetica, sans-serif;
  }

  .accordion-button::after {
    content: "+";
    float: right;
    font-size: 20px;
    font-weight: 600;
  }

  .accordion-button.active::after {
    content: "–";
  }

  .accordion-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
    background: #faf7f9;
    border-radius: 10px;
    padding: 0 15px;
  }

  .accordion-content p,
  .accordion-content ul {
    margin: 15px 0;
  }

  .accordion-content ul {
    padding-left: 20px;
  }

  .cta-block {
    margin-top: 34px;
  }

  .cta-text {
    margin-bottom: 18px;
  }

  .cta-link {
    color: #333333;
    text-decoration: none;
    font-weight: 600;
  }

  .cta-link:hover {
    text-decoration: underline;
  }

  .fallback-link {
    margin-top: 18px;
  }

  .footer {
    text-align: center;
    font-size: 12px;
    color: #777777;
    padding: 20px;
    background: #f4f4f4;
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
        <h2>Dein Profil auf einen Blick</h2>

        <div class="chart-box">
          <img src="${chartUrl}" alt="Dein persönliches Meal Prep Profil">
        </div>

        <h2>Deine persönliche Auswertung</h2>

        <div class="accordion">
          <div class="accordion-item">
            <button class="accordion-button">So zeigt sich dein Essensalltag</button>
            <div class="accordion-content">
              <p>${escapeHtml(analysisParagraphs[0] || "")}</p>
            </div>
          </div>

          <div class="accordion-item">
            <button class="accordion-button">Was bereits gut funktioniert</button>
            <div class="accordion-content">
              <p>${escapeHtml(analysisParagraphs[1] || "")}</p>
            </div>
          </div>

          <div class="accordion-item">
            <button class="accordion-button">Was dich aktuell besonders fordert</button>
            <div class="accordion-content">
              <p>${escapeHtml(analysisParagraphs[2] || "")}</p>
            </div>
          </div>

          <div class="accordion-item">
            <button class="accordion-button">Was deine Meal-Prep-Methode leisten sollte</button>
            <div class="accordion-content">
              <p>
                Aus deiner Auswertung wird deutlich, dass eine passende Meal-Prep-Methode bestimmte Anforderungen erfüllen sollte, damit sie dich im Alltag wirklich unterstützt. Besonders wichtig ist dabei:
              </p>
              <ul>
                ${requirementsHtml}
              </ul>
              <p>
                Genau daran zeigt sich, wie wichtig eine Herangehensweise ist, die wirklich zu deinen Rahmenbedingungen passt.
              </p>
            </div>
          </div>

          <div class="accordion-item">
            <button class="accordion-button">Was eher nicht zu dir passt</button>
            <div class="accordion-content">
              <p>
                Standardisierte Meal-Prep-Pläne aus Social Media berücksichtigen häufig nicht die individuellen Anforderungen deines Alltags. Dein Ergebnis zeigt, dass pauschale Lösungen langfristig nicht die gewünschte Entlastung bringen. Stattdessen braucht es eine Herangehensweise, die zu deiner persönlichen Situation passt.
              </p>
            </div>
          </div>
        </div>

        <div class="cta-block">
          <p class="cta-text">
            Möchtest du tiefer in deine Ergebnisse eintauchen? Gerne! Buche dir ein kostenloses Orientierungsgespräch und lass uns gemeinsam auf deine aktuelle Situation und deine Wünsche schauen. Wir besprechen, wie du Meal Prep alltagstauglich und nachhaltig in dein Leben integrieren kannst und auf welchem Weg du deine Ziele erreichst – strukturiert und in deinem eigenen Tempo.
          </p>

          <p>
            <strong>Kostenloses Startgespräch buchen</strong><br>
            <a class="cta-link" href="${escapeHtml(calendly)}" target="_blank">${escapeHtml(calendly)}</a>
          </p>

          <p class="fallback-link">
            Sollte einer der Links nicht funktionieren, kannst du dein Ergebnis auch direkt hier aufrufen:<br>
            <strong>Dein persönliches Profil:</strong><br>
            <a class="cta-link" href="${selfUrl}" target="_blank">Dein persönliches Profil</a>
          </p>
        </div>

        <p>Ich wünsche dir viel Spaß beim Entdecken deiner Auswertung.</p>

        <p>
          Liebe Grüße<br>
          Samia Tömen<br>
          Happy Tummy Club
        </p>
      </div>

      <div class="footer">
        © ${new Date().getFullYear()} Happy Tummy Club
      </div>
    </div>
  </div>

<script>
  document.querySelectorAll(".accordion-button").forEach(button => {
    button.addEventListener("click", () => {
      button.classList.toggle("active");
      const content = button.nextElementSibling;
      content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px";
    });
  });
</script>
</body>
</html>
`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (error) {
    console.error("Fehler:", error);
    res.status(500).send("Fehler beim Laden der Ergebnis-Seite.");
  }
}
