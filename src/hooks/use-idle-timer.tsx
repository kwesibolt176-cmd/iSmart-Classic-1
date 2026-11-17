import { useEffect, useRef, useState } from "react";

export const useIdleTimer = (timeoutMs: number = 30 * 60 * 1000) => {
  const [isIdle, setIsIdle] = useState(false);
  const lastActivity = useRef<number>(Date.now());
  const checkIntervalId = useRef<NodeJS.Timeout | null>(null);
  const isIdleRef = useRef(false);

  const resetTimer = () => {
    // Only reset if not currently idle — mouse movement should NOT dismiss the lock
    if (!isIdleRef.current) {
      lastActivity.current = Date.now();
    }
  };

  const forceReset = () => {
    lastActivity.current = Date.now();
    isIdleRef.current = false;
    setIsIdle(false);
  };

  useEffect(() => {
    // Reading and scrolling count as activity too; otherwise users were signed out
    // while working (QA BUG-12). resetTimer ignores events once locked, so moving
    // the mouse still does not dismiss the lock screen.
    const activityEvents = ["keydown", "click", "touchstart", "touchend", "pointerdown", "wheel", "scroll", "mousemove"];

    let lastHandled = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastHandled < 1000) return; // throttle high-frequency events
      lastHandled = now;
      resetTimer();
    };

    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true, capture: true });
    });

    lastActivity.current = Date.now();
    checkIntervalId.current = setInterval(() => {
      const elapsed = Date.now() - lastActivity.current;
      if (elapsed >= timeoutMs && !isIdleRef.current) {
        isIdleRef.current = true;
        setIsIdle(true);
      }
    }, 1000);

    return () => {
      if (checkIntervalId.current) clearInterval(checkIntervalId.current);
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity, { capture: true });
      });
    };
  }, [timeoutMs]);

  const unlock = () => {
    forceReset();
  };

  return { isIdle, unlock };
};
