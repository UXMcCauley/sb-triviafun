'use client';

import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface GameQRCodeProps {
  gameCode: string;
  size?: number;
  /** When set, encodes this URL in the QR (e.g. production URL in dev). */
  playUrlOverride?: string;
}

export default function GameQRCode({ gameCode, size = 200, playUrlOverride }: GameQRCodeProps) {
  const [copied, setCopied] = useState(false);
  const [base, setBase] = useState<string>(() => {
    // Keep first render identical between SSR + client hydration.
    // If we don't have an explicit base URL, fall back to relative URLs for SSR stability.
    return playUrlOverride || process.env.NEXT_PUBLIC_APP_URL || '';
  });

  useEffect(() => {
    if (playUrlOverride) return;
    if (process.env.NEXT_PUBLIC_APP_URL) return;
    setBase(window.location.origin);
  }, [playUrlOverride]);

  const url = useMemo(() => {
    const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
    return `${trimmedBase}/play?code=${encodeURIComponent(gameCode)}`;
  }, [base, gameCode]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col items-stretch gap-3 max-w-sm">
      <div className="bg-white p-4 rounded-2xl inline-block self-center">
        <QRCodeSVG
          value={url}
          size={size}
          level="M"
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>
      <p className="text-xs text-white/40 text-center">Scan to open join screen with this code</p>
      <p className="text-sm text-white/70 font-mono break-all text-center select-all leading-snug tabular-nums">
        {url}
      </p>
      <button
        type="button"
        onClick={copy}
        className="w-full text-sm font-semibold py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/90 transition-colors"
      >
        {copied ? 'Copied!' : 'Copy join link'}
      </button>
    </div>
  );
}
