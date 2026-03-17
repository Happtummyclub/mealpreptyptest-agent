export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        error: "Bitte sende die Daten per POST."
      });
    }

    const data = req.body;

    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Keine Testdaten erhalten."
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        input: `Analysiere folgende Daten und erstelle ein individuelles Essenssystem:\n${JSON.stringify(data)}`
      })
    });

    const result = await response.json();

    return res.status(200).json({
      success: true,
      output: result.output_text || "Auswertung erfolgreich erstellt."
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
