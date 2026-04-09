import { waitUntil } from "@vercel/functions";

export const config = {
  api: {
    bodyParser: true,
  },
};

function extractOpenAIText(openaiResult) {
  if (openaiResult?.output_text) {
    return openaiResult.output_text;
  }

  if (Array.isArray(openaiResult?.output)) {
    return openaiResult.output
      .map((item) => {
        if (item.type === "message" && Array.isArray(item.content)) {
          return item.content
            .filter((c) => c.type === "output_text")
            .map((c) => c.text)
            .join("\n");
        }
        return "";
      })
      .join("\n")
      .trim();
  }

  return null;
}

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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo error: ${errorText}`);
  }
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

  const parsed = req.body.parsed;

  waitUntil(
    (async () => {
      try {
        console.log("Starte OpenAI-Auswertung für:", parsed.email);

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

Erstelle eine strukturierte Auswertung mit folgenden Abschnitten:
1. Einordnung der Situation
2. Emotionaler Spiegel
3. Zentrale Herausforderungen
4. Anforderungen an ein funktionierendes System
5. Was eher nicht funktioniert
6. Überleitung
7. Call to Action
`;

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
        const auswertung =
          extractOpenAIText(openaiResult) ||
          "Deine Auswertung konnte leider nicht erstellt werden.";

        const resultHtml = `
          <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6;">
            <p>Hi ${parsed.vorname || "du"},</p>

            <p>
              Schön, dass du dir die Zeit für den Test genommen hast. Ein erster Schritt für mehr Selbstfürsorge im Alltag. Sehr gut!
            </p>

            <p><strong>Hier ist dein persönliches Ergebnis:</strong></p>

            <div style="white-space: pre-line;">
              ${auswertung}
            </div>

            <p><strong>Dein nächster Schritt:</strong></p>

            <p>
              Finde heraus, wie du Meal Prep ganz unkompliziert und langfristig in deinen Alltag integrieren kannst.
              Wir schauen uns gemeinsam deine individuellen Herausforderungen im Alltag an und erstellen eine Methode,
              die wirklich zu dir und deinen Bedürfnissen passt.
            </p>

            <p>
              <a href="https://calendly.com/DEIN-LINK">
                Startgespräch buchen
              </a>
            </p>

            <p>
              Ich freue mich auf Dich!<br><br>
              Liebe Grüße<br>
              Samia vom Happy Tummy Club
            </p>
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
        console.error("Fehler in process-result:", error);
      }
    })()
  );

  return res.status(202).json({
    success: true,
    message: "Verarbeitung gestartet.",
  });
}
