// Same route as /host — TV / projector "display" and marketing links stay on /display.
// Force dynamic so Next/Vercel won't try to prerender a client-heavy host view.
export const dynamic = 'force-dynamic';

export { default } from '../host/page';
