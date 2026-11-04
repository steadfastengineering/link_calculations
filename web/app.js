const SVG_NS = "http://www.w3.org/2000/svg";
const FRAME_X = 0;
const OUTBOARD_X = 3;
const OUTBOARD_Y = 0;
const FRAME_COLOR = "#ff5c5c";
const AXLE_COLOR = "#39ff14";
const LINK_COLOR = "#c084fc";
const GRID_COLOR = "#14661f";

const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));
const plot = document.getElementById("link-plot");
const plotTitle = document.getElementById("plot-title");
const thetaInput = document.querySelector('input[name="theta"]');
const forceInput = document.querySelector('input[name="force"]');
const results = document.getElementById("results");
const updateButton = document.getElementById("update-plot");

let drawnTheta = 20;

function selectTab(next) {
  tabs.forEach((tab) => {
    const selected = tab === next;
    tab.setAttribute("aria-selected", selected ? "true" : "false");
    tab.tabIndex = selected ? 0 : -1;
  });
  panels.forEach((panel) => {
    panel.hidden = panel.id !== next.getAttribute("aria-controls");
  });
  next.focus();
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(index + direction + tabs.length) % tabs.length];
    selectTab(next);
  });
});

function svgEl(name, attrs, text) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function readTheta() {
  const value = Number(thetaInput.value.trim());
  if (!Number.isFinite(value) || value < 0 || value > 90) {
    return null;
  }
  return value;
}

function readForce() {
  const text = forceInput.value.trim();
  if (!text) {
    return null;
  }
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function formatLoad(value) {
  return String(Number(value.toPrecision(4)));
}

function showResults(theta, force) {
  const isolatedText = (theta === null || force === null || Math.sin((theta * Math.PI) / 180) === 0)
    ? "0"
    : formatLoad(force / Math.sin((theta * Math.PI) / 180));
  const sharedText = (theta === null || force === null || Math.sin((theta * Math.PI) / 180) === 0)
    ? "0 / 4 = 0"
    : `${isolatedText} / 4 = ${formatLoad(Number(isolatedText) / 4)}`;

  results.replaceChildren();
  [
    ["Single link load isolated (hypothetical)", isolatedText],
    ["Single link load in equal angle/length 4-link (realistic)", sharedText],
  ].forEach(([label, value]) => {
    results.append(document.createElement("p"));
    results.lastChild.textContent = label;
    results.append(document.createElement("strong"));
    results.lastChild.textContent = value;
  });
}

function geometry(theta) {
  const meets = theta > 0;
  const frameY = meets
    ? OUTBOARD_Y + (OUTBOARD_X - FRAME_X) / Math.tan((theta * Math.PI) / 180)
    : null;
  return {
    meets,
    frameY,
    xMin: -1.6,
    xMax: OUTBOARD_X + 1,
    yBottom: -1,
    yTop: meets ? Math.max(frameY, OUTBOARD_Y) + 1 : 4,
  };
}

function drawPlot(theta) {
  const box = geometry(theta);
  const width = box.xMax - box.xMin;
  const height = box.yTop - box.yBottom;
  const point = (x, y) => ({
    x: x - box.xMin,
    y: box.yTop - y,
  });
  const pixelsWide = plot.clientWidth || 640;
  const unit = width / pixelsWide;
  const fontSize = Math.max(14 * unit, Math.min(width, height) * 0.042);

  plot.setAttribute("viewBox", `0 0 ${width} ${height}`);
  plot.replaceChildren();

  for (let x = Math.ceil(box.xMin); x <= box.xMax; x += 1) {
    const from = point(x, box.yBottom);
    const to = point(x, box.yTop);
    plot.append(svgEl("line", {
      x1: from.x, y1: from.y, x2: to.x, y2: to.y,
      stroke: GRID_COLOR, "stroke-width": 1, "vector-effect": "non-scaling-stroke",
    }));
  }
  for (let y = Math.ceil(box.yBottom); y <= box.yTop; y += 1) {
    const from = point(box.xMin, y);
    const to = point(box.xMax, y);
    plot.append(svgEl("line", {
      x1: from.x, y1: from.y, x2: to.x, y2: to.y,
      stroke: GRID_COLOR, "stroke-width": 1, "vector-effect": "non-scaling-stroke",
    }));
  }

  const frameTop = point(FRAME_X, box.yTop);
  const frameBottom = point(FRAME_X, box.yBottom);
  plot.append(svgEl("line", {
    x1: frameTop.x, y1: frameTop.y, x2: frameBottom.x, y2: frameBottom.y,
    stroke: FRAME_COLOR, "stroke-width": 2, "vector-effect": "non-scaling-stroke",
  }));

  const axleLeft = point(box.xMin, 0);
  const axleRight = point(box.xMax, 0);
  plot.append(svgEl("line", {
    x1: axleLeft.x, y1: axleLeft.y, x2: axleRight.x, y2: axleRight.y,
    stroke: AXLE_COLOR, "stroke-width": 2, "vector-effect": "non-scaling-stroke",
  }));

  const frameLabel = point(FRAME_X - 0.18, (box.yBottom + box.yTop) / 2);
  plot.append(svgEl("text", {
    x: frameLabel.x,
    y: frameLabel.y,
    fill: FRAME_COLOR,
    "font-size": fontSize,
    "font-family": "inherit",
    "text-anchor": "middle",
    "dominant-baseline": "middle",
    transform: `rotate(-90 ${frameLabel.x} ${frameLabel.y})`,
  }, "0° — Frame reference"));

  const axleLabel = point(OUTBOARD_X + 0.15, 0.28);
  plot.append(svgEl("text", {
    x: axleLabel.x,
    y: axleLabel.y,
    fill: AXLE_COLOR,
    "font-size": fontSize,
    "font-family": "inherit",
    "text-anchor": "start",
  }, "Axle"));

  if (box.meets) {
    const start = point(OUTBOARD_X, OUTBOARD_Y);
    const end = point(FRAME_X, box.frameY);
    plot.append(svgEl("line", {
      x1: start.x, y1: start.y, x2: end.x, y2: end.y,
      stroke: LINK_COLOR, "stroke-width": 2, "vector-effect": "non-scaling-stroke",
    }));
    drawArrow(start, end, 9 * unit, LINK_COLOR);
    plot.append(svgEl("circle", {
      cx: start.x, cy: start.y, r: 4 * unit, fill: LINK_COLOR,
    }));

    const rise = box.frameY - OUTBOARD_Y;
    const arcRadius = Math.min(1.4, 0.28 * Math.max(rise, 1));
    const arc = [];
    const steps = 24;
    for (let i = 0; i <= steps; i += 1) {
      const degrees = -90 + (theta * i) / steps;
      const radians = (degrees * Math.PI) / 180;
      arc.push(point(
        FRAME_X + arcRadius * Math.cos(radians),
        box.frameY + arcRadius * Math.sin(radians),
      ));
    }
    plot.append(svgEl("polyline", {
      points: arc.map((p) => `${p.x},${p.y}`).join(" "),
      fill: "none",
      stroke: "#39ff14",
      "stroke-width": 1.2,
      "vector-effect": "non-scaling-stroke",
    }));

    const labelAngle = ((-90 + theta / 2) * Math.PI) / 180;
    const label = point(
      FRAME_X + arcRadius * 1.55 * Math.cos(labelAngle),
      box.frameY + arcRadius * 1.55 * Math.sin(labelAngle),
    );
    plot.append(svgEl("text", {
      x: label.x,
      y: label.y,
      fill: "#39ff14",
      "font-size": fontSize,
      "font-family": "inherit",
      "text-anchor": "middle",
      "dominant-baseline": "middle",
    }, `${formatAngle(theta)}°`));
  } else {
    const top = point(OUTBOARD_X, box.yTop);
    const bottom = point(OUTBOARD_X, box.yBottom);
    plot.append(svgEl("line", {
      x1: top.x, y1: top.y, x2: bottom.x, y2: bottom.y,
      stroke: LINK_COLOR,
      "stroke-width": 2,
      "stroke-dasharray": "6 4",
      "vector-effect": "non-scaling-stroke",
    }));
    const note = point(OUTBOARD_X + 0.18, (box.yBottom + box.yTop) / 2);
    plot.append(svgEl("text", {
      x: note.x,
      y: note.y,
      fill: LINK_COLOR,
      "font-size": fontSize * 0.85,
      "font-family": "inherit",
      "text-anchor": "middle",
      transform: `rotate(-90 ${note.x} ${note.y})`,
    }, "0° link does not meet the frame"));
  }

  const xLabel = point((box.xMin + box.xMax) / 2, box.yBottom + 0.28);
  const yLabel = point(box.xMin + 0.2, (box.yBottom + box.yTop) / 2);
  plot.append(svgEl("text", {
    x: xLabel.x, y: xLabel.y, fill: "#1f9a32", "font-size": fontSize * 0.85,
    "font-family": "inherit", "text-anchor": "middle",
  }, "Lateral"));
  plot.append(svgEl("text", {
    x: yLabel.x, y: yLabel.y, fill: "#1f9a32", "font-size": fontSize * 0.85,
    "font-family": "inherit", "text-anchor": "middle",
    transform: `rotate(-90 ${yLabel.x} ${yLabel.y})`,
  }, "Longitudinal"));

  plotTitle.textContent = `Top view | theta = ${formatAngle(theta)}° from frame`;
  drawnTheta = theta;
}

function drawArrow(from, to, size, color) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const tip = to;
  const left = {
    x: tip.x - size * Math.cos(angle - Math.PI / 7),
    y: tip.y - size * Math.sin(angle - Math.PI / 7),
  };
  const right = {
    x: tip.x - size * Math.cos(angle + Math.PI / 7),
    y: tip.y - size * Math.sin(angle + Math.PI / 7),
  };
  plot.append(svgEl("polygon", {
    points: `${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`,
    fill: color,
  }));
}

function formatAngle(theta) {
  return String(Number(theta.toFixed(4)));
}

updateButton.addEventListener("click", () => {
  const theta = readTheta();
  const force = readForce();
  if (theta === null || force === null) {
    results.replaceChildren();
    if (theta !== null) {
      drawPlot(theta);
    }
    return;
  }
  drawPlot(theta);
  showResults(theta, force);
});

window.addEventListener("resize", () => drawPlot(drawnTheta));
drawPlot(readTheta() ?? 20);
showResults(null, null);

const sagittaPlot = document.getElementById("sagitta-plot");
const sagittaTitle = document.getElementById("sagitta-plot-title");
const sagittaRadiusInput = document.getElementById("sagitta-radius");
const sagittaChordInput = document.getElementById("sagitta-chord");
const sagittaResults = document.getElementById("sagitta-results");
const sagittaUpdate = document.getElementById("sagitta-update");

let drawnSagitta = { radius: 10, chord: 8 };

function readSagittaInputs() {
  const radius = Number(sagittaRadiusInput.value.trim());
  const chord = Number(sagittaChordInput.value.trim());
  if (!Number.isFinite(radius) || radius <= 0) {
    return null;
  }
  if (!Number.isFinite(chord) || chord <= 0 || chord > radius * 2) {
    return null;
  }
  return { radius, chord };
}

function drawSagitta({ radius, chord }) {
  const half = chord / 2;
  const sagitta = radius - Math.sqrt(radius * radius - half * half);
  const margin = Math.max(chord, sagitta) * 0.12;
  const xMin = -margin;
  const xMax = sagitta + margin;
  const yMin = -margin;
  const yMax = chord + margin;
  const width = xMax - xMin;
  const height = yMax - yMin;
  const point = (x, y) => ({ x: x - xMin, y: yMax - y });
  const pixelsWide = sagittaPlot.clientWidth || 640;
  const unit = width / pixelsWide;
  const fontSize = Math.max(14 * unit, Math.min(width, height) * 0.055);

  sagittaPlot.setAttribute("viewBox", `0 0 ${width} ${height}`);
  sagittaPlot.replaceChildren();

  for (let x = Math.floor(xMin); x <= Math.ceil(xMax); x += 1) {
    const from = point(x, yMin);
    const to = point(x, yMax);
    sagittaPlot.append(svgEl("line", {
      x1: from.x, y1: from.y, x2: to.x, y2: to.y,
      stroke: GRID_COLOR, "stroke-width": 1, "vector-effect": "non-scaling-stroke",
    }));
  }
  for (let y = Math.floor(yMin); y <= Math.ceil(yMax); y += 1) {
    const from = point(xMin, y);
    const to = point(xMax, y);
    sagittaPlot.append(svgEl("line", {
      x1: from.x, y1: from.y, x2: to.x, y2: to.y,
      stroke: GRID_COLOR, "stroke-width": 1, "vector-effect": "non-scaling-stroke",
    }));
  }

  const center = point(radius, half);
  sagittaPlot.append(svgEl("circle", {
    cx: center.x, cy: center.y, r: radius,
    fill: "none", stroke: "#39ff14", "stroke-width": 2,
    "vector-effect": "non-scaling-stroke",
  }));

  const start = point(0, 0);
  const end = point(0, chord);
  sagittaPlot.append(svgEl("line", {
    x1: start.x, y1: start.y, x2: end.x, y2: end.y,
    stroke: "#ff5c5c", "stroke-width": 2, "vector-effect": "non-scaling-stroke",
  }));

  const midY = half;
  const right = point(sagitta, midY);
  const left = point(0, midY);
  sagittaPlot.append(svgEl("line", {
    x1: left.x, y1: left.y, x2: right.x, y2: right.y,
    stroke: "#c084fc", "stroke-width": 2, "vector-effect": "non-scaling-stroke",
  }));
  drawArrow(left, right, 7 * unit, "#c084fc");

  sagittaPlot.append(svgEl("text", {
    x: right.x + fontSize * 0.2, y: right.y + fontSize * 0.3,
    fill: "#c084fc", "font-size": fontSize * 1.45, "font-family": "inherit",
  }, "sagitta"));

  sagittaPlot.append(svgEl("text", {
    x: center.x + fontSize * 1.6, y: center.y,
    fill: "#39ff14", "font-size": fontSize * 0.9, "font-family": "inherit", "text-anchor": "middle",
  }, `R = ${formatLoad(radius)}`));

  sagittaTitle.textContent = `Sagitta | radius = ${formatLoad(radius)}`;
  drawnSagitta = { radius, chord };
}

function updateSagitta() {
  const inputs = readSagittaInputs();
  if (!inputs) {
    sagittaResults.replaceChildren();
    sagittaResults.append(document.createElement("p"));
    sagittaResults.lastChild.textContent = "Sagitta (arc height)";
    sagittaResults.append(document.createElement("strong"));
    sagittaResults.lastChild.textContent = "0.00";
    return;
  }
  const { radius, chord } = inputs;
  const sagitta = radius - Math.sqrt(radius * radius - (chord / 2) * (chord / 2));
  drawSagitta(inputs);

  sagittaResults.replaceChildren();
  ["Sagitta (arc height)"].forEach((label) => {
    sagittaResults.append(document.createElement("p"));
    sagittaResults.lastChild.textContent = label;
    sagittaResults.append(document.createElement("strong"));
    sagittaResults.lastChild.textContent = formatLoad(sagitta);
  });
}

sagittaUpdate.addEventListener("click", updateSagitta);

drawSagitta(drawnSagitta);
sagittaResults.replaceChildren();
sagittaResults.append(document.createElement("p"));
sagittaResults.lastChild.textContent = "Sagitta (arc height)";
sagittaResults.append(document.createElement("strong"));
sagittaResults.lastChild.textContent = "0.00";

const springInputsContainer = document.getElementById("spring-inputs");
const springAngleInput = document.getElementById("spring-angle");
const springUpdateButton = document.getElementById("spring-update");
const springResults = document.getElementById("spring-results");
const springPlot = document.getElementById("spring-plot");
const springPlotTitle = document.getElementById("spring-plot-title");

function getSpringRates() {
  return Array.from(springInputsContainer.querySelectorAll(".spring-rate"))
    .map((input) => Number(input.value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function readAngle() {
  const value = Number(springAngleInput.value.trim());
  return Number.isFinite(value) ? value : 0;
}

function computeSeriesRate(rates) {
  if (!rates.length) return null;
  let sum = 0;
  for (const k of rates) {
    sum += 1 / k;
  }
  return 1 / sum;
}

function updateSpringRate() {
  const rates = getSpringRates();
  const seriesRate = computeSeriesRate(rates);
  const angle = readAngle();
  springResults.replaceChildren();

  if (seriesRate === null) {
    showSpringResultsZero();
    return;
  }

  const radians = (angle * Math.PI) / 180;
  const cosTheta = Math.cos(radians);
  const cosSquared = cosTheta * cosTheta;

  // Axial force for a 1000 lb vertical load (static analysis)
  const axialForce = 1000 / cosTheta;

  // Effective vertical rate the vehicle feels
  const effectiveVerticalRate = seriesRate * cosSquared;

  [
    ["Combined spring rate (series)", seriesRate],
    ["Axial force @ 1000 lb vertical load", axialForce],
    ["Effective vertical rate (vehicle)", effectiveVerticalRate],
  ].forEach(([label, value]) => {
    springResults.append(document.createElement("p"));
    springResults.lastChild.textContent = label;
    springResults.append(document.createElement("strong"));
    springResults.lastChild.textContent = formatLoad(value);
  });
}

function showSpringResultsZero() {
  springResults.replaceChildren();
  [
    ["Combined spring rate (series)", "0"],
    ["Axial force @ 1000 lb vertical load", "0"],
    ["Effective vertical rate (vehicle)", "0"],
  ].forEach(([label, value]) => {
    springResults.append(document.createElement("p"));
    springResults.lastChild.textContent = label;
    springResults.append(document.createElement("strong"));
    springResults.lastChild.textContent = value;
  });
}

function rotatePoint(pt, cx, cy, radians) {
    const dx = pt.x - cx;
    const dy = pt.y - cy;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos
    };
  }

  function createSpringPoints(cx, topY, bottomY, width, numCoils) {
    const halfW = width / 2;
    const left = cx - halfW;
    const right = cx + halfW;
    const height = bottomY - topY;
    const coilH = height / (numCoils * 2);
    const pts = [];
    pts.push({ x: left + 0.3, y: topY });
    pts.push({ x: right - 0.3, y: topY });
    let y = topY;
    for (let i = 0; i < numCoils; i++) {
      y += coilH;
      pts.push({ x: left, y: y });
      y += coilH;
      pts.push({ x: right, y: y });
    }
    pts.push({ x: right - 0.3, y: bottomY });
    pts.push({ x: left + 0.3, y: bottomY });
    return pts;
  }

  function drawSpringPlot(angle) {
    const width = 4;
    const height = 6;
    const centerX = 2;
    const centerY = 3;
    const radians = (angle * Math.PI) / 180;

    springPlot.setAttribute("viewBox", `0 0 ${width} ${height}`);
    springPlot.replaceChildren();

    // Spring 1 (top) - taller, nearly touching spring 2
    const spring1Raw = createSpringPoints(2, 0.85, 2.95, 2.8, 3);
    const spring1 = spring1Raw.map((p) => rotatePoint(p, centerX, centerY, radians));
    springPlot.append(svgEl("polyline", {
      points: spring1.map((p) => `${p.x},${p.y}`).join(" "),
      fill: "none",
      stroke: "#00ffcc",
      "stroke-width": 0.08,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    }));

    // Spring 2 (bottom) - taller, nearly touching spring 1
    const spring2Raw = createSpringPoints(2, 3.05, 5.15, 2.8, 3);
    const spring2 = spring2Raw.map((p) => rotatePoint(p, centerX, centerY, radians));
    springPlot.append(svgEl("polyline", {
      points: spring2.map((p) => `${p.x},${p.y}`).join(" "),
      fill: "none",
      stroke: "#39ff14",
      "stroke-width": 0.08,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    }));

    // Vector through center
    const vectorLength = 4.8;
    const dx = Math.sin(radians) * (vectorLength / 2);
    const dy = Math.cos(radians) * (vectorLength / 2);
    const vStart = rotatePoint({ x: centerX, y: centerY - vectorLength / 2 }, centerX, centerY, radians);
    const vEnd = rotatePoint({ x: centerX, y: centerY + vectorLength / 2 }, centerX, centerY, radians);

    springPlot.append(svgEl("line", {
      x1: vStart.x, y1: vStart.y, x2: vEnd.x, y2: vEnd.y,
      stroke: "#00ffff", "stroke-width": 0.12,
    }));

    const arrowSize = 0.25;
    const angleRad = Math.atan2(vEnd.y - vStart.y, vEnd.x - vStart.x);
    const arrowX1 = vEnd.x - arrowSize * Math.cos(angleRad - 0.4);
    const arrowY1 = vEnd.y - arrowSize * Math.sin(angleRad - 0.4);
    const arrowX2 = vEnd.x - arrowSize * Math.cos(angleRad + 0.4);
    const arrowY2 = vEnd.y - arrowSize * Math.sin(angleRad + 0.4);

    springPlot.append(svgEl("polygon", {
      points: `${vEnd.x},${vEnd.y} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`,
      fill: "#00ffff",
    }));

    springPlotTitle.textContent = `Angle = ${formatAngle(angle)}°`;
  }

springUpdateButton.addEventListener("click", () => {
    updateSpringRate();
    const angle = readAngle();
    drawSpringPlot(angle);
  });

showSpringResultsZero();
drawSpringPlot(0);

const cogTrackInput = document.getElementById("cog-track");
const cogWheelbaseInput = document.getElementById("cog-wheelbase");
const cogLrInput = document.getElementById("cog-lr");
const cogRrInput = document.getElementById("cog-rr");
const cogLfInput = document.getElementById("cog-lf");
const cogRfInput = document.getElementById("cog-rf");
const cogUpdateButton = document.getElementById("cog-update");
const cogResults = document.getElementById("cog-results");
const cogPlot = document.getElementById("cog-plot");
const cogPlotTitle = document.getElementById("cog-plot-title");

function readPositive(input) {
  const value = Number(input.value.trim());
  return Number.isFinite(value) && value > 0 ? value : null;
}

function readNonNegative(input) {
  const value = Number(input.value.trim());
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function readCogInputs() {
  const track = readPositive(cogTrackInput);
  const wheelbase = readPositive(cogWheelbaseInput);
  const lr = readNonNegative(cogLrInput);
  const rr = readNonNegative(cogRrInput);
  const lf = readNonNegative(cogLfInput);
  const rf = readNonNegative(cogRfInput);
  if (track === null || wheelbase === null || lr === null || rr === null || lf === null || rf === null) {
    return null;
  }
  const total = lr + rr + lf + rf;
  if (total <= 0) {
    return null;
  }
  return { track, wheelbase, lr, rr, lf, rf, total };
}

function computeCog({ track, wheelbase, lr, rr, lf, rf, total }) {
  const x = (track * rr + track * rf) / total;
  const y = (wheelbase * lf + wheelbase * rf) / total;
  return { x, y };
}

function showCogResults(cog) {
  cogResults.replaceChildren();
  [
    ["COG X (from left rear)", cog ? formatLoad(cog.x) : "0"],
    ["COG Y (from left rear)", cog ? formatLoad(cog.y) : "0"],
  ].forEach(([label, value]) => {
    cogResults.append(document.createElement("p"));
    cogResults.lastChild.textContent = label;
    cogResults.append(document.createElement("strong"));
    cogResults.lastChild.textContent = value;
  });
}

function drawCog(inputs, cog) {
  const track = inputs ? inputs.track : 60;
  const wheelbase = inputs ? inputs.wheelbase : 100;
  const x = cog ? cog.x : track / 2;
  const y = cog ? cog.y : wheelbase / 2;
  const margin = Math.max(track, wheelbase) * 0.12;
  const xMin = -margin;
  const xMax = track + margin;
  const yMin = -margin;
  const yMax = wheelbase + margin;
  const width = xMax - xMin;
  const height = yMax - yMin;
  const point = (px, py) => ({ x: px - xMin, y: yMax - py });
  const pixelsWide = cogPlot.clientWidth || 640;
  const unit = width / pixelsWide;
  const fontSize = Math.max(14 * unit, Math.min(width, height) * 0.045);
  const tireR = Math.min(track, wheelbase) * 0.035;

  cogPlot.setAttribute("viewBox", `0 0 ${width} ${height}`);
  cogPlot.replaceChildren();

  for (let gx = Math.floor(xMin); gx <= Math.ceil(xMax); gx += Math.max(1, Math.round(track / 6))) {
    const from = point(gx, yMin);
    const to = point(gx, yMax);
    cogPlot.append(svgEl("line", {
      x1: from.x, y1: from.y, x2: to.x, y2: to.y,
      stroke: GRID_COLOR, "stroke-width": 1, "vector-effect": "non-scaling-stroke",
    }));
  }
  for (let gy = Math.floor(yMin); gy <= Math.ceil(yMax); gy += Math.max(1, Math.round(wheelbase / 6))) {
    const from = point(xMin, gy);
    const to = point(xMax, gy);
    cogPlot.append(svgEl("line", {
      x1: from.x, y1: from.y, x2: to.x, y2: to.y,
      stroke: GRID_COLOR, "stroke-width": 1, "vector-effect": "non-scaling-stroke",
    }));
  }

  const outline = [
    point(0, 0), point(track, 0), point(track, wheelbase), point(0, wheelbase),
  ];
  cogPlot.append(svgEl("polygon", {
    points: outline.map((p) => `${p.x},${p.y}`).join(" "),
    fill: "none",
    stroke: "#14661f",
    "stroke-width": 1.4,
    "vector-effect": "non-scaling-stroke",
  }));

  const midX = point(track / 2, 0);
  const midXTop = point(track / 2, wheelbase);
  const midY = point(0, wheelbase / 2);
  const midYRight = point(track, wheelbase / 2);
  cogPlot.append(svgEl("line", {
    x1: midX.x, y1: midX.y, x2: midXTop.x, y2: midXTop.y,
    stroke: "#00ffff", "stroke-width": 1.2, "stroke-dasharray": "5 4",
    opacity: "0.45", "vector-effect": "non-scaling-stroke",
  }));
  cogPlot.append(svgEl("line", {
    x1: midY.x, y1: midY.y, x2: midYRight.x, y2: midYRight.y,
    stroke: "#00ffff", "stroke-width": 1.2, "stroke-dasharray": "5 4",
    opacity: "0.45", "vector-effect": "non-scaling-stroke",
  }));

  [
    [0, 0, "LR"],
    [track, 0, "RR"],
    [0, wheelbase, "LF"],
    [track, wheelbase, "RF"],
  ].forEach(([tx, ty, label]) => {
    const p = point(tx, ty);
    cogPlot.append(svgEl("circle", {
      cx: p.x, cy: p.y, r: tireR, fill: "#ff5c5c",
    }));
    cogPlot.append(svgEl("text", {
      x: p.x + tireR * 1.4,
      y: p.y - tireR * 0.6,
      fill: "#ff5c5c",
      "font-size": fontSize * 0.75,
      "font-family": "inherit",
    }, label));
  });

  const cogPoint = point(x, y);
  const arm = tireR * 2.2;
  cogPlot.append(svgEl("line", {
    x1: cogPoint.x - arm, y1: cogPoint.y, x2: cogPoint.x + arm, y2: cogPoint.y,
    stroke: "#39ff14", "stroke-width": 2, "vector-effect": "non-scaling-stroke",
  }));
  cogPlot.append(svgEl("line", {
    x1: cogPoint.x, y1: cogPoint.y - arm, x2: cogPoint.x, y2: cogPoint.y + arm,
    stroke: "#39ff14", "stroke-width": 2, "vector-effect": "non-scaling-stroke",
  }));
  cogPlot.append(svgEl("circle", {
    cx: cogPoint.x, cy: cogPoint.y, r: tireR * 0.55, fill: "#39ff14",
  }));
  cogPlot.append(svgEl("text", {
    x: cogPoint.x + arm * 1.15,
    y: cogPoint.y - arm * 0.35,
    fill: "#39ff14",
    "font-size": fontSize,
    "font-family": "inherit",
  }, "COG"));

  cogPlotTitle.textContent = cog
    ? `Top view | COG ${formatLoad(x)}, ${formatLoad(y)}`
    : "Top view | COG";
}

function updateCog() {
  const inputs = readCogInputs();
  if (!inputs) {
    showCogResults(null);
    drawCog(null, null);
    return;
  }
  const cog = computeCog(inputs);
  showCogResults(cog);
  drawCog(inputs, cog);
}

cogUpdateButton.addEventListener("click", updateCog);
showCogResults(null);
drawCog(null, null);
