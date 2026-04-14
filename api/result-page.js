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
      `${process.env.APP_BASE_URL}/api/generate-chart?values=${encodeURIComponent(
        values.join(",")
      )}&v=${Date.now()}`;

    const prompt = `
Erstelle eine personalisierte Analyse des Essensalltags basierend auf den Ergebnissen eines Meal-Prep-Tests.

Schreibe ausschließlich in der Du-Form und verwende einen wertschätzenden, stärkenorientierten und motivierenden Ton. Die Sprache soll klar, nahbar, professionell und alltagstauglich sein. Vermeide Fachjargon, Floskeln, Emojis und übertriebene Werbesprache.

Ziel der Analyse ist es, der Person zu helfen, ihren Essensalltag besser zu verstehen und einzuordnen. Zeige auf, was bereits gut funktioniert, welche Herausforderungen bestehen und wo Potenziale für mehr Struktur, Entlastung und Wohlbefinden liegen.

Betone, dass Meal Prep keine „One-Size-Fits-All“-Lösung ist. Eine individuelle, flexible und nachhaltige Strategie ist entscheidend.

Der Text soll zwischen 120 und 180 Wörtern umfassen.

Name: ${name}

Ergebnisse der neun Dimensionen:
${valuesToContext(values)}
`;

    let analysisHtml =
      "<p>Deine Auswertung konnte leider nicht erstellt werden.</p>";

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
        analysisHtml = paragraphsFromText(analysisText);
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

<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">

<style>
body {
  margin: 0;
  background: #f9f6f8;
  font-family: 'Montserrat', sans-serif;
  color: #333;
}

.wrapper {
  max-width: 900px;
  margin: auto;
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
  color: white;
  text-align: center;
  padding: 30px 20px;
}

.header h1 {
  margin: 0;
  font-size: 28px;
}

.header p {
  margin: 5px 0 0;
  font-size: 14px;
}

.content {
  padding: 35px;
  line-height: 1.7;
}

h2 {
  color: #f05808;
  margin-top: 40px;
}

.chart-box {
  text-align: center;
  margin: 30px 0;
}

.chart-box img {
  max-width: 100%;
  border-radius: 12px;
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
}

.accordion-button::after {
  content: "+";
  float: right;
  font-size: 20px;
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

.cta {
  text-align: center;
  margin: 30px 0;
}

.cta a {
  background: #d7afc7;
  color: white;
  padding: 14px 28px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: bold;
}

.footer {
  text-align: center;
  font-size: 12px;
  color: #777;
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
      <p>Hi ${escapeHtml(name)},</p>

      <p>
        schön, dass du dir die Zeit für den Test genommen hast. Das ist dein erster Schritt zu mehr Selbstfürsorge.
        Dein persönliches Ergebnis zeigt dir, wie dein Essensalltag aktuell aussieht und welche Faktoren ihn besonders prägen.
      </p>

      <div class="cta">
        <a href="${escapeHtml(calendly)}" target="_blank">
          Kostenloses Startgespräch buchen
        </a>
      </div>

      <h2>Dein Profil auf einen Blick</h2>
      <div class="chart-box">
        <img src="${chartUrl}" alt="Meal Prep Profil">
      </div>

      <h2>Analyse deines Essensalltags</h2>
      <div>${analysisHtml}</div>

      <h2>Deine persönliche Auswertung</h2>

      <div class="accordion">

        <div class="accordion-item">
          <button class="accordion-button">So zeigt sich dein Essensalltag</button>
          <div class="accordion-content">
            <p>Dein persönliches Ergebnis gibt dir einen ganzheitlichen Einblick in deinen aktuellen Essensalltag und zeigt, welche Faktoren dich prägen.</p>
          </div>
        </div>

        <div class="accordion-item">
          <button class="accordion-button">Was deine Meal-Prep-Methode leisten sollte</button>
          <div class="accordion-content">
            <ul>
              <li>Flexibilität bei Planänderungen</li>
              <li>Zeitersparnis und Entlastung</li>
              <li>Klare und verlässliche Strukturen</li>
              <li>Realistische Vorbereitung und Lagerung</li>
              <li>Individuelle Anpassung an deinen Alltag</li>
              <li>Nachhaltige und langfristige Umsetzbarkeit</li>
            </ul>
          </div>
        </div>

        <div class="accordion-item">
          <button class="accordion-button">Was eher nicht zu dir passt</button>
          <div class="accordion-content">
            <p>Starre Wochenpläne und standardisierte Social-Media-Konzepte berücksichtigen häufig nicht die individuellen Anforderungen deines Alltags.</p>
          </div>
        </div>

        <div class="accordion-item">
          <button class="accordion-button">Dein nächster Schritt</button>
          <div class="accordion-content">
            <p>In einem kostenlosen Orientierungsgespräch entwickeln wir gemeinsam eine Meal-Prep-Strategie, die optimal zu dir passt.</p>
            <div class="cta">
              <a href="${escapeHtml(calendly)}" target="_blank">
                Kostenloses Startgespräch buchen
              </a>
            </div>
          </div>
        </div>

      </div>

      <p>Liebe Grüße<br>Samia Tömen<br>Happy Tummy Club</p>
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
    content.style.maxHeight = content.style.maxHeight
      ? null
      : content.scrollHeight + "px";
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
