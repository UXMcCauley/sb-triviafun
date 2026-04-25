'use client';

import { useState, useEffect, useCallback } from 'react';

interface CountdownProps {
  startedAt: number;
  duration: number;
  onExpire?: () => void;
  size?: 'sm' | 'lg';
  showPointsBar?: boolean;
}

import { pointsIfAnsweredNow } from '@/lib/scoring';

export default function Countdown({ startedAt, duration, onExpire, size = 'lg', showPointsBar }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [pointsNow, setPointsNow] = useState<number | null>(null);

  const calculate = useCallback(() => {
    const elapsed = (Date.now() - startedAt) / 1000;
    return Math.max(0, duration - elapsed);
  }, [startedAt, duration]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calculate();
      setTimeLeft(remaining);
      if (showPointsBar) {
        setPointsNow(pointsIfAnsweredNow({ timerSeconds: duration, startedAtMs: startedAt }));
      }
      if (remaining <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [calculate, onExpire, showPointsBar, duration, startedAt]);

  const seconds = Math.ceil(timeLeft);
  const progress = timeLeft / duration;
  const isUrgent = seconds <= 5;

  const sizeClasses = size === 'lg'
    ? 'w-32 h-32 text-5xl'
    : 'w-16 h-16 text-2xl';

  const circumference = size === 'lg' ? 2 * Math.PI * 56 : 2 * Math.PI * 26;
  const radius = size === 'lg' ? 56 : 26;
  const svgSize = size === 'lg' ? 128 : 64;
  const strokeWidth = size === 'lg' ? 8 : 4;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative ${sizeClasses} flex items-center justify-center`}>
      <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${svgSize} ${svgSize}`}>
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke={isUrgent ? '#ef4444' : '#facc15'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          className="transition-all duration-100"
        />
      </svg>
      <span className={`font-bold tabular-nums ${isUrgent ? 'text-red-400 animate-pulse' : 'text-white'}`}>
        {seconds}
      </span>
      </div>

      {showPointsBar && (
        <div className="w-full max-w-[260px]">
          <div className="h-[10px] rounded-full bg-white/10 overflow-hidden border border-white/10">
            <div
              className="h-full bg-yellow-400/80"
              style={{ width: `${Math.max(0, Math.min(100, (timeLeft / duration) * 100))}%` }}
            />
          </div>
          <div className="mt-1 text-center text-xs text-white/50 font-mono">
            {pointsNow !== null ? `${pointsNow.toLocaleString()} pts if locked now` : ''}
          </div>
        </div>
      )}
    </div>
  );
}
