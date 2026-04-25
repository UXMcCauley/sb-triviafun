import HostPageClient, { type HostPageInitial } from './HostPageClient';

function num(v: string | string[] | undefined): number | undefined {
  if (typeof v !== 'string') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function csv(v: string | string[] | undefined): string[] | undefined {
  if (typeof v !== 'string') return undefined;
  const parts = v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

export default async function HostPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const initial: HostPageInitial = {
    packs: csv(sp.packs),
    questions: num(sp.questions),
    timer: num(sp.timer),
    maxPlayers: num(sp.maxPlayers),
  };

  return <HostPageClient initial={initial} />;
}
