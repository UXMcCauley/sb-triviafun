'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface GameQRCodeProps {
  gameCode: string;
  size?: number;
  /** When set, encodes this URL in the QR (e.g. production URL in dev). */
  playUrlOverride?: string;
}

export default function GameQRCode({ gameCode, size = 200, playUrlOverride }: GameQRCodeProps) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = playUrlOverride || origin;
  const url = `${base}/play?code=${encodeURIComponent(gameCode)}`;

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
