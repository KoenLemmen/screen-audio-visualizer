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

    analyser.getByteFrequencyData(dataArray);

    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / dataArray.length) * 0.9;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = dataArray[i] * 1.5; // Scale height for better visibility

      canvasCtx.fillStyle = `hsl(${i * 2}, 100%, 50%)`; // Dynamic color
      canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }
  }, []);

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

      analyserRef.current.fftSize = 256;
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

  useEffect(() => {
    return () => {
      stopVisualizer();
    };
  }, [stopVisualizer]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen
                 bg-gray-900 text-white p-4"
    >
      <h1 className="text-3xl font-bold mb-6">Screen Audio Visualizer</h1>
      <button
        onClick={startVisualizer}
        className={`px-6 py-3 rounded-lg text-lg font-semibold transition-colors duration-200
                   ${isVisualizing ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
      >
        {isVisualizing ? "Stop Visualizer" : "Start Visualizer"}
      </button>
      <canvas ref={canvasRef} width="600" height="200" className="mt-8 bg-black border-2 border-gray-700"></canvas>
      <div id="status" className="mt-4 text-center text-gray-400 max-w-xl">
        {status}
      </div>
    </div>
  );
};

export default Visualizer;
