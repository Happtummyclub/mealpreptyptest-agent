import { waitUntil } from "@vercel/functions";

export const config = {
  api: {
    bodyParser: true,
  },
};

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

function truncate(str, max = 1200) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

async function sendBrevoEmail({ toEmail, toName, subject, htmlContent }) {
  const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
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

  const brevoResult = await brevoResponse.json().catch(() => ({}));

  if (!brevoResponse.ok) {
    throw new Error(
      `Brevo error ${brevoResponse.status}: ${JSON.stringify(brevoResult)}`
    );
  }

  return brevoResult;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({
      success: false,
      error: "Bitte sende die Daten per POST.",
    });
  }

  const secret = req.headers["x-internal-secret"];

  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
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

    console.log("process-result gestartet für:", parsed.email);

    waitUntil(
      (async () => {
        try {
          const prompt = `
Hier sind die Antworten aus dem Meal Prep Test:

Alltagsdynamik: ${parsed.alltagsdynamik}
Mental Load: ${parsed.mental_load}
Motivation: ${parsed.motivation}
Zeit: ${parsed.zeit}
Ernährungsorientierung: ${parsed.ernaehrungsorientierung}
Kochverhalten: ${parsed.kochverhalten}
Abwechslungsbedarf: ${parsed.abwechslungsbedarf}
Planänderungen: ${parsed.planaenderungen}
Einkauf: ${parsed.einkauf}
Kühlschrank: ${parsed.kuehlschrank}
Gefrierschrank: ${parsed.gefrierschrank}

Deine Aufgabe:
Analysiere den Essensalltag dieser Person und erstelle eine strukturierte Auswertung.

WICHTIG:
- Du lieferst KEINE Lösung und KEIN fertiges System.
- Du analysierst nur Alltag, Herausforderungen und Anforderungen.
- Fokus liegt auf Verständnis, nicht auf Umsetzung.

Struktur der Antwort:
1. Einordnung der Situation
2. Emotionaler Spiegel
3. Zentrale Herausforderungen
4. Anforderungen an ein funktionierendes System
5. Was eher nicht funktioniert
6. Überleitung
7. Call to Action

Ton:
- ruhig
- verständlich
- nicht verkäuferisch
- alltagsnah
- keine Fachbegriffe

Länge:
ca. 300–500 Wörter.
`;

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
          let auswertung = extractOpenAIText(openaiResult);

          if (!openaiResponse.ok || !auswertung) {
            const debugInfo = {
              http_status: openaiResponse.status,
              error: openaiResult?.error || null,
              raw_preview: truncate(JSON.stringify(openaiResult)),
            };

            auswertung =
              "Deine Auswertung konnte leider nicht erstellt werden.\n\n" +
              "Debug-Info:\n" +
              JSON.stringify(debugInfo, null, 2);
          }

          console.log("OpenAI-Auswertung erstellt für:", parsed.email);

          const resultHtml = `
            <div style="background-color:#f4f7f6;padding:40px 20px;font-family:Arial,Helvetica,sans-serif;">
              <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
                
                <tr>
                  <td style="background-color:#6B8E23;color:#ffffff;text-align:center;padding:24px;">
                    <h1 style="margin:0;font-size:24px;">Happy Tummy Club</h1>
                    <p style="margin:5px 0 0;font-size:14px;">Dein persönlicher Meal Prep Typ</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:30px;color:#333333;line-height:1.6;">
                    
                    <p>Hi ${parsed.vorname || "du"},</p>

                    <p>
                      Schön, dass du dir die Zeit für den Test genommen hast. Ein erster Schritt für mehr Selbstfürsorge im Alltag. Sehr gut!
                    </p>

                    <h2 style="color:#6B8E23;font-size:18px;margin-top:20px;">
                      Dein persönliches Ergebnis
                    </h2>

                    <div style="background:#f8fbf9;border-left:4px solid #6B8E23;padding:15px;border-radius:6px;white-space:pre-line;">
                      ${auswertung}
                    </div>

                    <h2 style="color:#6B8E23;font-size:18px;margin-top:25px;">
                      Dein nächster Schritt
                    </h2>

                    <p>
                      Finde heraus, wie du Meal Prep ganz unkompliziert und langfristig in deinen Alltag integrieren kannst.
                      Wir schauen uns gemeinsam deine individuellen Herausforderungen im Alltag an und erstellen eine Methode,
                      die wirklich zu dir und deinen Bedürfnissen passt.
                    </p>

                    <div style="text-align:center;margin:30px 0;">
                      <a href="https://calendly.com/DEIN-LINK"
                         target="_blank"
                         style="background-color:#6B8E23;color:#ffffff;text-decoration:none;
                                padding:14px 24px;border-radius:6px;font-weight:bold;
                                display:inline-block;">
                        Startgespräch buchen
                      </a>
                    </div>

                    <p>Ich freue mich auf Dich!</p>

                    <p style="margin-top:20px;">
                      Liebe Grüße,<br>
                      <strong>Samia vom Happy Tummy Club</strong>
                    </p>

                  </td>
                </tr>

                <tr>
                  <td style="background:#f4f7f6;text-align:center;padding:15px;font-size:12px;color:#777;">
                    © ${new Date().getFullYear()} Happy Tummy Club
                  </td>
                </tr>

              </table>
            </div>
          `;

          await sendBrevoEmail({
            toEmail: parsed.email,
            toName: `${parsed.vorname} ${parsed.nachname}`.trim(),
            subject: "Dein persönlicher Meal Prep Typ",
            htmlContent: resultHtml,
          });

          console.log("Ergebnis-Mail gesendet an:", parsed.email);
        } catch (error) {
          console.error("Fehler in /api/process-result:", error);
        }
      })()
    );

    return res.status(202).json({
      success: true,
      message: "Verarbeitung gestartet.",
    });
  } catch (error) {
    console.error("Fehler beim Start von /api/process-result:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
