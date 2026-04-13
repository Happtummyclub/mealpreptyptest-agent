export default function handler(req, res) {
  const {
    name = "du",
    chart = "",
    analysis = "",
    meaning = "",
    calendly = "https://calendly.com/DEIN-LINK"
  } = req.query;

  const safeName = decodeURIComponent(name);
  const safeChart = decodeURIComponent(chart);
  const safeAnalysis = decodeURIComponent(analysis);
  const safeMeaning = decodeURIComponent(meaning);
  const safeCalendly = decodeURIComponent(calendly);

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
              <p>Hi ${safeName},</p>

              <p>
                schön, dass du dir die Zeit für den Test genommen hast.
                Hier findest du dein persönliches Meal Prep Profil auf einen Blick.
              </p>

              <h2>Dein persönliches Meal Prep Profil</h2>

              <div class="chart-box">
                <img
                  src="${safeChart}"
                  alt="Dein persönliches Meal Prep Profil"
                />
              </div>

              <h2>Analyse deines Essensalltags</h2>

              <div class="text-box">
                ${safeAnalysis}
              </div>

              <h2>Was bedeutet das für dich?</h2>

              <div class="text-box">
                ${safeMeaning}
              </div>

              <h2>Dein nächster Schritt</h2>

              <p>
                Wenn du herausfinden möchtest, wie du daraus eine Meal-Prep-Methode
                entwickeln kannst, die wirklich zu deinem Alltag passt, dann ist
                das der nächste sinnvolle Schritt.
              </p>

              <div class="cta">
                <a href="${safeCalendly}" target="_blank">Startgespräch buchen</a>
              </div>

              <p style="margin-top: 28px; margin-bottom: 0;">
                Liebe Grüße<br />
                Samia vom Happy Tummy Club
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
}
