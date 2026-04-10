export default function handler(req, res) {
  const WIDTH = 1080;
  const HEIGHT = 1350;
  const BG = "#d7afc7";
  const TEXT = "#000000";

  const TITLE = "dein persönliches Meal Prep Profil";

  const labels = [
    "Alltagsdynamik",
    "Mental Load",
    "Motivation",
    "Zeitressourcen",
    "Ernährungsorientierung",
    "Kochverhalten",
    "Abwechslungsbedarf",
    "Flexibilität im Einkauf",
    "Umgang mit Planänderungen",
  ];

  const { values = "3,3,3,3,3,3,3,3,3" } = req.query;

  const rawValues = values
    .split(",")
    .map((v) => {
      const num = parseInt(v, 10);
      if (Number.isNaN(num)) return 3;
      return Math.min(Math.max(num, 1), 5);
    })
    .slice(0, 9);

  while (rawValues.length < 9) {
    rawValues.push(3);
  }

  // Kreisgrößen
  const radiusMap = {
    1: 58,
    2: 76,
    3: 96,
    4: 118,
    5: 146,
  };

  // Farbwelt: größere Kreise bekommen die leuchtenderen Farben zuerst
  const rankedColors = [
    "#dee444",
    "#f05808",
    "#e44c81",
    "#d38329",
    "#cfb12f",
    "#448337",
    "#215413",
    "#f05808",
    "#448337",
  ];

  const items = labels.map((label, index) => ({
    originalIndex: index,
    label,
    value: rawValues[index],
    r: radiusMap[rawValues[index]] || 96,
    color: "#448337",
    x: 0,
    y: 0,
  }));

  // Größte Kreise zuerst
  items.sort((a, b) => b.r - a.r);

  items.forEach((item, index) => {
    item.color = rankedColors[index % rankedColors.length];
  });

  // Kreis-Packing: größte Kreise innen, kleinere außen, möglichst eng
  const placed = [];
  const gap = 6;

  function overlaps(x, y, r) {
    for (const p of placed) {
      const dx = x - p.x;
      const dy = y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < r + p.r + gap) {
        return true;
      }
    }
    return false;
  }

  // Ersten Kreis in die Mitte
  placed.push({
    ...items[0],
    x: 0,
    y: 0,
  });

  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    let found = false;

    // Spiral-/Ring-Suche für kompakte Anordnung
    for (let ring = 0; ring < 900 && !found; ring += 3) {
      for (let deg = 0; deg < 360 && !found; deg += 4) {
        const angle = (deg * Math.PI) / 180;

        // leicht organische Ellipse statt perfekter Kreis
        const x = Math.cos(angle) * ring;
        const y = Math.sin(angle) * ring * 0.88;

        if (!overlaps(x, y, item.r)) {
          placed.push({
            ...item,
            x,
            y,
          });
          found = true;
        }
      }
    }

    // Fallback
    if (!found) {
      placed.push({
        ...item,
        x: i * 40,
        y: i * 20,
      });
    }
  }

  // Bounding Box berechnen
  const minX = Math.min(...placed.map((p) => p.x - p.r));
  const maxX = Math.max(...placed.map((p) => p.x + p.r));
  const minY = Math.min(...placed.map((p) => p.y - p.r));
  const maxY = Math.max(...placed.map((p) => p.y + p.r));

  const clusterWidth = maxX - minX;
  const clusterHeight = maxY - minY;

  const targetCenterX = WIDTH / 2;
  const targetCenterY = 820;

  const currentCenterX = minX + clusterWidth / 2;
  const currentCenterY = minY + clusterHeight / 2;

  const shiftX = targetCenterX - currentCenterX;
  const shiftY = targetCenterY - currentCenterY;

  placed.forEach((p) => {
    p.x += shiftX;
    p.y += shiftY;
  });

  function getFontSize(r, labelLength) {
    if (r >= 135) return 22;
    if (r >= 115) return 18;
    if (r >= 95) return 15;
    if (labelLength > 20) return 10;
    return 12;
  }

  function getArcPath(x, y, r, id) {
    const arcRadius = r * 0.78;
    const startX = x - arcRadius * 0.88;
    const endX = x + arcRadius * 0.88;
    const arcY = y - r * 0.34;

    return `
      <path
        id="${id}"
        d="M ${startX} ${arcY} A ${arcRadius} ${arcRadius} 0 0 1 ${endX} ${arcY}"
        fill="none"
        stroke="none"
      />
    `;
  }

  const defs = placed
    .map((p, index) => getArcPath(p.x, p.y, p.r, `curve-${index}`))
    .join("");

  const circlesSvg = placed
    .map((p, index) => {
      const fontSize = getFontSize(p.r, p.label.length);
      const valueFontSize = p.r >= 120 ? 44 : p.r >= 100 ? 36 : p.r >= 80 ? 30 : 24;
      const textLength = Math.max(90, p.r * 1.85);

      return `
        <g>
          <circle
            cx="${p.x}"
            cy="${p.y}"
            r="${p.r}"
            fill="${p.color}"
            stroke="#000000"
            stroke-width="3"
          />

          <text
            font-family="Arial, Helvetica, sans-serif"
            font-size="${fontSize}"
            font-weight="700"
            fill="${TEXT}"
            letter-spacing="0.2px"
            textLength="${textLength}"
            lengthAdjust="spacingAndGlyphs"
          >
            <textPath
              href="#curve-${index}"
              startOffset="50%"
              text-anchor="middle"
            >
              ${p.label}
            </textPath>
          </text>

          <text
            x="${p.x}"
            y="${p.y + 18}"
            text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif"
            font-size="${valueFontSize}"
            font-weight="800"
            fill="${TEXT}"
          >
            ${p.value}
          </text>
        </g>
      `;
    })
    .join("");

  const svg = `
    <svg
      width="${WIDTH}"
      height="${HEIGHT}"
      viewBox="0 0 ${WIDTH} ${HEIGHT}"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100%" height="100%" fill="${BG}" />

      <!-- Logo -->
      <defs>
        <clipPath id="logoClip">
          <circle cx="${WIDTH / 2}" cy="170" r="92" />
        </clipPath>
        ${defs}
      </defs>

      <circle
        cx="${WIDTH / 2}"
        cy="170"
        r="92"
        fill="#d7afc7"
        stroke="#000000"
        stroke-width="0"
      />

      <image
        href="/logo.png"
        x="${WIDTH / 2 - 92}"
        y="${170 - 92}"
        width="184"
        height="184"
        clip-path="url(#logoClip)"
        preserveAspectRatio="xMidYMid slice"
      />

      <!-- Titel -->
      <text
        x="${WIDTH / 2}"
        y="320"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="42"
        font-weight="800"
        fill="${TEXT}"
      >
        ${TITLE}
      </text>

      ${circlesSvg}
    </svg>
  `;

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.status(200).send(svg);
}
