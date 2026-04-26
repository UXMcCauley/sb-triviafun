import Link from 'next/link';
import SiteShell from '@/components/SiteShell';

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="trivia-card-join p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)]">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-3 text-sm text-white/65 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function HowToPlayPage() {
  return (
    <SiteShell
      title="How to play"
      subtitle="Host a game in under a minute. Humiliate your friends with facts you’ll forget by Tuesday."
      rightSlot={
        <>
          <Link href="/" className="trivia-pill-browse">
            Host setup
          </Link>
          <Link href="/play" className="trivia-btn-coral trivia-sheen inline-block py-2.5 px-5 text-sm">
            Join as player
          </Link>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="1) Host (the benevolent dictator)">
          <p>
            Go to the home page, pick one or more packs, tune the settings, and hit <span className="font-semibold text-white/85">Create game</span>.
          </p>
          <p>
            You’ll get a room code and a QR code. Players can join from their phones at <span className="font-semibold text-white/85">/play</span>.
          </p>
        </Card>

        <Card title="2) Players (the chaos gremlins)">
          <p>
            Join using the room code (or scan the QR), choose a name, and wait in the lobby.
          </p>
          <p>
            When the host starts, you’ll answer each question before the timer expires. Speed matters. So does not panicking.
          </p>
        </Card>

        <Card title="Scoring (aka: consequences)">
          <p>
            You earn points for correct answers. Faster answers usually score higher. Wrong answers score nothing, but do score you shame.
          </p>
          <p>
            At the end, the leaderboard crowns winners and highlights the “big loser” moments we’ll all pretend are “character building.”
          </p>
        </Card>

        <Card title="Pro tips">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <span className="font-semibold text-white/85">Pick packs intentionally.</span> Mixing packs can be hilarious. It can also be unhinged. Choose your vibe.
            </li>
            <li>
              <span className="font-semibold text-white/85">Use audience mode</span> if you want non-players to react without affecting the game.
            </li>
            <li>
              <span className="font-semibold text-white/85">If something’s wrong</span>, report it on the <Link className="underline text-white/80 hover:text-white" href="/report">Report</Link> page.
            </li>
          </ul>
        </Card>
      </div>

      <div className="trivia-card-join mt-10 p-6">
        <h2 className="text-lg font-black">Quick links</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/packs" className="trivia-pill-browse">
            Theme packs
          </Link>
          <Link href="/account" className="trivia-pill-browse">
            Account
          </Link>
          <Link href="/report" className="trivia-pill-browse">
            Report / feedback
          </Link>
        </div>
      </div>
    </SiteShell>
  );
}

