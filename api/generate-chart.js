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

  // Leuchtendere Farben zuerst für größere Kreise
  const palette = [
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

  const radiusMap = {
    1: 62,
    2: 82,
    3: 104,
    4: 126,
    5: 152,
  };

  const items = labels.map((label, index) => ({
    originalIndex: index,
    label,
    value: rawValues[index],
    r: radiusMap[rawValues[index]] || 104,
    color: "#448337",
    x: 0,
    y: 0,
    touches: 0,
  }));

  // große Kreise zuerst
  items.sort((a, b) => b.r - a.r);

  items.forEach((item, index) => {
    item.color = palette[index % palette.length];
  });

  const placed = [];
  const touchGap = 0; // berühren erlaubt
  const maxTouchesPreferred = 2;

  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function countTouches(x, y, r) {
    let touches = 0;
    for (const p of placed) {
      const dx = x - p.x;
      const dy = y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const target = r + p.r + touchGap;

      // "berührt", wenn fast exakt tangential
      if (Math.abs(dist - target) <= 5) {
        touches++;
      }
    }
    return touches;
  }

  function overlaps(x, y, r) {
    for (const p of placed) {
      const dx = x - p.x;
      const dy = y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < r + p.r - 1) {
        return true;
      }
    }
    return false;
  }

  function candidateScore(x, y, r) {
    const distFromCenter = Math.sqrt(x * x + y * y);
    const touches = countTouches(x, y, r);

    // Bevorzugt: 1 oder 2 Berührungen, nah am Clusterzentrum
    let touchPenalty = 0;
    if (touches === 0) touchPenalty = 900;
    else if (touches === 1) touchPenalty = 0;
    else if (touches === 2) touchPenalty = 20;
    else touchPenalty = 500 + (touches - 2) * 200;

    return distFromCenter + touchPenalty;
  }

  // asymmetrische Richtungsgewichte für organische Form
  const preferredAngles = [
    18, 42, 71, 103, 142, 188, 227, 279, 322,
    12, 55, 94, 136, 174, 216, 254, 301, 338
  ];

  // erster Kreis in Zentrum
  placed.push({
    ...items[0],
    x: 0,
    y: 0,
    touches: 0,
  });

  // restliche Kreise außen ansetzen
  for (let i = 1; i < items.length; i++) {
    const item = items[i];

    let best = null;

    // 1) Tangential an bereits platzierte Kreise setzen
    for (const anchor of placed) {
      const baseDistance = anchor.r + item.r + touchGap;

      for (const deg of preferredAngles) {
        const angle = (deg * Math.PI) / 180;

        // leichte Ellipse + Asymmetrie
        const x = anchor.x + Math.cos(angle) * baseDistance;
        const y = anchor.y + Math.sin(angle) * baseDistance * 0.88;

        if (overlaps(x, y, item.r)) continue;

        const touches = countTouches(x, y, item.r);
        if (touches > 3) continue;

        const score = candidateScore(x, y, item.r);

        if (!best || score < best.score) {
          best = { x, y, score, touches };
        }
      }
    }

    // 2) Falls noch nichts Gutes gefunden wurde: feinere Suche
    if (!best) {
      for (let ring = 20; ring < 900; ring += 3) {
        for (let deg = 0; deg < 360; deg += 5) {
          const angle = (deg * Math.PI) / 180;
          const x = Math.cos(angle) * ring;
          const y = Math.sin(angle) * ring * 0.88;

          if (overlaps(x, y, item.r)) continue;

          const touches = countTouches(x, y, item.r);
          if (touches > 3) continue;

          const score = candidateScore(x, y, item.r);

          if (!best || score < best.score) {
            best = { x, y, score, touches };
          }
        }
      }
    }

    if (!best) {
      best = {
        x: i * 40,
        y: i * 30,
        touches: 0,
        score: 9999,
      };
    }

    placed.push({
      ...item,
      x: best.x,
      y: best.y,
      touches: best.touches,
    });
  }

  // Bounding Box
  const minX = Math.min(...placed.map((p) => p.x - p.r));
  const maxX = Math.max(...placed.map((p) => p.x + p.r));
  const minY = Math.min(...placed.map((p) => p.y - p.r));
  const maxY = Math.max(...placed.map((p) => p.y + p.r));

  const clusterWidth = maxX - minX;
  const clusterHeight = maxY - minY;

  const targetCenterX = WIDTH / 2;
  const targetCenterY = 760;

  const currentCenterX = minX + clusterWidth / 2;
  const currentCenterY = minY + clusterHeight / 2;

  const shiftX = targetCenterX - currentCenterX;
  const shiftY = targetCenterY - currentCenterY;

  placed.forEach((p) => {
    p.x += shiftX;
    p.y += shiftY;
  });

  function getFontSize(r, labelLength) {
    if (r >= 145) return 22;
    if (r >= 125) return 18;
    if (r >= 105) return 15;
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
      const textLength = Math.max(90, p.r * 1.92);

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

      <text
        x="${WIDTH / 2}"
        y="170"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="42"
        font-weight="800"
        fill="${TEXT}"
      >
        ${TITLE}
      </text>

      ${defs}
      ${circlesSvg}
    </svg>
  `;

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.status(200).send(svg);
}
