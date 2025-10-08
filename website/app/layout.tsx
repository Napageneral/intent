import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://intent-systems.com'),
  title: 'Intent Systems — Make AI effective on your legacy code',
  description:
    'We make AI actually effective on legacy codebases—by turning code into agent-ready context and upskilling your engineers.',
  openGraph: {
    title: 'Intent Systems',
    description:
      'Make AI effective on your legacy code. Turn your codebase into agent-ready context in 30 days.',
    images: ['/og-image.png'],
    url: 'https://intent-systems.com',
    siteName: 'Intent Systems'
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@intent_systems'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

