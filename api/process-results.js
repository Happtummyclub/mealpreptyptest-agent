export const config = {
  api: {
    bodyParser: true,
  },
};

async function sendBrevoEmail({ toEmail, toName, subject, htmlContent }) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: "Happy Tummy Club",
        email: "mail@happytummyclub.de",
      },
      to: [
        {
          email: toEmail,
          name: toName,
        },
      ],
      subject,
      htmlContent,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Brevo error ${response.status}: ${JSON.stringify(result)}`);
  }

  return result;
}

function scoreAlltagsdynamik(value) {
  if (value === "Meine Wochen sind meist ähnlich und gut planbar") return 1;
  if (value === "Es gibt Struktur aber auch immer wieder Planänderungen") return 3;
  if (value === "Mein Alltag ist eher unvorhersehbar") return 5;
  return 3;
}

function scoreMentalLoad(value) {
  if (value === "Kaum - ich entscheide das eher spontan") return 1;
  if (value === "Ein bisschen - etwas Vorbereitung muss sein") return 3;
  if (value === "Sehr viel - ich muss ständig planen oder für andere mitdenken") return 5;
  return 3;
}

function scoreMotivation(value) {
  if (value === "Meist genug Motivation um etwas zu kochen") return 1;
  if (value === "Das ist unterschiedlich") return 3;
  if (value === "Meist wenig Motivation – ich brauche schnelle Lösungen") return 5;
  return 3;
}

function scoreZeit(value) {
  if (value === "Ich habe meistens ausreichend Zeit") return 1;
  if (value === "Es ist unterschiedlich") return 3;
  if (value === "Ich habe kaum Zeit dafür") return 5;
  return 3;
}

function scoreErnaehrungsorientierung(value) {
  if (value === "Eher weniger wichtig - Hauptsache ich werde satt") return 1;
  if (value === "Es ist mir wichtig aber nicht mein Hauptfokus") return 3;
  if (value === "Ernährung ist ein wichtiger Faktor für mein Wohlbefinden") return 5;
  return 3;
}

function scoreKochverhalten(value) {
  if (value === "Ich koche selten bis gar nicht") return 1;
  if (value === "Ich koche eher selten dafür größere Mengen für mehrere Tage") return 3;
  if (value === "Ich koche häufiger frisch") return 5;
  return 3;
}

function scoreAbwechslungsbedarf(value) {
  if (value === "Wiederholungen sind für mich völlig in Ordnung") return 1;
  if (value === "Ein bisschen Abwechslung ist mir wichtig") return 3;
  if (value === "Ich möchte möglichst keine Wiederholungen") return 5;
  return 3;
}

function scoreEinkauf(value) {
  if (value === "Meist nur einmal pro Woche") return 1;
  if (value === "Zwei- bis dreimal pro Woche ist realistisch") return 3;
  if (value === "Ich kann relativ flexibel nach Bedarf einkaufen") return 5;
  return 3;
}

function scorePlanaenderungen(value) {
  if (value === "Das passiert selten") return 1;
  if (value === "Ich passe mich an und verschiebe Mahlzeiten") return 3;
  if (value === "Ich greife dann eher zu einer schnell verfügbaren Lösung") return 5;
  return 3;
}

function buildChartValues(parsed) {
  return [
    scoreAlltagsdynamik(parsed.alltagsdynamik),
    scoreMentalLoad(parsed.mental_load),
    scoreMotivation(parsed.motivation),
    scoreZeit(parsed.zeit),
    scoreErnaehrungsorientierung(parsed.ernaehrungsorientierung),
    scoreKochverhalten(parsed.kochverhalten),
    scoreAbwechslungsbedarf(parsed.abwechslungsbedarf),
    scoreEinkauf(parsed.einkauf),
    scorePlanaenderungen(parsed.planaenderungen),
  ].join(",");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({
      success: false,
      error: "Bitte sende die Daten per POST.",
    });
  }

  const secret = req.headers["x-internal-secret"];

  if (secret !== process.env.INTERNAL_API_SECRET) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
  }

  try {
    const parsed = req.body?.parsed;

    if (!parsed?.email) {
      return res.status(400).json({
        success: false,
        error: "Keine gültigen Daten erhalten.",
      });
    }

    const chartValues = buildChartValues(parsed);

    const resultPageUrl =
      `${process.env.APP_BASE_URL}/api/result-page` +
      `?name=${encodeURIComponent(parsed.vorname || "du")}` +
      `&values=${encodeURIComponent(chartValues)}` +
      `&calendly=${encodeURIComponent("https://calendly.com/DEIN-LINK")}`;

    const resultHtml = `
      <div style="background-color:#f9f6f8;padding:40px 20px;font-family:'Montserrat',Arial,Helvetica,sans-serif;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
          Mehr Struktur und Entlastung für deinen Alltag.
        </div>

        <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color:#d7afc7;color:#333333;text-align:center;padding:28px 24px;font-family:'Montserrat',Arial,Helvetica,sans-serif;">
              <h1 style="margin:0;font-size:26px;font-weight:700;color:#333333;">Happy Tummy Club</h1>
              <p style="margin:8px 0 0;font-size:14px;font-weight:500;color:#333333;">Dein persönliches Meal Prep Profil</p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 30px;color:#333333;line-height:1.7;font-size:16px;font-family:'Montserrat',Arial,Helvetica,sans-serif;">
              <p style="margin-top:0;">Hi ${parsed.vorname || "du"},</p>

              <p>
                schön, dass du dir die Zeit für den Test genommen hast. Das ist dein erster Schritt zu mehr Selbstfürsorge.
              </p>

              <p>
                Möchtest du tiefer in deine Ergebnisse eintauchen? Gerne! Buche dir ein kostenloses Orientierungsgespräch und lass uns gemeinsam auf deine aktuelle Situation und deine Wünsche schauen. Wir besprechen, wie du Meal Prep alltagstauglich und nachhaltig in dein Leben integrieren kannst und auf welchem Weg du deine Ziele erreichst – strukturiert und in deinem eigenen Tempo.
              </p>

              <p>
                <strong>Kostenloses Startgespräch buchen</strong><br>
                <a href="https://calendly.com/DEIN-LINK" target="_blank" style="color:#f05808;font-weight:700;text-decoration:underline;">
                  https://calendly.com/DEIN-LINK
                </a>
              </p>

              <p>
                <a href="${resultPageUrl}" target="_blank" style="color:#f05808;font-weight:700;text-decoration:underline;">
                  Dein persönliches Meal Prep Profil ansehen
                </a>
              </p>

              <p>
                Sollte einer der Links nicht funktionieren, kannst du dein Ergebnis auch direkt hier aufrufen:<br>
                <a href="${resultPageUrl}" target="_blank" style="color:#f05808;font-weight:700;text-decoration:underline;">
                  Dein persönliches Profil
                </a>
              </p>

              <p>Ich wünsche dir viel Spaß beim Entdecken deiner Auswertung.</p>

              <p style="margin-top:24px;margin-bottom:0;">
                Liebe Grüße<br>
                Samia Tömen<br>
                Happy Tummy Club
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f4f4f4;text-align:center;padding:16px;font-size:12px;color:#777777;font-family:'Montserrat',Arial,Helvetica,sans-serif;">
              © ${new Date().getFullYear()} Happy Tummy Club
            </td>
          </tr>
        </table>
      </div>
    `;

    await sendBrevoEmail({
      toEmail: parsed.email,
      toName: `${parsed.vorname} ${parsed.nachname}`.trim(),
      subject: "Dein persönliches Meal Prep Profil",
      htmlContent: resultHtml,
    });

    console.log("Ergebnis-Mail gesendet an:", parsed.email);

    return res.status(200).json({
      success: true,
      message: "Ergebnis verarbeitet und Mail gesendet.",
    });
  } catch (error) {
    console.error("Fehler in /api/process-result:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
