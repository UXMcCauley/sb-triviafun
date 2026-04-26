import Link from 'next/link';
import type { ReactNode } from 'react';
import { TriviaAtmosphere, TriviaFunLogo } from '@/components/TriviaDecor';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export default function SiteShell({
  title,
  subtitle,
  children,
  rightSlot,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  rightSlot?: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative isolate w-dvw min-h-dvh overflow-x-hidden bg-trivia-navy text-white">
      <TriviaAtmosphere />
      <div className={cx('relative z-10 w-full px-4 py-10 sm:px-6 lg:px-8', className)}>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3 min-w-0">
            <Link href="/" className="block w-fit">
              <TriviaFunLogo size="sm" align="left" />
            </Link>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-balance">{title}</h1>
            {subtitle ? <p className="text-white/60 max-w-2xl text-pretty leading-relaxed">{subtitle}</p> : null}
          </div>
          {rightSlot ? <div className="shrink-0 flex flex-wrap gap-2 justify-end">{rightSlot}</div> : null}
        </header>
        <main className="mt-8 md:mt-10">{children}</main>
      </div>
    </div>
  );
}

