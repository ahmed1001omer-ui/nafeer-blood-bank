"use client";

import { useEffect, useRef, useState } from "react";
import lottie, { AnimationItem } from "lottie-web";
import splashData from "../../public/splash-animation.json";

export default function SplashScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fading, setFading] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    let anim: AnimationItem | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: false,
        autoplay: true,
        animationData: splashData,
      });

      const handleComplete = () => {
        setFading(true);
        setTimeout(() => {
          setMounted(false);
        }, 500);
      };

      anim.addEventListener("complete", handleComplete);

      const op = typeof (splashData as any).op === "number" ? (splashData as any).op : 89;
      const fr = typeof (splashData as any).fr === "number" ? (splashData as any).fr : 25;
      const durationMs = (op / fr) * 1000 + 400;
      fallbackTimer = setTimeout(handleComplete, Math.max(durationMs, 2500));
    } catch (e) {
      console.error("Lottie animation error:", e);
      setMounted(false);
    }

    return () => {
      if (anim) anim.destroy();
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[10000] flex items-center justify-center bg-white transition-opacity duration-500 ease-in-out ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <div
        ref={containerRef}
        className="w-[340px] h-[340px] sm:w-[500px] sm:h-[500px] max-w-[90vw] max-h-[90vh] flex items-center justify-center"
      />
    </div>
  );
}
