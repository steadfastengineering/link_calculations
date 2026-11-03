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
  if (theta === null || force === null) {
    results.replaceChildren();
    return;
  }

  const sine = Math.sin((theta * Math.PI) / 180);
  if (sine === 0) {
    results.textContent = "Single link load is undefined at 0° because sin(theta) is 0.";
    return;
  }

  const isolated = force / sine;
  const shared = isolated / 4;
  const isolatedText = formatLoad(isolated);
  results.replaceChildren();
  [
    ["Single link load isolated (hypothetical)", isolatedText],
    [
      "Single link load in equal angle/length 4-link (realistic)",
      `${isolatedText} / 4 = ${formatLoad(shared)}`,
    ],
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
    return;
  }

  const angledRate = seriesRate * Math.cos((angle * Math.PI) / 180);

  [
    ["Combined spring rate", seriesRate],
    ["Effective spring rate (angled)", angledRate],
  ].forEach(([label, value]) => {
    springResults.append(document.createElement("p"));
    springResults.lastChild.textContent = label;
    springResults.append(document.createElement("strong"));
    springResults.lastChild.textContent = formatLoad(value);
  });
}

function drawSpringPlot(angle) {
  const width = 4;
  const height = 6;
  const cx = width / 2;
  const spring1Top = 0.8;
  const spring1Bottom = 2.4;
  const spring2Top = 3.6;
  const spring2Bottom = 5.2;
  const vectorLength = 4.8;

  springPlot.setAttribute("viewBox", `0 0 ${width} ${height}`);
  springPlot.replaceChildren();

  springPlot.append(svgEl("rect", {
    x: 0.6, y: spring1Top, width: 2.8, height: 1.6,
    fill: "none", stroke: "#ff5c5c", "stroke-width": 0.12,
  }));

  springPlot.append(svgEl("rect", {
    x: 0.6, y: spring2Top, width: 2.8, height: 1.6,
    fill: "none", stroke: "#39ff14", "stroke-width": 0.12,
  }));

  const radians = (angle * Math.PI) / 180;
  const dx = Math.sin(radians) * (vectorLength / 2);
  const dy = Math.cos(radians) * (vectorLength / 2);

  const vStart = { x: cx - dx, y: 3 - dy };
  const vEnd = { x: cx + dx, y: 3 + dy };

  springPlot.append(svgEl("line", {
    x1: vStart.x, y1: vStart.y, x2: vEnd.x, y2: vEnd.y,
    stroke: "#c084fc", "stroke-width": 0.18,
  }));

  const arrowSize = 0.25;
  const angleRad = Math.atan2(vEnd.y - vStart.y, vEnd.x - vStart.x);
  const arrowX1 = vEnd.x - arrowSize * Math.cos(angleRad - 0.4);
  const arrowY1 = vEnd.y - arrowSize * Math.sin(angleRad - 0.4);
  const arrowX2 = vEnd.x - arrowSize * Math.cos(angleRad + 0.4);
  const arrowY2 = vEnd.y - arrowSize * Math.sin(angleRad + 0.4);

  springPlot.append(svgEl("polygon", {
    points: `${vEnd.x},${vEnd.y} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`,
    fill: "#c084fc",
  }));

  springPlotTitle.textContent = `Angle = ${formatAngle(angle)}°`;
}

springUpdateButton.addEventListener("click", () => {
  updateSpringRate();
  const angle = readAngle();
  drawSpringPlot(angle);
});

drawSpringPlot(0);
