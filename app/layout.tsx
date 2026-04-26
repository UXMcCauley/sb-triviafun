import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Nunito } from "next/font/google";
import "./globals.css";
import "./material-web";

const trivia = Nunito({
  variable: "--font-trivia",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TriviaFun",
  description: "Real-time multiplayer trivia you can host in minutes",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${trivia.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-hidden`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){
  try {
    // Polyfill for non-secure contexts (e.g. http://127.0.0.1.nip.io) where crypto.randomUUID can be missing.
    // Neon auth client expects it during module initialization.
    if (!globalThis.crypto) globalThis.crypto = {};
    if (typeof globalThis.crypto.randomUUID !== 'function') {
      globalThis.crypto.randomUUID = function(){
        // RFC4122 v4 (good enough for client ids / state)
        var s = '', i = 0, r;
        for (; i < 36; i++) {
          r = (Math.random() * 16) | 0;
          if (i === 8 || i === 13 || i === 18 || i === 23) { s += '-'; continue; }
          if (i === 14) { s += '4'; continue; }
          if (i === 19) { s += ((r & 0x3) | 0x8).toString(16); continue; }
          s += r.toString(16);
        }
        return s;
      };
    }

    var stored = localStorage.getItem('theme');
    var mode = (stored === 'light' || stored === 'dark')
      ? stored
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var dark = mode === 'dark';
    var el = document.documentElement;
    if (dark) el.classList.add('dark'); else el.classList.remove('dark');
    el.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();`,
          }}
        />
        {process.env.NODE_ENV === "development" ? (
          <Script
            src="https://mcp.figma.com/mcp/html-to-design/capture.js"
            strategy="afterInteractive"
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
