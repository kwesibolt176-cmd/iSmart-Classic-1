import { useRef, useCallback } from "react";

export const useKitchenSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNewOrderSound = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      
      // Resume AudioContext if suspended (browser autoplay policy)
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      
      // Create a pleasant notification sound - two-tone chime
      const oscillator1 = ctx.createOscillator();
      const oscillator2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // First tone
      oscillator1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator1.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.15); // C6
      
      // Second tone (harmony)
      oscillator2.frequency.setValueAtTime(1318.5, ctx.currentTime + 0.15); // E6
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      oscillator1.start(ctx.currentTime);
      oscillator1.stop(ctx.currentTime + 0.5);
      oscillator2.start(ctx.currentTime + 0.15);
      oscillator2.stop(ctx.currentTime + 0.5);
      
      console.log("Kitchen sound played successfully");
    } catch (error) {
      console.error("Error playing kitchen sound:", error);
    }
  }, []);

  // Function to initialize audio context on user interaction
  const initializeAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
    console.log("Audio context initialized:", audioContextRef.current.state);
  }, []);

  return { playNewOrderSound, initializeAudio };
};
