function getSelectedOptionText(field) {
  if (!field || !Array.isArray(field.options)) return field?.value ?? null;

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

    return res.status(200).json({
      success: true,
      parsed
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
