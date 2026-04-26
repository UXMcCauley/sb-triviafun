import Link from 'next/link';
import type { ReactNode } from 'react';

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
    <div className="w-dvw min-h-dvh overflow-x-hidden bg-linear-to-br from-trivia-navy via-trivia-navy-mid to-trivia-navy text-white">
      <div className={cx('w-full px-4 py-10 sm:px-6 lg:px-8', className)}>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2 min-w-0">
            <Link href="/" className="inline-flex items-baseline gap-2 font-black tracking-tight">
              <span className="text-2xl sm:text-3xl">
                <span className="text-yellow-400">Trivia</span>Fun
              </span>
            </Link>
            <h1 className="text-4xl sm:text-5xl font-ultralight tracking-tight">{title}</h1>
            {subtitle ? <p className="text-white/60 max-w-2xl">{subtitle}</p> : null}
          </div>
          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </header>
        <main className="mt-8">{children}</main>
      </div>
    </div>
  );
}

