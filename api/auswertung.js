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
  if (typeof openaiResult?.output_text === "string" && openaiResult.output_text.trim()) {
    return openaiResult.output_text.trim();
  }

  if (Array.isArray(openaiResult?.output)) {
    const text = openaiResult.output
      .map((item) => {
        if (item.type === "message" && Array.isArray(item.content)) {
          return item.content
            .filter((contentItem) => contentItem.type === "output_text")
            .map((contentItem) => contentItem.text)
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({
      success: false,
      error: "Bitte sende die Daten per POST."
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
      )
    };

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
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        input: prompt
      })
    });

    const openaiResult = await openaiResponse.json();
    let auswertung = extractOpenAIText(openaiResult);

    if (!openaiResponse.ok || !auswertung) {
      const debugInfo = {
        http_status: openaiResponse.status,
        error: openaiResult?.error || null,
        raw_preview: truncate(JSON.stringify(openaiResult))
      };

      auswertung =
        "Deine Auswertung konnte leider nicht erstellt werden.\n\n" +
        "Debug-Info:\n" +
        JSON.stringify(debugInfo, null, 2);
    }

    // Optimiertes E-Mail-Design
    const emailHtml = `
      <div style="background-color:#f4f7f6;padding:40px 20px;font-family:Arial,Helvetica,sans-serif;">
        <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#6B8E23;color:#ffffff;text-align:center;padding:24px;">
              <h1 style="margin:0;font-size:24px;">Happy Tummy Club</h1>
              <p style="margin:5px 0 0;font-size:14px;">Dein persönlicher Meal Prep Typ</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:30px;color:#333333;line-height:1.6;">
              
              <p>Hi ${parsed.vorname || "du"},</p>

              <p>
                Schön, dass du dir die Zeit für den Test genommen hast.
                Ein erster Schritt für mehr Selbstfürsorge im Alltag. Sehr gut!
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
                  Kostenlose Schnupperstunde buchen
                </a>
              </div>

              <p>Ich freue mich auf Dich!</p>

              <p style="margin-top:20px;">
                Liebe Grüße,<br>
                <strong>Samia vom Happy Tummy Club</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f4f7f6;text-align:center;padding:15px;font-size:12px;color:#777;">
              © ${new Date().getFullYear()} Happy Tummy Club
            </td>
          </tr>

        </table>
      </div>
    `;

    // Versand über Brevo
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        sender: {
          name: "Happy Tummy Club",
          email: "mail@happytummyclub.de"
        },
        to: [
          {
            email: parsed.email,
            name: `${parsed.vorname} ${parsed.nachname}`.trim()
          }
        ],
        subject: "Dein persönlicher Meal Prep Typ",
        htmlContent: emailHtml
      })
    });

    const brevoResult = await brevoResponse.json();

    return res.status(200).json({
      success: true,
      parsed,
      auswertung,
      emailSent: brevoResponse.ok,
      brevoResult
    });

  } catch (error) {
    console.error("ERROR:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
