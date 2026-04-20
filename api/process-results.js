export const config = {
  api: {
    bodyParser: true,
  },
};

async function sendBrevoEmail({
  toEmail,
  toName,
  subject,
  htmlContent,
  textContent,
}) {
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

function buildChartValues(parsed) {
  return [
    3,3,3,3,3,3,3,3,3
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

  try {
    const parsed = req.body?.parsed;

    const chartValues = buildChartValues(parsed);

    const calendlyUrl = "https://calendly.com/DEIN-LINK";

    const resultPageUrl =
      `${process.env.APP_BASE_URL}/api/result-page` +
      `?name=${encodeURIComponent(parsed?.vorname || "du")}` +
      `&values=${encodeURIComponent(chartValues)}` +
      `&calendly=${encodeURIComponent(calendlyUrl)}`;

    const safeName = escapeHtml(parsed?.vorname || "du");
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
            <p style="margin:0;font-size:16px;color:#ffffff;">
              Dein persönliches Meal Prep Profil
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px 28px;font-size:16px;line-height:1.7;">
            <p>Hi ${safeName},</p>

            <p>
              schön, dass du dir die Zeit für den Test genommen hast. Das ist dein erster Schritt zu mehr Selbstfürsorge.
            </p>

            <p><strong>Schau direkt rein:</strong></p>

            <table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
              <tr>
                <td align="center" bgcolor="#2d5146" style="border-radius:10px;">
                  <a
                    href="${safeUrl}"
                    target="_blank"
                    style="display:inline-block;padding:14px 22px;font-size:16px;font-weight:600;color:#3dadff;text-decoration:none;"
                  >
                    Dein Meal Prep Profil
                  </a>
                </td>
              </tr>
            </table>

            <p>Ich wünsche dir viel Spaß beim Entdecken deiner Auswertung.</p>

            <p>
              Viele Grüße,<br>
              Samia vom Happy Tummy Club
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
    `;

    const textContent = `Hi ${safeName},

Dein Meal Prep Profil:
${resultPageUrl}`;

    await sendBrevoEmail({
      toEmail: parsed?.email,
      toName: safeName,
      subject,
      htmlContent,
      textContent,
    });

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
    });
  }
}
