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
