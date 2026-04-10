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

  // Deutliche Größenunterschiede, aber noch sinnvoll packbar
  const radiusMap = {
    1: 34,
    2: 56,
    3: 88,
    4: 128,
    5: 176,
  };

  const items = labels.map((label, index) => ({
    originalIndex: index,
    label,
    value: rawValues[index],
    r: radiusMap[rawValues[index]] || 88,
    color: "#448337",
    x: 0,
    y: 0,
  }));

  // Große Kreise zuerst
  items.sort((a, b) => b.r - a.r);

  // Leuchtendere Farben zuerst für größere Kreise
  items.forEach((item, index) => {
    item.color = palette[index % palette.length];
  });

  const placed = [];
  const touchGap = 0;
  const tolerance = 3;

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function overlapsCandidate(x, y, r) {
    for (const p of placed) {
      const dx = x - p.x;
      const dy = y - p.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < r + p.r - 0.8) return true;
    }
    return false;
  }

  function countTouches(x, y, r) {
    let touches = 0;
    for (const p of placed) {
      const dx = x - p.x;
      const dy = y - p.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const target = r + p.r + touchGap;
      if (Math.abs(d - target) <= tolerance) {
        touches++;
      }
    }
    return touches;
  }

  function candidateScore(x, y, r) {
    const touches = countTouches(x, y, r);
    const centerDist = Math.sqrt(x * x + y * y);

    let touchPenalty = 0;
    if (touches === 3) touchPenalty = 0;
    else if (touches === 2) touchPenalty = 140;
    else if (touches === 1) touchPenalty = 320;
    else touchPenalty = 2200;

    // leichte Asymmetrie bevorzugen
    const asymmetryBonus = Math.abs(y) * 0.05 + Math.abs(x) * 0.02;

    return centerDist + touchPenalty + asymmetryBonus;
  }

  function circleIntersections(x0, y0, r0, x1, y1, r1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d === 0) return [];
    if (d > r0 + r1) return [];
    if (d < Math.abs(r0 - r1)) return [];

    const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
    const hSq = r0 * r0 - a * a;
    if (hSq < 0) return [];

    const h = Math.sqrt(Math.max(0, hSq));
    const xm = x0 + (a * dx) / d;
    const ym = y0 + (a * dy) / d;

    const rx = (-dy * h) / d;
    const ry = (dx * h) / d;

    return [
      { x: xm + rx, y: ym + ry },
      { x: xm - rx, y: ym - ry },
    ];
  }

  const preferredAngles = [
    14, 31, 49, 68, 92, 117, 145, 173, 201, 228, 254, 281, 309, 334
  ];

  // 1. Kreis
  placed.push({
    ...items[0],
    x: 0,
    y: 0,
  });

  // 2. Kreis
  if (items[1]) {
    placed.push({
      ...items[1],
      x: items[0].r + items[1].r,
      y: 0,
    });
  }

  // Restliche Kreise
  for (let i = 2; i < items.length; i++) {
    const item = items[i];
    let candidates = [];

    // A) Kandidaten, die 2 Berührungen erzeugen: Tangential an Kreispaare
    for (let a = 0; a < placed.length; a++) {
      for (let b = a + 1; b < placed.length; b++) {
        const p1 = placed[a];
        const p2 = placed[b];

        const intersections = circleIntersections(
          p1.x,
          p1.y,
          p1.r + item.r + touchGap,
          p2.x,
          p2.y,
          p2.r + item.r + touchGap
        );

        for (const pt of intersections) {
          if (overlapsCandidate(pt.x, pt.y, item.r)) continue;
          const touches = countTouches(pt.x, pt.y, item.r);
          if (touches >= 1 && touches <= 3) {
            candidates.push({
              x: pt.x,
              y: pt.y,
              score: candidateScore(pt.x, pt.y, item.r),
              touches,
            });
          }
        }
      }
    }

    // B) Kandidaten, die 1 Berührung erzeugen: um einzelne Kreise herum
    for (const anchor of placed) {
      const ring = anchor.r + item.r + touchGap;
      for (const deg of preferredAngles) {
        const angle = (deg * Math.PI) / 180;
        const x = anchor.x + Math.cos(angle) * ring;
        const y = anchor.y + Math.sin(angle) * ring * 0.88;

        if (overlapsCandidate(x, y, item.r)) continue;
        const touches = countTouches(x, y, item.r);
        if (touches >= 1 && touches <= 3) {
          candidates.push({
            x,
            y,
            score: candidateScore(x, y, item.r),
            touches,
          });
        }
      }
    }

    // C) Falls noch nichts da ist: lockere Ringsuche
    if (candidates.length === 0) {
      for (let ring = 20; ring < 700; ring += 2) {
        for (let deg = 0; deg < 360; deg += 4) {
          const angle = (deg * Math.PI) / 180;
          const x = Math.cos(angle) * ring;
          const y = Math.sin(angle) * ring * 0.88;

          if (overlapsCandidate(x, y, item.r)) continue;
          const touches = countTouches(x, y, item.r);
          if (touches >= 1 && touches <= 3) {
            candidates.push({
              x,
              y,
              score: candidateScore(x, y, item.r),
              touches,
            });
          }
        }
        if (candidates.length > 0) break;
      }
    }

    // Kandidat auswählen
    candidates.sort((a, b) => a.score - b.score);

    const chosen = candidates[0] || {
      x: i * 60,
      y: i * 30,
      touches: 1,
      score: 99999,
    };

    placed.push({
      ...item,
      x: chosen.x,
      y: chosen.y,
    });
  }

  // Bounding Box vor Skalierung
  function getBounds(nodes) {
    return {
      minX: Math.min(...nodes.map((p) => p.x - p.r)),
      maxX: Math.max(...nodes.map((p) => p.x + p.r)),
      minY: Math.min(...nodes.map((p) => p.y - p.r)),
      maxY: Math.max(...nodes.map((p) => p.y + p.r)),
    };
  }

  let bounds = getBounds(placed);
  const clusterWidth = bounds.maxX - bounds.minX;
  const clusterHeight = bounds.maxY - bounds.minY;

  // Nutzbarer Bereich mit deutlichem Rand
  const MARGIN_X = 150;
  const MARGIN_TOP = 310;
  const MARGIN_BOTTOM = 170;

  const usableWidth = WIDTH - MARGIN_X * 2;
  const usableHeight = HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

  // Einheitlich skalieren, damit nichts abgeschnitten wird und die Fläche besser genutzt wird
  const fitScale = Math.min(
    usableWidth / clusterWidth,
    usableHeight / clusterHeight,
    1.18 // darf moderat vergrößern, wenn Luft da ist
  );

  placed.forEach((p) => {
    p.x *= fitScale;
    p.y *= fitScale;
    p.r *= fitScale;
  });

  bounds = getBounds(placed);

  const currentCenterX = (bounds.minX + bounds.maxX) / 2;
  const currentCenterY = (bounds.minY + bounds.maxY) / 2;

  const targetCenterX = WIDTH / 2;
  const targetCenterY = MARGIN_TOP + usableHeight / 2;

  const shiftX = targetCenterX - currentCenterX;
  const shiftY = targetCenterY - currentCenterY;

  placed.forEach((p) => {
    p.x += shiftX;
    p.y += shiftY;
  });

  function getFontSize(r, labelLength) {
    if (labelLength > 26) return Math.max(8, r * 0.08);
    if (labelLength > 20) return Math.max(9, r * 0.09);
    if (r >= 180) return 22;
    if (r >= 135) return 18;
    if (r >= 95) return 14;
    return 11;
  }

  function getTextLength(r, labelLength) {
    if (labelLength > 26) return r * 2.5;
    if (labelLength > 20) return r * 2.3;
    return r * 2.08;
  }

  function getArcPath(x, y, r, id) {
    const arcRadius = r * 0.79;
    const startX = x - arcRadius * 0.94;
    const endX = x + arcRadius * 0.94;
    const arcY = y - r * 0.28;

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
