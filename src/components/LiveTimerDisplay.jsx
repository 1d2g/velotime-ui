import React, { useState, useEffect } from "react";

export default function LiveTimerDisplay({ startTime }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!startTime) return;

    const start = new Date(startTime).getTime();
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = now - start;
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      const hh = hours.toString().padStart(2, '0');
      const mm = minutes.toString().padStart(2, '0');
      const ss = seconds.toString().padStart(2, '0');
      
      setElapsed(`${hh}:${mm}:${ss}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span className="font-mono tabular-nums">{elapsed}</span>;
}
