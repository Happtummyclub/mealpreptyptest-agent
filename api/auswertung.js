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

    console.log("Webhook empfangen für:", parsed.email);

    // 1) Sofortige Bestätigungsmail
    const confirmationHtml = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#222;">
        <p>Hi ${parsed.vorname || "du"},</p>

        <p>
          danke für deine Teilnahme am Meal Prep Typ Test.
        </p>

        <p>
          Deine persönliche Auswertung wird gerade erstellt und erreicht dich in Kürze per E-Mail.
        </p>

        <p>
          Liebe Grüße<br>
          <strong>Samia vom Happy Tummy Club</strong>
        </p>
      </div>
    `;

    await sendBrevoEmail({
      toEmail: parsed.email,
      toName: `${parsed.vorname} ${parsed.nachname}`.trim(),
      subject: "Deine Auswertung ist unterwegs",
      htmlContent: confirmationHtml,
    });

    console.log("Bestätigungsmail gesendet an:", parsed.email);

    // 2) Zweiten Endpoint anstoßen
    const triggerResponse = await fetch(
      `${process.env.APP_BASE_URL}/api/process-result`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_API_SECRET,
        },
        body: JSON.stringify({ parsed }),
      }
    );

    const triggerText = await triggerResponse.text().catch(() => "");

    console.log("process-result angestoßen:", {
      status: triggerResponse.status,
      body: triggerText,
    });

    // 3) Schnell an Tally antworten
    return res.status(200).json({
      success: true,
      message: "Webhook erfolgreich empfangen.",
    });
  } catch (error) {
    console.error("Fehler in /api/auswertung:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
