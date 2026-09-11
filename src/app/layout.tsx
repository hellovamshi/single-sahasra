import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sahasra Single',
  description: 'Turn your photos into interactive folding experiences.',
  metadataBase: new URL('https://single.sahasra.tech'),
  applicationName: 'Sahasra Single',
  authors: [{ name: 'Sahasra Tech' }],
  keywords: ['fold', 'interaction', 'webgl', 'device motion', 'sensor art', 'folding display'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Single',
  },
  openGraph: {
    title: 'Sahasra Single',
    description: 'Turn your photos into interactive folding experiences.',
    url: 'https://single.sahasra.tech',
    siteName: 'Sahasra Single',
    type: 'website',
    images: [
      {
        url: '/icons/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Sahasra Single - Interactive Folding Experience',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sahasra Single',
    description: 'Turn your photos into interactive folding experiences.',
    creator: '@sahasratech',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-black">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen bg-[#000000] text-white antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
