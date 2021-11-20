import bpm from "./bpm.js";

let buffer = null;
let dataArrayFrequency = null;
let dataArrayTimeDomain = null;
let analyzer = null;
const AudioContext = window.AudioContext || window.webkitAudioContext;
const context = new AudioContext();

buffer = await getFile(context, "./SNEKMAN_10.ogg");
await bpm("./SNEKMAN_10.ogg");
await setupAnalyzer();
playSample(context, buffer, 0);

streamAudioFromPc();
const canvas = document.getElementById("tutorial");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

async function getFile(audioContext, filepath) {
  const response = await fetch(filepath);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  return audioBuffer;
}

function playSample(audioContext, audioBuffer, time) {
  const sampleSource = audioContext.createBufferSource();

  const gainNode = context.createGain();
  gainNode.gain.value = 0.5;

  sampleSource.loop = true;
  sampleSource.buffer = audioBuffer;
  sampleSource
    .connect(gainNode)
    .connect(analyzer)
    .connect(audioContext.destination);
  sampleSource.start(time);
  return sampleSource;
}

async function setupAnalyzer() {
  analyzer = await context.createAnalyser();
  dataArrayFrequency = new Uint8Array(analyzer.frequencyBinCount);
  analyzer.getByteFrequencyData(dataArrayFrequency);
}

function streamAudioFromPc() {
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    const sampleSource = context.createMediaStreamSource(stream);

    sampleSource.buffer = context.createBuffer(2, 128000, 128000);
    //sampleSource.connect(context.destination);
    sampleSource.connect(analyzer);
    return sampleSource;
  });
}

let circleDecay = 0;
let xCirclePos = 0;
let xCirclePosD = 100;

function step() {
  if (xCirclePos > canvas.width - 400) {
    xCirclePosD = -Math.abs(xCirclePosD);
  }
  if (xCirclePos < 0) {
    xCirclePosD = Math.abs(xCirclePosD);
  }

  xCirclePos += xCirclePosD;
}
let BPMSrunning = false;

const tick = () => {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  dataArrayFrequency = new Uint8Array(analyzer.frequencyBinCount);
  dataArrayTimeDomain = new Uint8Array(analyzer.frequencyBinCount);
  analyzer.getByteFrequencyData(dataArrayFrequency);
  analyzer.getByteFrequencyData(dataArrayTimeDomain);
  let x = 0;
  let y = 10;
  let i = 0;
  let amp = 0;
  const reducer = (previousValue, currentValue) => {
    if (currentValue > 180) {
      return previousValue + currentValue;
    }
    return currentValue;
  };
  const circleAmpArray = Array.from(dataArrayFrequency.slice(0, 8));
  let ampCircle = circleAmpArray.reduce(reducer);
  ampCircle = Math.floor(ampCircle);
  ampCircle = ampCircle > circleDecay ? ampCircle : circleDecay;

  ctx.lineWidth = 10;
  ctx.strokeStyle = `rgb(${ampCircle / 3}, ${0}, ${ampCircle / 2})`;
  ctx.beginPath();
  ctx.arc(xCirclePos + 200, 200, ampCircle / 30, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(xCirclePos + 400, 200, ampCircle / 30, 0, 2 * Math.PI);
  ctx.stroke();

  circleDecay = circleDecay < 0 ? 0 : ampCircle - 20;

  if (localStorage.getItem("BPMS") && !BPMSrunning) {
    BPMSrunning = true;
    const intervalID = setInterval(step, localStorage.getItem("BPMS"));
  }
  ctx.beginPath(); // Start a new path
  ctx.moveTo(xCirclePos + 20, 400); // Move the pen to (30, 50)
  ctx.lineTo(xCirclePos + 600, 400); // Draw a line to (150, 100)
  ctx.stroke();

  let bezierCurveX =
    dataArrayTimeDomain[360] < 100 ? dataArrayTimeDomain[349] : 0;
  let bezierCurveY =
    dataArrayTimeDomain[360] < 100 ? dataArrayTimeDomain[300] : 0;
  // Define the points as {x, y}
  let start = { x: 20, y: 400 };
  let cp1 = { x: bezierCurveX + 250, y: bezierCurveY + 450 };
  let cp2 = { x: bezierCurveX + 250, y: bezierCurveY + 450 };
  let end = { x: 600, y: 400 };

  // Cubic Bézier curve
  ctx.beginPath();
  ctx.moveTo(xCirclePos + start.x, start.y);
  ctx.bezierCurveTo(
    xCirclePos + cp1.x,
    cp1.y,
    xCirclePos + cp2.x,
    cp2.y,
    xCirclePos + end.x,
    end.y
  );
  ctx.stroke();
  dataArrayFrequency.forEach(() => {
    if (i % 10 === 0 || i === 0) {
      ctx.fillStyle = `rgb(${amp / 4}, ${0}, ${amp + 20})`;
      ctx.fillRect(x, window.innerHeight, 30, -amp / 5);
      amp = 0;
      x += 35;
      y += 10;
    }
    amp += dataArrayFrequency[i];
    i++;
  });

  window.requestAnimationFrame(tick);
};
tick();
