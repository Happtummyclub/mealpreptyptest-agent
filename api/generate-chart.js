export default function handler(req, res) {
  const WIDTH = 1080;
  const HEIGHT = 1350;

  const BG = "#d7afc7";
  const TEXT = "#000000";
  const TITLE = "DEIN PERSÖNLICHES MEAL PREP PROFIL";

  const labels = [
    "ALLTAGSDYNAMIK",
    "MENTAL LOAD",
    "MOTIVATION",
    "ZEITRESSOURCEN",
    "ERNÄHRUNGSORIENTIERUNG",
    "KOCHVERHALTEN",
    "ABWECHSLUNGSBEDARF",
    "FLEXIBILITÄT IM EINKAUF",
    "UMGANG MIT PLANÄNDERUNGEN",
  ];

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

  // Stärkere Größenunterschiede
  const radiusMap = {
    1: 44,
    2: 72,
    3: 110,
    4: 158,
    5: 220,
  };

  const items = labels.map((label, index) => ({
    originalIndex: index,
    label,
    value: rawValues[index],
    r: radiusMap[rawValues[index]] || 110,
    color: "#448337",
    x: 0,
    y: 0,
    touches: 0,
  }));

  // Größte Kreise zuerst
  items.sort((a, b) => b.r - a.r);

  // Leuchtendere Farben zuerst für größere Kreise
  items.forEach((item, index) => {
    item.color = palette[index % palette.length];
  });

  const placed = [];
  const touchGap = 0;

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

  function countTouches(x, y, r) {
    let touches = 0;
    for (const p of placed) {
      const dx = x - p.x;
      const dy = y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const target = r + p.r + touchGap;

      if (Math.abs(dist - target) <= 7) {
        touches++;
      }
    }
    return touches;
  }

  // 1–3 Berührungen erlaubt, starke Präferenz für 3
  function candidateScore(x, y, r) {
    const distFromCenter = Math.sqrt(x * x + y * y);
    const touches = countTouches(x, y, r);

    let touchPenalty;

    if (touches === 3) {
      touchPenalty = 0;
    } else if (touches === 2) {
      touchPenalty = 180;
    } else if (touches === 1) {
      touchPenalty = 380;
    } else {
      touchPenalty = 2500;
    }

    return distFromCenter + touchPenalty;
  }

  // Unregelmäßige Winkel für organische Asymmetrie
  const preferredAngles = [
    9, 21, 34, 48, 63, 79, 96, 114, 133,
    153, 176, 201, 227, 251, 276, 301, 325, 347
  ];

  // Ersten Kreis in die Mitte des Clusters
  placed.push({
    ...items[0],
    x: 0,
    y: 0,
    touches: 0,
  });

  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    let best = null;

    // Zuerst bevorzugt tangential an bestehende Kreise setzen
    for (const anchor of placed) {
      const baseDistance = anchor.r + item.r + touchGap;

      for (const deg of preferredAngles) {
        const angle = (deg * Math.PI) / 180;

        // Organisch asymmetrische Form
        const x = anchor.x + Math.cos(angle) * baseDistance;
        const y = anchor.y + Math.sin(angle) * baseDistance * 0.9;

        if (overlaps(x, y, item.r)) continue;

        const touches = countTouches(x, y, item.r);
        if (touches < 1 || touches > 3) continue;

        const score = candidateScore(x, y, item.r);

        if (!best || score < best.score) {
          best = { x, y, score, touches };
        }
      }
    }

    // Falls noch keine gute Position gefunden wurde: Ring-Suche
    if (!best) {
      for (let ring = 10; ring < 900; ring += 2) {
        for (let deg = 0; deg < 360; deg += 3) {
          const angle = (deg * Math.PI) / 180;
          const x = Math.cos(angle) * ring;
          const y = Math.sin(angle) * ring * 0.9;

          if (overlaps(x, y, item.r)) continue;

          const touches = countTouches(x, y, item.r);
          if (touches < 1 || touches > 3) continue;

          const score = candidateScore(x, y, item.r);

          if (!best || score < best.score) {
            best = { x, y, score, touches };
          }
        }
      }
    }

    // Fallback
    if (!best) {
      best = {
        x: i * 55,
        y: i * 40,
        touches: 1,
        score: 99999,
      };
    }

    placed.push({
      ...item,
      x: best.x,
      y: best.y,
      touches: best.touches,
    });
  }

  // Bounding Box bestimmen
  const minX = Math.min(...placed.map((p) => p.x - p.r));
  const maxX = Math.max(...placed.map((p) => p.x + p.r));
  const minY = Math.min(...placed.map((p) => p.y - p.r));
  const maxY = Math.max(...placed.map((p) => p.y + p.r));

  const clusterWidth = maxX - minX;
  const clusterHeight = maxY - minY;

  // Deutlich mehr Rand zum Bildrand
  const MARGIN_X = 190;
  const MARGIN_TOP = 320;
  const MARGIN_BOTTOM = 190;

  const usableLeft = MARGIN_X;
  const usableRight = WIDTH - MARGIN_X;
  const usableTop = MARGIN_TOP;
  const usableBottom = HEIGHT - MARGIN_BOTTOM;

  const usableCenterX = usableLeft + (usableRight - usableLeft) / 2;
  const usableCenterY = usableTop + (usableBottom - usableTop) / 2;

  const currentCenterX = minX + clusterWidth / 2;
  const currentCenterY = minY + clusterHeight / 2;

  const shiftX = usableCenterX - currentCenterX;
  const shiftY = usableCenterY - currentCenterY;

  placed.forEach((p) => {
    p.x += shiftX;
    p.y += shiftY;
  });

  // Danach hart innerhalb des nutzbaren Bereichs halten
  placed.forEach((p) => {
    p.x = Math.max(usableLeft + p.r, Math.min(usableRight - p.r, p.x));
    p.y = Math.max(usableTop + p.r, Math.min(usableBottom - p.r, p.y));
  });

  function getFontSize(r, labelLength) {
    if (labelLength > 26) return 9;
    if (labelLength > 20) return 10;
    if (r >= 210) return 22;
    if (r >= 155) return 18;
    if (r >= 110) return 14;
    return 11;
  }

  function getTextLength(r, labelLength) {
    if (labelLength > 26) return r * 2.5;
    if (labelLength > 20) return r * 2.3;
    return r * 2.05;
  }

  function getArcPath(x, y, r, id) {
    const arcRadius = r * 0.79;
    const startX = x - arcRadius * 0.93;
    const endX = x + arcRadius * 0.93;
    const arcY = y - r * 0.30;

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
      const textLength = getTextLength(p.r, p.label.length);

      return `
        <g>
          <circle
            cx="${p.x}"
            cy="${p.y}"
            r="${p.r}"
            fill="${p.color}"
          />

          <text
            font-family="Montserrat, Arial, Helvetica, sans-serif"
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

      <defs>
        ${defs}
      </defs>

      <text
        x="${WIDTH / 2}"
        y="165"
        text-anchor="middle"
        font-family="Montserrat, Arial, Helvetica, sans-serif"
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
