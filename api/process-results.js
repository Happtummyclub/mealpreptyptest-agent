export const config = {
  api: {
    bodyParser: true,
  },
};

async function sendBrevoEmail({ toEmail, toName, subject, htmlContent, textContent }) {
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
      textContent,
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

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
    const calendlyUrl = "https://calendly.com/DEIN-LINK";

    const resultPageUrl =
      `${process.env.APP_BASE_URL}/api/result-page` +
      `?name=${encodeURIComponent(parsed.vorname || "du")}` +
      `&values=${encodeURIComponent(chartValues)}` +
      `&calendly=${encodeURIComponent(calendlyUrl)}`;

    const safeName = escapeHtml(parsed.vorname || "du");
    const safeUrl = escapeHtml(resultPageUrl);

    const subject = "Dein persönliches Meal Prep Profil";

    const htmlContent = `
<!DOCTYPE html>
<html lang="de">
<body style="margin:0;padding:0;background:#f3f3e6;font-family:Arial,Helvetica,sans-serif;color:#333333;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f3e6;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td align="center" style="background:#2d5146;padding:24px;">
            <h1 style="margin:0;font-size:24px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
              Happy Tummy Club
            </h1>
            <p style="margin:6px 0 0 0;font-size:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
              Dein persönliches Meal Prep Profil
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px 28px;font-size:16px;line-height:1.7;color:#333333;font-family:Arial,Helvetica,sans-serif;">
            <p style="margin:0 0 16px 0;">Hi ${safeName},</p>

            <p style="margin:0 0 16px 0;">
              schön, dass du dir die Zeit für den Test genommen hast. Das ist dein erster Schritt zu mehr Selbstfürsorge und einem entspannteren Essensalltag.
            </p>

            <p style="margin:0 0 16px 0;">
              Dein persönliches Meal Prep Profil hilft dir dabei, deine aktuellen Gewohnheiten besser zu verstehen und einzuordnen. Es zeigt dir, welche Faktoren deinen Alltag prägen und welche Anforderungen deine individuelle Meal Prep Routine erfüllen sollte.
            </p>

            <p style="margin:0 0 16px 0;">
              Mit diesen Erkenntnissen legst du die Grundlage für mehr Struktur, Entlastung und Klarheit im Alltag.
            </p>

            <p style="margin:0 0 16px 0;"><strong>Schau direkt rein:</strong></p>

            <table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 24px 0;">
              <tr>
                <td align="center" bgcolor="#2d5146" style="border-radius:10px;">
                  <a
                    href="${safeUrl}"
                    target="_blank"
                    style="display:inline-block;padding:14px 22px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;"
                  >
                    Dein Meal Prep Profil
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 16px 0;">
              Ich wünsche dir viel Spaß beim Entdecken deiner Auswertung.
            </p>

            <p style="margin:24px 0 0 0;">
              Viele Grüße,<br>
              Samia vom Happy Tummy Club
            </p>
          </td>
        </tr>

        <tr>
          <td align="center" style="background:#f4f4f4;padding:16px;font-size:12px;color:#777777;font-family:Arial,Helvetica,sans-serif;">
            © ${new Date().getFullYear()} Happy Tummy Club
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
    `;

    const textContent = `Hi ${parsed.vorname || "du"},

schön, dass du dir die Zeit für den Test genommen hast. Das ist dein erster Schritt zu mehr Selbstfürsorge und einem entspannteren Essensalltag.

Dein persönliches Meal Prep Profil hilft dir dabei, deine aktuellen Gewohnheiten besser zu verstehen und einzuordnen. Es zeigt dir, welche Faktoren deinen Alltag prägen und welche Anforderungen deine individuelle Meal Prep Routine erfüllen sollte.

Mit diesen Erkenntnissen legst du die Grundlage für mehr Struktur, Entlastung und Klarheit im Alltag.

Dein Meal Prep Profil:
${resultPageUrl}

Ich wünsche dir viel Spaß beim Entdecken deiner Auswertung.

Viele Grüße,
Samia vom Happy Tummy Club`;

    await sendBrevoEmail({
      toEmail: parsed.email,
      toName: `${parsed.vorname} ${parsed.nachname}`.trim(),
      subject,
      htmlContent,
      textContent,
    });

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
