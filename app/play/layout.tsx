import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Seinfeld Trivia - Play',
  // This meta helps some in-app browsers redirect to the system browser
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'mobile-web-app-capable': 'yes',
  },
};

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
