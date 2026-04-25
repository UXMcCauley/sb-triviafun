// Same route as /host — TV / projector "display" and marketing links stay on /display.
// Force dynamic so Next/Vercel won't try to prerender a client-heavy display view.
export const dynamic = 'force-dynamic';

import DisplayPageClient from './DisplayPageClient';

export default function DisplayPage() {
  return <DisplayPageClient />;
}
