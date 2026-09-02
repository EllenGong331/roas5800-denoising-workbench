'use strict';

const ALGORITHMS = {
  mean: {
    name: "Mean",
    params: {
      radius: { label: "Radius", min: 1, max: 5, step: 1, value: 2 }
    }
  },
  gaussian: {
    name: "Gaussian",
    params: {
      sigma: { label: "Sigma", min: 0.5, max: 10, step: 0.1, value: 1.8 },
      radius: { label: "Radius", min: 1, max: 5, step: 1, value: 3 }
    }
  },
  median: {
    name: "Median",
    params: {
      radius: { label: "Radius", min: 1, max: 4, step: 1, value: 2 }
    }
  },
  bilateral: {
    name: "Bilateral",
    params: {
      sigmaSpatial: { label: "Spatial sigma", min: 0.5, max: 12, step: 0.5, value: 3 },
      sigmaRange: { label: "Range sigma", min: 1, max: 80, step: 1, value: 18 },
      radius: { label: "Radius", min: 1, max: 4, step: 1, value: 2 }
    }
  },
  nlm: {
    name: "NLM",
    params: {
      patchRadius: { label: "Patch radius", min: 1, max: 2, step: 1, value: 1 },
      searchRadius: { label: "Search radius", min: 1, max: 5, step: 1, value: 3 },
      h: { label: "h", min: 5, max: 80, step: 1, value: 28 }
    }
  }
};

const WORK_SIZE = 512;

const dom = {};

const state = {
  sourceName: "Demo room",
  clean: null,
  noisy: null,
  result: null,
  width: 0,
  height: 0,
  noiseMode: "gaussian",
  algorithm: "gaussian",
  params: cloneParams("gaussian"),
  noiseSigma: 16,
  noiseDensity: 6,
  busy: false,
  runToken: 0,
  runtimeMs: 0
};

function cloneParams(algorithm) {
  const out = {};
  const defs = ALGORITHMS[algorithm].params;
  Object.keys(defs).forEach((key) => {
    out[key] = defs[key].value;
  });
  return out;
}

function $(id) {
  return document.getElementById(id);
}

function cacheDom() {
  [
    "statusChip", "statusText", "restoreButton", "thumbRoom", "thumbCity",
    "exportButton",
    "uploadZone", "fileInput", "noiseMode", "noiseSigma", "noiseSigmaValue",
    "noiseDensity", "noiseDensityValue", "noiseButton", "algoList", "paramPanel",
    "resetButton", "runButton", "activeLabel", "viewSwitch", "zoomRange", "zoomValue",
    "viewerStage", "sourceMeta", "sourceCanvas", "sourcePsnr", "noisyMeta",
    "noisyCanvas", "noisyPsnr", "resultMeta", "resultCanvas", "resultPsnr",
    "metricsView", "metricInputPsnr", "metricOutputPsnr", "metricImprovement",
    "metricRuntime", "metricSigma", "metricRmse", "histogramCanvas", "imageInfo", "stateInfo"
  ].forEach((id) => {
    dom[id] = $(id);
  });
  dom.demoButtons = Array.from(document.querySelectorAll("[data-source]"));
  dom.noiseButtons = Array.from(document.querySelectorAll("[data-noise]"));
  dom.algoInputs = Array.from(document.querySelectorAll("input[name='algorithm']"));
  dom.viewButtons = Array.from(document.querySelectorAll("[data-view]"));
  dom.canvasBoxes = Array.from(document.querySelectorAll(".canvas-box"));
  dom.previewCanvases = Array.from(document.querySelectorAll(".canvas-box canvas"));
  dom.sourcePanel = $("#sourcePanel");
  dom.noisyPanel = $("#noisyPanel");
  dom.resultPanel = $("#resultPanel");
  dom.stageWrap = document.querySelector(".stage-wrap");
}

function nextFrame() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

function clampByte(value) {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return Math.round(value);
}

function formatStep(step) {
  return Number.isInteger(step) ? 0 : 1;
}

function numberText(value, step) {
  const decimals = formatStep(step);
  return Number(value).toFixed(decimals);
}

function init() {
  cacheDom();
  renderParams();
  bindEvents();
  drawDemoThumbs();
  initDemo("room");
}

function drawDemoThumbs() {
  drawRoomScene(dom.thumbRoom.getContext("2d"), dom.thumbRoom.width, dom.thumbRoom.height);
  drawCityScene(dom.thumbCity.getContext("2d"), dom.thumbCity.width, dom.thumbCity.height);
}

async function initDemo(kind) {
  const canvas = document.createElement("canvas");
  canvas.width = WORK_SIZE;
  canvas.height = WORK_SIZE;
  if (kind === "city") {
    drawCityScene(canvas.getContext("2d"), WORK_SIZE, WORK_SIZE);
  } else {
    drawRoomScene(canvas.getContext("2d"), WORK_SIZE, WORK_SIZE);
  }
  await useSourceCanvas(canvas, kind === "city" ? "Demo city" : "Demo room");
}

function drawRoomScene(ctx, w, h) {
  const s = Math.min(w, h);
  ctx.clearRect(0, 0, w, h);

  const wall = ctx.createLinearGradient(0, 0, 0, s * 0.78);
  wall.addColorStop(0, "#f5f8f3");
  wall.addColorStop(1, "#aac9bf");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, w, s * 0.78);

  ctx.fillStyle = "#d5e1d9";
  ctx.fillRect(0, Math.round(s * 0.76), w, Math.max(1, s * 0.02));

  const floor = ctx.createLinearGradient(0, Math.round(s * 0.78), 0, s);
  floor.addColorStop(0, "#b98f6d");
  floor.addColorStop(1, "#77553f");
  ctx.fillStyle = floor;
  ctx.fillRect(0, Math.round(s * 0.78), w, h - Math.round(s * 0.78));

  ctx.strokeStyle = "rgba(60, 34, 22, 0.42)";
  ctx.lineWidth = Math.max(1, s * 0.004);
  for (let y = Math.round(s * 0.82); y < s; y += Math.round(s * 0.085)) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(Math.round(s * 0.07), Math.round(s * 0.12), Math.round(s * 0.34), Math.round(s * 0.36));
  ctx.clip();
  const sky = ctx.createLinearGradient(0, Math.round(s * 0.12), 0, Math.round(s * 0.48));
  sky.addColorStop(0, "#a9cfe4");
  sky.addColorStop(1, "#d8eadf");
  ctx.fillStyle = sky;
  ctx.fillRect(Math.round(s * 0.07), Math.round(s * 0.12), Math.round(s * 0.34), Math.round(s * 0.36));

  ctx.fillStyle = "#f7efe1";
  ctx.fillRect(Math.round(s * 0.1), Math.round(s * 0.16), Math.round(s * 0.1), Math.round(s * 0.28));
  ctx.fillRect(Math.round(s * 0.29), Math.round(s * 0.16), Math.round(s * 0.09), Math.round(s * 0.28));
  ctx.fillRect(Math.round(s * 0.12), Math.round(s * 0.19), Math.round(s * 0.24), Math.round(s * 0.07));
  ctx.fillRect(Math.round(s * 0.12), Math.round(s * 0.36), Math.round(s * 0.24), Math.round(s * 0.07));
  ctx.restore();

  ctx.strokeStyle = "#49605a";
  ctx.lineWidth = Math.max(2, s * 0.008);
  ctx.strokeRect(Math.round(s * 0.07), Math.round(s * 0.12), Math.round(s * 0.34), Math.round(s * 0.36));

  const shadow = ctx.createLinearGradient(Math.round(s * 0.08), 0, Math.round(s * 0.62), 0);
  shadow.addColorStop(0, "rgba(35, 45, 42, 0.18)");
  shadow.addColorStop(1, "rgba(35, 45, 42, 0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.moveTo(Math.round(s * 0.12), Math.round(s * 0.48));
  ctx.lineTo(Math.round(s * 0.67), Math.round(s * 0.78));
  ctx.lineTo(Math.round(s * 0.9), Math.round(s * 0.78));
  ctx.lineTo(Math.round(s * 0.4), Math.round(s * 0.48));
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#8a6044";
  ctx.beginPath();
  ctx.moveTo(Math.round(s * 0.58), Math.round(s * 0.48));
  ctx.lineTo(Math.round(s * 0.62), Math.round(s * 0.48));
  ctx.lineTo(Math.round(s * 0.88), Math.round(s * 0.78));
  ctx.lineTo(Math.round(s * 0.8), Math.round(s * 0.78));
  ctx.closePath();
  ctx.fill();

  const top = ctx.createLinearGradient(0, Math.round(s * 0.47), 0, Math.round(s * 0.54));
  top.addColorStop(0, "#6e4e3a");
  top.addColorStop(1, "#a56f4d");
  ctx.fillStyle = top;
  ctx.fillRect(Math.round(s * 0.54), Math.round(s * 0.44), Math.round(s * 0.11), Math.round(s * 0.07));

  ctx.fillStyle = "#f4f2e8";
  ctx.beginPath();
  ctx.arc(Math.round(s * 0.9), Math.round(s * 0.36), Math.max(5, s * 0.065), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e3b34c";
  ctx.beginPath();
  ctx.arc(Math.round(s * 0.9), Math.round(s * 0.36), Math.max(3, s * 0.035), 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#3a4b45";
  ctx.lineWidth = Math.max(2, s * 0.012);
  ctx.beginPath();
  ctx.moveTo(Math.round(s * 0.9), Math.round(s * 0.42));
  ctx.lineTo(Math.round(s * 0.9), Math.round(s * 0.78));
  ctx.moveTo(Math.round(s * 0.88), Math.round(s * 0.47));
  ctx.lineTo(Math.round(s * 0.72), Math.round(s * 0.62));
  ctx.moveTo(Math.round(s * 0.92), Math.round(s * 0.47));
  ctx.lineTo(Math.round(s * 0.98), Math.round(s * 0.61));
  ctx.stroke();

  ctx.fillStyle = "#d9b76d";
  ctx.fillRect(Math.round(s * 0.18), Math.round(s * 0.78), Math.round(s * 0.2), Math.round(s * 0.08));
  ctx.fillRect(Math.round(s * 0.65), Math.round(s * 0.78), Math.round(s * 0.2), Math.round(s * 0.08));

  const rug = ctx.createLinearGradient(0, Math.round(s * 0.68), 0, Math.round(s * 0.93));
  rug.addColorStop(0, "#376f67");
  rug.addColorStop(1, "#1f4540");
  ctx.fillStyle = rug;
  ctx.beginPath();
  ctx.ellipse(w * 0.44, s * 0.79, w * 0.28, s * 0.06, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(22, 41, 37, 0.3)";
  ctx.lineWidth = Math.max(1, s * 0.003);
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

function drawCityScene(ctx, w, h) {
  const s = Math.min(w, h);
  ctx.clearRect(0, 0, w, h);
  const sky = ctx.createLinearGradient(0, 0, 0, s * 0.72);
  sky.addColorStop(0, "#74a7c8");
  sky.addColorStop(1, "#cfe2df");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#f1d6b1";
  ctx.beginPath();
  ctx.arc(w * 0.78, s * 0.13, Math.max(5, s * 0.05), 0, Math.PI * 2);
  ctx.fill();

  const buildingColors = ["#3d5862", "#526a68", "#2d404c", "#6a7070", "#41585f", "#263c4a"];
  const buildings = [
    { x: -0.04, w: 0.2, h: 0.32, c: 0 },
    { x: 0.13, w: 0.19, h: 0.45, c: 1 },
    { x: 0.29, w: 0.24, h: 0.3, c: 2 },
    { x: 0.49, w: 0.2, h: 0.49, c: 3 },
    { x: 0.66, w: 0.24, h: 0.34, c: 4 },
    { x: 0.86, w: 0.19, h: 0.47, c: 5 }
  ];

  buildings.forEach((b) => {
    const bx = Math.round(w * b.x);
    const bw = Math.round(w * b.w);
    const by = Math.round(s * (0.72 - b.h));
    const bh = Math.round(s * b.h);
    ctx.fillStyle = buildingColors[b.c];
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "#dce9df";
    ctx.fillRect(bx, Math.max(0, by - s * 0.014), bw, Math.max(1, s * 0.014));

    const winColor = "#e4d6a5";
    for (let wx = bx + Math.max(2, s * 0.015); wx < bx + bw - Math.max(2, s * 0.015); wx += Math.max(4, s * 0.045)) {
      for (let wy = by + Math.max(2, s * 0.02); wy < by + bh - Math.max(2, s * 0.02); wy += Math.max(5, s * 0.06)) {
        if ((wx + wy) % 5 < 3) {
          ctx.fillStyle = winColor;
        } else {
          ctx.fillStyle = "#9cae9f";
        }
        ctx.fillRect(wx, wy, Math.max(2, s * 0.02), Math.max(3, s * 0.035));
      }
    }
  });

  const roadY = Math.round(s * 0.72);
  const road = ctx.createLinearGradient(0, roadY, 0, s);
  road.addColorStop(0, "#48514e");
  road.addColorStop(1, "#202725");
  ctx.fillStyle = road;
  ctx.fillRect(0, roadY, w, h - roadY);

  ctx.strokeStyle = "#d9bd76";
  ctx.lineWidth = Math.max(2, s * 0.006);
  for (let x = 0; x < w; x += Math.max(14, s * 0.12)) {
    ctx.beginPath();
    ctx.moveTo(x, s * 0.84);
    ctx.lineTo(x + Math.max(7, s * 0.06), s * 0.84);
    ctx.stroke();
  }

  const carColors = ["#c94f3d", "#e0b64d", "#3d718f"];
  for (let i = 0; i < 3; i += 1) {
    const cx = w * (0.08 + i * 0.32);
    ctx.fillStyle = carColors[i];
    ctx.fillRect(cx, s * 0.78, s * 0.11, s * 0.05);
    ctx.fillStyle = "#d8e4dd";
    ctx.fillRect(cx + s * 0.02, s * 0.775, s * 0.04, s * 0.018);
  }

  ctx.fillStyle = "#173c32";
  ctx.beginPath();
  ctx.arc(w * 0.15, s * 0.62, Math.max(6, s * 0.08), 0, Math.PI * 2);
  ctx.arc(w * 0.16, s * 0.58, Math.max(4, s * 0.04), 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

function fitCanvasToWork(canvas) {
  const sourceWidth = canvas.width;
  const sourceHeight = canvas.height;
  const maxSide = WORK_SIZE;
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  const work = document.createElement("canvas");
  work.width = Math.max(1, Math.round(sourceWidth * scale));
  work.height = Math.max(1, Math.round(sourceHeight * scale));
  work.getContext("2d").drawImage(canvas, 0, 0, work.width, work.height);
  return work;
}

function imageDataFromCanvas(canvas) {
  return canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
}

function drawDataToCanvas(canvas, data, width, height) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.putImageData(new ImageData(data, width, height), 0, 0);
}

function updateNoiseMeta() {
  const noiseLabel = state.noiseMode === "gaussian" ? `σ = ${state.noiseSigma}` : `${state.noiseDensity}%`;
  dom.noisyMeta.textContent = noiseLabel;
}

function updateMeta() {
  updateNoiseMeta();
  dom.resultMeta.textContent = `${ALGORITHMS[state.algorithm].name} filter`;
  dom.activeLabel.textContent = `${ALGORITHMS[state.algorithm].name} filter`;
  dom.imageInfo.textContent = `${state.sourceName} · ${state.width}×${state.height}`;
}

async function useSourceCanvas(canvas, label) {
  const work = fitCanvasToWork(canvas);
  const ctx = work.getContext("2d");
  const imageData = ctx.getImageData(0, 0, work.width, work.height);
  state.sourceName = label;
  state.width = work.width;
  state.height = work.height;
  state.clean = new Uint8ClampedArray(imageData.data);
  state.noisy = null;
  state.result = null;
  state.runtimeMs = 0;

  drawDataToCanvas(dom.sourceCanvas, state.clean, state.width, state.height);
  dom.sourceMeta.textContent = `${state.width}×${state.height}`;
  updateMeta();
  dom.sourcePsnr.textContent = "∞ dB";

  await applyNoise();
  await runCurrentFilter();
}

function addGaussianNoise(data, width, height, sigma) {
  const noisy = new Uint8ClampedArray(data);
  const length = width * height * 4;
  for (let i = 0; i < length; i += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      let u = 0;
      let v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      noisy[i + channel] = clampByte(data[i + channel] + z * sigma);
    }
  }
  return noisy;
}

function addSaltPepperNoise(data, width, height, percent) {
  const noisy = new Uint8ClampedArray(data);
  const amount = percent / 100;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (Math.random() < amount) {
        const offset = (y * width + x) * 4;
        const value = Math.random() < 0.5 ? 0 : 255;
        noisy[offset] = value;
        noisy[offset + 1] = value;
        noisy[offset + 2] = value;
      }
    }
  }
  return noisy;
}

async function applyNoise() {
  const clean = state.clean;
  if (!clean) return;
  state.noisy = state.noiseMode === "gaussian"
    ? addGaussianNoise(clean, state.width, state.height, state.noiseSigma)
    : addSaltPepperNoise(clean, state.width, state.height, state.noiseDensity);
  state.result = null;
  drawDataToCanvas(dom.noisyCanvas, state.noisy, state.width, state.height);
  dom.noisyPsnr.textContent = `${psnr(clean, state.noisy, state.width, state.height).toFixed(2)} dB`;
  dom.resultPsnr.textContent = "—";
  updateNoiseMeta();
  updateMetrics();
}

function psnr(reference, candidate, width, height) {
  let mse = 0;
  const pixels = width * height;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const diff = reference[offset + channel] - candidate[offset + channel];
        mse += diff * diff;
      }
    }
  }
  mse /= pixels * 3;
  if (mse === 0) return 99.99;
  return 10 * Math.log10(255 * 255 / mse);
}

function rmse(reference, candidate, width, height) {
  let total = 0;
  const samples = width * height * 3;
  for (let i = 0; i < reference.length; i += 1) {
    const diff = reference[i] - candidate[i];
    total += diff * diff;
  }
  return Math.sqrt(total / samples);
}

function updateMetrics() {
  const hasNoisy = state.clean && state.noisy;
  const hasResult = state.clean && state.result;
  if (!hasNoisy) {
    dom.metricInputPsnr.textContent = "—";
    dom.metricSigma.textContent = "—";
  } else {
    const inputPsnr = psnr(state.clean, state.noisy, state.width, state.height);
    dom.metricInputPsnr.textContent = `${inputPsnr.toFixed(2)} dB`;
    dom.metricSigma.textContent = state.noiseMode === "gaussian"
      ? `${state.noiseSigma}`
      : `${state.noiseDensity}%`;
  }
  if (!hasResult) {
    dom.metricOutputPsnr.textContent = "—";
    dom.metricImprovement.textContent = "—";
    dom.metricRuntime.textContent = "—";
    dom.metricRmse.textContent = "—";
    return;
  }
  const inputPsnr = psnr(state.clean, state.noisy, state.width, state.height);
  const outputPsnr = psnr(state.clean, state.result, state.width, state.height);
  dom.metricOutputPsnr.textContent = `${outputPsnr.toFixed(2)} dB`;
  dom.metricImprovement.textContent = `${(outputPsnr - inputPsnr >= 0 ? "+" : "")}${(outputPsnr - inputPsnr).toFixed(2)} dB`;
  dom.metricRuntime.textContent = `${state.runtimeMs.toFixed(0)} ms`;
  dom.metricRmse.textContent = rmse(state.clean, state.result, state.width, state.height).toFixed(2);
}

function setStatus(message, busy) {
  dom.statusText.textContent = message;
  dom.stateInfo.textContent = busy ? message : "Ready";
  dom.statusChip.classList.toggle("busy", busy);
}

function setBusy(busy, message) {
  state.busy = busy;
  dom.runButton.disabled = busy;
  dom.restoreButton.disabled = busy;
  dom.noiseButton.disabled = busy;
  dom.demoButtons.forEach((button) => {
    button.disabled = busy;
  });
  dom.resetButton.disabled = busy;
  dom.runButton.textContent = busy ? "Running" : "Run filter";
  dom.restoreButton.textContent = busy ? "Running" : "Restore";
  setStatus(message || (busy ? "Processing" : "Ready"), busy);
}

async function runCurrentFilter() {
  if (!state.noisy) return;
  if (state.busy) return;
  const token = state.runToken + 1;
  state.runToken = token;
  const algorithm = ALGORITHMS[state.algorithm];
  const started = performance.now();
  setBusy(true, `Running ${algorithm.name}...`);

  try {
    const output = await runAlgorithm(
      state.noisy,
      state.width,
      state.height,
      state.algorithm,
      state.params,
      () => token !== state.runToken,
      (progress) => setStatus(`Running ${algorithm.name} · ${Math.round(progress * 100)}%`, true)
    );

    if (!output || token !== state.runToken) {
      return;
    }

    state.result = output;
    state.runtimeMs = performance.now() - started;
    drawDataToCanvas(dom.resultCanvas, output, state.width, state.height);
    const outputPsnr = psnr(state.clean, output, state.width, state.height);
    dom.resultPsnr.textContent = `${outputPsnr.toFixed(2)} dB`;
    updateMetrics();
    drawHistogram();
  } catch (error) {
    console.error(error);
    setStatus("Processing failed", false);
  } finally {
    if (token === state.runToken) {
      setBusy(false);
    }
  }
}

async function runAlgorithm(data, width, height, algorithm, params, cancelled, onProgress) {
  if (algorithm === "mean") {
    return applyMean(data, width, height, params.radius, cancelled, onProgress);
  }
  if (algorithm === "gaussian") {
    return applyGaussian(data, width, height, params.radius, params.sigma, cancelled, onProgress);
  }
  if (algorithm === "median") {
    return applyMedian(data, width, height, params.radius, cancelled, onProgress);
  }
  if (algorithm === "bilateral") {
    return applyBilateral(data, width, height, params.radius, params.sigmaSpatial, params.sigmaRange, cancelled, onProgress);
  }
  if (algorithm === "nlm") {
    return applyNlm(data, width, height, params.patchRadius, params.searchRadius, params.h, cancelled, onProgress);
  }
  return null;
}

async function applyMean(data, width, height, radius, cancelled, onProgress) {
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y += 1) {
    if ((y & 3) === 0) {
      if (cancelled()) return null;
      await nextFrame();
      onProgress(y / height);
    }
    const yMin = Math.max(0, y - radius);
    const yMax = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x += 1) {
      const xMin = Math.max(0, x - radius);
      const xMax = Math.min(width - 1, x + radius);
      const pixel = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        let sum = 0;
        let count = 0;
        for (let yy = yMin; yy <= yMax; yy += 1) {
          const rowBase = yy * width;
          for (let xx = xMin; xx <= xMax; xx += 1) {
            sum += data[(rowBase + xx) * 4 + channel];
            count += 1;
          }
        }
        out[pixel + channel] = Math.round(sum / count);
      }
      out[pixel + 3] = data[pixel + 3];
    }
  }
  return out;
}

async function applyGaussian(data, width, height, radius, sigma, cancelled, onProgress) {
  const half = radius;
  const size = half * 2 + 1;
  const kernel = new Float64Array(size * size);
  const sigmaSafe = Math.max(0.2, sigma);
  const denom = 2 * sigmaSafe * sigmaSafe;
  let normalizer = 0;
  for (let dy = -half; dy <= half; dy += 1) {
    for (let dx = -half; dx <= half; dx += 1) {
      const weight = Math.exp(-(dx * dx + dy * dy) / denom);
      kernel[(dy + half) * size + dx + half] = weight;
      normalizer += weight;
    }
  }
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y += 1) {
    if ((y & 3) === 0) {
      if (cancelled()) return null;
      await nextFrame();
      onProgress(y / height);
    }
    for (let x = 0; x < width; x += 1) {
      const pixel = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        let sum = 0;
        let localNormalizer = 0;
        for (let ky = -half; ky <= half; ky += 1) {
          const yy = y + ky;
          if (yy < 0 || yy >= height) continue;
          for (let kx = -half; kx <= half; kx += 1) {
            const xx = x + kx;
            if (xx < 0 || xx >= width) continue;
            const weight = kernel[(ky + half) * size + kx + half];
            sum += data[(yy * width + xx) * 4 + channel] * weight;
            localNormalizer += weight;
          }
        }
        out[pixel + channel] = Math.round(sum / localNormalizer);
      }
      out[pixel + 3] = data[pixel + 3];
    }
  }
  return out;
}

async function applyMedian(data, width, height, radius, cancelled, onProgress) {
  const out = new Uint8ClampedArray(data.length);
  const values = [];
  for (let y = 0; y < height; y += 1) {
    if ((y & 3) === 0) {
      if (cancelled()) return null;
      await nextFrame();
      onProgress(y / height);
    }
    for (let x = 0; x < width; x += 1) {
      const pixel = (y * width + x) * 4;
      const yMin = Math.max(0, y - radius);
      const yMax = Math.min(height - 1, y + radius);
      const xMin = Math.max(0, x - radius);
      const xMax = Math.min(width - 1, x + radius);
      for (let channel = 0; channel < 3; channel += 1) {
        values.length = 0;
        for (let yy = yMin; yy <= yMax; yy += 1) {
          const rowBase = yy * width;
          for (let xx = xMin; xx <= xMax; xx += 1) {
            values.push(data[(rowBase + xx) * 4 + channel]);
          }
        }
        values.sort((a, b) => a - b);
        out[pixel + channel] = values[values.length >> 1];
      }
      out[pixel + 3] = data[pixel + 3];
    }
  }
  return out;
}

async function applyBilateral(data, width, height, radius, spatialSigma, rangeSigma, cancelled, onProgress) {
  const out = new Uint8ClampedArray(data.length);
  const lum = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      lum[y * width + x] = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
    }
  }

  const half = radius;
  const size = half * 2 + 1;
  const spatialWeights = new Float32Array(size * size);
  const spatialSigmaSafe = Math.max(0.2, spatialSigma);
  const spatialDenom = 2 * spatialSigmaSafe * spatialSigmaSafe;
  for (let dy = -half; dy <= half; dy += 1) {
    for (let dx = -half; dx <= half; dx += 1) {
      spatialWeights[(dy + half) * size + dx + half] = Math.exp(-(dx * dx + dy * dy) / spatialDenom);
    }
  }

  const rangeDenom = 2 * Math.max(0.1, rangeSigma) * Math.max(0.1, rangeSigma);
  for (let y = 0; y < height; y += 1) {
    if ((y & 3) === 0) {
      if (cancelled()) return null;
      await nextFrame();
      onProgress(y / height);
    }
    for (let x = 0; x < width; x += 1) {
      const pixel = (y * width + x) * 4;
      const centerLum = lum[y * width + x];
      let weightTotal = 0;
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      for (let dy = -half; dy <= half; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -half; dx <= half; dx += 1) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          const neighborOffset = (yy * width + xx) * 4;
          const luminanceDiff = centerLum - lum[yy * width + xx];
          const weight = spatialWeights[(dy + half) * size + dx + half]
            * Math.exp(-(luminanceDiff * luminanceDiff) / rangeDenom);
          weightTotal += weight;
          sumR += data[neighborOffset] * weight;
          sumG += data[neighborOffset + 1] * weight;
          sumB += data[neighborOffset + 2] * weight;
        }
      }
      if (weightTotal > 1e-9) {
        out[pixel] = Math.round(sumR / weightTotal);
        out[pixel + 1] = Math.round(sumG / weightTotal);
        out[pixel + 2] = Math.round(sumB / weightTotal);
      } else {
        out[pixel] = data[pixel];
        out[pixel + 1] = data[pixel + 1];
        out[pixel + 2] = data[pixel + 2];
      }
      out[pixel + 3] = data[pixel + 3];
    }
  }
  return out;
}

async function applyNlm(data, width, height, patchRadius, searchRadius, h, cancelled, onProgress) {
  const out = new Uint8ClampedArray(data.length);
  const lum = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      lum[y * width + x] = Math.round(0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]);
    }
  }

  const weightScale = 1 / (2 * Math.max(1, h) * Math.max(1, h));
  const pHalf = Math.max(1, patchRadius);
  const sHalf = Math.max(1, searchRadius);
  const patchArea = (pHalf * 2 + 1) * (pHalf * 2 + 1);

  for (let y = 0; y < height; y += 1) {
    if ((y & 7) === 0) {
      if (cancelled()) return null;
      await nextFrame();
      onProgress(y / height);
    }
    for (let x = 0; x < width; x += 1) {
      const pixel = (y * width + x) * 4;
      const centerLum = lum[y * width + x];
      let weightTotal = 0;
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;

      const yStart = Math.max(0, y - sHalf);
      const yEnd = Math.min(height - 1, y + sHalf);
      const xStart = Math.max(0, x - sHalf);
      const xEnd = Math.min(width - 1, x + sHalf);

      for (let qy = yStart; qy <= yEnd; qy += 1) {
        for (let qx = xStart; qx <= xEnd; qx += 1) {
          if (qy === y && qx === x) continue;
          let ssd = 0;
          for (let py = -pHalf; py <= pHalf; py += 1) {
            const cy = Math.max(0, Math.min(height - 1, y + py));
            const qCy = Math.max(0, Math.min(height - 1, qy + py));
            for (let px = -pHalf; px <= pHalf; px += 1) {
              const cx = Math.max(0, Math.min(width - 1, x + px));
              const qCx = Math.max(0, Math.min(width - 1, qx + px));
              const diff = lum[cy * width + cx] - lum[qCy * width + qCx];
              ssd += diff * diff;
            }
          }
          const meanSsd = ssd / patchArea;
          const weight = Math.exp(-meanSsd * weightScale);
          const qPixel = (qy * width + qx) * 4;
          weightTotal += weight;
          sumR += data[qPixel] * weight;
          sumG += data[qPixel + 1] * weight;
          sumB += data[qPixel + 2] * weight;
        }
      }

      if (weightTotal > 0) {
        out[pixel] = clampByte(sumR / weightTotal);
        out[pixel + 1] = clampByte(sumG / weightTotal);
        out[pixel + 2] = clampByte(sumB / weightTotal);
      } else {
        out[pixel] = data[pixel];
        out[pixel + 1] = data[pixel + 1];
        out[pixel + 2] = data[pixel + 2];
      }
      out[pixel + 3] = data[pixel + 3];
    }
  }
  return out;
}

function drawHistogram() {
  if (!state.clean || !state.noisy) return;
  const cleanHist = makeHistogram(state.clean, state.width, state.height);
  const noisyHist = makeHistogram(state.noisy, state.width, state.height);
  const resultHist = state.result
    ? makeHistogram(state.result, state.width, state.height)
    : new Uint32Array(256);

  const canvas = dom.histogramCanvas;
  const ctx = canvas.getContext("2d");
  const padX = 12;
  const padTop = 10;
  const padBottom = 12;
  const plotW = canvas.width - padX * 2;
  const plotH = canvas.height - padTop - padBottom;
  const maxCount = Math.max(
    1,
    Math.max(...cleanHist),
    Math.max(...noisyHist),
    Math.max(...resultHist)
  );

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#e3e9e6";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = padTop + (plotH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(canvas.width - padX, y);
    ctx.stroke();
  }

  plotLine(ctx, cleanHist, maxCount, padX, padTop, plotW, plotH, "#aab8b2");
  plotLine(ctx, noisyHist, maxCount, padX, padTop, plotW, plotH, "#bd4d54");
  plotLine(ctx, resultHist, maxCount, padX, padTop, plotW, plotH, "#0d7263");
}

function makeHistogram(data, width, height) {
  const hist = new Uint32Array(256);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const lum = Math.round(0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]);
      hist[lum] += 1;
    }
  }
  return hist;
}

function plotLine(ctx, hist, maxCount, padX, padTop, plotW, plotH, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.88;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < 256; i += 1) {
    const x = padX + (i / 255) * plotW;
    const y = padTop + plotH - (hist[i] / maxCount) * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

function renderParams() {
  const panel = dom.paramPanel;
  panel.replaceChildren();
  const defs = ALGORITHMS[state.algorithm].params;
  Object.keys(defs).forEach((key) => {
    const def = defs[key];
    const row = document.createElement("label");
    row.className = "control-row";
    const title = document.createElement("span");
    title.textContent = def.label;
    const input = document.createElement("input");
    input.type = "range";
    input.min = def.min;
    input.max = def.max;
    input.step = def.step;
    input.value = state.params[key];
    const output = document.createElement("output");
    output.textContent = numberText(state.params[key], def.step);
    row.append(title, input, output);

    input.addEventListener("input", () => {
      state.params[key] = Number(input.value);
      output.textContent = numberText(state.params[key], def.step);
    });
    panel.append(row);
  });
}

function bindEvents() {
  dom.noiseSigma.addEventListener("input", () => {
    state.noiseSigma = Number(dom.noiseSigma.value);
    dom.noiseSigmaValue.textContent = numberText(state.noiseSigma, 1);
    updateNoiseMeta();
  });
  dom.noiseDensity.addEventListener("input", () => {
    state.noiseDensity = Number(dom.noiseDensity.value);
    dom.noiseDensityValue.textContent = `${state.noiseDensity}%`;
    updateNoiseMeta();
  });

  dom.noiseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.noiseMode = button.dataset.noise;
      dom.noiseButtons.forEach((item) => item.classList.toggle("active", item === button));
      dom.sigmaRow = dom.sigmaRow || $("sigmaRow");
      dom.densityRow = dom.densityRow || $("densityRow");
      dom.sigmaRow.hidden = state.noiseMode !== "gaussian";
      dom.densityRow.hidden = state.noiseMode !== "saltPepper";
      updateNoiseMeta();
    });
  });

  dom.noiseButton.addEventListener("click", async () => {
    if (state.busy) return;
    setStatus("Applying noise...", true);
    await nextFrame();
    await applyNoise();
    setStatus("Ready", false);
  });

  dom.exportButton.addEventListener("click", () => {
    if (!state.result) return;
    const safeName = state.sourceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "image";
    const link = document.createElement("a");
    link.download = `${safeName}-${state.algorithm}.png`;
    link.href = dom.resultCanvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

  dom.algoInputs.forEach((input) => {
    input.addEventListener("change", () => {
      state.algorithm = input.value;
      state.params = cloneParams(state.algorithm);
      renderParams();
      updateMeta();
      dom.algoInputs.forEach((item) => {
        const option = item.closest(".algo-option");
        if (option) option.classList.toggle("selected", item === input);
      });
    });
  });

  dom.runButton.addEventListener("click", runCurrentFilter);
  dom.restoreButton.addEventListener("click", runCurrentFilter);
  dom.resetButton.addEventListener("click", () => {
    if (state.noisy) {
      state.result = null;
      dom.resultCanvas.width = state.width;
      dom.resultCanvas.height = state.height;
      dom.resultCanvas.getContext("2d").clearRect(0, 0, state.width, state.height);
      dom.resultPsnr.textContent = "—";
      updateMetrics();
      drawHistogram();
    }
  });

  dom.demoButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.busy) initDemo(button.dataset.source);
    });
  });

  dom.fileInput.addEventListener("change", () => {
    if (dom.fileInput.files && dom.fileInput.files[0]) {
      loadLocalImage(dom.fileInput.files[0]);
    }
  });

  dom.uploadZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dom.uploadZone.classList.add("dragging");
  });
  dom.uploadZone.addEventListener("dragleave", () => {
    dom.uploadZone.classList.remove("dragging");
  });
  dom.uploadZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dom.uploadZone.classList.remove("dragging");
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      loadLocalImage(event.dataTransfer.files[0]);
    }
  });

  dom.viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      dom.viewButtons.forEach((item) => item.classList.toggle("active", item === button));
      dom.metricsView.hidden = view !== "metrics";
      dom.viewerStage.hidden = view === "metrics";
    });
  });

  dom.zoomRange.addEventListener("input", () => {
    const value = Number(dom.zoomRange.value);
    dom.zoomValue.textContent = `${value}%`;
    dom.previewCanvases.forEach((canvas) => {
      canvas.style.width = `${value}%`;
      canvas.style.height = `${value}%`;
    });
  });

  window.addEventListener("beforeunload", () => {
    state.runToken += 1;
  });
}

function loadLocalImage(file) {
  if (!file.type.startsWith("image/")) return;
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d").drawImage(image, 0, 0);
    URL.revokeObjectURL(url);
    await useSourceCanvas(canvas, file.name);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    setStatus("Image load failed", false);
  };
  image.src = url;
}

init();
