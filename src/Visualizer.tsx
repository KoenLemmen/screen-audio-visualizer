
import React, { useRef, useEffect, useState, useCallback } from "react";

const Visualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null); // To store the stream


  const [status, setStatus] = useState<string>('Click "Start Visualizer". Remember to select "Share system audio" or "Share tab audio"!');
  const [isVisualizing, setIsVisualizing] = useState<boolean>(false);

  // Settings state
  const [barCount, setBarCount] = useState<number>(96);
  const [colorScheme, setColorScheme] = useState<string>('rainbow');
  const [freqScale, setFreqScale] = useState<'linear' | 'log'>('log');
  const [minFreq, setMinFreq] = useState<number>(40); // Hz
  const [maxFreq, setMaxFreq] = useState<number>(16000); // Hz
  const [smoothing, setSmoothing] = useState<number>(0.7);

  // Color schemes
  const colorSchemes = React.useMemo<Record<string, (i: number, n: number, v: number) => string>>(() => ({
    rainbow: (i, n) => `hsl(${(i / n) * 270}, 100%, 50%)`,
    fire: (i, n, v) => `hsl(${30 + (i / n) * 30}, 100%, ${30 + (v / 255) * 30}%)`,
    ocean: (i, n) => `hsl(${180 + (i / n) * 60}, 80%, 45%)`,
    green: (_i, _n, v) => `hsl(120, 80%, ${30 + (v / 255) * 30}%)`,
    purple: (i, n) => `hsl(${270 + (i / n) * 30}, 80%, 50%)`,
  }), []);

  const stopVisualizer = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    setIsVisualizing(false);
    setStatus("Visualizer stopped.");
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    const audioContext = audioContextRef.current;

    if (!canvas || !analyser || !dataArray || !audioContext || audioContext.state === "closed") {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      return;
    }

    animationFrameIdRef.current = requestAnimationFrame(draw);

    analyser.smoothingTimeConstant = smoothing;
    analyser.getByteFrequencyData(dataArray);

    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Frequency bin mapping
    const sampleRate = audioContext.sampleRate;
    const freqStep = sampleRate / 2 / dataArray.length;
    const bars = barCount;
    const minBin = Math.max(0, Math.floor(minFreq / freqStep));
    const maxBin = Math.min(dataArray.length - 1, Math.ceil(maxFreq / freqStep));

    let getBinIndex: (i: number) => number;
    if (freqScale === 'log') {
      // Logarithmic mapping
      const minLog = Math.log10(minFreq);
      const maxLog = Math.log10(maxFreq);
      getBinIndex = (i) => {
        const logF = minLog + (i / bars) * (maxLog - minLog);
        const freq = Math.pow(10, logF);
        return Math.min(maxBin, Math.max(minBin, Math.round(freq / freqStep)));
      };
    } else {
      // Linear mapping
      getBinIndex = (i) => Math.round(minBin + (i / bars) * (maxBin - minBin));
    }

    const barWidth = (canvas.width / bars) * 0.9;
    let x = 0;
    for (let i = 0; i < bars; i++) {
      const bin = getBinIndex(i);
      // Average a few bins for smoother look
      let v = 0;
      let count = 0;
      for (let j = bin - 1; j <= bin + 1; j++) {
        if (j >= minBin && j <= maxBin) {
          v += dataArray[j];
          count++;
        }
      }
      v = count ? v / count : 0;
      const barHeight = (v / 255) * canvas.height;
      const colorFn = colorSchemes[colorScheme] || colorSchemes.rainbow;
      canvasCtx.fillStyle = colorFn(i, bars, v);
      canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }, [barCount, colorScheme, freqScale, minFreq, maxFreq, smoothing, colorSchemes]);

  const startVisualizer = async () => {
    if (isVisualizing) {
      stopVisualizer();
      return;
    }

    setStatus('Requesting screen sharing access... (Look for "Share system audio" option)');

    try {
      stopVisualizer();

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true, 
      });

      if (stream.getAudioTracks().length === 0) {
        setStatus('Screen shared, but no audio track was captured. Please try again and ensure "Share system audio" or "Share tab audio" is selected.');
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream; // Store the stream for later stopping

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();


      // Set fftSize based on barCount for better resolution
      let fftSize = 256;
      if (barCount > 128) fftSize = 1024;
      else if (barCount > 64) fftSize = 512;
      else if (barCount > 32) fftSize = 256;
      else fftSize = 128;
      analyserRef.current.fftSize = fftSize;
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

      source.connect(analyserRef.current);
      // Do NOT connect to audioContext.destination to avoid feedback loop

      stream.getVideoTracks()[0].onended = () => {
        setStatus("Screen sharing ended.");
        stopVisualizer();
      };


      setStatus("Screen sharing started. Visualizing audio...");
      setIsVisualizing(true);
      draw();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Error accessing screen media:", err);
      setStatus(`Error: ${err.name || "Unknown"}. ${err.message || "User denied permission or no suitable source found."}`);
      stopVisualizer();
    }
  };

  // Redraw on settings change if visualizing
  useEffect(() => {
    if (isVisualizing) {
      draw();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barCount, colorScheme, freqScale, minFreq, maxFreq, smoothing]);

  useEffect(() => {
    return () => {
      stopVisualizer();
    };
  }, [stopVisualizer]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold mb-6">Screen Audio Visualizer</h1>
      <button
        onClick={startVisualizer}
        className={`px-6 py-3 rounded-lg text-lg font-semibold transition-colors duration-200 ${isVisualizing ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
      >
        {isVisualizing ? "Stop Visualizer" : "Start Visualizer"}
      </button>
      <canvas ref={canvasRef} width="600" height="200" className="mt-8 bg-black border-2 border-gray-700"></canvas>
      <div className="w-full flex justify-center">
        <div className="mt-6 bg-gray-800 rounded-lg p-4 flex flex-col gap-4 items-center w-full max-w-2xl">
          <h2 className="text-xl font-semibold mb-2">Settings</h2>
          <div className="flex flex-wrap gap-6 items-center justify-center w-full">
            <label className="flex flex-col text-sm items-center">
              Color Scheme
              <select value={colorScheme} onChange={e => setColorScheme(e.target.value)} className="mt-1 p-1 rounded bg-gray-700">
                {Object.keys(colorSchemes).map(scheme => (
                  <option key={scheme} value={scheme}>{scheme.charAt(0).toUpperCase() + scheme.slice(1)}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm items-center">
              Bars: {barCount}
              <input type="range" min={8} max={256} step={1} value={barCount} onChange={e => setBarCount(Number(e.target.value))} className="mt-1 w-32" />
            </label>
            <label className="flex flex-col text-sm items-center">
              Frequency Scale
              <select value={freqScale} onChange={e => setFreqScale(e.target.value as 'linear' | 'log')} className="mt-1 p-1 rounded bg-gray-700">
                <option value="log">Logarithmic</option>
                <option value="linear">Linear</option>
              </select>
            </label>
            <label className="flex flex-col text-sm items-center">
              Min Freq: {minFreq} Hz
              <input type="range" min={20} max={maxFreq - 100} step={1} value={minFreq} onChange={e => setMinFreq(Number(e.target.value))} className="mt-1 w-32" />
            </label>
            <label className="flex flex-col text-sm items-center">
              Max Freq: {maxFreq} Hz
              <input type="range" min={minFreq + 100} max={22050} step={1} value={maxFreq} onChange={e => setMaxFreq(Number(e.target.value))} className="mt-1 w-32" />
            </label>
            <label className="flex flex-col text-sm items-center">
              Smoothing: {smoothing.toFixed(2)}
              <input type="range" min={0} max={0.99} step={0.01} value={smoothing} onChange={e => setSmoothing(Number(e.target.value))} className="mt-1 w-32" />
            </label>
          </div>
        </div>
      </div>
      <div id="status" className="mt-4 text-center text-gray-400 max-w-xl">
        {status}
      </div>
    </div>
  );
};

export default Visualizer;
