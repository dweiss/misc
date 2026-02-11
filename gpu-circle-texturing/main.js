import { createCircleRenderer } from "./renderer.js";

const MARGIN = 2;
const FONT = "48px sans-serif";
const TEXT = "Hello world";

// Measure text metrics using a temporary context.
const tmp = new OffscreenCanvas(1, 1).getContext("2d");
tmp.font = FONT;
const metrics = tmp.measureText(TEXT);

const textWidth = Math.ceil(metrics.width);
const textHeight = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);

const WIDTH = textWidth + MARGIN * 2;
const HEIGHT = textHeight + MARGIN * 2;

// Create an offscreen backbuffer and render text into it.
const backbuffer = new OffscreenCanvas(WIDTH, HEIGHT);
const ctx = backbuffer.getContext("2d");

ctx.fillStyle = "#fff";
ctx.font = FONT;
ctx.textBaseline = "alphabetic";
ctx.fillText(TEXT, MARGIN, MARGIN + metrics.actualBoundingBoxAscent);

// Set up the visible canvas and WebGL renderer.
const display = document.getElementById("display");
display.width = 800;
display.height = 800;

const renderer = createCircleRenderer(display);

// Slider elements
const sliders = {
  innerRadius: document.getElementById("innerRadius"),
  outerRadius: document.getElementById("outerRadius"),
  startAngle: document.getElementById("startAngle"),
  endAngle: document.getElementById("endAngle"),
};

const labels = {
  innerRadius: document.getElementById("innerRadiusVal"),
  outerRadius: document.getElementById("outerRadiusVal"),
  startAngle: document.getElementById("startAngleVal"),
  endAngle: document.getElementById("endAngleVal"),
};

function draw() {
  const innerRadius = Number(sliders.innerRadius.value);
  const outerRadius = Number(sliders.outerRadius.value);
  const startAngle = Number(sliders.startAngle.value);
  const endAngle = Number(sliders.endAngle.value);

  labels.innerRadius.textContent = innerRadius;
  labels.outerRadius.textContent = outerRadius;
  labels.startAngle.textContent = startAngle.toFixed(2);
  labels.endAngle.textContent = endAngle.toFixed(2);

  const debug = document.getElementById("wireframe").checked;
  renderer.drawSlice(backbuffer, { innerRadius, outerRadius, startAngle, endAngle });
  renderer.flush({ debug });
}

for (const slider of Object.values(sliders)) {
  slider.addEventListener("input", draw);
}
document.getElementById("wireframe").addEventListener("change", draw);

draw();
