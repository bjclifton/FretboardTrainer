import { useState, useRef, useCallback } from 'react';

interface AudioCaptureConfig {
  // How big is the "bucket" of audio we grab at once?
  // 4096 is a good balance for valid pitch detection vs latency.
  bufferSize?: 2048 | 4096 | 8192;
  onAudioData?: (data: Float32Array) => void;
}

export const useAudioCapture = ({ bufferSize = 4096, onAudioData }: AudioCaptureConfig = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0); // Useful for a UI "visualizer"

  // We use refs to hold the audio nodes so they don't reset on every render
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioBuffer = useRef<Float32Array>(new Float32Array(0));


  const startCapture = useCallback(async () => {
    setError(null);
    audioBuffer.current = new Float32Array(0);

    try {
      // 1. Request Microphone Access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false, // Turn off fancy processing for cleaner raw signal
          autoGainControl: false,
          noiseSuppression: false
        }
      });

      streamRef.current = stream;

      // 2. Initialize Audio Context
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;

      // 3. Add our AudioWorklet processor
      try {
        await audioCtx.audioWorklet.addModule('/audio/audio-processor.js');
      } catch (e) {
        console.error('Error loading audio worklet module', e);
        setError('Could not load audio processor.');
        return;
      }

      // 4. Create the Source (The Mic)
      const source = audioCtx.createMediaStreamSource(stream);

      // 5. Create the Worklet Node
      const workletNode = new AudioWorkletNode(audioCtx, 'audio-processor');
      workletNodeRef.current = workletNode;


      // 6. Handle messages from the worklet
      workletNode.port.onmessage = (event) => {
        if (event.data.type === 'volume') {
            setVolume(Math.min(1, event.data.data * 5)); // Boost it a bit for visual clarity
            return;
        }

        if (event.data.type === 'audio') {
            const audioData = event.data.data as Float32Array;

            // Buffer the incoming data
            const newBuffer = new Float32Array(audioBuffer.current.length + audioData.length);
            newBuffer.set(audioBuffer.current, 0);
            newBuffer.set(audioData, audioBuffer.current.length);
            audioBuffer.current = newBuffer;

            // If we have enough data, send it out and reset the buffer
            if (audioBuffer.current.length >= bufferSize) {
                // We must clone the data because the buffer will be reused
                const dataToSend = audioBuffer.current.slice(0, bufferSize);
                audioBuffer.current = audioBuffer.current.slice(bufferSize);

                if (onAudioData) {
                    onAudioData(dataToSend);
                }
            }
        }
      };

      // 7. Connect the graph: Mic -> Worklet -> Destination
      // We connect to the destination to keep the graph running, but the worklet
      // doesn't pass any audio through, so you won't hear yourself.
      source.connect(workletNode);
      workletNode.connect(audioCtx.destination);

      setIsListening(true);

    } catch (err: unknown) {
      console.error("Error accessing microphone:", err);
      let message = "Could not access microphone";
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
        message = (err as { message: string }).message;
      }
      setError(message);
      setIsListening(false);
    }
  }, [bufferSize, onAudioData]);

  const stopCapture = useCallback(() => {
    // Cleanup everything to stop the red "recording" dot in the browser tab
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
    }
    if (workletNodeRef.current) {
        workletNodeRef.current.port.onmessage = null;
        workletNodeRef.current.disconnect();
    }

    setIsListening(false);
    setVolume(0);
  }, []);

  return { isListening, volume, error, startCapture, stopCapture };
};