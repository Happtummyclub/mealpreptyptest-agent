export const config = {
  api: {
    bodyParser: true,
  },
};

function getSelectedOptionText(field) {
  if (!field || !Array.isArray(field.options)) {
    return field?.value ?? null;
  }

  if (Array.isArray(field.value) && field.value.length > 0) {
    const selectedId = field.value[0];
    const selected = field.options.find((opt) => opt.id === selectedId);
    return selected ? selected.text : null;
  }

  return null;
}

function findField(fields, label) {
  return fields.find((field) => field.label === label) || null;
}

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
  await fetch("https://api.brevo.com/v3/smtp/email", {
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
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({
      success: false,
      message: "Bitte sende die Daten per POST.",
    });
  }

  try {
    const payload = req.body;
    const fields = payload?.data?.fields || [];

    const parsed = {
      vorname: findField(fields, "Vorname")?.value || "",
      nachname: findField(fields, "Nachname")?.value || "",
      email: findField(fields, "E-Mail")?.value || "",

      alltagsdynamik: getSelectedOptionText(
        findField(fields, "Wie planbar ist deine typische Woche?")
      ),
      mental_load: getSelectedOptionText(
        findField(fields, "Wie viel musst du im Alltag rund ums Essen mitdenken und organisieren?")
      ),
      motivation: getSelectedOptionText(
        findField(fields, "Wenn du nach einem langen Tag hungrig wirst: Wie viel Motivation hast du noch zu kochen?")
      ),
      zeit: getSelectedOptionText(
        findField(fields, "Wie viel Zeit hast du im Alltag für die Zubereitung deiner Mahlzeiten?")
      ),
      ernaehrungsorientierung: getSelectedOptionText(
        findField(fields, "Welche Rolle spielt Ernährung für dein Wohlbefinden im Alltag?")
      ),
      kochverhalten: getSelectedOptionText(
        findField(fields, "Wie sieht Kochen in deinem Alltag aktuell am ehesten aus?")
      ),
      abwechslungsbedarf: getSelectedOptionText(
        findField(fields, "Wie wichtig ist dir Abwechslung bei deinen Mahlzeiten?")
      ),
      planaenderungen: getSelectedOptionText(
        findField(fields, "Wenn sich dein Tag spontan verändert: Wie organisierst du dich neu?")
      ),
      einkauf: getSelectedOptionText(
        findField(fields, "Wie flexibel kannst du im Alltag einkaufen?")
      ),
      kuehlschrank: getSelectedOptionText(
        findField(fields, "Wie viel Platz hast du im Kühlschrank für vorbereitete Mahlzeiten?")
      ),
      gefrierschrank: getSelectedOptionText(
        findField(fields, "Wie viel Platz hast du im Gefrierfach oder Tiefkühler?")
      ),
    };

    // ✅ Sofortige Antwort an Tally (verhindert Timeout)
    res.status(200).json({
      success: true,
      message: "Webhook erfolgreich empfangen.",
    });

    // 🔄 Hintergrundverarbeitung
    (async () => {
      try {
        // 📧 1. Bestätigungsmail senden
        const confirmationHtml = `
          <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
            <p>Hi ${parsed.vorname || "du"},</p>
            <p>
              vielen Dank für deine Teilnahme am Meal Prep Typ Test!
            </p>
            <p>
              Deine persönliche Auswertung wird gerade erstellt und
              erreicht dich in Kürze per E-Mail.
            </p>
            <p>
              Liebe Grüße<br>
              <strong>Samia vom Happy Tummy Club</strong>
            </p>
          </div>
        `;

        await sendBrevoEmail({
          toEmail: parsed.email,
          toName: `${parsed.vorname} ${parsed.nachname}`,
          subject: "Deine Auswertung ist unterwegs",
          htmlContent: confirmationHtml,
        });

        // 🤖 2. OpenAI-Auswertung erstellen
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

        // 📧 3. Ergebnis-Mail senden
        const resultHtml = `
          <div style="background-color:#f4f7f6;padding:40px 20px;font-family:Arial,Helvetica,sans-serif;">
            <table align="center" width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="background-color:#6B8E23;color:#ffffff;text-align:center;padding:24px;">
                  <h1>Happy Tummy Club</h1>
                  <p>Dein persönlicher Meal Prep Typ</p>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;color:#333;line-height:1.6;">
                  <p>Hi ${parsed.vorname || "du"},</p>
                  <p>
                    Schön, dass du dir die Zeit für den Test genommen hast.
                    Ein erster Schritt für mehr Selbstfürsorge im Alltag.
                  </p>

                  <h2 style="color:#6B8E23;">Dein persönliches Ergebnis</h2>
                  <div style="white-space:pre-line;border-left:4px solid #6B8E23;padding-left:15px;">
                    ${auswertung}
                  </div>

                  <h2 style="color:#6B8E23;">Dein nächster Schritt</h2>
                  <p>
                    Finde heraus, wie du Meal Prep ganz unkompliziert und langfristig
                    in deinen Alltag integrieren kannst.
                  </p>

                  <div style="text-align:center;margin:30px 0;">
                    <a href="https://calendly.com/DEIN-LINK"
                       style="background:#6B8E23;color:#fff;padding:14px 24px;
                       text-decoration:none;border-radius:6px;font-weight:bold;">
                      Startgespräch buchen
                    </a>
                  </div>

                  <p>Ich freue mich auf Dich!</p>

                  <p>
                    Liebe Grüße,<br>
                    <strong>Samia vom Happy Tummy Club</strong>
                  </p>
                </td>
              </tr>
            </table>
          </div>
        `;

        await sendBrevoEmail({
          toEmail: parsed.email,
          toName: `${parsed.vorname} ${parsed.nachname}`,
          subject: "Dein persönlicher Meal Prep Typ",
          htmlContent: resultHtml,
        });
      } catch (error) {
        console.error("Fehler in der Hintergrundverarbeitung:", error);
      }
    })();
  } catch (error) {
    console.error("Webhook-Fehler:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
