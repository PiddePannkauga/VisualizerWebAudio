    let buffer = null;
    let dataArrayFrequency = null;
    let dataArrayTimeDomain = null;
    let analyzer = null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audio = new Audio('./Brytning_3.ogg');
    const context = new AudioContext({});

    const audioBuffer = new AudioBuffer({
      length: 1 * 8000,
      sampleRate: 8000,
    });

    buffer = await getFile(context, './Brytning_3.ogg');
    const sample = playSample(context,buffer, 0);

    const canvas = document.getElementById('tutorial');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
  

    

    async function getFile(audioContext, filepath) {
      const response = await fetch(filepath);
      const arrayBuffer = await response.arrayBuffer();
      analyzer = await audioContext.createAnalyser();
      dataArrayFrequency = new Uint8Array(analyzer.frequencyBinCount);
      analyzer.getByteFrequencyData(dataArrayFrequency);
      return audioBuffer;
    }


    function playSample(audioContext, audioBuffer, time) {
      navigator.mediaDevices.getUserMedia ({audio: true}).then((stream) => {
        const sampleSource = audioContext.createMediaStreamSource(stream);
        sampleSource.loop=true;
        sampleSource.buffer = audioBuffer;
        sampleSource.gain=0.1;
        console.log(sampleSource);
        sampleSource.connect(analyzer)
        return sampleSource;
      });
   
        
       
    }

    const tick = () => {
      ctx.clearRect(0,0, window.innerWidth,window.innerHeight);
      dataArrayFrequency = new Uint8Array(analyzer.frequencyBinCount);
      dataArrayTimeDomain = new Uint8Array(analyzer.frequencyBinCount);
      analyzer.getByteFrequencyData(dataArrayFrequency);
      analyzer.getByteFrequencyData(dataArrayTimeDomain);
      let x = 0;
      let y = 10;
      let i = 0
      let amp = 0;
      const reducer = (previousValue, currentValue) => {
        if(previousValue > 160) {
          return previousValue + currentValue
        }
         return currentValue
      };
      const circleAmpArray = Array.from(dataArrayFrequency.slice(0,5));
      let ampCircle = circleAmpArray.reduce(reducer);
      ctx.lineWidth = 10;
      ctx.strokeStyle = `rgb(${ampCircle/3}, ${0}, ${ampCircle/2})`;
      ctx.beginPath();
      ctx.arc(200, 200, ampCircle/10, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(400, 200, ampCircle/10, 0, 2 * Math.PI);
      ctx.stroke();
      
      ctx.beginPath();       // Start a new path
      ctx.moveTo(20, 400);    // Move the pen to (30, 50)
      ctx.lineTo(600, 400);  // Draw a line to (150, 100)
      ctx.stroke();
      
      let bezierCurveX = dataArrayTimeDomain[349] < 100 ? dataArrayTimeDomain[349] : 0;
      let bezierCurveY = dataArrayTimeDomain[360] < 100 ? dataArrayTimeDomain[360] : 0;
            // Define the points as {x, y}
      let start = { x: 20,    y: 400  };
      let cp1 =   { x: bezierCurveX+250,   y: bezierCurveY + 450  };
      let cp2 =   { x: bezierCurveX+250,   y: bezierCurveY + 450 };
      let end =   { x: 600,   y: 400 };

      // Cubic Bézier curve
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
      ctx.stroke();
      dataArrayFrequency.forEach(() => {
        if( i % 10 === 0 || i === 0) {
          ctx.fillStyle = `rgb(${amp/4}, ${0}, ${amp + 20})`;
          ctx.fillRect(x, window.innerHeight, 30, -amp/2);
          amp = 0;
          x += 35;
          y += 10;

        }
        amp += dataArrayFrequency[i];
        i++;
      })
      
      window.requestAnimationFrame(tick);
    }
    tick()
