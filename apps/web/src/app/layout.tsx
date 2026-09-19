import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Cloover solar pre-qualification',
    template: '%s · Cloover',
  },
  description:
    'Request a financing pre-qualification for a residential solar system and compare instalment offers.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
