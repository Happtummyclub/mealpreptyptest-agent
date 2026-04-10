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

  // Deutlich stärkere Größenunterschiede
  const radiusMap = {
    1: 42,
    2: 68,
    3: 102,
    4: 146,
    5: 210,
  };

  const items = labels.map((label, index) => ({
    originalIndex: index,
    label,
    value: rawValues[index],
    r: radiusMap[rawValues[index]] || 102,
    color: "#448337",
    x: 0,
    y: 0,
    touches: 0,
  }));

  // Große Kreise zuerst
  items.sort((a, b) => b.r - a.r);

  // Leuchtendere Farben zuerst auf größere Kreise
  items.forEach((item, index) => {
    item.color = palette[index % palette.length];
  });

  const placed = [];
  const touchGap = 0;
  const preferredMinTouches = 3;

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

      if (Math.abs(dist - target) <= 6) {
        touches++;
      }
    }
    return touches;
  }

  function candidateScore(x, y, r) {
    const distFromCenter = Math.sqrt(x * x + y * y);
    const touches = countTouches(x, y, r);

    let touchPenalty = 0;

    if (touches >= preferredMinTouches) {
      touchPenalty = 0;
    } else if (touches === 2) {
      touchPenalty = 500;
    } else if (touches === 1) {
      touchPenalty = 1200;
    } else {
      touchPenalty = 2500;
    }

    return distFromCenter + touchPenalty;
  }

  const preferredAngles = [
    12, 26, 41, 57, 74, 93, 115, 138, 161,
    185, 208, 232, 255, 279, 302, 324, 343
  ];

  placed.push({
    ...items[0],
    x: 0,
    y: 0,
    touches: 0,
  });

  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    let best = null;

    for (const anchor of placed) {
      const baseDistance = anchor.r + item.r + touchGap;

      for (const deg of preferredAngles) {
        const angle = (deg * Math.PI) / 180;
        const x = anchor.x + Math.cos(angle) * baseDistance;
        const y = anchor.y + Math.sin(angle) * baseDistance * 0.9;

        if (overlaps(x, y, item.r)) continue;

        const touches = countTouches(x, y, item.r);
        const score = candidateScore(x, y, item.r);

        if (!best || score < best.score) {
          best = { x, y, score, touches };
        }
      }
    }

    if (!best || best.touches < preferredMinTouches) {
      for (let ring = 20; ring < 900; ring += 2) {
        for (let deg = 0; deg < 360; deg += 3) {
          const angle = (deg * Math.PI) / 180;
          const x = Math.cos(angle) * ring;
          const y = Math.sin(angle) * ring * 0.9;

          if (overlaps(x, y, item.r)) continue;

          const touches = countTouches(x, y, item.r);
          const score = candidateScore(x, y, item.r);

          if (!best || score < best.score) {
            best = { x, y, score, touches };
          }
        }
      }
    }

    if (!best) {
      best = {
        x: i * 50,
        y: i * 35,
        touches: 0,
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

  const minX = Math.min(...placed.map((p) => p.x - p.r));
  const maxX = Math.max(...placed.map((p) => p.x + p.r));
  const minY = Math.min(...placed.map((p) => p.y - p.r));
  const maxY = Math.max(...placed.map((p) => p.y + p.r));

  const clusterWidth = maxX - minX;
  const clusterHeight = maxY - minY;

  const usableTop = 280;
  const usableBottom = HEIGHT - 180;
  const usableCenterY = usableTop + (usableBottom - usableTop) / 2;

  const usableLeft = 140;
  const usableRight = WIDTH - 140;
  const usableCenterX = usableLeft + (usableRight - usableLeft) / 2;

  const currentCenterX = minX + clusterWidth / 2;
  const currentCenterY = minY + clusterHeight / 2;

  const shiftX = usableCenterX - currentCenterX;
  const shiftY = usableCenterY - currentCenterY;

  placed.forEach((p) => {
    p.x += shiftX;
    p.y += shiftY;
  });

  function getFontSize(r, labelLength) {
    if (r >= 190) return 22;
    if (r >= 145) return 18;
    if (r >= 110) return 14;
    if (labelLength > 20) return 9;
    return 11;
  }

  function getArcPath(x, y, r, id) {
    const arcRadius = r * 0.77;
    const startX = x - arcRadius * 0.88;
    const endX = x + arcRadius * 0.88;
    const arcY = y - r * 0.32;

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
      const textLength = Math.max(90, p.r * 1.9);

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
