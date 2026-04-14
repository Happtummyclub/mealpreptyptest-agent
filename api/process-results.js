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

    console.log("Starte OpenAI-Auswertung für:", parsed.email);

    const prompt = `
Erstelle eine personalisierte Analyse des Essensalltags basierend auf den Ergebnissen eines Meal-Prep-Tests.

Schreibe ausschließlich in der Du-Form und verwende einen wertschätzenden, stärkenorientierten und motivierenden Ton. Die Sprache soll klar, nahbar, professionell und alltagstauglich sein. Vermeide Fachjargon, Floskeln, Emojis und übertriebene Werbesprache.

Ziel der Analyse ist es, der Person zu helfen, ihren Essensalltag besser zu verstehen und einzuordnen. Zeige auf, was bereits gut funktioniert, welche Herausforderungen bestehen und wo Potenziale für mehr Struktur, Entlastung und Wohlbefinden liegen.

Betone, dass Meal Prep keine „One-Size-Fits-All“-Lösung ist. Eine individuelle, flexible und nachhaltige Strategie ist entscheidend, um langfristig eine alltagstaugliche und umsetzbare Lösung zu entwickeln.

Die Analyse soll:
- die wichtigsten Erkenntnisse aus den Testergebnissen zusammenfassen,
- den persönlichen Alltag realistisch widerspiegeln,
- Stärken und Entwicklungspotenziale aufzeigen,
- Orientierung geben und Selbstwirksamkeit fördern,
- als Grundlage für eine passende Meal-Prep-Strategie dienen.

Strukturiere den Text in drei Absätze:
1. Einordnung des aktuellen Essensalltags,
2. zentrale Stärken und Herausforderungen,
3. Potenziale und Ausblick.

Verwende nach Möglichkeit Begriffe wie:
„flexibel“, „alltagstauglich“, „individuell“, „strukturiert“, „entlastend“, „nachhaltig“, „klar“, „umsetzbar“ und „selbstfürsorglich“.

Vermeide negativ konnotierte oder wertende Begriffe wie:
„fehlende Motivation“, „keine Lust“, „Widerstand“, „Defizit“, „Schwäche“, „Überforderung“, „Problem“, „Versagen“, „Disziplinmangel“, „unorganisiert“ oder „faul“.

Formuliere stattdessen neutral und unterstützend. Stelle Herausforderungen als Entwicklungsmöglichkeiten dar und vermittle Zuversicht, Klarheit und Selbstwirksamkeit.

Der Text soll zwischen 120 und 180 Wörtern umfassen.

Hier sind die Ergebnisse:

Name: ${parsed.vorname || ""}

Ergebnisse der neun Dimensionen:
- Alltagsdynamik: ${parsed.alltagsdynamik}
- Mental Load: ${parsed.mental_load}
- Motivation: ${parsed.motivation}
- Zeit: ${parsed.zeit}
- Ernährungsorientierung: ${parsed.ernaehrungsorientierung}
- Kochverhalten: ${parsed.kochverhalten}
- Abwechslungsbedarf: ${parsed.abwechslungsbedarf}
- Einkauf: ${parsed.einkauf}
- Umgang mit Planänderungen: ${parsed.planaenderungen}
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
    let auswertungHtml = extractOpenAIText(openaiResult);

    if (!openaiResponse.ok || !auswertungHtml) {
      const debugInfo = {
        http_status: openaiResponse.status,
        error: openaiResult?.error || null,
        raw_preview: truncate(JSON.stringify(openaiResult)),
      };

      auswertungHtml = `
        <p>Deine Auswertung konnte leider nicht erstellt werden.</p>
        <p><strong>Debug-Info:</strong></p>
        <p>${JSON.stringify(debugInfo)}</p>
      `;
    } else {
      auswertungHtml = `
        <p>${auswertungHtml
          .split("\n")
          .filter(Boolean)
          .map((paragraph) => paragraph.trim())
          .join("</p><p>")}</p>
      `;
    }

    console.log("OpenAI-Auswertung erstellt für:", parsed.email);

    const chartValues = buildChartValues(parsed);
    const chartUrl = `${process.env.APP_BASE_URL}/api/generate-chart?values=${encodeURIComponent(chartValues)}&v=${Date.now()}`;

    const meaningHtml = `
      <p>Deine Ergebnisse zeigen, welche Anforderungen eine passende Meal-Prep-Methode erfüllen sollte. Entscheidend ist ein Ansatz, der sich flexibel in deinen Alltag integrieren lässt und dich nachhaltig entlastet.</p>
      <p>Im nächsten Schritt schauen wir gemeinsam, wie du eine Struktur entwickeln kannst, die wirklich zu dir und deinen Bedürfnissen passt – alltagstauglich, individuell und langfristig umsetzbar.</p>
    `;

    const resultPageUrl = `${process.env.APP_BASE_URL}/api/result-page?name=${encodeURIComponent(
      parsed.vorname || "du"
    )}&chart=${encodeURIComponent(chartUrl)}&analysis=${encodeURIComponent(
      auswertungHtml
    )}&meaning=${encodeURIComponent(
      meaningHtml
    )}&calendly=${encodeURIComponent("https://calendly.com/DEIN-LINK")}`;

    const resultHtml = `
      <div style="background-color:#f4f7f6;padding:40px 20px;font-family:Arial,Helvetica,sans-serif;">
        <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color:#6B8E23;color:#ffffff;text-align:center;padding:28px 24px;">
              <h1 style="margin:0;font-size:26px;">Happy Tummy Club</h1>
              <p style="margin:8px 0 0;font-size:14px;">Dein persönliches Meal Prep Profil</p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 30px;color:#333333;line-height:1.7;">
              <p>Hi ${parsed.vorname || "du"},</p>

              <p>
                schön, dass du dir die Zeit für den Test genommen hast. Das ist dein erster Schritt zu mehr Selbstfürsorge.
                Dein persönliches Ergebnis ist jetzt für dich verfügbar.
              </p>

              <p>
                👉 <strong>Hier findest du dein persönliches Ergebnis:</strong><br>
                <a href="${resultPageUrl}" target="_blank" style="color:#6B8E23;font-weight:bold;text-decoration:underline;">
                  Dein persönliches Meal Prep Profil ansehen
                </a>
              </p>

              <p>
                Möchtest du tiefer in deine Ergebnisse eintauchen? Gerne! Buche dir ein kostenloses Orientierungsgespräch
                und lass uns gemeinsam auf deine aktuelle Situation und deine Wünsche schauen. Wir besprechen, wie du Meal
                Prep alltagstauglich und nachhaltig in dein Leben integrieren kannst und auf welchem Weg du deine Ziele
                erreichst – strukturiert und in deinem eigenen Tempo.
              </p>

              <p>
                👉 <strong>Kostenloses Startgespräch buchen</strong><br>
                <a href="https://calendly.com/DEIN-LINK" target="_blank" style="color:#6B8E23;font-weight:bold;text-decoration:underline;">
                  https://calendly.com/DEIN-LINK
                </a>
              </p>

              <p>
                Sollte einer der Links nicht funktionieren, kannst du dein Ergebnis auch direkt hier aufrufen:<br>
                <strong>Dein persönliches Profil:</strong>
                <a href="${resultPageUrl}" target="_blank" style="color:#6B8E23;font-weight:bold;text-decoration:underline;">
                  Dein persönliches Profil
                </a>
              </p>

              <p>Ich wünsche dir viel Spaß beim Entdecken deiner Auswertung :)</p>

              <p style="margin-top:24px;">
                Liebe Grüße<br>
                Samia Tömen<br>
                Happy Tummy Club
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f4f7f6;text-align:center;padding:16px;font-size:12px;color:#777;">
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
