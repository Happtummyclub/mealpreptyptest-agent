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

  // Fallback: grob nach Sätzen in drei Teile teilen
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
      `${process.env.APP_BASE_URL}/api/generate-chart?values=${encodeURIComponent(
        values.join(",")
      )}&v=${Date.now()}`;

    const prompt = `
Erstelle eine personalisierte Analyse des Essensalltags basierend auf den Ergebnissen eines Meal-Prep-Tests.

Schreibe ausschließlich in der Du-Form und verwende einen wertschätzenden, stärkenorientierten und motivierenden Ton. Die Sprache soll klar, nahbar, professionell und alltagstauglich sein. Vermeide Fachjargon, Floskeln, Emojis und übertriebene Werbesprache.

Ziel der Analyse ist es, der Person zu helfen, ihren Essensalltag besser zu verstehen und einzuordnen. Zeige auf, was bereits gut funktioniert, welche Herausforderungen bestehen und wo Potenziale für mehr Struktur, Entlastung und Wohlbefinden liegen.

Betone, dass Meal Prep keine „One-Size-Fits-All“-Lösung ist. Eine individuelle, flexible und nachhaltige Strategie ist entscheidend.

Strukturiere den Text in genau drei Absätze:
1. Einordnung des aktuellen Essensalltags,
2. zentrale Stärken und Herausforderungen,
3. Potenziale und Ausblick.

Verwende nach Möglichkeit Begriffe wie:
„flexibel“, „alltagstauglich“, „individuell“, „strukturiert“, „entlastend“, „nachhaltig“, „klar“, „umsetzbar“ und „selbstfürsorglich“.

Vermeide negativ konnotierte oder wertende Begriffe wie:
„fehlende Motivation“, „keine Lust“, „Widerstand“, „Defizit“, „Schwäche“, „Überforderung“, „Problem“, „Versagen“, „Disziplinmangel“, „unorganisiert“ oder „faul“.

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
    color: #ffffff;
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

  .analysis-box {
    background: #faf7f9;
    border: 1px solid #eaddea;
    border-radius: 12px;
    padding: 22px 20px;
  }

  .analysis-subtitle {
    color: #f05808;
    font-weight: 700;
    font-size: 16px;
    margin: 0 0 8px 0;
  }

  .analysis-box p {
    margin-top: 0;
    margin-bottom: 18px;
  }

  .analysis-box p:last-child {
    margin-bottom: 0;
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

        <h2>Analyse deines Essensalltags</h2>

        <div class="analysis-box">
          <div class="analysis-subtitle">Einordnung deines aktuellen Essensalltags</div>
          <p>${escapeHtml(analysisParagraphs[0] || "")}</p>

          <div class="analysis-subtitle">Zentrale Stärken und Herausforderungen</div>
          <p>${escapeHtml(analysisParagraphs[1] || "")}</p>

          <div class="analysis-subtitle">Potenziale und Ausblick</div>
          <p>${escapeHtml(analysisParagraphs[2] || "")}</p>
        </div>

        <h2>Deine persönliche Auswertung</h2>

        <div class="accordion">
          <div class="accordion-item">
            <button class="accordion-button">Was deine Meal-Prep-Methode leisten sollte</button>
            <div class="accordion-content">
              <ul>
                <li>Flexibilität bei Planänderungen</li>
                <li>Zeitersparnis und Entlastung im Alltag</li>
                <li>Klare und verlässliche Strukturen</li>
                <li>Realistische Vorbereitung, Lagerung und Nutzung</li>
                <li>Eine Anpassung an deine persönlichen Bedürfnisse</li>
                <li>Eine langfristig umsetzbare und nachhaltige Lösung</li>
              </ul>
            </div>
          </div>

          <div class="accordion-item">
            <button class="accordion-button">Was eher nicht zu dir passt</button>
            <div class="accordion-content">
              <p>Starre Wochenpläne und standardisierte Meal-Prep-Konzepte aus Social Media berücksichtigen häufig nicht die individuellen Anforderungen deines Alltags. Damit Meal Prep dich wirklich entlastet, braucht es eine Lösung, die zu dir passt – nicht nur eine, die gut aussieht.</p>
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
            <a class="cta-link" href="${process.env.APP_BASE_URL}/api/result-page?name=${encodeURIComponent(
              name
            )}&values=${encodeURIComponent(values.join(","))}&calendly=${encodeURIComponent(
      calendly
    )}" target="_blank">Dein persönliches Profil</a>
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
