import { createCircleRenderer } from "./renderer.js";

const SCALE = 4;
const MARGIN = 2 * SCALE;
const FONT = `${48 * SCALE}px sans-serif`;
const TEXTS = ["Hello world", "foo", "bar", "funny thing"];

function randomPastel() {
  const h = Math.random() * 360;
  return `hsl(${h}, 80%, 75%)`;
}

function renderTextBitmap(text, color) {
  const tmp = new OffscreenCanvas(1, 1).getContext("2d");
  tmp.font = FONT;
  const metrics = tmp.measureText(text);

  const w = Math.ceil(metrics.width) + MARGIN * 2;
  const h =
    Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) +
    MARGIN * 2;

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.font = FONT;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, MARGIN, MARGIN + metrics.actualBoundingBoxAscent);
  return canvas;
}

function randomSlice() {
  const innerRadius = 80 + Math.random() * 200;
  const thickness = 30 + Math.random() * 60;
  const midAngle = Math.random() * Math.PI * 2 - Math.PI;
  const span = 0.3 + Math.random() * 1.2;
  return {
    innerRadius,
    outerRadius: innerRadius + thickness,
    startAngle: midAngle - span / 2,
    endAngle: midAngle + span / 2,
  };
}

// Pre-render all text bitmaps and assign random slice params.
const slices = TEXTS.map((text) => ({
  bitmap: renderTextBitmap(text, randomPastel()),
  params: randomSlice(),
}));

// Set up the visible canvas and WebGL renderer.
const display = document.getElementById("display");
display.width = 800;
display.height = 800;

const renderer = createCircleRenderer(display);

const sliderIds = ["innerRadius", "outerRadius", "startAngle", "endAngle"];
const sliderEls = Object.fromEntries(sliderIds.map((id) => [id, document.getElementById(id)]));
const labelEls = Object.fromEntries(sliderIds.map((id) => [id, document.getElementById(id + "Val")]));

function draw() {
  const dInner = Number(sliderEls.innerRadius.value);
  const dOuter = Number(sliderEls.outerRadius.value);
  const dStart = Number(sliderEls.startAngle.value);
  const dEnd = Number(sliderEls.endAngle.value);

  labelEls.innerRadius.textContent = dInner;
  labelEls.outerRadius.textContent = dOuter;
  labelEls.startAngle.textContent = dStart.toFixed(2);
  labelEls.endAngle.textContent = dEnd.toFixed(2);

  const debug = document.getElementById("wireframe").checked;
  for (const { bitmap, params } of slices) {
    renderer.drawSlice(bitmap, {
      innerRadius: params.innerRadius + dInner,
      outerRadius: params.outerRadius + dOuter,
      startAngle: params.startAngle + dStart,
      endAngle: params.endAngle + dEnd,
      alpha: 0.8,
    });
  }
  renderer.flush({ debug });
}

for (const el of Object.values(sliderEls)) {
  el.addEventListener("input", draw);
}
document.getElementById("wireframe").addEventListener("change", draw);

draw();
