import bpm from "./bpm.js";

let buffer = null;
let dataArrayFrequency = null;
let dataArrayTimeDomain = null;
let analyzer = null;
const AudioContext = window.AudioContext || window.webkitAudioContext;
const context = new AudioContext();
const musicFileName = "songs/" + "BADOBADO.ogg"

buffer = await getFile(context, musicFileName);
await bpm(musicFileName);
await setupAnalyzer();
playSample(context, buffer, 0);

streamAudioFromPc();
const spectrumCanvas = document.getElementById("spectrum");
const spectrumCtx = spectrumCanvas.getContext("2d");
const patternCanvas = document.getElementById("pattern");
const patternCtx = patternCanvas.getContext("2d");
spectrumCanvas.width = window.innerWidth;
spectrumCanvas.height = window.innerHeight / 2;
patternCanvas.width = window.innerWidth;
patternCanvas.height = window.innerHeight / 2 + 100;

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

    sampleSource.buffer = context.createBuffer(2, 48000, 48000);
    //sampleSource.connect(context.destination);
    sampleSource.connect(analyzer);
    return sampleSource;
  });
}

//Config Pattern
let circleDecay = 0;
let mouthDecay = 0;
let xCirclePos = window.innerWidth / 2;
const faceYStart = 200;
let BPMSrunning = false;

let circleDroplet = 160;

let circleDropletRadiusDirection = -20;

const spawnCircle = () =>  { 

  if (circleDroplet >= 160) {
    circleDropletRadiusDirection = -Math.abs(circleDropletRadiusDirection);
  }
  if (circleDroplet <= 75) {
    circleDropletRadiusDirection = Math.abs(circleDropletRadiusDirection);
  }

  circleDroplet += circleDropletRadiusDirection;



}

const tick = () => {
  spectrumCtx.clearRect(0, 0, spectrumCanvas.clientWidth, spectrumCanvas.clientHeight);
  patternCtx.clearRect(0, 0, patternCanvas.clientWidth, patternCanvas.clientHeight);


  dataArrayFrequency = new Uint8Array(analyzer.frequencyBinCount);
  dataArrayTimeDomain = new Uint8Array(analyzer.frequencyBinCount);
  analyzer.getByteFrequencyData(dataArrayFrequency);
  analyzer.getByteFrequencyData(dataArrayTimeDomain);
  let ampCirclePassed = 1;
  const circleAmpArray = Array.from(dataArrayFrequency.slice(0, 5));
  let ampCircle = 0;
  circleAmpArray.forEach((elem) => {
    if(elem > 250) {
      ampCirclePassed ++;
      ampCircle += elem;
    }
    
  })
  ampCircle = Math.floor(ampCircle) / ampCirclePassed;

  ampCircle = ampCircle > circleDecay ? ampCircle : circleDecay;

  patternCtx.lineWidth = 10;
  patternCtx.strokeStyle = `rgb(${ampCircle + 40}, ${ampCircle / 3}, ${ampCircle + circleDroplet})`;


  patternCtx.beginPath();
  patternCtx.arc(xCirclePos - 125, faceYStart, ampCircle / 2.5 + 5 , 0, 2 * Math.PI);
  patternCtx.stroke();
  patternCtx.beginPath();
  patternCtx.arc(xCirclePos + 200, faceYStart, ampCircle / 2.5 + 5, 0, 2 * Math.PI);
  patternCtx.stroke();

  circleDecay = circleDecay < 0 ? ampCircle : ampCircle - 4;
  //BPMS Circles

  if (localStorage.getItem("BPMS") && !BPMSrunning) {
    BPMSrunning = true;
    setInterval(spawnCircle, parseInt(localStorage.getItem("BPMS")))
    
  }

  

  //MOUTH
  patternCtx.beginPath(); // Start a new path
  patternCtx.moveTo(xCirclePos - 250, faceYStart + 150); // Move the pen to (30, 50)
  patternCtx.lineTo(xCirclePos + 300, faceYStart + 150); // Draw a line to (150, 100)
  patternCtx.stroke();
  let mouthFrequencyData = dataArrayTimeDomain.slice(10, 50);

  let mouthPassed = 1;
 
  let mouthY = 0;
  mouthFrequencyData.forEach((elem) => {
    if(elem > 190) {
      mouthPassed ++;
      mouthY += elem;
    }
    
  })
  mouthY = mouthY > mouthDecay ? mouthY / mouthPassed : mouthDecay;
  mouthDecay = mouthDecay <= 0 ? mouthY : mouthDecay - 7;
  let bezierCurveY = mouthY + 30;


  let start = { x: xCirclePos - 245, y: faceYStart + 150 };
  let cp1 = { x: xCirclePos - 265, y: bezierCurveY  + faceYStart + 150 };
  let cp2 = { x: xCirclePos + 315, y: bezierCurveY  + faceYStart + 150 };
  let end = { x: xCirclePos + 295, y: faceYStart + 150 };
  // Cubic Bézier curve
  patternCtx.beginPath();
  patternCtx.moveTo(start.x, start.y);
  patternCtx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
  patternCtx.stroke();  

  //BPMS CIRCLES
  
  patternCtx.moveTo(0,0);

  //Outer
  patternCtx.strokeStyle = `rgb(${ampCircle + 40}, ${0}, ${ampCircle + circleDroplet})`;
  patternCtx.beginPath();
  patternCtx.arc(200, 200, circleDroplet + 10, 0, 2 * Math.PI);
  patternCtx.stroke();

  patternCtx.beginPath();
  patternCtx.arc(patternCanvas.clientWidth - 200, 200, circleDroplet + 10, 0, 2 * Math.PI);
  patternCtx.stroke();

  //Middle
  patternCtx.strokeStyle = `rgb(${ampCircle + 20}, ${0}, ${ampCircle + circleDroplet})`;
  patternCtx.beginPath();
  patternCtx.arc(200, 200, circleDroplet - 20, 0, 2 * Math.PI);
  patternCtx.stroke();

  patternCtx.beginPath();
  patternCtx.arc(patternCanvas.clientWidth - 200, 200, circleDroplet - 20, 0, 2 * Math.PI);
  patternCtx.stroke();

  //Inner
  patternCtx.strokeStyle = `rgb(${ampCircle}, ${0}, ${ampCircle + circleDroplet})`;
  patternCtx.beginPath();
  patternCtx.arc(200, 200, circleDroplet - 50, 0, 2 * Math.PI);
  patternCtx.stroke();

  patternCtx.beginPath();
  patternCtx.arc(patternCanvas.clientWidth - 200,  200,  circleDroplet - 50, 0, 2 * Math.PI);
  patternCtx.stroke();

  //Spectrum
  let x = 0;
  let i = 0;
  spectrumCtx.lineWidth = 10;

  let amp, ampMulti = 0;

  dataArrayFrequency.forEach(() => {
    if (x + 35 < spectrumCanvas.clientWidth) {
      ampMulti++;
      amp += dataArrayFrequency[i];
      if (i % 6 === 0) {
        spectrumCtx.fillStyle = `rgb(${amp/ampMulti}, ${ampCircle/10}, ${amp/ampMulti + 60})`;
        spectrumCtx.beginPath();

        spectrumCtx.fillRect(
          x,
          window.innerHeight - spectrumCanvas.clientHeight - 100,
          30,
          -amp / ampMulti * 1.3
        );
        ampMulti = 0;
        amp = 0;
        x += 35;
        spectrumCtx.stroke();

      }
      ampMulti++;
      amp += dataArrayFrequency[i];
    }

    i++;
  });

  window.requestAnimationFrame(tick);
};
tick();
