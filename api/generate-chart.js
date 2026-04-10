export default function handler(req, res) {
  // Standardwerte (falls keine übergeben werden)
  const { values = "3,3,3,3,3,3,3,3,3" } = req.query;

  // Bezeichnungen der Dimensionen
  const labels = [
    "Alltagsdynamik",
    "Mental Load",
    "Motivation",
    "Zeitressourcen",
    "Ernährungsorientierung",
    "Kochverhalten",
    "Abwechslungsbedarf",
    "Flexibilität im Einkauf",
    "Planänderungen",
  ];

  // Werte in Zahlen umwandeln und validieren
  const data = values
    .split(",")
    .map((v) => {
      const num = parseInt(v, 10);
      return isNaN(num) ? 3 : Math.min(Math.max(num, 1), 5);
    })
    .slice(0, 9);

  // Falls weniger als 9 Werte übergeben wurden, auffüllen
  while (data.length < 9) {
    data.push(3);
  }

  // Größenmapping der Kreise
  const sizeMap = {
    1: 40,
    2: 60,
    3: 80,
    4: 100,
    5: 120,
  };

  // Positionen im 3x3 Raster
  const positions = [
    { x: 150, y: 200 },
    { x: 400, y: 200 },
    { x: 650, y: 200 },
    { x: 150, y: 420 },
    { x: 400, y: 420 },
    { x: 650, y: 420 },
    { x: 150, y: 640 },
    { x: 400, y: 640 },
    { x: 650, y: 640 },
  ];

  // SVG-Kreise generieren
  const circles = data
    .map((value, index) => {
      const size = sizeMap[value] || 80;
      const radius = size / 2;
      const { x, y } = positions[index];
      const label = labels[index];

      return `
        <circle cx="${x}" cy="${y}" r="${radius}" fill="#6B8E23" opacity="0.85" />
        <text x="${x}" y="${y}" text-anchor="middle" dy="5"
          font-size="14" fill="white" font-family="Arial" font-weight="bold">
          ${value}
        </text>
        <text x="${x}" y="${y + radius + 20}" text-anchor="middle"
          font-size="12" fill="#333" font-family="Arial">
          ${label}
        </text>
      `;
    })
    .join("");

  // SVG-Gesamtstruktur
  const svg = `
    <svg width="800" height="900" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f4f7f6"/>

      <!-- Titel -->
      <text x="400" y="60" text-anchor="middle"
        font-size="28" font-family="Arial"
        fill="#6B8E23" font-weight="bold">
        Dein persönlicher Meal Prep Typ
      </text>

      <text x="400" y="95" text-anchor="middle"
        font-size="16" font-family="Arial"
        fill="#555">
        Dein individuelles Ergebnis
      </text>

      ${circles}

      <!-- Legende -->
      <text x="400" y="830" text-anchor="middle"
        font-size="12" font-family="Arial"
        fill="#666">
        Kreisgröße entspricht der Ausprägung (Skala 1–5)
      </text>

      <!-- Footer -->
      <text x="400" y="860" text-anchor="middle"
        font-size="12" font-family="Arial"
        fill="#888">
        © ${new Date().getFullYear()} Happy Tummy Club
      </text>
    </svg>
  `;

  // Header setzen
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

  // SVG zurückgeben
  res.status(200).send(svg);
}
