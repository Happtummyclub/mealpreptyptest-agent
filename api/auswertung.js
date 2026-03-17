export default async function handler(req, res) {
  try {
    const data = req.body;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        input: `Analysiere folgende Daten und erstelle ein Essenssystem:\n${JSON.stringify(data)}`
      })
    });

    const result = await response.json();

    res.status(200).json({
      success: true,
      output: result.output_text
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
