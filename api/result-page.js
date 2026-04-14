function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

    const valuesString = values.join(",");

    const chartUrl =
      `${process.env.APP_BASE_URL}/api/generate-chart?values=${encodeURIComponent(
        valuesString
      )}&v=${Date.now()}`;

    const analysisApiUrl =
      `${process.env.APP_BASE_URL}/api/result-analysis` +
      `?name=${encodeURIComponent(name)}` +
      `&values=${encodeURIComponent(valuesString)}`;

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

  .loading {
    color: #666666;
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
              <p id="section-essensalltag" class="loading">Deine Auswertung wird geladen ...</p>
            </div>
          </div>

          <div class="accordion-item">
            <button class="accordion-button">Was bereits gut funktioniert</button>
            <div class="accordion-content">
              <p id="section-funktioniert" class="loading">Deine Auswertung wird geladen ...</p>
            </div>
          </div>

          <div class="accordion-item">
            <button class="accordion-button">Was dich aktuell besonders fordert</button>
            <div class="accordion-content">
              <p id="section-fordert" class="loading">Deine Auswertung wird geladen ...</p>
            </div>
          </div>

          <div class="accordion-item">
            <button class="accordion-button">Was deine Meal-Prep-Methode leisten sollte</button>
            <div class="accordion-content">
              <p id="requirements-intro" class="loading">Deine Auswertung wird geladen ...</p>
              <ul id="requirements-list"></ul>
              <p id="requirements-outro"></p>
            </div>
          </div>

          <div class="accordion-item">
            <button class="accordion-button">Was eher nicht zu dir passt</button>
            <div class="accordion-content">
              <p id="section-notfits" class="loading">Deine Auswertung wird geladen ...</p>
            </div>
          </div>
        </div>

        <div class="cta-block">
          <p class="cta-text">
            Du möchtest tiefer in deine Ergebnisse einsteigen und herausfinden, wie du deine ganz persönliche Methode für dein Meal Prep findest? Gerne! Buche dir ein kostenloses Orientierungsgespräch und lass uns gemeinsam auf deine aktuelle Situation und deine Wünsche schauen. Wir besprechen, wie du Meal Prep alltagstauglich und nachhaltig in dein Leben integrieren kannst und auf welchem Weg du deine Ziele erreichst – strukturiert und in deinem eigenen Tempo.
          </p>

          <p>
            <strong>Kostenloses Startgespräch buchen</strong><br>
            <a class="cta-link" href="${escapeHtml(calendly)}" target="_blank">${escapeHtml(calendly)}</a>
          </p>
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

  function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value || "";
    el.classList.remove("loading");
  }

  async function loadAnalysis() {
    try {
      const response = await fetch(${JSON.stringify(analysisApiUrl)}, {
        cache: "no-store"
      });

      const data = await response.json();

      setText("section-essensalltag", data.essensalltag || "");
      setText("section-funktioniert", data.funktioniert || "");
      setText("section-fordert", data.fordert || "");
      setText("section-notfits", data.notFits || "");

      const intro = document.getElementById("requirements-intro");
      const list = document.getElementById("requirements-list");
      const outro = document.getElementById("requirements-outro");

      if (intro) {
        intro.textContent =
          "Aus deiner Auswertung wird deutlich, dass eine passende Meal-Prep-Methode bestimmte Anforderungen erfüllen sollte, damit sie dich im Alltag wirklich unterstützt. Besonders wichtig ist dabei:";
        intro.classList.remove("loading");
      }

      if (list) {
        list.innerHTML = "";
        (data.requirements || []).forEach((item) => {
          const li = document.createElement("li");
          li.textContent = item;
          list.appendChild(li);
        });
      }

      if (outro) {
        outro.textContent =
          "Genau daran zeigt sich, wie wichtig eine Herangehensweise ist, die wirklich zu deinen Rahmenbedingungen passt.";
      }
    } catch (error) {
      setText("section-essensalltag", "Deine Auswertung konnte leider nicht geladen werden.");
      setText("section-funktioniert", "");
      setText("section-fordert", "");
      setText("section-notfits", "");
      setText("requirements-intro", "Die Anforderungen konnten leider nicht geladen werden.");
    }
  }

  loadAnalysis();
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
