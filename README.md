export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({
      success: false,
      error: "Bitte sende die Daten per POST."
    });
  }

  console.log("Incoming data:", req.body);

  return res.status(200).json({
    success: true,
    message: "Daten empfangen"
  });
}
