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
- Du lieferst KEINE Lösung und KEIN fertiges System
- Du analysierst nur Alltag, Herausforderungen und Anforderungen
- Fokus liegt auf Verständnis, nicht auf Umsetzung

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
ca. 300–500 Wörter
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
    const auswertung =
      openaiResult.output_text || "Deine Auswertung konnte leider nicht erstellt werden.";

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <p>Hi ${parsed.vorname || "du"},</p>

        <p>danke dir, dass du dir die Zeit für den Test genommen hast.</p>

        <p>Hier ist dein persönliches Ergebnis:</p>

        <div style="white-space: pre-line;">${auswertung}</div>

        <p style="margin-top: 24px;">
          Liebe Grüße<br>
          Samia<br>
          Happy Tummy Club
        </p>
      </div>
    `;

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
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
