'use client';

import { QRCodeSVG } from 'qrcode.react';

interface GameQRCodeProps {
  gameCode: string;
  size?: number;
}

export default function GameQRCode({ gameCode, size = 200 }: GameQRCodeProps) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}/play?code=${gameCode}`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white p-4 rounded-2xl inline-block">
        <QRCodeSVG
          value={url}
          size={size}
          level="M"
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>
      <p className="text-sm text-white/40 font-mono select-all">{origin}/play</p>
    </div>
  );
}
