import React, { useState, useRef, useEffect } from "react";
import { Play, X, ChevronDown, ChevronUp, ArrowRight, Keyboard, RotateCcw } from "lucide-react";

/**
 * CornerVideoTutorial Component
 *
 * Displays the 16-second video tutorial in the bottom-right corner of the workspace.
 * Provides interactive chapter scrubbing, an embedded HTML5 video player,
 * and a 1-click trigger to launch the live guided in-grid tutorial.
 */
export default function CornerVideoTutorial({
  onStartWalkthrough,
  isOpen = true,
  onClose,
}) {
  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      return sessionStorage.getItem("velotime_corner_video_minimized") === "true";
    } catch {
      return false;
    }
  });

  const [isDismissed, setIsDismissed] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setIsDismissed(false);
      setIsMinimized(false);
    }
  }, [isOpen]);

  const handleMinimize = (minimized) => {
    setIsMinimized(minimized);
    try {
      sessionStorage.setItem("velotime_corner_video_minimized", minimized ? "true" : "false");
    } catch {}
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("velotime_corner_video_dismissed", "true");
    } catch {}
    if (onClose) onClose();
  };

  const jumpToTime = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
  };

  if (isDismissed || !isOpen) return null;

  // Minimized corner pill
  if (isMinimized) {
    return (
      <div
        id="corner-video-tutorial-minimized"
        className="fixed bottom-5 right-5 z-40 select-none animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <button
          type="button"
          onClick={() => handleMinimize(false)}
          className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-950 hover:bg-slate-900 text-white border-2 border-slate-800 hover:border-slate-700 shadow-2xl cursor-pointer transition-all group"
          title="Expand video walkthrough"
        >
          <div className="w-5 h-5 rounded-full bg-rose-500 group-hover:bg-rose-400 flex items-center justify-center text-white shrink-0 transition-colors">
            <Play className="w-2.5 h-2.5 fill-white ml-0.5" />
          </div>
          <span className="text-xs font-bold text-slate-100 tracking-tight">
            Video Tutorial
          </span>
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-slate-800 text-rose-400 border border-slate-700">
            16s
          </span>
          <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
        </button>
      </div>
    );
  }

  // Expanded corner floating player
  return (
    <div
      id="corner-video-tutorial-widget"
      className="fixed bottom-5 right-5 z-40 w-80 sm:w-96 bg-slate-950 border-2 border-slate-800 text-white shadow-2xl overflow-hidden select-none animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-4 h-4 bg-rose-500 rounded-sm flex items-center justify-center shrink-0">
            <Play className="w-2.5 h-2.5 fill-white text-white ml-0.5" />
          </div>
          <span className="font-bold text-xs text-white truncate">
            Video Tutorial
          </span>
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-rose-950/80 text-rose-300 border border-rose-800/60 uppercase">
            16s
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleMinimize(true)}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Minimize tutorial"
            aria-label="Minimize"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close video tutorial"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Embedded HTML5 Video Player */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-slate-800">
        <video
          ref={videoRef}
          src="/videos/velotime-tutorial.mp4"
          poster="/videos/velotime-tutorial-preview.webp"
          preload="metadata"
          controls
          playsInline
          className="w-full h-full object-cover"
        >
          Your browser does not support HTML5 video streaming.
        </video>
      </div>

      {/* Chapters Scrubbing Bar */}
      <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between gap-1.5 text-[11px]">
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0">
          Jump:
        </span>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => jumpToTime(0)}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-700 transition-colors cursor-pointer"
            title="Jump to in-cell hours entry"
          >
            0:00 Hours
          </button>
          <button
            type="button"
            onClick={() => jumpToTime(5)}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-700 transition-colors cursor-pointer"
            title="Jump to audit notes drawer"
          >
            0:05 Notes
          </button>
          <button
            type="button"
            onClick={() => jumpToTime(11)}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-700 transition-colors cursor-pointer"
            title="Jump to keyboard glide"
          >
            0:11 Glide
          </button>
        </div>
      </div>

      {/* Interactive Walkthrough CTA Footer */}
      <div className="p-3 bg-slate-950 flex flex-col gap-2">
        <p className="text-[11px] text-slate-400 leading-tight">
          Learn the continuous keyboard glide directly on your grid:
        </p>
        <button
          type="button"
          onClick={() => {
            handleMinimize(true);
            if (onStartWalkthrough) onStartWalkthrough();
          }}
          className="w-full py-2 px-3 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
        >
          <Keyboard className="w-3.5 h-3.5 text-white" />
          <span>Start Interactive Walkthrough</span>
          <ArrowRight className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
}
