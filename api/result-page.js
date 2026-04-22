function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function fetchAnalysis(apiUrl) {
  try {
    const response = await fetch(apiUrl, { cache: "no-store" });
    const data = await response.json();
    return {
      essensalltag: data.essensalltag || "Deine Auswertung konnte leider nicht geladen werden.",
      funktioniert: data.funktioniert || "",
      fordert: data.fordert || "",
      requirements: Array.isArray(data.requirements) ? data.requirements : [],
      notFits: data.notFits || "",
    };
  } catch (error) {
    return {
      essensalltag: "Deine Auswertung konnte leider nicht geladen werden.",
      funktioniert: "",
      fordert: "",
      requirements: [],
      notFits: "",
    };
  }
}

export default async function handler(req, res) {
  try {
    const name = req.query.name ? String(req.query.name) : "du";
    const calendly = "https://calendly.com/happytummyclub/30min";

    const values = String(req.query.values || "3,3,3,3,3,3,3,3,3")
      .split(",")
      .map((v) => {
        const n = parseInt(v, 10);
        if (Number.isNaN(n)) return 3;
        return Math.min(Math.max(n, 1), 5);
      })
      .slice(0, 9);

    while (values.length < 9) values.push(3);

    const valuesString = values.join(",");

    const analysisApiUrl =
      `${process.env.APP_BASE_URL}/api/result-analysis` +
      `?name=${encodeURIComponent(name)}` +
      `&values=${encodeURIComponent(valuesString)}`;

    const analysis = await fetchAnalysis(analysisApiUrl);

    const requirementsHtml = analysis.requirements
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("");

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
    background: #f3f3e6;
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
    background: #2d5146;
    color: #ffffff;
    text-align: center;
    padding: 30px 20px;
  }

  .header h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
  }

  h2 {
    color: #f05808;
    margin-top: 40px;
    margin-bottom: 14px;
    font-size: 24px;
    font-weight: 700;
  }

  .content {
    padding: 35px;
    line-height: 1.75;
    font-size: 16px;
  }

  .accordion {
    margin-top: 8px;
  }

  .accordion-item {
    border-bottom: 1px solid #d9e0d2;
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
    background: #fafaf2;
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

  .cta-section {
    text-align: center;
    margin-top: 10px;
  }

  .cta-button {
    display: inline-block;
    background-color: #2d5146;
    color: #ffffff;
    padding: 14px 26px;
    border-radius: 10px;
    font-weight: 600;
    text-decoration: none;
    font-size: 16px;
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
        <h1>Hallo ${escapeHtml(name)}</h1>
      </div>

      <div class="content">
        <h2>Deine persönliche Auswertung</h2>

        <div class="accordion">
          <div class="accordion-item">
            <button class="accordion-button">So zeigt sich dein Essensalltag</button>
            <div class="accordion-content">
              <p>${escapeHtml(analysis.essensalltag)}</p>
            </div>
          </div>

          <div class="accordion-item">
            <button class="accordion-button">Was bereits gut funktioniert</button>
            <div class="accordion-content">
              <p>${escapeHtml(analysis.funktioniert)}</p>
            </div>
          </div>

          <div class="accordion-item">
            <button class="accordion-button">Was dich aktuell besonders fordert</button>
            <div class="accordion-content">
              <p>${escapeHtml(analysis.fordert)}</p>
            </div>
          </div>

          <div class="accordion-item">
            <button class="accordion-button">Was deine Meal Prep Routine leisten sollte</button>
            <div class="accordion-content">
              <p>
                Aus deiner Auswertung wird deutlich, dass eine passende Meal Prep Routine bestimmte Anforderungen erfüllen sollte, damit sie dich im Alltag wirklich unterstützt. Besonders wichtig ist dabei:
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
              <p>${escapeHtml(analysis.notFits)}</p>
            </div>
          </div>
        </div>

        <h2>Deine Meal Prep Routine</h2>

        <p>
          Du möchtest tiefer in deine Ergebnisse einsteigen und herausfinden, wie du deine ganz persönliche Meal Prep Routine entwickeln kannst? Gerne! Buche dir ein kostenloses Orientierungsgespräch und lass uns gemeinsam auf deine aktuelle Situation und deine Wünsche schauen.
        </p>

        <div class="cta-section">
          <a class="cta-button" href="${escapeHtml(calendly)}" target="_blank">
            Kostenloses Orientierungsgespräch buchen
          </a>
        </div>

        <p>Ich wünsche dir viel Spaß beim Entdecken deiner Auswertung.</p>

        <p>
          Viele Grüße,<br>
          Samia vom Happy Tummy Club
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
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(html);
  } catch (error) {
    console.error("Fehler in /api/result-page:", error);
    res.status(500).send("Fehler beim Laden der Ergebnis-Seite.");
  }
}
