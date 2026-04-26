'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface GameQRCodeProps {
  gameCode: string;
  size?: number;
  /** When set, encodes this URL in the QR (e.g. production URL in dev). */
  playUrlOverride?: string;
  className?: string;
  /**
   * Size the QR to the largest square that fits the parent (uses ResizeObserver).
   * Parent should have a bounded width and height (e.g. grid cell with `h-full min-h-0`).
   */
  fit?: boolean;
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export default function GameQRCode({
  gameCode,
  size = 200,
  playUrlOverride,
  className,
  fit = false,
}: GameQRCodeProps) {
  const [origin, setOrigin] = useState(() => playUrlOverride || process.env.NEXT_PUBLIC_APP_URL || '');
  const shellRef = useRef<HTMLDivElement>(null);
  const [fitPx, setFitPx] = useState(size);

  useEffect(() => {
    if (origin) return;
    // Fallback for when NEXT_PUBLIC_APP_URL isn't set (keeps SSR/hydration deterministic).
    setOrigin(window.location.origin);
  }, [origin]);

  const url = useMemo(() => {
    const trimmedBase = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    return `${trimmedBase}/play?code=${encodeURIComponent(gameCode)}`;
  }, [origin, gameCode]);

  useEffect(() => {
    if (!fit) return;
    const el = shellRef.current;
    if (!el) return;

    const measure = () => {
      const cr = el.getBoundingClientRect();
      const s = Math.floor(Math.min(cr.width, cr.height));
      setFitPx(clamp(s, 64, 720));
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit, gameCode]);

  const px = fit ? fitPx : size;

  if (fit) {
    return (
      <div ref={shellRef} className={['h-full min-h-0 w-full min-w-0', className || ''].filter(Boolean).join(' ')}>
        <div className="flex h-full min-h-0 w-full items-center justify-center">
          <QRCodeSVG
            value={url}
            size={px}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
            aria-label={`Join game, room ${gameCode}`}
            role="img"
          />
        </div>
      </div>
    );
  }

  return (
    <QRCodeSVG
      className={className}
      value={url}
      size={px}
      level="M"
      bgColor="#ffffff"
      fgColor="#000000"
      aria-label={`Join game, room ${gameCode}`}
      role="img"
    />
  );
}
