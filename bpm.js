function getPeaks(data) {
  // What we're going to do here, is to divide up our audio into parts.

  // We will then identify, for each part, what the loudest sample is in that
  // part.

  // It's implied that that sample would represent the most likely 'beat'
  // within that part.

  // Each part is 0.5 seconds long - or 22,050 samples.

  // This will give us 60 'beats' - we will only take the loudest half of
  // those.

  // This will allow us to ignore breaks, and allow us to address tracks with
  // a BPM below 120.

  let partSize = 22050;
  let parts = data[0].length / partSize;
  let peaks = [];

  for (let i = 0; i < parts; i++) {
    let max = 0;
    for (let j = i * partSize; j < (i + 1) * partSize; j++) {
      let volume = Math.max(Math.abs(data[0][j]), Math.abs(data[1][j]));
      if (!max || volume > max.volume) {
        max = {
          position: j,
          volume: volume,
        };
      }
    }
    peaks.push(max);
  }

  // We then sort the peaks according to volume...

  peaks.sort(function (a, b) {
    return b.volume - a.volume;
  });

  // ...take the loundest half of those...

  peaks = peaks.splice(0, peaks.length * 0.5);

  // ...and re-sort it back based on position.

  peaks.sort(function (a, b) {
    return a.position - b.position;
  });

  return peaks;
}

function getIntervals(peaks) {
  // What we now do is get all of our peaks, and then measure the distance to
  // other peaks, to create intervals.  Then based on the distance between
  // those peaks (the distance of the intervals) we can calculate the BPM of
  // that particular interval.

  // The interval that is seen the most should have the BPM that corresponds
  // to the track itself.

  let groups = [];

  peaks.forEach(function (peak, index) {
    for (let i = 1; index + i < peaks.length && i < 10; i++) {
      let group = {
        tempo: (60 * 44100) / (peaks[index + i].position - peak.position),
        count: 1,
      };

      while (group.tempo < 90) {
        group.tempo *= 2;
      }

      while (group.tempo > 180) {
        group.tempo /= 2;
      }

      group.tempo = Math.round(group.tempo);

      if (
        !groups.some(function (interval) {
          return interval.tempo === group.tempo ? interval.count++ : 0;
        })
      ) {
        groups.push(group);
      }
    }
  });
  return groups;
}

let OfflineContext =
  window.OfflineAudioContext || window.webkitOfflineAudioContext;
let offlineContext = new OfflineContext(2, 30 * 44100, 44100);

export default async (filepath) => {
  // Create offline context
  console.log(filepath);
  const response = await fetch(filepath);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await offlineContext.decodeAudioData(arrayBuffer);

  // Create buffer source
  let source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;

  // Beats, or kicks, generally occur around the 100 to 150 hz range.
  // Below this is often the bassline.  So let's focus just on that.

  // First a lowpass to remove most of the song.

  let lowpass = offlineContext.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 100;
  lowpass.Q.value = 1;

  // Run the output of the source through the low pass.

  source.connect(lowpass);

  // Now a highpass to remove the bassline.

  let highpass = offlineContext.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 150;
  highpass.Q.value = 1;

  // Run the output of the lowpass through the highpass.

  lowpass.connect(highpass);

  // Run the output of the highpass through our offline context.

  highpass.connect(offlineContext.destination);

  // Start the source, and render the output into the offline conext.

  source.start(0);
  offlineContext.startRendering();
};

offlineContext.oncomplete = function (e) {
  let buffer = e.renderedBuffer;
  let peaks = getPeaks([buffer.getChannelData(0), buffer.getChannelData(1)]);
  let groups = getIntervals(peaks);

  let top = groups
    .sort(function (intA, intB) {
      return intB.count - intA.count;
    })
    .splice(0, 5);
  localStorage.setItem("BPM", top[0].tempo);
  localStorage.setItem("BPMS", parseInt(60000/top[0].tempo));
};
